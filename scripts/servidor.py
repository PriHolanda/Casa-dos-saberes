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

ROTAS_NUCLEO = (
    ('post', '/usuarios/login'),
    ('get', '/usuarios/me'),
    ('get', '/eventos/'),
)
ROTAS_VISITAS = (
    ('get', '/exposicoes/'),
    ('get', '/exposicoes/administracao'),
    ('put', '/exposicoes/{sala_id}'),
    ('get', '/visitas/formulario'),
    ('put', '/visitas/formulario'),
    ('get', '/visitas/disponibilidade'),
    ('post', '/visitas/'),
)


def operacoes_ausentes(rotas, esperadas):
    return [
        f'{metodo.upper()} {caminho}'
        for metodo, caminho in esperadas
        if not isinstance(rotas.get(caminho), dict) or metodo not in rotas[caminho]
    ]


def verificar_backend():
    try:
        with urlopen(API_URL + '/openapi.json', timeout=3) as resposta:
            contrato = json.load(resposta)
        rotas = contrato.get('paths')
        if not isinstance(rotas, dict) or operacoes_ausentes(rotas, ROTAS_NUCLEO):
            raise ValueError('Rotas esperadas ausentes')
    except (URLError, TimeoutError, OSError, ValueError, AttributeError):
        print('API esperada não encontrada nesse endereço. O frontend será iniciado mesmo assim.', flush=True)
        print('No backend, execute ./scripts/start-keycloak.sh e depois ./scripts/start-back.sh.', flush=True)
        print('Se a API usa outra porta, ajuste API_URL. Confira também se a API esperada está ativa nessa porta.', flush=True)
        return

    faltantes = operacoes_ausentes(rotas, ROTAS_VISITAS)
    if faltantes:
        print('API encontrada, mas faltam operações para exposições e visitas mediadas.', flush=True)
        print('Operações ausentes — ' + ', '.join(faltantes), flush=True)
        print('Atualize e reinicie o backend AgendamentoCasaDosSaberes.', flush=True)
        return

    print('API encontrada com as rotas de agenda, exposições e visitas mediadas.', flush=True)
    print('Para entrar ou criar conta, mantenha também o Keycloak em execução.', flush=True)


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
