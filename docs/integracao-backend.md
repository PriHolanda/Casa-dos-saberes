# Integração com AgendamentoCasaDosSaberes

O frontend usa os controllers e schemas existentes em `~/programing/AgendamentoCasaDosSaberes/app`. A comunicação do navegador com o FastAPI é direta, sem proxy no frontend.

## Contratos utilizados

| Operação | Rota | Dados |
| --- | --- | --- |
| Criar conta | `POST /usuarios` | `nome`, `email`, `senha` (8–128 caracteres) |
| Entrar | `POST /usuarios/login` | `email`, `senha`; recebe `access_token` e `expires_in` |
| Perfil | `GET /usuarios/me` | Cabeçalho Bearer; recebe `id`, `nome`, `email` |
| Listar eventos | `GET /eventos/` | Resposta `{ "eventos": [...] }` |
| Eventos públicos | `GET /eventos/aceitos` | Sem autenticação |
| Disponibilidade de espaço | `GET /disponibilidade?data=AAAA-MM-DD&espaco_id=ID` | Janelas reserváveis e limites de duração |
| Cadastrar evento | `POST /eventos/` | JSON ou multipart com `dados` (JSON) e `arquivo` (PDF) |
| Decidir sobre evento | `PATCH /eventos/{id}/status` | Cabeçalho Bearer e `{ "status": "aceito" }` ou `{ "status": "negado" }` |
| Baixar PDF da proposta | `GET /eventos/{id}/proposta` | PDF privado para o papel `administrador` |
| Alterar evento | `PUT /eventos/{id}` | Cabeçalho Bearer e `EventoUpdate` completo |
| Excluir evento | `DELETE /eventos/{id}` | Cabeçalho Bearer; resposta 204, sem corpo |

`EventoCreate`: `titulo` (3–150 caracteres), `descricao` (10–2000), `data_inicio`, `data_fim`, `classificacao_indicativa`, `espaco_id` inteiro de 1 a 5, `responsavel` e `publico_estimado` inteiro ou nulo. As datas enviadas são civis, sem offset, seguindo o banco atual. Datas recebidas com offset são exibidas em America/Fortaleza. O formulário usa o espaço e o período escolhidos na agenda pública. Antes de enviar, consulta de novo a disponibilidade. O FastAPI confirma uma reserva pública como pendente e cadastra como aceito um evento criado com sessão autenticada.

A agenda real usa os sete dias da semana e não carrega `js/admin/dados-exemplo.js`. Os mocks permanecem apenas como fixture dos testes antigos. O cache é atualizado após a API confirmar a gravação. Recarregar a página consulta o banco novamente.

O token de acesso fica no `sessionStorage` da aba, sem persistir a senha ou o refresh token. A expiração ou uma resposta 401 exige novo login. O botão Sair que havia sido acrescentado foi removido para preservar o protótipo. Não há rota de logout no backend.

## Exposições e visitas mediadas

| Operação | Rota |
| --- | --- |
| Listar as salas e exposições no editor | `GET /exposicoes/administracao` |
| Publicar, editar, pausar ou reativar uma exposição | `PUT /exposicoes/{sala_id}` |
| Consultar a vitrine e os detalhes públicos | `GET /exposicoes/` |
| Ler e salvar as perguntas | `GET /visitas/formulario` e `PUT /visitas/formulario` |
| Verificar horários de visita | `GET /visitas/disponibilidade?data=AAAA-MM-DD` |
| Enviar a solicitação revisada | `POST /visitas/` |
| Listar visitas administrativas | `GET /visitas/` com Bearer |
| Aprovar, negar ou cancelar visitas | `PATCH /visitas/{id}/status` com `aprovada`, `negada` ou `cancelada` e papel `administrador` |
| Exportar relatório | `GET /relatorios/agendamentos` com `tipo`, `data_inicio`, `data_fim`, `status` e papel `administrador` |

A listagem administrativa de exposições e as gravações dos editores exigem um token do Keycloak com o papel de realm `administrador`. As alterações de conteúdo e status da exposição são salvas juntas. Os editores oferecem importação explícita quando encontram dados antigos em `localStorage`.

Na visita pública, cada opção de uma hora precisa caber integralmente em uma janela disponível. A confirmação envia o pedido sem token e mostra sucesso quando a API devolve o ID e o status `pendente`. Os campos necessários ao envio (responsável, telefone, e-mail e quantidade) continuam disponíveis mesmo quando faltam na configuração publicada. A quantidade de pessoas com deficiência também fica disponível quando a pergunta de acessibilidade está presente. Respostas sem campo próprio na API seguem com seus rótulos em `observacoes`, respeitando o limite de 1.000 caracteres.

## Autenticação das rotas

Alterar, decidir ou excluir eventos exige `get_current_user_claims`, assim como o perfil. O frontend já envia `Authorization: Bearer <access_token>` diretamente ao backend. Se o backend recusar o token, a sessão local é removida e o navegador volta ao login, sem aplicar a alteração recusada ao cache.

A agenda pública, a consulta de disponibilidade e o envio de solicitações ficam acessíveis sem login. Dashboard e Sugestões de Pauta usam sessão autenticada. O backend exige Bearer para a manutenção de eventos e visitas e o papel `administrador` para exportar relatórios e gravar os editores.

## Regras de reserva e acompanhamento

O cancelamento e a negativa de visitas liberam o horário e preservam o registro. As reservas aceitam listas em `segmentos` e `pautas`. Os campos singulares continuam disponíveis para registros e clientes antigos. O dashboard conta sugestões com origem pública identificada. Eventos antigos sem origem ou evidência de envio pelo formulário permanecem no total de agendamentos.

O FastAPI verifica se o horário é futuro, cabe no funcionamento, respeita a duração e está livre. Eventos duram de duas a três horas. A Área Externa tem seu próprio turno noturno. Visitas duram uma hora e ficam nos turnos diurnos. Os relatórios reais recebem o status selecionado na tela.

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

Permitir `GET`, `POST`, `PUT`, `PATCH` e `DELETE`, além dos cabeçalhos `Authorization` e `Content-Type`. As requisições OPTIONS de preflight são tratadas pelo middleware. O token Bearer continua sendo enviado pelo JavaScript; não é necessário compartilhar cookies do WordPress.

Para outra porta de frontend ou Live Server, inclua a origem exata (por exemplo, `http://127.0.0.1:5500`) e reinicie o backend. Em produção, configure o domínio HTTPS do WordPress. CORS não substitui a autenticação e as permissões da API.
