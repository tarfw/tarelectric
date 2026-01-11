import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { agentHandler } from './agent';

const app = new Hono();

app.use('*', cors());

app.get('/', (c) => c.text('Agent is running on Cloudflare Workers!'));

app.post('/api/chat', async (c) => {
    return agentHandler(c.req.raw);
});

export default app;
