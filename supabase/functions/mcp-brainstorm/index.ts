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
type SessionPayload = AuthContext & { exp: number };

const sessionAuthCache = new Map<string, SessionAuth>();
const SESSION_AUTH_TTL_MS = 60 * 60 * 1000;

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sessionSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SERVICE_ROLE),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSignedSessionId(auth: AuthContext): Promise<string> {
  const payload: SessionPayload = {
    ...auth,
    exp: Date.now() + SESSION_AUTH_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await sessionSigningKey(), new TextEncoder().encode(encodedPayload)),
  );
  return `mhmcp_${encodedPayload}.${base64UrlEncode(signature)}`;
}

type AuthLog = {
  reqId: string;
  tokenSource: "query" | "bearer" | "x-api-token" | "session" | "none";
  sessionIdPresent: boolean;
  sessionIdPrefix: string | null;
  reason?: string;
};

function logAuth(stage: string, log: AuthLog, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ scope: "mcp-brainstorm.auth", stage, ...log, ...extra }));
}

function maskSessionId(sid: string | null): string | null {
  if (!sid) return null;
  return sid.length <= 12 ? sid : `${sid.slice(0, 10)}…${sid.slice(-4)}`;
}

async function getCachedSessionAuth(req: Request, log: AuthLog): Promise<AuthContext | null> {
  const sessionId = req.headers.get("mcp-session-id");
  if (!sessionId) {
    log.reason = "no-token-and-no-session-id";
    return null;
  }

  const cached = sessionAuthCache.get(sessionId);
  if (cached) {
    if (cached.expiresAt <= Date.now()) {
      sessionAuthCache.delete(sessionId);
      log.reason = "session-cache-expired";
      return null;
    }
    log.tokenSource = "session";
    logAuth("session-cache-hit", log);
    return cached.auth;
  }

  if (!sessionId.startsWith("mhmcp_")) {
    log.reason = "session-id-unknown-prefix";
    return null;
  }
  const [encodedPayload, encodedSignature] = sessionId.slice("mhmcp_".length).split(".");
  if (!encodedPayload || !encodedSignature) {
    log.reason = "session-id-malformed";
    return null;
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    await sessionSigningKey(),
    base64UrlDecode(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) {
    log.reason = "session-signature-invalid";
    return null;
  }

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as SessionPayload;
  if (!payload.tenant_id || !payload.created_by || payload.exp <= Date.now()) {
    log.reason = "session-payload-invalid-or-expired";
    return null;
  }
  log.tokenSource = "session";
  logAuth("session-signature-verified", log);

  sessionAuthCache.set(sessionId, {
    auth: { tenant_id: payload.tenant_id, created_by: payload.created_by },
    expiresAt: payload.exp,
  });
  return { tenant_id: payload.tenant_id, created_by: payload.created_by };
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
  const reqId = crypto.randomUUID().slice(0, 8);
  const sessionIdHeader = req.headers.get("mcp-session-id");
  const log: AuthLog = {
    reqId,
    tokenSource: "none",
    sessionIdPresent: !!sessionIdHeader,
    sessionIdPrefix: maskSessionId(sessionIdHeader),
  };

  // 1) Prefer query params (Claude MCP connector may inject its own Authorization header)
  try {
    const url = new URL(req.url);
    token = url.searchParams.get("token") || url.searchParams.get("api_key");
    if (token) log.tokenSource = "query";
  } catch (_) {}

  // 2) Fallback to Authorization: Bearer header
  if (!token) {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      token = auth.slice(7).trim();
      if (token) log.tokenSource = "bearer";
    }
  }

  // 3) Fallback to custom header
  if (!token) {
    token = req.headers.get("x-api-token") || req.headers.get("x-api-key");
    if (token) log.tokenSource = "x-api-token";
  }

  // 4) MCP clients may drop the original query string after initialize and rely on mcp-session-id
  if (!token) {
    const ctx = await getCachedSessionAuth(req, log);
    if (!ctx) {
      logAuth("unauthorized", log);
    } else {
      logAuth("authorized", log, { tenant_id: ctx.tenant_id });
    }
    return ctx;
  }

  // Only accept tokens with our prefix to avoid validating arbitrary OAuth tokens
  if (!token.startsWith("mh_")) {
    log.reason = "token-wrong-prefix";
    logAuth("unauthorized", log, { tokenPrefix: token.slice(0, 4) });
    return null;
  }

  const tokenHash = await sha256Hex(token);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("validate_api_token", { _token_hash: tokenHash });
  if (error) {
    log.reason = "rpc-error";
    logAuth("unauthorized", log, { error: error.message });
    return null;
  }
  if (!data || (data as any[]).length === 0) {
    log.reason = "token-not-found-or-revoked";
    logAuth("unauthorized", log);
    return null;
  }
  const row = (data as any[])[0];
  logAuth("authorized", log, { tenant_id: row.tenant_id });
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
  const url = new URL(req.url);
  const incomingSession = req.headers.get("mcp-session-id");
  const hasQueryToken = !!(url.searchParams.get("token") || url.searchParams.get("api_key"));
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const hasExplicitMcpAuth = hasQueryToken || !!incomingSession || !!req.headers.get("x-api-token") || !!req.headers.get("x-api-key");

  console.log(JSON.stringify({
    scope: "mcp-brainstorm.request",
    method: req.method,
    path: url.pathname,
    incomingSessionId: maskSessionId(incomingSession),
    hasQueryToken,
    hasAuthHeader: !!authHeader,
    authHeaderScheme: authHeader?.split(" ")[0] ?? null,
  }));

  // Claude may probe the MCP URL with a bare GET before sending the tokenized POST initialize.
  // Keep state-changing/tool requests protected, but don't fail connector discovery with 401.
  if (req.method === "GET" && !hasExplicitMcpAuth) {
    console.log(JSON.stringify({
      scope: "mcp-brainstorm.response",
      method: req.method,
      path: url.pathname,
      status: 200,
      reason: "unauthenticated-get-probe",
    }));

    return new Response(JSON.stringify({
      name: "marketing-hub-brainstorm",
      status: "ok",
      transport: "streamable-http",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await authenticate(req);

  // GET on this endpoint is only used by clients trying to open a server→client SSE stream.
  // We don't support persistent SSE — explicitly tell the client so it stops retrying instead
  // of getting an opaque 400 from the transport (which Claude surfaces as "Couldn't reach the MCP server").
  if (auth && req.method === "GET") {
    console.log(JSON.stringify({
      scope: "mcp-brainstorm.response",
      method: req.method,
      path: url.pathname,
      status: 405,
      reason: "sse-stream-not-supported",
      tenant_id: auth.tenant_id,
    }));
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method Not Allowed: server→client SSE stream is not supported" }, id: null }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" } },
    );
  }

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
    merged.set("mcp-session-id", await createSignedSessionId(auth));
  }
  cacheSessionAuth(new Response(null, { headers: merged }), auth);

  for (const [k, v] of Object.entries(corsHeaders)) merged.set(k, v);

  console.log(JSON.stringify({
    scope: "mcp-brainstorm.response",
    method: req.method,
    path: url.pathname,
    status: response.status,
    outgoingSessionId: maskSessionId(merged.get("mcp-session-id")),
    tenant_id: auth.tenant_id,
  }));

  return new Response(response.body, {
    status: response.status,
    headers: merged,
  });
});

Deno.serve(app.fetch);
