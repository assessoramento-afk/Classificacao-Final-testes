/* =====================================================================
   Classificação Final · tema.js
   Tema escuro, claro ou automático (segue o aparelho).
   A escolha fica guardada neste aparelho.
   ===================================================================== */
(function () {
  'use strict';
  var CHAVE = 'cf_tema';
  var midia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var NOMES = { auto: 'Automático', escuro: 'Escuro', claro: 'Claro' };

  function escolha() {
    try { var v = localStorage.getItem(CHAVE); return (v === 'escuro' || v === 'claro') ? v : 'auto'; }
    catch (e) { return 'auto'; }
  }
  function efetivo(e) {
    e = e || escolha();
    if (e === 'auto') return (midia && midia.matches) ? 'claro' : 'escuro';
    return e;
  }
  function aplicar() {
    var t = efetivo();
    document.documentElement.setAttribute('data-tema', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'claro' ? '#f5f2f1' : '#141111');
    document.dispatchEvent(new CustomEvent('cf-tema', { detail: { escolha: escolha(), tema: t } }));
  }
  function definir(e) {
    try { if (e === 'auto') localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, e); } catch (x) { /* navegador sem armazenamento */ }
    aplicar();
  }
  if (midia) {
    var aoMudar = function () { if (escolha() === 'auto') aplicar(); };
    if (midia.addEventListener) midia.addEventListener('change', aoMudar); else if (midia.addListener) midia.addListener(aoMudar);
  }
  aplicar();

  window.CF = window.CF || {};
  window.CF.tema = { escolha: escolha, efetivo: efetivo, definir: definir, aplicar: aplicar, NOMES: NOMES };
})();
