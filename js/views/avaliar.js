/* =====================================================================
   Classificação Final · views/avaliar.js
   Dia da turma para a equipe (administrador e avaliador):
   #/avaliar                       turmas de hoje e próximas
   #/avaliar/<turma>               passos do dia
   #/avaliar/<turma>/presenca      presença (funciona sem internet)
   #/avaliar/<turma>/grupos        montar grupos (com internet)
   #/avaliar/<turma>/avaliadores   avaliador de cada grupo (com internet)
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc, D = window.CF.datas, OFF = window.CF.offline;

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function barraSync(area) {
    var velho = area.querySelector(':scope > .sync-bar'); if (velho) velho.remove();
    var el = document.createElement('a'); el.className = 'sync-bar'; el.setAttribute('role', 'status'); el.href = '#/envios'; el.title = 'Abrir a Central de envios';
    area.insertBefore(el, area.firstChild);
    var parar = OFF.ouvir(function (s) { el.className = 'sync-bar sync-' + s.tipo; el.textContent = (s.tipo === 'ok' ? '✓ ' : (s.tipo === 'env' ? '⟳ ' : '⚠ ')) + s.texto; });
    window.addEventListener('hashchange', function x() { parar(); window.removeEventListener('hashchange', x); });
  }
  function hora(iso) { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function diaAtual(snap) { var h = D.hoje(); return snap.dias.indexOf(h) >= 0 ? h : (snap.dias.filter(function (d) { return d >= h; })[0] || snap.dias[snap.dias.length - 1]); }
  function listaDesist(snap) {
    var r = [];
    snap.jovens.forEach(function (j) {
      var man = (snap.desistencias || []).filter(function (d) { return d.participacao_id === j.id; })[0];
      var falta = snap.dias.filter(function (d) { var x = snap.presencas[j.id + '|' + d]; return x && x.presente === false; })[0];
      if (man || falta) r.push({ j: j, man: man, falta: falta });
    });
    return r;
  }
  // Dia aberto na tela: o escolhido no seletor Dia 1 / Dia 2 (vale para a turma, neste aparelho) ou o dia de hoje
  function diaDaTela(snap) { var e = null; try { e = sessionStorage.getItem('cf_dia_' + snap.turma.id); } catch (x) { /* sem armazenamento */ } return e && snap.dias.indexOf(e) >= 0 ? e : diaAtual(snap); }
  function escolherDia(snap, d) { try { sessionStorage.setItem('cf_dia_' + snap.turma.id, d); } catch (x) { /* sem armazenamento */ } }
  function presente(snap, pid, dia) { var x = snap.presencas[pid + '|' + dia]; return x ? x.presente : null; }
  function meuId() { return (window.CF.perfilAtual || {}).id; }

  // Baixa (com internet) ou usa a cópia do aparelho (sem internet)
  async function obterTurma(id, forcar) {
    var local = OFF.turma(id);
    if (navigator.onLine && (forcar || !local || true)) {
      try { return OFF.guardarTurma(await dados.avaliacao.baixarTurma(id)); }
      catch (e) { if (!local) throw e; console.warn('Usando a cópia do aparelho:', e); }
    }
    if (!local) throw new Error('Esta turma não está disponível sem internet. Conecte-se para baixá-la.');
    return local;
  }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.avaliar = function (area, ctx) {
    var m = (window.location.hash || '').match(/^#\/avaliar\/([0-9a-z-]{8,})(?:\/([a-z]+))?/i);
    if (!m) return inicio(area, ctx);
    var tela = { presenca: presenca, grupos: grupos, avaliadores: avaliadores, notas: function (a, c, sn) { window.CF.avaliarNotas(a, c, sn); }, sugestoes: function (a, c, sn) { window.CF.avaliarSugestoes(a, c, sn); }, fechar: fechar, desistencias: desistencias }[m[2]] || turmaPassos;
    area.innerHTML = '<div class="girando" style="margin:30px auto"></div>';
    obterTurma(m[1]).then(function (snap) { area.innerHTML = ''; tela(area, ctx, snap); barraSync(area); })
      .catch(function (e) { area.innerHTML = '<a class="voltar" href="#/processos">← Profiling Empresas</a><div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; });
  };

  /* ================================================================
     INÍCIO: turmas de hoje e próximas
     ================================================================ */
  async function inicio(area) {
    area.innerHTML = '<header class="cabecalho"><div><h1>Avaliar</h1><p>' + esc(D.longa(D.hoje()).replace(/^./, function (c) { return c.toUpperCase(); })) + '</p></div></header><div id="av-lista"><div class="girando" style="margin:30px auto"></div></div>';
    barraSync(area);
    var guardadas = OFF.turmas(), h = D.hoje(), lim = D.somarDias(h, 14), itens = [];
    if (navigator.onLine) {
      try {
        var ag = await dados.agenda.carregarTudo();
        ag.turmas.forEach(function (t) {
          var p = ag.processos.filter(function (x) { return x.id === t.processo_id; })[0];
          if (!p || p.situacao !== 'andamento') return;
          var dias = ag.dias.filter(function (d) { return d.turma_id === t.id; }).map(function (d) { return d.data; }).sort();
          if (!dias.length || dias[dias.length - 1] < h) return;
          var e = ag.empresas.filter(function (x) { return x.id === p.empresa_id; })[0] || {};
          itens.push({ id: t.id, nome: t.nome, empresa: e.nome_fantasia || '', vaga: p.vaga, dias: dias, horario: t.horario });
        });
      } catch (e) { console.warn(e); }
    }
    Object.keys(guardadas).forEach(function (id) {
      if (itens.some(function (x) { return x.id === id; })) return;
      var s = guardadas[id]; if (s.dias[s.dias.length - 1] < h) return;
      itens.push({ id: id, nome: s.turma.nome, empresa: s.empresa.nome, vaga: s.processo.vaga, dias: s.dias, horario: s.turma.horario });
    });
    itens.sort(function (a, b) { return a.dias[0].localeCompare(b.dias[0]); });
    var hoje = itens.filter(function (t) { return t.dias.indexOf(h) >= 0; }), prox = itens.filter(function (t) { return t.dias.indexOf(h) < 0; });
    // Um card por processo, com as turmas em linhas
    function grupo(lista, hojeSec) {
      var porProc = {}, ordem = [];
      lista.forEach(function (t) { var k = t.empresa + ' · ' + t.vaga; if (!porProc[k]) { porProc[k] = []; ordem.push(k); } porProc[k].push(t); });
      return ordem.map(function (k) {
        return '<section class="card pcard"><h3>' + esc(k) + '</h3>' + porProc[k].map(function (t) {
          var g = guardadas[t.id], di = t.dias.indexOf(h);
          return '<div class="tlin"><div class="tlin-tx"><b>' + esc(t.nome) + ' · ' + (di >= 0 ? 'dia ' + (di + 1) + ' de ' + t.dias.length : esc(D.listaDias(t.dias))) + '</b><small>' + (t.horario ? esc(t.horario.toLowerCase()) : '') +
            (g ? (t.horario ? ' · ' : '') + '<span class="baixado">✓ disponível sem internet · ' + (g.baixado_em.slice(0, 10) === h ? 'atualizado às ' + hora(g.baixado_em) : 'atualizado em ' + D.curta(g.baixado_em.slice(0, 10))) + '</span>' : '') + '</small></div>' +
            '<div class="acoes"><a class="btn ' + (hojeSec ? 'btn-pri' : '') + ' btn-p" href="#/avaliar/' + t.id + '">' + (hojeSec ? 'Abrir turma' : 'Abrir') + '</a>' +
            (!g && navigator.onLine ? '<button type="button" class="btn btn-p" data-baixar="' + t.id + '" title="Baixar para usar sem internet">⬇ Baixar</button>' : '') + '</div></div>';
        }).join('') + '</section>';
      }).join('');
    }
    var box = area.querySelector('#av-lista');
    box.className = 'av-lista';
    box.innerHTML = (hoje.length ? '<span class="lbl">Turmas de hoje</span>' + grupo(hoje, true) : '<div class="card vazio">Nenhuma turma hoje.' + (navigator.onLine ? '' : ' Sem internet, aparecem só as turmas baixadas neste aparelho.') + '</div>') +
      (prox.length ? '<span class="lbl av-sec">Próximas turmas</span>' + grupo(prox, false) : '') +
      '<p class="dica">Aparecem as turmas de todos os processos em andamento, por data. Baixe a turma na véspera para usar sem internet.</p>';
    box.querySelectorAll('[data-baixar]').forEach(function (b) {
      b.addEventListener('click', function () {
        ui.executar(b, 'Baixando…', async function () {
          try { await obterTurma(b.getAttribute('data-baixar'), true); ui.toast('Turma disponível sem internet.', 'ok'); inicio(area); } catch (e) { erro(e); }
        });
      });
    });
  }

  /* ================================================================
     TURMA: passos do dia
     ================================================================ */
  function turmaPassos(area, ctx, snap) {
    var dia = diaDaTela(snap), di = snap.dias.indexOf(dia);
    var resumoDias = snap.dias.map(function (d, i) {
      var p2 = snap.jovens.filter(function (j) { return presente(snap, j.id, d) === true; }).length, f2 = snap.jovens.filter(function (j) { return presente(snap, j.id, d) === false; }).length;
      return 'Dia ' + (i + 1) + ': ' + (p2 + f2 ? p2 + ' presente(s) · ' + f2 + ' falta(s)' : 'a marcar');
    }).join('  |  ');
    var marc = snap.jovens.filter(function (j) { return presente(snap, j.id, dia) !== null; }).length;
    var pres = snap.jovens.filter(function (j) { return presente(snap, j.id, dia) === true; }).length;
    var nGrupos = {}; snap.jovens.forEach(function (j) { if (j.grupo) nGrupos[j.grupo] = (nGrupos[j.grupo] || 0) + 1; });
    var listaG = Object.keys(nGrupos).map(Number).sort(function (a, b) { return a - b; });
    var meus = listaG.filter(function (g) { return snap.grupos[g] === meuId(); }), livres = listaG.filter(function (g) { return !snap.grupos[g]; });
    var ok1 = marc === snap.jovens.length && snap.jovens.length > 0, ok2 = listaG.length > 0, ok3 = ok2 && !livres.length;
    function passo(n, ok, ativo, tit, sub, href) {
      return '<div class="pd' + (ok ? ' ok' : (ativo ? ' on' : '')) + '"><span class="n">' + (ok ? '✓' : n) + '</span><div class="pd-txt"><b>' + tit + '</b><small>' + sub + '</small></div>' + (href ? '<a class="btn btn-p" href="' + href + '">Abrir</a>' : '') + '</div>';
    }
    area.innerHTML = '<a class="voltar" href="#/processos">← Profiling Empresas</a>' +
      '<header class="cabecalho"><div><h1>' + esc(snap.turma.nome) + ' · dia ' + (di + 1) + ' de ' + snap.dias.length + '</h1><p>' + esc(snap.empresa.nome + ' · ' + snap.processo.vaga + ' · ' + D.longa(dia)) + '</p></div>' +
        '<div class="tp-acoes">' + (snap.dias.length > 1 ? '<div class="segmentos" role="group" aria-label="Dia">' + snap.dias.map(function (d, i) { return '<button type="button" data-tdia="' + d + '" aria-pressed="' + (d === dia) + '">Dia ' + (i + 1) + ' · ' + esc(D.curta(d)) + '</button>'; }).join('') + '</div>' : '') +
        (navigator.onLine ? '<button type="button" class="btn btn-p" id="tp-atual">⟳ Atualizar</button>' : '') + '</div></header>' +
      '<span class="baixado">✓ Disponível sem internet · atualizado às ' + hora(snap.baixado_em) + '</span>' +
      '<div class="passos-d">' +
        passo(1, ok1, !ok1, 'Presença', snap.dias.length > 1 ? resumoDias : (marc ? pres + ' presente(s) · ' + (marc - pres) + ' falta(s)' + (marc < snap.jovens.length ? ' · ' + (snap.jovens.length - marc) + ' a marcar' : '') : snap.jovens.length + ' jovens a marcar'), '#/avaliar/' + snap.turma.id + '/presenca') +
        passo(2, ok2, ok1 && !ok2, 'Grupos', ok2 ? listaG.length + ' grupo(s) (' + listaG.map(function (g) { return nGrupos[g]; }).join(', ') + ')' : 'Montar os grupos com os presentes do 1º dia', '#/avaliar/' + snap.turma.id + '/grupos') +
        passo(3, ok3, ok2 && !ok3, 'Avaliadores dos grupos', !ok2 ? 'Depois de montar os grupos' : (meus.length ? 'Você: grupo' + (meus.length > 1 ? 's ' : ' ') + meus.join(' e ') : 'Você ainda não escolheu grupos') + (livres.length ? ' · falta escolher: ' + livres.join(', ') : ' · todos os grupos têm avaliador'), ok2 ? '#/avaliar/' + snap.turma.id + '/avaliadores' : null) +
        passo(4, !!snap.turma.concluida_em, ok3 && !snap.turma.concluida_em, 'Lançar notas', ok3 ? notasResumo(snap) : 'Liberado quando todos os grupos tiverem avaliador', ok3 ? '#/avaliar/' + snap.turma.id + '/notas' : null) +
        passo(5, !!snap.turma.concluida_em, false, 'Fechar turma', snap.turma.concluida_em ? 'Concluída em ' + D.completa(snap.turma.concluida_em.slice(0, 10)) + (ctx.perfil.perfil === 'admin' ? ' · o administrador pode reabrir' : '') : 'Conferir pendências e concluir', '#/avaliar/' + snap.turma.id + '/fechar') +
      '</div>' +
      '<div class="bloco-botoes"><a class="btn btn-p" href="#/avaliar/' + snap.turma.id + '/desistencias">Desistências (' + listaDesist(snap).length + ')</a></div>';
    area.querySelectorAll('[data-tdia]').forEach(function (b) { b.addEventListener('click', function () { escolherDia(snap, b.getAttribute('data-tdia')); turmaPassos(area, ctx, snap); barraSync(area); }); });
    var at = area.querySelector('#tp-atual');
    if (at) at.addEventListener('click', function () { ui.executar(at, 'Atualizando…', async function () { try { var s = await obterTurma(snap.turma.id, true); turmaPassos(area, ctx, s); barraSync(area); ui.toast('Turma atualizada.', 'ok'); } catch (e) { erro(e); } }); });
  }

  /* ================================================================
     PRESENÇA (funciona sem internet)
     ================================================================ */
  function presenca(area, ctx, snap) {
    var dia = diaDaTela(snap), di = snap.dias.indexOf(dia), busca = '';
    function marcar(j, valor) {
      var em = new Date().toISOString();
      snap.presencas[j.id + '|' + dia] = { presente: valor, em: em };
      OFF.guardarTurma(snap);
      OFF.adicionar({ tipo: 'presenca', turma_id: snap.turma.id, dados: { participacao_id: j.id, dia: dia, presente: valor, em: em } });
    }
    area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '">← ' + esc(snap.turma.nome) + '</a>' +
      '<header class="cabecalho"><div><h1>Presença · ' + esc(snap.turma.nome) + '</h1><p>' + esc(snap.empresa.nome) + ' · dia ' + (di + 1) + ' de ' + snap.dias.length + ' · ' + D.curta(dia) + '</p></div>' +
      (snap.dias.length > 1 ? '<div class="segmentos" role="group" aria-label="Dia">' + snap.dias.map(function (d, i) { return '<button type="button" data-dia="' + d + '" aria-pressed="' + (d === dia) + '">Dia ' + (i + 1) + '</button>'; }).join('') + '</div>' : '') + '</header>' +
      '<div class="resumo-p" id="pr-res"></div>' +
      (snap.turma.concluida_em ? '' : '<div class="bloco-botoes"><button type="button" class="btn btn-pri" id="pr-todos">✓ Marcar todos presentes</button></div>') +
      '<label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="pr-busca" placeholder="Buscar por nome ou código"></label>' +
      '<div id="pr-lista" class="pr-lista"></div>' +
      '<button type="button" class="fab" id="pr-qr">📷 Ler crachá</button>';
    function desenhar() {
      var p = 0, f = 0, a = 0;
      snap.jovens.forEach(function (j) { var v = presente(snap, j.id, dia); if (v === true) p++; else if (v === false) f++; else a++; });
      area.querySelector('#pr-res').innerHTML = '<div><b>' + p + '</b><span>presentes</span></div><div><b>' + f + '</b><span>faltaram</span></div><div><b>' + a + '</b><span>a marcar</span></div>';
      var itens = snap.jovens.filter(function (j) { return !busca || ui.normalizar(j.nome + ' ' + j.codigo).indexOf(busca) >= 0; });
      area.querySelector('#pr-lista').innerHTML = itens.map(function (j) {
        var v = presente(snap, j.id, dia);
        var man = (snap.desistencias || []).some(function (d) { return d.participacao_id === j.id; }), fech = !!snap.turma.concluida_em;
        return '<div class="pres" id="pj-' + j.id + '"><span class="ft">' + esc(ui.iniciais(j.nome)) + '</span><div class="tx"><b>' + esc(j.nome) + '</b><small>' + esc(j.codigo) + (v === false ? ' · desistência' : (man ? ' · desistência registrada' : '')) + '</small></div>' +
          '<div class="tg" role="group" aria-label="Presença de ' + esc(j.nome) + '"><button type="button" data-p="' + j.id + '" data-v="1" aria-pressed="' + (v === true) + '"' + (fech ? ' disabled' : '') + '>Presente</button><button type="button" data-p="' + j.id + '" data-v="0" aria-pressed="' + (v === false) + '"' + (fech ? ' disabled' : '') + '>Faltou</button></div></div>';
      }).join('') || '<div class="card vazio">Ninguém encontrado.</div>';
      area.querySelectorAll('[data-p]').forEach(function (b) {
        b.addEventListener('click', function () {
          var j = snap.jovens.filter(function (x) { return x.id === b.getAttribute('data-p'); })[0];
          marcar(j, b.getAttribute('data-v') === '1'); desenhar();
        });
      });
    }
    area.querySelector('#pr-busca').addEventListener('input', function (e) { busca = ui.normalizar(e.target.value); desenhar(); });
    area.querySelectorAll('[data-dia]').forEach(function (b) { b.addEventListener('click', function () { escolherDia(snap, b.getAttribute('data-dia')); presenca(area, ctx, snap); barraSync(area); }); });
    var todos = area.querySelector('#pr-todos');
    if (todos) todos.addEventListener('click', async function () {
      // só quem ainda não foi marcado neste dia e não tem desistência registrada
      var alvo = snap.jovens.filter(function (j) { return presente(snap, j.id, dia) === null && !(snap.desistencias || []).some(function (d) { return d.participacao_id === j.id; }); });
      if (!alvo.length) { ui.toast('Todos já estão marcados neste dia.', 'info'); return; }
      if (!(await ui.confirmar('Marcar ' + alvo.length + ' jovem(ns) como presente(s)?', 'Vale para o dia ' + (di + 1) + ' (' + D.curta(dia) + '). Quem já está como "Faltou" não muda. Depois é só trocar quem faltou.', 'Marcar presentes', 'Cancelar'))) return;
      alvo.forEach(function (j) { marcar(j, true); });
      desenhar(); ui.toast(alvo.length + ' presença(s) marcada(s).', 'ok');
    });
    area.querySelector('#pr-qr').addEventListener('click', function () {
      lerCracha(snap, function (j) { return { texto: presente(snap, j.id, dia) === true ? 'Já está presente' : 'Marcar presente', acao: function () { marcar(j, true); desenhar(); ui.toast(j.nome + ': presente.', 'ok'); } }; });
    });
    desenhar();
  }

  /* ================================================================
     GRUPOS (com internet): sugestão automática com os presentes do 1º dia
     ================================================================ */
  function grupos(area, ctx, snap) {
    var admin = ctx.perfil.perfil === 'admin';
    var travado = Object.keys(snap.grupos).length > 0 && !admin;
    var dia1 = snap.dias[0];
    var base = snap.jovens.filter(function (j) { return presente(snap, j.id, dia1) !== false; });
    var atual = {}; snap.jovens.forEach(function (j) { if (j.grupo) atual[j.id] = j.grupo; });
    var temGrupos = Object.keys(atual).length > 0;
    var nG = temGrupos ? Math.max.apply(null, Object.keys(atual).map(function (k) { return atual[k]; })) : Math.max(1, Math.ceil(base.length / 5));
    function sugerir() {
      var lista = base.slice();
      for (var i = lista.length - 1; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)); var t = lista[i]; lista[i] = lista[r]; lista[r] = t; }
      atual = {}; lista.forEach(function (j, i) { atual[j.id] = (i % nG) + 1; });
    }
    if (!temGrupos) sugerir();
    function desenhar() {
      var cont = {}; Object.keys(atual).forEach(function (k) { cont[atual[k]] = (cont[atual[k]] || 0) + 1; });
      area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '">← ' + esc(snap.turma.nome) + '</a>' +
        '<header class="cabecalho"><div><h1>' + (travado ? 'Grupos' : 'Montar grupos') + '</h1><p>' + base.length + ' presente(s) no 1º dia · ' + nG + ' grupo(s) (' + Array.apply(null, { length: nG }).map(function (x, i) { return cont[i + 1] || 0; }).join(', ') + ')</p></div></header>' +
        (travado ? '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>Os grupos já têm avaliadores e valem para o processo inteiro. Só o administrador pode mudar um jovem de grupo.</span></div>'
          : '<div class="bloco-botoes"><button type="button" class="btn btn-p" id="gr-sug">🔀 Nova sugestão</button><label class="sel-ng"><span>Nº de grupos</span><select class="entrada" id="gr-n">' +
            Array.apply(null, { length: 8 }).map(function (x, i) { return '<option' + (i + 1 === nG ? ' selected' : '') + '>' + (i + 1) + '</option>'; }).join('') + '</select></label></div>' +
            (!navigator.onLine ? '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>Para confirmar os grupos é preciso internet (todos os avaliadores precisam ver a mesma divisão).</span></div>' : '')) +
        Array.apply(null, { length: nG }).map(function (x, gi) {
          var g = gi + 1, js = snap.jovens.filter(function (j) { return atual[j.id] === g; });
          return '<section class="card gr"><h3>GRUPO ' + g + '<small>' + js.length + ' jove' + (js.length === 1 ? 'm' : 'ns') + '</small></h3>' + js.map(function (j) {
            return '<div class="gj"><span>' + esc(j.nome) + '</span>' + (travado ? '' : '<select class="sel-gj" data-j="' + j.id + '" aria-label="Grupo de ' + esc(j.nome) + '">' + Array.apply(null, { length: nG }).map(function (y, k) { return '<option value="' + (k + 1) + '"' + (k + 1 === g ? ' selected' : '') + '>Grupo ' + (k + 1) + '</option>'; }).join('') + '</select>') + '</div>';
          }).join('') + '</section>';
        }).join('') +
        (snap.jovens.filter(function (j) { return !atual[j.id]; }).length ? '<p class="dica">Sem grupo (faltaram no 1º dia): ' + esc(snap.jovens.filter(function (j) { return !atual[j.id]; }).map(function (j) { return j.nome; }).join(', ')) + '</p>' : '') +
        (travado ? '' : '<button type="button" class="btn btn-pri" id="gr-ok">Confirmar grupos</button>');
      if (travado) return;
      area.querySelector('#gr-sug').addEventListener('click', function () { sugerir(); desenhar(); barraSync(area); });
      area.querySelector('#gr-n').addEventListener('change', function (e) { nG = +e.target.value; sugerir(); desenhar(); barraSync(area); });
      area.querySelectorAll('[data-j]').forEach(function (s) { s.addEventListener('change', function () { atual[s.getAttribute('data-j')] = +s.value; desenhar(); barraSync(area); }); });
      area.querySelector('#gr-ok').addEventListener('click', function (ev) {
        if (!navigator.onLine) { ui.toast('Conecte-se à internet para confirmar os grupos.', 'erro'); return; }
        var cont2 = {}; Object.keys(atual).forEach(function (k) { cont2[atual[k]] = 1; });
        if (Object.keys(cont2).length < nG) { ui.toast('Há grupo vazio. Ajuste a divisão ou o número de grupos.', 'erro'); return; }
        ui.executar(ev.currentTarget, 'Salvando…', async function () {
          try {
            await dados.avaliacao.salvarGrupos(snap.turma.id, snap.jovens.map(function (j) { return { participacao_id: j.id, grupo: atual[j.id] || null }; }));
            await obterTurma(snap.turma.id, true); ui.toast('Grupos confirmados.', 'ok'); window.location.hash = '#/avaliar/' + snap.turma.id + '/avaliadores';
          } catch (e) { erro(e); }
        });
      });
    }
    desenhar();
  }

  /* ================================================================
     AVALIADORES DOS GRUPOS (com internet)
     ================================================================ */
  function avaliadores(area, ctx, snap) {
    var admin = ctx.perfil.perfil === 'admin', eu = meuId();
    var cont = {}; snap.jovens.forEach(function (j) { if (j.grupo) (cont[j.grupo] = cont[j.grupo] || []).push(j.nome.split(' ')[0]); });
    var lista = Object.keys(cont).map(Number).sort(function (a, b) { return a - b; });
    var escolha = lista.filter(function (g) { return snap.grupos[g] === eu; });
    function desenhar() {
      area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '">← ' + esc(snap.turma.nome) + '</a>' +
        '<header class="cabecalho"><div><h1>Avaliadores dos grupos</h1><p>Toque nos grupos que você vai avaliar. Vale para o processo inteiro.</p></div></header>' +
        (lista.length ? lista.map(function (g) {
          var dono = snap.grupos[g], meu = escolha.indexOf(g) >= 0, outro = dono && dono !== eu;
          return '<div class="gbtn' + (meu ? ' eu' : '') + (outro ? ' outro' : '') + '"><button type="button" class="gbtn-area" data-g="' + g + '"' + (outro ? ' disabled' : '') + ' aria-pressed="' + meu + '"><span class="gbtn-txt"><b>GRUPO ' + g + '</b><small>' + cont[g].length + ' jove' + (cont[g].length === 1 ? 'm' : 'ns') + ' · ' + esc(cont[g].slice(0, 3).join(', ')) + (cont[g].length > 3 ? '…' : '') + '</small></span>' +
            '<span class="av ' + (meu ? 'eu' : '') + '">' + (meu ? 'Você' : (outro ? esc((snap.equipe[dono] || 'OUTRO AVALIADOR').split(' ')[0]) : 'sem avaliador')) + '</span><span class="ck">' + (meu ? '✓' : (outro ? '🔒' : '')) + '</span></button>' +
            (admin && outro ? '<select class="entrada sel-av" data-troca="' + g + '" aria-label="Trocar avaliador do grupo ' + g + '"><option value="">Trocar avaliador…</option>' + Object.keys(snap.equipe).map(function (id) { return '<option value="' + id + '"' + (id === dono ? ' disabled' : '') + '>' + esc(snap.equipe[id]) + '</option>'; }).join('') + '</select>' : '') + '</div>';
        }).join('') : '<div class="card vazio">Monte os grupos primeiro.</div>') +
        '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>Os jovens dos seus grupos ficam com você em todos os dias da turma. Para os outros grupos, você pode <b>sugerir</b> uma nota (com justificativa), e o avaliador do grupo aprova ou nega.</span></div>' +
        (lista.length ? '<button type="button" class="btn btn-pri" id="av-ok">' + (escolha.length ? 'Confirmar meus grupos (' + escolha.join(' e ') + ')' : 'Confirmar (sem grupos)') + '</button>' : '');
      area.querySelectorAll('[data-g]').forEach(function (b) {
        b.addEventListener('click', function () { var g = +b.getAttribute('data-g'), i = escolha.indexOf(g); if (i >= 0) escolha.splice(i, 1); else escolha.push(g); escolha.sort(function (a, c) { return a - c; }); desenhar(); barraSync(area); });
      });
      area.querySelectorAll('[data-troca]').forEach(function (s) {
        s.addEventListener('change', async function () {
          if (!s.value) return;
          try { await dados.avaliacao.definirAvaliador(snap.turma.id, +s.getAttribute('data-troca'), s.value); snap = await obterTurma(snap.turma.id, true); ui.toast('Avaliador do grupo trocado.', 'ok'); avaliadores(area, ctx, snap); barraSync(area); } catch (e) { erro(e); }
        });
      });
      var ok = area.querySelector('#av-ok');
      if (ok) ok.addEventListener('click', function () {
        if (!navigator.onLine) { ui.toast('Conecte-se à internet para confirmar os grupos.', 'erro'); return; }
        ui.executar(ok, 'Salvando…', async function () {
          try { await dados.avaliacao.escolherGrupos(snap.turma.id, escolha); await obterTurma(snap.turma.id, true); ui.toast('Seus grupos foram confirmados.', 'ok'); window.location.hash = '#/avaliar/' + snap.turma.id; }
          catch (e) { erro(e); try { snap = await obterTurma(snap.turma.id, true); avaliadores(area, ctx, snap); barraSync(area); } catch (x) { /* mantém a tela */ } }
        });
      });
    }
    desenhar();
  }

  /* ================================================================
     LEITOR DO CRACHÁ (câmera; funciona sem internet)
     ================================================================ */
  function lerCracha(snap, aoAchar) {
    var f = document.createElement('div'); f.className = 'cam'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', 'Ler crachá');
    f.innerHTML = '<div class="cam-topo"><button type="button" class="btn btn-p" id="cam-x">✕ Fechar</button><b>Ler crachá</b><span></span></div>' +
      '<div class="cam-v"><video playsinline muted></video><div class="moldura"><div class="linha"></div></div></div><div class="cam-res" id="cam-res"><p>Aponte a câmera para o QR Code do crachá.</p>' +
      '<label class="cam-cod"><span>ou digite o código</span><input class="entrada" id="cam-cod" placeholder="EX.: K7P4-29" maxlength="7" autocomplete="off"></label></div>';
    document.body.appendChild(f);
    var video = f.querySelector('video'), stream = null, ativo = true, detector = null, canvas = document.createElement('canvas'), c2 = canvas.getContext('2d', { willReadFrequently: true });
    function fechar() { ativo = false; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); f.remove(); }
    f.querySelector('#cam-x').addEventListener('click', fechar);
    function mostrar(codigo) {
      var cod = String(codigo || '').trim().toUpperCase();
      var j = snap.jovens.filter(function (x) { return x.codigo === cod; })[0];
      var res = f.querySelector('#cam-res');
      if (!j) { res.innerHTML = '<p class="alerta-txt">Código ' + esc(cod) + ' não pertence a esta turma.</p>'; setTimeout(function () { if (ativo) res.innerHTML = '<p>Aponte a câmera para o QR Code do crachá.</p>'; }, 2500); return; }
      var r = aoAchar(j);
      res.innerHTML = '<div class="achou"><span class="ft">' + esc(ui.iniciais(j.nome)) + '</span><div style="flex:1;min-width:0"><b>' + esc(j.nome) + '</b><small>' + esc(j.codigo + ' · ' + snap.turma.nome) + '</small></div><button type="button" class="btn btn-pri btn-p" id="cam-acao">' + esc(r.texto) + '</button></div>';
      res.querySelector('#cam-acao').addEventListener('click', function () { r.acao(); res.innerHTML = '<p>Pronto. Aponte para o próximo crachá.</p>'; });
    }
    var cod = f.querySelector('#cam-cod');
    cod.addEventListener('input', function () { if (/^[A-Z2-9]{4}-\d{2}$/.test(cod.value.trim().toUpperCase())) mostrar(cod.value); });
    var ultimo = '', quando = 0;
    function lido(txt) { if (txt === ultimo && Date.now() - quando < 3000) return; ultimo = txt; quando = Date.now(); if (navigator.vibrate) navigator.vibrate(60); mostrar(txt); }
    async function quadro() {
      if (!ativo) return;
      try {
        if (video.readyState >= 2) {
          if (detector) { var cods = await detector.detect(video); if (cods[0]) lido(cods[0].rawValue); }
          else if (window.jsQR) {
            var w = video.videoWidth, h = video.videoHeight, k = Math.min(1, 640 / w);
            canvas.width = Math.round(w * k); canvas.height = Math.round(h * k); c2.drawImage(video, 0, 0, canvas.width, canvas.height);
            var img = c2.getImageData(0, 0, canvas.width, canvas.height), r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (r && r.data) lido(r.data);
          }
        }
      } catch (e) { /* tenta no próximo quadro */ }
      setTimeout(quadro, 180);
    }
    (async function () {
      try {
        if ('BarcodeDetector' in window) { try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; } }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = stream; await video.play(); quadro();
      } catch (e) {
        f.querySelector('.cam-v').innerHTML = '<div class="aviso aviso-erro" style="margin:20px">' + ui.icone('alerta', 18) + '<span>Não foi possível abrir a câmera. Permita o acesso à câmera para este site, ou digite o código abaixo.</span></div>';
        cod.focus();
      }
    })();
    window.CF.__lerCodigo = mostrar;   // usado nos testes automáticos
  }
  /* ================================================================
     DESISTÊNCIAS
     ================================================================ */
  var MOTIVOS = ['SAIU DURANTE O PROCESSO', 'PROBLEMA DE SAÚDE', 'CONSEGUIU OUTRO EMPREGO', 'NÃO QUIS CONTINUAR', 'OUTRO MOTIVO'];
  function desistencias(area, ctx, snap) {
    var admin = ctx.perfil.perfil === 'admin', fech = !!snap.turma.concluida_em, l = listaDesist(snap);
    area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '">← ' + esc(snap.turma.nome) + '</a>' +
      '<header class="cabecalho"><div><h1>Desistências · ' + esc(snap.turma.nome) + '</h1><p>Automáticas pela presença' + (admin ? ' · o administrador pode registrar outros casos' : '') + '</p></div></header>' +
      (l.length ? l.map(function (x) {
        var sub = x.falta ? 'Faltou no dia ' + (snap.dias.indexOf(x.falta) + 1) + ' (' + D.curta(x.falta) + ') · automática' : 'Registrada por ' + esc((snap.equipe[x.man.registrado_por] || 'administrador').split(' ')[0]) + (x.man.dia ? ' · ' + D.curta(x.man.dia) : '');
        return '<div class="des"><div class="tx"><b>' + esc(x.j.nome) + '</b><small>' + sub + (x.man ? ' · ' + esc(x.man.motivo) + (x.man.observacao ? ' · ' + esc(x.man.observacao) : '') : '') + '</small></div>' +
          (x.man && admin && !fech ? '<button type="button" class="btn btn-p" data-desfaz="' + x.j.id + '">Desfazer</button>' : '') + ui.pill('Desistência', 'nao') + '</div>';
      }).join('') : '<div class="card vazio">Nenhuma desistência.</div>') +
      (admin && !fech ? '<button type="button" class="btn" id="ds-novo" style="align-self:flex-start">+ Registrar desistência</button>' : '') +
      '<p class="dica">Quem desistiu fica bloqueado no lançamento e aparece como "Desistência" na classificação. Se o jovem faltou num dia mas estava presente, corrija a presença na tela de Presença.</p>';
    async function recarregar() { try { var sn = OFF.guardarTurma(await dados.avaliacao.baixarTurma(snap.turma.id)); desistencias(area, ctx, sn); barraSync(area); } catch (e) { erro(e); } }
    area.querySelectorAll('[data-desfaz]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!navigator.onLine) { ui.toast('Conecte-se à internet.', 'erro'); return; }
        if (!(await ui.confirmar('Desfazer a desistência?', 'O jovem volta a ficar ativo no lançamento das notas.', 'Desfazer', 'Cancelar'))) return;
        try { await dados.avaliacao.removerDesistencia(b.getAttribute('data-desfaz')); ui.toast('Desistência desfeita.', 'ok'); recarregar(); } catch (e) { erro(e); }
      });
    });
    var nv = area.querySelector('#ds-novo');
    if (nv) nv.addEventListener('click', function () {
      if (!navigator.onLine) { ui.toast('Conecte-se à internet para registrar.', 'erro'); return; }
      var ativos = snap.jovens.filter(function (j) { return !l.some(function (x) { return x.j.id === j.id; }); });
      ui.janela({ titulo: 'Registrar desistência', confirmarDescarte: false,
        corpo: '<label class="campo"><span>Jovem</span><select class="entrada" id="ds-j">' + ativos.map(function (j) { return '<option value="' + j.id + '">' + esc(j.nome) + '</option>'; }).join('') + '</select></label>' +
          '<div class="form-grade"><label class="campo"><span>Motivo</span><select class="entrada" id="ds-m">' + MOTIVOS.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>Dia</span><select class="entrada" id="ds-d">' + snap.dias.map(function (d, i) { return '<option value="' + d + '"' + (d === diaAtual(snap) ? ' selected' : '') + '>Dia ' + (i + 1) + ' · ' + D.curta(d) + '</option>'; }).join('') + '</select></label></div>' +
          '<label class="campo"><span>Observação (opcional)</span><input class="entrada" id="ds-o" maxlength="200"></label>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Registrar', principal: true, aoClicar: async function (f) {
          try { await dados.avaliacao.registrarDesistencia(f.querySelector('#ds-j').value, f.querySelector('#ds-m').value, f.querySelector('#ds-d').value, ui.maiusculas(f.querySelector('#ds-o').value.trim())); ui.toast('Desistência registrada.', 'ok'); recarregar(); return true; }
          catch (e) { erro(e); return false; }
        } }] });
    });
  }

  /* ================================================================
     FECHAR TURMA (com internet)
     ================================================================ */
  async function fechar(area, ctx, snap) {
    var admin = ctx.perfil.perfil === 'admin';
    var fila = OFF.fila().filter(function (o) { return o.turma_id === snap.turma.id; }).length;
    area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '">← ' + esc(snap.turma.nome) + '</a>' +
      '<header class="cabecalho"><div><h1>Fechar turma · ' + esc(snap.turma.nome) + '</h1><p>' + esc(snap.empresa.nome + ' · ' + snap.processo.vaga) + ' · ' + snap.dias.length + ' dia(s)</p></div></header><div id="fc"><div class="girando" style="margin:30px auto"></div></div>';
    barraSync(area);
    var box = area.querySelector('#fc');
    if (snap.turma.concluida_em) {
      box.innerHTML = '<div class="aviso aviso-ok">' + ui.icone('ok', 18) + '<span>Turma <b>concluída</b> em ' + D.completa(snap.turma.concluida_em.slice(0, 10)) + '. As notas e a presença estão travadas.</span></div>' +
        (admin ? '<button type="button" class="btn" id="fc-reabrir" style="align-self:flex-start">Reabrir turma</button>' : '<p class="dica">Só o administrador pode reabrir a turma.</p>');
      var rb = box.querySelector('#fc-reabrir');
      if (rb) rb.addEventListener('click', function () {
        ui.janela({ titulo: 'Reabrir a turma?', confirmarDescarte: false,
          corpo: '<p style="margin:0;color:var(--texto-2)">As notas voltam a poder ser alteradas. O motivo fica registrado no histórico.</p><label class="campo"><span>Motivo <span class="obrig">*</span></span><input class="entrada" id="rb-m" maxlength="200"></label>',
          botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Reabrir', principal: true, aoClicar: async function (f) {
            var mot = ui.maiusculas(f.querySelector('#rb-m').value.trim());
            if (mot.length < 5) { ui.toast('Informe o motivo.', 'erro'); return false; }
            try { await dados.avaliacao.reabrirTurma(snap.turma.id, mot); var sn = OFF.guardarTurma(await dados.avaliacao.baixarTurma(snap.turma.id)); ui.toast('Turma reaberta.', 'ok'); fechar(area, ctx, sn); return true; } catch (e) { erro(e); return false; }
          } }] });
      });
      return;
    }
    if (!navigator.onLine) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>Para conferir as pendências e concluir a turma é preciso internet.</span></div>'; return; }
    var pend;
    try { if (fila) await OFF.enviar(); pend = await dados.avaliacao.pendencias(snap.turma.id); } catch (e) { erro(e); box.innerHTML = ''; return; }
    fila = OFF.fila().filter(function (o) { return o.turma_id === snap.turma.id; }).length;
    var nP = snap.dias.length, l = listaDesist(snap);
    var pres = snap.dias.map(function (d, i) { return 'Dia ' + (i + 1) + ': ' + snap.jovens.filter(function (j) { return presente(snap, j.id, d) === true; }).length + ' presentes'; }).join(' · ');
    var itens = [];
    pend.presenca.forEach(function (x) { itens.push('<b>Presença não marcada</b> · ' + D.curta(x.dia) + ': ' + x.faltam + ' jovem(ns) <a href="#/avaliar/' + snap.turma.id + '/presenca">marcar</a>'); });
    if (pend.sem_grupo.length) itens.push('<b>' + pend.sem_grupo.length + ' jovem(ns) sem grupo</b> <a href="#/avaliar/' + snap.turma.id + '/grupos">ver</a>');
    if (pend.grupos_sem_avaliador.length) itens.push('<b>Grupo(s) sem avaliador:</b> ' + pend.grupos_sem_avaliador.join(', ') + ' <a href="#/avaliar/' + snap.turma.id + '/avaliadores">escolher</a>');
    pend.notas.forEach(function (x) { itens.push('<b>' + x.notas + ' nota(s) faltando</b> · Grupo ' + (x.grupo || '?') + (x.avaliador ? ' (' + esc(String(x.avaliador).split(' ')[0]) + ')' : '') + ': ' + esc(x.teste) + ' · ' + x.jovens + ' jovem(ns) <a href="#/avaliar/' + snap.turma.id + '/notas">ver</a>'); });
    if (pend.sugestoes.length) itens.push('<b>' + pend.sugestoes.length + ' sugestão(ões) aguardando decisão</b> <a href="#/avaliar/' + snap.turma.id + '/sugestoes">decidir</a>');
    if (fila) itens.push('<b>' + fila + ' item(ns) deste aparelho ainda não enviados</b> · conecte-se e aguarde o envio');
    var livre = !itens.length;
    box.innerHTML = '<div class="pd ok"><span class="n">✓</span><div class="pd-txt"><b>Presença</b><small>' + pres + '</small></div></div>' +
      '<div class="pd ok"><span class="n">✓</span><div class="pd-txt"><b>Desistências</b><small>' + l.length + ' jovem(ns)' + (l.length ? ' · <a href="#/avaliar/' + snap.turma.id + '/desistencias">ver</a>' : '') + '</small></div></div>' +
      '<div class="pd ' + (livre ? 'ok' : 'on') + '"><span class="n">' + (livre ? '✓' : '!') + '</span><div class="pd-txt"><b>' + (livre ? 'Nenhuma pendência' : 'Pendências para fechar') + '</b><small>' + (livre ? 'A turma pode ser concluída.' : 'Resolva antes de concluir a turma.') + '</small></div></div>' +
      (livre ? '' : '<div class="pend-l">' + itens.map(function (t) { return '<div><span class="x">✕</span><span>' + t + '</span></div>'; }).join('') + '</div>') +
      '<button type="button" class="btn btn-pri" id="fc-ok"' + (livre ? '' : ' disabled') + '>Concluir turma</button>' +
      '<p class="dica">Ao concluir, as notas e a presença da turma ficam travadas. Só o administrador pode reabrir (com motivo registrado no histórico).</p>';
    var ok = box.querySelector('#fc-ok');
    if (livre) ok.addEventListener('click', async function () {
      if (!(await ui.confirmar('Concluir a turma?', 'As notas e a presença ficam travadas.', 'Concluir turma', 'Cancelar'))) return;
      try { await dados.avaliacao.concluirTurma(snap.turma.id); var sn = OFF.guardarTurma(await dados.avaliacao.baixarTurma(snap.turma.id)); ui.toast('Turma concluída.', 'ok'); fechar(area, ctx, sn); } catch (e) { erro(e); }
    });
  }

  window.CF.lerCracha = lerCracha;
  window.CF.barraSync = barraSync;
  function notasResumo(snap) {
    var ts = ((snap.processo.configuracao || {}).testes || []), tot = 0, feitas = 0;
    var meus = snap.jovens.filter(function (j) { return j.grupo && (snap.grupos[j.grupo] === meuId() || (window.CF.perfilAtual || {}).perfil === 'admin'); });
    meus.forEach(function (j) { ts.forEach(function (t) { t.criterios.forEach(function (c) { tot++; if (snap.notas && snap.notas[j.id + '|' + c.id]) feitas++; }); }); });
    var pend = (snap.sugestoes || []).filter(function (x) { return x.situacao === 'pendente' && x.autor_id !== meuId() && meus.some(function (j) { return j.id === x.participacao_id; }); }).length;
    return 'Liberado · ' + feitas + ' de ' + tot + ' notas dos seus jovens' + (pend ? ' · ' + pend + ' sugestão(ões) para decidir' : '');
  }
})();
