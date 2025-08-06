# GitHub CI Bot Use Cases

## 1. Pipeline Status Monitoring

### Example: Check Repository Status
```javascript
// Chat command
"Check status of myorg/myrepo"

// API call
GET /status/myorg/myrepo

// Response
{
  "repository": "myorg/myrepo",
  "workflows": [
    {
      "workflow_id": "123",
      "workflow_name": "Release Pipeline",
      "recent_runs": [
        {
          "id": "456",
          "status": "completed",
          "conclusion": "success",
          "created_at": "2024-01-20T10:00:00Z"
        }
      ]
    }
  ]
}
```

## 2. Automated Failure Analysis

### Example: Analyze Failed Pipeline
```javascript
// Chat command
"Analyze failures in myorg/myrepo"

// API call
GET /status/myorg/myrepo/failures

// Response
{
  "root_cause": "Missing environment variable NODE_ENV",
  "is_minor": true,
  "fixes": [
    "Add NODE_ENV to workflow environment",
    "Set NODE_ENV in repository secrets"
  ],
  "confidence": 8
}
```

## 3. Manual Pipeline Triggering

### Example: Trigger Release
```javascript
// Chat command
"Trigger release for myorg/myrepo with artifact v1.0.0"

// API call
POST /trigger/myorg/myrepo
{
  "artifactId": "v1.0.0",
  "branch": "main"
}

// Response
{
  "success": true,
  "message": "Pipeline triggered",
  "run_id": "789"
}
```

## 4. Auto-Fix Implementation

### Example: Fix Environment Issues
```javascript
// Scenario: Missing environment variable
const analysis = {
  root_cause: "Missing NODE_ENV",
  is_minor: true,
  fixes: ["Add NODE_ENV=production"]
};

// Bot automatically creates PR
{
  "title": "Fix: Add missing NODE_ENV variable",
  "changes": [
    {
      "file": ".github/workflows/release.yml",
      "update": "env:\n  NODE_ENV: production"
    }
  ]
}
```

## 5. Interactive Chat Support

### Example: Conversational Interaction
```javascript
// User: "Hi, I need help with my pipeline"
// Bot: "Hello! I can help you with:
//      • Check pipeline status
//      • Trigger releases
//      • Analyze failures
//      What would you like to do?"

// User: "My last build failed"
// Bot: "I'll analyze the latest failure for your repository.
//      Let me check the logs..."
```

## 6. Workflow History Analysis

### Example: View Pipeline History
```javascript
// Chat command
"Show history for myorg/myrepo"

// API call
GET /status/myorg/myrepo/history

// Response
{
  "total_runs": 50,
  "success_rate": "92%",
  "recent_runs": [
    {
      "id": "123",
      "status": "success",
      "duration": "5m 30s",
      "triggered_by": "push"
    }
  ],
  "common_failures": [
    "Test failures: 40%",
    "Build errors: 30%",
    "Environment issues: 30%"
  ]
}
```

## 7. Integration Examples

### Example: Integration with Slack
```javascript
// Webhook notification to Slack
POST /chat
{
  "channel": "deployments",
  "message": "🚀 New release triggered for myorg/myrepo",
  "attachments": [
    {
      "title": "Build Status",
      "text": "Building artifact: v1.0.0",
      "color": "#36a64f"
    }
  ]
}
```

## 8. Error Recovery

### Example: Handle Failed Deployment
```javascript
// Automatic rollback
if (deploymentFailed) {
  await bot.triggerPipeline(owner, repo, 'main', lastStableArtifact);
  await bot.notifyTeam({
    severity: 'high',
    message: 'Deployment failed, rolling back to last stable version',
    actions: ['View Logs', 'Retry Deployment']
  });
}
```

## 9. Custom Workflow Management

### Example: Create Custom Pipeline
```javascript
// Chat command
"Create new workflow for myorg/myrepo"

// API call
POST /workflows/myorg/myrepo
{
  "name": "Custom Build",
  "triggers": ["push", "manual"],
  "steps": [
    {
      "name": "build",
      "commands": ["npm install", "npm run build"]
    }
  ]
}
```

## 10. Monitoring and Alerts

### Example: Set Up Monitoring
```javascript
// Configure alerts
POST /alerts/myorg/myrepo
{
  "conditions": [
    {
      "type": "failure_threshold",
      "value": 3,
      "period": "24h",
      "action": "notify_team"
    }
  ],
  "notifications": {
    "slack": "#alerts",
    "email": "team@company.com"
  }
}
```

These use cases demonstrate the bot's capabilities in:
- Pipeline management
- Failure analysis
- Automated fixes
- Team collaboration
- Error handling
- Custom workflows
- Monitoring and alerting
