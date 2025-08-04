import dotenv from 'dotenv';
import express from 'express';
import crypto from 'crypto';
import GitHubBot from './bot.js';
import ChatInterface from './chat-interface.js';
import PipelineResolver from './pipeline-resolver.js';

dotenv.config();

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        
        // Initialize components
        this.bot = new GitHubBot({
            token: process.env.GITHUB_TOKEN,
            webhookSecret: process.env.GITHUB_WEBHOOK_SECRET
        });
        
        this.resolver = new PipelineResolver({
            githubToken: process.env.GITHUB_TOKEN,
            openaiApiKey: process.env.OPENAI_API_KEY
        });
        
        this.chatInterface = new ChatInterface(this.bot, this.resolver);
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    verifyWebhookSignature(req, res, next) {
        try {
            console.log('Webhook Headers:', JSON.stringify(req.headers, null, 2));
            console.log('Webhook Body:', JSON.stringify(req.body, null, 2));

            const signature = req.headers['x-hub-signature-256'];
            const secret = process.env.GITHUB_WEBHOOK_SECRET;

            if (!secret) {
                console.error('Webhook secret is not configured');
                return res.status(401).json({ error: 'Webhook secret not configured' });
            }

            if (!signature) {
                console.error('No signature found in headers');
                return res.status(401).json({ error: 'No signature found' });
            }

            const payload = JSON.stringify(req.body);
            const computedSignature = `sha256=${crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex')}`;

            console.log('Computed Signature:', computedSignature);
            console.log('Received Signature:', signature);

            const signatureMatch = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(computedSignature)
            );

            if (!signatureMatch) {
                console.error('Signature mismatch');
                return res.status(401).json({ error: 'Invalid signature' });
            }

            console.log('Webhook signature verified successfully');
            next();
        } catch (error) {
            console.error('Webhook verification error:', error);
            res.status(401).json({ error: 'Webhook verification failed' });
        }
    }

    setupMiddleware() {
        // Move webhook verification after JSON parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS headers
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Hub-Signature, X-Hub-Signature-256');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            if (req.method === 'OPTIONS') {
                return res.status(200).end();
            }
            next();
        });

        // Add webhook verification after body parsing
        this.app.use('/webhook', (req, res, next) => this.verifyWebhookSignature(req, res, next));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });

        // GitHub webhook endpoint
        this.app.post('/webhook', async (req, res) => {
            try {
                console.log(`Received webhook: ${req.headers['x-github-event']}`);
                await this.bot.handleWebhook(req, res);
            } catch (error) {
                console.error('Webhook error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Chat endpoint
        this.app.post('/chat', async (req, res) => {
            try {
                const { message, userId = 'default' } = req.body;
                const response = await this.chatInterface.handleMessage(message, userId);
                res.json({ response });
            } catch (error) {
                console.error('Chat error:', error);
                res.status(500).json({ error: 'Failed to process message' });
            }
        });

        // Get repository status
        this.app.get('/status/:owner/:repo', async (req, res) => {
            try {
                const { owner, repo } = req.params;
                const status = await this.bot.getRepositoryStatus(owner, repo);
                res.json(status);
            } catch (error) {
                console.error('Status error:', error);
                res.status(500).json({ error: 'Failed to get status' });
            }
        });

        // Manual pipeline trigger
        this.app.post('/trigger/:owner/:repo', async (req, res) => {
            try {
                const { owner, repo } = req.params;
                const { artifactId, branch = 'main' } = req.body;
                const result = await this.bot.triggerPipeline(owner, repo, branch, artifactId);
                res.json(result);
            } catch (error) {
                console.error('Trigger error:', error);
                res.status(500).json({ error: 'Failed to trigger pipeline' });
            }
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🤖 GitHub CI Bot running on port ${this.port}`);
            console.log(`📡 Webhook endpoint: http://localhost:${this.port}/webhook`);
            console.log(`💬 Chat endpoint: http://localhost:${this.port}/chat`);
        });
    }
}

// Start the server
const server = new Server();
server.start();

export default Server;