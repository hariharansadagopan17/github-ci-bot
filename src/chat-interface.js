class ChatInterface {
  constructor(bot, resolver) {
    this.bot = bot;
    this.resolver = resolver;
    this.userSessions = new Map(); // Track user conversations
  }

  // Main message handler
  async handleMessage(message, userId) {
    console.log(`Processing message from ${userId}: ${message}`);
    
    // Update user session
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        id: userId,
        lastActivity: new Date(),
        context: {}
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastActivity = new Date();

    try {
      const intent = this.parseIntent(message);
      return await this.processIntent(intent, session);
    } catch (error) {
      console.error('Message processing error:', error);
      return "Sorry, I encountered an error processing your request. Please try again.";
    }
  }

  // Parse user intent from message
  parseIntent(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Extract repository information
    const repoMatch = message.match(/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    const repository = repoMatch ? {
      owner: repoMatch[1],
      name: repoMatch[2]
    } : null;

    // Status check intents
    if (lowerMessage.includes('status') || lowerMessage.includes('check')) {
      return {
        type: 'status_check',
        repository,
        message
      };
    }

    // Release/deployment trigger intents
    if (lowerMessage.includes('release') || lowerMessage.includes('deploy') || lowerMessage.includes('trigger')) {
      const artifactMatch = message.match(/artifact[:\s]+([a-zA-Z0-9_.-]+)/i);
      return {
        type: 'trigger_release',
        repository,
        artifactId: artifactMatch ? artifactMatch[1] : null,
        message
      };
    }

    // Pipeline history intents
    if (lowerMessage.includes('history') || lowerMessage.includes('runs') || lowerMessage.includes('last')) {
      return {
        type: 'pipeline_history',
        repository,
        message
      };
    }

    // Failure analysis intents
    if (lowerMessage.includes('failed') || lowerMessage.includes('failure') || lowerMessage.includes('error')) {
      return {
        type: 'analyze_failure',
        repository,
        message
      };
    }

    // Help intents
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return {
        type: 'help',
        message
      };
    }

    // Default: conversational
    return {
      type: 'conversation',
      repository,
      message
    };
  }

  // Process different intent types
  async processIntent(intent, session) {
    switch (intent.type) {
      case 'status_check':
        return await this.handleStatusCheck(intent, session);
      
      case 'trigger_release':
        return await this.handleReleaseRequest(intent, session);
      
      case 'pipeline_history':
        return await this.handleHistoryRequest(intent, session);
      
      case 'analyze_failure':
        return await this.handleFailureAnalysis(intent, session);
      
      case 'help':
        return this.getHelpMessage();
      
      case 'conversation':
        return await this.handleConversation(intent, session);
      
      default:
        return "I'm not sure how to help with that. Type 'help' to see what I can do.";
    }
  }

  // Handle status check requests
  async handleStatusCheck(intent, session) {
    if (!intent.repository) {
      return "Please specify a repository in the format 'owner/repo'. For example: 'Check status of myuser/myproject'";
    }

    try {
      const status = await this.bot.getRepositoryStatus(
        intent.repository.owner,
        intent.repository.name
      );

      let response = `📊 **Status for ${status.repository}**\n\n`;
      
      if (status.recent_runs.length === 0) {
        response += "No recent workflow runs found.";
      } else {
        response += "Recent workflow runs:\n";
        status.recent_runs.forEach((run, index) => {
          const statusEmoji = this.getStatusEmoji(run.status, run.conclusion);
          const timeAgo = this.getTimeAgo(new Date(run.created_at));
          response += `${index + 1}. ${statusEmoji} **${run.name}** - ${run.conclusion || run.status} (${timeAgo})\n`;
        });
      }

      // Store context for follow-up questions
      session.context.lastRepository = intent.repository;

      return response;
    } catch (error) {
      return `❌ Failed to get status for ${intent.repository.owner}/${intent.repository.name}: ${error.message}`;
    }
  }

  // Handle release trigger requests
  async handleReleaseRequest(intent, session) {
    if (!intent.repository) {
      return "Please specify a repository in the format 'owner/repo'. For example: 'Trigger release for myuser/myproject'";
    }

    try {
      const artifactId = intent.artifactId || this.bot.generateArtifactId();
      
      const result = await this.bot.triggerPipeline(
        intent.repository.owner,
        intent.repository.name,
        'main',
        artifactId
      );

      session.context.lastRepository = intent.repository;
      session.context.lastArtifactId = artifactId;

      return `🚀 **Release triggered!**\n\n` +
             `Repository: ${intent.repository.owner}/${intent.repository.name}\n` +
             `Artifact ID: ${artifactId}\n` +
             `Status: ${result.message}\n\n` +
             `I'll monitor the pipeline and let you know if any issues arise.`;
             
    } catch (error) {
      return `❌ Failed to trigger release: ${error.message}`;
    }
  }

  // Handle pipeline history requests
  async handleHistoryRequest(intent, session) {
    if (!intent.repository) {
      // Use last repository from context if available
      if (session.context.lastRepository) {
        intent.repository = session.context.lastRepository;
      } else {
        return "Please specify a repository in the format 'owner/repo'.";
      }
    }

    try {
      const status = await this.bot.getRepositoryStatus(
        intent.repository.owner,
        intent.repository.name
      );

      let response = `📈 **Pipeline History for ${status.repository}**\n\n`;
      
      if (status.recent_runs.length === 0) {
        response += "No workflow runs found.";
      } else {
        status.recent_runs.forEach((run, index) => {
          const statusEmoji = this.getStatusEmoji(run.status, run.conclusion);
          const duration = this.calculateDuration(run.created_at, run.updated_at);
          const timeAgo = this.getTimeAgo(new Date(run.created_at));
          
          response += `**${index + 1}. ${run.name}**\n`;
          response += `   ${statusEmoji} Status: ${run.conclusion || run.status}\n`;
          response += `   ⏱️ Duration: ${duration}\n`;
          response += `   📅 Started: ${timeAgo}\n`;
          response += `   🔗 [View Details](${run.html_url})\n\n`;
        });
      }

      return response;
    } catch (error) {
      return `❌ Failed to get pipeline history: ${error.message}`;
    }
  }

  // Handle failure analysis requests
  async handleFailureAnalysis(intent, session) {
    if (!intent.repository) {
      if (session.context.lastRepository) {
        intent.repository = session.context.lastRepository;
      } else {
        return "Please specify a repository to analyze failures for.";
      }
    }

    try {
      const status = await this.bot.getRepositoryStatus(
        intent.repository.owner,
        intent.repository.name
      );

      // Find the most recent failed run
      const failedRun = status.recent_runs.find(run => run.conclusion === 'failure');
      
      if (!failedRun) {
        return `✅ No recent failures found for ${intent.repository.owner}/${intent.repository.name}`;
      }

      let response = `🔍 **Analyzing failure for ${failedRun.name}**\n\n`;
      response += `Run ID: ${failedRun.id}\n`;
      response += `Failed: ${this.getTimeAgo(new Date(failedRun.updated_at))}\n\n`;
      
      try {
        // Get logs and analyze
        const logs = await this.resolver.getWorkflowLogs(
          intent.repository.owner,
          intent.repository.name,
          failedRun.id
        );

        const analysis = await this.resolver.analyzeFailure(logs, failedRun.name);
        
        response += `**Root Cause:** ${analysis.root_cause}\n\n`;
        response += `**Auto-fixable:** ${analysis.is_minor ? '✅ Yes' : '❌ No'}\n`;
        response += `**Confidence:** ${analysis.confidence}/10\n\n`;
        
        if (analysis.fixes.length > 0) {
          response += `**Recommended Fixes:**\n`;
          analysis.fixes.forEach((fix, index) => {
            response += `${index + 1}. ${fix}\n`;
          });
        }

        if (analysis.is_minor && analysis.confidence >= 7) {
          response += `\n🔧 I can attempt to auto-fix this issue. Would you like me to try?`;
          session.context.pendingFix = {
            repository: intent.repository,
            runId: failedRun.id,
            analysis
          };
        }

      } catch (error) {
        response += `⚠️ Could not retrieve detailed analysis: ${error.message}`;
      }

      return response;
    } catch (error) {
      return `❌ Failed to analyze failures: ${error.message}`;
    }
  }

  // Handle conversational messages
  async handleConversation(intent, session) {
    const message = intent.message.toLowerCase();

    // Handle yes/no responses for pending actions
    if (session.context.pendingFix) {
      if (message.includes('yes') || message.includes('sure') || message.includes('go ahead')) {
        return await this.executePendingFix(session);
      } else if (message.includes('no') || message.includes('cancel')) {
        delete session.context.pendingFix;
        return "Fix cancelled. Let me know if you need help with anything else.";
      }
    }

    // Handle general greetings
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return "Hello! I'm your GitHub CI/CD assistant. I can help you:\n" +
             "• Check pipeline status\n" +
             "• Trigger releases\n" +
             "• Analyze failures\n" +
             "• Monitor workflows\n\n" +
             "What would you like to do?";
    }

    // Handle thanks
    if (message.includes('thank') || message.includes('thanks')) {
      return "You're welcome! Happy to help with your CI/CD needs. 🚀";
    }

    // Default conversational response
    return "I'm here to help with your GitHub CI/CD workflows. You can ask me to:\n" +
           "• 'Check status of owner/repo'\n" +
           "• 'Trigger release for owner/repo'\n" +
           "• 'Show history for owner/repo'\n" +
           "• 'Analyze failures in owner/repo'\n\n" +
           "What would you like to do?";
  }

  // Execute pending fix
  async executePendingFix(session) {
    const pendingFix = session.context.pendingFix;
    delete session.context.pendingFix;

    try {
      let response = "🔧 **Attempting automatic fix...**\n\n";

      const resolution = await this.resolver.resolveFailure(
        pendingFix.repository.owner,
        pendingFix.repository.name,
        pendingFix.runId,
        '', // logs already analyzed
        'workflow'
      );

      if (resolution.status === 'auto_fixed') {
        response += "✅ **Issues resolved!**\n\n";
        response += "Applied fixes:\n";
        resolution.fixes.forEach((fix, index) => {
          const statusEmoji = fix.success ? '✅' : '❌';
          response += `${index + 1}. ${statusEmoji} ${fix.fix}\n`;
        });

        if (resolution.can_retry) {
          response += "\n🔄 Restarting pipeline...";
          
          try {
            await this.bot.rerunWorkflow(
              pendingFix.repository.owner,
              pendingFix.repository.name,
              pendingFix.runId
            );
            response += " Done!\n\nI'll monitor the new run and update you on progress.";
          } catch (error) {
            response += ` Failed to restart: ${error.message}`;
          }
        }
      } else {
        response += "❌ **Auto-fix unsuccessful**\n\n";
        response += resolution.message;
        response += "\n\nManual intervention is required.";
      }

      return response;
    } catch (error) {
      return `❌ Failed to execute fix: ${error.message}`;
    }
  }

  // Get help message
  getHelpMessage() {
    return `🤖 **GitHub CI/CD Bot Help**

I can help you manage your GitHub workflows and CI/CD pipelines:

**📊 Status Commands:**
• "Check status of owner/repo"
• "What's the status of my-project?"
• "Show me the latest runs"

**🚀 Release Commands:**
• "Trigger release for owner/repo"
• "Deploy owner/repo with artifact v1.2.3"
• "Start a new release"

**📈 History Commands:**
• "Show history for owner/repo"
• "Last 5 runs for my-project"
• "Pipeline history"

**🔍 Analysis Commands:**
• "Analyze failures in owner/repo"
• "Why did the last build fail?"
• "Check for errors"

**💬 Interactive Features:**
• I can automatically fix minor issues
• I'll monitor your pipelines and alert you
• Ask follow-up questions for more details

Just mention a repository in the format "owner/repo" and I'll help you manage it!`;
  }

  // Utility methods
  getStatusEmoji(status, conclusion) {
    if (conclusion === 'success') return '✅';
    if (conclusion === 'failure') return '❌';
    if (conclusion === 'cancelled') return '⏹️';
    if (status === 'in_progress') return '🔄';
    if (status === 'queued') return '⏳';
    return '❓';
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  }
}

export default ChatInterface;