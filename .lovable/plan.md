

## Corrigir Overflow de Posts e Adicionar Visualizacao Semanal

### Problemas Identificados

1. **Botao "+N mais" abre formulario de nova postagem** - Atualmente o clique no botao de posts ocultos chama `onDayClick` que abre o modal de criacao em vez de exibir os posts ocultos
2. **Falta visualizacao semanal** - O calendario so possui visao mensal

### Solucao 1: Popover para Posts Ocultos

Quando clicar no "+N mais", exibir um popover com todos os posts do dia em vez de abrir o formulario de nova postagem.

```text
┌─────────────────────────────────────┐
│  15       [+]                       │
│  ┌─────────────────┐                │
│  │ Post 1 - Insta  │                │
│  └─────────────────┘                │
│  ┌─────────────────┐                │
│  │ Post 2 - TikTok │                │
│  └─────────────────┘                │
│  +2 mais  ←── Clique aqui          │
│     │                               │
│     ▼                               │
│  ┌───────────────────────────────┐  │
│  │  Posts do dia 15              │  │ ← Popover
│  │  ┌─────────────────────────┐  │  │
│  │  │ Post 3 - LinkedIn       │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ Post 4 - Facebook       │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Solucao 2: Adicionar Visualizacao Semanal

Adicionar toggle entre visao mensal e semanal com navegacao por semana.

```text
┌──────────────────────────────────────────────────────────────────┐
│  [◀] Fevereiro 2026 [▶]          [ Semana | Mes ]  ← Toggle     │
├──────────────────────────────────────────────────────────────────┤
│  Dom  │  Seg  │  Ter  │  Qua  │  Qui  │  Sex  │  Sab  │         │
│───────┼───────┼───────┼───────┼───────┼───────┼───────┤         │
│       │       │       │       │       │       │       │         │
│       │       │       │       │       │       │       │         │
│  2    │  3    │  4    │  5    │  6    │  7    │  8    │ ← Semana│
│       │       │       │       │       │       │       │   atual │
│ Post1 │ Post2 │       │ Post3 │       │ Post4 │       │         │
│ Post5 │       │       │       │       │ Post6 │       │         │
│       │       │       │       │       │ Post7 │       │         │
│       │       │       │       │       │       │       │         │
│       │       │       │       │       │       │       │         │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┘
```

Caracteristicas da visao semanal:
- Mais espaco vertical para exibir posts (mostra todos, sem overflow)
- Navegacao por semana (anterior/proxima)
- Botao "Hoje" leva para semana atual

### Arquitetura das Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `ScheduleCalendar.tsx` | Adicionar Popover para posts ocultos em vez de chamar onDayClick |
| `Schedule.tsx` | Adicionar estado de viewMode ('month' \| 'week'), toggle no header |
| **Novo** `ScheduleWeekView.tsx` | Componente de visualizacao semanal |

### Detalhes Tecnicos

**1. Popover para Posts Ocultos**

Modificar o botao "+N mais" no `ScheduleCalendar.tsx`:

```tsx
// Antes
<button onClick={() => onDayClick(date)}>
  +{hiddenCount} mais
</button>

// Depois
<Popover>
  <PopoverTrigger asChild>
    <button className="...">+{hiddenCount} mais</button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-2">
      <p className="font-medium text-sm">
        Posts de {date.toLocaleDateString('pt-BR')}
      </p>
      {dayGroups.map((group) => (
        <GroupedPostCard 
          key={group.groupId}
          group={group}
          onClick={() => onPostClick(group)}
        />
      ))}
    </div>
  </PopoverContent>
</Popover>
```

**2. Toggle de Visualizacao no Schedule.tsx**

```tsx
const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
const [currentWeek, setCurrentWeek] = useState(new Date());

// No header, adicionar toggle
<ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
  <ToggleGroupItem value="week">Semana</ToggleGroupItem>
  <ToggleGroupItem value="month">Mes</ToggleGroupItem>
</ToggleGroup>

// Renderizar calendario apropriado
{viewMode === 'month' ? (
  <ScheduleCalendar ... />
) : (
  <ScheduleWeekView 
    week={currentWeek}
    posts={posts}
    onPostClick={handlePostClick}
    onDayClick={handleDayClick}
  />
)}
```

**3. Componente ScheduleWeekView**

Novo componente que exibe 7 dias em colunas com altura maior:

- Cada coluna ocupa 1/7 da largura
- Altura fixa maior (ex: 400px) para acomodar mais posts
- Scroll interno se necessario
- Mesmo GroupedPostCard usado na visao mensal
- Exibe data completa no header da coluna

```tsx
// ScheduleWeekView.tsx
interface ScheduleWeekViewProps {
  week: Date; // Qualquer dia da semana
  posts: PostWithImages[];
  onPostClick: (group: PostGroup) => void;
  onDayClick: (date: Date) => void;
}

export function ScheduleWeekView({ week, posts, onPostClick, onDayClick }) {
  // Calcular domingo a sabado da semana
  const weekDays = useMemo(() => {
    const sunday = startOfWeek(week);
    return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  }, [week]);

  // Agrupar posts e mapear por dia
  const groupedPosts = useMemo(() => groupPosts(posts), [posts]);
  
  return (
    <div className="grid grid-cols-7 rounded-lg border bg-card">
      {weekDays.map((day) => (
        <div key={day.toISOString()} className="min-h-[400px] border-r p-2">
          {/* Header do dia */}
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className={isToday(day) ? 'bg-primary text-primary-foreground rounded-full px-2' : ''}>
                {day.getDate()}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onDayClick(day)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Posts do dia - sem limite */}
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {getGroupsForDay(day).map((group) => (
                <GroupedPostCard 
                  key={group.groupId}
                  group={group}
                  onClick={() => onPostClick(group)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
```

### Navegacao por Semana

Quando em modo semana, os botoes de navegacao mudam comportamento:

```tsx
// Schedule.tsx
const goToPrevious = () => {
  if (viewMode === 'month') {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  } else {
    setCurrentWeek((prev) => addDays(prev, -7));
  }
};

const goToNext = () => {
  if (viewMode === 'month') {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  } else {
    setCurrentWeek((prev) => addDays(prev, 7));
  }
};

const goToToday = () => {
  const today = new Date();
  setCurrentMonth(today);
  setCurrentWeek(today);
};
```

### Dependencias

Utilizar funcoes do `date-fns` ja instalado:
- `startOfWeek` - Obter domingo da semana
- `addDays` - Adicionar dias
- `format` - Formatar datas
- `isToday` - Verificar se e hoje

### Sequencia de Implementacao

1. Adicionar Popover ao botao "+N mais" no `ScheduleCalendar.tsx`
2. Criar componente `ScheduleWeekView.tsx` com visualizacao semanal
3. Atualizar `Schedule.tsx` com toggle de visualizacao e navegacao dual
4. Ajustar query de posts para buscar dados da semana quando em modo semanal

