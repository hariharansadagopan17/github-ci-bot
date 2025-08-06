# GitHub CI/CD Bot

An intelligent bot that helps manage GitHub Actions workflows, analyze pipeline failures, and automate fixes using AI.

## Features

- 🤖 Automated workflow failure analysis
- 🔄 Auto-fix capabilities for common issues
- 💬 Natural language interaction
- 📊 Pipeline status monitoring
- 🚀 Manual pipeline triggering
- 📈 Workflow history tracking

## Setup

### Prerequisites

- Node.js (v14 or higher)
- GitHub Account with repository access
- OpenAI API key

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
OPENAI_API_KEY=your_openai_api_key
```

### Installation

```bash
npm install
npm start
```

## Usage

### Webhook Endpoint

The bot listens for GitHub webhook events at:
```
POST /webhook
```

Configure your GitHub repository webhook with:
- Payload URL: `https://your-domain.com/webhook`
- Content type: `application/json`
- Secret: Same as `GITHUB_WEBHOOK_SECRET`
- Events: `workflow_run`, `workflow_job`, `push`

### API Endpoints

#### Status Check
```
GET /status/:owner/:repo
```

#### Manual Trigger
```
POST /trigger/:owner/:repo
{
  "artifactId": "optional-artifact-id",
  "branch": "main"
}
```

#### Chat Interface
```
POST /chat
{
  "message": "Check status of owner/repo",
  "userId": "optional-user-id"
}
```

### Chat Commands

The bot understands natural language commands like:

- "Check status of owner/repo"
- "Trigger release for owner/repo"
- "Show history for owner/repo"
- "Analyze failures in owner/repo"

## Architecture

### Components

- **Server**: Express.js server handling HTTP requests
- **GitHubBot**: Core bot logic and GitHub API interactions
- **ChatInterface**: Natural language processing and response generation
- **PipelineResolver**: Workflow analysis and automated fixing

### Technologies

- Node.js & Express
- GitHub Actions API
- OpenAI GPT-4
- Axios for HTTP requests
- Crypto for security

## Error Handling

The bot includes comprehensive error handling for:
- Corrupted workflow logs
- Binary/encoded content
- API rate limits
- Authentication issues
- Webhook verification

## Security

- Webhook signature verification
- Environment variable protection
- Token-based authentication
- CORS configuration
- Request validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details
