
## Correção: Exibir Arte Integralmente no PostDetails

### Problema Identificado
A visualização da arte está forçando formato quadrado (`aspect-square`) com `object-cover`, o que corta imagens verticais ou horizontais que não sejam 1:1.

### Solução Proposta
Alterar o container da imagem principal para preservar a proporção original da arte, permitindo visualização completa.

### Mudanças em `src/components/schedule/PostDetails.tsx`

1. **Remover `aspect-square`**: Substituir por um container flexível com altura máxima
2. **Trocar `object-cover` por `object-contain`**: Isso garante que a imagem inteira seja visível
3. **Adicionar altura máxima**: Limitar para não ocupar a tela toda, mas permitir scroll se necessário
4. **Manter fundo para imagens com transparência**: Manter `bg-muted` para dar contraste

```text
Antes:
┌─────────────────────┐
│  ┌───────────────┐  │
│  │   IMAGEM      │  │ ← aspect-square + object-cover
│  │   (cortada)   │  │   corta partes da imagem
│  └───────────────┘  │
└─────────────────────┘

Depois:
┌─────────────────────┐
│  ┌───────────────┐  │
│  │               │  │
│  │   IMAGEM      │  │ ← max-h-[500px] + object-contain
│  │   COMPLETA    │  │   mostra imagem inteira
│  │               │  │
│  └───────────────┘  │
└─────────────────────┘
```

### Detalhes Tecnicos

Linha 58-63 atual:
```tsx
<div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
  <img
    src={images[currentImageIndex]?.image_url}
    alt=""
    className="h-full w-full object-cover"
  />
```

Nova versao:
```tsx
<div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-muted" style={{ maxHeight: '500px' }}>
  <img
    src={images[currentImageIndex]?.image_url}
    alt=""
    className="max-h-[500px] w-full object-contain"
  />
```

### Arquivos a Modificar
- `src/components/schedule/PostDetails.tsx` (linhas 58-63)

### Resultado Esperado
- A arte sera exibida integralmente, sem cortes
- Imagens verticais e horizontais serao visualizadas completamente
- O container se adapta a proporcao da imagem ate um maximo de 500px de altura
- Thumbnails continuam funcionando normalmente para navegacao entre imagens
