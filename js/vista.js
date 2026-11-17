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
  var pend = null;
  function varrer() { pend = null; document.querySelectorAll(SEL).forEach(function (t, i) { preparar(t, i); }); }
  var obs = new MutationObserver(function () { if (!pend) pend = setTimeout(varrer, 60); });
  function iniciar() { var c = document.body; if (c) obs.observe(c, { childList: true, subtree: true }); varrer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
