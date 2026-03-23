

# Tornar a configuração de canais mais visível no cadastro do cliente

## Problema
A seção de canais está escondida dentro da aba "Marketing", junto com Persona, Tom de voz e Tags. O usuário não encontrou a opção.

## Solução
Criar uma aba dedicada "Canais" no formulário do cliente, separando os canais da aba Marketing para maior visibilidade.

## Mudanças

### `src/components/clients/ClientForm.tsx`
- Adicionar nova aba "Canais" no `TabsList` (6 abas: Dados, Contato, Marketing, Canais, Links, Status)
- Mover o `FormField` de `channels` (linhas 378-410) da aba "Marketing" para a nova aba "Canais"
- Na aba "Canais", exibir os checkboxes com ícones coloridos (reutilizando o visual do `ChannelBadges`) para melhor identificação
- Manter Persona, Tom de voz e Tags na aba "Marketing"
- Ajustar `grid-cols` do `TabsList` de 5 para 6

