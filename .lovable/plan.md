# Integração MCP: Claude → Brainstorm

Criar um servidor MCP hospedado como Supabase Edge Function que expõe uma ferramenta para o Claude enviar várias ideias de uma vez. Cada ideia vira um registro em `brainstorm_ideas` (título = tema, descrição = restante), no tenant correto, identificado por um **API token** gerado nas Configurações.

## 1. Banco de dados

Nova tabela `tenant_api_tokens`:

```text
id            uuid pk
tenant_id     uuid fk tenants
name          text          -- ex: "Claude Desktop"
token_hash    text unique   -- SHA-256 do token (nunca guardar plain)
token_prefix  text          -- primeiros 8 chars p/ exibir "mh_xxxxxxxx…"
created_by    uuid fk profiles
created_at    timestamptz
last_used_at  timestamptz
revoked_at    timestamptz
```

- RLS: apenas owners do tenant veem/criam/revogam tokens do próprio tenant.
- Function `validate_api_token(_token text)` (SECURITY DEFINER) → retorna `tenant_id` + `created_by` quando válido e atualiza `last_used_at`. Usada pela edge function com service role.
- Sem alteração em `brainstorm_ideas` (estrutura atual já cobre `title` + `description`).

## 2. Edge Function `mcp-brainstorm` (servidor MCP)

Implementada com **mcp-lite + Hono** sobre Streamable HTTP, `verify_jwt = false` (autenticação própria via header `Authorization: Bearer <token>`).

Tool exposta:

- `create_brainstorm_ideas`
  - input: `{ ideas: [{ title: string (1-200), description?: string }, ...] }` (1 a 50 itens)
  - comportamento:
    1. Lê o token do header → chama `validate_api_token` → obtém `tenant_id` e `created_by`.
    2. Insere todas as ideias em `brainstorm_ideas` com `status = 'nova'`.
    3. Retorna resumo: `{ created: N, ids: [...] }`.
  - Erros tratados: 401 (token inválido/revogado), 400 (payload inválido via Zod), 429/500 amigáveis.

Endpoint público: `https://<project>.supabase.co/functions/v1/mcp-brainstorm` — é a URL que o usuário cola no Claude Desktop.

## 3. UI — Configurações → "API & MCP"

Nova aba em `Settings.tsx` (apenas owner) mostrando:

- Instruções curtas de como conectar no Claude (URL do servidor + token + exemplo de prompt).
- Lista de tokens existentes (nome, prefixo, criado em, último uso, botão revogar).
- Botão **"Gerar novo token"** → modal pede um nome → ao criar, mostra **uma única vez** o token completo com botão copiar (depois só fica o prefixo no banco).

Componente novo: `src/components/settings/ApiTokensManager.tsx`.

## 4. Hook `useApiTokens`

CRUD básico (`list`, `create`, `revoke`) usando Supabase client + React Query, escopado pelas RLS.

## 5. Fluxo do usuário

```text
1. Owner abre Configurações → API & MCP → Gerar token → copia "mh_live_xxx..."
2. Cola no Claude Desktop como MCP server (URL + Bearer token)
3. No Claude: "Envie estas 5 ideias para o Marketing Hub: ..."
4. Claude chama create_brainstorm_ideas com array → ideias aparecem no /brainstorm
   na coluna "Novas", prontas para o workflow existente (dar sequência → backlog → post)
```

## Detalhes técnicos

**Arquivos criados**
- `supabase/migrations/<ts>_tenant_api_tokens.sql` — tabela, RLS, função `validate_api_token`
- `supabase/functions/mcp-brainstorm/index.ts` — servidor MCP (mcp-lite + Hono)
- `supabase/functions/mcp-brainstorm/deno.json` — import map com `mcp-lite@^0.10.0`
- `src/components/settings/ApiTokensManager.tsx`
- `src/hooks/useApiTokens.ts`

**Arquivos editados**
- `src/pages/Settings.tsx` — adicionar aba "API & MCP" (owner-only)
- `supabase/config.toml` — registrar a função (default `verify_jwt = true` é override implícito; manteremos comportamento padrão e validaremos o token manualmente — sem mudança de config necessária)

**Geração do token**
- Formato: `mh_live_<32 chars random base64url>`. Hash SHA-256 armazenado, prefixo (`mh_live_xxxxxxxx`) para exibição.

**Segurança**
- Token só aparece em tela uma vez na criação (toast + clipboard).
- Revogar = `revoked_at` setado; `validate_api_token` ignora revogados.
- Edge function usa `SUPABASE_SERVICE_ROLE_KEY` apenas internamente para validar token e inserir; nunca exposto ao cliente.
- Headers MCP: aceitar `Accept: application/json, text/event-stream`.

## Fora do escopo
- OAuth completo no MCP.
- Tools adicionais além de criar ideias (listar/atualizar virá depois se quiser).
- Criar posts diretamente (mantém-se o fluxo: Claude → brainstorm → usuário promove a post).
