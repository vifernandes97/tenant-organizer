

## Implementar Sidebar Colapsável com Ícones

### Objetivo

Adicionar funcionalidade para recolher o menu lateral, exibindo apenas os ícones de navegação. Isso permitirá que o calendário e demais conteúdos ocupem mais espaço horizontal na tela.

### Comportamento Esperado

```text
┌──────────────────────────────────────────────────────────────────┐
│ Estado Expandido (padrão)                                        │
├──────────┬───────────────────────────────────────────────────────┤
│ [≡]      │                                                       │
│ Logo     │                                                       │
│          │                                                       │
│ 🏠 Dashboard    │         Conteúdo Principal               │
│ 👥 Clientes     │         (Calendário etc.)                │
│ 📅 Cronogramas  │                                                │
│ ⚙️ Config.     │                                                │
│          │                                                       │
│ Avatar   │                                                       │
│ Nome     │                                                       │
└──────────┴───────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Estado Recolhido                                                 │
├────┬─────────────────────────────────────────────────────────────┤
│[≡] │                                                             │
│    │                                                             │
│ 🏠 │         Conteúdo Principal (Mais Espaço!)              │
│ 👥 │                                                             │
│ 📅 │         Calendário ocupando área maior                 │
│ ⚙️ │                                                             │
│    │                                                             │
│ 👤 │                                                             │
└────┴─────────────────────────────────────────────────────────────┘
```

### Recursos

- Botão de toggle para expandir/recolher
- Tooltips nos ícones quando recolhido (mostra nome da página)
- Atalho de teclado: `Ctrl+B` ou `Cmd+B`
- Estado persistido no cookie do navegador
- Animação suave na transição

### Alterações Necessárias

#### 1. Refatorar `AppLayout.tsx`

Utilizar os componentes do Shadcn Sidebar com suporte nativo a colapso:

| Componente | Uso |
|------------|-----|
| `SidebarProvider` | Wrapper que gerencia estado expandido/recolhido |
| `Sidebar` | Container principal com `collapsible="icon"` |
| `SidebarHeader` | Área do logo |
| `SidebarContent` | Área de navegação |
| `SidebarFooter` | Área do usuário |
| `SidebarMenu/MenuItem/MenuButton` | Itens de navegação com tooltip automático |
| `SidebarTrigger` | Botão para toggle |

**Mudanças principais:**

```typescript
// Antes: Sidebar customizada fixa de 256px
<aside className="w-64 ...">

// Depois: Sidebar colapsável (256px → 48px)
<SidebarProvider>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      {/* Logo - ocultar texto quando recolhido */}
    </SidebarHeader>
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Dashboard" asChild>
            <Link to="/dashboard">
              <LayoutDashboard />
              <span>Dashboard</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* ... demais itens */}
      </SidebarMenu>
    </SidebarContent>
    <SidebarFooter>
      {/* Avatar - esconder nome/email quando recolhido */}
    </SidebarFooter>
  </Sidebar>
  
  <main className="flex-1">
    <header>
      <SidebarTrigger /> {/* Botão de toggle */}
    </header>
    {children}
  </main>
</SidebarProvider>
```

### Detalhes de Implementação

| Aspecto | Comportamento |
|---------|---------------|
| Logo | Quando recolhido, mostrar apenas o ícone/favicon |
| Labels de navegação | Ocultos quando recolhido, visíveis via tooltip |
| Seção do usuário | Mostrar apenas avatar quando recolhido |
| Toggle | Botão na topbar, sempre visível |
| Persistência | Cookie `sidebar:state` válido por 7 dias |

### Resumo dos Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/layout/AppLayout.tsx` | Refatorar para usar componentes Shadcn Sidebar |

### Resultado

- Menu colapsável com transição suave
- Ícones com tooltips quando recolhido
- Mais espaço para o calendário e conteúdos
- Atalho de teclado `Ctrl/Cmd + B`
- Estado persistido entre sessões

