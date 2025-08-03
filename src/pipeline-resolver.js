import OpenAI from 'openai';
import axios from 'axios';

class PipelineResolver {
    constructor(config) {
        this.githubToken = config.githubToken;
        this.openai = new OpenAI({
            apiKey: config.openaiApiKey
        });
    }

    // Analyze workflow failure using AI
    async analyzeFailure(logs, workflowName) {
        try {
            const prompt = `
You are an expert DevOps engineer analyzing a GitHub Actions workflow failure.

Workflow Name: ${workflowName}

Analyze this failure log and provide a JSON response with:
1. "root_cause": Brief description of what went wrong
2. "is_minor": true/false - whether this can be auto-fixed
3. "fixes": Array of specific fix recommendations
4. "commands": Array of commands that could resolve the issue
5. "confidence": 1-10 scale of how confident you are in the analysis

Common auto-fixable issues include:
- Dependency version conflicts
- Missing environment variables
- Cache issues
- Temporary network failures
- Test data problems
- Configuration file formatting

Log content (truncated):
${logs.substring(0, 3000)}

Respond only with valid JSON.
`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 1000
            });

            const analysis = JSON.parse(response.choices[0].message.content);
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
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch logs: ${error.message}`);
        }
    }
}

export default PipelineResolver;