/* =====================================================================
   Classificação Final · vista.js
   Botão "▦ Cartões | ☰ Lista" nas telas de lista.
   · funciona sozinho: observa a tela e prepara cada tabela de lista
   · em Cartões, cada linha vira um cartão (barra colorida da situação,
     título em destaque, campos com rótulo e os botões no fim)
   · lembra a escolha de cada tela neste aparelho
   · Classificação, notas, revisão, permissões e modelos começam em Lista
   ===================================================================== */
(function () {
  'use strict';
  var SEL = '.conteudo table.tabela:not(.mini):not(.sem-vista), .conteudo table.pt-rk:not(.sem-vista)';
  var COR = { 'pill-sim': '#3FA66B', 'pill-ok': '#3FA66B', 'pill-nao': '#D9534F', 'pill-off': '#8a8486', 'pill-neu': '#8a8486' };
  function rota() { return (window.location.hash || '#/').replace(/^#\/?/, '').split('/').filter(function (p) { return !/^[0-9a-f-]{8,}$/i.test(p); }).join('/') || 'inicio'; }
  function padrao() { return /classificacao|notas|revisao|permissoes|modelos|avaliar|saude/.test(rota()) ? 'lista' : 'cards'; }
  function chave(i) { return 'cf_vista:' + rota() + ':' + i; }
  function ler(i) { try { return localStorage.getItem(chave(i)) || padrao(); } catch (e) { return padrao(); } }
  function gravar(i, v) { try { localStorage.setItem(chave(i), v); } catch (e) { /* sem armazenamento */ } }

  function preparar(tab, i) {
    if (tab.getAttribute('data-vista')) return;
    var ths = Array.prototype.map.call(tab.querySelectorAll('thead tr:last-child th'), function (th) { return th.textContent.trim(); });
    var linhas = tab.querySelectorAll('tbody tr');
    if (!linhas.length || linhas.length === 1 && linhas[0].children.length < 2) return;   // lista vazia ou só uma mensagem
    tab.setAttribute('data-vista', '1');
    Array.prototype.forEach.call(linhas, function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, k) { if (ths[k] && !td.getAttribute('data-r')) td.setAttribute('data-r', ths[k]); });
      if (!tr.style.getPropertyValue('--c')) {   // cor da barra: a da situação mostrada na linha
        var p = tr.querySelector('.pill, .st, .pl'), c = null;
        if (p) Object.keys(COR).forEach(function (k) { if (p.classList.contains(k)) c = COR[k]; });
        if (!c && p && p.style.getPropertyValue('--sc')) c = p.style.getPropertyValue('--sc');
        if (c) tr.style.setProperty('--vc', c);
      }
    });
    var caixa = tab.closest('.tabela-card') || tab.closest('.card') || tab.parentElement;
    if (!caixa.previousElementSibling || !caixa.previousElementSibling.classList.contains('vista-bar')) {
      var bar = document.createElement('div'); bar.className = 'vista-bar';
      bar.innerHTML = '<div class="vista-alt" role="group" aria-label="Como mostrar a lista"><button type="button" data-v="cards">▦ Cartões</button><button type="button" data-v="lista">☰ Lista</button></div>';
      caixa.parentNode.insertBefore(bar, caixa);
      bar.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; gravar(i, b.getAttribute('data-v')); aplicar(caixa, bar, b.getAttribute('data-v')); });
      aplicar(caixa, bar, ler(i));
    }
  }
  function aplicar(caixa, bar, v) {
    caixa.classList.toggle('vista-cards', v === 'cards');
    bar.querySelectorAll('[data-v]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === v)); });
  }
  /* Ícones de linha no lugar dos emojis dos botões (revisão visual 4.17) */
  var P = { '⬇': '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', '⬆': '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>', '📱': '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    '👁': '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', '🖨': '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
    '⟳': '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>', '📄': '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>', '🔄': '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>' };
  var RX = /^\s*(⬇|⬆|📱|👁|🖨|⟳|📄|🔄)\uFE0F?\s*/;
  function icones(raiz) {
    raiz.querySelectorAll('.btn:not([data-ic]), .selo-tab:not([data-ic])').forEach(function (b) {
      b.setAttribute('data-ic', '1');
      var n = b.firstChild; while (n && n.nodeType !== 3 && n.nodeName !== 'SVG') n = n.nextSibling;
      if (!n || n.nodeType !== 3) return; var m = n.nodeValue.match(RX); if (!m) return;
      n.nodeValue = n.nodeValue.replace(RX, '');
      var sp = document.createElement('span'); sp.className = 'ic-l'; sp.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[m[1]] + '</svg>';
      b.insertBefore(sp, n);
    });
  }
  var pend = null;
  function varrer() { pend = null; document.querySelectorAll(SEL).forEach(function (t, i) { preparar(t, i); }); icones(document); }
  var obs = new MutationObserver(function () { if (!pend) pend = setTimeout(varrer, 60); });
  function iniciar() { var c = document.body; if (c) obs.observe(c, { childList: true, subtree: true }); varrer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
