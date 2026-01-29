
## Objetivo
Corrigir 3 problemas no modal de detalhes do Cronograma:
1) a imagem não estar ficando totalmente visível (em alguns casos ela fica “cortada”/limitada),
2) o botão **Editar** não aparecer,
3) não conseguir **scrollar** dentro do modal (o que também pode estar impedindo o acesso ao rodapé).

Pelos prints, o rodapé (onde está o “Editar”) está sendo “clippado” e o scroll do painel direito não está funcionando.

---

## Diagnóstico (o que está causando isso)
### 1) Scroll quebrado por layout flex sem `min-h-0`
No `PostDetails.tsx`, o painel direito tem um bloco com `flex-1 overflow-y-auto`, mas, em layouts com `flex` aninhado, o scroll frequentemente não funciona se os pais não tiverem `min-h-0`. Isso faz o conteúdo “crescer” e ser cortado pelo contêiner (ainda mais porque o `DialogContent` tem `overflow-hidden`).

Resultado: você não consegue rolar e o footer (com o botão Editar) “some”.

### 2) Mobile/tablet: layout em coluna pode tornar o painel de baixo inacessível
O wrapper principal usa `flex-col` fora do `lg`. A coluna esquerda está com `flex-1`, então ela tende a consumir toda a altura disponível, empurrando a coluna direita para “fora” — e como o `DialogContent` está `overflow-hidden`, não dá para rolar para alcançá-la.

### 3) Imagem não 100% visível
Mesmo com `object-contain`, se o contêiner pai não estiver com alturas corretamente calculadas (ou se o flex estiver estourando), a imagem pode acabar “limitada” por overflow/clipping. Também ajuda tornar o `<img>` explicitamente `h-full w-full object-contain` com um contêiner que tenha altura bem definida e `min-h-0`.

---

## Mudanças propostas (sem mudar o conceito do layout 90vw)
### A) Ajustar o `DialogContent` para um layout mais “scroll-safe”
No `src/components/schedule/PostDetails.tsx`:
- Transformar o `DialogContent` em um contêiner `flex` (ou manter como está, mas garantindo a cadeia de `min-h-0`).
- Manter `h-[90vh] w-[90vw]`, mas:
  - adicionar `min-h-0` no wrapper principal
  - revisar onde `overflow-hidden` é realmente necessário

Sugestão de regra prática:
- `DialogContent`: pode continuar com `overflow-hidden` no desktop para manter a moldura limpa
- mas precisa permitir que as áreas internas consigam scrollar (com `min-h-0` nos pais)

### B) Consertar o scroll e o “sumir” do footer (Editar)
Ainda em `PostDetails.tsx`:
- No wrapper `div` que contém as duas colunas, adicionar `min-h-0`.
- Na coluna direita, adicionar `min-h-0`.
- No bloco “Content with scroll”, garantir `min-h-0 flex-1 overflow-y-auto`.

Isso faz o conteúdo realmente virar área scrollável e garante que o footer com `shrink-0` fique visível.

### C) Responsividade correta (evitar que a coluna esquerda engula tudo no mobile)
No modo `flex-col` (abaixo de `lg`):
- Definir altura máxima para a área da imagem (ex.: `h-[45vh]` ou `max-h-[45vh]`), em vez de deixar `flex-1` “comer” a tela toda.
- Fazer o painel direito ocupar o restante (`flex-1 min-h-0`) e ser scrollável.

Assim, no mobile:
- imagem fica “grande o suficiente”
- informações + legenda + status + botões ficam acessíveis com scroll interno

### D) Garantir que a imagem fique integralmente visível
Na área da imagem principal:
- Ajustar o contêiner para ter `min-h-0` e altura bem definida.
- Trocar o `<img>` de `max-h-full max-w-full` para algo mais determinístico:
  - `className="h-full w-full object-contain"`
- Manter `p-4` e os overlays (setas/contador) como estão.

Isso evita casos em que o browser calcula o `max-height: 100%` de forma inesperada.

### E) “Editar” mais amigável (redundância visual)
Mesmo corrigindo scroll/rodapé, para apresentação é útil ter o **Editar** “sempre à vista”:
- Adicionar um botão “Editar” também no header do painel direito (próximo do status), além do rodapé.
- Benefício: mesmo se alguém estiver com viewport baixo, o CTA principal não desaparece.

---

## Arquivos a mexer
- `src/components/schedule/PostDetails.tsx` (único necessário para essas correções)

---

## Critérios de aceite (o que vamos validar)
1) No desktop:
   - Footer com **Editar** aparece sempre.
   - Se o conteúdo do painel direito crescer, o scroll funciona no bloco correto.
2) No mobile/tablet:
   - A coluna direita fica acessível (não “some”).
   - Dá para rolar o painel de informações/legenda sem travar.
3) Imagem:
   - A imagem fica sempre integralmente visível (fit/contain), sem precisar scroll do modal para ver o topo/rodapé da imagem.
4) Legenda:
   - O botão **Expandir** continua funcionando e abre a legenda completa.

---

## Sequência de implementação
1) Ajustar classes do `DialogContent` e wrapper principal para suportar `min-h-0`.
2) Corrigir coluna esquerda no mobile (altura controlada) e coluna direita como `flex-1 min-h-0`.
3) Garantir scroll no painel direito (`overflow-y-auto` funcionando de verdade).
4) Ajustar o `<img>` para `h-full w-full object-contain` e corrigir contêineres com `min-h-0`.
5) Duplicar CTA “Editar” no header (opcional, mas recomendado para apresentação).
6) Teste final end-to-end no /cronogramas: abrir post, rolar, visualizar footer, expandir legenda e abrir fullscreen.

