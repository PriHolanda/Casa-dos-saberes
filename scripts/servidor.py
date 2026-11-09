"""Servidor estático de desenvolvimento com configuração da API para o navegador."""

import errno
import io
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import urlopen

API_URL = os.environ.get('API_URL', 'http://127.0.0.1:8000').rstrip('/')


def verificar_backend():
    try:
        with urlopen(API_URL + '/openapi.json', timeout=3) as resposta:
            contrato = json.load(resposta)
        rotas = contrato.get('paths', {})
        if not all(rota in rotas for rota in ('/usuarios/login', '/usuarios/me', '/eventos/')):
            raise ValueError('Rotas esperadas ausentes')
    except (URLError, TimeoutError, OSError, ValueError, AttributeError):
        print('API não encontrada nesse endereço. O frontend será iniciado, mas o login e os eventos dependem dela.', flush=True)
        print('No backend, execute ./scripts/start-keycloak.sh e depois ./scripts/start-back.sh.', flush=True)
        print('Se a API usa outra porta, ajuste API_URL. Confira também se a API esperada está ativa nessa porta.', flush=True)
    else:
        print('API encontrada. Para entrar ou criar conta, mantenha também o Keycloak em execução.', flush=True)


class Handler(SimpleHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            # O navegador pode cancelar uma requisição ao navegar ou recarregar.
            self.close_connection = True

    def send_head(self):
        caminho = urlsplit(self.path).path
        if caminho == '/js/config.js':
            config = json.dumps({'apiUrl': API_URL})
            corpo = f'globalThis.csaConfig = {{...{config}, ...globalThis.csaConfig}};\n'.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(corpo)))
            self.end_headers()
            return io.BytesIO(corpo)
        if caminho == '/favicon.ico':
            self.path = '/assets/favicon.svg'
        return super().send_head()


def main():
    porta = int(sys.argv[1])
    raiz = Path(__file__).resolve().parent.parent
    handler = partial(Handler, directory=str(raiz))
    try:
        servidor = ThreadingHTTPServer(('127.0.0.1', porta), handler)
    except OSError as erro:
        if erro.errno == errno.EADDRINUSE:
            print(f'Erro: a porta {porta} já está em uso. Encerre o servidor anterior ou use PORT=3001 ./scripts/iniciar.sh', file=sys.stderr)
        else:
            print(f'Erro ao iniciar o servidor: {erro}', file=sys.stderr)
        return 1
    with servidor:
        print(f'Backend: {API_URL}', flush=True)
        verificar_backend()
        print(f'Sistema: http://127.0.0.1:{porta}/', flush=True)
        print('Para encerrar, pressione Ctrl+C.', flush=True)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            print('\nServidor encerrado.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
