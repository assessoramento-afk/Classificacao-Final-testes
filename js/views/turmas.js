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
    var G = window.CF.agendaG, gev = [], pend = [];
    async function carregar() {
      var r = await Promise.all([dados.agenda.carregarTudo(), dados.jovens.todasParticipacoes(), G ? G.eventosGoogle() : [], G ? G.pendentes() : []]);
      ag = r[0]; parts = r[1]; gev = r[2]; pend = r[3];
    }
    try { await carregar(); }
    catch (e) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    var hoje = hojeISO(), lista;
    function montar() { lista = ag.turmas.map(function (t) {
      var p = (ag.processos || []).filter(function (x) { return x.id === t.processo_id; })[0] || {};
      var e = (ag.empresas || []).filter(function (x) { return x.id === p.empresa_id; })[0] || {};
      var dias = ag.dias.filter(function (d) { return d.turma_id === t.id; }).map(function (d) { return String(d.data).slice(0, 10); }).sort();
      var momento = !dias.length ? 'sem data' : (dias[dias.length - 1] < hoje ? 'encerrada' : (dias[0] <= hoje ? 'hoje' : 'proxima'));
      var dd = ag.dias.filter(function (d) { return d.turma_id === t.id; }).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });
      return { t: t, p: p, e: e, dias: dias, dd: dd, momento: momento, jovens: parts.filter(function (x) { return x.turma_id === t.id; }).length };
    }); }
    montar();
    function hr(d) { return d.hora_inicio ? ' ' + String(d.hora_inicio).slice(0, 5) + '–' + String(d.hora_fim).slice(0, 5) : ''; }
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
      var gVis = gev.filter(function (g) {
        if (st.filtro === 'proximas' && (g.data_fim || g.data_ini) < hoje) return false;
        if (st.filtro === 'encerradas' && (g.data_fim || g.data_ini) >= hoje) return false;
        if (st.busca && ui.normalizar(g.titulo).indexOf(ui.normalizar(st.busca)) < 0) return false;
        return true;
      });
      var porTurma = {}; pend.forEach(function (x) { (porTurma[x.turma_id] = porTurma[x.turma_id] || []).push(x); });
      var avisos = Object.keys(porTurma).map(function (tid) {
        var x = lista.filter(function (l) { return l.t.id === tid; })[0]; if (!x) return '';
        var mud = porTurma[tid].sort(function (a, b) { return a.ordem - b.ordem; }).map(function (m) {
          var d = x.dd.filter(function (y) { return y.ordem === m.ordem; })[0] || {};
          return 'Dia ' + m.ordem + ': de <b>' + dataBR(d.data) + hr(d) + '</b> para <b>' + G.dia(m.pendente_inicio) + ' ' + G.hora(m.pendente_inicio) + '–' + G.hora(m.pendente_fim) + '</b>';
        }).join('<br>');
        return '<section class="card ag-pend"><div><b>' + esc(x.t.nome + ' · ' + (x.e.nome_fantasia || '')) + ' foi alterada na Google Agenda</b><p>' + mud + '</p></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-pri btn-p" data-aplicar="' + tid + '">Aplicar no sistema</button><button type="button" class="btn btn-p" data-desfazer="' + tid + '">Desfazer no Google</button></div></section>';
      }).join('');
      box.innerHTML = '<header class="cabecalho"><div><h1>Turmas</h1><p>Todas as turmas dos processos seletivos e os eventos da Google Agenda "Classificação Final · Turmas".</p></div>' +
        (G ? '<button type="button" class="btn btn-p" id="tt-sinc">⟳ Atualizar com o Google</button>' : '') + '</header>' + avisos +
        '<section class="card pt-tab"><div class="pt-filtros">' + [['proximas', 'Próximas e de hoje', cnt.proximas], ['encerradas', 'Encerradas', cnt.encerradas], ['todas', 'Todas', lista.length]].map(function (f) {
          return '<button type="button" class="pt-chip' + (st.filtro === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + ' ' + f[2] + '</button>'; }).join('') +
          '<input class="entrada" id="tt-busca" type="search" placeholder="Buscar turma, empresa ou vaga" value="' + esc(st.busca) + '"></div>' +
        (vis.length ? '<div class="tabela-rolar"><table class="pt-rk"><thead><tr><th>Turma</th><th>Datas</th><th>Jovens</th><th>Processo</th><th></th></tr></thead><tbody>' +
          vis.map(function (x) {
            var cor = x.momento === 'hoje' ? '#ee7330' : (x.momento === 'encerrada' ? '#8a8486' : '#3f8f9a');
            return '<tr style="--c:' + cor + '"><td class="pt-nm pt-barra"><b>' + esc(x.t.nome) + '</b><small>' + esc((x.e.nome_fantasia || x.e.razao_social || '') + ' · ' + (x.p.vaga || '')) + '</small></td>' +
              '<td>' + (x.dd.length ? x.dd.map(function (d) { return dataBR(d.data) + '<small class="dica">' + hr(d) + '</small>'; }).join('<br>') : '<span class="dica">sem data</span>') + (x.momento === 'hoje' ? ' <span class="tt-hoje">hoje</span>' : '') + '</td>' +
              '<td><b>' + x.jovens + '</b>' + (x.t.vagas ? ' <span class="dica">de ' + x.t.vagas + '</span>' : '') + '</td>' +
              '<td>' + selo(x.p.situacao) + '</td>' +
              '<td style="text-align:right"><a class="btn btn-p" href="#/processos/' + x.p.id + '/jovens?turma=' + x.t.id + '">Abrir turma</a></td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="dica" style="margin:6px 0 0">Nenhuma turma neste filtro.</p>') + '</section>' +
        (gVis.length ? '<section class="card pt-tab"><h2 style="font-size:16px;margin:0 0 4px">Na Google Agenda <span class="gtag">criados direto no Google</span></h2><p class="dica" style="margin:0 0 6px">Eventos da agenda "Classificação Final · Turmas" e das agendas escolhidas em Integrações. Só aparecem: não travam dias. Se um deles for uma turma, crie a turma a partir dele, sem digitar de novo.</p>' +
          '<div class="tabela-rolar"><table class="pt-rk"><tbody>' + gVis.map(function (g, i) {
            var quando = g.dia_inteiro ? dataBR(g.data_ini) + (g.data_fim && g.data_fim !== g.data_ini ? ' a ' + dataBR(g.data_fim) : '') + ' <small class="dica">dia inteiro</small>' : G.dia(g.inicio) + ' <small class="dica">' + G.hora(g.inicio) + '–' + G.hora(g.fim) + '</small>' + (g.data_fim !== g.data_ini ? ' a ' + dataBR(g.data_fim) : '');
            return '<tr style="--c:#1a56b8"><td class="pt-nm pt-barra"><b>' + esc(g.titulo) + '</b><span class="gtag">' + esc(g.agenda_nome || 'na Google Agenda') + '</span></td><td>' + quando + '</td>' +
              '<td style="text-align:right;white-space:nowrap">' + (window.CF.perm.pode('processos_editar') ? '<button type="button" class="btn btn-p btn-perigo" data-gex="' + i + '">Excluir</button> <button type="button" class="btn btn-p" data-criar="' + i + '">Criar turma a partir deste evento</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div></section>' : '');
      box.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { st.filtro = b.getAttribute('data-f'); desenhar(); }); });
      var bs = box.querySelector('#tt-sinc');
      if (bs) bs.addEventListener('click', function (ev) { ui.executar(ev.currentTarget, 'Atualizando…', async function () { await G.sincronizar(false); await recarregar(); }); });
      box.querySelectorAll('[data-aplicar]').forEach(function (b) {
        b.addEventListener('click', function (ev) {
          ui.executar(ev.currentTarget, 'Aplicando…', async function () {
            try { await G.aplicar(b.getAttribute('data-aplicar')); ui.toast('As datas da turma foram atualizadas no sistema.', 'ok'); await recarregar(); } catch (e) { ui.toast(api.traduzErro(e), 'erro'); }
          });
        });
      });
      box.querySelectorAll('[data-desfazer]').forEach(function (b) {
        b.addEventListener('click', function (ev) { ui.executar(ev.currentTarget, 'Desfazendo…', async function () { await G.desfazer(b.getAttribute('data-desfazer')); await recarregar(); }); });
      });
      box.querySelectorAll('[data-criar]').forEach(function (b) { b.addEventListener('click', function () { criarDeEvento(gVis[+b.getAttribute('data-criar')]); }); });
      box.querySelectorAll('[data-gex]').forEach(function (b) { b.addEventListener('click', async function () { if (await G.excluirEvento(gVis[+b.getAttribute('data-gex')])) recarregar(); }); });
      var bus = box.querySelector('#tt-busca');
      bus.addEventListener('input', function () { st.busca = bus.value; var pos = bus.selectionStart; desenhar(); var n = box.querySelector('#tt-busca'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ok */ } });
    }
    async function recarregar() { try { await carregar(); montar(); desenhar(); } catch (e) { ui.toast(api.traduzErro(e), 'erro'); } }

    // Turma agendada direto no Google: nome, datas e horários vêm do evento
    function criarDeEvento(g) {
      var dias = [], d = new Date(g.data_ini + 'T12:00:00'), f = new Date((g.data_fim || g.data_ini) + 'T12:00:00');
      while (d <= f && dias.length < 3) { dias.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
      if (dias.length > 2) { ui.toast('Este evento tem mais de 2 dias. Uma turma tem 1 ou 2 dias: ajuste o evento no Google ou crie a turma pelo processo.', 'erro'); return; }
      var ini = g.dia_inteiro ? '08:00' : G.hora(g.inicio), fim = g.dia_inteiro ? '17:00' : G.hora(g.fim);
      var procs = (ag.processos || []).filter(function (p) { return p.situacao === 'montagem' || p.situacao === 'andamento'; });
      if (!procs.length) { ui.toast('Não há processo em montagem ou em andamento para receber a turma.', 'erro'); return; }
      var emp = function (p) { var e = (ag.empresas || []).filter(function (x) { return x.id === p.empresa_id; })[0] || {}; return e.nome_fantasia || e.razao_social || ''; };
      var ocupado = dias.filter(function (x) { return ag.dias.some(function (y) { return y.tipo === 'turma' && String(y.data).slice(0, 10) === x; }); })[0];
      ui.janela({
        titulo: 'Criar turma a partir do evento', confirmarDescarte: false,
        corpo: '<p class="dica" style="margin:0 0 8px">Evento da Google Agenda: <b>' + esc(g.titulo) + '</b> · ' + dias.map(dataBR).join(' e ') + ' · ' + ini + '–' + fim + '</p>' +
          (ocupado ? '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>O dia ' + dataBR(ocupado) + ' já tem outra turma no sistema.</span></div>' : '') +
          '<label class="campo"><span>Processo *</span><select class="entrada" id="ce-proc"><option value="">Escolha…</option>' + procs.map(function (p) { return '<option value="' + p.id + '">' + esc(emp(p) + ' · ' + p.vaga + (p.identificacao ? ' · ' + p.identificacao : '')) + '</option>'; }).join('') + '</select></label>' +
          '<div class="form-grade"><label class="campo"><span>Nome da turma *</span><input class="entrada" id="ce-nome" maxlength="40" value="' + esc(ui.maiusculas(g.titulo).slice(0, 40)) + '"></label>' +
          '<label class="campo"><span>Vagas</span><input class="entrada" id="ce-vagas" type="number" min="1" max="60" value="20"></label></div>' +
          dias.map(function (x, i) { return '<div class="tu-dia"><b>Dia ' + (i + 1) + '</b><span>' + dataBR(x) + '</span><input class="entrada" type="time" data-ci="' + i + '" value="' + ini + '"><span>às</span><input class="entrada" type="time" data-cf="' + i + '" value="' + fim + '"></div>'; }).join('') +
          '<p class="dica" style="margin:8px 0 0">Depois de criada, a turma fica ligada a este evento: as mudanças passam a ser feitas no sistema.</p>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Criar turma', principal: true, aoClicar: async function (el) {
          var proc = el.querySelector('#ce-proc').value, nome = ui.maiusculas(el.querySelector('#ce-nome').value.trim().replace(/\s+/g, ' '));
          if (!proc) { ui.toast('Escolha o processo.', 'erro'); return false; }
          if (!nome) { ui.toast('Informe o nome da turma.', 'erro'); return false; }
          var ds = dias.map(function (x, i) { return { data: x, inicio: el.querySelector('[data-ci="' + i + '"]').value, fim: el.querySelector('[data-cf="' + i + '"]').value }; });
          if (!(await G.confirmarDias(dias))) return false;
          try {
            var id = await dados.agenda.salvarTurma({ processo_id: proc, nome: nome, vagas: parseInt(el.querySelector('#ce-vagas').value, 10) || 20, dias: ds });
            await G.vincular(g.evento_id, id, g.agenda_id);
            ui.toast('Turma criada e ligada ao evento da Google Agenda.', 'ok'); await recarregar(); return true;
          } catch (e) { ui.toast(api.traduzErro(e), 'erro'); return false; }
        } }]
      });
    }
    desenhar();
    if (G) G.sincronizarSeVelho().then(function (r) { if (r) recarregar(); });
  };
})();
