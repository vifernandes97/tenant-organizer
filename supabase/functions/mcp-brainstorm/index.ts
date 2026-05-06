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

async function authenticate(req: Request): Promise<AuthContext | null> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

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
  for (const [k, v] of Object.entries(corsHeaders)) merged.set(k, v);
  return new Response(response.body, {
    status: response.status,
    headers: merged,
  });
});

Deno.serve(app.fetch);
