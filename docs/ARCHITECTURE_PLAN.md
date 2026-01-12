# Cost-Optimized Architecture Plan

## Goal
Reduce AI inference costs by **70%** (from $25k/mo to ~$7.5k/mo) without sacrificing the "Magic" of the AI experience.

## The "Hybrid Router" Pattern

Instead of sending *every* keystroke or message to the LLM, we use a 3-tier handling system.

### Tier 1: The "Reflex" Layer (Device & Edge)
*   **Latency:** 5ms (Instant)
*   **Cost:** $0
*   **Technology:** Local Regex / Keyword Matching
*   **Use Case:** User types "Taxi", "Cab", "Food", "Book".
*   **Action:** Immediately open the corresponding UI Card (Optimistic UI). Do not wait for server.

### Tier 2: The "Router" Layer (Serverless / Small Model)
*   **Latency:** 200ms
*   **Cost:** Low (Vector Search or Tiny Classifier)
*   **Technology:** Turso Vector Search + optional 0.5B Model
*   **Use Case:** User types "Ride to airport", "Chicken biryani".
*   **Action:** 
    1. Convert text to Vector.
    2. Search Turso `products` and `services`.
    3. If High Confidence Match (>0.85) -> Return JSON directly. **BYPASS LLM.**

### Tier 3: The "Reasoning" Layer (LLM)
*   **Latency:** 1-2s
*   **Cost:** High ($)
*   **Technology:** Llama 3 8B (Server)
*   **Use Case:** Complex, messy, or multi-step requests.
    *   "My last order was wrong, I need a refund."
    *   "Plan a dinner for 2 people with italian food under 500rs."
    *   "Book a taxi to the airport and stop at a flower shop."
*   **Action:** Full LLM agent loop (Search Memory -> Plan -> Execute).

## Implementation Changes

### 1. `api/router.ts` (New)
A lightweight endpoint that runs *before* the Agent.
```typescript
// Pseudo-code
if (isExactMatch(input)) return uiAction;
const vectorMatch = await turso.search(input);
if (vectorMatch.score > 0.85) return vectorMatch.action;
return agent.chat(input); // Fallback to LLM
```

### 2. Client-Side "Optimistic Intent"
In `agent.tsx`, as the user types, we check for local keywords to "suggest" actions before they even hit Send.

## Next Steps
1. Create `api/router.ts`
2. Update `agent.tsx` to handle "Tier 1" local matches.
