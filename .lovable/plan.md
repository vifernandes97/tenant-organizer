

# Corrigir sobreposição: nome do cliente atrás do X de fechar

## Problema
No modal de detalhes do post (`GroupPostDetails`), o nome do cliente é renderizado no canto superior direito do header da coluna direita. O botão **X** de fechar do `Dialog` (Radix) é posicionado absolutamente nesse mesmo canto, e acaba ficando por cima do nome do cliente — gerando o conflito visual mostrado no screenshot ("ICS LOGISTICS" cortado pelo X).

## Solução
Adicionar **padding direito** suficiente no nome do cliente para reservar espaço para o botão X. Mantém o layout atual (cliente alinhado à direita) mas garante que o texto nunca encoste no X.

## Arquivo editado
- `src/components/schedule/GroupPostDetails.tsx` (linhas 402-404):
  - Adicionar `pr-8` (padding-right de 32px) ao `<span>` do nome do cliente
  - Adicionar `truncate` + `max-w-[200px]` para garantir que nomes longos sejam cortados com elipse antes de invadir o X

```tsx
<span className="text-xs text-muted-foreground truncate max-w-[200px] pr-8">
  {activePost.clients?.name}
</span>
```

## Notas
- Sem mudanças em hooks, schema ou outros componentes
- O nome completo continua disponível ao passar o mouse (tooltip nativo do `truncate` via `title` — opcionalmente adicionar `title={activePost.clients?.name}` para acessibilidade)
- O botão X do Radix Dialog (no canto `top-4 right-4`) ocupa ~24px; `pr-8` (32px) deixa folga confortável

