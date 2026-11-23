/* =====================================================================
   Classificação Final · etapas.js
   Transforma uma janela comprida em etapas: barra de etapas no topo,
   "← Voltar" e "Avançar →" no rodapé e uma etapa final "Conferir" com
   "alterar" para voltar direto a qualquer etapa. O botão principal da
   janela (Criar turma / Salvar) só aparece no Conferir.
   Uso: CF.etapas(janela, [{ nome, els: [elementos], validar: fn → texto|null }], resumo: fn → [[rótulo, texto, índice]])
   ===================================================================== */
(function () {
  'use strict';
  window.CF.etapas = function (j, etapas, resumo, opcoes) {
    var ui = window.CF.ui, esc = ui.esc, el = j.elemento, corpo = el.querySelector('.janela-corpo'), pe = el.querySelector('.janela-pe');
    var princ = pe.querySelector('.btn-pri'), outros = [].filter.call(pe.querySelectorAll('button'), function (b) { return b !== princ; });
    var todas = etapas.concat([{ nome: 'Conferir', els: [] }]), ult = todas.length - 1, atual = 0;
    var barra = document.createElement('div'); barra.className = 'et-pass';
    barra.innerHTML = todas.map(function (e, i) { return '<div data-et="' + i + '"><i></i><span>' + (i + 1) + ' · ' + esc(e.nome) + '</span></div>'; }).join('');
    corpo.parentNode.insertBefore(barra, corpo);
    var conf = document.createElement('div'); conf.className = 'et-conf'; corpo.appendChild(conf);
    var cab = document.createElement('div'); cab.className = 'et-cab'; corpo.insertBefore(cab, corpo.firstChild);
    var voltar = document.createElement('button'); voltar.type = 'button'; voltar.className = 'btn'; voltar.textContent = '← Voltar';
    var avancar = document.createElement('button'); avancar.type = 'button'; avancar.className = 'btn btn-pri'; avancar.textContent = 'Avançar →';
    pe.insertBefore(voltar, princ); pe.insertBefore(avancar, princ);
    function ir(i) {
      atual = i;
      todas.forEach(function (e, k) { (e.els || []).forEach(function (n) { if (n) n.style.display = k === i ? '' : 'none'; }); });
      conf.style.display = i === ult ? '' : 'none';
      cab.innerHTML = '<b>' + esc(todas[i].nome) + '</b><small>Etapa ' + (i + 1) + ' de ' + todas.length + (i === ult ? ' · toque em "alterar" para voltar a uma etapa' : '') + '</small>';
      if (i === ult) {
        conf.innerHTML = '<div class="et-res">' + resumo().map(function (r) { return '<div><span>' + esc(r[0]) + '</span><p>' + r[1] + '</p>' + (r[2] != null ? '<a href="#" data-alt="' + r[2] + '">alterar</a>' : '') + '</div>'; }).join('') + '</div>';
        conf.querySelectorAll('[data-alt]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); ir(+a.getAttribute('data-alt')); }); });
      }
      princ.style.display = i === ult ? '' : 'none'; avancar.style.display = i === ult ? 'none' : '';
      voltar.style.display = i > 0 ? '' : 'none'; outros.forEach(function (b) { b.style.display = i === 0 ? '' : 'none'; });
      barra.querySelectorAll('[data-et]').forEach(function (d) { var k = +d.getAttribute('data-et'); d.className = k < i ? 'ok' : (k === i ? 'on' : ''); d.querySelector('span').textContent = (k < i ? '✓ ' : (k + 1) + ' · ') + todas[k].nome; });
      corpo.scrollTop = 0;
    }
    avancar.addEventListener('click', function () { var v = todas[atual].validar ? todas[atual].validar() : null; if (v) { ui.toast(v, 'erro'); return; } ir(atual + 1); });
    voltar.addEventListener('click', function () { ir(Math.max(0, atual - 1)); });
    ir(opcoes && opcoes.inicio === 'conferir' ? ult : 0);
    return { ir: ir };
  };
})();
