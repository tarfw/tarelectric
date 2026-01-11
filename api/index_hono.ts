import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { agentHandler } from './agent';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health Check
app.get('/api/health', (c) => c.json({ status: 'ok', runtime: 'hono' }));

// Agent Chat Endpoint
app.post('/api/chat', async (c) => {
    console.log('[API] Received request at /api/chat');
    return agentHandler(c.req.raw);
});

app.notFound((c) => c.text('Not Found', 404));

const port = 3001;
console.log(`Server is running on port ${port} (0.0.0.0)`);

// Bind to 0.0.0.0 to authorize External/Emulator access
serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0'
});

export default app;
