(() => {
  const raiz = new URL('../', document.currentScript.src);
  const icones = {
    dashboard: '<path d="M4 19a10 10 0 1 1 16 0ZM12 4v2M5 8l2 1M19 8l-2 1M12 15l-3-5"/><circle cx="12" cy="15" r="1"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M7 2v6M17 2v6"/>',
    visitas: '<circle cx="9" cy="6" r="3.5"/><path d="M6 10a6 6 0 0 0-4 6v3h6"/><circle cx="15" cy="12" r="3.5"/><path d="M9 22v-2a6 6 0 0 1 12 0v2Z"/>',
    editor: '<path d="M13 4H3v17h17V11M10 12l9-9 3 3-9 9-4 1Z"/>',
    formulario: '<rect x="5" y="3" width="14" height="19" rx="1"/><path d="M9 8h6M9 12h6M9 16h6"/>',
    entrar: '<path d="M14 3h7v18h-7M2 12h14M10 6l6 6-6 6"/>'
  };
  const svg = nome => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icones[nome] || icones.formulario}</svg>`;

  class CsaNavbar extends HTMLElement {
    connectedCallback() {
      if (this.querySelector('.csa-navbar-header')) return;
      const admin = this.getAttribute('area') === 'admin';
      const atual = location.pathname;
      const lateral = this.getAttribute('lateral') && document.querySelector(this.getAttribute('lateral'));
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
      const modo = new URLSearchParams(location.search).get('demo');
      const demo = local && modo === '1';
      const url = caminho => {
        const destino = new URL(caminho, raiz);
        if (demo && caminho !== 'pages/login.html') destino.searchParams.set('demo', '1');
        if (local && modo === '0' && caminho !== 'pages/login.html') destino.searchParams.set('demo', '0');
        return destino.href;
      };
      const itens = admin ? [
        ['Dashboard', 'pages/admin/agenda.html', 'dashboard'],
        ['Sugestões de pauta', 'pages/admin/sugestoes-pauta.html', 'agenda'],
        ['Visitas Mediadas', 'pages/visita-mediada/admin/visitas.html', 'visitas'],
        ['Editar Formulário', 'pages/visita-mediada/admin/editor-visitas.html', 'editor']
      ] : [
        ['Agenda', 'pages/cliente/agenda-cliente.html', 'agenda'],
        ['Visitas Mediadas', 'pages/visita-mediada/cliente/visitas.html', 'visitas'],
        ['Reservar Espaço', 'pages/cliente/reservas.html', 'formulario'],
        ['Entrar', 'pages/login.html', 'entrar']
      ];
      if (atual.endsWith('/pages/componentes.html')) itens.push(['Componentes', 'pages/componentes.html', 'formulario']);
      const paginaAtiva = () => {
        let selecionada = location.pathname;
        if (!admin && selecionada.includes('/visita-mediada/cliente/')) return new URL('pages/visita-mediada/cliente/visitas.html', raiz).pathname;
        if (selecionada.endsWith('/confirmacao-reserva.html')) return new URL('pages/cliente/reservas.html', raiz).pathname;
        if (selecionada.endsWith('/detalhes-reserva.html')) return new URL('pages/cliente/agenda-cliente.html', raiz).pathname;
        if (admin && selecionada.endsWith('/formulario-visita.html')) return new URL('pages/visita-mediada/admin/editor-visitas.html', raiz).pathname;
        return selecionada;
      };
      const perfil = '<span class="csa-navbar-perfil"><span class="csa-navbar-avatar">AD</span><span>Admin<small>Casa dos Saberes</small></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span>';
      this.innerHTML = `<header class="csa-navbar-header"><div class="csa-navbar-topo"><a class="csa-navbar-marca" href="${url(admin ? 'pages/admin/agenda.html' : 'pages/cliente/agenda-cliente.html')}" aria-label="Casa dos Saberes — ${admin ? 'dashboard administrativo' : 'agenda'}"><img src="${new URL('assets/csca-gov.svg', raiz).href}" alt="Casa dos Saberes Cego Aderaldo e Governo do Ceará" width="317" height="47"></a>${admin && lateral ? perfil : ''}<button class="csa-navbar-botao" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="csa-navbar-menu">${admin && !lateral ? perfil : ''}<svg class="csa-navbar-hamburger" viewBox="0 0 41 28" fill="none" stroke="currentColor" stroke-width="4" aria-hidden="true"><path d="M0 2h41M0 14h41M0 26h41"/></svg></button></div><div class="csa-navbar-faixa" aria-hidden="true">${[1, 2, 3, 3, 3, 3, 3].map(numero => `<img src="${new URL(`assets/barra${numero}.svg`, raiz).href}" alt="">`).join('')}</div></header>`;
      const menu = document.createElement('nav');
      menu.id = 'csa-navbar-menu';
      menu.className = 'csa-navbar-menu';
      menu.setAttribute('aria-label', admin ? 'Navegação administrativa' : 'Navegação principal');
      for (const [nome, caminho, icone] of itens) {
        const link = document.createElement('a');
        link.className = 'csa-navbar-link';
        link.href = url(caminho);
        link.innerHTML = `${svg(icone)}<span>${nome}</span>`;
        const destino = new URL(caminho, raiz);
        if (paginaAtiva() === destino.pathname + destino.hash) link.setAttribute('aria-current', 'page');
        menu.append(link);
      }
      window.addEventListener('hashchange', () => {
        for (const link of menu.querySelectorAll('a')) {
          const destino = new URL(link.href);
          if (paginaAtiva() === destino.pathname + destino.hash) link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        }
      });
      if (lateral) {
        lateral.classList.add('csa-navbar-lateral');
        lateral.prepend(menu);
        this.classList.add('csa-navbar-com-lateral');
      } else this.append(menu);
      const botao = this.querySelector('.csa-navbar-botao');
      const mobile = matchMedia('(max-width: 768px)');
      let aberto = false;
      const atualizar = () => {
        const recolhivel = !lateral || mobile.matches;
        menu.hidden = recolhivel && !aberto;
        botao.setAttribute('aria-expanded', String(recolhivel && aberto));
        botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
        lateral?.classList.toggle('csa-navbar-lateral--aberta', mobile.matches && aberto);
        document.documentElement.style.setProperty('--csa-navbar-topo', `${this.getBoundingClientRect().bottom + scrollY}px`);
      };
      botao.addEventListener('click', () => { aberto = !aberto; atualizar(); });
      menu.addEventListener('click', evento => {
        if (!evento.target.closest('a')) return;
        aberto = false;
        atualizar();
      });
      document.addEventListener('click', evento => {
        if (!aberto || this.contains(evento.target) || menu.contains(evento.target)) return;
        aberto = false;
        atualizar();
      });
      document.addEventListener('keydown', evento => {
        if (evento.key !== 'Escape' || !aberto) return;
        aberto = false;
        atualizar();
        botao.focus();
      });
      mobile.addEventListener('change', () => { aberto = false; atualizar(); });
      window.addEventListener('resize', atualizar);
      atualizar();
    }
  }

  customElements.define('csa-navbar', CsaNavbar);
})();
