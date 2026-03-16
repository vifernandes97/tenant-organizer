

# Backlog panel ocupa muito espaço — tornar colapsável horizontalmente

## Problema
O BacklogPanel fixo com `w-64` (256px) reduz o espaço do calendário, prejudicando a visualização.

## Solução
Transformar o painel em uma barra lateral colapsável que, quando recolhida, mostra apenas um botão vertical fino com ícone + badge de contagem. O usuário expande/recolhe clicando nesse botão.

## Mudanças

### `src/components/schedule/BacklogPanel.tsx`
- Substituir o estado `collapsed` atual (que esconde o conteúdo mas mantém a largura) por um modo recolhido que reduz a largura total para ~40px
- Quando recolhido: exibir apenas um botão vertical com ícone `Inbox` + badge de contagem
- Quando expandido: manter o layout atual com `w-64`
- Manter o suporte a drop zone mesmo quando recolhido (arrastar post sobre o botão colapsado também deve funcionar)
- Iniciar colapsado por padrão para maximizar o espaço do calendário
- Transição suave com `transition-all`

### `src/pages/Schedule.tsx`
- Nenhuma mudança necessária (o layout flex já se adapta ao tamanho do BacklogPanel)

