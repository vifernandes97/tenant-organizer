
# Correções na função wordpress-webhook

## Problemas Identificados

1. **Resposta em array**: O n8n retorna `[{...}]` (array), mas o código trata como objeto `{...}`. Resultado: nenhum campo é atualizado.
2. **Campo `status` ignorado**: A lógica atual não inclui o `status` nos campos atualizados no banco.
3. **`project_type` incompatível**: O n8n envia texto livre (ex: "ETA Compacta"), mas o banco exige um dos valores do enum: `ete`, `eta`, `osmose_reversa`, `ultrafiltracao`, `fisico_quimico`, `mbr`.

## Solucao

### Arquivo editado: `supabase/functions/wordpress-webhook/index.ts`

- Ao receber a resposta do n8n, verificar se e um array e extrair o primeiro elemento: `const data = Array.isArray(n8nData) ? n8nData[0] : n8nData`
- Adicionar `status` a lista de campos atualizaveis (validando que e um valor valido do enum `post_status`: `draft`, `approved`, `scheduled`, `published`)
- Adicionar mapeamento de `project_type` do texto livre para o valor do enum. Exemplo: se contem "eta" sera mapeado para `eta`, se contem "ete" para `ete`, etc. Se nao corresponder a nenhum valor conhecido, o campo sera ignorado para evitar erro no banco.

### Como testar

Apos a correcao:
1. Abra um post do canal WordPress no Approvee
2. Clique em "Gerar Conteudo" (que dispara o webhook)
3. O n8n deve processar e retornar o JSON
4. Os campos titulo do artigo, palavra-chave SEO, tipo do projeto, conteudo e status devem ser preenchidos automaticamente no post

## Secao Tecnica

```text
Mudancas no wordpress-webhook/index.ts:

1. Apos: const n8nData = await n8nResponse.json();
   Adicionar: const data = Array.isArray(n8nData) ? n8nData[0] : n8nData;

2. Usar "data" ao inves de "n8nData" para ler os campos

3. Adicionar mapeamento de project_type:
   const PROJECT_TYPE_MAP = {
     "eta": "eta", "ete": "ete",
     "osmose": "osmose_reversa", "ultrafiltra": "ultrafiltracao",
     "fisico": "fisico_quimico", "mbr": "mbr"
   };
   - Busca case-insensitive no valor recebido

4. Adicionar status aos campos atualizaveis:
   if (data.status && ["draft","approved","scheduled","published"].includes(data.status))
     updateFields.status = data.status;
```
