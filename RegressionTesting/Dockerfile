# Use Node.js LTS version with Chrome pre-installed
FROM node:20-slim

# Set environment variables early
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV HEADLESS=true
ENV CI=true

# Install system dependencies for Chrome and tools
RUN apt-get update && apt-get install -y \
    wget \
    gnupg2 \
    unzip \
    curl \
    xvfb \
    x11vnc \
    fluxbox \
    wmctrl \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (stable version)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-archive-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-archive-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver using npm (more reliable)
RUN npm install -g chromedriver@119.0.1 \
    && rm -f /usr/local/bin/chromedriver \
    && ln -s /usr/local/lib/node_modules/chromedriver/bin/chromedriver /usr/local/bin/chromedriver \
    && chmod +x /usr/local/bin/chromedriver

# Verify Chrome and ChromeDriver installation
RUN google-chrome --version \
    && chromedriver --version

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN groupadd -r testuser && useradd -r -g testuser -s /bin/bash testuser \
    && mkdir -p /home/testuser \
    && chown -R testuser:testuser /home/testuser \
    && chown -R testuser:testuser /app

# Copy package files first for better caching
COPY --chown=testuser:testuser package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production --silent && npm cache clean --force

# Copy application code
COPY --chown=testuser:testuser . .

# Create necessary directories with proper permissions
RUN mkdir -p logs reports screenshots \
    && chown -R testuser:testuser logs reports screenshots \
    && chmod 755 logs reports screenshots

# Switch to non-root user
USER testuser

# Set environment variables for the application
ENV HEADLESS=true
ENV CI=true
ENV DISPLAY=:99
ENV NODE_ENV=production

# Create a script to run tests with virtual display
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Function to cleanup on exit\n\
cleanup() {\n\
    echo "Cleaning up..."\n\
    pkill -f Xvfb || true\n\
    pkill -f fluxbox || true\n\
}\n\
\n\
# Set trap to cleanup on exit\n\
trap cleanup EXIT\n\
\n\
echo "Starting virtual display..."\n\
# Start virtual display\n\
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &\n\
XVFB_PID=$!\n\
export DISPLAY=:99\n\
\n\
# Wait for display to be ready\n\
echo "Waiting for display to be ready..."\n\
for i in {1..30}; do\n\
    if xdpyinfo -display :99 >/dev/null 2>&1; then\n\
        echo "Display is ready"\n\
        break\n\
    fi\n\
    sleep 1\n\
done\n\
\n\
# Start window manager\n\
echo "Starting window manager..."\n\
fluxbox -display :99 &\n\
sleep 2\n\
\n\
# Verify Chrome can start\n\
echo "Verifying Chrome installation..."\n\
google-chrome --version\n\
chromedriver --version\n\
\n\
echo "Starting tests..."\n\
# Run the tests\n\
exec "$@"\n\
' > /app/run-tests.sh && chmod +x /app/run-tests.sh

# Expose metrics port (if using Prometheus metrics)
EXPOSE 9090 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9090/metrics || curl -f http://localhost:3000/health || exit 1

# Default command - run smoke tests by default
CMD ["./run-tests.sh", "npm", "run", "test:smoke"]

# Labels for better container management
LABEL maintainer="Automation Team"
LABEL version="1.0.0"
LABEL description="Regression Testing Framework with Selenium, Cucumber, and Metrics"
