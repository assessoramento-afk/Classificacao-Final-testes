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
      '<div class="grade">' +
        '<section class="card bloco"><h2>Foto do perfil</h2>' +
          '<div class="foto-bloco"><span class="avatar foto-grande" id="m-foto"></span>' +
          '<div style="display:flex;flex-direction:column;gap:10px;flex:1;min-width:160px">' +
            '<p>Aparece no topo do sistema e no histórico de alterações.</p>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-pri" id="b-foto">Trocar foto</button>' +
            '<button type="button" class="btn" id="b-foto-rem">Remover</button></div></div></div></section>' +
        '<section class="card bloco"><h2>Nome</h2>' +
          '<form class="form" id="f-nome" novalidate>' +
            '<label class="campo" for="m-nome"><span>Nome completo <span class="obrig">*</span></span>' +
            '<input class="entrada" id="m-nome" type="text" maxlength="120" autocomplete="name" value="' + esc(p.nome) + '"></label>' +
            '<button type="submit" class="btn btn-pri" style="align-self:flex-start">Salvar nome</button>' +
          '</form></section>' +
        '<section class="card bloco"><h2>Aparência</h2>' +
          '<div class="segmentos" role="group" aria-label="Tema">' +
            ['auto', 'escuro', 'claro'].map(function (k) { return '<button type="button" data-tema="' + k + '">' + esc(window.CF.tema.NOMES[k]) + '</button>'; }).join('') +
          '</div><span class="dica">Automático segue o tema do seu celular ou computador.</span></section>' +
        '<section class="card bloco"><h2>Senha</h2>' +
          '<p>Para trocar a senha, informe a nova senha duas vezes.</p>' +
          '<button type="button" class="btn" id="b-senha" style="align-self:flex-start">Trocar senha</button></section>' +
      '</div>';

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
      area.querySelectorAll('[data-tema]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tema') === e)); });
    }
    area.querySelectorAll('[data-tema]').forEach(function (b) {
      b.addEventListener('click', function () { window.CF.tema.definir(b.getAttribute('data-tema')); marcarTema(); });
    });
    marcarTema();
    document.addEventListener('cf-tema', function () { if (document.body.contains(area.querySelector('[data-tema]'))) marcarTema(); });

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
              ui.toast('Senha alterada com sucesso.', 'ok');
              return true;
            } }
        ]
      });
      ui.ligarVerSenha(j.elemento);
    });
  };
})();
