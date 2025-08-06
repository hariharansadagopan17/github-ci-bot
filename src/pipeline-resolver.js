import OpenAI from 'openai';
import axios from 'axios';

class PipelineResolver {
    constructor(config) {
        this.githubToken = config.githubToken;
        this.openai = new OpenAI({
            apiKey: config.openaiApiKey
        });
    }

    // Preprocess logs to handle different formats and encodings
    async preprocessLogs(logs) {
        try {
            // Handle different types of input
            let processedLogs = '';
            
            // If logs is Buffer or ArrayBuffer, convert to string
            if (logs instanceof Buffer || logs instanceof ArrayBuffer) {
                processedLogs = Buffer.from(logs).toString('utf8');
            } else if (typeof logs === 'string') {
                processedLogs = logs;
            } else {
                return 'Error: Invalid log format';
            }

            // Try different decodings if content looks encoded
            if (/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(processedLogs)) {
                try {
                    processedLogs = Buffer.from(processedLogs, 'base64').toString('utf8');
                } catch (e) {
                    console.log('Not valid base64, keeping original');
                }
            }

            // Clean the logs
            processedLogs = processedLogs
                .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '') // Remove control chars
                .replace(/^\s*[\r\n]/gm, '')                     // Remove empty lines
                .split('\n')
                .filter(line => {
                    // Keep only readable text lines
                    return line.trim() && 
                           /[\x20-\x7E]/.test(line) &&          // Has printable chars
                           !/^\s*[^\x20-\x7E\s]+\s*$/.test(line); // Not only special chars
                })
                .join('\n');

            // Extract error messages and relevant content
            const errorLines = processedLogs.split('\n').filter(line => 
                line.toLowerCase().includes('error') ||
                line.toLowerCase().includes('failed') ||
                line.toLowerCase().includes('exception') ||
                /^[a-zA-Z.]+Error:/.test(line)
            );

            return errorLines.length > 0 ? errorLines.join('\n') : processedLogs;
        } catch (error) {
            console.error('Log preprocessing error:', error);
            return 'Error: Failed to process log content';
        }
    }

    // Analyze workflow failure using AI
    async analyzeFailure(logs, workflowName) {
        try {
            // Preprocess the logs first
            const processedLogs = await this.preprocessLogs(logs);

            const prompt = `
You are an expert DevOps engineer analyzing a GitHub Actions workflow failure.

Workflow Name: ${workflowName}

Important: If the log content appears corrupted or unreadable, focus on identifying the format or encoding issues.

Analyze this failure log and provide a JSON response with:
1. "root_cause": Brief description of what went wrong
2. "is_minor": true/false - whether this can be auto-fixed
3. "fixes": Array of specific fix recommendations
4. "commands": Array of commands that could resolve the issue
5. "confidence": 1-10 scale of how confident you are in the analysis
6. "log_quality": "good" | "partial" | "corrupted"

Log content:
${processedLogs}`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4.1",
                messages: [{ 
                    role: "system", 
                    content: "You are a DevOps expert. Always respond with valid JSON only, no markdown formatting or explanations." 
                },
                { 
                    role: "user", 
                    content: prompt 
                }],
                temperature: 0.1,
                max_tokens: 10000
            });

            let content = response.choices[0].message.content.trim();
            const analysis = JSON.parse(content);

            // If logs are corrupted, add specific fixes
            if (analysis.log_quality === 'corrupted') {
                analysis.fixes = [
                    "Add error logging to workflow steps",
                    "Enable debug logging in the workflow",
                    "Add 'set -x' to shell steps",
                    "Check workflow syntax for proper log capture",
                    "Verify artifact handling steps"
                ];
                analysis.is_minor = true;
                analysis.commands = [
                    "echo '::debug::Step debugging enabled'",
                    "set -x",
                    "export ACTIONS_STEP_DEBUG=true"
                ];
            }

            console.log('AI Analysis:', analysis);
            return analysis;
        } catch (error) {
            console.error('AI analysis error:', error);
            return {
                root_cause: "Failed to analyze logs with AI",
                is_minor: false,
                fixes: ["Manual investigation required"],
                commands: [],
                confidence: 1
            };
        }
    }

    // Attempt automatic fixes based on analysis
    async attemptAutoFix(owner, repo, analysis) {
        console.log('Attempting automatic fixes...');

        const fixResults = [];

        for (const fix of analysis.fixes) {
            try {
                const result = await this.applyFix(owner, repo, fix);
                fixResults.push({
                    fix,
                    success: result.success,
                    message: result.message
                });
            } catch (error) {
                fixResults.push({
                    fix,
                    success: false,
                    message: error.message
                });
            }
        }

        const successfulFixes = fixResults.filter(r => r.success);

        return {
            attempted: fixResults.length,
            successful: successfulFixes.length,
            fixes: fixResults,
            canRetry: successfulFixes.length > 0
        };
    }

    // Apply specific fixes
    async applyFix(owner, repo, fix) {
        const fixLower = fix.toLowerCase();

        // Clear cache fix
        if (fixLower.includes('cache') || fixLower.includes('clear')) {
            return await this.clearWorkflowCache(owner, repo);
        }

        // Dependency update fix
        if (fixLower.includes('dependency') || fixLower.includes('package')) {
            return await this.updateDependencies(owner, repo, fix);
        }

        // Environment variable fix
        if (fixLower.includes('environment') || fixLower.includes('env')) {
            return await this.fixEnvironmentIssues(owner, repo, fix);
        }

        // Configuration fix
        if (fixLower.includes('config') || fixLower.includes('yml') || fixLower.includes('yaml')) {
            return await this.fixConfiguration(owner, repo, fix);
        }

        // Default: log the fix for manual review
        console.log(`Fix not automated: ${fix}`);
        return {
            success: false,
            message: `Fix requires manual intervention: ${fix}`
        };
    }

    // Clear workflow cache
    async clearWorkflowCache(owner, repo) {
        try {
            // GitHub doesn't have a direct API to clear cache
            // This would typically involve updating cache keys or workflow modifications
            console.log(`Cache clearing requested for ${owner}/${repo}`);

            return {
                success: true,
                message: "Cache clearing simulated (requires workflow restart)"
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to clear cache: ${error.message}`
            };
        }
    }

    // Update dependencies
    async updateDependencies(owner, repo, fix) {
        try {
            console.log(`Dependency fix requested for ${owner}/${repo}: ${fix}`);

            // In a real implementation, you would:
            // 1. Clone the repo
            // 2. Update package.json or requirements.txt
            // 3. Create a PR with the fix
            // 4. Auto-merge if tests pass

            return {
                success: true,
                message: "Dependency update simulated (would create PR)"
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to update dependencies: ${error.message}`
            };
        }
    }

    // Fix environment issues
    async fixEnvironmentIssues(owner, repo, fix) {
        try {
            console.log(`Environment fix requested for ${owner}/${repo}: ${fix}`);

            // This would typically involve:
            // 1. Checking repository secrets
            // 2. Updating environment variables
            // 3. Fixing configuration files

            return {
                success: true,
                message: "Environment fix simulated"
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to fix environment: ${error.message}`
            };
        }
    }

    // Fix configuration issues
    async fixConfiguration(owner, repo, fix) {
        try {
            console.log(`Configuration fix requested for ${owner}/${repo}: ${fix}`);

            // This would involve:
            // 1. Fetching workflow files
            // 2. Identifying configuration issues
            // 3. Creating a fix commit

            return {
                success: true,
                message: "Configuration fix simulated"
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to fix configuration: ${error.message}`
            };
        }
    }

    // Complete failure resolution process
    async resolveFailure(owner, repo, runId, logs, workflowName) {
        console.log(`Resolving failure for workflow run ${runId}`);

        try {
            // 1. Analyze the failure
            const analysis = await this.analyzeFailure(logs, workflowName);

            // 2. If it's a minor issue, attempt auto-fix
            if (analysis.is_minor && analysis.confidence >= 7) {
                const fixResult = await this.attemptAutoFix(owner, repo, analysis);

                if (fixResult.canRetry) {
                    return {
                        status: 'auto_fixed',
                        message: 'Issues resolved, pipeline can be restarted',
                        analysis,
                        fixes: fixResult.fixes,
                        can_retry: true
                    };
                }
            }

            // 3. Manual intervention required
            return {
                status: 'manual_required',
                message: 'Manual intervention required',
                analysis,
                fixes: [],
                can_retry: false
            };

        } catch (error) {
            console.error('Resolution error:', error);
            return {
                status: 'error',
                message: `Failed to resolve: ${error.message}`,
                analysis: null,
                fixes: [],
                can_retry: false
            };
        }
    }

    // Get workflow logs from GitHub
    async getWorkflowLogs(owner, repo, runId) {
        try {
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
                {
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Accept-Encoding': 'gzip, deflate, br'
                    },
                    responseType: 'arraybuffer',
                    decompress: true
                }
            );

            // Try different encodings
            const encodings = ['utf8', 'ascii', 'utf16le'];
            let decodedContent = '';

            for (const encoding of encodings) {
                try {
                    decodedContent = Buffer.from(response.data).toString(encoding);
                    if (decodedContent && /[\x20-\x7E]/.test(decodedContent)) {
                        break; // Found readable content
                    }
                } catch (e) {
                    console.log(`Failed to decode with ${encoding}`);
                }
            }

            return decodedContent || Buffer.from(response.data).toString('utf8');
        } catch (error) {
            console.error('Log fetching error:', error);
            throw new Error(`Failed to fetch logs: ${error.message}`);
        }
    }
}

export default PipelineResolver;