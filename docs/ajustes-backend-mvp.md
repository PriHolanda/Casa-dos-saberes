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

## O que falta

O backend consultado já protege PUT/DELETE e valida o intervalo e a sobreposição dos eventos. Faltam os campos `status` e `celular` no schema, modelo e banco:

- `status`: `pendente` ou `aceito`, com padrão `pendente`. Necessário para os filtros, badges e aprovação persistente.
- `celular`: texto opcional, para o campo já existente nos detalhes. O formulário original não coleta celular; se não houver dado vindo da API, aparece “Não informado”.

Enquanto `status` não estiver disponível, os eventos são exibidos como pendentes por compatibilidade com o MVP. Aprovar mostra uma mensagem de recurso indisponível, sem simular sucesso. Criação e recusa/exclusão continuam utilizando as rotas atuais.

O catálogo ainda não possui rota própria: confirmar os IDs 1 = Auditório, 2 = Quintal, 3 = Salas Expositivas e 4 = Varanda. O bloqueio de sobreposição atual vale para a agenda toda, inclusive espaços diferentes; se o cliente permitir simultaneidade entre espaços, essa regra precisa ser ajustada no serviço do backend.

## Script para aplicar por conta própria

O arquivo `scripts/ajustar-backend-mvp.py` está neste repositório do frontend. As alterações não foram aplicadas ao seu backend; somente a prévia foi conferida. Primeiro confira a prévia:

```bash
cd ~/programing/Casa-dos-saberes
python3 scripts/ajustar-backend-mvp.py ~/programing/AgendamentoCasaDosSaberes
```

Encerre a API com `Ctrl+C` e aplique:

```bash
python3 scripts/ajustar-backend-mvp.py ~/programing/AgendamentoCasaDosSaberes --aplicar
```

O script preserva o restante dos arquivos, cria um backup ao lado do repositório do backend e adiciona as colunas ao SQLite existente sem apagar eventos. Se o banco ainda não existir, o modelo atualizado cria as colunas no próximo início da API. Eventos antigos recebem `pendente`; não presume aprovação. O script pode ser repetido sem duplicar os campos. Se encontrar definições incompatíveis, pede revisão manual.

Depois reinicie `./scripts/start-back.sh` no backend e recarregue a agenda. GET e POST permanecem públicos; PUT e DELETE continuam usando a proteção já implementada. Nenhuma nova rota é exigida.
