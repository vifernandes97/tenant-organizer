
# Baixar todos os arquivos em ZIP

## O que sera feito

Adicionar um botao "Baixar Arquivos" no footer dos detalhes da publicacao (tanto em `PostDetails` quanto em `GroupPostDetails`). Ao clicar, todos os arquivos de midia (imagens, videos, documentos) do post ativo serao baixados e empacotados em um arquivo ZIP no navegador.

## Como funciona

1. O usuario abre os detalhes de uma publicacao
2. No rodape, ao lado dos botoes existentes (Editar, Copiar, Excluir), aparece um novo botao com icone de download
3. Ao clicar, os arquivos sao buscados via fetch, compactados em ZIP usando a biblioteca `jszip`, e o download inicia automaticamente
4. Um toast informa o progresso e conclusao
5. O botao so aparece quando ha arquivos na publicacao

## Secao Tecnica

### Dependencia nova
- Instalar `jszip` para gerar o ZIP no lado do cliente

### Novo utilitario: `src/lib/downloadZip.ts`
- Funcao `downloadPostFilesAsZip(files: {url: string, name: string}[], zipName: string)`
- Faz fetch de cada arquivo, adiciona ao JSZip, gera o blob e dispara o download
- Trata erros individuais (se um arquivo falhar, os outros ainda sao incluidos)

### Alteracoes em `PostDetails.tsx`
- Importar `Download` icon do lucide e a funcao `downloadPostFilesAsZip`
- Adicionar estado `isDownloading`
- Adicionar botao de download no footer, entre o botao "Copiar" e o "Excluir"
- O botao chama a funcao com os arquivos de `post.post_images`
- O nome do ZIP sera baseado no titulo/cliente e data do post

### Alteracoes em `GroupPostDetails.tsx`
- Mesma logica aplicada ao `activePost`
- Botao de download no footer, usando os arquivos do post ativo no canal selecionado

### Nome do arquivo ZIP
- Formato: `{cliente}_{data}_{canal}.zip` (ex: `ClienteX_2026-02-18_instagram-feed.zip`)
- Caracteres especiais removidos para compatibilidade
