

## Webhook WordPress para n8n

### Objetivo

Quando um post WordPress for criado, enviar automaticamente os dados para um webhook do n8n. O n8n processa os dados e devolve os campos preenchidos (titulo do artigo, palavra-chave SEO, tipo de projeto, conteudo do artigo). O sistema recebe a resposta e atualiza o post automaticamente.

### Fluxo

```text
Criar Post WordPress
       │
       ▼
  Salva no banco (como hoje)
       │
       ▼
  Chama Edge Function "wordpress-webhook"
       │
       ▼
  Edge Function envia JSON para n8n
       │
       ▼
  n8n processa (IA, templates, etc.)
       │
       ▼
  n8n retorna JSON com campos preenchidos
       │
       ▼
  Edge Function atualiza o post no banco
       │
       ▼
  Frontend recebe confirmacao e recarrega dados
```

### Dados Enviados ao n8n

```json
{
  "post_id": "uuid",
  "group_id": "uuid",
  "client_id": "uuid",
  "client_name": "Nome do Cliente",
  "scheduled_at": "2026-02-15T10:00:00Z",
  "caption": "texto se houver",
  "title": "titulo gerado",
  "status": "draft",
  "channel": "wordpress",
  "tenant_id": "uuid",
  "media": [
    { "url": "signed_url_do_arquivo", "media_type": "document", "file_name": "proposta.pdf" }
  ]
}
```

### Dados Esperados de Volta do n8n

```json
{
  "article_title": "Titulo do Artigo",
  "seo_keyword": "palavra-chave",
  "project_type": "ete",
  "article_content": "<p>Conteudo HTML do artigo...</p>"
}
```

Campos opcionais -- apenas os campos presentes na resposta serao atualizados.

### Alteracoes Necessarias

#### 1. Novo Secret: URL do Webhook n8n

Sera necessario configurar a URL do webhook do n8n como um secret chamado `N8N_WEBHOOK_URL`.

#### 2. Nova Edge Function: `wordpress-webhook`

Endpoint que:
- Recebe `post_id` do frontend
- Valida autenticacao JWT e pertencimento ao tenant
- Busca dados completos do post (incluindo cliente e midias)
- Gera signed URLs para as midias
- Envia tudo como JSON para o webhook n8n
- Recebe a resposta do n8n
- Atualiza o post no banco com os campos retornados
- Retorna sucesso ao frontend

#### 3. Atualizar `usePosts.ts`

No `useCreatePost`, apos criar um post WordPress, chamar a edge function `wordpress-webhook` de forma assincrona (fire-and-forget ou aguardando resposta, dependendo da velocidade do n8n).

Adicionar tambem um hook `useTriggerWordPressWebhook` para permitir disparo manual a partir do detalhe do post.

#### 4. Atualizar `GroupPostDetails.tsx`

Adicionar um botao "Gerar Conteudo" na secao WordPress que permite disparar o webhook manualmente para regenerar/atualizar os campos.

### Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/wordpress-webhook/index.ts` | Criar edge function |
| `supabase/config.toml` | Adicionar config da funcao (verify_jwt = false) |
| `src/hooks/usePosts.ts` | Chamar webhook apos criar post WordPress + hook manual |
| `src/components/schedule/GroupPostDetails.tsx` | Botao "Gerar Conteudo" para disparo manual |

### Seguranca

- A edge function valida o JWT do usuario antes de processar
- Confirma que o usuario pertence ao tenant dono do post
- Signed URLs das midias tem validade de 1 hora
- A URL do webhook fica armazenada como secret, nunca exposta ao frontend

