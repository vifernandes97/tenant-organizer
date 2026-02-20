
# Adicionar botão "Copiar" no comentário

## O que será feito

Adicionar um botão "Copiar" na barra de ações que aparece ao passar o mouse sobre um comentário. Ao clicar, o conteúdo do comentário é copiado para a área de transferência e um feedback visual é exibido (ícone muda temporariamente para um check).

## Comportamento esperado

- Botão "Copiar" aparece junto com os outros botões ao passar o mouse sobre o comentário
- Disponível para todos os usuários (não só `canModify`)
- Ao clicar, copia `comment.content` para o clipboard usando a API nativa `navigator.clipboard.writeText`
- O ícone muda de `Copy` para `Check` por 1,5 segundo como feedback visual
- `e.stopPropagation()` para não acionar o `onClick` do card

## Arquivo alterado

### `src/components/comments/CommentItem.tsx`

1. Importar os ícones `Copy` e `CheckCheck` do `lucide-react`
2. Adicionar estado `copied` (boolean) para controlar o feedback visual
3. Criar `handleCopy` que chama `navigator.clipboard.writeText(comment.content)` e seta `copied = true` por 1,5s
4. Inserir o botão "Copiar" na barra de ações hover, antes dos botões de Resolver/Editar/Excluir

## Seção técnica

### Trecho do botão

```tsx
const [copied, setCopied] = useState(false);

const handleCopy = (e: React.MouseEvent) => {
  e.stopPropagation();
  navigator.clipboard.writeText(comment.content);
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
};

// No bloco de ações (hover):
<Button
  variant="ghost"
  size="sm"
  className="h-7 px-2 text-xs"
  onClick={handleCopy}
>
  {copied ? (
    <>
      <CheckCheck className="mr-1 h-3 w-3 text-green-500" />
      Copiado
    </>
  ) : (
    <>
      <Copy className="mr-1 h-3 w-3" />
      Copiar
    </>
  )}
</Button>
```

Nenhuma alteração de banco de dados necessária — é uma funcionalidade puramente de frontend.
