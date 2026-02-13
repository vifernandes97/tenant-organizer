

# Compressao de PDFs no Servidor

## Contexto
Atualmente, os PDFs sao enviados diretamente ao storage sem nenhum processamento. O objetivo e criar uma funcao backend que comprima os PDFs antes de armazena-los.

## Desafios Tecnicos
Comprimir PDFs de forma significativa (como o Ghostscript faz) nao e possivel nativamente em funcoes backend Deno. A biblioteca `pdf-lib` permite otimizacoes basicas (remover objetos nao utilizados, limpar metadados), mas nao faz compressao de imagens embutidas no PDF -- que e onde normalmente esta o maior ganho de tamanho.

## Abordagem Proposta

### 1. Nova Edge Function: `compress-pdf`
- Recebe o caminho do arquivo no storage
- Baixa o PDF do bucket `post-images`
- Usa `pdf-lib` (via `npm:pdf-lib`) para:
  - Remover metadados desnecessarios
  - Otimizar a estrutura interna do documento
  - Re-salvar o PDF de forma otimizada
- Substitui o arquivo original no storage pela versao otimizada
- Retorna o tamanho original e o tamanho comprimido

### 2. Integracao no fluxo de upload (`usePosts.ts`)
- Apos o upload de cada arquivo PDF ao storage, invocar a funcao `compress-pdf` passando o caminho do arquivo
- A compressao e fire-and-forget (nao bloqueia a criacao do post)
- Aplica-se tanto na criacao quanto na edicao de posts

### 3. Arquivos afetados
- **Novo**: `supabase/functions/compress-pdf/index.ts` -- funcao de compressao
- **Editado**: `src/hooks/usePosts.ts` -- chamada a funcao apos upload de PDFs

## Secao Tecnica

### Edge Function (`compress-pdf/index.ts`)
```text
Fluxo:
1. Valida JWT do usuario
2. Recebe { file_path: string } no body
3. Baixa o arquivo do bucket "post-images" usando service role
4. Carrega com PDFDocument.load() do pdf-lib
5. Re-salva com PDFDocument.save() (remove objetos orfaos)
6. Faz upload do buffer comprimido substituindo o original
7. Retorna { original_size, compressed_size }
```

### Hook de upload (`usePosts.ts`)
```text
Apos cada upload bem-sucedido:
- Verifica se o arquivo e PDF (file.type === 'application/pdf')
- Se sim, chama supabase.functions.invoke('compress-pdf', { body: { file_path } })
- Usa await para garantir que a compressao termine antes do webhook n8n
```

## Limitacoes
- A otimizacao com `pdf-lib` oferece ganhos modestos (5-20% tipicamente), pois nao recomprime imagens internas
- Para compressao mais agressiva, seria necessario integrar um servico externo (ex: iLovePDF API)

