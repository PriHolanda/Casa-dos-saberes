#!/usr/bin/env python3
"""Prepara status/celular no backend. Sem --aplicar, apenas mostra o diff."""
import argparse
from datetime import datetime
import difflib
from pathlib import Path
import sqlite3


def preparar(raiz):
    alteracoes = []
    especificacoes = (
        ('app/schemas/evento.py',
         '    publico_estimado: int | None = None\n',
         '    status: Literal["pendente", "aceito"] = "pendente"\n'
         '    celular: str | None = Field(default=None, max_length=30)\n'),
        ('app/models/evento.py',
         '    publico_estimado: Mapped[int | None] = mapped_column(Integer)\n',
         '    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente", server_default="pendente")\n'
         '    celular: Mapped[str | None] = mapped_column(String(30))\n'),
    )
    for nome, ancora, adicao in especificacoes:
        caminho = raiz / nome
        antes = caminho.read_text()
        if adicao in antes:
            continue
        if any(linha.lstrip().startswith(('status:', 'celular:')) for linha in antes.splitlines()):
            raise ValueError(f'{nome} já tem status ou celular com outra definição. Revise manualmente; nenhum arquivo foi alterado.')
        if antes.count(ancora) != 1:
            raise ValueError(f'Estrutura inesperada em {nome}. Revise manualmente; nenhum arquivo foi alterado.')
        depois = antes.replace(ancora, ancora + adicao)
        compile(depois, nome, 'exec')
        alteracoes.append((caminho, antes, depois))
    return alteracoes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('backend', nargs='?', default=str(Path.home() / 'programing/AgendamentoCasaDosSaberes'))
    parser.add_argument('--aplicar', action='store_true', help='Aplicar após encerrar a API; faz backup dos arquivos e do SQLite.')
    args = parser.parse_args()
    raiz = Path(args.backend).expanduser().resolve()
    alteracoes = preparar(raiz)
    banco = raiz / 'storage/agendamento.db'
    colunas = None
    if banco.exists():
        with sqlite3.connect(banco.as_uri() + '?mode=ro', uri=True) as conexao:
            colunas = {linha[1] for linha in conexao.execute('PRAGMA table_info(eventos)')}
        if not colunas:
            raise ValueError('Banco existente sem tabela eventos. Nenhuma alteração aplicada; verifique a estrutura.')
    for caminho, antes, depois in alteracoes:
        nome = str(caminho.relative_to(raiz))
        print(''.join(difflib.unified_diff(antes.splitlines(True), depois.splitlines(True), fromfile=nome, tofile=nome)), end='')
    faltantes = {'status', 'celular'} - colunas if colunas is not None else set()
    if faltantes:
        print('Migração SQLite necessária:', ', '.join(sorted(faltantes)))
    if not args.aplicar:
        print('\nPrévia somente. Encerre a API e repita com --aplicar para modificar o backend.')
        return
    if not alteracoes and not faltantes:
        print('Backend já atualizado. Nenhuma alteração necessária.')
        return
    backup = raiz.parent / f'{raiz.name}-backup-mvp-{datetime.now():%Y%m%d-%H%M%S-%f}'
    backup.mkdir()
    for caminho, antes, _ in alteracoes:
        destino = backup / caminho.relative_to(raiz)
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(antes)
    # A migração é aditiva: não remove nem recria eventos existentes.
    if banco.exists():
        with sqlite3.connect(banco.as_uri() + '?mode=rw', uri=True) as conexao:
            with sqlite3.connect(backup / 'agendamento.db') as copia:
                conexao.backup(copia)
            conexao.execute('BEGIN IMMEDIATE')
            if 'status' in faltantes:
                conexao.execute("ALTER TABLE eventos ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pendente'")
            if 'celular' in faltantes:
                conexao.execute('ALTER TABLE eventos ADD COLUMN celular VARCHAR(30)')
    for caminho, _, depois in alteracoes:
        caminho.write_text(depois)
    print(f'Aplicado. Backup: {backup}')
    print('Reinicie a API. Eventos antigos passam a pendente; revise-os antes de aprovar.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, sqlite3.Error) as erro:
        raise SystemExit(f'Erro: {erro}')
