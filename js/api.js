const csaApi = (() => {
  const baseUrl = (globalThis.csaConfig?.apiUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const chave = 'csa-sessao';
  function sessao() {
    try { return JSON.parse(sessionStorage.getItem(chave)); } catch { return null; }
  }
  function sair() {
    sessionStorage.removeItem(chave);
    const paginaLogin = '/pages/login.html';
    if (location.pathname === paginaLogin) {
      location.replace(paginaLogin);
      return;
    }
    const destino = `${location.pathname}${location.search}${location.hash}`;
    location.replace(`${paginaLogin}?next=${encodeURIComponent(destino)}`);
  }
  async function requisitar(caminho, { metodo = 'GET', dados, autenticado = true, formato = 'json' } = {}) {
    const atual = sessao();
    if (autenticado && (!atual || atual.expira <= Date.now())) { sair(); throw new Error('Sua sessão expirou. Entre novamente.'); }
    const multipart = typeof FormData !== 'undefined' && dados instanceof FormData;
    let resposta;
    try {
      resposta = await fetch(`${baseUrl}${caminho}`, {
        method: metodo,
        headers: { ...(dados && !multipart ? { 'Content-Type': 'application/json' } : {}), ...(autenticado ? { Authorization: `Bearer ${atual.token}` } : {}) },
        ...(dados ? { body: multipart ? dados : JSON.stringify(dados) } : {})
      });
    } catch { throw new Error('Não foi possível conectar ao servidor. Verifique se os serviços estão em execução.'); }
    if (resposta.ok && formato === 'pdf') {
      const arquivo = await resposta.blob();
      if (arquivo.type !== 'application/pdf' || !arquivo.size) throw new Error('O servidor não retornou um relatório PDF.');
      return arquivo;
    }
    const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);
    if (!resposta.ok) {
      if (resposta.status === 401 && autenticado) sair();
      const detalhe = corpo?.detail;
      throw new Error(Array.isArray(detalhe) ? detalhe.map(item => `${item.loc?.slice(1).join('.')}: ${item.msg}`).join('; ') : typeof detalhe === 'string' ? detalhe : `Não foi possível concluir a operação (HTTP ${resposta.status}).`);
    }
    return corpo;
  }
  async function entrar(email, senha) {
    const tokens = await requisitar('/usuarios/login', { metodo: 'POST', dados: { email, senha }, autenticado: false });
    sessionStorage.setItem(chave, JSON.stringify({ token: tokens.access_token, expira: Date.now() + tokens.expires_in * 1000 }));
    return requisitar('/usuarios/me');
  }
  async function exportarAgendamentos(tipo, data_inicio, data_fim) {
    const parametros = new URLSearchParams({ tipo, data_inicio, data_fim });
    const arquivo = await requisitar(`/relatorios/agendamentos?${parametros}`, { formato: 'pdf' });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${tipo}-${data_inicio}-a-${data_fim}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { requisitar, entrar, sair, sessao, exportarAgendamentos };
})();
