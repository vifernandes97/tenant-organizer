
## Correção: Imagem Muito Grande no Modo Tela Cheia

### Problema Identificado
No modo de visualização de imagem do FullscreenViewer, a imagem está ultrapassando os limites do container e sendo cortada. Isso acontece porque:
1. O container da imagem usa `flex-1` mas não tem `overflow-hidden`
2. A tag `img` usa `max-h-full max-w-full` mas o container pai não tem dimensões fixas que limitem corretamente

### Solução Proposta
Adicionar controles de overflow e usar posicionamento absoluto para garantir que a imagem fique contida dentro do espaço disponível.

### Mudanças em `src/components/schedule/FullscreenViewer.tsx`

**Linha 104 - Container da imagem principal:**
```text
Antes:
<div className="relative flex flex-1 items-center justify-center">
  <img ... className="max-h-full max-w-full object-contain" />

Depois:
<div className="relative flex flex-1 items-center justify-center overflow-hidden">
  <img ... className="max-h-full max-w-full object-contain" />
```

**Ajuste adicional: usar inset-0 com absolute para garantir limites**

O problema é que `flex-1` não define uma altura fixa, então `max-h-full` não tem uma referência correta. A solução é usar posicionamento absoluto dentro de um container relativo:

```tsx
<div className="relative flex-1 overflow-hidden">
  <div className="absolute inset-0 flex items-center justify-center p-4">
    <img
      src={images[currentImageIndex]?.image_url}
      alt=""
      className="max-h-full max-w-full object-contain"
    />
  </div>
  {/* Navigation arrows usando absolute já funcionam */}
</div>
```

### Detalhes Tecnicos

O problema técnico é que `flex-1` com `max-h-full` não funciona bem porque:
- `flex-1` faz o elemento crescer para preencher o espaço disponível
- Mas `max-h-full` (100%) calcula baseado no pai, que não tem altura definida explicitamente
- Usando `absolute inset-0` dentro de um container `relative flex-1`, forçamos o container interno a ter exatamente o tamanho do container flex

### Arquivos a Modificar
- `src/components/schedule/FullscreenViewer.tsx` (linhas 102-143)

### Resultado Esperado
- A imagem será exibida integralmente dentro do espaço disponível
- Imagens muito grandes (verticais ou horizontais) serão redimensionadas para caber
- O padding de 4 (1rem) garante que a imagem não encoste nas bordas
- Navegação e contador continuam funcionando normalmente
