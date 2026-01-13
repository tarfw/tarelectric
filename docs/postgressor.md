# Hybrid Database Architecture: "The Postgressor" strategy

## Concept
To optimize for scale and cost, we utilize a split architecture where **Authentication & Identity** are managed by a specialized provider (Supabase), while high-volume **Data Synchronization & Storage** is handled by cost-effective self-hosted infrastructure.

## The Architecture Split

### 1. The Gateway: Supabase (Managed)
**Role:** Identity Provider & Secrets Vault
**Cost Model:** Free / Pro Tier (Low cost for Auth-only usage)
**Responsibilities:**
-   **Authentication:** Handles Signup, Login, Magic Links, OAuth.
-   **JWT Issuance:** Mints the JSON Web Token (JWT) used by the client.
-   **Vault:** Securely stores API keys (OpenAI, Anthropic, etc.) utilizing Supabase Vault.
-   **Row Level Security (RLS):** Can still be used for small, non-synced tables (e.g., user profile metadata).

### 2. The Engine: Self-Hosted Postgres (Aiven / Hetzner / RunPod)
**Role:** High-Performance Sync Backend
**Cost Model:** Box pricing (fixed monthly cost for high CPU/RAM/Storage)
**Responsibilities:**
-   **ElectricSQL Backend:** Hosts the logical replication stream.
-   **Heavy Writes:** Stores the `OR` (Operational/Working Memory) table with high-frequency updates.
-   **Vector Storage (Optional):** Can host `pgvector` if not using Turso for specific long-term storage needs.

## Security & Connection Bridge

The security boundary works because **both databases trust the same JWT Signature**.

### The "Shared Secret" Handshake
1.  **User Logs In:** Client authenticates with Supabase.
2.  **Token Received:** Supabase returns a JWT signed with `SUPABASE_JWT_SECRET`.
3.  **Sync Request:** Client connects to the Self-Hosted ElectricSQL instance, passing this Supabase JWT.
4.  **Verification:** The Self-Hosted ElectricSQL service is configured with the **SAME** `JWT_SECRET` as Supabase. It verifies the signature validly.

### Adapting Row Level Security (RLS)

In standard Supabase, you use `auth.uid()`. In a self-hosted ElectricSQL setup, this function might not exist or might behave differently.

**Standard Supabase Policy:**
```sql
create policy "User owns data" on "OR"
  using ( auth.uid() = user_id );
```

**ElectricSQL Self-Hosted Adaptation:**
ElectricSQL injects the user ID from the JWT into a session variable.
```sql
-- 1. Create a helper function (if Electric doesn't provide one automatically for your setup)
create or replace function current_user_id() returns text as $$
  select current_setting('electric.user_id', true);
$$ language sql stable;

-- 2. Use it in RLS
create policy "User owns data" on "OR"
  using ( current_user_id() = user_id );
```

## Cost Analysis
| Component | Traffic Type | Platform | Est. Cost |
| :--- | :--- | :--- | :--- |
| **Auth** | Low Bandwidth | Supabase | $0 - $25/mo |
| **Sync** | High Bandwidth / Storage | Self-Hosted | ~$10 - $50/mo (vs $100s for managed) |
| **Total** | **High Scale** | **Hybrid** | **~$35/mo** |

## Migration Steps
1.  **Export Schema:** Dump schema from initial Dev DB.
2.  **Spin Up VPS/Db:** Provision self-hosted Postgres.
3.  **Config:** Set `JWT_SECRET` on self-hosted instance to match Supabase Project Settings.
4.  **Connect Electric:** Point Electric Service to the new Self-Hosted DB URL.

## Hosting Recommendations (Bandwidth Optimized)

Since high-volume sync generates significant egress traffic, avoiding "Data Transfer" fees is critical.

| Provider | Type | Bandwidth Policy | Est. Cost | Difficulty |
| :--- | :--- | :--- | :--- | :--- |
| **Hetzner (EU)** | VPS | **20TB Included** (then €1/TB) | ~€5/mo | Medium |
| **Hetzner (US)** | VPS | **5TB Included** (then €1/TB) | ~€6/mo | Medium |
| **OVHcloud** | VPS | **Unmetered** (Unlimited) | ~$4/mo | Medium |
| **Oracle Cloud** | VPS | **10TB Free** (Always Free Tier) | $0 | High |

**Recommendation:**
*   **Best Value (EU):** Hetzner (20TB is massive).
*   **Safest (No Hidden Fees):** **OVHcloud**. Since traffic is unmetered, you can never get an overage bill.
*   **Note on Hetzner:** It is not a scam, but it is **metered**. If you exceed 20TB (unlikely for <100k users), you pay €1/TB.


*   **Note on Hetzner:** It is not a scam, but it is **metered**. If you exceed 20TB (unlikely for <100k users), you pay €1/TB.

## Regional Strategy: Tamil Nadu / India Focus

For a user base in **Tamil Nadu**, latency from Europe (Hetzner) will be ~150ms. You need a server in **Mumbai** or **Singapore**.

| Provider | Data Center | Latency to Chennai | Bandwidth | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Oracle Cloud** | **Mumbai / Hyderabad** | **< 20ms** (Excellent) | 10TB Free | **Winner (Performance)** |
| **OVHcloud** | **Mumbai or Singapore** | ~40ms (Very Good) | Unmetered (Singapore) | **Winner (Safety)** |
| **Hetzner** | **Singapore** | ~50ms (Good) | 20TB Included | Good Backup |
| **DigitalOcean** | Bangalore | < 20ms | Expensive ($0.01/GB) | Avoid for high scale |

**Final Recommendation for Tamil Nadu:**
Try to get an **Oracle Cloud Free Tier (Arm Instance)** in **Mumbai**.
-   **Cost:** $0
-   **Latency:** Instant
-   **Bandwidth:** 10TB (Enough for millions of local users)

If Oracle is too hard to sign up for, use **OVH Singapore**.


If you want the "Managed Service" experience (UI, backups, logs) but on your own cheap hardware (Hetzner/OVH), use these:

| Tool | Cost | What it does |
| :--- | :--- | :--- |
| **Coolify** | Free (Self-hosted) | **The "Open Source Vercel/Heroku".** Installs on your VPS. Manages Postgres, Docker, domains, and SSL automatically. Best pick. |
| **CapRover** | Free (Self-hosted) | Simpler, slightly older PaaS for your VPS. Rock solid. |
| **Dokku** | Free (CLI) | "Heroku in your terminal". |
| **Cleavr** | Paid SaaS (~$15/mo) | Connects to your Hetzner/DigitalOcean account and manages servers for you. |

**Strategy:** Buy a Hetzner VPS (€5) -> Install **Coolify** (Free) -> Deploy ElectricSQL + Postgres inside Coolify.


