const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Manually parse .env to avoid 'dotenv' dependency if not installed, though it likely is.
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.error('.env file not found!');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const secrets = {};

envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('=');
    const key = parts[0];

    // Join the rest in case value has =
    let value = parts.slice(1).join('=');

    // SANITIZATION: Strip quotes and whitespace
    if (value) {
        value = value.trim().replace(/^['"]|['"]$/g, '');
    }

    if (key && value) {
        secrets[key] = value;
    }
});

const TARGET_SECRETS = [
    'DATABASE_URL',
    'LLM_API_KEY',
    'TURSO_DB_URL',
    'TURSO_AUTH_TOKEN',
    'LLM_MODEL' // Added LLM_MODEL to sync list
];

console.log('Deploying secrets to Cloudflare...');

TARGET_SECRETS.forEach(targetKey => {
    // Try exact match first
    let val = secrets[targetKey];

    // If not found, try EXPO_PUBLIC_ prefix
    if (!val) {
        val = secrets[`EXPO_PUBLIC_${targetKey}`];
    }

    if (!val) {
        console.warn(`Skipping ${targetKey} (not found in .env as ${targetKey} or EXPO_PUBLIC_${targetKey})`);
        return;
    }

    console.log(`Setting ${targetKey}...`);
    try {
        // Use input option to pipe secret safely
        execSync(`npx wrangler secret put ${targetKey}`, { input: val, stdio: ['pipe', 'inherit', 'inherit'] });
        console.log(`✅ ${targetKey} set.`);
    } catch (e) {
        console.error(`❌ Failed to set ${targetKey}:`, e.message);
    }
});

console.log('Done!');
