

## Geração de Título com IA para Posts

### Visao Geral

Implementar geracao automatica de titulo para posts usando IA (Lovable AI Gateway). Quando um post for criado ou atualizado, a IA analisara o conteudo da legenda e gerara um titulo curto e descritivo que sera exibido no card do calendario.

### Problema Atual

Conforme a imagem enviada, os cards estao mostrando:
- `<p></p><p><str...` - HTML bruto do editor rico

Isso acontece porque o campo `caption` contem HTML e esta sendo exibido diretamente sem processamento.

### Solucao em Duas Partes

**Parte 1 - Correcao Imediata:**
Usar a funcao `extractPlainText()` ja existente para exibir texto puro no card enquanto nao ha titulo gerado.

**Parte 2 - Geracao de Titulo com IA:**
Adicionar campo `title` na tabela e criar edge function que usa Lovable AI para gerar titulos automaticamente.

### Arquitetura

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE GERACAO                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Usuario salva post                                                    │
│         │                                                              │
│         ▼                                                              │
│  ┌─────────────────┐                                                   │
│  │ Frontend chama  │                                                   │
│  │ Edge Function   │                                                   │
│  └────────┬────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐     ┌──────────────────────┐                      │
│  │ generate-title  │────▶│  Lovable AI Gateway  │                      │
│  │ Edge Function   │     │ (gemini-3-flash)     │                      │
│  └────────┬────────┘     └──────────────────────┘                      │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ Retorna titulo  │                                                   │
│  │ (max 40 chars)  │                                                   │
│  └────────┬────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ Salva no DB     │                                                   │
│  │ campo: title    │                                                   │
│  └─────────────────┘                                                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Mudancas no Banco de Dados

**Nova coluna na tabela `posts`:**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| title | text (nullable) | Titulo gerado pela IA |

### Edge Function: `generate-title`

Recebe o texto da legenda e retorna um titulo curto gerado pela IA.

**Entrada:**
```json
{ "caption": "Texto plano extraido do HTML" }
```

**Saida:**
```json
{ "title": "Lancamento da Nova Colecao" }
```

**Prompt da IA:**
```text
Voce e um assistente de marketing. Crie um titulo curto (maximo 40 caracteres) 
para este post de rede social. Seja direto e capture a essencia do conteudo.
Nao use aspas, emojis ou pontuacao final.

Conteudo: {caption}
```

### Componentes a Modificar

| Componente | Mudanca |
|------------|---------|
| `PostCard.tsx` | Exibir `post.title` se existir, senao `extractPlainText(caption)` |
| `usePosts.ts` | Chamar edge function apos criar/atualizar post |

### Componentes/Arquivos a Criar

| Arquivo | Proposito |
|---------|-----------|
| `supabase/functions/generate-title/index.ts` | Edge function que chama Lovable AI |

### Fluxo de Exibicao no Card

```tsx
// PostCard.tsx
const displayTitle = post.title || extractPlainText(post.caption || '').substring(0, 40);

{displayTitle && (
  <p className="mt-0.5 truncate text-xs text-foreground">
    {displayTitle}
    {!post.title && displayTitle.length >= 40 ? '...' : ''}
  </p>
)}
```

### Fluxo de Geracao no Hook

```tsx
// usePosts.ts - apos criar/atualizar post
const generateTitle = async (caption: string) => {
  if (!caption) return null;
  
  const plainText = extractPlainText(caption);
  if (!plainText.trim()) return null;
  
  const { data } = await supabase.functions.invoke('generate-title', {
    body: { caption: plainText }
  });
  
  return data?.title || null;
};
```

### Sequencia de Implementacao

1. Adicionar coluna `title` na tabela `posts` (migracao SQL)
2. Criar edge function `generate-title` com Lovable AI
3. Atualizar config.toml para incluir a funcao
4. Modificar `PostCard.tsx` para exibir titulo ou texto extraido
5. Modificar `useCreatePost` para gerar titulo apos criacao
6. Modificar `useUpdatePost` para regenerar titulo se caption mudar

### Consideracoes

- **Fallback**: Se a IA falhar, usa `extractPlainText()` truncado
- **Cache**: Titulo e gerado apenas na criacao/edicao, nao a cada renderizacao
- **Custo**: Usa gemini-3-flash-preview (rapido e economico)
- **Limite**: Titulo maximo de 40 caracteres para caber no card

### Exemplo de Resultado

**Antes (HTML bruto):**
```
<p></p><p><str...
```

**Depois (titulo IA):**
```
Lancamento Nova Colecao Verao
```

