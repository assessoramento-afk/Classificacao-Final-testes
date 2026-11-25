/* =====================================================================
   Classificação Final · views/minha-conta.js
   Dados da própria conta: nome e troca de senha.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.CF_CONFIG, ui = window.CF.ui, api = window.CF.api, sb = window.CF.sb, esc = ui.esc;
  var NOMES_PERFIL = { admin: 'Administrador', avaliador: 'Avaliador', empresa: 'Empresa' };

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.conta = function (area, ctx) {
    var p = ctx.perfil;
    area.innerHTML =
      '<header class="cabecalho"><div><h1>Minha conta</h1><p>' + esc(p.email) + ' · ' + esc(NOMES_PERFIL[p.perfil] || p.perfil) + '</p></div></header>' +
      '<div class="grade conta-grade">' +
        '<section class="card bloco"><h2>Foto do perfil</h2>' +
          '<div class="foto-bloco"><span class="avatar foto-grande" id="m-foto"></span>' +
          '<div class="foto-acoes">' +
            '<p>Aparece no topo do sistema e no histórico de alterações.</p>' +
            '<div class="botoes"><button type="button" class="btn btn-pri" id="b-foto">Trocar foto</button>' +
            '<button type="button" class="btn" id="b-foto-rem">Remover</button></div></div></div></section>' +
        '<section class="card bloco"><h2>Nome</h2><span class="icone-card" aria-hidden="true">' + ui.icone('pessoa', 40) + '</span>' +
          '<form class="form" id="f-nome" novalidate>' +
            '<label class="campo" for="m-nome"><span>Nome completo <span class="obrig">*</span></span>' +
            '<input class="entrada" id="m-nome" type="text" maxlength="120" autocomplete="name" value="' + esc(p.nome) + '"></label>' +
            '<button type="submit" class="btn btn-pri">Salvar nome</button>' +
          '</form></section>' +
        '<section class="card bloco"><h2>Aparência</h2><span class="icone-card" aria-hidden="true">' + ui.icone('auto', 40) + '</span>' +
          '<div class="segmentos" role="group" aria-label="Tema">' +
            ['auto', 'escuro', 'claro'].map(function (k) { return '<button type="button" data-opcao-tema="' + k + '">' + esc(window.CF.tema.NOMES[k]) + '</button>'; }).join('') +
          '</div><span class="dica">O modo Automático segue o tema do seu celular ou computador.</span></section>' +
        '<section class="card bloco"><h2>Idioma</h2><span class="icone-card" aria-hidden="true" style="font-size:34px">' + ui.icone('globo', 34) + '</span>' +
          '<div class="segmentos" role="group" aria-label="Idioma">' + ['pt', 'en'].map(function (k) { return '<button type="button" data-opcao-idioma="' + k + '" translate="no" aria-pressed="' + (window.CF.idioma.atual() === k) + '"' + (window.CF.idioma.atual() === k ? ' class="ativo"' : '') + '>' + esc(window.CF.idioma.NOMES[k]) + '</button>'; }).join('') +
          '</div><span class="dica">O idioma vale para as telas, os PDFs e as planilhas gerados neste aparelho.</span></section>' +
        '<section class="card bloco"><h2>Senha</h2><span class="icone-card" aria-hidden="true">' + ui.icone('cadeado', 40) + '</span>' +
          '<p>Para trocar a senha, informe a nova senha duas vezes.</p>' +
          '<button type="button" class="btn" id="b-senha">Trocar senha</button></section>' +
        (p.perfil !== 'empresa' ? '<section class="card bloco"><h2>PIN do tablet</h2><span class="icone-card" aria-hidden="true" style="font-size:34px">' + ui.icone('tablet', 34) + '</span>' +
          '<p>Seu PIN pessoal para o modo avaliador do Projeto Gol Testes (liberar refazer, tirar foto). 6 números. Ele é protegido no seu aparelho antes de ser enviado: ninguém vê o PIN, nem o sistema.</p>' +
          '<form class="form" id="f-pin" novalidate><label class="campo"><span>Novo PIN (6 números)</span><input class="entrada" id="m-pin1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>' +
          '<label class="campo"><span>Repita o PIN</span><input class="entrada" id="m-pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>' +
          '<button type="submit" class="btn btn-pri">Salvar PIN</button><span class="dica" id="m-pin-st"></span></form></section>' : '') +
      '</div>';

    // PIN do tablet: PBKDF2-SHA256 com sal próprio, feito aqui; só a versão protegida vai para o servidor
    var fpin = area.querySelector('#f-pin');
    if (fpin) {
      window.CF.sb.from('perfis_pin').select('atualizado_em').eq('perfil_id', p.id).maybeSingle().then(function (r) { var st = area.querySelector('#m-pin-st'); if (st && r && r.data) st.textContent = 'PIN cadastrado em ' + new Date(r.data.atualizado_em).toLocaleString('pt-BR') + '. Salvar de novo troca o PIN.'; });
      fpin.addEventListener('submit', async function (e) {
        e.preventDefault();
        var a = area.querySelector('#m-pin1').value, b = area.querySelector('#m-pin2').value;
        if (!/^\d{6}$/.test(a)) { ui.toast('O PIN precisa ter 6 números.', 'erro'); return; }
        if (/^(\d)\1{5}$/.test(a) || '0123456789'.indexOf(a) >= 0 || '9876543210'.indexOf(a) >= 0) { ui.toast('Escolha um PIN menos óbvio (sem números repetidos ou em sequência).', 'erro'); return; }
        if (a !== b) { ui.toast('Os dois PINs não são iguais.', 'erro'); return; }
        try {
          var salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''), iter = 150000;
          var chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(a), 'PBKDF2', false, ['deriveBits']);
          var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: iter }, chave, 256);
          var hash = Array.from(new Uint8Array(bits)).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
          var r = await window.CF.sb.rpc('meu_pin_definir', { p_salt: salt, p_hash: hash, p_iter: iter }); if (r.error) throw r.error;
          area.querySelector('#m-pin1').value = ''; area.querySelector('#m-pin2').value = '';
          area.querySelector('#m-pin-st').textContent = 'PIN salvo. Os tablets passam a aceitar o novo PIN na próxima atualização.'; ui.toast('PIN do tablet salvo.', 'ok');
        } catch (er) { ui.toast('Não foi possível salvar o PIN. ' + (er.message || ''), 'erro'); }
      });
    }
    function mostrarFoto() {
      window.CF.foto.preencherAvatar(area.querySelector('#m-foto'), p);
      area.querySelector('#b-foto-rem').classList.toggle('oculto', !p.foto_path);
      area.querySelector('#b-foto').textContent = p.foto_path ? 'Trocar foto' : 'Colocar foto';
    }
    mostrarFoto();
    area.querySelector('#b-foto').addEventListener('click', async function () {
      if (await window.CF.foto.trocar(p)) { mostrarFoto(); ctx.atualizarUsuario(); }
    });
    area.querySelector('#b-foto-rem').addEventListener('click', async function () {
      if (await window.CF.foto.remover(p)) { mostrarFoto(); ctx.atualizarUsuario(); }
    });

    function marcarTema() {
      var e = window.CF.tema.escolha();
      area.querySelectorAll('[data-opcao-tema]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-opcao-tema') === e)); });
    }
    area.querySelectorAll('[data-opcao-tema]').forEach(function (b) {
      b.addEventListener('click', function () { window.CF.tema.definir(b.getAttribute('data-opcao-tema')); marcarTema(); });
    });
    marcarTema();
    document.addEventListener('cf-tema', function () { if (document.body.contains(area.querySelector('[data-opcao-tema]'))) marcarTema(); });

    area.querySelector('#f-nome').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var nome = area.querySelector('#m-nome').value.trim().replace(/\s+/g, ' ');
      if (nome.length < 3) { ui.toast('Informe o nome completo.', 'erro'); return; }
      try {
        await api.atualizarNome(p.id, nome);
        p.nome = nome;
        ctx.atualizarUsuario();
        ui.toast('Nome atualizado.', 'ok');
      } catch (e) { ui.toast(api.traduzErro(e), 'erro'); }
    });

    area.querySelector('#b-senha').addEventListener('click', function () {
      var j = ui.janela({
        titulo: 'Trocar senha',
        corpo: ui.campoSenha('t-senha', 'Nova senha', 'new-password') +
          '<span class="dica">Pelo menos ' + C.senhaMinima + ' caracteres, com letras e números.</span>' +
          ui.campoSenha('t-senha2', 'Repita a nova senha', 'new-password'),
        botoes: [
          { texto: 'Cancelar', acao: 'fechar' },
          { texto: 'Salvar senha', principal: true, aoClicar: async function (el) {
              var s1 = el.querySelector('#t-senha').value, s2 = el.querySelector('#t-senha2').value;
              if (s1.length < C.senhaMinima || !/[a-zA-Z]/.test(s1) || !/[0-9]/.test(s1)) {
                ui.toast('A senha precisa ter pelo menos ' + C.senhaMinima + ' caracteres, com letras e números.', 'erro'); return false;
              }
              if (s1 !== s2) { ui.toast('As duas senhas não são iguais.', 'erro'); return false; }
              var r = await sb.auth.updateUser({ password: s1 });
              if (r.error) { ui.toast(api.traduzErro(r.error), 'erro'); return false; }
              var pf = window.CF.perfilAtual || {}; if (window.CF.offline && pf.email) window.CF.offline.guardarChave(pf.email, s1);   // a senha também serve para entrar sem internet
              ui.toast('Senha salva. Ela também serve para entrar sem internet.', 'ok');
              return true;
            } }
        ]
      });
      ui.ligarVerSenha(j.elemento);
    });
  };
})();
