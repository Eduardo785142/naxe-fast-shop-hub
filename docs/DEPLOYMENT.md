# Homologação da NAXE LIVE

Esta versão é exclusivamente sandbox. Não aceita transações comerciais. O processo da API recusa `DEMO_MODE` diferente de `true`.

## Implantação recomendada

Use um servidor Node persistente atrás de HTTPS, com PostgreSQL e Redis persistentes e backups. Rode frontend e API como processos separados (systemd, supervisor ou plataforma de containers). Não execute Socket.IO em função serverless. Os containers do Compose são para desenvolvimento local, com portas vinculadas apenas a loopback e credenciais fictícias.

1. Instale Node 24 e rode `npm ci`, `npm run db:generate`.
2. Crie `.env.live.local` com `DATABASE_URL`, `REDIS_URL`, `APP_ORIGIN` correspondendo exatamente à URL pública do frontend, `PORT=4000`, `DEMO_MODE=true`.
3. Para uma homologação privada com seeds, configure `ENABLE_DEMO_SEED=true` e uma `DEMO_PASSWORD` exclusiva com pelo menos 12 caracteres. Em um banco novo, `npm run db:migrate` e `npm run db:seed`. O seed não muda senhas de usuários que já existem. Não exponha as contas demonstrativas com a senha padrão na Internet.
4. `npm run build`; inicie `NAXE_EMBED_API=false npm run start` e `npm run api:dev` como serviços supervisionados. Apesar do nome, `api:dev` executa um processo persistente sem watch. Defina `NODE_ENV=production` no backend apenas sob HTTPS: cookies ficam `Secure`.
5. Encaminhe `/api/*` e `/socket.io` (incluindo Upgrade de WebSocket) à API. O frontend Next já possui rewrites locais. O proxy deve preservar cookies, Origin e Upgrade e ter timeout adequado para conexões persistentes. Não cacheie respostas autenticadas.
6. Verifique `/api/health`, login, uma sala com dois compradores, reconexão, encerramento e persistência de pedido. Abra portas públicas somente para HTTPS.

`API_INTERNAL_URL` permite trocar o destino dos rewrites no build do Next. O frontend pode ser hospedado na Vercel, mas a API precisa ficar em um host persistente. Nesse arranjo, configure também `NEXT_PUBLIC_REALTIME_URL=https://api.sua-homologacao.example` no build para conexão direta do Socket.IO ao backend; mantenha as chamadas `/api` pelo rewrite same-origin. Configure o domínio do frontend como `APP_ORIGIN` na API. A implantação externa não foi executada neste trabalho.

## Streaming profissional

`STREAMING_PROVIDER=demo` é o padrão: vídeos ilustrativos locais, com controles nativos, e câmera/microfone locais no Studio. Não há vídeo compartilhado ao vivo nesse modo.

O adaptador Cloudflare cria um live input pelo backend e usa os endpoints WebRTC retornados para WHIP/WHEP no navegador. Para testar: configure `STREAMING_PROVIDER=cloudflare`, `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` apenas no backend. Permita os destinos oficiais necessários na política de rede, incluindo `api.cloudflare.com` e os endpoints de mídia retornados pelo fornecedor. Abra o Studio em HTTPS, teste câmera/microfone, inicie mídia e abra a sala em outro navegador.

As credenciais administrativas nunca são retornadas ao frontend. A URL de publicação é entregue somente ao vendedor dono da transmissão. A URL de playback é pública para espectadores. O fornecedor pode exigir provisionamento adicional de WebRTC, suporte a CORS e conectividade ICE/STUN/TURN; isto depende da conta e precisa ser validado. Sem credenciais externas, o fluxo real não foi testado. O adaptador falha explicitamente se a resposta não contiver endpoints compatíveis, sem fingir transmissão real.

O ciclo de vida de live inputs externos (revogação, remoção, persistência e reaproveitamento após reinício) precisa ser finalizado para uso comercial. As referências de sessão de mídia ficam em memória nesta versão. O motor de leilões continua persistente e independente da mídia.

## Antes de uso comercial

PSP com tokenização hospedada, webhooks assinados e reconciliação; frete com provedor real; validação documental de vendedor e regras de repasse; recuperação de senha e verificação de e-mail; monitoramento e operação de moderação; proteção antifraude; revisão jurídica e LGPD; políticas de retenção, backup e restauração; ensaios de carga e disponibilidade; testes reais em Safari/iOS, Android e Firefox. Não há alegação de escala validada.

Para múltiplas réplicas da API, adicione um adapter distribuído Socket.IO e estratégia de presença entre réplicas. Redis já atende limites e presença transitória; a emissão de eventos nesta versão é de uma instância. Os bloqueios e resultados definitivos são transacionais em PostgreSQL.
