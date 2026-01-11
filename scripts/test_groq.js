require('dotenv').config();
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText } = require('ai');

const openai = createOpenAI({
    baseURL: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1',
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
});

// Force the new model, ignoring .env
const model = openai('llama-3.3-70b-versatile');

async function test() {
    console.log('Testing Groq Key with llama-3.3-70b-versatile...');

    try {
        const result = await generateText({
            model,
            prompt: 'Say hello',
        });
        console.log('Success:', result.text);
    } catch (e) {
        console.error('Failed:', e);
    }
}

test();
