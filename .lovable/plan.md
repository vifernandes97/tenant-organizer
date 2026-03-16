

# Converter ideias de brainstorm em posts de backlog

## Resumo
Adicionar uma acao "Enviar para backlog" no menu de cada ideia de brainstorm. Ao clicar, abre um dialog para selecionar cliente e canais, e cria um post no backlog (sem data) com o titulo e descricao da ideia como caption.

## Mudancas

### 1. `src/pages/Brainstorm.tsx`
- Adicionar opcao "Enviar para backlog" no dropdown de acoes (menu de 3 pontos) de cada card
- Novo dialog com formulario simplificado: selecao de cliente e canais (obrigatorios)
- Ao confirmar, chamar `useCreatePost` com:
  - `caption`: descricao da ideia (ou titulo se nao houver descricao)
  - `title`: titulo da ideia
  - `client_id`: selecionado no dialog
  - `channels`: selecionados no dialog
  - `is_backlog: true` (scheduled_at = null)
  - `status: 'draft'`
  - `images: []`
- Apos criar, opcionalmente atualizar status da ideia para `dar_sequencia`
- Toast de sucesso com link/indicacao de que o post foi criado no backlog

### Nenhuma mudanca de banco de dados necessaria
O sistema de backlog e criacao de posts ja suportam tudo que e preciso.

