-- Criar enum para tipo de projeto
CREATE TYPE project_type AS ENUM (
  'ete', 
  'eta', 
  'osmose_reversa', 
  'ultrafiltracao', 
  'fisico_quimico', 
  'mbr'
);

-- Adicionar colunas WordPress na tabela posts
ALTER TABLE posts
ADD COLUMN article_title text,
ADD COLUMN seo_keyword text,
ADD COLUMN article_content text,
ADD COLUMN project_type project_type;

-- Adicionar colunas de midia na tabela post_images
ALTER TABLE post_images
ADD COLUMN media_type text NOT NULL DEFAULT 'image',
ADD COLUMN alt_text text;