/* =====================================================================
   Classificação Final · views/turmas.js
   #/cadastros/turmas · todas as turmas de todos os processos.
   Cada turma abre a tela de jovens daquela turma (onde fica o Kit da turma:
   crachás, lista de presença por dia, termos e materiais).
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var SIT = { montagem: ['Em montagem', '#8b6fd6'], andamento: ['Em andamento', '#ee7330'], revisao: ['Em revisão', '#3557e0'], liberado: ['Liberado', '#3f8f9a'], cancelado: ['Cancelado', '#6f6869'] };
  function dataBR(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function selo(s) { var x = SIT[s] || SIT.montagem; return '<span class="st" style="--sc:' + x[1] + '"><i></i>' + esc(x[0]) + '</span>'; }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.turmasTodas = async function (area) {
    var st = { filtro: 'proximas', busca: '' }, ag, parts;
    area.innerHTML = '<a class="voltar" href="#/cadastros">← Cadastros</a><div id="tt"><div class="girando" style="margin:30px auto"></div></div>';
    var box = area.querySelector('#tt');
    try { var r = await Promise.all([dados.agenda.carregarTudo(), dados.jovens.todasParticipacoes()]); ag = r[0]; parts = r[1]; }
    catch (e) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    var hoje = hojeISO();
    var lista = ag.turmas.map(function (t) {
      var p = (ag.processos || []).filter(function (x) { return x.id === t.processo_id; })[0] || {};
      var e = (ag.empresas || []).filter(function (x) { return x.id === p.empresa_id; })[0] || {};
      var dias = ag.dias.filter(function (d) { return d.turma_id === t.id; }).map(function (d) { return String(d.data).slice(0, 10); }).sort();
      var momento = !dias.length ? 'sem data' : (dias[dias.length - 1] < hoje ? 'encerrada' : (dias[0] <= hoje ? 'hoje' : 'proxima'));
      return { t: t, p: p, e: e, dias: dias, momento: momento, jovens: parts.filter(function (x) { return x.turma_id === t.id; }).length };
    });
    function desenhar() {
      var cnt = { proximas: 0, encerradas: 0 };
      lista.forEach(function (x) { if (x.momento === 'encerrada') cnt.encerradas++; else cnt.proximas++; });
      var vis = lista.filter(function (x) {
        if (st.filtro === 'proximas' && x.momento === 'encerrada') return false;
        if (st.filtro === 'encerradas' && x.momento !== 'encerrada') return false;
        if (st.busca) { var b = ui.normalizar(st.busca); if (ui.normalizar(x.t.nome + ' ' + (x.e.nome_fantasia || '') + ' ' + (x.p.vaga || '')).indexOf(b) < 0) return false; }
        return true;
      }).sort(function (a, b) {
        var da = a.dias[0] || '9999', db = b.dias[0] || '9999';
        return st.filtro === 'encerradas' ? db.localeCompare(da) : da.localeCompare(db);
      });
      box.innerHTML = '<header class="cabecalho"><div><h1>Turmas</h1><p>Todas as turmas dos processos seletivos. Abra uma turma para ver os jovens e imprimir o Kit da turma.</p></div></header>' +
        '<section class="card pt-tab"><div class="pt-filtros">' + [['proximas', 'Próximas e de hoje', cnt.proximas], ['encerradas', 'Encerradas', cnt.encerradas], ['todas', 'Todas', lista.length]].map(function (f) {
          return '<button type="button" class="pt-chip' + (st.filtro === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + ' ' + f[2] + '</button>'; }).join('') +
          '<input class="entrada" id="tt-busca" type="search" placeholder="Buscar turma, empresa ou vaga" value="' + esc(st.busca) + '"></div>' +
        (vis.length ? '<div class="tabela-rolar"><table class="pt-rk"><thead><tr><th>Turma</th><th>Datas</th><th>Jovens</th><th>Processo</th><th></th></tr></thead><tbody>' +
          vis.map(function (x) {
            var cor = x.momento === 'hoje' ? '#ee7330' : (x.momento === 'encerrada' ? '#8a8486' : '#3f8f9a');
            return '<tr style="--c:' + cor + '"><td class="pt-nm pt-barra"><b>' + esc(x.t.nome) + '</b><small>' + esc((x.e.nome_fantasia || x.e.razao_social || '') + ' · ' + (x.p.vaga || '')) + '</small></td>' +
              '<td>' + (x.dias.length ? x.dias.map(dataBR).join(' e ') : '<span class="dica">sem data</span>') + (x.momento === 'hoje' ? ' <span class="tt-hoje">hoje</span>' : '') + '</td>' +
              '<td><b>' + x.jovens + '</b>' + (x.t.vagas ? ' <span class="dica">de ' + x.t.vagas + '</span>' : '') + '</td>' +
              '<td>' + selo(x.p.situacao) + '</td>' +
              '<td style="text-align:right"><a class="btn btn-p" href="#/processos/' + x.p.id + '/jovens?turma=' + x.t.id + '">Abrir turma</a></td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="dica" style="margin:6px 0 0">Nenhuma turma neste filtro.</p>') + '</section>';
      box.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { st.filtro = b.getAttribute('data-f'); desenhar(); }); });
      var bus = box.querySelector('#tt-busca');
      bus.addEventListener('input', function () { st.busca = bus.value; var pos = bus.selectionStart; desenhar(); var n = box.querySelector('#tt-busca'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ok */ } });
    }
    desenhar();
  };
})();
