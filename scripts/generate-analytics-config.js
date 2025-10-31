#!/usr/bin/env node

/**
 * Generate Analytics Configuration
 *
 * This script reads the GOOGLE_ANALYTICS_ID from .env and generates
 * a JavaScript config file that can be included in HTML pages.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    console.log('No .env file found. Google Analytics will be disabled.');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  // Handle both Unix (\n) and Windows (\r\n) line endings
  envContent.split(/\r?\n/).forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      return;
    }

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

// Generate the config file
function generateConfig() {
  const env = loadEnv();
  const analyticsId = env.GOOGLE_ANALYTICS_ID || '';

  const configContent = `/**
 * Analytics Configuration
 * Auto-generated from .env - DO NOT EDIT MANUALLY
 * Generated: ${new Date().toISOString()}
 */

// Google Analytics Measurement ID from environment
const GOOGLE_ANALYTICS_ID = '${analyticsId}';
`;

  const outputPath = path.join(__dirname, '..', 'assets', 'js', 'analytics-config.js');
  fs.writeFileSync(outputPath, configContent, 'utf-8');

  if (analyticsId) {
    console.log('✓ Analytics config generated with ID:', analyticsId);
  } else {
    console.log('⚠ Analytics config generated without ID (analytics will be disabled)');
  }
}

// Run the script
generateConfig();
