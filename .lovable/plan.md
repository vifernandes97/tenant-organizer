

## Edição Inline Estilo ClickUp no Modal de Detalhes

### Conceito
Transformar o modal de detalhes do post em uma experiência de edição inline, onde cada campo pode ser editado diretamente ao clicar nele. Ao clicar fora (blur) ou pressionar Enter, as mudanças são salvas automaticamente.

### Campos Editáveis

| Campo | Comportamento Atual | Comportamento Novo |
|-------|--------------------|--------------------|
| Cliente | Texto estático | Select ao clicar |
| Data/Hora | Texto estático | Input datetime ao clicar |
| Legenda | HTML readonly | Editor rico inline ao clicar |
| Status | Select sempre visível | Mantém (já funciona assim) |
| Canal | Badge estático | Select ao clicar |

### UX Proposta

```text
Modo Visualizacao (padrao):
┌────────────────────────────────────────┐
│  Cliente                               │
│  Empresa ABC  ← texto normal, cursor   │
│               pointer indica clicavel  │
└────────────────────────────────────────┘

Modo Edicao (ao clicar):
┌────────────────────────────────────────┐
│  Cliente                               │
│  ┌──────────────────────────────────┐  │
│  │ Empresa ABC            ▼         │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Componente Reutilizavel: InlineEditable

Criar um componente generico que:
- Renderiza conteudo como texto normal
- Ao clicar, troca para o componente de edicao (Input, Select, RichTextEditor)
- Ao blur ou Enter, salva automaticamente e volta ao modo visualizacao
- Mostra indicador sutil de "editavel" no hover

### Arquivos a Modificar/Criar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/ui/inline-editable.tsx` | Criar | Componente base para edicao inline |
| `src/components/schedule/PostDetails.tsx` | Modificar | Integrar campos editaveis |
| `src/hooks/usePosts.ts` | Manter | Ja tem useUpdatePost |

### Detalhes Tecnicos

**1. InlineEditable Component**

Props principais:
- `value`: valor atual
- `onSave`: callback quando salvar (recebe novo valor)
- `type`: "text" | "select" | "datetime" | "richtext"
- `options`: opcoes para select
- `isLoading`: mostrar loading durante save

**2. Integracao no PostDetails**

Para cada campo:
```tsx
<InlineEditable
  type="select"
  value={post.client_id}
  displayValue={post.clients?.name}
  options={clients.map(c => ({ value: c.id, label: c.name }))}
  onSave={(value) => handleFieldUpdate('client_id', value)}
/>
```

**3. Handler de Update por Campo**

```tsx
const handleFieldUpdate = async (field: string, value: any) => {
  await updatePost.mutateAsync({
    id: post.id,
    post: { [field]: value }
  });
};
```

**4. Legenda com Editor Rico Inline**

A legenda usara uma versao compacta do RichTextEditor que:
- Mostra HTML formatado quando nao esta editando
- Ao clicar, ativa o editor Tiptap no local
- Toolbar aparece acima quando em modo edicao
- Salva no blur

### Indicadores Visuais

- Cursor `pointer` em campos editaveis
- Borda sutil no hover para indicar clicavel
- Icone de lapis pequeno no canto (opcional)
- Toast de confirmacao ao salvar

### Sequencia de Implementacao

1. Criar componente `InlineEditable` com suporte a text/select/datetime
2. Implementar handler `handleFieldUpdate` no PostDetails
3. Substituir campos estaticos por InlineEditable:
   - Cliente (select)
   - Data/Hora (datetime-local)
   - Canal (select)
4. Criar versao inline do RichTextEditor para legenda
5. Testar fluxo completo de edicao
6. Ajustar loading states e feedback visual

### Comportamento de Save

- Debounce de 500ms para evitar saves excessivos
- Mostrar loading sutil no campo sendo salvo
- Toast de sucesso/erro apos save
- Reverter valor se save falhar

