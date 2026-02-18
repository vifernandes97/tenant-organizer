

# Regras automaticas de status dos posts

## 1. Scheduled -> Published (automatico por data)

Quando um post esta com status "scheduled" e a data/hora agendada (`scheduled_at`) ja passou, o status deve mudar automaticamente para "published".

### Implementacao

Criar uma edge function `auto-publish` que:
- Busca todos os posts com `status = 'scheduled'` e `scheduled_at <= now()`
- Atualiza o status para `'published'`

Configurar um cron job via `pg_cron` + `pg_net` para executar essa function a cada minuto.

### Arquivos

- **Novo:** `supabase/functions/auto-publish/index.ts` - Edge function que faz o update
- **SQL (insert tool):** Criar cron job que chama a function a cada minuto

## 2. Gerar Conteudo -> Status "Gerado por IA"

Quando o usuario clica em "Gerar Conteudo" no painel WordPress, apos o conteudo ser gerado com sucesso, o status do post deve mudar automaticamente para `ai_generated`.

### Implementacao

Alterar a edge function `wordpress-webhook/index.ts` para sempre incluir `status: 'ai_generated'` no update do post apos o webhook retornar com sucesso (substituindo a logica atual que so atualiza status se o n8n retornar um status especifico).

### Arquivos

- **Editar:** `supabase/functions/wordpress-webhook/index.ts` - Forcar `updateFields.status = 'ai_generated'` apos sucesso

## Secao tecnica

### Edge function `auto-publish`

```typescript
// Busca posts scheduled com data passada e atualiza para published
const { data, error } = await supabase
  .from('posts')
  .update({ status: 'published' })
  .eq('status', 'scheduled')
  .lte('scheduled_at', new Date().toISOString());
```

Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS.

### Cron job (via insert tool)

```sql
select cron.schedule(
  'auto-publish-posts',
  '* * * * *',
  $$ select net.http_post(
    url:='https://<project>.supabase.co/functions/v1/auto-publish',
    headers:='{"Authorization": "Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id; $$
);
```

### WordPress webhook - mudanca de status

Na funcao `wordpress-webhook/index.ts`, linha ~186-189, remover a condicional de status do n8n e forcar:

```typescript
// Sempre definir status como ai_generated apos geracao bem-sucedida
updateFields.status = 'ai_generated';
```
