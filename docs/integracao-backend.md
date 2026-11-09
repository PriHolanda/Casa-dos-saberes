# Integração com AgendamentoCasaDosSaberes

O frontend usa os controllers e schemas existentes em `~/programing/AgendamentoCasaDosSaberes/app`. A comunicação do navegador com o FastAPI é direta, sem proxy no frontend.

## Contratos utilizados

| Operação | Rota | Dados |
| --- | --- | --- |
| Criar conta | `POST /usuarios` | `nome`, `email`, `senha` (8–128 caracteres) |
| Entrar | `POST /usuarios/login` | `email`, `senha`; recebe `access_token` e `expires_in` |
| Perfil | `GET /usuarios/me` | Cabeçalho Bearer; recebe `id`, `nome`, `email` |
| Listar eventos | `GET /eventos/` | Resposta `{ "eventos": [...] }` |
| Cadastrar evento | `POST /eventos/` | `EventoCreate` |
| Alterar evento | `PUT /eventos/{id}` | Cabeçalho Bearer e `EventoCreate` completo |
| Excluir evento | `DELETE /eventos/{id}` | Cabeçalho Bearer; resposta 204, sem corpo |

`EventoCreate`: `titulo` (3–150 caracteres), `descricao` (10–2000), `data_inicio`, `data_fim`, `classificacao_indicativa`, `espaco_id` inteiro ou nulo, `responsavel` e `publico_estimado` inteiro ou nulo. As datas enviadas são civis, sem offset, seguindo o banco atual. Datas recebidas com offset são exibidas em America/Fortaleza. O formulário original mantém a data do dia/turno escolhido na grade e os horários no mesmo dia.

A agenda real usa os sete dias da semana e não carrega `dados-exemplo.js`. Os mocks permanecem apenas como fixture dos testes antigos. O cache é atualizado após a API confirmar a gravação. Recarregar a página consulta o banco novamente.

O token de acesso fica no `sessionStorage` da aba, sem persistir a senha ou o refresh token. A expiração ou uma resposta 401 exige novo login. O botão Sair que havia sido acrescentado foi removido para preservar o protótipo. Não há rota de logout no backend.

## Autenticação das rotas

`PUT` e `DELETE /eventos/{id}` exigem `get_current_user_claims`, assim como o perfil. O frontend já envia `Authorization: Bearer <access_token>` diretamente ao backend. Se o backend recusar o token, a sessão local é removida e o navegador volta ao login, sem aplicar a alteração recusada ao cache.

Listagem e criação de eventos continuam públicas na API, conforme o fluxo previsto para acesso futuro sem login. Esta interface continua exigindo login para acessar a agenda e realizar suas operações. A proteção atual de edição e exclusão exige um token válido, sem distinção de papel ou proprietário.

## Protótipo e ajustes do MVP

Foram restaurados o cabeçalho, a barra de controle, os filtros, as legendas e os painéis originais. Permanecem somente domingo e “Imprimir agenda” como mudanças visuais na agenda. As operações são enviadas após Confirmar no formulário ou aceitar a confirmação de Aprovar/Negar.

Veja [o estado dos ajustes do backend](ajustes-backend-mvp.md). O backend atual já inclui `status` e `celular` nos schemas e no modelo. O frontend envia e lê esses campos; se uma base de dados existente ainda não tiver as colunas, o backend precisa receber uma migração PostgreSQL antes de iniciar a agenda. `create_all` cria tabelas novas, mas não adiciona colunas a uma tabela existente. Não há confirmação fictícia de gravação.

## Execução e implantação

O servidor Python deste repositório serve apenas os arquivos do frontend e a configuração da API. No ambiente local, o frontend usa a porta 3000, o FastAPI a 8000 e o Keycloak a 8080. O JavaScript chama `http://127.0.0.1:8000` diretamente por padrão. Não há encaminhamento `/api`.

### Endereço da API

- Com `./scripts/iniciar.sh`, `API_URL` define o endereço público da API entregue ao navegador por `/js/config.js`. `PORT` define a porta do frontend.
- Com Live Server ou hospedagem estática, ajuste `apiUrl` em `js/config.js`.
- No futuro plugin WordPress, defina `globalThis.csaConfig = { apiUrl: 'https://api.seusite.com.br' }` antes de carregar `config.js` e `api.js`. Uma configuração já fornecida é preservada.

Não coloque senhas ou segredos nessa configuração: ela é pública. `127.0.0.1` é válido apenas no desenvolvimento na própria máquina; na produção use um endereço HTTPS acessível aos visitantes.

### CORS no backend

O FastAPI deve usar `CORSMiddleware`, com as origens permitidas em `settings.cors_origins`, configuráveis por `CORS_ORIGINS` (lista separada por vírgulas no ambiente ou no `.env` do backend). O padrão local é:

```dotenv
CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

Permitir `GET`, `POST`, `PUT` e `DELETE`, além dos cabeçalhos `Authorization` e `Content-Type`. As requisições OPTIONS de preflight são tratadas pelo middleware. O token Bearer continua sendo enviado pelo JavaScript; não é necessário compartilhar cookies do WordPress.

Para outra porta de frontend ou Live Server, inclua a origem exata (por exemplo, `http://127.0.0.1:5500`) e reinicie o backend. Em produção, configure o domínio HTTPS do WordPress. CORS não substitui a autenticação e as permissões da API.
