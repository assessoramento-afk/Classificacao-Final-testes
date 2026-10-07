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
     TELA
     ================================================================ */
  window.CF.telas = window.CF.telas || {};
  window.CF.telas.agenda = function (area, ctx) {
    var admin = ctx.perfil.perfil === 'admin';
    var hojeD = D.data(D.hoje());
    var ano = hojeD.getFullYear(), mes = hojeD.getMonth(), visao = 'mes', semanaBase = D.hoje();
    var a = null;
    area.innerHTML = '<header class="cabecalho"><div><h1>Agenda</h1><p>Uma turma por dia · dias com turma, pré-reserva ou bloqueio ficam travados</p></div>' +
      (admin ? '<div class="botoes-topo"><button type="button" class="btn" id="ag-bloq">Bloquear dias</button><button type="button" class="btn btn-pri" id="ag-pre">' + ui.icone('mais', 17) + 'Pré-reserva</button></div>' : '') + '</header>' +
      '<div class="ag-lado"><section class="card bloco ag-cal" id="ag-cal"><div class="girando" style="margin:30px auto"></div></section><aside class="card ag-avisos" id="ag-avisos"></aside></div>';
    if (admin) {
      area.querySelector('#ag-pre').addEventListener('click', function () { formPreReserva(null); });
      area.querySelector('#ag-bloq').addEventListener('click', function () { formBloqueio(null); });
    }

    async function carregar() {
      try { a = await dados.agenda.carregarTudo(); desenhar(); if (admin) atualizarBadge(); }
      catch (e) { erro(e); area.querySelector('#ag-cal').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; }
    }

    function celula(s, info, extraCls) {
      var dow = D.data(s).getDay(), x = info[s];
      var cls = 'dia' + (dow === 0 || dow === 6 ? ' fds' : '') + (s === D.hoje() ? ' hoje' : '') + (s < D.hoje() ? ' passado' : '') + (extraCls || '');
      return '<button type="button" class="' + cls + '" data-dia="' + s + '" aria-label="' + esc(D.longa(s) + (x ? ': ' + x.titulo + ' · ' + x.sub : ': livre')) + '">' +
        '<span class="num">' + D.data(s).getDate() + '</span>' +
        (x ? '<span class="ev ev-' + x.tipo + '"><b>' + esc(x.titulo) + '</b>' + esc(x.sub || '') + '</span>' : (dow === 0 || dow === 6 || s < D.hoje() ? '' : '<span class="livre">livre</span>')) + '</button>';
    }

    function desenhar() {
      var info = mapaDias(a);
      var titulo, celulas = D.SEMANA.map(function (s) { return '<span class="dsem">' + s + '</span>'; }).join('');
      if (visao === 'mes') {
        titulo = D.mesAno(ano, mes);
        var primeiro = new Date(ano, mes, 1), n = new Date(ano, mes + 1, 0).getDate();
        for (var i = 0; i < primeiro.getDay(); i++) celulas += '<span class="dia vazio"></span>';
        for (var d = 1; d <= n; d++) celulas += celula(D.iso(new Date(ano, mes, d)), info);
      } else {
        var ini = D.somarDias(semanaBase, -D.data(semanaBase).getDay());
        titulo = 'Semana de ' + D.curta(ini) + ' a ' + D.curta(D.somarDias(ini, 6));
        for (var k = 0; k < 7; k++) celulas += celula(D.somarDias(ini, k), info, ' alto');
      }
      area.querySelector('#ag-cal').innerHTML =
        '<div class="ag-topo"><div class="ag-nav"><button type="button" class="btn btn-p" data-nav="-1" aria-label="Anterior">‹</button><h2>' + esc(titulo) + '</h2>' +
          '<button type="button" class="btn btn-p" data-nav="1" aria-label="Próximo">›</button><button type="button" class="btn btn-p" id="ag-hoje">Hoje</button></div>' +
          '<div class="segmentos seg-visao" role="group" aria-label="Visualização"><button type="button" data-visao="mes" aria-pressed="' + (visao === 'mes') + '">Mês</button><button type="button" data-visao="semana" aria-pressed="' + (visao === 'semana') + '">Semana</button></div></div>' +
        '<div class="cal-ag"><div class="cal-ag-grade' + (visao === 'semana' ? ' semana' : '') + '">' + celulas + '</div></div>' +
        '<div class="leg"><span><i class="lg-turma"></i>Turma</span><span><i class="lg-pre"></i>Pré-reserva</span><span><i class="lg-venc"></i>Pré-reserva vencida</span><span><i class="lg-bloq"></i>Feriado ou bloqueio</span></div>';
      var c = area.querySelector('#ag-cal');
      c.querySelectorAll('[data-nav]').forEach(function (b) {
        b.addEventListener('click', function () {
          var n2 = +b.getAttribute('data-nav');
          if (visao === 'mes') { mes += n2; if (mes < 0) { mes = 11; ano--; } if (mes > 11) { mes = 0; ano++; } }
          else semanaBase = D.somarDias(semanaBase, 7 * n2);
          desenhar();
        });
      });
      c.querySelector('#ag-hoje').addEventListener('click', function () { ano = hojeD.getFullYear(); mes = hojeD.getMonth(); semanaBase = D.hoje(); desenhar(); });
      c.querySelectorAll('[data-visao]').forEach(function (b) { b.addEventListener('click', function () { visao = b.getAttribute('data-visao'); if (visao === 'semana') semanaBase = D.iso(new Date(ano, mes, Math.min(D.data(D.hoje()).getMonth() === mes ? D.data(D.hoje()).getDate() : 1, 28))); desenhar(); }); });
      c.querySelectorAll('[data-dia]').forEach(function (b) { b.addEventListener('click', function () { abrirDia(b.getAttribute('data-dia')); }); });
      desenharAvisos();
    }

    function desenharAvisos() {
      var v = avisos(a), box = area.querySelector('#ag-avisos');
      var item = function (cor, icone, titulo, texto, botoes) { return '<div class="av-item"><span class="av-ic" style="color:' + cor + '">' + icone + '</span><div><b>' + esc(titulo) + '</b><small>' + esc(texto) + '</small>' + (botoes || '') + '</div></div>'; };
      var html = '<span class="lbl">Avisos da agenda</span>';
      v.vencidas.forEach(function (x) {
        html += item('var(--erro)', '⚠', 'Pré-reserva vencida', nomeEmpresa(a, x.pre.empresa_id) + ' · ' + x.dias.map(D.curta).join(' e ') + ' · venceu ' + D.curta(x.pre.vence_em),
          admin ? '<div class="av-botoes"><button type="button" class="btn btn-p" data-acao="prorrogar" data-pre="' + x.pre.id + '">Prorrogar</button><button type="button" class="btn btn-p" data-acao="liberar" data-pre="' + x.pre.id + '">Liberar</button><button type="button" class="btn btn-pri btn-p" data-acao="confirmar" data-pre="' + x.pre.id + '">Confirmar</button></div>' : '');
      });
      v.vencendo.forEach(function (x) {
        var n = D.diasEntre(D.hoje(), x.pre.vence_em);
        html += item('var(--laranja)', '◷', n === 0 ? 'Vence hoje' : 'Vence em ' + n + ' dia' + (n > 1 ? 's' : ''), nomeEmpresa(a, x.pre.empresa_id) + ' · ' + x.dias.map(D.curta).join(' e '),
          admin ? '<div class="av-botoes"><button type="button" class="btn btn-p" data-acao="prorrogar" data-pre="' + x.pre.id + '">Prorrogar</button><button type="button" class="btn btn-pri btn-p" data-acao="confirmar" data-pre="' + x.pre.id + '">Confirmar</button></div>' : '');
      });
      if (v.proxima) {
        var t = porId(a.turmas, v.proxima.turma_id) || {}, p = porId(a.processos, t.processo_id) || {};
        html += item('var(--c-area)', '▣', 'Próxima turma', nomeEmpresa(a, p.empresa_id) + ' · ' + (t.nome || '') + ' · ' + D.longa(v.proxima.data));
      }
      if (!v.vencidas.length && !v.vencendo.length && !v.proxima) html += '<p class="dica" style="margin:0">Nenhum aviso no momento.</p>';
      box.innerHTML = html;
      box.querySelectorAll('[data-acao]').forEach(function (b) {
        b.addEventListener('click', function () { var r = porId(a.pre, b.getAttribute('data-pre')); acaoPre(b.getAttribute('data-acao'), r); });
      });
    }

    /* ---------- Clique num dia ---------- */
    function abrirDia(s) {
      var x = mapaDias(a)[s];
      if (!x) {
        if (!admin) return;
        if (s < D.hoje()) { ui.toast('Esse dia já passou.', 'erro'); return; }
        ui.janela({ titulo: D.longa(s) + ' · livre', confirmarDescarte: false,
          corpo: '<p style="margin:0;color:var(--texto-2)">Este dia está livre. O que deseja fazer?</p>',
          botoes: [{ texto: 'Fechar', acao: 'fechar' }, { texto: 'Bloquear este dia', aoClicar: function () { setTimeout(function () { formBloqueio([s]); }, 0); return true; } },
                   { texto: 'Pré-reserva neste dia', principal: true, aoClicar: function () { setTimeout(function () { formPreReserva([s]); }, 0); return true; } }] });
        return;
      }
      var corpo = '<dl class="conferir">', botoes = [{ texto: 'Fechar', acao: 'fechar' }];
      if (x.turma) {
        var p = x.processo, diasT = a.dias.filter(function (d) { return d.turma_id === x.turma.id; }).map(function (d) { return d.data; });
        corpo += '<dt>Turma</dt><dd>' + esc(x.turma.nome) + '</dd><dt>Empresa</dt><dd>' + esc(nomeEmpresa(a, p.empresa_id)) + '</dd><dt>Processo</dt><dd>' + esc((p.vaga || '') + ' · ' + (p.identificacao || '')) + '</dd>' +
          '<dt>Dias</dt><dd>' + esc(D.listaDias(diasT)) + '</dd>' + (x.turma.horario ? '<dt>Horário</dt><dd>' + esc(x.turma.horario) + '</dd>' : '') + '<dt>Vagas</dt><dd>' + x.turma.vagas + '</dd>';
        botoes.push({ texto: 'Abrir processo', principal: true, aoClicar: function () { window.location.hash = '#/processos/' + p.id; return true; } });
      } else if (x.pre) {
        var diasP = a.dias.filter(function (d) { return d.pre_reserva_id === x.pre.id; }).map(function (d) { return d.data; });
        corpo += '<dt>Situação</dt><dd>' + (x.vencida ? '<span class="alerta-txt">Vencida em ' + D.curta(x.pre.vence_em) + '</span>' : 'Ativa · vence ' + D.completa(x.pre.vence_em)) + '</dd>' +
          '<dt>Empresa</dt><dd>' + esc(nomeEmpresa(a, x.pre.empresa_id)) + '</dd><dt>Dias</dt><dd>' + esc(D.listaDias(diasP)) + '</dd>' + (x.pre.observacao ? '<dt>Observação</dt><dd>' + esc(x.pre.observacao) + '</dd>' : '');
        if (admin) {
          botoes.push({ texto: 'Liberar dias', aoClicar: function () { setTimeout(function () { acaoPre('liberar', x.pre); }, 0); return true; } });
          botoes.push({ texto: 'Prorrogar', aoClicar: function () { setTimeout(function () { acaoPre('prorrogar', x.pre); }, 0); return true; } });
          botoes.push({ texto: 'Confirmar e criar turma', principal: true, aoClicar: function () { setTimeout(function () { acaoPre('confirmar', x.pre); }, 0); return true; } });
        }
      } else {
        var diasB = a.dias.filter(function (d) { return d.bloqueio_id === x.bloqueio.id; }).map(function (d) { return d.data; });
        corpo += '<dt>Tipo</dt><dd>' + esc(TIPOS_BLOQ[x.bloqueio.tipo] || 'Bloqueio') + '</dd><dt>Motivo</dt><dd>' + esc(x.bloqueio.motivo) + '</dd><dt>Dias</dt><dd>' + esc(diasB.map(D.curta).join(', ')) + '</dd>';
        if (admin) botoes.push({ texto: 'Desbloquear', principal: true, aoClicar: async function () {
          if (!(await ui.confirmar('Desbloquear?', 'Os ' + diasB.length + ' dia(s) deste bloqueio ficam livres de novo.', 'Desbloquear', 'Cancelar'))) return false;
          try { await dados.agenda.excluirBloqueio(x.bloqueio.id); ui.toast('Dias desbloqueados.', 'ok'); await carregar(); return true; } catch (e) { erro(e); return false; }
        } });
      }
      ui.janela({ titulo: D.longa(s) + ' · ' + x.titulo, confirmarDescarte: false, corpo: corpo + '</dl>', botoes: botoes });
    }

    /* ---------- Pré-reserva ---------- */
    function formPreReserva(diasIniciais) {
      var prazo = a.config ? a.config.prazo_pre_reserva_dias : 7;
      var j = ui.janela({
        titulo: 'Nova pré-reserva',
        corpo: '<label class="campo" for="pr-emp"><span>Empresa <span class="obrig">*</span></span><select class="entrada" id="pr-emp"><option value="">Escolha a empresa…</option>' +
            a.empresas.map(function (e) { return '<option value="' + e.id + '">' + esc(e.nome_fantasia) + '</option>'; }).join('') + '</select></label>' +
          '<div class="campo"><span>Dias (1 ou 2) <span class="obrig">*</span></span><div id="pr-cal" class="cal-escolha"></div><small class="dica" id="pr-esc"></small></div>' +
          '<div class="form-grade"><label class="campo" for="pr-vence"><span>Confirmar até</span><input class="entrada" type="date" id="pr-vence" value="' + D.somarDias(D.hoje(), prazo) + '" min="' + D.hoje() + '"></label>' +
          '<label class="campo" for="pr-obs"><span>Observação</span><input class="entrada" id="pr-obs" maxlength="200" placeholder="Ex.: aguardando lista de candidatos"></label></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Fazer pré-reserva', principal: true, aoClicar: async function (f) {
          var dias = cal.valor(), emp = f.querySelector('#pr-emp').value;
          if (!emp) { ui.toast('Escolha a empresa.', 'erro'); return false; }
          if (!dias.length) { ui.toast('Escolha 1 ou 2 dias.', 'erro'); return false; }
          try { await dados.agenda.salvarPreReserva({ empresa_id: emp, datas: dias, vence_em: f.querySelector('#pr-vence').value || null, observacao: f.querySelector('#pr-obs').value }); ui.toast('Pré-reserva feita.', 'ok'); await carregar(); return true; }
          catch (e) { erro(e); return false; }
        } }]
      });
      var esc2 = j.elemento.querySelector('#pr-esc');
      var cal = window.CF.calendario.escolher(j.elemento.querySelector('#pr-cal'), { max: 2, selecionados: diasIniciais || [], ocupados: ocupados(a),
        aoMudar: function (l) { esc2.textContent = l.length ? 'Escolhidos: ' + D.listaDias(l) : ''; } });
      if (diasIniciais) esc2.textContent = 'Escolhidos: ' + D.listaDias(diasIniciais);
    }
    function acaoPre(acao, r) {
      if (acao === 'liberar') {
        ui.confirmar('Liberar os dias?', 'A pré-reserva de ' + nomeEmpresa(a, r.empresa_id) + ' será cancelada e os dias ficam livres.', 'Liberar', 'Cancelar').then(async function (sim) {
          if (!sim) return;
          try { await dados.agenda.decidirPreReserva(r.id, 'liberar'); ui.toast('Dias liberados.', 'ok'); await carregar(); } catch (e) { erro(e); }
        });
      } else if (acao === 'prorrogar') {
        var prazo = a.config ? a.config.prazo_pre_reserva_dias : 7;
        ui.janela({ titulo: 'Prorrogar pré-reserva', confirmarDescarte: false,
          corpo: '<p style="margin:0;color:var(--texto-2)">' + esc(nomeEmpresa(a, r.empresa_id)) + ' · vencimento atual ' + D.completa(r.vence_em) + '</p>' +
            '<label class="campo" for="pz-data"><span>Novo vencimento</span><input class="entrada" type="date" id="pz-data" min="' + D.hoje() + '" value="' + D.somarDias(D.hoje(), prazo) + '"></label>',
          botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Prorrogar', principal: true, aoClicar: async function (f) {
            var d = f.querySelector('#pz-data').value; if (!d || d < D.hoje()) { ui.toast('Escolha uma data a partir de hoje.', 'erro'); return false; }
            try { await dados.agenda.decidirPreReserva(r.id, 'prorrogar', d); ui.toast('Pré-reserva prorrogada até ' + D.curta(d) + '.', 'ok'); await carregar(); return true; } catch (e) { erro(e); return false; }
          } }] });
      } else {
        var procs = a.processos.filter(function (p) { return p.empresa_id === r.empresa_id && (p.situacao === 'montagem' || p.situacao === 'andamento'); });
        if (!procs.length) { ui.janela({ titulo: 'Confirmar pré-reserva', confirmarDescarte: false, corpo: '<p style="margin:0">Para confirmar, a empresa ' + esc(nomeEmpresa(a, r.empresa_id)) + ' precisa ter um processo em montagem. Crie o processo em <a href="#/processos">Processos</a> e volte aqui.</p>' }); return; }
        var proximoNome = function (pid) { var n = a.turmas.filter(function (t) { return t.processo_id === pid; }).length; return 'Turma ' + String.fromCharCode(65 + n); };
        var j = ui.janela({ titulo: 'Confirmar e criar turma', confirmarDescarte: false,
          corpo: '<label class="campo" for="cf-proc"><span>Processo</span><select class="entrada" id="cf-proc">' + procs.map(function (p) { return '<option value="' + p.id + '">' + esc(p.vaga + ' · ' + p.identificacao) + '</option>'; }).join('') + '</select></label>' +
            '<div class="form-grade"><label class="campo" for="cf-nome"><span>Nome da turma</span><input class="entrada" id="cf-nome" value="' + esc(proximoNome(procs[0].id)) + '"></label>' +
            '<label class="campo" for="cf-vagas"><span>Vagas</span><input class="entrada" id="cf-vagas" type="number" min="1" max="60" value="20"></label>' +
            '<label class="campo largo" for="cf-hor"><span>Horário</span><input class="entrada" id="cf-hor" value="08:00 às 17:00"></label></div>',
          botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Criar turma', principal: true, aoClicar: async function (f) {
            var nome = f.querySelector('#cf-nome').value.trim(); if (!nome) { ui.toast('Informe o nome da turma.', 'erro'); return false; }
            try { await dados.agenda.confirmarPreReserva(r.id, f.querySelector('#cf-proc').value, nome, f.querySelector('#cf-hor').value, parseInt(f.querySelector('#cf-vagas').value, 10) || 20); ui.toast('Turma criada nos dias da pré-reserva.', 'ok'); await carregar(); return true; }
            catch (e) { erro(e); return false; }
          } }] });
        j.elemento.querySelector('#cf-proc').addEventListener('change', function (e) { j.elemento.querySelector('#cf-nome').value = proximoNome(e.target.value); });
      }
    }

    /* ---------- Bloqueio ---------- */
    function formBloqueio(diasIniciais) {
      var j = ui.janela({
        titulo: 'Bloquear dias',
        corpo: '<div class="form-grade"><label class="campo" for="bq-tipo"><span>Tipo</span><select class="entrada" id="bq-tipo"><option value="feriado">Feriado</option><option value="evento">Evento da Kolping</option><option value="outro">Outro</option></select></label>' +
          '<label class="campo" for="bq-mot"><span>Motivo <span class="obrig">*</span></span><input class="entrada" id="bq-mot" maxlength="120" placeholder="Ex.: Finados"></label></div>' +
          '<div class="campo"><span>Dias <span class="obrig">*</span></span><div id="bq-cal" class="cal-escolha"></div><small class="dica" id="bq-esc"></small></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Bloquear', principal: true, aoClicar: async function (f) {
          var dias = cal.valor(), mot = f.querySelector('#bq-mot').value.trim();
          if (!mot) { ui.toast('Informe o motivo.', 'erro'); return false; }
          if (!dias.length) { ui.toast('Escolha pelo menos um dia.', 'erro'); return false; }
          try { await dados.agenda.salvarBloqueio({ tipo: f.querySelector('#bq-tipo').value, motivo: mot, datas: dias }); ui.toast(dias.length + ' dia(s) bloqueado(s).', 'ok'); await carregar(); return true; }
          catch (e) { erro(e); return false; }
        } }]
      });
      var esc2 = j.elemento.querySelector('#bq-esc');
      var cal = window.CF.calendario.escolher(j.elemento.querySelector('#bq-cal'), { max: 31, selecionados: diasIniciais || [], ocupados: ocupados(a),
        aoMudar: function (l) { esc2.textContent = l.length ? l.length + ' dia(s): ' + l.map(D.curta).join(', ') : ''; } });
      if (diasIniciais) esc2.textContent = '1 dia(s): ' + diasIniciais.map(D.curta).join(', ');
    }

    carregar();
  };
})();
