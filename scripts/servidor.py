"""Servidor de desenvolvimento com proxy de mesma origem para o FastAPI."""

import errno
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

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
        print('Se a API usa outra porta, ajuste API_URL. Encerre servidores antigos do frontend que ocupem a porta 8000.', flush=True)
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
        if urlsplit(self.path).path == '/favicon.ico':
            self.path = '/assets/favicon.svg'
        return super().send_head()

    def proxy(self):
        caminho = self.path.removeprefix('/api')
        rota = urlsplit(caminho).path
        permitido = rota in ('/usuarios', '/usuarios/login', '/usuarios/me', '/eventos/') or (
            rota.startswith('/eventos/') and rota.removeprefix('/eventos/').isdigit()
        )
        if not permitido:
            self.send_error(404)
            return
        try:
            tamanho = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self.send_error(400)
            return
        if tamanho < 0 or tamanho > 1024 * 1024:
            self.send_error(413)
            return
        dados = self.rfile.read(tamanho) if tamanho else None
        headers = {nome: self.headers[nome] for nome in ('Content-Type', 'Authorization') if nome in self.headers}
        pedido = Request(API_URL + caminho, data=dados, headers=headers, method=self.command)
        try:
            resposta = urlopen(pedido, timeout=20)
        except HTTPError as erro:
            resposta = erro
        except (URLError, TimeoutError, OSError):
            corpo = json.dumps({'detail': 'Backend indisponível. Inicie o FastAPI e o Keycloak e confira API_URL.'}).encode()
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)
            return
        with resposta:
            corpo = resposta.read()
            self.send_response(resposta.code)
            self.send_header('Content-Type', resposta.headers.get('Content-Type', 'application/json'))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.proxy()
        else:
            self.send_error(405)

    do_PUT = do_POST
    do_DELETE = do_POST


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
