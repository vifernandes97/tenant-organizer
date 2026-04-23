

# Tornar Approvee instalável (PWA simples, sem service worker)

## O que vai mudar
Adicionar suporte a "Adicionar à tela inicial" no iPhone/Android. O app vai poder ser instalado, abrir em modo standalone (sem barra de URL do navegador) e ter ícone próprio. **Sem service worker, sem cache offline** — zero risco de interferir no preview do Lovable.

## Implementação

### 1. Criar `public/manifest.json`
```json
{
  "name": "Approvee - Gestão de Conteúdo",
  "short_name": "Approvee",
  "description": "Plataforma de aprovação de conteúdo para agências",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d9488",
  "orientation": "portrait",
  "icons": [
    { "src": "/favicon.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/favicon.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

> Reusa o `favicon.png` existente. Se quiser ícones em resoluções dedicadas (192x192 e 512x512 reais), você pode subir depois — por ora o favicon serve.

### 2. Editar `index.html`
Adicionar no `<head>`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0d9488" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Approvee" />
<link rel="apple-touch-icon" href="/favicon.png" />
```

## Como instalar (depois de publicado)
- **Android/Chrome**: aparece banner "Instalar app" ou via menu → "Adicionar à tela inicial"
- **iPhone/Safari**: botão Compartilhar → "Adicionar à Tela de Início"

## Limitações desta abordagem (intencionais)
- ✅ Instalável, ícone próprio, modo standalone
- ❌ Não funciona offline (precisa de internet — coerente com app de gestão que carrega dados do backend)
- ❌ Sem push notifications

## Notas
- Funciona tanto em `app.approvee.com.br` quanto na URL publicada
- No preview do Lovable (iframe), o "Instalar" não aparece — isso é esperado e correto
- Theme color `#0d9488` (teal da marca Approvee); ajustável depois se preferir o teal escuro do sidebar

## Arquivos
- **Criado**: `public/manifest.json`
- **Editado**: `index.html`

