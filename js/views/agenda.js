/* =====================================================================
   Classificação Final · views/agenda.js
   Agenda: uma turma por dia. Mostra turmas, pré-reservas (com prazo),
   pré-reservas vencidas e bloqueios. Avaliador consulta; o
   administrador faz pré-reservas, bloqueios e decide as vencidas.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc, D = window.CF.datas;
  var TIPOS_BLOQ = { feriado: 'Feriado', evento: 'Evento', outro: 'Bloqueio' };

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function porId(l, id) { return l.filter(function (x) { return x.id === id; })[0]; }
  function nomeEmpresa(a, id) { var e = porId(a.empresas, id); return e ? e.nome_fantasia : 'Empresa'; }

  /* ---------- Informações compartilhadas ---------- */
  // Descrição de cada dia ocupado: { data: {tipo, titulo, sub, ...} }
  function mapaDias(a) {
    var h = D.hoje(), m = {};
    a.dias.forEach(function (d) {
      var x = { tipo: d.tipo, data: d.data, ordem: d.ordem };
      if (d.tipo === 'turma') {
        var t = porId(a.turmas, d.turma_id) || {}, p = porId(a.processos, t.processo_id) || {};
        x.turma = t; x.processo = p; x.titulo = t.nome; x.sub = nomeEmpresa(a, p.empresa_id) + (d.ordem > 1 ? ' · 2º dia' : '');
      } else if (d.tipo === 'pre_reserva') {
        var r = porId(a.pre, d.pre_reserva_id) || {};
        x.pre = r; x.vencida = r.vence_em < h; if (x.vencida) x.tipo = 'vencida';
        x.titulo = x.vencida ? 'Pré-reserva vencida' : 'Pré-reserva'; x.sub = nomeEmpresa(a, r.empresa_id) + (d.ordem > 1 ? ' · 2º dia' : (x.vencida ? '' : ' · vence ' + D.curta(r.vence_em)));
      } else {
        var bq = porId(a.bloqueios, d.bloqueio_id) || {};
        x.bloqueio = bq; x.titulo = TIPOS_BLOQ[bq.tipo] || 'Bloqueio'; x.sub = bq.motivo;
      }
      m[d.data] = x;
    });
    return m;
  }
  // Dias ocupados para o calendário de escolha (ignorando os de uma turma/pré-reserva em edição)
  function ocupados(a, exceto) {
    var m = {}, info = mapaDias(a);
    Object.keys(info).forEach(function (k) {
      var x = info[k];
      if (exceto && ((x.turma && x.turma.id === exceto) || (x.pre && x.pre.id === exceto))) return;
      if (x.tipo !== 'turma') return;   // pré-reservas e bloqueios não existem mais
      m[k] = x.titulo + (x.sub ? ' · ' + x.sub : '');
    });
    return m;
  }
  function avisos(a) {
    var h = D.hoje(), lim = a.config ? a.config.aviso_pre_reserva_dias : 2;
    var ativas = a.pre.filter(function (r) { return r.situacao === 'ativa'; });
    var diasDe = function (r) { return a.dias.filter(function (d) { return d.pre_reserva_id === r.id; }).map(function (d) { return d.data; }).sort(); };
    var vencidas = ativas.filter(function (r) { return r.vence_em < h; }).map(function (r) { return { pre: r, dias: diasDe(r) }; });
    var vencendo = ativas.filter(function (r) { return r.vence_em >= h && D.diasEntre(h, r.vence_em) <= lim; }).map(function (r) { return { pre: r, dias: diasDe(r) }; });
    var proxima = a.dias.filter(function (d) { return d.tipo === 'turma' && d.data >= h; })[0];
    return { vencidas: vencidas, vencendo: vencendo, proxima: proxima };
  }
  // Número de avisos no item Agenda do menu (administrador)
  async function atualizarBadge() {
    return;   // sem pré-reservas: não há mais aviso no menu
    var link = document.querySelector('.menu a[data-rota="agenda"]'); if (!link) return;
    var n = 0;
    try { var a = await dados.agenda.carregarTudo(); var v = avisos(a); n = v.vencidas.length + v.vencendo.length; } catch (e) { /* sem agenda ainda */ }
    var b = link.querySelector('.badge-menu');
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'badge-menu'; link.appendChild(b); }
    b.textContent = n; b.setAttribute('aria-label', n + ' aviso(s) de pré-reserva');
  }
  window.CF.agendaUtil = { mapaDias: mapaDias, ocupados: ocupados, avisos: avisos, atualizarBadge: atualizarBadge };

  /* ================================================================
     TELA · Agenda (só leitura): turmas do sistema + eventos da Google Agenda
     "Classificação Final · Turmas". Datas e horários são escolhidos na turma.
     ================================================================ */
  window.CF.telas = window.CF.telas || {};
  window.CF.telas.agenda = async function (area) {
    var G = window.CF.agendaG, hojeS = D.hoje(), hojeD = D.data(hojeS);
    var ano = hojeD.getFullYear(), mes = hojeD.getMonth(), a = null, gev = [], linkG = null, esp = [], cores = {};
    var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var SEM = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    area.innerHTML = '<header class="cabecalho"><div><h1>Agenda</h1><p>Turmas do sistema e eventos da Google Agenda "Classificação Final · Turmas"</p></div>' +
      '<div class="botoes-topo">' + (window.CF.perm && window.CF.perm.pode('config_modelos') ? '<button type="button" class="btn" id="ag-pdf">⬆ Importar eventos (PDF)</button>' : '') + '<button type="button" class="btn" id="ag-sinc">⟳ Atualizar com o Google</button><a class="btn" id="ag-google" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/">Abrir no Google Agenda</a></div></header>' +
      '<div id="ag"><div class="girando" style="margin:30px auto"></div></div>';
    var box = area.querySelector('#ag');
    function pad(n) { return ('0' + n).slice(-2); }
    function hm(x) { return String(x || '').slice(0, 5); }
    async function carregar() {
      try {
        var r = await Promise.all([dados.agenda.carregarTudo(), G ? G.eventosGoogle() : [], window.CF.sb.rpc('agenda_google_link').then(function (x) { return x.error ? null : x.data; }).catch(function () { return null; }), G ? G.especiais() : [], G ? G.coresAgendas() : {}]);
        a = r[0]; gev = r[1] || []; linkG = r[2]; esp = r[3] || []; cores = r[4] || {};
        if (linkG) area.querySelector('#ag-google').href = 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(linkG);
        desenhar();
      } catch (e) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; }
    }
    // itens de cada dia: turmas (com horário) e eventos do Google
    function itensDoDia(ds) {
      var l = [];
      a.dias.filter(function (d) { return d.tipo === 'turma' && String(d.data).slice(0, 10) === ds; }).forEach(function (d) {
        var t = porId(a.turmas, d.turma_id) || {}, p = porId(a.processos, t.processo_id) || {};
        var nd = a.dias.filter(function (x) { return x.turma_id === d.turma_id; }).length;
        l.push({ tipo: 'turma', hora: hm(d.hora_inicio), fim: hm(d.hora_fim), titulo: t.nome, sub: nomeEmpresa(a, p.empresa_id) + ' · ' + (p.vaga || '') + (nd > 1 ? ' · dia ' + d.ordem + ' de ' + nd : ''), link: '#/processos/' + p.id + '/jovens?turma=' + t.id });
      });
      esp.forEach(function (e) {
        if (ds < e.data_ini || ds > e.data_fim) return;
        if (e.tipo === 'lembrete' && ds !== e.data_ini && ds.slice(8) !== '01') return;   // lembrete do mês: só no 1º dia
        l.push({ tipo: 'esp', esp: e, hora: '', titulo: e.titulo, sub: G.TIPOS_ESP[e.tipo].nome + (e.tipo === 'lembrete' ? ' · mês inteiro' : '') + (e.detalhe && e.tipo !== 'kolping' ? ' · ' + e.detalhe : '') });
      });
      gev.forEach(function (g) {
        if (ds < g.data_ini || ds > (g.data_fim || g.data_ini)) return;
        l.push({ tipo: 'google', hora: g.dia_inteiro ? '' : G.hora(g.inicio), fim: g.dia_inteiro ? '' : G.hora(g.fim), titulo: g.titulo, sub: g.dia_inteiro ? 'dia inteiro' : '', g: g });
      });
      return l.sort(function (x, y) { return (x.hora || '00').localeCompare(y.hora || '00'); });
    }
    function corG(g) { var c = (g && cores[g.agenda_id] && cores[g.agenda_id].cor) || '#5b6b8c'; return '--cg:' + c + ';--cgt:' + G.textoSobre(c); }
    function legenda() {
      var vistos = {}, itens = '';
      gev.forEach(function (g) { if (vistos[g.agenda_id]) return; vistos[g.agenda_id] = true; var c = cores[g.agenda_id]; itens += '<i style="background:' + ((c && c.cor) || '#5b6b8c') + '"></i>' + esc((c && c.nome) || g.agenda_nome || 'Google'); });
      return '<span class="ag-leg"><i class="t"></i>Turma ' + itens + ' <i style="background:#7d7577"></i>Feriado <i style="background:#8b7fd0"></i>Ponto facultativo <i style="background:#d96a1f"></i>Kolping Estadual <i style="background:#a07850"></i>Lembrete</span>';
    }
    function item(x, i, ds) {
      var tx = (x.hora ? '<b>' + esc(x.hora) + '</b> ' : '') + esc(x.titulo);
      if (x.tipo === 'esp') return '<span class="ag-it ag-esp" style="background:' + G.TIPOS_ESP[x.esp.tipo].cor + '" title="' + esc(x.titulo + ' · ' + x.sub) + '">' + esc(x.titulo) + '<small>' + esc(x.sub) + '</small></span>';
      return x.tipo === 'turma'
        ? '<a class="ag-it ag-turma" href="' + x.link + '" title="' + esc(x.titulo + ' · ' + x.sub + (x.hora ? ' · ' + x.hora + '–' + x.fim : '')) + '">' + tx + '<small>' + esc(x.sub) + '</small></a>'
        : '<button type="button" class="ag-it ag-google" style="' + corG(x.g) + '" data-g="' + ds + '|' + i + '" title="' + esc(x.titulo + ' · na Google Agenda') + '">' + tx + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</button>';
    }
    function desenhar() {
      var primeiro = new Date(ano, mes, 1), nDias = new Date(ano, mes + 1, 0).getDate(), estreito = window.matchMedia('(max-width: 720px)').matches;
      var nav = '<div class="ag-nav"><button type="button" class="btn btn-p" data-m="-1" aria-label="Mês anterior">‹</button><b>' + MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1) + ' de ' + ano + '</b><button type="button" class="btn btn-p" data-m="1" aria-label="Próximo mês">›</button>' +
        '<button type="button" class="btn btn-p" data-m="0">Hoje</button>' + legenda() + '</div>';
      var corpo = '';
      if (estreito) {   // celular: lista dos dias que têm algo
        for (var d = 1; d <= nDias; d++) {
          var ds = ano + '-' + pad(mes + 1) + '-' + pad(d), its = itensDoDia(ds); if (!its.length) continue;
          corpo += '<div class="ag-ldia' + (ds === hojeS ? ' hoje' : '') + '"><span class="ag-ld">' + SEM[new Date(ano, mes, d).getDay()] + '<b>' + d + '</b></span><div>' + its.map(function (x, i) { return item(x, i, ds); }).join('') + '</div></div>';
        }
        corpo = '<section class="card ag-lista">' + (corpo || '<p class="dica" style="margin:6px 0">Nada marcado neste mês.</p>') + '</section>';
      } else {
        var cel = SEM.map(function (x) { return '<span class="ag-cab">' + x + '</span>'; }).join('');
        for (var k = 0; k < primeiro.getDay(); k++) cel += '<span class="ag-cel vazio"></span>';
        for (var d2 = 1; d2 <= nDias; d2++) {
          var ds2 = ano + '-' + pad(mes + 1) + '-' + pad(d2), its2 = itensDoDia(ds2), dow = new Date(ano, mes, d2).getDay();
          cel += '<div class="ag-cel' + (ds2 === hojeS ? ' hoje' : '') + (dow === 0 || dow === 6 ? ' fds' : '') + '"><span class="ag-n">' + d2 + '</span>' + its2.map(function (x, i) { return item(x, i, ds2); }).join('') + '</div>';
        }
        corpo = '<section class="card ag-mes">' + '<div class="ag-grade">' + cel + '</div></section>';
      }
      box.innerHTML = nav + corpo + '<p class="dica">Para marcar ou mudar uma turma, use o Profiling Empresas (processo › turma). Eventos das agendas do Google aparecem na cor de cada agenda (escolhida em Integrações) e não travam dias; em Cadastros › Turmas dá para criar uma turma a partir deles.</p>';
      box.querySelectorAll('[data-m]').forEach(function (b) {
        b.addEventListener('click', function () { var m = +b.getAttribute('data-m'); if (!m) { ano = hojeD.getFullYear(); mes = hojeD.getMonth(); } else { mes += m; if (mes < 0) { mes = 11; ano--; } if (mes > 11) { mes = 0; ano++; } } desenhar(); });
      });
      box.querySelectorAll('[data-g]').forEach(function (b) {
        b.addEventListener('click', function () {
          var pr = b.getAttribute('data-g').split('|'), x = itensDoDia(pr[0])[+pr[1]], g = x.g;
          var podeEx = window.CF.perm && window.CF.perm.pode('processos_editar');
          var jg = ui.janela({ titulo: g.titulo, confirmarDescarte: false,
            corpo: '<p style="margin:0 0 6px"><span class="gtag" style="margin:0">' + esc(g.agenda_nome || 'na Google Agenda') + '</span></p><p style="margin:0">' + (g.dia_inteiro ? D.longa(g.data_ini) + (g.data_fim !== g.data_ini ? ' a ' + D.longa(g.data_fim) : '') + ' · dia inteiro' : G.dia(g.inicio) + ' · ' + G.hora(g.inicio) + '–' + G.hora(g.fim)) + '</p>' +
              '<p class="dica">Criado direto no Google. Se for uma turma, use "Criar turma a partir deste evento" em Cadastros › Turmas.</p>',
            botoes: (podeEx ? [{ texto: 'Excluir evento', aoClicar: async function () { if (await G.excluirEvento(g)) { carregar(); return true; } return false; } }] : []).concat([{ texto: 'Fechar', acao: 'fechar' }, { texto: 'Ir para Turmas', principal: true, aoClicar: function () { window.location.hash = '#/cadastros/turmas'; return true; } }]) });
        });
      });
    }
    var bpdf = area.querySelector('#ag-pdf');
    if (bpdf) bpdf.addEventListener('click', function () { window.CF.importarEventos.abrir(function () { carregar(); if (G) G.sincronizar(true); }); });
    area.querySelector('#ag-sinc').addEventListener('click', function (ev) { ui.executar(ev.currentTarget, 'Atualizando…', async function () { if (G) await G.sincronizar(false); await carregar(); }); });
    window.addEventListener('resize', function () { if (a && document.body.contains(box)) desenhar(); });
    await carregar();
    if (G) G.sincronizarSeVelho().then(function (r) { if (r && document.body.contains(box)) carregar(); });
  };
})();
