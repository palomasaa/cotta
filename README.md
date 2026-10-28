# Jay-Loma

App de gestão das sócias **Paloma** e **Jay** para as duas empresas:

- **Jay-Loma Lojas**: lojas no Mercado Livre e na Shopee, com estoque e envio pela Shopmix
- **Jay Personal Chef**: serviços, eventos e aulas

**App:** https://palomasaa.github.io/jay-loma/
**Administração:** https://palomasaa.github.io/jay-loma/admin.html (só a administradora)

## Como funciona

| Parte | Onde fica |
|---|---|
| Telas do app (`index.html`, `runtime.js`) | Este repositório, publicado pelo GitHub Pages |
| Dados, logins Google e notificações | Firebase, projeto `jay-loma` (plano gratuito Spark, banco em São Paulo) |
| Regras de segurança do banco | `firestore.rules` (copiar para Firebase → Firestore → Regras) |
| Alertas diários no celular | `.github/workflows/alertas.yml` + `scripts/alertas.mjs`, todo dia às 8h |

## Instalar no celular

- **Android (Chrome):** abra o app, toque no menu ⋮ e em **Instalar app**.
- **iPhone (Safari, iOS 16.4 ou mais novo):** toque em Compartilhar e em **Adicionar à Tela de Início**. Abra o app pelo ícone e toque em **🔔 Ativar alertas**.

## Segredo necessário para os alertas

Em *Settings → Secrets and variables → Actions*, crie o segredo `FIREBASE_SERVICE_ACCOUNT` com o conteúdo do arquivo JSON gerado em
Firebase → Configurações do projeto → Contas de serviço → **Gerar nova chave privada**.
Nunca coloque esse arquivo no repositório.
