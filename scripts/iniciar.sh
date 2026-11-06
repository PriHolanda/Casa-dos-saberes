#!/usr/bin/env bash
set -euo pipefail

PROJETO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PORTA="${PORT:-8000}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Erro: instale o Python 3 para iniciar o servidor local." >&2
  exit 1
fi

if [[ ! "$PORTA" =~ ^[0-9]{1,5}$ ]] || (( 10#$PORTA < 1 || 10#$PORTA > 65535 )); then
  echo "Erro: PORT deve ser um número entre 1 e 65535." >&2
  exit 1
fi

exec python3 "$PROJETO_DIR/scripts/servidor.py" "$PORTA"
