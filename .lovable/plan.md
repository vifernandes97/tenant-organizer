

## Card WordPress com Upload de Arquivos

### Objetivo

Quando o canal selecionado for WordPress, o formulário e detalhes do post devem ter um comportamento diferente:
1. **Upload expandido**: Aceitar arquivos além de imagens/vídeos (PDF, DOCX, MP4, PNG, JPG, etc.)
2. **Sem campo de legenda**: Ocultar o campo "Legenda" pois não se aplica a artigos WordPress

### Comportamento Atual vs. Proposto

| Aspecto | Canais Sociais | WordPress |
|---------|----------------|-----------|
| Upload | Imagens (10MB) e Vídeos (50MB) | Arquivos gerais (PDF, DOCX, etc. até 25MB) |
| Legenda | Exibir campo de 2200 caracteres | Ocultar (não se aplica) |
| Campos específicos | Nenhum | Título, SEO, Tipo de Projeto, Texto do Artigo (já existem) |

### Alterações Necessárias

#### 1. Criar Componente `FileUploader` para WordPress

Novo componente similar ao `ImageUploader`, mas:
- Aceita mais tipos de arquivo: `image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx`
- Limite de arquivo: 25MB para documentos
- Preview diferenciado: ícone por tipo de arquivo (PDF, Word, Excel, etc.)
- Exibe nome do arquivo e tamanho

#### 2. Atualizar Tabela `post_images`

O campo `media_type` já existe e suporta strings. Expandir os valores possíveis:
- `'image'` - Imagens (PNG, JPG, etc.)
- `'video'` - Vídeos (MP4, etc.)
- `'document'` - Documentos (PDF, DOCX, etc.)

Não requer migração SQL pois o campo já é `text`.

#### 3. Atualizar `PostForm.tsx`

Condicionar o formulário baseado no canal selecionado:

```text
Se canal contém 'wordpress':
  - Mostrar FileUploader (aceita todos os tipos)
  - Ocultar campo "Legenda"
  - Manter campos WordPress específicos (já existem)

Senão:
  - Mostrar ImageUploader (imagens e vídeos apenas)
  - Mostrar campo "Legenda"
```

#### 4. Atualizar `GroupPostDetails.tsx`

Na aba WordPress:
- Ocultar seção "Legenda"
- Na galeria de mídia, mostrar preview apropriado para documentos (ícone + nome do arquivo)

#### 5. Atualizar Hooks `usePosts.ts`

Ajustar o upload de arquivos para identificar corretamente o `media_type`:
- Imagens: `media_type = 'image'`
- Vídeos: `media_type = 'video'`
- Outros: `media_type = 'document'`

### Novos Componentes

| Arquivo | Descrição |
|---------|-----------|
| `src/components/schedule/FileUploader.tsx` | Componente de upload genérico para WordPress |
| `src/components/schedule/FilePreview.tsx` | Preview de documentos (ícone + nome) |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/schedule/PostForm.tsx` | Condicionar campos por canal, usar FileUploader para WordPress |
| `src/components/schedule/GroupPostDetails.tsx` | Ocultar legenda para WordPress, preview de documentos |
| `src/hooks/usePosts.ts` | Expandir lógica de upload para detectar tipo de arquivo |

### Tipos de Arquivo Suportados (WordPress)

| Categoria | Extensões | Limite |
|-----------|-----------|--------|
| Imagens | PNG, JPG, JPEG, GIF, WEBP | 10MB |
| Vídeos | MP4, WEBM, MOV | 50MB |
| Documentos | PDF, DOC, DOCX | 25MB |
| Planilhas | XLS, XLSX | 25MB |
| Apresentações | PPT, PPTX | 25MB |

### Preview de Arquivos

Para documentos que não são imagens/vídeos, exibir:
- Ícone representativo do tipo (FileText para PDF, FileSpreadsheet para Excel, etc.)
- Nome do arquivo (truncado se necessário)
- Tamanho do arquivo

### Segurança

Reutilizar as políticas RLS existentes em `post_images`. Como os arquivos são armazenados no Storage bucket e apenas a URL é salva na tabela, não há necessidade de novas políticas.

