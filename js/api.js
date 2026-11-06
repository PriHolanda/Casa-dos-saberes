const csaApi = (() => {
  const chave = 'csa-sessao';
  function sessao() {
    try { return JSON.parse(sessionStorage.getItem(chave)); } catch { return null; }
  }
  function sair() { sessionStorage.removeItem(chave); location.replace('/pages/login.html'); }
  async function requisitar(caminho, { metodo = 'GET', dados, autenticado = true } = {}) {
    const atual = sessao();
    if (autenticado && (!atual || atual.expira <= Date.now())) { sair(); throw new Error('Sua sessão expirou. Entre novamente.'); }
    let resposta;
    try {
      resposta = await fetch(`/api${caminho}`, {
        method: metodo,
        headers: { ...(dados ? { 'Content-Type': 'application/json' } : {}), ...(autenticado ? { Authorization: `Bearer ${atual.token}` } : {}) },
        ...(dados ? { body: JSON.stringify(dados) } : {})
      });
    } catch { throw new Error('Não foi possível conectar ao servidor. Verifique se os serviços estão em execução.'); }
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
  return { requisitar, entrar, sair, sessao };
})();
