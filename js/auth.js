(() => {
  let cadastro = false;
  const form = document.getElementById('csa-auth-form');
  const mensagem = document.getElementById('csa-auth-mensagem');
  const enviar = document.getElementById('csa-auth-enviar');
  const alternar = document.getElementById('csa-auth-alternar');
  function modo(criar) {
    cadastro = criar;
    document.getElementById('csa-nome-campo').hidden = !criar;
    document.getElementById('csa-confirmacao-campo').hidden = !criar;
    form.elements.nome.required = criar;
    form.elements.confirmacao.required = criar;
    form.elements.senha.minLength = criar ? 8 : 1;
    form.elements.senha.autocomplete = criar ? 'new-password' : 'current-password';
    document.getElementById('csa-auth-titulo').textContent = criar ? 'Faça parte da Casa' : 'Bem-vindo de volta';
    document.getElementById('csa-auth-descricao').textContent = criar ? 'Crie sua conta para organizar seus eventos.' : 'Entre na sua conta para acessar a agenda.';
    enviar.textContent = criar ? 'Criar conta' : 'Entrar';
    alternar.textContent = criar ? 'Já tem conta? Entrar' : 'Não tem conta? Criar conta';
    mensagem.hidden = true;
  }
  alternar.addEventListener('click', () => modo(!cadastro));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form));
    mensagem.hidden = true;
    enviar.disabled = alternar.disabled = true;
    try {
      if (cadastro) {
        if (!dados.nome.trim()) throw new Error('Informe seu nome.');
        if (dados.senha !== dados.confirmacao) throw new Error('As senhas precisam ser iguais.');
        await csaApi.requisitar('/usuarios', { metodo: 'POST', autenticado: false, dados: { nome: dados.nome.trim(), email: dados.email, senha: dados.senha } });
        modo(false);
        mensagem.textContent = 'Conta criada! Entre com seu e-mail e senha.';
        mensagem.hidden = false;
        form.elements.senha.value = '';
        form.elements.confirmacao.value = '';
      } else {
        await csaApi.entrar(dados.email, dados.senha);
        location.replace('/pages/agenda.html');
      }
    } catch (erro) { mensagem.textContent = erro.message; mensagem.hidden = false; }
    finally { enviar.disabled = alternar.disabled = false; }
  });
})();
