# COTTA · Gestão societária

Sistema de gestão das sócias **Paloma** e **Jay** para as duas empresas:

- **Universo Store** (empresa PALAY): lojas no Mercado Livre e na Shopee, com estoque e envio pela Shopmix
- **Jay Personal Chef**: serviços, eventos e aulas

**App:** https://palomasaa.github.io/cotta/
**Pedidos e vitrine (clientes):** https://palomasaa.github.io/cotta/pedido.html?e=chef · https://palomasaa.github.io/cotta/pedido.html?e=loja
**Administração:** https://palomasaa.github.io/cotta/admin.html (só a administradora)

## Como funciona

| Parte | Onde fica |
|---|---|
| Telas do app (`index.html`, `runtime.js`) | Este repositório, publicado pelo GitHub Pages |
| Dados, logins Google e notificações | Firebase, projeto `jay-loma` (o ID do projeto não pode ser renomeado; o nome visível é COTTA) (plano gratuito Spark, banco em São Paulo) |
| Regras de segurança do banco | `firestore.rules` (copiar para Firebase → Firestore → Regras) |
| Alertas diários no celular | `.github/workflows/alertas.yml` + `scripts/alertas.mjs`, todo dia às 8h |

## Instalar no celular

- **Android (Chrome):** abra o app, toque no menu ⋮ e em **Instalar app**.
- **iPhone (Safari, iOS 16.4 ou mais novo):** toque em Compartilhar e em **Adicionar à Tela de Início**. Abra o app pelo ícone e toque em **🔔 Ativar alertas**.

## Segredo necessário para os alertas

Em *Settings → Secrets and variables → Actions*, crie o segredo `FIREBASE_SERVICE_ACCOUNT` com o conteúdo do arquivo JSON gerado em
Firebase → Configurações do projeto → Contas de serviço → **Gerar nova chave privada**.
Nunca coloque esse arquivo no repositório.
