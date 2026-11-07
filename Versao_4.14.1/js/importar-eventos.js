/* =====================================================================
   Classificação Final · importar-eventos.js
   Lê o PDF do Calendário Estadual (tabela MÊS · DIA · SEMANA · ATIVIDADES)
   e devolve a lista de eventos para conferir antes de salvar.
   · dia "-" (sem data) vira lembrete do mês inteiro
   · "23 e 24", "24 a 26" viram períodos
   · confere o dia da semana escrito no PDF com a data e avisa quando não bate
   · feriados que já estão no sistema vêm desmarcados
   ===================================================================== */
(function () {
  'use strict';
  var MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  var SEM = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, 'SÁB': 6, SAB: 6 };
  var carregando = null;
  function carregarLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (carregando) return carregando;
    carregando = new Promise(function (ok, falha) {
      var s = document.createElement('script'); s.src = 'vendor/pdfjs/pdf.min.js';
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js'; ok(window.pdfjsLib); };
      s.onerror = function () { falha(new Error('Não foi possível carregar o leitor de PDF.')); };
      document.head.appendChild(s);
    });
    return carregando;
  }
  function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function pad(n) { return ('0' + n).slice(-2); }
  function iso(a, m, d) { return a + '-' + pad(m + 1) + '-' + pad(d); }
  function ultimoDia(a, m) { return new Date(a, m + 1, 0).getDate(); }

  async function ler(arquivo) {
    var pdfjs = await carregarLib();
    var doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
    var itens = [], textoTodo = '';
    for (var p = 1; p <= doc.numPages; p++) {
      var pg = await doc.getPage(p), tc = await pg.getTextContent(), alt = pg.getViewport({ scale: 1 }).height;
      tc.items.forEach(function (it) { var t = norm(it.str); if (!t) return; itens.push({ t: t, x: it.transform[4], w: it.width || 0, y: (p - 1) * 2000 + (alt - it.transform[5]) }); textoTodo += it.str; });
    }
    var anoM = textoTodo.replace(/\s+/g, '').toUpperCase().match(/CALEND[^0-9]{0,40}(20\d\d)/) || textoTodo.match(/20\d\d/);
    var ano = anoM ? +(anoM[1] || anoM[0]) : new Date().getFullYear();
    // colunas pelo cabeçalho (MÊS · DIA · SEMANA · ATIVIDADES)
    var cab = {}; itens.forEach(function (i) { var u = i.t.toUpperCase(); if (['MÊS', 'DIA', 'SEMANA', 'ATIVIDADES'].indexOf(u) >= 0 && !cab[u]) cab[u] = i; });
    if (!cab.DIA || !cab.ATIVIDADES || !cab.SEMANA) throw new Error('Não encontrei as colunas DIA, SEMANA e ATIVIDADES neste PDF.');
    var limMes = cab.DIA.x - 25, limDia = (cab.DIA.x + cab.DIA.w + cab.SEMANA.x) / 2 + 8, limSem = cab.SEMANA.x + cab.SEMANA.w + 5, yCab = cab.ATIVIDADES.y;
    // linhas pela altura
    var corpo = itens.filter(function (i) { return i.y > yCab + 3; }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var linhas = [];
    corpo.forEach(function (i) {
      var l = linhas.filter(function (x) { return Math.abs(x.y - i.y) < 4; })[0];
      if (!l) { l = { y: i.y, itens: [] }; linhas.push(l); }
      l.itens.push(i);
    });
    linhas.sort(function (a, b) { return a.y - b.y; });
    function juntar(lista) {   // junta pedaços de texto; espaço só onde há distância entre eles
      var out = '', fim = null;
      lista.sort(function (a, b) { return a.x - b.x; }).forEach(function (i) { out += (fim != null && i.x - fim > 1.5 ? ' ' : '') + i.t; fim = i.x + i.w; });
      return norm(out);
    }
    var res = [], mesAtual = -1, ultDia = 0;
    linhas.forEach(function (l) {
      var mes = juntar(l.itens.filter(function (i) { return i.x < limMes; })).toUpperCase().replace(/\s/g, '');
      if (MESES.indexOf(mes) >= 0 && mesAtual < 0) mesAtual = MESES.indexOf(mes);
      var dia = juntar(l.itens.filter(function (i) { return i.x >= limMes && i.x < limDia; }));
      var sem = juntar(l.itens.filter(function (i) { return i.x >= limDia && i.x < limSem; })).toUpperCase().replace(/\s/g, '');
      var atv = juntar(l.itens.filter(function (i) { return i.x >= limSem; }));
      if (!dia || !atv) return;   // rodapé e linhas sem dia
      var m = dia.match(/^(\d{1,2})(?:\s*(?:e|a|-|até)\s*(\d{1,2}))?/i);
      if (!m) {   // "-": sem dia definido → lembrete do mês inteiro
        if (mesAtual < 0) return;
        res.push({ tipo: 'lembrete', titulo: atv, data_ini: iso(ano, mesAtual, 1), data_fim: iso(ano, mesAtual, ultimoDia(ano, mesAtual)), aviso: '' });
        return;
      }
      var d1 = +m[1], d2 = m[2] ? +m[2] : d1, w = SEM[sem.split('/')[0]];
      if (mesAtual < 0) mesAtual = 0;
      if (d1 < ultDia && mesAtual < 11) mesAtual++;   // o dia voltou: começou o mês seguinte
      ultDia = d1;
      var real = new Date(ano, mesAtual, d1).getDay(), aviso = '';
      if (w != null && real !== w) aviso = 'No PDF está "' + sem + '", mas ' + pad(d1) + '/' + pad(mesAtual + 1) + ' é ' + ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][real] + '.';
      res.push({ tipo: 'kolping', titulo: atv, data_ini: iso(ano, mesAtual, d1), data_fim: iso(ano, mesAtual, Math.max(d1, d2)), aviso: aviso });
    });
    return { ano: ano, eventos: res };
  }
  /* ---------- Janela: escolher o PDF, conferir e salvar ---------- */
  function abrir(aoSalvar) {
    var ui = window.CF.ui, esc = ui.esc;
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf';
    inp.addEventListener('change', async function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      ui.toast('Lendo o PDF…', 'info');
      var r, existentes = [];
      try { r = await ler(f); existentes = window.CF.agendaG ? await window.CF.agendaG.especiais() : []; }
      catch (e) { ui.toast(e.message || 'Não foi possível ler este PDF.', 'erro'); return; }
      if (!r.eventos.length) { ui.toast('Não encontrei eventos neste PDF. Ele precisa ter a tabela MÊS · DIA · SEMANA · ATIVIDADES.', 'erro'); return; }
      // já é feriado ou já foi importado: vem desmarcado
      r.eventos.forEach(function (e) {
        var mesmoDia = existentes.filter(function (x) { return x.data_ini === e.data_ini; });
        e.feriado = mesmoDia.some(function (x) { return x.tipo === 'feriado' || x.tipo === 'ponto'; }) && /paix|trabalho|corpus|aparecida|finados|consci|natal|tiradentes|independ|proclama|confraterniza/i.test(e.titulo);
        e.repetido = mesmoDia.some(function (x) { return x.tipo === e.tipo && ui.normalizar(x.titulo) === ui.normalizar(e.titulo); });
        e.marcado = !e.feriado && !e.repetido;
      });
      function linhas() {
        return r.eventos.map(function (e, i) {
          return '<tr class="' + (e.marcado ? '' : 'ie-off') + '"><td><input type="checkbox" data-ck="' + i + '"' + (e.marcado ? ' checked' : '') + ' aria-label="Importar"></td>' +
            '<td><input class="entrada ie-d" type="date" data-di="' + i + '" value="' + e.data_ini + '"></td><td><input class="entrada ie-d" type="date" data-df="' + i + '" value="' + e.data_fim + '"></td>' +
            '<td><input class="entrada" data-ti="' + i + '" value="' + esc(e.titulo) + '"></td>' +
            '<td><select class="entrada" data-tp="' + i + '"><option value="kolping"' + (e.tipo === 'kolping' ? ' selected' : '') + '>Kolping Estadual</option><option value="lembrete"' + (e.tipo === 'lembrete' ? ' selected' : '') + '>Lembrete do mês</option></select></td>' +
            '<td class="ie-av">' + (e.aviso ? '⚠ ' + esc(e.aviso) : '') + (e.feriado ? 'Já está nos feriados' : '') + (e.repetido ? 'Já importado' : '') + '</td></tr>';
        }).join('');
      }
      var n = function () { return r.eventos.filter(function (e) { return e.marcado; }).length; };
      var jan = ui.janela({
        titulo: 'Importar eventos · Calendário ' + r.ano, confirmarDescarte: false, largura: 1100,
        corpo: '<p class="dica" style="margin:0 0 8px">Confira antes de salvar. Linhas com ⚠ têm o dia da semana do PDF diferente da data: a data foi mantida. Feriados que já estão no sistema e eventos já importados vêm desmarcados.</p>' +
          '<div class="tabela-rolar ie-tab"><table class="tabela"><thead><tr><th></th><th>De</th><th>Até</th><th>Evento</th><th>Tipo</th><th>Aviso</th></tr></thead><tbody id="ie-l">' + linhas() + '</tbody></table></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar ' + n() + ' evento(s)', principal: true, aoClicar: async function () {
          var sel = r.eventos.filter(function (e) { return e.marcado && e.titulo.trim() && e.data_ini; });
          if (!sel.length) { ui.toast('Marque pelo menos um evento.', 'erro'); return false; }
          try {
            var x = await window.CF.sb.rpc('especiais_salvar', { p: sel.map(function (e) { return { tipo: e.tipo, titulo: e.titulo.trim(), detalhe: 'Calendário Estadual ' + r.ano + (e.tipo === 'lembrete' ? ' · mês inteiro' : ''), data_ini: e.data_ini, data_fim: e.data_fim < e.data_ini ? e.data_ini : e.data_fim, origem: 'pdf' }; }) });
            if (x.error) throw x.error;
            ui.toast(sel.length + ' evento(s) importado(s). Eles vão para a Google Agenda na próxima atualização.', 'ok');
            if (aoSalvar) aoSalvar(); return true;
          } catch (e) { ui.toast(window.CF.api.traduzErro(e), 'erro'); return false; }
        } }]
      });
      var el = jan && jan.elemento ? jan.elemento : document;
      function rotulo() { var b = el.querySelector('.janela-pe .btn-pri'); if (b) b.textContent = 'Salvar ' + n() + ' evento(s)'; }
      el.querySelector('#ie-l').addEventListener('input', function (ev) {
        var t = ev.target, i;
        if (t.hasAttribute('data-ck')) { i = +t.getAttribute('data-ck'); r.eventos[i].marcado = t.checked; t.closest('tr').classList.toggle('ie-off', !t.checked); rotulo(); }
        if (t.hasAttribute('data-di')) r.eventos[+t.getAttribute('data-di')].data_ini = t.value;
        if (t.hasAttribute('data-df')) r.eventos[+t.getAttribute('data-df')].data_fim = t.value;
        if (t.hasAttribute('data-ti')) r.eventos[+t.getAttribute('data-ti')].titulo = t.value;
        if (t.hasAttribute('data-tp')) r.eventos[+t.getAttribute('data-tp')].tipo = t.value;
      });
      el.querySelector('#ie-l').addEventListener('change', function (ev) { if (ev.target.hasAttribute('data-tp')) r.eventos[+ev.target.getAttribute('data-tp')].tipo = ev.target.value; });
    });
    inp.click();
  }
  window.CF.importarEventos = { ler: ler, carregarLib: carregarLib, abrir: abrir };
})();
