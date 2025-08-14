#!/bin/bash

echo "📤 Pushing regression test logs to Loki..."

# Read recent logs from the log file
LOGFILE="/mnt/d/AI_bot/Release_Deployment_Bot/github-ci-bot_Changes/RegressionTesting/logs/regression-tests.log"

if [ ! -f "$LOGFILE" ]; then
    echo "❌ Log file not found: $LOGFILE"
    exit 1
fi

# Get the last 20 lines from the log file
tail -20 "$LOGFILE" | while IFS= read -r line; do
    if [ -n "$line" ]; then
        # Extract timestamp from JSON log if possible, otherwise use current time
        TIMESTAMP=$(echo "$line" | jq -r '.timestamp // empty' 2>/dev/null)
        if [ -z "$TIMESTAMP" ] || [ "$TIMESTAMP" = "null" ]; then
            TIMESTAMP=$(date -Iseconds)
        fi
        
        # Convert to nanoseconds for Loki
        NANO_TIMESTAMP=$(date -d "$TIMESTAMP" +%s)000000000
        
        # Escape the JSON properly
        ESCAPED_LINE=$(echo "$line" | sed 's/"/\\"/g')
        
        # Push to Loki
        curl -s -X POST http://localhost:3100/loki/api/v1/push \
          -H 'Content-Type: application/json' \
          -d "{
            \"streams\": [
              {
                \"stream\": {
                  \"job\": \"regression-tests\",
                  \"service\": \"regression-testing-framework\",
                  \"level\": \"info\"
                },
                \"values\": [
                  [\"$NANO_TIMESTAMP\", \"$ESCAPED_LINE\"]
                ]
              }
            ]
          }" > /dev/null
        
        echo "✅ Pushed log: $(echo "$line" | cut -c1-80)..."
    fi
done

# Add a fresh timestamp log
CURRENT_TIMESTAMP=$(date +%s)000000000
CURRENT_TIME=$(date -Iseconds)

curl -s -X POST http://localhost:3100/loki/api/v1/push \
  -H 'Content-Type: application/json' \
  -d "{
    \"streams\": [
      {
        \"stream\": {
          \"job\": \"regression-tests\",
          \"service\": \"regression-testing-framework\",
          \"level\": \"info\"
        },
        \"values\": [
          [\"$CURRENT_TIMESTAMP\", \"{\\\"message\\\":\\\"✅ All regression test logs pushed to Loki successfully at $CURRENT_TIME\\\",\\\"level\\\":\\\"info\\\",\\\"timestamp\\\":\\\"$CURRENT_TIME\\\"}\"]
        ]
      }
    ]
  }" > /dev/null

echo "🎯 All logs pushed to Loki! Check Grafana dashboard now."
