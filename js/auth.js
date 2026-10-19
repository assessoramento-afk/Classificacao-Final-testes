/* =====================================================================
   Classificação Final · auth.js
   Telas de acesso: entrar, criar cadastro, esqueci a senha e nova senha.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.CF_CONFIG, ui = window.CF.ui, api = window.CF.api, sb = window.CF.sb, esc = ui.esc;

  // Faixa superior (sempre escura) com logos, nome e rosa dos ventos em marca-d'água
  function faixa() {
    return '<header class="acesso-faixa">' +
      '<img class="marca-agua" src="assets/img/gol_dark.png" alt="" aria-hidden="true">' +
      '<div class="acesso-marca"><div class="logos"><img class="k" src="assets/img/kolping_dark.png" alt="Kolping Estadual São Paulo">' +
      '<span class="div" aria-hidden="true"></span><img class="g" src="assets/img/gol_dark.png" alt="Projeto Gol Jovens Talentos"></div>' +
      '<div><h1>' + esc(C.nomeSistema) + '</h1><p>' + esc(C.programa) + '</p></div></div></header>';
  }
  function moldura(conteudoCartao) {
    return '<main class="acesso">' + faixa() +
      '<div class="acesso-corpo"><section class="acesso-card">' + conteudoCartao + '</section>' +
      '<p class="acesso-rodape">Kolping Estadual de São Paulo · versão ' + esc(C.versao) + '</p></div></main>';
  }

  function aviso(tipo, texto) {
    return '<div class="aviso aviso-' + tipo + '" role="' + (tipo === 'erro' ? 'alert' : 'status') + '">' +
      ui.icone(tipo === 'ok' ? 'ok' : 'alerta', 18) + '<span>' + esc(texto) + '</span></div>';
  }

  function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  // Bloqueia o botão enquanto a operação acontece (evita cliques duplos)
  async function executar(botao, textoOcupado, fn) {
    var original = botao.textContent;
    botao.disabled = true; botao.textContent = textoOcupado;
    try { return await fn(); }
    finally { botao.disabled = false; botao.textContent = original; }
  }

  /* ---------- Tela principal de acesso ---------- */
  function mostrarAcesso(raiz, aba, mensagem) {
    aba = aba || 'entrar';
    raiz.innerHTML = moldura(
        '<div class="segmentos" role="tablist" aria-label="Acesso">' +
          '<button type="button" role="tab" data-aba="entrar" aria-selected="' + (aba === 'entrar') + '">Entrar</button>' +
          '<button type="button" role="tab" data-aba="cadastro" aria-selected="' + (aba === 'cadastro') + '">Criar cadastro</button>' +
        '</div>' +
        '<div id="area-msg">' + (mensagem ? aviso(mensagem.tipo, mensagem.texto) : '') + '</div>' +
        '<div id="area-form"></div>');

    raiz.querySelectorAll('[data-aba]').forEach(function (b) {
      b.addEventListener('click', function () { mostrarAcesso(raiz, b.getAttribute('data-aba')); });
    });
    if (aba === 'cadastro') formCadastro(raiz); else if (aba === 'esqueci') formEsqueci(raiz); else formEntrar(raiz);
  }

  /* ---------- Entrar com Google / Microsoft ---------- */
  var LOGO_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  var LOGO_M = '<svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>';
  function botoesContas() {
    if (!C.loginGoogle && !C.loginMicrosoft) return '';
    return '<div class="sso">' +
      (C.loginGoogle ? '<button type="button" class="btn btn-bloco" data-sso="google">' + LOGO_G + ' Entrar com Google <small>@kolpingsp.org</small></button>' : '') +
      (C.loginMicrosoft ? '<button type="button" class="btn btn-bloco" data-sso="azure">' + LOGO_M + ' Entrar com Microsoft <small>@kolping-sp.org.br</small></button>' : '') +
      '</div><div class="sso-ou">ou com e-mail e senha (empresas e quem preferir)</div>';
  }
  async function entrarCom(provedor, botao) {
    if (!navigator.onLine) { ui.toast('Para entrar com ' + (provedor === 'google' ? 'Google' : 'Microsoft') + ' é preciso internet.', 'erro'); return; }
    if (botao) { botao.disabled = true; }
    var op = { redirectTo: window.location.origin + window.location.pathname };
    if (provedor === 'google') op.queryParams = { hd: 'kolpingsp.org', prompt: 'select_account' };
    if (provedor === 'azure') { op.scopes = 'email'; op.queryParams = { prompt: 'select_account' }; }
    var r = await sb.auth.signInWithOAuth({ provider: provedor, options: op });   // vai para a página do Google/Microsoft e volta já conectado
    if (r.error) { if (botao) botao.disabled = false; ui.toast(api.traduzErro(r.error), 'erro'); }
  }
  function ligarContas(area) { area.querySelectorAll('[data-sso]').forEach(function (b) { b.addEventListener('click', function () { entrarCom(b.getAttribute('data-sso'), b); }); }); }

  function msg(raiz, tipo, texto) { raiz.querySelector('#area-msg').innerHTML = texto ? aviso(tipo, texto) : ''; }

  function formEntrar(raiz) {
    var area = raiz.querySelector('#area-form');
    area.innerHTML = botoesContas() +
      '<form class="form" novalidate>' +
        '<label class="campo" for="e-email"><span>E-mail <span class="obrig">*</span></span>' +
        '<input class="entrada" id="e-email" type="email" required autocomplete="email" inputmode="email"></label>' +
        ui.campoSenha('e-senha', 'Senha', 'current-password') +
        '<button type="submit" class="btn btn-pri btn-bloco">Entrar</button>' +
        '<button type="button" class="btn-link" id="ir-esqueci">Esqueci minha senha</button>' +
      '</form>';
    ui.ligarVerSenha(area); ligarContas(area);
    area.querySelector('#ir-esqueci').addEventListener('click', function () { mostrarAcesso(raiz, 'esqueci'); });
    area.querySelector('form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var email = area.querySelector('#e-email').value.trim().toLowerCase();
      var senha = area.querySelector('#e-senha').value;
      if (!emailValido(email) || !senha) { msg(raiz, 'erro', 'Preencha o e-mail e a senha.'); return; }
      msg(raiz, '', '');
      await executar(ev.submitter || area.querySelector('[type=submit]'), 'Entrando…', async function () {
        var r = await sb.auth.signInWithPassword({ email: email, password: senha });
        if (!r.error && window.CF.offline) window.CF.offline.guardarChave(email, senha);
        if (r.error) msg(raiz, 'erro', api.traduzErro(r.error));
        // se deu certo, o app.js recebe o evento de login e abre o sistema
      });
    });
  }

  function formCadastro(raiz) {
    var area = raiz.querySelector('#area-form');
    area.innerHTML =
      '<form class="form" novalidate>' +
        '<label class="campo" for="c-nome"><span>Nome completo <span class="obrig">*</span></span>' +
        '<input class="entrada" id="c-nome" type="text" required autocomplete="name" maxlength="120"></label>' +
        '<label class="campo" for="c-email"><span>E-mail <span class="obrig">*</span></span>' +
        '<input class="entrada" id="c-email" type="email" required autocomplete="email" inputmode="email"></label>' +
        ui.campoSenha('c-senha', 'Senha', 'new-password') +
        '<span class="dica">Pelo menos ' + C.senhaMinima + ' caracteres, com letras e números.</span>' +
        ui.campoSenha('c-senha2', 'Repita a senha', 'new-password') +
        '<button type="submit" class="btn btn-pri btn-bloco">Criar cadastro</button>' +
        '<span class="dica">Depois de confirmar o e-mail, seu acesso precisa ser liberado por um administrador.</span>' +
      '</form>';
    ui.ligarVerSenha(area);
    area.querySelector('form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var nome = area.querySelector('#c-nome').value.trim().replace(/\s+/g, ' ');
      var email = area.querySelector('#c-email').value.trim().toLowerCase();
      var s1 = area.querySelector('#c-senha').value, s2 = area.querySelector('#c-senha2').value;
      if (nome.length < 3) { msg(raiz, 'erro', 'Informe o nome completo.'); return; }
      if (!emailValido(email)) { msg(raiz, 'erro', 'Informe um e-mail válido.'); return; }
      if (s1.length < C.senhaMinima || !/[a-zA-Z]/.test(s1) || !/[0-9]/.test(s1)) {
        msg(raiz, 'erro', 'A senha precisa ter pelo menos ' + C.senhaMinima + ' caracteres, com letras e números.'); return;
      }
      if (s1 !== s2) { msg(raiz, 'erro', 'As duas senhas não são iguais.'); return; }
      msg(raiz, '', '');
      await executar(ev.submitter || area.querySelector('[type=submit]'), 'Criando…', async function () {
        var r = await sb.auth.signUp({
          email: email, password: s1,
          options: { data: { nome: nome }, emailRedirectTo: api.enderecoDoSite() }
        });
        if (r.error) { msg(raiz, 'erro', api.traduzErro(r.error)); return; }
        // E-mail já cadastrado: o Supabase devolve um usuário sem identidades
        if (r.data && r.data.user && r.data.user.identities && r.data.user.identities.length === 0) {
          msg(raiz, 'erro', 'Já existe um cadastro com este e-mail. Use "Entrar" ou "Esqueci minha senha".'); return;
        }
        if (r.data && r.data.session) return; // confirmação de e-mail desligada: entra direto
        mostrarAcesso(raiz, 'entrar', { tipo: 'ok', texto: 'Cadastro criado! Enviamos um e-mail para ' + email +
          '. Clique no link da mensagem para confirmar e depois entre aqui. Se não encontrar, procure no spam.' });
      });
    });
  }

  function formEsqueci(raiz) {
    raiz.querySelectorAll('[data-aba]').forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
    var area = raiz.querySelector('#area-form');
    area.innerHTML =
      '<form class="form" novalidate>' +
        '<p style="margin:0;color:var(--texto-2);font-size:14px">Informe o e-mail do seu cadastro. Vamos enviar um link para você criar uma nova senha.</p>' +
        '<label class="campo" for="r-email"><span>E-mail <span class="obrig">*</span></span>' +
        '<input class="entrada" id="r-email" type="email" required autocomplete="email" inputmode="email"></label>' +
        '<button type="submit" class="btn btn-pri btn-bloco">Enviar link</button>' +
        '<button type="button" class="btn-link" id="voltar">Voltar para entrar</button>' +
      '</form>';
    area.querySelector('#voltar').addEventListener('click', function () { mostrarAcesso(raiz, 'entrar'); });
    area.querySelector('form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var email = area.querySelector('#r-email').value.trim().toLowerCase();
      if (!emailValido(email)) { msg(raiz, 'erro', 'Informe um e-mail válido.'); return; }
      await executar(ev.submitter || area.querySelector('[type=submit]'), 'Enviando…', async function () {
        var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: api.enderecoDoSite() });
        if (r.error) { msg(raiz, 'erro', api.traduzErro(r.error)); return; }
        // Mesma mensagem exista ou não o cadastro (não revela quem tem conta)
        mostrarAcesso(raiz, 'entrar', { tipo: 'ok', texto: 'Se existir um cadastro com ' + email +
          ', você vai receber um e-mail com o link para criar uma nova senha. Confira também o spam.' });
      });
    });
  }

  /* ---------- Nova senha (depois de clicar no link do e-mail) ---------- */
  function mostrarNovaSenha(raiz, aoConcluir) {
    raiz.innerHTML = moldura(
      '<h2>Criar nova senha</h2><div id="area-msg"></div>' +
      '<form class="form" novalidate>' +
        ui.campoSenha('n-senha', 'Nova senha', 'new-password') +
        '<span class="dica">Pelo menos ' + C.senhaMinima + ' caracteres, com letras e números.</span>' +
        ui.campoSenha('n-senha2', 'Repita a nova senha', 'new-password') +
        '<button type="submit" class="btn btn-pri btn-bloco">Salvar nova senha</button>' +
      '</form>');
    ui.ligarVerSenha(raiz);
    raiz.querySelector('form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var s1 = raiz.querySelector('#n-senha').value, s2 = raiz.querySelector('#n-senha2').value;
      if (s1.length < C.senhaMinima || !/[a-zA-Z]/.test(s1) || !/[0-9]/.test(s1)) {
        msg(raiz, 'erro', 'A senha precisa ter pelo menos ' + C.senhaMinima + ' caracteres, com letras e números.'); return;
      }
      if (s1 !== s2) { msg(raiz, 'erro', 'As duas senhas não são iguais.'); return; }
      await executar(ev.submitter || raiz.querySelector('[type=submit]'), 'Salvando…', async function () {
        var r = await sb.auth.updateUser({ password: s1 });
        if (r.error) { msg(raiz, 'erro', api.traduzErro(r.error)); return; }
        ui.toast('Senha alterada com sucesso.', 'ok');
        if (aoConcluir) aoConcluir();
      });
    });
  }

  window.CF.auth = { entrarCom: entrarCom,  mostrarAcesso: mostrarAcesso, mostrarNovaSenha: mostrarNovaSenha };
})();
