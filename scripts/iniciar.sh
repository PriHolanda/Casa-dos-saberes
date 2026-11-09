#!/usr/bin/env bash
set -euo pipefail

PROJETO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PORTA="${PORT:-3000}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'AJUDA'
Uso: ./scripts/iniciar.sh

Antes, no repositório AgendamentoCasaDosSaberes, execute:
  ./scripts/start-keycloak.sh
  ./scripts/start-back.sh

Este script inicia o frontend em http://127.0.0.1:3000/.
O navegador chama diretamente a API em http://127.0.0.1:8000.
O Keycloak usa a porta 8080. O backend precisa permitir a origem do frontend via CORS.

API_URL define o endereço que o navegador usa para chamar o backend.
Para usar outras portas (adicione a nova origem ao CORS_ORIGINS do backend):
  API_URL=http://127.0.0.1:8001 PORT=3001 ./scripts/iniciar.sh

Encerre o frontend com Ctrl+C.
AJUDA
  exit 0
fi

if (( $# > 0 )); then
  echo "Argumento inválido. Use --help para ver as instruções." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Erro: instale o Python 3 para iniciar o servidor local." >&2
  exit 1
fi

if [[ ! "$PORTA" =~ ^[0-9]{1,5}$ ]] || (( 10#$PORTA < 1 || 10#$PORTA > 65535 )); then
  echo "Erro: PORT deve ser um número entre 1 e 65535." >&2
  exit 1
fi

exec python3 "$PROJETO_DIR/scripts/servidor.py" "$PORTA"
