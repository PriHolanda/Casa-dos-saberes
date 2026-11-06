"""Servidor local de desenvolvimento, sem dependências externas."""

import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys


def main():
    porta = int(sys.argv[1])
    raiz = Path(__file__).resolve().parent.parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(raiz))
    try:
        servidor = ThreadingHTTPServer(("127.0.0.1", porta), handler)
    except OSError as erro:
        if erro.errno == errno.EADDRINUSE:
            print(
                f"Erro: a porta {porta} já está em uso. Encerre o servidor anterior "
                "ou escolha outra porta: PORT=8080 ./scripts/iniciar.sh",
                file=sys.stderr,
            )
        else:
            print(f"Erro ao iniciar o servidor: {erro}", file=sys.stderr)
        return 1

    with servidor:
        print(f"Sistema: http://127.0.0.1:{porta}/", flush=True)
        print(f"Agenda: http://127.0.0.1:{porta}/pages/agenda.html", flush=True)
        print(f"Componentes: http://127.0.0.1:{porta}/pages/componentes.html", flush=True)
        print("Para encerrar, pressione Ctrl+C.", flush=True)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
