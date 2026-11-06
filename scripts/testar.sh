#!/usr/bin/env bash
set -euo pipefail

PROJETO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Erro: instale o Node.js para executar os testes." >&2
  exit 1
fi

cd "$PROJETO_DIR"
exec node --test tests/*.test.cjs
