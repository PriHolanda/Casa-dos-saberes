#!/usr/bin/env bash
set -euo pipefail

PROJETO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PORTA="${PORT:-3001}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'AJUDA'
Uso: ./scripts/iniciar-reservas.sh

Inicia uma prévia estática do formulário de reserva, sem backend ou login.
Abra http://127.0.0.1:3001/pages/reservas.html no navegador.

Para escolher outra porta:
  PORT=3002 ./scripts/iniciar-reservas.sh

Requisito: Python 3. Encerre com Ctrl+C.
AJUDA
  exit 0
fi

if (( $# > 0 )); then
  echo "Argumento inválido. Use --help para ver as instruções." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Erro: instale o Python 3 para iniciar a prévia." >&2
  exit 1
fi

if [[ ! "$PORTA" =~ ^[0-9]{1,5}$ ]] || (( 10#$PORTA < 1 || 10#$PORTA > 65535 )); then
  echo "Erro: PORT deve ser um número entre 1 e 65535." >&2
  exit 1
fi

echo "Formulário de reserva: http://127.0.0.1:$PORTA/pages/reservas.html"
echo "Encerre com Ctrl+C."
exec python3 -m http.server "$PORTA" --bind 127.0.0.1 --directory "$PROJETO_DIR"
