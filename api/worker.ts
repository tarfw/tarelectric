import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { agentHandler } from './agent';

const app = new Hono();

app.use('*', cors());

// Health Check
app.get('/', (c) => c.text('Agent is running on Cloudflare Workers'));

app.post('/api/chat', async (c) => {
    // PASS ENV EXPLICITLY
    return agentHandler(c.req.raw, c.env);
});

export default app;
