#!/bin/bash

# Simple log push test to Loki
TIMESTAMP=$(date +%s)000000000
CURRENT_TIME=$(date -Iseconds)

curl -X POST http://localhost:3100/loki/api/v1/push \
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
          [\"$TIMESTAMP\", \"{\\\"message\\\":\\\"Test log from WSL2 - $(date)\\\",\\\"level\\\":\\\"info\\\",\\\"timestamp\\\":\\\"$CURRENT_TIME\\\"}\"]
        ]
      }
    ]
  }"

echo "Log push test completed"
