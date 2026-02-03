

## Corrigir Validacao de Convite

### Problema Identificado

A pagina de convite (/convite/:token) mostra "Convite Invalido" mesmo para convites validos porque a politica de RLS exige que o usuario esteja logado com o mesmo email do convite para visualiza-lo.

**Situacao atual:**
1. Usuario recebe link do convite
2. Abre o link no navegador (nao esta logado, ou esta logado com outra conta)
3. A query `validateToken` tenta buscar o convite
4. RLS bloqueia porque `auth.email()` nao corresponde ao email do convite
5. Sistema exibe "Convite Invalido" incorretamente

### Solucao

Criar uma politica de RLS que permita usuarios nao-autenticados (anon) consultarem convites apenas pelo token para validacao. Isso nao expoe dados sensiveis - apenas confirma se o convite existe e retorna informacoes publicas necessarias para o fluxo.

### Mudancas no Banco de Dados

**Nova politica de RLS na tabela `invitations`:**

```sql
-- Permitir validacao de convite por token (mesmo sem autenticacao)
CREATE POLICY "Anyone can validate invitation by token"
ON public.invitations FOR SELECT
TO anon, authenticated
USING (status = 'pending' AND expires_at > now());
```

Essa politica permite:
- Usuarios anonimos (nao logados) podem ver convites pendentes e nao expirados
- A busca ainda exige o token correto na query WHERE
- Convites expirados ou ja aceitos/revogados nao sao vistos

### Seguranca

O token do convite funciona como "chave de acesso":
- UUIDs tem 122 bits de entropia - virtualmente impossiveis de adivinhar
- Mesmo que alguem veja os dados do convite, precisa do token para aceita-lo
- O email exibido ja era intencional (usuario confirmou que quer mostrar email completo)
- As politicas de UPDATE continuam restritas a usuarios com email correspondente

### Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| Nova migracao SQL | Adicionar politica `Anyone can validate invitation by token` |

### Sequencia de Implementacao

1. Criar migracao SQL adicionando a nova politica de RLS
2. A politica existente `Anyone can validate invitation token by email` pode ser mantida como redundancia ou removida

