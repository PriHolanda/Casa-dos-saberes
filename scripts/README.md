# Iniciar o sistema integrado

Requisitos: Python 3 para o servidor do frontend; Node.js para os testes. O frontend não exige instalação de pacotes.

## 1. Iniciar Keycloak e backend

No repositório do backend, prepare o `.env` e as dependências conforme sua documentação. Inicie o Keycloak:

```bash
cd ~/programing/AgendamentoCasaDosSaberes
./scripts/start-keycloak.sh
```

Esse comando também inicia o banco do Keycloak; não é necessário executar `start-db.sh` separadamente. Aguarde a inicialização do Keycloak.

No mesmo terminal, inicie a API e deixe-a em execução:

```bash
cd ~/programing/AgendamentoCasaDosSaberes
./scripts/start-back.sh
```

A API usa a porta **8000** e o Keycloak usa **8080**. Se a API já estiver em outra porta, configure `API_URL` ao iniciar o frontend.

## 2. Iniciar o frontend

```bash
cd ~/programing/Casa-dos-saberes
./scripts/iniciar.sh
```

Abra **http://127.0.0.1:3000/**. A entrada leva ao login, com opção de criar conta. Após criar a conta, entre com e-mail e senha para acessar a agenda.

Use um segundo terminal para o frontend. Na inicialização, o script verifica se o endereço da API contém as rotas esperadas e avisa quando ela não está disponível. A verificação não autentica no Keycloak. Para consultar os comandos novamente, execute `./scripts/iniciar.sh --help`.

O navegador chama o backend diretamente, sem proxy `/api`. O backend precisa permitir `http://127.0.0.1:3000` e `http://localhost:3000` em seu CORS. `API_URL` configura o endereço que o JavaScript usará; `PORT` configura a porta do frontend.

Para personalizar portas:

```bash
API_URL=http://127.0.0.1:8001 PORT=3001 ./scripts/iniciar.sh
```

Ao usar `PORT=3001`, adicione `http://127.0.0.1:3001` à variável `CORS_ORIGINS` do backend e reinicie a API. Para Live Server, faça o mesmo com a origem correspondente e ajuste o endereço da API em `js/config.js` se necessário.

Use `Ctrl+C` para encerrar cada servidor. A vitrine de componentes continua em `/pages/componentes.html`.

## Testes

```bash
./scripts/testar.sh
```

Os testes verificam calendário, adaptação dos schemas, chamadas HTTP, erros e sessão expirada. Não precisam de backend ativo.

Consulte [a integração e os ajustes necessários no backend](../docs/integracao-backend.md).
