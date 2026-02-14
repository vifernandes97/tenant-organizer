

# Atualizar URL do Webhook n8n para Producao

## O que sera feito

Atualizar o secret `N8N_WEBHOOK_URL` com a URL de producao do n8n:
`https://n8n-n8n.q0dhaw.easypanel.host/webhook/4079488a-b777-44d9-863e-c5bfbd339275`

## Secao Tecnica

- Usar a ferramenta `add_secret` para atualizar o valor do secret `N8N_WEBHOOK_URL`
- Nenhuma alteracao de codigo e necessaria - a funcao `wordpress-webhook` ja le esse secret via `Deno.env.get("N8N_WEBHOOK_URL")`
- Apos a atualizacao, o fluxo pode ser testado imediatamente

## Observacoes importantes

- Certifique-se de que o workflow no n8n esta **Ativo** (toggle ligado) para que o webhook de producao funcione
- O node "Respond to Webhook" deve estar conectado corretamente no fluxo do n8n para evitar o erro 500 que apareceu anteriormente

