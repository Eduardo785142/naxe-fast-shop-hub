# Auditoria do sandbox publicado

Atualização: 2026-10-21T16:39:33-03:00.
Site: https://darkslateblue-pelican-597772.hostingersite.com/

## Verificado no deployment bd75f26

- Homepage e rotas de página: HTTP 200, conteúdo NAXE LIVE correto.
- Ilustrações, vídeo demonstrativo e manifesto: HTTP 200.
- Layout em Chromium 1440x1000 e 390x844: sem overflow horizontal nas capturas.
- API: HTTP 500 em /api/health, /api/me, /api/streams, /api/streams/live-perfume, /api/account, /api/admin e /api/quote/perfume.
- Socket.IO: HTTP 500; sincronização indisponível.
- Catálogo: nenhum card carregado; mensagem de backend indisponível.
- Login e sala exibem erro técnico de parse de JSON diante da resposta textual 500.
- Modal de login não transfere foco automaticamente e não fecha com Escape; melhorias de acessibilidade pendentes.

Não foram criados usuários, lotes, mensagens ou pedidos no site remoto. Fluxos comerciais remotos permanecem bloqueados pela indisponibilidade da API. Os resultados locais não foram classificados como aprovação do deployment.

As páginas foram exercitadas em Chromium com as respostas HTTPS verificadas pelo cliente Node e encaminhadas ao navegador, mantendo TLS habilitado; isso foi necessário devido ao armazenamento de certificados separado do Chromium diante do proxy do ambiente.

## Diagnóstico a partir dos logs enviados

A Hostinger executou npm run build com preset Next.js e Entry file: none, e publicou o servidor standalone. A entrada antiga que iniciava a API separada não foi utilizada. O frontend respondeu, mas o backend de loopback não ficou disponível. O runtime foi adaptado para usar o hook nativo de inicialização do Next.js. Credenciais e conectividade externa do banco/Redis ainda precisam ser confirmadas após a nova implantação.

## Correção validada localmente em Node 22.23.3

- O build padrão gera o cliente Prisma e produz standalone com migrações incluídas.
- O hook instrumentation inicia migrações, seed explicitamente autorizado e API interna.
- O pacote foi copiado para um diretório temporário fora do checkout, sem depender do código-fonte ou node_modules do projeto.
- Um PostgreSQL temporário novo recebeu migrações e seed; banco e diretório foram removidos ao final.
- Verificados saúde de PostgreSQL/Redis, autorização, login/cookies, WebSocket, três sessões conectadas, idempotência, concorrência, encerramento pelo servidor, vencedor consistente e exatamente um pedido sandbox.
- RLS foi habilitado nas tabelas da aplicação; uma role anônima sem política não conseguiu ler usuários. A conexão privada do backend continuou funcional.

## Pendências

Reimplantar a correção na Hostinger e repetir a auditoria pública. Confirmar /api/health com ok=true e logs api_ready/embedded_api_ready. Caso a inicialização falhe, usar logs de execução para diagnosticar variáveis, TLS e conectividade com PostgreSQL/Redis. Não trocar o runtime de volta para uma API inexistente em outro processo.

Avisos de dependências são um problema separado do erro de inicialização: npm audit --omit=dev identificou 23 avisos (20 high, 3 moderate) na árvore atual. Não foi executado npm audit fix --force nem efetuada atualização incompatível sem revisão. A entrega continua exclusivamente sandbox, sem aprovação de segurança comercial.
