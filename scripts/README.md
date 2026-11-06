# Scripts do projeto

Execute os comandos a partir da raiz do repositório. Os scripts também funcionam a partir de outra pasta, usando o caminho completo.

## Iniciar o sistema

Requer Python 3. Não precisa instalar dependências.

```bash
./scripts/iniciar.sh
```

Abra http://127.0.0.1:8000/ no navegador: a página inicial encaminha para a Agenda Administrativa. Para encerrar o servidor, pressione `Ctrl+C` no terminal.

Páginas disponíveis:

- `/pages/agenda.html`: sistema com agenda e painéis laterais de eventos.
- `/pages/componentes.html`: vitrine de componentes para desenvolvimento.

Para escolher outra porta:

```bash
PORT=8080 ./scripts/iniciar.sh
```

O servidor atende apenas no computador local. O sistema utiliza os dados de exemplo do repositório.

Se a porta estiver em uso, encerre a execução anterior com `Ctrl+C` ou use `PORT=8080 ./scripts/iniciar.sh`.

## Executar os testes

Requer Node.js.

```bash
./scripts/testar.sh
```
