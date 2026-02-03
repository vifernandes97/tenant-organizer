

## Melhorar UX para Usuários Convidados sem Conta

### Problema Identificado

Quando um usuário recebe um convite mas ainda nao tem conta, o fluxo atual:
1. Mostra "Fazer Login" como botao principal (destaque)
2. Mostra "Criar Conta" como botao secundario (menos visivel)
3. Usuario clica em "Fazer Login" por ser o botao de destaque
4. Usuario tenta fazer login com email que nao existe
5. Erro: credenciais invalidas

### Solucao Proposta

Inverter a hierarquia visual dos botoes e melhorar o texto orientativo para deixar claro que usuarios novos devem criar conta primeiro.

```text
┌──────────────────────────────────────────────────┐
│           Você foi convidado!                    │
│   Convite para fazer parte de Agência X          │
├──────────────────────────────────────────────────┤
│                                                  │
│   Para aceitar o convite, crie uma conta ou      │
│   faça login com o email vi.fernandes97@gmail.com│
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  👤  Criar Conta                         │   │  ← PRIMÁRIO
│   └──────────────────────────────────────────┘   │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  🔑  Já tenho uma conta                  │   │  ← SECUNDÁRIO
│   └──────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Mudancas no AcceptInvite.tsx

1. **Inverter ordem dos botoes** - "Criar Conta" primeiro (primario), "Fazer Login" segundo (outline)
2. **Melhorar texto** - "crie uma conta ou faca login" em vez de "faca login ou crie uma conta"
3. **Ajustar labels** - "Ja tenho uma conta" em vez de apenas "Fazer Login"

### Codigo

```tsx
// De (atual):
<Button asChild>
  <Link to={`/login?invite=${token}`}>
    <LogIn className="h-4 w-4 mr-2" />
    Fazer Login
  </Link>
</Button>
<Button variant="outline" asChild>
  <Link to={`/registro?invite=${token}`}>
    <UserPlus className="h-4 w-4 mr-2" />
    Criar Conta
  </Link>
</Button>

// Para (novo):
<Button asChild>
  <Link to={`/registro?invite=${token}`}>
    <UserPlus className="h-4 w-4 mr-2" />
    Criar Conta
  </Link>
</Button>
<Button variant="outline" asChild>
  <Link to={`/login?invite=${token}`}>
    <LogIn className="h-4 w-4 mr-2" />
    Já tenho uma conta
  </Link>
</Button>
```

### Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AcceptInvite.tsx` | Inverter ordem dos botoes e ajustar textos |

### Beneficios

- Usuarios novos vao clicar naturalmente em "Criar Conta"
- Texto "Ja tenho uma conta" deixa claro que e para usuarios existentes
- Reduz confusao e erros no fluxo de convite

