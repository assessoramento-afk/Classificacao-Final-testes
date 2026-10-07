/* =====================================================================
   Classificação Final · inatividade.js
   Saída automática após 30 minutos sem uso. Aos 28 minutos aparece
   "Você ainda está aí?" com contagem regressiva. Considera todas as
   abas abertas do sistema no mesmo aparelho.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui;
  var CHAVE = 'cf_ultima_atividade';
  var LIMITE = (window.__CF_TESTE_INATIVIDADE_MS || 30 * 60 * 1000);
  var AVISO = (window.__CF_TESTE_AVISO_MS || 2 * 60 * 1000);
  var estado = { ativo: false, timer: null, janela: null, aoSair: null, ultimaGravacao: 0 };

  function agora() { return Date.now(); }
  function ultima() { var v = 0; try { v = parseInt(localStorage.getItem(CHAVE), 10) || 0; } catch (e) { /* sem armazenamento */ } return Math.max(v, estado.local || 0); }
  function registrar() {
    if (!estado.ativo) return;
    estado.local = agora();
    if (estado.local - estado.ultimaGravacao > 5000) {
      estado.ultimaGravacao = estado.local;
      try { localStorage.setItem(CHAVE, String(estado.local)); } catch (e) { /* ignora */ }
    }
  }
  ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function (ev) { window.addEventListener(ev, registrar, { passive: true, capture: true }); });

  function fecharAviso() { if (estado.janela) { estado.janela.remove(); estado.janela = null; } }

  function mostrarAviso(restanteMs) {
    if (estado.janela) { atualizarContagem(restanteMs); return; }
    var f = document.createElement('div');
    f.className = 'janela-fundo'; f.style.zIndex = '95';
    f.innerHTML = '<div class="janela card" role="alertdialog" aria-modal="true" aria-labelledby="in-tit" style="max-width:440px">' +
      '<div class="janela-corpo" style="align-items:center;text-align:center"><h2 id="in-tit" style="font-size:20px">Você ainda está aí?</h2>' +
      '<p style="margin:0;color:var(--texto-2)">Por segurança, o sistema vai sair em <b id="in-cont"></b> por falta de uso.</p></div>' +
      '<div class="janela-pe" style="justify-content:center"><button type="button" class="btn" data-a="sair">Sair agora</button><button type="button" class="btn btn-pri" data-a="ficar">Continuar conectado</button></div></div>';
    f.querySelector('[data-a=ficar]').addEventListener('click', function () { registrar(); fecharAviso(); });
    f.querySelector('[data-a=sair]').addEventListener('click', function () { sair(false); });
    document.body.appendChild(f);
    estado.janela = f;
    f.querySelector('[data-a=ficar]').focus();
    atualizarContagem(restanteMs);
  }
  function atualizarContagem(ms) {
    var el = estado.janela && estado.janela.querySelector('#in-cont'); if (!el) return;
    var s = Math.max(0, Math.ceil(ms / 1000));
    el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function verificar() {
    if (!estado.ativo) return;
    var parado = agora() - ultima();
    if (parado >= LIMITE) { sair(true); return; }
    if (parado >= LIMITE - AVISO) mostrarAviso(LIMITE - parado);
    else if (estado.janela) fecharAviso();
  }

  function sair(porTempo) {
    parar();
    if (estado.aoSair) estado.aoSair(porTempo);
  }

  function iniciar(aoSair) {
    estado.aoSair = aoSair; estado.ativo = true; estado.local = agora();
    try { localStorage.setItem(CHAVE, String(estado.local)); } catch (e) { /* ignora */ }
    clearInterval(estado.timer);
    estado.timer = setInterval(verificar, 1000);
    document.addEventListener('visibilitychange', verificar);
  }
  function parar() {
    estado.ativo = false; clearInterval(estado.timer); estado.timer = null; fecharAviso();
    document.removeEventListener('visibilitychange', verificar);
  }

  window.CF.inatividade = { iniciar: iniciar, parar: parar };
})();
