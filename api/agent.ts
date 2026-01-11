import { createOpenAI } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { tursoServerService } from './services/turso';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { OR } from '../src/db/schema_pg';
import { randomUUID } from 'crypto';

// Setup Database Connection (Postgres) for Working Memory
const connectionString = process.env.DATABASE_URL || '';
const client = postgres(connectionString);
const db = drizzle(client);

// HARDCODED CONFIGURATION (Safety Layer)
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL_ID = 'llama-3.1-8b-instant';

// Updated Signature: accepts env
export const agentHandler = async (req: Request, env: any) => {
    try {
        const body = await req.json() as any;
        const { messages } = body;

        // NATIVE ENV LOADING
        const apiKey = env.LLM_API_KEY || env.OPENAI_API_KEY || '';

        const openai = createOpenAI({
            baseURL: GROQ_BASE_URL,
            apiKey: apiKey,
        });

        const model = openai(GROQ_MODEL_ID);

        // NON-STREAMING (generateText)
        const result = await generateText({
            model,
            messages,
            maxSteps: 5,
            system: `You are an intelligent Assistant for a Super App.
      1. Your goal is to help users Book Services, Buy Products, or Manage Tasks.
      2. You have access to "Long Memory" (Turso) to find IDs of drivers, products, etc.
      3. You have access to "Working Memory" (Postgres OR Table) to EXECUTE actions using Opcodes.
      
      OPCODES:
      - 101: Stock In | 102: Stock Sale
      - 201: Invoice Create (Purchase)
      - 301: Task Create (Booking/Service) | 302: Task Assign
      - 401: Account Pay
      
      Start by SEARCHING memory if you need specific IDs.
      Then EXECUTE the opcode.

      IMPORTANT:
      - You MUST output text to explain what you are doing.
      - Do NOT call a tool without first sending a text message explanation.
      - Always confirm to the user what you did.

      TOOL USAGE EXAMPLES:
      1. Searching:
      call searchMemory({ query: "taxi driver" })

      2. Executing (Strict JSON format):
      call executeOpcode({ 
        "opcode": 301, 
        "payload": { "title": "Book Taxi", "type": "transport" } 
      })
      DO NOT use "Opcode" or "params". Use "opcode" and "payload".`,
            tools: {
                searchMemory: tool({
                    description: 'Search long-term memory for drivers, products, services, or history.',
                    parameters: z.object({
                        query: z.string().describe('The search query (e.g., "taxi drivers", "iphone price")'),
                    }),
                    execute: async ({ query }) => {
                        console.log('Tool Call: searchMemory', query);
                        const results = await tursoServerService.listByTopic(query);
                        return JSON.stringify(results);
                    },
                }),
                executeOpcode: tool({
                    description: 'Execute a formal action by writing to the Working Memory (OR Table).',
                    parameters: z.object({
                        opcode: z.number().describe('The Opcode ID (e.g. 301 for Task Create)'),
                        payload: z.any().describe('The JSON payload for the action. For 301/Task: { title, type, assignee_id }. For 201/Invoice: { amount, items }'),
                        streamId: z.string().optional().describe('Unique ID for this stream/process. If null, a new one is generated.'),
                    }),
                    execute: async ({ opcode, payload, streamId }) => {
                        console.log('Tool Call: executeOpcode', opcode);
                        const id = randomUUID();
                        const sId = streamId || randomUUID();

                        await db.insert(OR).values({
                            id,
                            streamId: sId,
                            opcode,
                            payload,
                            scope: 'private',
                            status: 'active',
                            ts: new Date(),
                        });

                        return `Action Executed. Opcode: ${opcode}, StreamID: ${sId}`;
                    }
                })
            },
        });

        // Validated response
        console.log('Agent Response:', result.text);

        return new Response(result.text, {
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error: any) {
        console.error('Agent Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to process request',
            details: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
