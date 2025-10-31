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
  const cloudflareToken = env.CLOUDFLARE_ANALYTICS_TOKEN || '';
  const clarityId = env.MICROSOFT_CLARITY_ID || '';

  const configContent = `/**
 * Analytics Configuration
 * Auto-generated from .env - DO NOT EDIT MANUALLY
 * Generated: ${new Date().toISOString()}
 */

// Google Analytics Measurement ID from environment
const GOOGLE_ANALYTICS_ID = '${analyticsId}';

// Cloudflare Web Analytics Token from environment
const CLOUDFLARE_ANALYTICS_TOKEN = '${cloudflareToken}';

// Microsoft Clarity Project ID from environment
const MICROSOFT_CLARITY_ID = '${clarityId}';
`;

  const outputPath = path.join(__dirname, '..', 'assets', 'js', 'analytics-config.js');
  fs.writeFileSync(outputPath, configContent, 'utf-8');

  // Report what was configured
  const configured = [];
  if (analyticsId) configured.push('Google Analytics');
  if (cloudflareToken) configured.push('Cloudflare Web Analytics');
  if (clarityId) configured.push('Microsoft Clarity');

  if (configured.length > 0) {
    console.log('✓ Analytics config generated with:', configured.join(', '));
  } else {
    console.log('⚠ Analytics config generated without any IDs (all analytics will be disabled)');
  }
}

// Run the script
generateConfig();
