import { router } from "expo-router";

export type AiIntent = {
    opcode: number;
    payload: any;
    label: string;
    confidence: number;
    type: 'ACTION' | 'CHAT';
    reply?: string;
};

// OPCODES Map for reference
const OPCODES_MAP: Record<number, string> = {
    101: 'SI Stock In',
    102: 'SO Stock Sale',
    103: 'SR Stock Return',
    104: 'SA Stock Adjust',
    201: 'IC Invoice Create',
    202: 'IA Invoice Item Add',
    203: 'IP Invoice Payment',
    207: 'IR Invoice Refund',
    301: 'TC Task Create',
    302: 'TA Task Assign',
    303: 'TS Task Start',
    304: 'TP Task Progress',
    305: 'TD Task Done',
    401: 'AP Account Pay',
    403: 'AR Account Refund',
};

class AiService {
    /**
     * Determine if the user input is an Action (Database Write) or Chat.
     * Uses Groq API with Llama 3.1 8B for fast, cheap inference.
     */
    async processInput(text: string): Promise<AiIntent> {
        const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
            console.error('Missing EXPO_PUBLIC_GROQ_API_KEY');
            return {
                type: 'CHAT',
                opcode: 0,
                label: 'Error',
                confidence: 0,
                reply: 'Configuration Error: Missing Groq API Key.',
                payload: null
            };
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an AI assistant for a commerce app. Your goal is to map user input to a specific OPCODE.
Valid OPCODES:
[Stock]
101: SI Stock In (Buying/Receiving goods)
102: SO Stock Sale (Selling goods)
103: SR Stock Return
104: SA Stock Adjust

[Invoice/Finance]
201: IC Invoice Create
203: IP Invoice Payment
401: AP Account Pay (Expense)

[Tasks]
301: TC Task Create
302: TA Task Assign

[Products - NEW]
501: PC Product Create (Create new item)
502: VC Variant Create (Add variant to item)

Output format: JSON ONLY.
Structure:
{
  "type": "ACTION" | "CHAT",
  "opcode": number | 0,
  "label": "string",
  "payload": { 
     "text": "original text", 
     "qty": number, 
     "amount": number,
     "name": "string (for product/variant)",
     "price": number (for product/variant)
  },
  "reply": "string"
}

6. STRICTLY NO MARKDOWN. ONLY RAW JSON.

Examples:
- "Sold 5 Samsung TVs" -> { type: "ACTION", opcode: 102, payload: { qty: 5, name: "Samsung TV" } }
- "Sale of 3 items" -> { type: "ACTION", opcode: 102, payload: { qty: 3, name: "items" } }
- "Stock out 10 Coke" -> { type: "ACTION", opcode: 102, payload: { qty: 10, name: "Coke" } }

- "Bought 100 apples" -> { type: "ACTION", opcode: 101, payload: { qty: 100, name: "apple" } }
- "Received shipment of 50 units" -> { type: "ACTION", opcode: 101, payload: { qty: 50, name: "units" } }
- "Stock in 20 Pepsi" -> { type: "ACTION", opcode: 101, payload: { qty: 20, name: "Pepsi" } }

- "Paid $50 for electricity" -> { type: "ACTION", opcode: 401, payload: { amount: 50, text: "Paid $50 for electricity" } }
- "Expense 200 for travel" -> { type: "ACTION", opcode: 401, payload: { amount: 200, text: "Expense 200 for travel" } }
- "Bill payment 500" -> { type: "ACTION", opcode: 401, payload: { amount: 500, text: "Bill payment 500" } }

- "Create product Pepsi price 20" -> { type: "ACTION", opcode: 501, payload: { name: "Pepsi", price: 20, text: "Create product Pepsi price 20" } }
- "New item T-Shirt cost 15" -> { type: "ACTION", opcode: 501, payload: { name: "T-Shirt", price: 15, text: "New item T-Shirt cost 15" } }

- "Remind me to call John" -> { type: "ACTION", opcode: 301, payload: { text: "Remind me to call John" } }
- "Task: Update inventory" -> { type: "ACTION", opcode: 301, payload: { text: "Task: Update inventory" } }`
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ],
                    temperature: 0.1, // Low temp for deterministic actions
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq API Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) throw new Error('Empty response from AI');

            const result = JSON.parse(content);

            // Normalize payload
            if (result.type === 'ACTION') {
                return {
                    type: 'ACTION',
                    opcode: result.opcode,
                    label: result.label || OPCODES_MAP[result.opcode] || 'Operation',
                    confidence: 1,
                    payload: result.payload || { text }
                };
            }

            return {
                type: 'CHAT',
                opcode: 0,
                label: 'Chat',
                confidence: 1,
                reply: result.reply || "I didn't understand that.",
                payload: null
            };

        } catch (e) {
            console.error('AI Service Error:', e);
            return {
                type: 'CHAT',
                opcode: 0,
                label: 'Error',
                confidence: 0,
                reply: 'Sorry, I realized I cannot connect to the AI brain right now.',
                payload: null
            };
        }
    }

    private extractNumber(text: string): number | undefined {
        // Fallback helper if needed, but AI should do it
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : undefined;
    }
}

export const aiService = new AiService();
