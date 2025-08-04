import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

class GitHubBot {
    constructor(config) {
        this.octokit = new Octokit({
            auth: config.token,
        });
        this.webhookSecret = config.webhookSecret;
        this.activeRuns = new Map();
    }

    verifySignature(payload, signature) {
        if (!this.webhookSecret) {
            console.warn('No webhook secret configured');
            return true;
        }
        const hmac = crypto.createHmac('sha256', this.webhookSecret);
        const digest = 'sha256=' + hmac.update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    }

    async handleWebhook(req, res) {
        const signature = req.headers['x-hub-signature-256'];
        const event = req.headers['x-github-event'];
        const payload = req.body;

        if (!this.verifySignature(JSON.stringify(payload), signature)) {
            return res.status(401).send('Unauthorized');
        }

        console.log(`Processing ${event} event`);

        try {
            switch (event) {
                case 'push':
                    await this.handlePushEvent(payload);
                    break;
                case 'workflow_run':
                    await this.handleWorkflowEvent(payload);
                    break;
                case 'workflow_job':
                    await this.handleWorkflowJobEvent(payload);
                    break;
                default:
                    console.log(`Unhandled event: ${event}`);
            }

            res.status(200).send('OK');
        } catch (error) {
            console.error('Webhook handling error:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    async handlePushEvent(payload) {
        const { repository, ref, commits } = payload;

        if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
            console.log(`Push to ${ref} detected in ${repository.full_name}`);

            const artifactId = this.generateArtifactId();
            console.log(`Generated artifact ID: ${artifactId}`);

            try {
                const result = await this.triggerPipeline(
                    repository.owner.login,
                    repository.name,
                    ref.replace('refs/heads/', ''),
                    artifactId
                );

                console.log('Pipeline triggered successfully:', result);
            } catch (error) {
                console.error('Failed to trigger pipeline:', error);
            }
        }
    }

    async handleWorkflowEvent(payload) {
        const { action, workflow_run, repository } = payload;

        console.log(`Workflow ${workflow_run.name} ${action} in ${repository.full_name}`);

        if (action === 'requested') {
            this.activeRuns.set(workflow_run.id, {
                id: workflow_run.id,
                name: workflow_run.name,
                status: 'in_progress',
                repository: repository.full_name,
                started_at: new Date()
            });
        } else if (action === 'completed') {
            const run = this.activeRuns.get(workflow_run.id);
            if (run) {
                run.status = workflow_run.conclusion;
                run.completed_at = new Date();

                console.log(`Workflow completed with status: ${workflow_run.conclusion}`);

                if (workflow_run.conclusion === 'failure') {
                    await this.handleWorkflowFailure(workflow_run, repository);
                }
            }
        }
    }

    async handleWorkflowJobEvent(payload) {
        const { action, workflow_job } = payload;
        console.log(`Job ${workflow_job.name} ${action}`);
    }

    async handleWorkflowFailure(workflowRun, repository) {
        console.log(`Handling failure for workflow run ${workflowRun.id}`);

        try {
            const logs = await this.getWorkflowLogs(
                repository.owner.login,
                repository.name,
                workflowRun.id
            );

            console.log('Retrieved workflow logs, analyzing failure...');
            console.log(`Workflow ${workflowRun.name} failed. Manual intervention may be required.`);
        } catch (error) {
            console.error('Error handling workflow failure:', error);
        }
    }

    generateArtifactId() {
        const timestamp = Date.now();
        const uuid = uuidv4().split('-')[0];
        return `artifact-${timestamp}-${uuid}`;
    }

    async triggerPipeline(owner, repo, branch = 'main', artifactId) {
        try {
            const response = await this.octokit.actions.createWorkflowDispatch({
                owner,
                repo,
                workflow_id: 'release.yml',
                ref: branch,
                inputs: {
                    artifact_id: artifactId || this.generateArtifactId()
                }
            });

            return {
                success: true,
                message: `Pipeline triggered for ${owner}/${repo}`,
                artifact_id: artifactId,
                branch
            };
        } catch (error) {
            console.error('Pipeline trigger error:', error);
            throw new Error(`Failed to trigger pipeline: ${error.message}`);
        }
    }

    async getRepositoryStatus(owner, repo) {
        try {
            // First fetch workflows
            const workflows = await this.octokit.actions.listRepoWorkflows({
                owner,
                repo
            });

            if (!workflows.data.workflows.length) {
                return {
                    repository: `${owner}/${repo}`,
                    workflows: [],
                    message: 'No workflows found in repository'
                };
            }

            // Get runs for each workflow
            const workflowsWithRuns = await Promise.all(
                workflows.data.workflows.map(async (workflow) => {
                    const runs = await this.octokit.actions.listWorkflowRuns({
                        owner,
                        repo,
                        workflow_id: workflow.id,
                        per_page: 5
                    });

                    return {
                        workflow_id: workflow.id,
                        workflow_name: workflow.name,
                        recent_runs: runs.data.workflow_runs.map(run => ({
                            id: run.id,
                            name: run.name,
                            status: run.status,
                            conclusion: run.conclusion,
                            created_at: run.created_at,
                            updated_at: run.updated_at,
                            html_url: run.html_url
                        }))
                    };
                })
            );

            return {
                repository: `${owner}/${repo}`,
                workflows: workflowsWithRuns
            };
        } catch (error) {
            console.error('Status retrieval error:', error);
            throw new Error(`Failed to get repository status: ${error.message}`);
        }
    }

    async getWorkflowLogs(owner, repo, runId) {
        try {
            const response = await this.octokit.actions.downloadWorkflowRunLogs({
                owner,
                repo,
                run_id: runId
            });

            return response.data;
        } catch (error) {
            console.error('Log retrieval error:', error);
            throw new Error(`Failed to get workflow logs: ${error.message}`);
        }
    }

    async rerunWorkflow(owner, repo, runId) {
        try {
            await this.octokit.actions.reRunWorkflow({
                owner,
                repo,
                run_id: runId
            });

            return {
                success: true,
                message: `Workflow ${runId} restarted`
            };
        } catch (error) {
            console.error('Rerun error:', error);
            throw new Error(`Failed to rerun workflow: ${error.message}`);
        }
    }

    getActiveRuns() {
        return Array.from(this.activeRuns.values());
    }
}

export default GitHubBot;
