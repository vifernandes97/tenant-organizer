

# Sidebar com expansão automática no hover

## Comportamento desejado
Hoje a sidebar tem dois estados (`expanded` / `collapsed`) controlados pelo botão `SidebarTrigger`. O usuário quer que, quando colapsada (só ícones), ela **expanda automaticamente ao passar o mouse** mostrando ícones + labels, e **volte a colapsar quando o mouse sair**.

Comportamento similar ao Notion/Linear: a sidebar fica enxuta por padrão e revela os labels sob demanda, sem alterar o layout do conteúdo principal.

## Mudanças propostas

### `src/components/layout/AppLayout.tsx`
1. **Estado de hover local** no `AppSidebar`:
   - Adicionar `const [isHovering, setIsHovering] = useState(false)`
   - Adicionar `onMouseEnter` / `onMouseLeave` no `<Sidebar>` (com pequeno delay de 150ms no leave para evitar flicker quando o mouse passa rápido pelas bordas)

2. **Estado visual derivado**:
   - O estado "real" do Radix continua sendo `collapsed` (não muda o layout do conteúdo)
   - Aplicar **overlay de expansão** via classes CSS quando `state === 'collapsed' && isHovering`:
     - Sidebar ganha `width: var(--sidebar-width)` (16rem) por cima do conteúdo
     - `position: absolute` + `z-index` alto para flutuar sobre o `SidebarInset` sem empurrar
     - `shadow-lg` para destacar do conteúdo abaixo
     - Transição suave (`transition-[width] duration-200`)

3. **Mostrar labels durante hover-expand**:
   - O `isCollapsed` usado pra esconder textos passa a ser `state === 'collapsed' && !isHovering`
   - Logo, ao hover, os `<span>` dos labels e o bloco de nome/email do usuário voltam a aparecer

### Detalhes de UX
- **Sem flicker**: delay de 150ms no `mouseleave` (limpar timeout no `mouseenter`)
- **Não interfere com clique no trigger**: se o usuário clicar no `SidebarTrigger` para expandir definitivamente, o hover não faz nada (já está expandida)
- **Mobile**: o comportamento de hover não se aplica em telas pequenas (Radix Sidebar já usa Sheet drawer no mobile) — sem mudança aí
- **Tooltip dos itens**: quando o hover-expand estiver ativo, os labels aparecem, então o `tooltip` do `SidebarMenuButton` deixa de ser necessário (não atrapalha, mas podemos condicionar `tooltip={isCollapsed ? item.label : undefined}`)

### Estrutura visual

```text
Estado real "collapsed", sem hover:
┌──┬─────────────────────┐
│🏠│                     │
│👥│   Conteúdo          │
│📅│                     │
└──┴─────────────────────┘

Estado real "collapsed", COM hover (overlay flutuante):
┌──────────────┬─────────┐
│🏠 Dashboard  │         │
│👥 Clientes   │ Conteú. │ ← conteúdo NÃO se mexe
│📅 Cronograma │         │
└──────────────┴─────────┘
```

## Notas técnicas
- O `SidebarProvider` do shadcn já expõe `state` via `useSidebar()` — não precisa modificar o componente base
- A largura colapsada (`--sidebar-width-icon`) e expandida (`--sidebar-width`) já estão definidas no CSS do shadcn
- Implementação fica isolada em `AppLayout.tsx`, sem editar `src/components/ui/sidebar.tsx`
- Sem mudanças em rotas, hooks, ou backend

## Arquivo único editado
- `src/components/layout/AppLayout.tsx`

