/* =====================================================================
   Classificação Final · auth.js
   Telas de acesso: entrar, criar cadastro, esqueci a senha e nova senha.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.CF_CONFIG, ui = window.CF.ui, api = window.CF.api, sb = window.CF.sb, esc = ui.esc;

  function marca() {
    return '<div class="acesso-marca">' +
      '<div class="acesso-logos"><img class="k" src="assets/img/kolping_dark.png" alt="Kolping Estadual São Paulo">' +
      '<span class="div" aria-hidden="true"></span><img class="g" src="assets/img/gol_dark.png" alt="Projeto Gol Jovens Talentos"></div>' +
      '<div><h1>' + esc(C.nomeSistema) + '</h1><p>' + esc(C.programa) + '</p></div></div>';
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
    raiz.innerHTML =
      '<main class="acesso"><div class="acesso-caixa">' + marca() +
      '<section class="card acesso-card">' +
        '<div class="abas" role="tablist" aria-label="Acesso">' +
          '<button type="button" role="tab" data-aba="entrar" aria-selected="' + (aba === 'entrar') + '">Entrar</button>' +
          '<button type="button" role="tab" data-aba="cadastro" aria-selected="' + (aba === 'cadastro') + '">Criar cadastro</button>' +
        '</div>' +
        '<div id="area-msg">' + (mensagem ? aviso(mensagem.tipo, mensagem.texto) : '') + '</div>' +
        '<div id="area-form"></div>' +
      '</section>' +
      '<p class="acesso-rodape">Kolping Estadual de São Paulo · versão ' + esc(C.versao) + '</p>' +
      '</div></main>';

    raiz.querySelectorAll('[data-aba]').forEach(function (b) {
      b.addEventListener('click', function () { mostrarAcesso(raiz, b.getAttribute('data-aba')); });
    });
    if (aba === 'cadastro') formCadastro(raiz); else if (aba === 'esqueci') formEsqueci(raiz); else formEntrar(raiz);
  }

  function msg(raiz, tipo, texto) { raiz.querySelector('#area-msg').innerHTML = texto ? aviso(tipo, texto) : ''; }

  function formEntrar(raiz) {
    var area = raiz.querySelector('#area-form');
    area.innerHTML =
      '<form class="form" novalidate>' +
        '<label class="campo" for="e-email"><span>E-mail <span class="obrig">*</span></span>' +
        '<input class="entrada" id="e-email" type="email" required autocomplete="email" inputmode="email"></label>' +
        ui.campoSenha('e-senha', 'Senha', 'current-password') +
        '<button type="submit" class="btn btn-pri btn-bloco">Entrar</button>' +
        '<button type="button" class="btn-link" id="ir-esqueci">Esqueci minha senha</button>' +
      '</form>';
    ui.ligarVerSenha(area);
    area.querySelector('#ir-esqueci').addEventListener('click', function () { mostrarAcesso(raiz, 'esqueci'); });
    area.querySelector('form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var email = area.querySelector('#e-email').value.trim().toLowerCase();
      var senha = area.querySelector('#e-senha').value;
      if (!emailValido(email) || !senha) { msg(raiz, 'erro', 'Preencha o e-mail e a senha.'); return; }
      msg(raiz, '', '');
      await executar(ev.submitter || area.querySelector('[type=submit]'), 'Entrando…', async function () {
        var r = await sb.auth.signInWithPassword({ email: email, password: senha });
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
    raiz.innerHTML =
      '<main class="acesso"><div class="acesso-caixa">' + marca() +
      '<section class="card acesso-card"><h2 style="font-size:19px">Criar nova senha</h2>' +
      '<div id="area-msg"></div>' +
      '<form class="form" novalidate>' +
        ui.campoSenha('n-senha', 'Nova senha', 'new-password') +
        '<span class="dica">Pelo menos ' + C.senhaMinima + ' caracteres, com letras e números.</span>' +
        ui.campoSenha('n-senha2', 'Repita a nova senha', 'new-password') +
        '<button type="submit" class="btn btn-pri btn-bloco">Salvar nova senha</button>' +
      '</form></section></div></main>';
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

  window.CF.auth = { mostrarAcesso: mostrarAcesso, mostrarNovaSenha: mostrarNovaSenha };
})();
