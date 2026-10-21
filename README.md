# NAXE LIVE

MVP web brasileiro de live shopping e leilões. **Ambiente demonstrativo: nenhum pagamento ou envio real.** Interface em português, valores em centavos inteiros/BRL e exibição de datas em `America/Sao_Paulo`.

Implementado a partir do pedido NAXE LIVE e da referência visual HTML enviada. Código e ilustrações independentes. O antigo projeto de loja em Vite foi preservado em `src/`, com páginas em `src/legacy-pages` para evitar conflito com as rotas do Next.

## Iniciar localmente

Pré-requisitos: Node.js 24, npm, Docker Engine e Compose. Versões testadas: Node 24.19.0, npm 11.9.0, PostgreSQL 17, Redis 7, Next.js 15.5.28.

```bash
cp .env.example .env.live.local  # somente se o arquivo ainda não existir
npm ci
npm run db:generate
docker compose up -d --wait
npm run db:migrate
npm run db:seed
```

Abra dois terminais no diretório do projeto:

```bash
npm run api:dev  # API persistente, porta 4000
npm run dev      # Next.js, porta 3000
```

Acesse a porta 3000 em seu navegador local. Para servir o build: `npm run build` e `npm run start`, mantendo a API ativa. O script `scripts/setup.sh` prepara as dependências e valida o build; não mantém processos da aplicação vivos. No ambiente cloud, use o checkout existente; não é necessário criar um worktree.

`.env.live.local` é ignorado pelo Git e lido pelos comandos da API, geração, migração e seed. O Next lê suas variáveis de deployment no ambiente do processo ou em `.env.local`. As variáveis antigas `VITE_SUPABASE_*` pertencem ao app legado e não são necessárias para os novos leilões.

## Contas demonstrativas

| Papel | E-mail | Senha local padrão |
| --- | --- | --- |
| Comprador A, habilitado | comprador.a@naxe.test | `NaxeDemo2026!` |
| Comprador B, habilitado | comprador.b@naxe.test | `NaxeDemo2026!` |
| Vendedor | vendedor@naxe.test | `NaxeDemo2026!` |
| Administrador | admin@naxe.test | `NaxeDemo2026!` |

São credenciais fictícias de desenvolvimento, criadas apenas com `DEMO_MODE=true` e `ENABLE_DEMO_SEED=true`. Use `DEMO_PASSWORD` própria em homologação privada antes do primeiro seed. Seeds são idempotentes e preservam contas, senhas e leilões existentes. Nunca use senhas ou cartões reais nos testes.

## Primeiro teste de ponta a ponta

1. Entre como vendedor, acesse `/seller`, abra uma transmissão no Studio. Configure um lote com abertura R$ 15, incremento R$ 1 e duração de 10 ou 30 segundos.
2. Abra a mesma `/live/[id]` em uma sessão com Comprador A, outra com Comprador B e uma terceira anônima. A sala é pública e compartilhável.
3. Inicie o lote pelo Studio. A oferece R$ 15 com um clique; B passa a ver R$ 16. B oferece R$ 16; A passa a ver R$ 17. Lances nos últimos 10 segundos estendem o fim para 10 segundos a partir do aceite no servidor.
4. Todos veem o mesmo vencedor. O servidor persiste resultado e pedido sandbox antes de emitir o estado final. O comprador vê o pedido em `/minha-conta/pedidos`; o vendedor em `/seller/pedidos`.
5. Uma conta nova precisa preencher endereço, cenário de pagamento fictício e aceite antes de ofertar. A conclusão do cadastro **não** dispara o lance que abriu o fluxo.
6. Use `/playground` como vendedor/admin para avançar relógio, gerar lances fictícios A/B e finalizar. O laboratório usa o mesmo motor. Os controles não são acessíveis em modo comercial; este release sequer permite iniciar esse modo.

Frete é determinístico por origem, destino e peso, apresentado antes do lance e fixado no registro de oferta. Mudança de cotação exige atualizar a oferta. Não é feita chamada a transportadora. Endereço e cenário de pagamento não podem mudar enquanto o comprador lidera um lote ativo. Produtos e regras não são editáveis durante a disputa.

## O que funciona

- Marketplace responsivo, busca, categorias, agenda, perfis e seguir vendedor; salas sem login.
- Cadastro/login com senha scrypt, sessão opaca HttpOnly no banco, logout, habilitação com endereços distintos e pagamento fictício.
- Lances reais no backend com valores inteiros, bloqueio de linha por lote, idempotência, rejeição de lance vencido/desatualizado, proteção contra vendedor ofertando no próprio lote e extensão de relógio.
- Socket.IO com WebSocket e fallback polling, reconexão e recuperação de snapshots; relógio absoluto do servidor; chat persistido, limites e moderação.
- Encerramento automático, resultado único, estoque, pedido, aprovação/recusa/pendência/estorno fictícios e etapas de entrega simuladas.
- Seller Studio com catálogo/estoque, criação de lives, edição/ordenação/exclusão de lotes não iniciados, início, cancelamento excepcional justificado e encerramento da transmissão; câmera/microfone locais.
- Admin com usuários/papéis, verificação demonstrativa de vendedor, transmissões, eventos, auditoria, moderação e simulação financeira.
- Vídeos ilustrativos locais de 6 segundos e ilustrações originais, claramente demonstrativos; adaptador Cloudflare e cliente WHIP/WHEP para integração futura.

## Organização técnica

- `app/`: Next App Router, layout, tokens visuais e entrada de rotas.
- `live/`: componentes React estritos, TanStack Query, sala, Studio e painéis.
- `server/`: Express modular, autenticação, Socket.IO, motor, catálogo e interfaces `StreamingProvider`, `ShippingProvider`, `PaymentProvider`.
- `prisma/schema.prisma`: modelos relacionais; `prisma/migrations/`: SQL versionado.
- `scripts/migrate.mjs`: aplica migrações transacionalmente, com lock de execução e checksum; recusa alteração de migração já aplicada. Não usar `prisma migrate deploy` em paralelo com este runner.
- `scripts/generate-client.mjs`: geração Prisma com compilador WASM e driver PostgreSQL puro JS. Usa API do `@prisma/internals` fixada no lockfile; não baixa binários nativos nem desativa verificações de integridade/TLS.
- `tests/`: integração real com banco/API e ponta a ponta em navegador.
- `public/products`, `public/demo`: arte e mídia demonstrativa leve, sem dependência de imagens externas.

O schema concentra perfil no usuário, configurações no lote e estoque no produto; cada lote desta versão representa uma unidade. Variantes e consolidação de frete são evoluções futuras. As tabelas definitivas guardam usuários, endereços, referências de pagamento, vendedores, produtos, transmissões, lotes, lances, eventos, resultados, pedidos, tentativas de pagamento, chat e auditoria. Redis trata estado transitório/limites; PostgreSQL é a autoridade definitiva.

## Verificação

Com banco, Redis, API e frontend ativos:

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run test:e2e
```

Playwright usa Chromium instalado em `/usr/bin/chromium` por padrão; ajuste `CHROMIUM_PATH` se necessário. Os cenários móveis usam viewport e recursos de emulação de celular em Chromium, não Safari real. Os testes modificam apenas fixtures sandbox com nomes explícitos e as removem ao concluir; execute em banco de desenvolvimento. Não execute em banco de produção.

`npm run lint:legacy` verifica o app Vite preservado; há 8 erros e 15 avisos anteriores à implementação de live commerce. Eles não foram mascarados nem corrigidos nesta migração. `npm run legacy:dev` e `npm run legacy:build` preservam o fluxo anterior. O novo app possui lint e TypeScript próprios.

Para a tela atual do hPanel, consulte [configuração da Hostinger](docs/HOSTINGER.md).

Veja [relatório de validação](docs/VALIDATION.md) e [publicação e integrações externas](docs/DEPLOYMENT.md).

## Limites desta entrega

Pagamentos, frete, receita e entrega são simulações explícitas. Streaming compartilhado profissional requer credenciais, provisionamento e validação externa e ainda não foi validado. Não foram publicados serviços em um host público. Recuperação de senha, verificação de e-mail/CPF e identidade, antifraude, repasse, PSP real, transportadora real e operação comercial não estão implementados. O site não captura cartão bruto. Direitos legais do consumidor permanecem aplicáveis.
