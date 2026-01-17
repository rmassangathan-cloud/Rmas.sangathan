#!/bin/bash

# Install Chromium for Puppeteer
apt-get update
apt-get install -y chromium-browser

# Set Puppeteer environment variables
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

echo "Puppeteer environment prepared"