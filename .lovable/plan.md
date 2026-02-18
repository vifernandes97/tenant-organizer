
# Status diferenciados para publicações WordPress

## Resumo

Adicionar dois novos valores ao enum `post_status` no banco (`ai_generated` e `reviewed`) e fazer os componentes de status mostrarem opcoes diferentes conforme o canal:

- **WordPress**: Rascunho, Gerado por IA, Revisado, Aprovado, Publicado
- **Demais canais**: Rascunho, Aprovado, Agendado, Publicado (sem mudanca)

## Alteracoes

### 1. Migracao SQL

Adicionar os novos valores ao enum `post_status`:

```sql
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ai_generated' AFTER 'draft';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'reviewed' AFTER 'ai_generated';
```

### 2. `PostStatusBadge.tsx`

- Adicionar entradas no `statusConfig` para `ai_generated` (icone Sparkles, cor violeta) e `reviewed` (icone Eye, cor laranja)

### 3. `PostStatusDropdown.tsx`

- Receber nova prop `channel?: SocialChannel`
- Adicionar `ai_generated` e `reviewed` ao `statusConfig`
- Filtrar `STATUS_OPTIONS` com base no canal:
  - Se `channel === 'wordpress'`: `draft`, `ai_generated`, `reviewed`, `approved`, `published`
  - Caso contrario: `draft`, `approved`, `scheduled`, `published`

### 4. `PostDetails.tsx` e `GroupPostDetails.tsx`

- Passar `channel={post.channel}` (ou `activePost.channel`) para o `PostStatusDropdown`

### 5. `ScheduleFilters.tsx`

- Adicionar `ai_generated` e `reviewed` nas opcoes de filtro de status

## Secao Tecnica

### Novos status no config

```typescript
ai_generated: {
  label: 'Gerado por IA',
  variant: 'outline',
  className: 'border-violet-500 text-violet-600 bg-violet-50',
  icon: Sparkles,
},
reviewed: {
  label: 'Revisado',
  variant: 'outline', 
  className: 'border-orange-500 text-orange-600 bg-orange-50',
  icon: Eye,
},
```

### Filtragem por canal no dropdown

```typescript
const STATUS_OPTIONS_WORDPRESS = [
  { value: 'draft', ... },
  { value: 'ai_generated', ... },
  { value: 'reviewed', ... },
  { value: 'approved', ... },
  { value: 'published', ... },
];

const STATUS_OPTIONS_DEFAULT = [
  { value: 'draft', ... },
  { value: 'approved', ... },
  { value: 'scheduled', ... },
  { value: 'published', ... },
];

// No componente:
const options = channel === 'wordpress' ? STATUS_OPTIONS_WORDPRESS : STATUS_OPTIONS_DEFAULT;
```

## Arquivos alterados

- Migracao SQL (novo enum values)
- `src/components/schedule/PostStatusBadge.tsx`
- `src/components/schedule/PostStatusDropdown.tsx`
- `src/components/schedule/PostDetails.tsx`
- `src/components/schedule/GroupPostDetails.tsx`
- `src/components/schedule/ScheduleFilters.tsx`
