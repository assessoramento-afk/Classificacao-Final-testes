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

/* iPhone com o app instalado: em alguns aparelhos a margem da barra de cima (relógio e bateria) vem zerada.
   Mede e, se precisar, usa a altura padrão da barra para o topo do sistema não ficar por baixo dela. */
(function () {
  function ajustar() {
    try {
      var ios = /iphone|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      var app = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      if (!ios || !app || !document.body) return;
      var t = document.createElement('div');
      t.style.cssText = 'position:fixed;top:0;left:0;height:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
      document.body.appendChild(t);
      var medido = parseFloat(getComputedStyle(t).paddingTop) || 0; t.remove();
      if (medido > 0) { document.documentElement.style.removeProperty('--seguro-topo'); return; }
      var deitado = window.innerWidth > window.innerHeight;
      var alto = Math.max(screen.width, screen.height) >= 812;
      document.documentElement.style.setProperty('--seguro-topo', deitado ? '0px' : (alto ? '50px' : '20px'));
    } catch (e) { /* mantém o padrão */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ajustar); else ajustar();
  window.addEventListener('orientationchange', function () { setTimeout(ajustar, 300); });
  window.addEventListener('resize', ajustar);
})();
