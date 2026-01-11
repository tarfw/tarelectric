const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Read .env directly
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// 2. Find the key
let apiKey = '';
const lines = envContent.split('\n');
for (const line of lines) {
    if (line.trim().startsWith('LLM_API_KEY=')) {
        apiKey = line.split('=')[1].trim();
        break;
    }
}

// 3. Sanitize (Remove quotes ' " and whitespace)
if (apiKey) {
    apiKey = apiKey.replace(/['"]/g, '').trim();
}

if (!apiKey) {
    console.error('Could not find LLM_API_KEY in .env');
    process.exit(1);
}

console.log(`Found Key: ${apiKey.slice(0, 5)}...${apiKey.slice(-4)} (Length: ${apiKey.length})`);

// 4. Upload to Cloudflare (LLM_API_KEY)
console.log('Uploading LLM_API_KEY...');
try {
    execSync('npx wrangler secret put LLM_API_KEY', { input: apiKey, stdio: ['pipe', 'inherit', 'inherit'] });
    console.log('✅ LLM_API_KEY set.');
} catch (e) {
    console.error('Failed to set LLM_API_KEY');
}

// 5. Upload as OPENAI_API_KEY too (Safe fallback)
console.log('Uploading OPENAI_API_KEY (Fallback)...');
try {
    execSync('npx wrangler secret put OPENAI_API_KEY', { input: apiKey, stdio: ['pipe', 'inherit', 'inherit'] });
    console.log('✅ OPENAI_API_KEY set.');
} catch (e) {
    console.error('Failed to set OPENAI_API_KEY');
}

console.log('Done. Please wait 10s before testing.');
