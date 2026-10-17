# Approvee

SaaS multitenant para Agências de Marketing

Crie um software SaaS multitenant para agências de marketing.
Cada Organização (Tenant) deve ter seus próprios dados isolados (clientes, cronogramas, posts, usuários). Um usuário só pode acessar dados do seu tenant.
Deve existir MASTER ADMIN (superusuário) para administrar tenants e usuários globalmente (opcional, mas recomendado).

1) Autenticação e Permissões
	•	Login e logout
	•	Perfis/roles:
	•	OWNER/ADMIN (da agência/tenant)
	•	MEMBER (colaborador)
	•	(opcional) MASTER ADMIN
	•	Controle de acesso por tenant: todas as queries e dados devem ser filtrados por tenantId.
	•	Usuário pertence a um tenant (exceto master admin).

2) Estrutura de Dados (Entidades)

Tenant (Organização)
	•	id
	•	nome
	•	slug (usado em URLs amigáveis opcionalmente)
	•	criado_em

Usuário
	•	id
	•	tenantId
	•	nome
	•	email
	•	senha (hash)
	•	role
	•	criado_em

Cliente (da agência)
Campos obrigatórios:
	•	id
	•	tenantId
	•	nome
	•	descrição
	•	anotações (rich text ou markdown)
	•	definição de persona (campos estruturados + texto)
Campos recomendados (“outros dados importantes pro mkt”):
	•	segmento/nicho
	•	objetivos (lista)
	•	tom de voz / guidelines
	•	canais ativos (Instagram, TikTok, etc.)
	•	links importantes (site, drive, brandbook)
	•	responsáveis (nome/contato)
	•	tags
	•	status (ativo/pausado)
	•	criado_em / atualizado_em

Postagem Agendada
	•	id
	•	tenantId
	•	clientId (relacionamento com Cliente)
	•	dataHoraPublicacao
	•	status (rascunho / aprovado / agendado / publicado)
	•	canal (instagram_feed, instagram_story, tiktok, etc.)
	•	legenda em editor de texto robusto (rich text) com suporte a:
	•	negrito/itálico/listas/links
	•	emojis
	•	contagem de caracteres (útil p/ legendas)
	•	(opcional) templates/variáveis
	•	imagens (upload + preview):
	•	permitir anexar 1 ou mais imagens por postagem
	•	guardar URL/arquivo + ordem
	•	criado_em / atualizado_em

3) Páginas e Rotas

Layout geral
	•	Sidebar com navegação: Dashboard, Clientes, Cronogramas, Configurações
	•	Topbar com: busca, seletor (quando aplicável), usuário/logoff

/clientes
	•	Listagem em tabela/cards com filtro e busca
	•	Criar/editar cliente
	•	Tela de detalhes do cliente:
	•	mostrar todos os campos
	•	aba “Cronograma” do cliente (atalho para ver as postagens dele)

/cronogramas
Página principal do cronograma com calendário:
	•	Visualização:
	•	Mensal
	•	Semanal
	•	Diária
	•	Exibir postagens como “cards” nos dias/horários
	•	Ao clicar em uma postagem:
	•	abrir drawer/modal com:
	•	preview das imagens
	•	editor robusto da legenda
	•	data/hora, canal, status
	•	salvar alterações
	•	Requisito importante: em /cronogramas, permitir alternar a visualização por cliente:
	•	Um seletor no topo: “Todos os clientes” ou escolher um cliente
	•	Ao escolher um cliente, filtrar o calendário para mostrar somente posts daquele cliente
	•	Mostrar claramente qual cliente está selecionado

4) Experiência do Usuário (UX)
	•	Tudo responsivo (desktop-first, mas usável no mobile)
	•	Filtros úteis:
	•	por cliente
	•	por status (rascunho/aprovado/agendado/publicado)
	•	por canal
	•	Criar nova postagem:
	•	botão “+ Nova postagem”
	•	escolher cliente
	•	escolher data/hora
	•	anexar imagens
	•	escrever legenda no editor rich text
	•	Suporte a arrastar e soltar (opcional):
	•	mover postagem no calendário alterando data/hora

5) Regras e Segurança
	•	Isolamento total por tenant:
	•	usuário só vê clientes e postagens do próprio tenant
	•	Validações:
	•	clientId deve pertencer ao tenant do usuário
	•	postagem deve pertencer ao tenant do usuário
	•	Auditoria simples (opcional):
	•	log de alterações de postagens (quem editou e quando)

6) Entregáveis do Lovable
	•	Gerar o app com:
	•	telas prontas
	•	banco/coleções/tabelas
	•	autenticação
	•	CRUD de clientes
	•	CRUD de postagens agendadas
	•	calendário em /cronogramas com visão mensal/semanal/diária
	•	filtro por cliente dentro de /cronogramas
	•	modal/drawer com preview de imagens + editor rich text de legenda

Observação: priorize o MVP funcional e bem organizado, com UI limpa e moderna.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tenant-organizer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8f2abbf9-33d4-4657-a614-0daf75641d3f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
