/* =====================================================================
   Classificação Final · calendario.js
   Datas no formato 'AAAA-MM-DD' (dia local) e um calendário para
   escolher dias, mostrando os dias já ocupados riscados.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc;
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function data(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hoje() { return iso(new Date()); }
  function somarDias(s, n) { var d = data(s); d.setDate(d.getDate() + n); return iso(d); }
  function diasEntre(a, b) { return Math.round((data(b) - data(a)) / 86400000); }
  function curta(s) { var d = data(s); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); }
  function longa(s) { var d = data(s); return SEMANA_LONGA[d.getDay()] + ' ' + curta(s); }
  function completa(s) { var d = data(s); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function listaDias(lista) { return lista.slice().sort().map(longa).join(' e '); }
  function mesAno(ano, mes) { return MESES[mes] + ' ' + ano; }

  /* Calendário de escolha.
     opcoes: { selecionados: [], max: 1|2|31, ocupados: { 'AAAA-MM-DD': 'texto' }, aoMudar: fn(lista) } */
  function escolher(el, opcoes) {
    var sel = (opcoes.selecionados || []).slice().sort();
    var base = data(sel[0] || hoje());
    var ano = base.getFullYear(), mes = base.getMonth();
    function desenhar() {
      var primeiro = new Date(ano, mes, 1), dias = new Date(ano, mes + 1, 0).getDate();
      var h = hoje();
      var celulas = SEMANA.map(function (s) { return '<span class="cal-cab">' + s[0] + '</span>'; }).join('');
      for (var i = 0; i < primeiro.getDay(); i++) celulas += '<span class="cal-vazio"></span>';
      for (var d = 1; d <= dias; d++) {
        var s = iso(new Date(ano, mes, d)), dow = new Date(ano, mes, d).getDay();
        var ocup = opcoes.ocupados && opcoes.ocupados[s], passado = s < h, escolhido = sel.indexOf(s) >= 0;
        var cls = 'cal-dia' + (escolhido ? ' sel' : '') + (ocup ? ' ocup' : '') + (passado ? ' passado' : '') + (dow === 0 || dow === 6 ? ' fds' : '') + (s === h ? ' hoje' : '');
        var tit = ocup ? 'Ocupado: ' + ocup : (passado ? 'Data passada' : longa(s));
        celulas += '<button type="button" class="' + cls + '" data-dia="' + s + '"' + (ocup || passado ? ' disabled' : '') + ' aria-pressed="' + escolhido + '" title="' + esc(tit) + '" aria-label="' + esc(tit) + '">' + d + '</button>';
      }
      el.innerHTML = '<div class="cal-nav"><button type="button" class="btn btn-p" data-nav="-1" aria-label="Mês anterior">‹</button><b>' + esc(mesAno(ano, mes)) + '</b><button type="button" class="btn btn-p" data-nav="1" aria-label="Próximo mês">›</button></div>' +
        '<div class="cal-grade">' + celulas + '</div>';
      el.querySelectorAll('[data-nav]').forEach(function (b) {
        b.addEventListener('click', function () { mes += +b.getAttribute('data-nav'); if (mes < 0) { mes = 11; ano--; } if (mes > 11) { mes = 0; ano++; } desenhar(); });
      });
      el.querySelectorAll('[data-dia]').forEach(function (b) {
        b.addEventListener('click', function () {
          var s = b.getAttribute('data-dia'), i = sel.indexOf(s);
          if (i >= 0) sel.splice(i, 1);
          else if (opcoes.max === 1) sel = [s];
          else if (sel.length >= opcoes.max) { ui.toast('Escolha no máximo ' + opcoes.max + ' dia(s). Clique num dia escolhido para tirá-lo.', 'erro'); return; }
          else sel.push(s);
          sel.sort(); desenhar();
          if (opcoes.aoMudar) opcoes.aoMudar(sel.slice());
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
    }
    desenhar();
    return {
      valor: function () { return sel.slice(); },
      definirMax: function (m) { opcoes.max = m; if (sel.length > m) { sel = sel.slice(0, m); desenhar(); if (opcoes.aoMudar) opcoes.aoMudar(sel.slice()); } }
    };
  }

  window.CF.datas = { iso: iso, data: data, hoje: hoje, somarDias: somarDias, diasEntre: diasEntre, curta: curta, longa: longa, completa: completa,
    listaDias: listaDias, mesAno: mesAno, MESES: MESES, SEMANA: SEMANA };
  window.CF.calendario = { escolher: escolher };
})();
