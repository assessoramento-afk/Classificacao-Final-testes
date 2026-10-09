/* =====================================================================
   Classificação Final · app.js
   Controle principal: sessão, perfil, menu por perfil e navegação.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.CF_CONFIG, ui = window.CF.ui, api = window.CF.api, sb = window.CF.sb, auth = window.CF.auth, esc = ui.esc;
  var raiz = document.getElementById('app');
  var NOMES_PERFIL = { admin: 'Administrador', avaliador: 'Avaliador', empresa: 'Empresa' };

  // Menu de cada perfil: [rota, texto, ícone]
  var MENUS = {
    admin: [['painel', 'Painel', 'painel'], ['avaliar', 'Avaliar', 'avaliar'], ['processos', 'Processos', 'processos'], ['agenda', 'Agenda', 'agenda'],
            ['cadastros', 'Cadastros', 'cadastros'], ['banco', 'Banco de testes', 'banco'], ['config', 'Configurações', 'config']],
    avaliador: [['painel', 'Painel', 'painel'], ['avaliar', 'Avaliar', 'avaliar'], ['processos', 'Processos', 'processos'], ['agenda', 'Agenda', 'agenda'],
                ['banco', 'Banco de testes', 'banco']],
    empresa: [['portal', 'Resultados', 'portal']]
  };

  var estado = { sessao: null, perfil: null, emRecuperacao: false, carregandoPerfil: null };

  /* ---------- Telas de estado ---------- */
  function telaCarregando(texto) {
    raiz.innerHTML = '<main class="estado"><div class="estado-card card"><div class="girando" aria-hidden="true"></div><p>' + esc(texto || 'Carregando…') + '</p></div></main>';
  }
  function telaMensagem(titulo, texto, comSair) {
    raiz.innerHTML = '<main class="estado"><div class="estado-card card">' +
      ui.logo('gol', '', '').replace(/<img /g, '<img style="width:72px;height:72px" ') +
      '<h1>' + esc(titulo) + '</h1><p>' + esc(texto) + '</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">' +
      '<button type="button" class="btn" id="b-recarregar">Verificar novamente</button>' +
      (comSair ? '<button type="button" class="btn btn-pri" id="b-sair">Sair</button>' : '') +
      '</div></div></main>';
    raiz.querySelector('#b-recarregar').addEventListener('click', function () { abrirSistema(true); });
    var bs = raiz.querySelector('#b-sair'); if (bs) bs.addEventListener('click', sair);
  }

  /* ---------- Estrutura (menu lateral + topo) ---------- */
  function montarShell() {
    var p = estado.perfil;
    var menu = MENUS[p.perfil] || [];
    raiz.innerHTML =
      '<div class="shell">' +
        '<aside class="lateral" id="lateral" aria-label="Menu">' +
          '<div class="lateral-marca">' + ui.logo('kolping', 'k', 'Kolping Estadual São Paulo') +
          '<div class="lateral-prog">' + ui.logo('gol', '', 'Projeto Gol Jovens Talentos') + '<div><b>' + esc(C.nomeSistema) + '</b><small>' + esc(C.programa) + '</small></div></div></div>' +
          '<nav class="menu">' + menu.map(function (m) {
            return '<a href="#/' + m[0] + '" data-rota="' + m[0] + '">' + ui.icone(m[2], 18) + '<span>' + esc(m[1]) + '</span></a>';
          }).join('') + '</nav>' +
          '<div class="lateral-versao">Versão ' + esc(C.versao) + '</div>' +
        '</aside>' +
        '<div class="principal">' +
          '<header class="topo">' +
            '<div class="topo-esq"><button type="button" class="btn-menu" id="b-menu" aria-label="Abrir menu" aria-expanded="false">' + ui.icone('menu', 20) + '</button>' +
            '<span class="topo-titulo" id="topo-titulo"></span></div>' +
            '<div class="topo-dir">' +
              '<div class="flutuante"><button type="button" class="btn-tema" id="b-tema" aria-haspopup="true" aria-expanded="false"></button>' +
                '<div class="menu-flutuante card oculto" id="m-tema" role="menu">' +
                  ['auto', 'escuro', 'claro'].map(function (k) { return '<button type="button" role="menuitemradio" data-opcao-tema="' + k + '">' + ui.icone(k === 'auto' ? 'auto' : (k === 'escuro' ? 'lua' : 'sol'), 16) + window.CF.tema.NOMES[k] + '</button>'; }).join('') +
                '</div></div>' +
              '<span id="conexao"></span>' +
              '<div class="flutuante"><button type="button" class="usuario-btn" id="b-usuario" aria-haspopup="true" aria-expanded="false">' +
                '<span class="avatar" id="u-avatar"></span><span class="usuario-txt"><b id="u-nome"></b><small>' + esc(NOMES_PERFIL[p.perfil] || '') + '</small></span></button>' +
                '<div class="menu-flutuante card oculto" id="m-usuario" role="menu"><a href="#/conta">Minha conta</a><button type="button" id="b-sair">Sair</button></div>' +
              '</div></div>' +
          '</header>' +
          '<main class="conteudo" id="conteudo" tabindex="-1"></main>' +
        '</div>' +
      '</div>';

    atualizarUsuario();
    atualizarConexao();
    window.CF.online.iniciar(p);
    window.CF.avisos.iniciar(p);
    if (window.CF.instalar) window.CF.instalar.colocar(p);
    if (p.perfil === 'empresa') {   // atividade da empresa: só o administrador enxerga
      var registrar = function () { if (document.hidden || !navigator.onLine) return; try { window.CF.dados.pessoas.registrarAtividade().catch(function () {}); } catch (e) { /* sem registro */ } };
      registrar(); clearInterval(window.__cfAtividade); window.__cfAtividade = setInterval(registrar, 60000);
    }
    if (p.perfil === 'admin' && window.CF.agendaUtil) setTimeout(window.CF.agendaUtil.atualizarBadge, 600);
    window.CF.inatividade.iniciar(function (porTempo) { sair(porTempo ? { tipo: 'info', texto: 'Por segurança, você saiu do sistema após 1 hora sem uso. Entre novamente.' } : null); });

    var lateral = raiz.querySelector('#lateral'), bMenu = raiz.querySelector('#b-menu');
    function fecharMenu() {
      lateral.classList.remove('aberta'); bMenu.setAttribute('aria-expanded', 'false');
      var f = document.querySelector('.fundo-menu'); if (f) f.remove();
    }
    bMenu.addEventListener('click', function () {
      if (lateral.classList.contains('aberta')) { fecharMenu(); return; }
      lateral.classList.add('aberta'); bMenu.setAttribute('aria-expanded', 'true');
      var f = document.createElement('div'); f.className = 'fundo-menu'; f.addEventListener('click', fecharMenu); document.body.appendChild(f);
    });
    lateral.addEventListener('click', function (e) { if (e.target.closest('a')) fecharMenu(); });

    ligarMenu(raiz.querySelector('#b-usuario'), raiz.querySelector('#m-usuario'));
    ligarMenu(raiz.querySelector('#b-tema'), raiz.querySelector('#m-tema'));
    raiz.querySelectorAll('#m-tema [data-opcao-tema]').forEach(function (b) {
      b.addEventListener('click', function () { window.CF.tema.definir(b.getAttribute('data-opcao-tema')); });
    });
    atualizarBotaoTema();
    raiz.querySelector('#b-sair').addEventListener('click', sair);

    navegar();
  }

  function atualizarUsuario() {
    var p = estado.perfil; if (!p) return;
    var n = raiz.querySelector('#u-nome');
    if (n) n.textContent = p.nome || p.email;
    window.CF.foto.preencherAvatar(raiz.querySelector('#u-avatar'), p);
    window.CF.online.atualizarMeusDados(p);
  }

  // Menus flutuantes (usuário e tema): abrem no clique e fecham ao clicar em outro lugar
  var menusAbertos = [];
  function ligarMenu(botao, menu) {
    if (!botao || !menu) return;
    botao.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = menu.classList.contains('oculto');
      fecharMenus();
      if (abrir) { menu.classList.remove('oculto'); botao.setAttribute('aria-expanded', 'true'); menusAbertos.push([botao, menu]); }
    });
  }
  function fecharMenus() {
    menusAbertos.forEach(function (m) { m[1].classList.add('oculto'); m[0].setAttribute('aria-expanded', 'false'); });
    menusAbertos = [];
  }
  document.addEventListener('click', fecharMenus);

  function atualizarBotaoTema() {
    var b = document.getElementById('b-tema'); if (!b) return;
    var e = window.CF.tema.escolha();
    b.innerHTML = ui.icone(e === 'auto' ? 'auto' : (e === 'escuro' ? 'lua' : 'sol'), 15) + '<span>' + esc(window.CF.tema.NOMES[e]) + '</span>';
    b.setAttribute('aria-label', 'Tema: ' + window.CF.tema.NOMES[e]);
    document.querySelectorAll('#m-tema [data-opcao-tema]').forEach(function (x) { x.setAttribute('aria-checked', String(x.getAttribute('data-opcao-tema') === e)); });
  }
  document.addEventListener('cf-tema', function () { atualizarBotaoTema(); });

  function atualizarConexao() { window.CF.online.desenhar(); }
  window.addEventListener('online', atualizarConexao);
  window.addEventListener('offline', atualizarConexao);

  /* ---------- Navegação ---------- */
  function rotaAtual() {
    var h = window.location.hash || '';
    if (h.indexOf('access_token') >= 0 || h.indexOf('error') >= 0) return null; // retorno de links de e-mail
    var m = h.match(/^#\/([a-z-]+)/);
    return m ? m[1] : null;
  }

  function navegar() {
    document.querySelectorAll('.janela-fundo').forEach(function (f) { f.remove(); });
    var p = estado.perfil;
    var conteudo = document.getElementById('conteudo');
    if (!p || !conteudo) return;
    var permitidas = (MENUS[p.perfil] || []).map(function (m) { return m[0]; }).concat(['conta']);
    var rota = rotaAtual();
    if (!rota || permitidas.indexOf(rota) < 0) {
      rota = permitidas[0];
      history.replaceState(null, '', '#/' + rota);
    }
    raiz.querySelectorAll('.menu a').forEach(function (a) {
      if (a.getAttribute('data-rota') === rota) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var item = (MENUS[p.perfil] || []).filter(function (m) { return m[0] === rota; })[0];
    document.getElementById('topo-titulo').textContent = item ? item[1] : 'Minha conta';
    document.title = (item ? item[1] : 'Minha conta') + ' · ' + C.nomeSistema;
    var tela = window.CF.telas[rota];
    try {
      tela(conteudo, { perfil: p, atualizarUsuario: atualizarUsuario });
    } catch (e) {
      console.error(e);
      conteudo.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>Não foi possível abrir esta tela. Recarregue a página.</span></div>';
    }
    conteudo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { if (estado.perfil && !estado.emRecuperacao) navegar(); });

  /* ---------- Sessão e perfil ---------- */
  async function abrirSistema(forcar) {
    if (estado.emRecuperacao) return;
    if (!estado.sessao) { estado.perfil = null; auth.mostrarAcesso(raiz, window.location.hash === '#cadastro' ? 'cadastro' : 'entrar'); return; }
    if (estado.perfil && !forcar) { if (!document.getElementById('conteudo')) montarShell(); return; }
    telaCarregando('Carregando seu acesso…');
    try {
      var perfil = null;
      try { perfil = await api.carregarPerfil(estado.sessao.user.id); if (perfil) localStorage.setItem('cf_perfil_' + perfil.id, JSON.stringify(perfil)); }
      catch (eRede) {
        // sem internet: usa o perfil guardado no último acesso deste aparelho
        var guardado = null; try { guardado = JSON.parse(localStorage.getItem('cf_perfil_' + estado.sessao.user.id) || 'null'); } catch (x) { /* nada */ }
        if (!guardado || navigator.onLine) throw eRede;
        perfil = guardado; perfil.__offline = true;
      }
      if (!perfil) { telaMensagem('Perfil não encontrado', 'Seu cadastro não foi concluído corretamente. Fale com a coordenação.', true); return; }
      estado.perfil = perfil; window.CF.perfilAtual = perfil;
      if (!perfil.ativo) { telaMensagem('Acesso desativado', 'Seu acesso foi desativado. Se acha que é um engano, fale com a coordenação.', true); return; }
      if (!perfil.aprovado) {
        telaMensagem('Cadastro aguardando aprovação', 'Olá, ' + (perfil.nome || '') + '! Seu cadastro foi recebido e precisa ser liberado por um administrador. Assim que for aprovado, você poderá entrar normalmente.', true);
        return;
      }
      montarShell();
    } catch (e) {
      console.error(e);
      telaMensagem('Não foi possível carregar', api.traduzErro(e), true);
    }
  }

  async function sair(mensagem) {
    if (mensagem && mensagem.type) mensagem = null; // clique no botão Sair
    if (window.CF.offline && window.CF.offline.pendentes() > 0) {
      ui.janela({ titulo: 'Ainda há dados para enviar', confirmarDescarte: false,
        corpo: '<p style="margin:0">Há <b>' + window.CF.offline.pendentes() + ' item(ns)</b> salvos neste aparelho que ainda não foram enviados. Para não perder nada, conecte-se à internet e aguarde o envio antes de sair.</p>',
        botoes: [{ texto: 'Entendi', principal: true, aoClicar: function () { window.CF.offline.enviar(); return true; } }] });
      return;
    }
    window.CF.inatividade.parar();
    clearInterval(window.__cfAtividade);
    window.CF.online.parar();
    window.CF.avisos.parar();
    await sb.auth.signOut();
    estado.sessao = null; estado.perfil = null; window.CF.perfilAtual = null;
    history.replaceState(null, '', window.location.pathname);
    auth.mostrarAcesso(raiz, 'entrar', mensagem || null);
  }

  sb.auth.onAuthStateChange(function (evento, sessao) {
    // O Supabase recomenda não aguardar chamadas ao banco dentro deste evento
    setTimeout(function () {
      if (evento === 'PASSWORD_RECOVERY') {
        estado.emRecuperacao = true; estado.sessao = sessao;
        auth.mostrarNovaSenha(raiz, function () {
          estado.emRecuperacao = false;
          history.replaceState(null, '', window.location.pathname);
          abrirSistema(true);
        });
        return;
      }
      if (evento === 'SIGNED_OUT') { estado.sessao = null; estado.perfil = null; window.CF.inatividade.parar(); if (!estado.emRecuperacao && !document.querySelector('.acesso')) auth.mostrarAcesso(raiz, 'entrar'); return; }
      if (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION') {
        var mudouUsuario = !estado.sessao || !sessao || estado.sessao.user.id !== sessao.user.id;
        estado.sessao = sessao;
        if (window.location.hash.indexOf('access_token') >= 0) history.replaceState(null, '', window.location.pathname);
        abrirSistema(mudouUsuario);
        return;
      }
      if (evento === 'TOKEN_REFRESHED' || evento === 'USER_UPDATED') { estado.sessao = sessao; }
    }, 0);
  });

  /* ---------- Aplicativo instalável (service worker) ---------- */
  function avisarAtualizacao(registro) {
    if (document.querySelector('.faixa-atualizar')) return;
    var f = document.createElement('div');
    f.className = 'faixa-atualizar card';
    f.innerHTML = '<span>Há uma nova versão do sistema.</span><button type="button" class="btn btn-pri">Atualizar agora</button>';
    f.querySelector('button').addEventListener('click', function () {
      if (registro.waiting) registro.waiting.postMessage('ATUALIZAR');
    });
    document.body.appendChild(f);
  }
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        if (reg.waiting && navigator.serviceWorker.controller) avisarAtualizacao(reg);
        reg.addEventListener('updatefound', function () {
          var novo = reg.installing;
          if (!novo) return;
          novo.addEventListener('statechange', function () {
            if (novo.state === 'installed' && navigator.serviceWorker.controller) avisarAtualizacao(reg);
          });
        });
      }).catch(function (e) { console.warn('Service worker não registrado:', e); });
      var recarregou = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (recarregou) return; recarregou = true; window.location.reload();
      });
    });
  }

  telaCarregando('Abrindo o sistema…');
})();
