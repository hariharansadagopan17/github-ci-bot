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
        console.log('Headers:', req.headers);
        const signature = req.headers['x-hub-signature-256'];
        const payload = JSON.stringify(req.body);
        const secret = process.env.GITHUB_WEBHOOK_SECRET;

        if (!signature) {
            return res.status(401).json({ error: 'No signature found' });
        }

        const computedSignature = `sha256=${crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex')}`;

        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        next();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Add signature verification for webhook endpoint
        this.app.use('/webhook', (req, res, next) => this.verifyWebhookSignature(req, res, next));

        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
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


// Start the serverconst server = new Server();
server.start();

export default Server;