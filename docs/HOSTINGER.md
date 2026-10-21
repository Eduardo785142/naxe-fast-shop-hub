# Publicar o sandbox na Hostinger

Destino informado: `darkslateblue-pelican-597772.hostingersite.com`.

## Tela de revisão do hPanel

Após o código atualizado estar no GitHub, atualize/reimporte a revisão do repositório para que o build use a versão nova.

| Campo | Valor |
| --- | --- |
| Repositório | `Eduardo785142/naxe-fast-shop-hub` |
| Branch | `main` |
| Configuração predefinida | **Next.js** (não Vite) |
| Node.js | **22.x** (build validado em 22.23.3) |
| Diretório raiz | `./` |
| Instalação | `npm ci` com dependências de desenvolvimento disponíveis durante o build |
| Comando de build | `npm run build:hostinger` |
| Saída de build, se solicitada | `.next` |
| Comando de inicialização | `npm run start:hostinger` |
| Arquivo de entrada, se o painel pedir um arquivo em vez de comando | `scripts/start-hostinger.mjs` |

O arquivo de entrada mantém a API em `127.0.0.1:4000` e o frontend na porta pública fornecida pela Hostinger (`PORT`, padrão 3000). A aplicação exige um runtime Node persistente com subprocessos, porta interna de loopback e suporte a WebSocket/long polling. Essa capacidade do plano precisa ser confirmada; não basta suporte a build de frontend estático.

Se a Hostinger não disponibilizar inicialização personalizada/subprocessos, publique somente o frontend com um backend persistente separado, conforme `DEPLOYMENT.md`, ou use um VPS. A compatibilidade do plano ainda não foi verificada na conta.

## Variáveis obrigatórias

Remova da configuração deste novo app as três sugestões `VITE_SUPABASE_*` da versão antiga. Elas não substituem as conexões abaixo.

| Chave | Valor/onde obter |
| --- | --- |
| `APP_ORIGIN` | `https://darkslateblue-pelican-597772.hostingersite.com` |
| `DEMO_MODE` | `true` |
| `STREAMING_PROVIDER` | `demo` |
| `DATABASE_URL` | URL real de PostgreSQL persistente acessível pela hospedagem, com o TLS exigido pelo provedor |
| `REDIS_URL` | URL real de Redis persistente acessível pela hospedagem (`rediss://` quando o provedor exigir TLS) |
| `ENABLE_DEMO_SEED` | `true` para criar catálogo/contas no primeiro início; depois pode ser `false` |
| `DEMO_PASSWORD` | Senha privada com pelo menos 12 caracteres, diferente da senha de exemplo local |

Cadastre os valores secretos diretamente no hPanel, sem enviá-los por chat nem commitar arquivos com valores reais. Nunca use `localhost` para banco/Redis nesta hospedagem gerenciada: os containers do ambiente de desenvolvimento não são transferidos para lá. Não copie `PORT=4000` do exemplo local; a Hostinger fornece a porta pública.

As contas demonstrativas usam os e-mails descritos no README, mas a senha será a `DEMO_PASSWORD` do primeiro seed do banco novo. Seeds preservam senhas existentes. Não deixe a senha pública do README no sandbox online. A inicialização preparada recusa criar contas públicas com essa senha conhecida.

O Node lê as variáveis de processo do hPanel. Os comandos locais aceitam `.env.live.local` opcionalmente, sem exigir esse arquivo em um checkout novo.

## Primeiro início

A entrada executa migrações versionadas, aplica o seed somente quando explicitamente habilitado, inicia a API, verifica `/api/health` (PostgreSQL e Redis) e então inicia o frontend. Falha de qualquer processo encerra o conjunto para que a hospedagem possa reiniciá-lo. O app mantém pagamentos/frete/mídia em demonstração.

Depois da implantação, confirme a página com o texto NAXE LIVE e seis cards de exemplo, `/api/health` com `ok=true`, login, conexão da sala, lances entre duas sessões e pedido sandbox. Uma página padrão da Hostinger ou uma resposta HTTP 200 isolada não comprovam publicação da aplicação correta.

## Estado

A preparação local e o envio do código são etapas separadas da implantação. Sem conexão oficial às ferramentas Hostinger e sem URLs de PostgreSQL/Redis configuradas no destino, não há como confirmar publicação externa ou criar uma URL funcional apenas alterando o GitHub.
