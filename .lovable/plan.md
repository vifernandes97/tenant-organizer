

# Fix: labels não aparecem no hover-expand da sidebar

## Problema
No hover, a sidebar expande visualmente (largura aumenta) mas os labels continuam ocultos. Causa: o shadcn `Sidebar` aplica CSS próprio que esconde os `<span>` dentro de `SidebarMenuButton` quando `data-state="collapsed"` (via classes como `group-data-[collapsible=icon]:!hidden`). Mesmo forçando a largura via classe, o `data-state` do Radix continua `collapsed`, então o CSS interno do componente esconde os textos.

Nosso `isCollapsed` derivado controla corretamente o bloco de nome/email do usuário (renderização condicional em JSX), mas os `<span>` dos itens de menu são escondidos pelo CSS do próprio `SidebarMenuButton`, que não olha pro nosso state.

## Correção

### `src/components/layout/AppLayout.tsx`
Adicionar overrides CSS no `hoverExpandClass` para forçar a exibição dos elementos que o shadcn esconde quando `data-collapsible="icon"`:

```ts
const hoverExpandClass =
  isRealCollapsed && isHovering
    ? [
        // expandir largura (já existente)
        '[&_[data-sidebar=sidebar]]:!w-[--sidebar-width]',
        '[&>div:first-child>div]:!w-[--sidebar-width]',
        '[&>div:first-child]:shadow-lg',
        '[&>div:first-child]:transition-[width]',
        '[&>div:first-child]:duration-200',
        // NOVO: revelar spans/labels escondidos pelo CSS interno do shadcn
        '[&_[data-sidebar=menu-button]>span:last-child]:!opacity-100',
        '[&_[data-sidebar=menu-button]>span:last-child]:!inline',
        '[&_[data-sidebar=menu-button]]:!w-full',
        '[&_[data-sidebar=menu-button]]:!justify-start',
        '[&_[data-sidebar=menu-button]]:!p-2',
      ].join(' ')
    : '';
```

Pontos-chave:
- O shadcn marca o span do label com `data-sidebar="menu-button"` no botão pai e oculta o `<span>` filho no modo icon — forçamos `opacity-100` + `inline`
- O botão em si vira quadrado (`size-8`) no modo icon — forçamos `w-full`, `justify-start`, padding normal pra voltar ao layout expandido
- O bloco do `SidebarHeader` (logo) e o `SidebarFooter` (avatar+nome) já são controlados pelo nosso `isCollapsed` derivado, que usa `!isRealCollapsed || isHovering` — esses já funcionam

### Verificação
Após o fix, ao passar mouse sobre a sidebar colapsada:
- Largura expande para 16rem ✅ (já funciona)
- Logo "Approvee" completo aparece ✅ (já funciona via JSX condicional)
- Labels "Dashboard", "Clientes" etc aparecem ao lado dos ícones ⬅️ **fix**
- Nome/email do usuário no rodapé aparecem ✅ (já funciona via JSX condicional)
- Conteúdo principal não se mexe ✅ (já funciona via overlay)

## Arquivo único editado
- `src/components/layout/AppLayout.tsx`

