# Ajuste do backend para o protótipo

A agenda mantém os campos, controles e painéis anteriores. As únicas alterações visuais autorizadas são domingo na semana e “Imprimir agenda”. Login e cadastro de conta continuam como telas de entrada.

## Operações e confirmação

- Abrir o formulário, preencher campos e cancelar não enviam alterações à API.
- **Confirmar** no cadastro valida os campos e abre um pop-up no navegador. Somente confirmar nesse pop-up envia `POST /eventos/`. Cancelar mantém o formulário preenchido e não chama a API.
- **Aprovar** pede confirmação no navegador e envia o evento completo por `PUT /eventos/{id}`, com `status: "aceito"`.
- **Negar** pede confirmação no navegador e envia `DELETE /eventos/{id}`, conforme o comportamento anterior do protótipo. Não há histórico de recusas nesse MVP.
- Nos detalhes, **Alterar evento** abre o formulário preenchido; **Salvar alterações** pede confirmação e envia `PUT /eventos/{id}`. **Deletar evento** pede confirmação e envia `DELETE /eventos/{id}`.
- A agenda só atualiza o cache depois do sucesso da API. Erros são exibidos no painel original.

O pop-up é inteiramente do frontend e não exige nenhuma mudança ou rota de confirmação no backend. O script abaixo trata apenas de campos de dados, não da confirmação antes de enviar a requisição.

Os detalhes do evento oferecem ações para alterar e deletar eventos já criados.

## Estado da integração

O frontend já usa a API real para login, cadastro, listagem, criação, edição, aprovação e exclusão. O backend atual define `status` (`pendente` ou `aceito`) e `celular` nos schemas e no modelo. As rotas existentes bastam; o navegador chama o FastAPI diretamente.

O backend do projeto usa PostgreSQL. Se a tabela `eventos` já existia antes de `status` e `celular` entrarem no modelo, é necessário adicionar essas colunas ao banco com uma migração PostgreSQL, preservando os registros existentes e atribuindo `pendente` aos eventos antigos. `Base.metadata.create_all()` não atualiza tabelas já criadas. Faça a migração no repositório do backend, seguindo o procedimento de backup e manutenção adotado pelo projeto.

O script `scripts/ajustar-backend-mvp.py` é uma ferramenta antiga para um banco SQLite local. Não o use contra o backend atual, que usa PostgreSQL.

O catálogo ainda não possui rota própria: os IDs usados pelo frontend são 1 = Auditório, 2 = Quintal, 3 = Salas Expositivas e 4 = Varanda. O backend precisa permitir a origem do frontend em CORS; veja [as instruções de integração](integracao-backend.md).
