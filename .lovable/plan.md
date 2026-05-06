## Status

A alteração na Edge Function `mcp-brainstorm` para aceitar o token via query param **já está aplicada** no código (linhas 27–50 de `supabase/functions/mcp-brainstorm/index.ts`):

- Aceita `Authorization: Bearer mh_live_xxx` (header) **ou**
- `?token=mh_live_xxx` (query param, com `?api_key=` como alias)

Falta apenas redeployar e validar a URL com um token real.

## Plano

1. **Redeploy** da função `mcp-brainstorm` (já que foi editada).
2. **Smoke test sem token** → deve retornar 401.
3. **Smoke test com `?token=...`** → deve passar pelo `authenticate()` e responder ao `initialize` do MCP.
4. **Sem mudanças de UI ou DB** — apenas Edge Function.

## URL final para colar no conector

```
https://wfraqwmoauvyxfqqrlyi.supabase.co/functions/v1/mcp-brainstorm?token=mh_live_xxxxxxxxxxxxxxxx
```

## Sobre enviar o token

Não preciso do seu token para implementar nem para validar — posso testar com um token inválido só para confirmar que o parser lê o query param (resposta 401 esperada do `validate_api_token`, e não 401 "missing token"). Se você **quiser** que eu teste com um token real:

- **Opção segura**: gere um token descartável em **Configurações → API & MCP**, me envie por aqui, eu testo, e você **revoga** no mesmo painel logo em seguida.
- Não vou armazenar como secret do projeto — não há motivo (token de owner é gerenciado pela própria UI).
- **Não cole** o token em produção em canais sem TLS; aqui o chat é seguro, mas a melhor prática continua sendo revogar após o teste.

## Trade-off (registrado)

- Token na URL aparece em logs de acesso e fica salvo na config do conector Claude.
- Aceitável aqui porque: (1) é ferramenta interna de owner, (2) revogável a qualquer momento na UI, (3) escopo limitado (só cria brainstorm ideas no tenant).
- **Não usar** esse padrão para tokens de terceiros ou endpoints com permissões mais amplas.

## Detalhes técnicos

- Edge Function: `supabase/functions/mcp-brainstorm/index.ts`
- Mudança contida em `authenticate(req)`: tenta header primeiro, faz fallback para `url.searchParams.get("token")`.
- Sem mudanças em `supabase/config.toml` (já está com `verify_jwt = false`).
- Sem mudanças no schema do banco nem em `tenant_api_tokens`.
