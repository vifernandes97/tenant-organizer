
Objetivo
- No “Novo Post”, o campo “Canais” deve abrir e listar opções selecionáveis.

Diagnóstico (causa raiz)
- Em src/components/schedule/PostForm.tsx, as opções exibidas no popover vêm de:
  - selectedClient?.channels (canais configurados no cliente) OU allChannels
- O código atual usa:
  - const availableChannels = (selectedClient?.channels as SocialChannel[]) || allChannels;
- Problema: quando selectedClient.channels existe mas é um array vazio ([] / {} no banco), isso é “truthy” em JS, então availableChannels vira vazio e o popover não tem itens para renderizar.
- Confirmação no backend: há cliente(s) com channels = {} (array vazio). Exemplo consultado: “ICS LOGISTICS” está com channels vazio.

Comportamento esperado após correção
- Se o cliente selecionado tiver canais configurados (length > 0): mostrar apenas esses canais.
- Se o cliente selecionado não tiver canais configurados (length === 0) ou channels for null: mostrar allChannels (fallback), para o usuário conseguir criar posts normalmente.
- Além disso, mostrar uma mensagem discreta avisando que o cliente não tem canais configurados (opcional, mas recomendado para evitar confusão).

Mudanças propostas (código)
1) Ajustar a lógica de availableChannels (PostForm.tsx)
- Trocar a atribuição atual por uma versão que faz fallback quando o array está vazio.
- Exemplo de lógica:
  - const clientChannels = (selectedClient?.channels as SocialChannel[] | null) ?? null;
  - const availableChannels = clientChannels && clientChannels.length > 0 ? clientChannels : allChannels;

2) Adicionar “estado vazio / aviso” dentro do popover (PostForm.tsx)
- Caso, por qualquer motivo, availableChannels ainda seja vazio (defensivo), renderizar um texto “Nenhum canal disponível” em vez de ficar em branco.
- Caso clientChannels esteja vazio, renderizar um pequeno helper text abaixo do campo (ou no topo do popover), por exemplo:
  - “Este cliente não tem canais configurados. Mostrando todos os canais.”

3) (Opcional, não bloqueante) Melhorar UX do bloqueio por cliente não selecionado
- Hoje o botão fica disabled quando !selectedClientId.
- Isso pode parecer “não abre” para quem esquece de selecionar o cliente.
- Ajuste opcional:
  - manter disabled, mas incluir helper text abaixo: “Selecione um cliente para escolher os canais.”
  - Alternativa: permitir abrir e mostrar a mensagem “Selecione um cliente primeiro” (sem itens), mas isso exige cuidado com acessibilidade/UX. Recomendo manter disabled + helper text.

Arquivos envolvidos
- src/components/schedule/PostForm.tsx
  - Ajustar a regra de availableChannels (fallback quando channels estiver vazio)
  - Adicionar mensagens de orientação/empty state no popover

Plano de teste (manual)
1) Ir em /cronogramas → “Novo Post”
2) Sem selecionar cliente:
   - Verificar que o campo Canais indica que precisa selecionar cliente (helper text) e/ou está desabilitado de forma clara.
3) Selecionar um cliente que tem channels vazio:
   - Clicar em “Selecione os canais”
   - Verificar que aparece lista com todos os canais (Instagram, LinkedIn, WordPress etc.)
   - Selecionar 2+ canais e confirmar que badges aparecem no campo.
4) Selecionar um cliente com channels preenchido:
   - Verificar que a lista mostra apenas os canais configurados para aquele cliente.
5) Regressão:
   - Editar post (modo edição) e confirmar que o select “Canal” também não fica vazio indevidamente quando cliente não tem canais.

Notas técnicas / riscos
- A mudança é segura e local: não altera banco nem modelos, apenas UI/derivação de array.
- Mantém o comportamento “filtrar por canais do cliente” quando o cliente está corretamente configurado, mas evita UX quebrada quando não está.

Resultado final esperado
- O select/popover de “Canais” no “Novo Post” sempre exibirá opções e permitirá selecionar canais, mesmo quando o cliente estiver sem canais configurados.