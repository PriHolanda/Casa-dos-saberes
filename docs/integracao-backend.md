# Integração com AgendamentoCasaDosSaberes

O frontend usa os controllers e schemas existentes em `~/programing/AgendamentoCasaDosSaberes/app`. Nenhum arquivo do backend foi alterado.

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

`PUT` e `DELETE /eventos/{id}` exigem `get_current_user_claims`, assim como o perfil. O frontend já envia `Authorization: Bearer <access_token>` e o proxy preserva esse cabeçalho e as respostas 401. Se o backend recusar o token, a sessão local é removida e o navegador volta ao login, sem aplicar a alteração recusada ao cache.

Listagem e criação de eventos continuam públicas na API, conforme o fluxo previsto para acesso futuro sem login. Esta interface continua exigindo login para acessar a agenda e realizar suas operações. A proteção atual de edição e exclusão exige um token válido, sem distinção de papel ou proprietário.

## Protótipo e ajustes do MVP

Foram restaurados o cabeçalho, a barra de controle, os filtros, as legendas e os painéis originais. Permanecem somente domingo e “Imprimir agenda” como mudanças visuais na agenda. As operações são enviadas após Confirmar no formulário ou aceitar a confirmação de Aprovar/Negar.

Veja [os ajustes do backend e o script de aplicação](ajustes-backend-mvp.md). O backend já valida datas e sobreposição; falta persistir `status` para aprovação e `celular` para os detalhes. Sem status retornado pela API, os eventos aparecem como pendentes e a aprovação fica indisponível com mensagem no painel. Não há confirmação fictícia de gravação.

## Execução e implantação

O servidor Python deste repositório é para desenvolvimento local: frontend em 3000, API em 8000 e Keycloak em 8080. `API_URL` configura o destino do proxy e `PORT` a porta do frontend. Ele encaminha apenas as rotas utilizadas, preserva códigos HTTP e não registra o corpo nem o cabeçalho de autenticação.

Em produção, servir os arquivos estáticos e encaminhar `/api` ao FastAPI por um proxy de produção, com HTTPS e a autorização implementada no backend. Caso o navegador passe a chamar a API diretamente em outra origem, configurar `CORSMiddleware` com a origem do frontend explicitamente permitida.
