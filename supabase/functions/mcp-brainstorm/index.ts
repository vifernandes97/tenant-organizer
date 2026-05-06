// MCP server (Streamable HTTP) for sending brainstorm ideas from external clients (e.g. Claude).
// Authenticates via Bearer token from `tenant_api_tokens`.
import { Hono } from "npm:hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.74.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type AuthContext = { tenant_id: string; created_by: string };
type SessionAuth = { auth: AuthContext; expiresAt: number };

const sessionAuthCache = new Map<string, SessionAuth>();
const SESSION_AUTH_TTL_MS = 60 * 60 * 1000;

function getCachedSessionAuth(req: Request): AuthContext | null {
  const sessionId = req.headers.get("mcp-session-id");
  if (!sessionId) return null;

  const cached = sessionAuthCache.get(sessionId);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    sessionAuthCache.delete(sessionId);
    return null;
  }

  return cached.auth;
}

function cacheSessionAuth(response: Response, auth: AuthContext) {
  const sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) return;

  sessionAuthCache.set(sessionId, {
    auth,
    expiresAt: Date.now() + SESSION_AUTH_TTL_MS,
  });
}

async function authenticate(req: Request): Promise<AuthContext | null> {
  let token: string | null = null;

  // 1) Prefer query params (Claude MCP connector may inject its own Authorization header)
  try {
    const url = new URL(req.url);
    token = url.searchParams.get("token") || url.searchParams.get("api_key");
  } catch (_) {}

  // 2) Fallback to Authorization: Bearer header
  if (!token) {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      token = auth.slice(7).trim();
    }
  }

  // 3) Fallback to custom header
  if (!token) {
    token = req.headers.get("x-api-token") || req.headers.get("x-api-key");
  }

  // 4) MCP clients may drop the original query string after initialize and rely on mcp-session-id
  if (!token) return getCachedSessionAuth(req);

  // Only accept tokens with our prefix to avoid validating arbitrary OAuth tokens
  if (!token.startsWith("mh_")) return null;

  const tokenHash = await sha256Hex(token);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("validate_api_token", { _token_hash: tokenHash });
  if (error || !data || (data as any[]).length === 0) return null;
  const row = (data as any[])[0];
  return { tenant_id: row.tenant_id, created_by: row.created_by };
}

// Build MCP server with auth context propagation via request meta
const mcp = new McpServer({
  name: "marketing-hub-brainstorm",
  version: "1.0.0",
});

mcp.tool("create_brainstorm_ideas", {
  description:
    "Create one or more brainstorm ideas in Marketing Hub. Each idea has a title (the topic/theme) and an optional description with all the details. Use this to send multiple ideas at once.",
  inputSchema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 1, maxLength: 200, description: "Topic/theme of the idea" },
            description: { type: "string", maxLength: 20000, description: "Full details/content of the idea" },
          },
          required: ["title"],
          additionalProperties: false,
        },
      },
    },
    required: ["ideas"],
    additionalProperties: false,
  },
  handler: async (input: any, ctx: any) => {
    const auth: AuthContext | undefined = ctx?.meta?.auth;
    if (!auth) {
      return {
        isError: true,
        content: [{ type: "text", text: "Unauthorized: missing or invalid API token." }],
      };
    }

    const ideas = (input?.ideas ?? []) as Array<{ title: string; description?: string }>;
    if (!Array.isArray(ideas) || ideas.length === 0) {
      return { isError: true, content: [{ type: "text", text: "No ideas provided." }] };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows = ideas.map((i) => ({
      tenant_id: auth.tenant_id,
      created_by: auth.created_by,
      title: String(i.title).trim().slice(0, 200),
      description: i.description ? String(i.description).slice(0, 20000) : null,
      status: "nova" as const,
    }));

    const { data, error } = await supabase
      .from("brainstorm_ideas")
      .insert(rows)
      .select("id, title");

    if (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to create ideas: ${error.message}` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Created ${data?.length ?? 0} brainstorm idea(s):\n${(data ?? [])
            .map((d: any, idx: number) => `${idx + 1}. ${d.title} (id: ${d.id})`)
            .join("\n")}`,
        },
      ],
    };
  },
});

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);
const app = new Hono();

app.options("*", (c) => new Response(null, { headers: corsHeaders }));

app.all("/*", async (c) => {
  const req = c.req.raw;
  const auth = await authenticate(req);

  if (!auth) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: invalid or missing API token" },
        id: null,
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const response = await httpHandler(req, { meta: { auth } });

  // Attach CORS headers
  const merged = new Headers(response.headers);
  if (!merged.get("mcp-session-id")) {
    merged.set("mcp-session-id", crypto.randomUUID());
  }
  cacheSessionAuth(new Response(null, { headers: merged }), auth);

  for (const [k, v] of Object.entries(corsHeaders)) merged.set(k, v);
  return new Response(response.body, {
    status: response.status,
    headers: merged,
  });
});

Deno.serve(app.fetch);
