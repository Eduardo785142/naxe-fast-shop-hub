# Validação — NAXE LIVE MVP sandbox

Validação executada neste ambiente em 21/10/2026. Não houve publicação externa, transação real ou teste de carga.

| Verificação | Resultado |
| --- | --- |
| `bash scripts/setup.sh` | Aprovado: instalação pelo lockfile, geração Prisma WASM, PostgreSQL/Redis, migrações, seed, TypeScript e build |
| Reaplicação de migrações e seed | Aprovada; preservou dados existentes, sem recriar leilões |
| `npm run lint` | Aprovado no novo app, backend, seed e testes |
| `npm run typecheck` | Aprovado em modo estrito |
| `npm run build` | Aprovado; Next.js 15.5.28 |
| `npm run dev` + API | Aprovado após reinstalação; 6 cards, sala conectada e nenhum erro JavaScript no smoke test |
| `npm test` | 11 testes aprovados, 0 falhas, 0 ignorados |
| `npm run test:e2e` | 8 testes aprovados, 0 falhas, em Chromium desktop e emulação móvel |
| `npm run legacy:build` | Aprovado para o app Vite preservado |
| `npm run lint:legacy` | 8 erros e 15 avisos preexistentes; ver README |
| Inspeção visual | Marketplace desktop/móvel e sala móvel capturados em `docs/screenshots/`; sem erro de JavaScript nem overflow horizontal na captura móvel |
| Vídeos locais | Reprodução em navegador aprovada; arquivos ilustrativos de 6 segundos, sem transmissão ao vivo |
| Câmera/microfone | Fluxo do Studio aprovado com dispositivos fictícios do Chromium; hardware físico não testado |
| WebSocket | Transporte WebSocket pelo proxy Next confirmado; fallback polling configurado |

## Cobertura de API e motor (11 testes)

1. Sessões, autorização, bloqueio de origem não autorizada, validação de entrada e privacidade das respostas públicas.
2. Mudança de papel por administrador, auditoria, revogação de sessões e autorização por recurso.
3. Etapas de preparação/envio/entrega sandbox, estorno idempotente concorrente e moderação autorizada.
4. Abertura em R$ 15, primeiro lance de A, R$ 16 de B, próximo mínimo R$ 17, extensão do relógio, um vencedor e um pedido persistido.
5. Lances simultâneos no mesmo valor: apenas um aceito; rejeição de lance abaixo do mínimo.
6. Retry idempotente e rejeição de identificador reaproveitado por outra tentativa.
7. Usuário não habilitado, vendedor no próprio lote, início não autorizado e regras de início.
8. Abertura zero, modalidade livre e encerramento sem lances.
9. Recusa e pendência de pagamento fictício após vitória.
10. Frete aceito persistido no lance/pedido e rejeição de cotação desatualizada.
11. Bloqueio de edição do produto e das regras de um lote iniciado.

As ofertas têm sequência única por lote para representar a ordem de confirmação, sem depender da ordem de timestamps de início de transação. O encerramento concorrente é protegido por lock de linha e unicidade de resultado/pedido.

## Cobertura de navegador (4 cenários em 2 projetos = 8 testes)

- Marketplace, filtro, entrada anônima na sala, largura móvel e reprodução da mídia ilustrativa.
- Quatro sessões independentes: vendedor, comprador A, comprador B e espectador. Ofertas sincronizadas, perda simulada de conexão de A, oferta recebida durante a interrupção, recuperação de snapshot, recarga, resultado comum e pedido do vencedor.
- Cadastro e habilitação completos, com endereço e meio de pagamento fictício; confirmação de que a conclusão não cria lance automaticamente.
- Cadastro de produto, criação de transmissão, teste de câmera/microfone com dispositivos fictícios, resposta explícita de ausência de vídeo compartilhado no modo demo, criação de lote com abertura zero e início pelo Studio.

## Problemas corrigidos durante a validação

- Normalização de barra da rota Socket.IO no proxy Next impedia a conexão; corrigida e validada com WebSocket real.
- O roteador de páginas legado do Vite era detectado pelo Next; páginas preservadas foram movidas para `src/legacy-pages`.
- Geração Prisma dependia de um download nativo bloqueado pela política; substituída pela geração WASM distribuída por npm, mantendo TLS e integridade. Não foi usado `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING`.
- Regras/frete puderam ser reforçados com bloqueios transacionais, cotação aceita por oferta e ordem explícita de confirmação.
- Dados criados pelos testes de navegador passaram a ser removidos, incluindo restauração de estoque dos pedidos fictícios de teste.

## Limites e trabalho externo

Não foram executados Safari/iPhone real, Android físico, Safari desktop ou Firefox. A emulação móvel usa Chromium. Não foram realizados ensaios de carga, auditoria externa de segurança/acessibilidade ou restauração de backup.

Pagamentos, frete, entregas e projeção financeira são demonstrativos. Vídeos de produto são ilustrações animadas locais; a câmera do Studio é prévia local. O adaptador Cloudflare/WHIP/WHEP foi implementado, mas não validado contra uma conta externa. Credenciais, provisionamento de WebRTC e ciclo de vida do fornecedor permanecem necessários para streaming profissional.

Publicação de homologação exige definição do destino e configuração de HTTPS, URL de origem e serviços persistentes. Consulte `DEPLOYMENT.md`. O ambiente cloud preparado e o rascunho de instruções salvos não equivalem a uma implantação pública.

As instruções de instalação (`install_script`) e inicialização (`start_skill`) foram salvas no rascunho do ambiente cloud. A revisão, o salvamento das configurações e a publicação do ambiente são ações do produto e não equivalem à publicação do site em hospedagem externa. A autorização provisória de `binaries.prisma.sh` foi retirada do rascunho, pois a geração WASM não depende desse download. A configuração de rede anterior do Supabase foi preservada para o aplicativo legado.

## Preparação para Hostinger (Node.js 22)

O build `npm run build:hostinger` foi validado em Node.js 22.23.3. O arquivo `scripts/start-hostinger.mjs` foi executado localmente com as variáveis de ambiente de hospedagem, frontend na porta 3100 e API interna em loopback na porta 4000. Confirmados: migrações idempotentes, saúde do banco/Redis pelo rewrite público, conteúdo NAXE LIVE e conexão WebSocket com recuperação do estado da sala. Os 11 testes de API/motor também passaram em Node.js 22. O processo recusou inicialização sem as variáveis obrigatórias, conforme esperado. Isso valida o pacote local; compatibilidade do plano e implantação real na conta Hostinger continuam não verificadas.
