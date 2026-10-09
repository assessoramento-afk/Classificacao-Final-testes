/* =====================================================================
   Classificação Final · views/processos.js
   Processos: lista em cards, novo/editar em 4 passos e painel.
   Endereços: #/processos (lista) e #/processos/<id> (painel).
   Avaliador consulta; só o administrador cria, altera e exclui.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var SITUACOES = {
    montagem: ['Em montagem', '#8b6fd6'], andamento: ['Em andamento', '#ee7330'],
    revisao: ['Em revisão', '#3557e0'], liberado: ['Liberado', '#3f8f9a'], cancelado: ['Cancelado', '#6f6869']
  };
  var NIVEIS = { iniciante: 'Iniciante', jovem_aprendiz: 'Jovem Aprendiz' };
  var logos = {};

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function porId(l, id) { return l.filter(function (x) { return x.id === id; })[0]; }
  function fmtNota(n) { return n == null ? '' : Number(n).toFixed(2).replace('.', ','); }
  function numero(v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function dataBR(d) { if (!d) return ''; var p = String(d).split('-'); return p[2] + '/' + p[1]; }
  function periodo(p) {
    if (!p.data_inicio && !p.data_fim) return 'a definir';
    if (p.data_inicio && p.data_fim && p.data_inicio !== p.data_fim) return dataBR(p.data_inicio) + '–' + dataBR(p.data_fim);
    return dataBR(p.data_inicio || p.data_fim);
  }
  function turmasDe(ag, pid) { return ag ? ag.turmas.filter(function (t) { return t.processo_id === pid; }) : []; }
  function diasDaTurma(ag, tid) { return ag ? ag.dias.filter(function (d) { return d.turma_id === tid; }).map(function (d) { return d.data; }).sort() : []; }
  // Período a partir das turmas; sem turmas, usa a previsão do processo
  function periodoReal(ag, p) {
    var dias = []; turmasDe(ag, p.id).forEach(function (t) { dias = dias.concat(diasDaTurma(ag, t.id)); });
    if (!dias.length) return periodo(p);
    dias.sort(); var a = dias[0], b = dias[dias.length - 1];
    return a === b ? dataBR(a) : dataBR(a) + '–' + dataBR(b);
  }
  function selo(s) { var x = SITUACOES[s] || SITUACOES.montagem; return '<span class="st" style="--sc:' + x[1] + '"><i></i>' + esc(x[0]) + '</span>'; }
  function logoHTML(emp, classe) { return '<span class="logo-mini ' + (classe || '') + '" data-logo="' + esc((emp && emp.logo_path) || '') + '">' + (emp && emp.logo_path ? '' : 'SEM LOGO') + '</span>'; }
  function carregarLogos(raiz) {
    raiz.querySelectorAll('[data-logo]').forEach(function (el) {
      var c = el.getAttribute('data-logo'); if (!c) return;
      var pronto = function (u) { if (u) el.innerHTML = '<img src="' + esc(u) + '" alt="">'; };
      if (logos[c]) { pronto(logos[c]); return; }
      dados.empresas.urlLogo(c).then(function (u) { logos[c] = u; pronto(u); });
    });
  }
  function idDaRota() { var m = (window.location.hash || '').match(/^#\/processos\/([0-9a-z-]{8,})/i); return m ? m[1] : null; }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.processos = function (area, ctx) {
    var mj = (window.location.hash || '').match(/^#\/processos\/([0-9a-z-]{8,})\/jovens/i);
    if (mj) { window.CF.telas.jovensProcesso(area, ctx, mj[1]); return; }
    var id = idDaRota();
    if (id) painel(area, ctx, id); else lista(area, ctx);
  };

  /* ================================================================
     LISTA
     ================================================================ */
  async function lista(area, ctx) {
    var admin = ctx.perfil.perfil === 'admin';
    var filtroSit = 'todos', busca = '', aba = 'aberto', ano = '';
    area.innerHTML = '<header class="cabecalho"><div><h1>Processos</h1><p>Processos seletivos de cada empresa</p></div>' +
      (admin ? '<button type="button" class="btn btn-pri" id="b-novo">' + ui.icone('mais', 17) + 'Novo processo</button>' : '') + '</header>' +
      '<div class="segmentos abas-proc" role="tablist" id="abas-p"></div>' +
      '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="busca-p" placeholder="Buscar por empresa, vaga ou processo"></label><select class="entrada oculto" id="ano-p" aria-label="Ano" style="width:170px"></select></div>' +
      '<div class="filtros" id="filtros" role="group" aria-label="Situação"></div><div id="procs"><div class="girando" style="margin:30px auto"></div></div>';
    var procs = [], empresas = [], ag = null, nJovens = {};
    try { var r = await Promise.all([dados.processos.listar(), dados.empresas.listar().catch(function () { return []; }), dados.agenda.carregarTudo().catch(function () { return null; }), dados.jovens.todasParticipacoes().catch(function () { return []; })]); procs = r[0]; empresas = r[1]; ag = r[2];
      r[3].forEach(function (x) { nJovens[x.processo_id] = (nJovens[x.processo_id] || 0) + 1; });
      if (!empresas.length && ag) empresas = ag.empresas; }
    catch (e) { erro(e); area.querySelector('#procs').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    if (admin) area.querySelector('#b-novo').addEventListener('click', function () { assistente(null, 1, ctx); });
    area.querySelector('#busca-p').addEventListener('input', function (e) { busca = ui.normalizar(e.target.value); desenhar(); });

    var FIM = ['liberado', 'cancelado'];
    function dataFim(p) { var d = []; turmasDe(ag, p.id).forEach(function (t) { d = d.concat(diasDaTurma(ag, t.id)); }); d.sort(); return d[d.length - 1] || (p.criado_em || '').slice(0, 10); }
    function desenhar() {
      var abertos = procs.filter(function (p) { return FIM.indexOf(p.situacao) < 0; }), fins = procs.filter(function (p) { return FIM.indexOf(p.situacao) >= 0; });
      var ab = area.querySelector('#abas-p');
      ab.innerHTML = '<button type="button" data-aba="aberto" aria-pressed="' + (aba === 'aberto') + '">Em aberto · ' + abertos.length + '</button><button type="button" data-aba="fim" aria-pressed="' + (aba === 'fim') + '">Finalizados · ' + fins.length + '</button>';
      ab.querySelectorAll('[data-aba]').forEach(function (b) { b.addEventListener('click', function () { aba = b.getAttribute('data-aba'); filtroSit = 'todos'; desenhar(); }); });
      var selAno = area.querySelector('#ano-p');
      selAno.classList.toggle('oculto', aba !== 'fim');
      area.querySelector('#filtros').classList.toggle('oculto', aba === 'fim');
      if (aba === 'fim') { finalizados(fins, selAno); return; }
      var cont = { todos: abertos.length };
      Object.keys(SITUACOES).forEach(function (k) { cont[k] = abertos.filter(function (p) { return p.situacao === k; }).length; });
      var opcoes = [['todos', 'Todos']].concat(Object.keys(SITUACOES).filter(function (k) { return FIM.indexOf(k) < 0; }).map(function (k) { return [k, SITUACOES[k][0]]; }));
      var fb = area.querySelector('#filtros');
      fb.innerHTML = opcoes.map(function (o) { return '<button type="button" data-sit="' + o[0] + '" aria-pressed="' + (filtroSit === o[0]) + '">' + esc(o[1]) + ' · ' + (cont[o[0]] || 0) + '</button>'; }).join('');
      fb.querySelectorAll('[data-sit]').forEach(function (b) { b.addEventListener('click', function () { filtroSit = b.getAttribute('data-sit'); desenhar(); }); });
      var itens = abertos.filter(function (p) {
        if (filtroSit !== 'todos' && p.situacao !== filtroSit) return false;
        var e = porId(empresas, p.empresa_id) || {};
        return !busca || ui.normalizar([e.nome_fantasia, e.razao_social, p.vaga, p.identificacao].join(' ')).indexOf(busca) >= 0;
      });
      var box = area.querySelector('#procs');
      if (!itens.length) {
        box.innerHTML = '<div class="card vazio">' + (procs.length ? 'Nenhum processo encontrado.' : 'Nenhum processo ainda.' + (admin ? ' Use "Novo processo" para começar.' : '')) + '</div>';
        return;
      }
      box.innerHTML = '<div class="procs">' + itens.map(function (p) {
        var e = porId(empresas, p.empresa_id) || {}, cor = (SITUACOES[p.situacao] || SITUACOES.montagem)[1];
        return '<a class="card proc" href="#/processos/' + p.id + '" style="--sc:' + cor + '">' +
          '<div class="proc-cab">' + logoHTML(e) + '<div class="proc-tit"><h3>' + esc(e.nome_fantasia || 'Empresa') + '</h3><small>' + esc(p.vaga) + ' · ' + esc(p.identificacao) + '</small>' +
          '<div>' + selo(p.situacao) + '</div></div></div>' +
          '<div class="nums"><div><b>' + turmasDe(ag, p.id).length + '</b><span>turmas</span></div><div><b>' + (nJovens[p.id] || 0) + '</b><span>jovens</span></div><div><b>' + esc(periodoReal(ag, p)) + '</b><span>período</span></div></div></a>';
      }).join('') + '</div>';
      carregarLogos(box);
    }
    // Finalizados: por empresa (A–Z) e, dentro dela, do mais recente para o mais antigo
    function finalizados(fins, selAno) {
      var anos = {}; fins.forEach(function (p) { anos[dataFim(p).slice(0, 4)] = 1; });
      selAno.innerHTML = '<option value="">Todos os anos</option>' + Object.keys(anos).sort().reverse().map(function (a) { return '<option' + (a === ano ? ' selected' : '') + '>' + a + '</option>'; }).join('');
      selAno.onchange = function () { ano = selAno.value; desenhar(); };
      var itens = fins.filter(function (p) {
        var e = porId(empresas, p.empresa_id) || {};
        return (!ano || dataFim(p).slice(0, 4) === ano) && (!busca || ui.normalizar([e.nome_fantasia, e.razao_social, p.vaga, p.identificacao, dataFim(p).slice(0, 4)].join(' ')).indexOf(busca) >= 0);
      });
      var box = area.querySelector('#procs');
      if (!itens.length) { box.innerHTML = '<div class="card vazio">' + (fins.length ? 'Nenhum processo finalizado encontrado.' : 'Nenhum processo finalizado ainda. Os processos aparecem aqui quando o resultado é liberado para a empresa.') + '</div>'; return; }
      var porEmp = {}; itens.forEach(function (p) { (porEmp[p.empresa_id] = porEmp[p.empresa_id] || []).push(p); });
      var ordem = Object.keys(porEmp).sort(function (a, b) { return String((porId(empresas, a) || {}).nome_fantasia).localeCompare(String((porId(empresas, b) || {}).nome_fantasia), 'pt-BR'); });
      box.innerHTML = ordem.map(function (eid) {
        var e = porId(empresas, eid) || {}, ps = porEmp[eid].sort(function (a, b) { return dataFim(b).localeCompare(dataFim(a)); });
        return '<section class="emp-bloco"><div class="emp-cab">' + logoHTML(e) + '<div><h2>' + esc(e.nome_fantasia || 'Empresa') + '</h2><small>' + ps.length + ' processo' + (ps.length > 1 ? 's' : '') + ' finalizado' + (ps.length > 1 ? 's' : '') + ' · último em ' + window.CF.datas.completa(dataFim(ps[0])) + '</small></div></div>' +
          ps.map(function (p) {
            return '<a class="fin" href="#/processos/' + p.id + '" style="--sc:' + (SITUACOES[p.situacao] || SITUACOES.liberado)[1] + '"><span class="dt">' + window.CF.datas.completa(dataFim(p)) + '</span><div><b>' + esc(p.vaga) + '</b><small>' + esc(p.identificacao) + '</small></div>' +
              '<span class="n">' + (nJovens[p.id] || 0) + ' jovens</span>' + selo(p.situacao) + '</a>';
          }).join('') + '</section>';
      }).join('') + '<p class="dica">Processos finalizados não podem mais ser alterados. Número de aprovados e PDF chegam nas Fases 4 e 5.</p>';
      carregarLogos(box);
    }
    desenhar();
  }

  /* ================================================================
     PAINEL DO PROCESSO
     ================================================================ */
  async function painel(area, ctx, id) {
    var admin = ctx.perfil.perfil === 'admin';
    area.innerHTML = '<a class="voltar" href="#/processos">← Processos</a><div id="painel"><div class="girando" style="margin:30px auto"></div></div>';
    var p, testesProc, empresas, b, ag;
    try {
      var r = await Promise.all([dados.processos.obter(id), dados.processos.testes(id), dados.empresas.listar().catch(function () { return []; }), dados.banco.carregarTudo(), dados.agenda.carregarTudo(), dados.jovens.doProcesso(id).catch(function () { return []; })]);
      p = r[0]; testesProc = r[1]; empresas = r[2]; b = r[3]; ag = r[4]; var jovensP = r[5];
      if (!empresas.length) empresas = ag.empresas;
    } catch (e) { erro(e); area.querySelector('#painel').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>Processo não encontrado.</span></div>'; return; }
    var e = porId(empresas, p.empresa_id) || {};
    var montagem = p.situacao === 'montagem';
    var turmas = turmasDe(ag, p.id).sort(function (x, y) { return (diasDaTurma(ag, x.id)[0] || '').localeCompare(diasDaTurma(ag, y.id)[0] || ''); });
    var podeTurma = admin && (p.situacao === 'montagem' || p.situacao === 'andamento');
    var vagasTot = turmas.reduce(function (s2, t) { return s2 + t.vagas; }, 0);
    var falta = [testesProc.length ? null : 'testes', turmas.length ? null : 'turma', jovensP.length ? null : 'jovens'].filter(Boolean);
    var incompletosJ = jovensP.filter(function (x) { return !x.termo_recebido_em || !(x.jovem && x.jovem.foto_path); }).length;
    var etapas = [['montagem', 'Montagem', 'dados, testes, turmas e jovens'], ['andamento', 'Em andamento', 'lançamento das notas'], ['revisao', 'Revisão', 'conferência e fechamento'], ['liberado', 'Liberado', 'resultado para a empresa']];
    var idxAtual = etapas.map(function (x) { return x[0]; }).indexOf(p.situacao);
    var porArea = {};
    testesProc.forEach(function (pt) { var t = porId(b.testes, pt.teste_id); var a = t && porId(b.areas, t.area_id); var n = a ? a.nome : 'SEM ÁREA'; porArea[n] = (porArea[n] || 0) + 1; });
    var resumoAreas = Object.keys(porArea).map(function (k) { return k + ' ' + porArea[k]; }).join(' · ');
    area.querySelector('#painel').innerHTML =
      '<header class="cabecalho"><div class="painel-tit">' + logoHTML(e, 'grande') + '<div><h1>' + esc(e.nome_fantasia || '') + ' · ' + esc(p.vaga) + '</h1>' +
        '<p>' + esc(p.identificacao) + ' · período ' + esc(periodoReal(ag, p)) + '</p></div></div>' +
        '<div class="painel-acoes">' + selo(p.situacao) +
        (admin && montagem ? '<button type="button" class="btn" id="p-editar">Editar</button><div class="iniciar-box"><button type="button" class="btn btn-pri btn-iniciar" id="p-iniciar"' + (falta.length ? ' disabled' : '') + '>Iniciar processo</button>' + (falta.length ? '<small>Falta: ' + esc(falta.join(' e ')) + '</small>' : '') + '</div>' : '') + '</div></header>' +
      '<div class="etapas" role="list">' + etapas.map(function (x, i) {
        return '<div role="listitem" class="' + (i < idxAtual ? 'feita' : (i === idxAtual ? 'atual' : '')) + '"' + (i === idxAtual ? ' aria-current="step"' : '') + '><b>' + (i + 1) + ' · ' + esc(x[1]) + '</b>' + esc(x[2]) + '</div>';
      }).join('') + '</div>' +
      '<div class="grade grade-painel">' +
        '<section class="card bloco card-cor" style="--cor:var(--c-teste)"><span class="lbl">Testes</span><h2>' + testesProc.length + ' teste' + (testesProc.length === 1 ? '' : 's') + '</h2><p>' + esc(resumoAreas) + '</p>' +
          '<div class="bloco-botoes"><button type="button" class="btn btn-p" id="p-ver-testes">Ver testes</button>' + (admin && montagem ? '<button type="button" class="btn btn-p" id="p-aj-testes">Ajustar</button>' : '') + '</div></section>' +
        (function () {
          var gl = window.CF.materiais.lista(b, testesProc.map(function (pt) { return pt.teste_id; }), 0);
          var nItens = gl.reduce(function (n, g) { return n + g.itens.length; }, 0);
          return '<section class="card bloco card-cor" style="--cor:var(--c-mat)"><span class="lbl">Materiais</span><h2>' + (nItens ? nItens + ' ite' + (nItens > 1 ? 'ns' : 'm') + ' em ' + gl.length + ' teste' + (gl.length > 1 ? 's' : '') : 'Nenhum material') + '</h2>' +
            '<p>' + (nItens ? 'Lista para separar e conferir, ajustada pelo tamanho de cada turma.' : 'Os testes deste processo não têm materiais cadastrados.') + '</p>' +
            (nItens ? '<div class="bloco-botoes"><button type="button" class="btn btn-p" id="p-materiais">Ver e imprimir</button></div>' : '') + '</section>';
        })() +
        '<section class="card bloco card-cor" style="--cor:var(--c-padrao)"><span class="lbl">Notas de corte</span><h2>' + fmtNota(p.corte_aprovado) + ' · ' + fmtNota(p.corte_backup) + '</h2>' +
          '<p>Aprovado a partir de ' + fmtNota(p.corte_aprovado) + ' · Backup a partir de ' + fmtNota(p.corte_backup) + '. ' + (montagem ? 'Podem mudar até a primeira nota.' : 'Travadas neste processo.') + '</p>' +
          (admin && montagem ? '<div class="bloco-botoes"><button type="button" class="btn btn-p" id="p-aj-notas">Ajustar</button></div>' : '') + '</section>' +
        '<section class="card bloco card-cor" style="--cor:var(--c-area)"><span class="lbl">Turmas</span><h2>' + (turmas.length ? turmas.length + ' turma' + (turmas.length > 1 ? 's' : '') + ' · até ' + vagasTot + ' vagas' : 'Nenhuma turma') + '</h2>' +
          '<p>' + (turmas.length ? esc(turmas.map(function (t) { return t.nome + ': ' + diasDaTurma(ag, t.id).map(window.CF.datas.curta).join(' e '); }).join(' · ')) : 'Uma turma por dia, com 1 ou 2 dias.') + '</p>' +
          '<div class="bloco-botoes">' + (podeTurma ? '<button type="button" class="btn btn-p" id="p-nova-turma">+ Turma</button>' : '') + '</div></section>' +
        '<section class="card bloco card-cor" style="--cor:var(--c-aval)"><span class="lbl">Jovens</span><h2>' + (jovensP.length ? jovensP.length + ' jove' + (jovensP.length === 1 ? 'm' : 'ns') + ' · de ' + vagasTot + ' vagas' : 'Nenhum jovem') + '</h2>' +
          '<p>' + (jovensP.length ? (incompletosJ ? incompletosJ + ' cadastro(s) com foto ou termo pendente.' : 'Todos os cadastros completos.') : 'Cadastro, importação da lista e termos de consentimento.') + '</p>' +
          '<div class="bloco-botoes"><a class="btn btn-p" href="#/processos/' + p.id + '/jovens">' + (jovensP.length ? 'Ver jovens' : '+ Jovens') + '</a></div></section>' +
      '</div>' +
      (turmas.length ? '<section class="card bloco card-cor" style="--cor:var(--c-area)"><span class="lbl">Turmas do processo</span><div class="turmas-lista">' + turmas.map(function (t) {
        var dias = diasDaTurma(ag, t.id);
        return '<div class="tlinha"><div class="tl-txt"><b>' + esc(t.nome) + '</b><small>' + esc(window.CF.datas.listaDias(dias)) + ' · ' + dias.length + ' dia' + (dias.length > 1 ? 's' : '') + (t.horario ? ' · ' + esc(t.horario) : '') + ' · ' + t.vagas + ' vagas</small></div>' +
          (podeTurma ? '<div class="acoes"><button type="button" class="btn btn-p" data-ed-turma="' + t.id + '">Editar</button>' + '<button type="button" class="btn btn-p btn-perigo" data-ex-turma="' + t.id + '">Excluir</button>' + '</div>' : '') + '</div>';
      }).join('') + '</div><span class="dica">As datas ficam travadas na agenda. Remarcar uma turma libera os dias antigos e trava os novos.</span></section>' : '') +
      (montagem ? '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>Para <b>iniciar</b>: pelo menos 1 turma, 1 jovem e 1 teste. Ao iniciar, a configuração de testes fica guardada e a lista de jovens de cada turma vai para os avaliadores. </span></div>' : '') +
      (p.observacoes ? '<section class="card bloco"><span class="lbl">Observações</span><p style="white-space:pre-wrap">' + esc(p.observacoes) + '</p></section>' : '') +
      (admin && montagem ? '<div><button type="button" class="btn-link perigo" id="p-excluir">Excluir este processo</button></div>' : '');
    carregarLogos(area);
    var q = function (s) { return area.querySelector(s); };
    q('#p-ver-testes').addEventListener('click', function () { verTestes(p, testesProc, b); });
    if (q('#p-materiais')) q('#p-materiais').addEventListener('click', function () { verMateriais(p, e, testesProc, b, turmas, ag); });
    var recarregarPainel = function () { window.dispatchEvent(new HashChangeEvent('hashchange')); };
    if (q('#p-nova-turma')) q('#p-nova-turma').addEventListener('click', function () { formTurma(p, null, ag, empresas, recarregarPainel); });
    area.querySelectorAll('[data-ed-turma]').forEach(function (bt) { bt.addEventListener('click', function () { formTurma(p, porId(ag.turmas, bt.getAttribute('data-ed-turma')), ag, empresas, recarregarPainel); }); });
    area.querySelectorAll('[data-ex-turma]').forEach(function (bt) {
      bt.addEventListener('click', async function () {
        var t = porId(ag.turmas, bt.getAttribute('data-ex-turma'));
        var nJ = jovensP.filter(function (x) { return x.turma_id === t.id; }).length;
        if (!nJ) {
          if (!(await ui.confirmar('Excluir a ' + t.nome + '?', 'Os dias dela ficam livres na agenda.', 'Excluir turma', 'Cancelar'))) return;
          try { await dados.agenda.excluirTurma(t.id); ui.toast('Turma excluída.', 'ok'); recarregarPainel(); } catch (x) { erro(x); }
          return;
        }
        var outras = turmas.filter(function (x) { return x.id !== t.id; });
        ui.janela({ titulo: 'Excluir a ' + t.nome + '?', confirmarDescarte: false,
          corpo: '<p style="margin:0;color:var(--texto-2)">A turma tem <b>' + nJ + ' jovem(ns)</b>. O que fazer com eles?</p>' +
            (outras.length ? '<label class="kit-op"><input type="radio" name="ex-op" value="mover" checked><span><b>Passar para outra turma</b><small>Os jovens mantêm o cadastro e o código.</small>' +
              '<select class="entrada" id="ex-dest" style="margin-top:8px">' + outras.map(function (o) { var oc = jovensP.filter(function (x) { return x.turma_id === o.id; }).length; return '<option value="' + o.id + '">' + esc(o.nome + ' · ' + oc + ' de ' + o.vagas + ' vagas') + '</option>'; }).join('') + '</select></span></label>' : '') +
            '<label class="kit-op"><input type="radio" name="ex-op" value="remover"' + (outras.length ? '' : ' checked') + '><span><b>Tirar os jovens do processo</b><small>Os cadastros continuam em Cadastros → Jovens.</small></span></label>' +
            '<p class="dica" style="margin:0">Os dias da turma ficam livres na agenda. Turmas com presença ou notas lançadas não podem ser excluídas.</p>',
          botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Excluir turma', principal: true, aoClicar: async function (f) {
            var op = (f.querySelector('input[name=ex-op]:checked') || {}).value;
            try {
              if (op === 'mover') await dados.agenda.excluirTurma(t.id, f.querySelector('#ex-dest').value, false);
              else await dados.agenda.excluirTurma(t.id, null, true);
              ui.toast('Turma excluída.', 'ok'); recarregarPainel(); return true;
            } catch (x) { erro(x); return false; }
          } }] });
      });
    });
    if (q('#p-iniciar') && !falta.length) q('#p-iniciar').addEventListener('click', async function (ev) {
      if (!(await ui.confirmar('Iniciar o processo?', 'Os testes e as competências ficam guardados como estão, e a lista de jovens de cada turma vai para os avaliadores. Depois disso, os testes e as notas de corte não podem mais ser alterados.', 'Iniciar processo', 'Cancelar'))) return;
      try { await dados.processos.iniciar(p.id); ui.toast('Processo iniciado.', 'ok'); window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (x) { erro(x); }
    });
    if (q('#p-editar')) q('#p-editar').addEventListener('click', function () { assistente(p, 1, ctx, testesProc); });
    if (q('#p-aj-testes')) q('#p-aj-testes').addEventListener('click', function () { assistente(p, 2, ctx, testesProc); });
    if (q('#p-aj-notas')) q('#p-aj-notas').addEventListener('click', function () { assistente(p, 3, ctx, testesProc); });
    if (q('#p-excluir')) q('#p-excluir').addEventListener('click', async function () {
      if (!(await ui.confirmar('Excluir este processo?', 'Ele ainda está em montagem. Os dados do processo e a lista de testes escolhidos serão apagados.', 'Excluir processo', 'Cancelar'))) return;
      try { await dados.processos.excluir(p.id); ui.toast('Processo excluído.', 'ok'); window.location.hash = '#/processos'; } catch (x) { erro(x); }
    });
  }

  /* ---------- Turma: criar ou remarcar ---------- */
  function formTurma(p, t, ag, empresas, aoSalvar) {
    var D = window.CF.datas, novo = !t;
    var dias = t ? diasDaTurma(ag, t.id) : [];
    var usados = turmasDe(ag, p.id).map(function (x) { return ui.maiusculas(x.nome); });
    var sugestao = 'TURMA A';
    for (var i = 0; i < 26; i++) { var n = 'TURMA ' + String.fromCharCode(65 + i); if (usados.indexOf(n) < 0) { sugestao = n; break; } }
    var qtd = dias.length === 2 ? 2 : 1;
    var e = porId(empresas, p.empresa_id) || {};
    var j = ui.janela({
      titulo: (novo ? 'Nova turma' : 'Editar ' + t.nome) + ' · ' + (e.nome_fantasia || ''),
      corpo: '<div class="form-grade"><label class="campo" for="tu-nome"><span>Nome <span class="obrig">*</span></span><input class="entrada" id="tu-nome" maxlength="40" value="' + esc(t ? t.nome : sugestao) + '"></label>' +
        '<div class="campo"><span>Quantos dias?</span><div class="segmentos" role="group" aria-label="Quantos dias"><button type="button" data-qtd="1" aria-pressed="' + (qtd === 1) + '">1 dia</button><button type="button" data-qtd="2" aria-pressed="' + (qtd === 2) + '">2 dias</button></div></div></div>' +
        '<div id="tu-cal" class="cal-escolha"></div><div id="tu-esc"></div>' +
        '<div class="form-grade"><label class="campo" for="tu-hor"><span>Horário</span><input class="entrada" id="tu-hor" maxlength="60" value="' + esc(t ? t.horario || '' : '08:00 ÀS 17:00') + '"></label>' +
        '<label class="campo" for="tu-vagas"><span>Vagas na turma</span><input class="entrada" id="tu-vagas" type="number" min="1" max="60" value="' + (t ? t.vagas : 20) + '"></label></div>' +
        '<p class="dica" style="margin:0">Os dias riscados já estão ocupados por outra turma, pré-reserva ou bloqueio. Fins de semana podem ser escolhidos.</p>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: novo ? 'Criar turma' : 'Salvar turma', principal: true, aoClicar: async function (f) {
        var nome = ui.maiusculas(f.querySelector('#tu-nome').value.trim().replace(/\s+/g, ' ')), escolhidos = cal.valor(), vagas = parseInt(f.querySelector('#tu-vagas').value, 10);
        if (!nome) { ui.toast('Informe o nome da turma.', 'erro'); return false; }
        if (usados.some(function (u) { return u === ui.maiusculas(nome) && (!t || ui.maiusculas(t.nome) !== ui.maiusculas(nome)); })) { ui.toast('Já existe uma turma com este nome neste processo.', 'erro'); return false; }
        if (escolhidos.length !== qtd) { ui.toast(qtd === 1 ? 'Escolha o dia da turma.' : 'Escolha os 2 dias da turma.', 'erro'); return false; }
        if (isNaN(vagas) || vagas < 1 || vagas > 60) { ui.toast('Vagas entre 1 e 60.', 'erro'); return false; }
        try {
          await dados.agenda.salvarTurma({ id: t ? t.id : null, processo_id: p.id, nome: nome, horario: f.querySelector('#tu-hor').value, vagas: vagas, datas: escolhidos });
          ui.toast(novo ? 'Turma criada: ' + D.listaDias(escolhidos) + '.' : 'Turma atualizada.', 'ok');
          if (window.CF.agendaUtil) window.CF.agendaUtil.atualizarBadge();
          aoSalvar(); return true;
        } catch (x) { erro(x); return false; }
      } }]
    });
    var esc2 = j.elemento.querySelector('#tu-esc');
    function mostrar(l) {
      esc2.innerHTML = l.length ? '<div class="aviso aviso-ok">' + ui.icone('ok', 18) + '<span>Escolhido' + (l.length > 1 ? 's' : '') + ': <b>' + esc(D.listaDias(l)) + '</b></span></div>' : '';
    }
    var cal = window.CF.calendario.escolher(j.elemento.querySelector('#tu-cal'), { max: qtd, selecionados: dias, ocupados: window.CF.agendaUtil.ocupados(ag, t ? t.id : null), aoMudar: mostrar });
    mostrar(dias);
    j.elemento.querySelectorAll('[data-qtd]').forEach(function (b) {
      b.addEventListener('click', function () {
        qtd = +b.getAttribute('data-qtd');
        j.elemento.querySelectorAll('[data-qtd]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        cal.definirMax(qtd);
      });
    });
  }

  /* ---------- Materiais do processo ---------- */
  function verMateriais(p, e, testesProc, b, turmas, ag) {
    var D = window.CF.datas, M = window.CF.materiais;
    var opcoes = turmas.map(function (t) { return { id: t.id, rotulo: t.nome + ' · ' + t.vagas + ' vagas', pessoas: t.vagas, turma: t.nome + ' · ' + t.vagas + ' vagas', data: D.listaDias(diasDaTurma(ag, t.id)) }; });
    opcoes.push({ id: 'ref', rotulo: 'Referência · 20 pessoas', pessoas: 0, turma: '', data: '' });
    var atual = opcoes[0];
    var j = ui.janela({ titulo: 'Materiais do processo', confirmarDescarte: false,
      corpo: '<div class="segmentos seg-turmas" role="group" aria-label="Turma">' + opcoes.map(function (o, i) { return '<button type="button" data-op="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(o.rotulo) + '</button>'; }).join('') + '</div>' +
        '<div id="mt-aviso"></div><div id="mt-lista" class="mt-lista"></div>',
      botoes: [{ texto: 'Fechar', acao: 'fechar' }, { texto: '🖨 Imprimir lista', principal: true, aoClicar: function () {
        M.imprimir({ titulo: (e.nome_fantasia || '') + ' · ' + p.vaga, turma: atual.turma, data: atual.data, pessoas: atual.pessoas,
          grupos: M.lista(b, testesProc.map(function (pt) { return pt.teste_id; }), atual.pessoas) });
        return false;
      } }] });
    function desenhar() {
      var gl = M.lista(b, testesProc.map(function (pt) { return pt.teste_id; }), atual.pessoas);
      j.elemento.querySelector('#mt-aviso').innerHTML = '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>' + esc(M.descricaoAjuste(atual.pessoas)) + '</span></div>';
      j.elemento.querySelector('#mt-lista').innerHTML = gl.map(function (g) {
        return '<div class="mt-grupo"><b>' + esc(g.teste) + ' <span class="selo-mod">' + esc(M.rotuloModalidade(g, atual.pessoas)) + '</span></b>' + g.itens.map(function (i) {
          return '<label class="mat-li mt-item"><span><input type="checkbox"> ' + esc(i.nome) + (i.obs ? ' <small class="dica">· ' + esc(i.obs) + '</small>' : '') + '</span><b>' + esc(M.fmtQtd(i.qtd) + ' ' + i.unidade) + '</b></label>';
        }).join('') + '</div>';
      }).join('');
    }
    j.elemento.querySelectorAll('[data-op]').forEach(function (bt) {
      bt.addEventListener('click', function () { atual = opcoes[+bt.getAttribute('data-op')]; j.elemento.querySelectorAll('[data-op]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === bt)); }); desenhar(); });
    });
    desenhar();
  }

  function verTestes(p, testesProc, b) {
    var linhas = testesProc.map(function (pt) {
      var t = porId(b.testes, pt.teste_id) || { nome: '(teste removido)' }, a = porId(b.areas, t.area_id);
      var n = b.criterios.filter(function (c) { return c.teste_id === t.id && c.competencia_id; }).length;
      return '<tr><td><b>' + esc(t.nome) + '</b>' + (pt.nivel ? ' <small class="dica">(' + esc(NIVEIS[pt.nivel]) + ')</small>' : '') + '</td><td>' + (a ? '<span class="tag-area">' + esc(a.nome) + '</span>' : ui.pill('sem área', 'off')) + '</td><td class="num">' + n + '</td></tr>';
    }).join('');
    ui.janela({ titulo: 'Testes do processo', confirmarDescarte: false,
      corpo: '<div class="tabela-card" style="padding:0"><table class="tabela"><thead><tr><th>Teste</th><th>Área</th><th>Competências</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
        (p.situacao === 'montagem' ? '<p class="dica" style="margin:0">Enquanto o processo estiver em montagem, os testes seguem o Banco de testes. Ao iniciar, ficam guardados como estão.</p>' : '') });
  }

  /* ================================================================
     NOVO / EDITAR PROCESSO (4 passos)
     ================================================================ */
  async function assistente(proc, passoInicial, ctx, testesAtuais) {
    var r;
    try { r = await Promise.all([dados.empresas.listar(), dados.banco.carregarTudo(), dados.processos.modelos(), dados.config.carregar()]); }
    catch (e) { erro(e); return; }
    var empresas = r[0], b = r[1], modelos = r[2], cfg = r[3];
    var novo = !proc;
    var st = {
      empresa_id: proc ? proc.empresa_id : '', vaga: proc ? proc.vaga : '', identificacao: proc ? proc.identificacao : '',
      data_inicio: proc ? proc.data_inicio || '' : '', data_fim: proc ? proc.data_fim || '' : '', observacoes: proc ? proc.observacoes || '' : '',
      ap: proc ? Number(proc.corte_aprovado) : Number(cfg.corte_aprovado), bk: proc ? Number(proc.corte_backup) : Number(cfg.corte_backup),
      testes: {}, buscaT: ''
    };
    if (testesAtuais) testesAtuais.forEach(function (pt) { st.testes[pt.teste_id] = { nivel: pt.nivel || '' }; });
    else b.testes.filter(function (t) { return t.padrao && t.ativo; }).forEach(function (t) { st.testes[t.id] = { nivel: '' }; });
    var passo = passoInicial || 1;
    var NOMES = ['Dados', 'Testes', 'Notas de corte', 'Conferir'];
    var empresasOp = empresas.filter(function (x) { return x.ativa || x.id === st.empresa_id; }).sort(function (x, y) { return x.nome_fantasia.localeCompare(y.nome_fantasia, 'pt-BR'); });

    var j = ui.janela({
      titulo: novo ? 'Novo processo' : 'Editar processo',
      corpo: '<div class="passos" id="w-passos"></div><div id="w-corpo"></div>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: '← Voltar', aoClicar: function () { if (!ler()) return false; passo--; desenhar(); return false; } },
               { texto: 'Continuar →', principal: true, aoClicar: function () { return avancar(); } }]
    });
    var el = j.elemento;
    el.querySelector('.janela').classList.add('janela-larga');
    var bts = el.querySelectorAll('.janela-pe .btn');
    var btVoltar = bts[1], btSeguir = bts[2];

    function areaNome(t) { var a = porId(b.areas, t.area_id); return a ? a.nome : 'Sem área'; }
    function escolhidos() { return b.testes.filter(function (t) { return st.testes[t.id]; }); }

    function desenhar() {
      var lt = el.querySelector('.lista-testes-proc'), rolagem = lt ? lt.scrollTop : 0;
      el.querySelector('#w-passos').innerHTML = NOMES.map(function (n, i) {
        var k = i + 1;
        return (i ? '<span class="passo-linha" aria-hidden="true"></span>' : '') + '<span class="passo' + (k < passo ? ' ok' : (k === passo ? ' on' : '')) + '"' + (k === passo ? ' aria-current="step"' : '') + '><span class="n">' + (k < passo ? '✓' : k) + '</span>' + esc(n) + '</span>';
      }).join('');
      btVoltar.classList.toggle('oculto', passo === 1);
      btSeguir.textContent = passo === 4 ? (novo ? 'Criar processo' : 'Salvar alterações') : 'Continuar →';
      var c = el.querySelector('#w-corpo');
      if (passo === 1) {
        c.innerHTML = '<div class="form-grade">' +
          '<label class="campo largo" for="w-emp"><span>Empresa <span class="obrig">*</span></span><select class="entrada" id="w-emp"><option value="">Escolha a empresa…</option>' +
            empresasOp.map(function (x) { return '<option value="' + x.id + '"' + (x.id === st.empresa_id ? ' selected' : '') + '>' + esc(x.nome_fantasia) + '</option>'; }).join('') + '</select>' +
            (empresasOp.length ? '' : '<small class="dica">Nenhuma empresa ativa. Cadastre em Configurações → Empresas.</small>') + '</label>' +
          '<label class="campo" for="w-vaga"><span>Vaga <span class="obrig">*</span></span><input class="entrada" id="w-vaga" maxlength="120" value="' + esc(st.vaga) + '" placeholder="Ex.: Auxiliar Administrativo"></label>' +
          '<label class="campo" for="w-ident"><span>Identificação <span class="obrig">*</span></span><input class="entrada" id="w-ident" maxlength="80" value="' + esc(st.identificacao) + '" placeholder="Ex.: 2º semestre 2026"></label>' +

          '<label class="campo largo" for="w-obs"><span>Observações</span><textarea class="entrada" id="w-obs" rows="2" maxlength="1000">' + esc(st.observacoes) + '</textarea></label></div>' +
          '<p class="dica" style="margin:0">O período do processo vem das datas das turmas.</p>';
      } else if (passo === 2) {
        var grupos = b.areas.filter(function (a) { return a.ativa; }).sort(function (x, y) { return x.ordem - y.ordem; }).map(function (a) { return { nome: a.nome, testes: b.testes.filter(function (t) { return t.area_id === a.id; }) }; });
        grupos.push({ nome: 'Sem área', testes: b.testes.filter(function (t) { return !t.area_id; }) });
        c.innerHTML = (modelos.length ? '<div class="modelo-linha"><label class="campo" for="w-modelo"><span>Começar por um modelo</span><select class="entrada" id="w-modelo"><option value="">Escolha um modelo…</option>' +
            modelos.map(function (m) { return '<option value="' + m.id + '">' + esc(m.nome) + ' (' + m.testes.length + ' testes)</option>'; }).join('') + '</select></label><button type="button" class="btn" id="w-aplicar">Aplicar modelo</button></div>' : '') +
          '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar teste</span><input type="search" id="w-busca" placeholder="Buscar teste" value="' + esc(st.buscaT) + '"></label><span class="dica" id="w-resumo"></span></div>' +
          '<div class="lista-testes-proc">' + grupos.map(function (g) {
            var ts = g.testes.filter(function (t) { return (t.ativo || st.testes[t.id]) && (!st.buscaT || ui.normalizar(t.nome).indexOf(st.buscaT) >= 0); }).sort(function (x, y) { return x.nome.localeCompare(y.nome, 'pt-BR'); });
            return ts.length ? '<div class="grupo-teste"><span class="lbl">' + esc(g.nome) + '</span><div class="testes-op">' + ts.map(function (t) {
              var on = !!st.testes[t.id];
              var semComp = !b.criterios.some(function (x) { return x.teste_id === t.id && x.competencia_id; });
              var ms = on ? window.CF.materiais.lista(b, [t.id], 0)[0] : null;
              return '<label class="teste-op' + (on ? ' on' : '') + '"><input type="checkbox" data-teste="' + t.id + '"' + (on ? ' checked' : '') + '><span>' + esc(t.nome) + (t.padrao ? ' <small class="dica">(padrão)</small>' : '') + (semComp ? ' <small class="alerta-txt" title="Teste sem competências">sem competências</small>' : '') +
                (ms ? '<small class="mat-resumo">🧰 ' + esc(ms.itens.map(function (i) { return i.nome + ' ' + window.CF.materiais.fmtQtd(i.qtd); }).join(' · ')) + '</small>' : '') + '</span>' +
                (t.tem_nivel && on ? '<select class="entrada sel-nivel" data-nivel="' + t.id + '" aria-label="Nível de ' + esc(t.nome) + '"><option value="">Nível…</option>' +
                  Object.keys(NIVEIS).map(function (k) { return '<option value="' + k + '"' + (st.testes[t.id].nivel === k ? ' selected' : '') + '>' + NIVEIS[k] + '</option>'; }).join('') + '</select>' : '') + '</label>';
            }).join('') + '</div></div>' : '';
          }).join('') + '</div>' +
          '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>A Entrevista Biográfica entra em todo processo e pode ser removida. Ao <b>iniciar</b> o processo, a lista de testes e as competências de cada um ficam guardadas: mudanças futuras no Banco de testes não alteram este processo.</span></div>';
        resumoTestes();
        var lt2 = c.querySelector('.lista-testes-proc'); if (lt2) lt2.scrollTop = rolagem;
        c.querySelectorAll('[data-teste]').forEach(function (x) {
          x.addEventListener('change', function () {
            var tid = x.getAttribute('data-teste');
            if (x.checked) st.testes[tid] = { nivel: '' }; else delete st.testes[tid];
            desenhar();
          });
        });
        c.querySelectorAll('[data-nivel]').forEach(function (x) { x.addEventListener('change', function () { st.testes[x.getAttribute('data-nivel')].nivel = x.value; }); });
        var bb = c.querySelector('#w-busca');
        bb.addEventListener('input', function () { st.buscaT = ui.normalizar(bb.value); var pos = bb.selectionStart; desenhar(); var n = el.querySelector('#w-busca'); n.focus(); n.setSelectionRange(pos, pos); });
        var ap = c.querySelector('#w-aplicar');
        if (ap) ap.addEventListener('click', function () {
          var m = porId(modelos, c.querySelector('#w-modelo').value);
          if (!m) { ui.toast('Escolha um modelo.', 'erro'); return; }
          m.testes.forEach(function (tid) { var t = porId(b.testes, tid); if (t && t.ativo && !st.testes[tid]) st.testes[tid] = { nivel: '' }; });
          ui.toast('Modelo aplicado: ' + m.nome + '.', 'ok'); desenhar();
        });
      } else if (passo === 3) {
        c.innerHTML = '<div class="form-grade"><label class="campo" for="w-ap"><span>Aprovado a partir de</span><input class="entrada entrada-grande" id="w-ap" inputmode="decimal" value="' + fmtNota(st.ap) + '"></label>' +
          '<label class="campo" for="w-bk"><span>Backup a partir de</span><input class="entrada entrada-grande" id="w-bk" inputmode="decimal" value="' + fmtNota(st.bk) + '"></label></div><div id="w-regua"></div>' +
          '<div class="botoes-fim" style="justify-content:space-between"><span class="dica">Valores copiados das Configurações (' + fmtNota(cfg.corte_aprovado) + ' e ' + fmtNota(cfg.corte_backup) + '). Só valem para este processo.</span>' +
          '<button type="button" class="btn btn-p" id="w-padrao">Usar os padrões</button></div>';
        var a1 = c.querySelector('#w-ap'), k1 = c.querySelector('#w-bk');
        var regua = function () { window.CF.desenharRegua(c.querySelector('#w-regua'), numero(a1.value), numero(k1.value)); };
        a1.addEventListener('input', regua); k1.addEventListener('input', regua);
        c.querySelector('#w-padrao').addEventListener('click', function () { a1.value = fmtNota(cfg.corte_aprovado); k1.value = fmtNota(cfg.corte_backup); regua(); });
        regua();
      } else {
        var e = porId(empresas, st.empresa_id) || {};
        var ts = escolhidos(), semComp = ts.filter(function (t) { return !b.criterios.some(function (x) { return x.teste_id === t.id && x.competencia_id; }); });
        var porArea = {}; ts.forEach(function (t) { var n = areaNome(t); porArea[n] = (porArea[n] || 0) + 1; });
        c.innerHTML = '<dl class="conferir">' +
          '<dt>Empresa</dt><dd>' + esc(e.nome_fantasia || '') + '</dd><dt>Vaga</dt><dd>' + esc(st.vaga) + '</dd><dt>Identificação</dt><dd>' + esc(st.identificacao) + '</dd>' +
          '<dt>Testes</dt><dd>' + ts.length + ' · ' + esc(Object.keys(porArea).map(function (k) { return k + ' ' + porArea[k]; }).join(' · ')) + '</dd>' +
          '<dt>Notas de corte</dt><dd>Aprovado a partir de ' + fmtNota(st.ap) + ' · Backup a partir de ' + fmtNota(st.bk) + '</dd></dl>' +
          (semComp.length ? '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>' + semComp.length + ' teste(s) sem competências não vão contar na nota: ' + esc(semComp.map(function (t) { return t.nome; }).join(', ')) + '.</span></div>' : '') +
          '<p class="dica" style="margin:0">O processo fica <b>em montagem</b>. Turmas e jovens são adicionados no painel do processo.</p>';
      }
      var foco = el.querySelector('#w-corpo input, #w-corpo select'); if (foco && passo !== 2) foco.focus();
    }
    function resumoTestes() {
      var ts = escolhidos(), areas = {};
      ts.forEach(function (t) { if (t.area_id) areas[t.area_id] = 1; });
      var r2 = el.querySelector('#w-resumo'); if (r2) r2.textContent = ts.length + ' teste(s) escolhido(s) · ' + Object.keys(areas).length + ' área(s) no radar';
    }
    // Lê os campos do passo atual e valida
    function ler() {
      var c = el.querySelector('#w-corpo');
      if (passo === 1) {
        st.empresa_id = c.querySelector('#w-emp').value; st.vaga = c.querySelector('#w-vaga').value.trim().replace(/\s+/g, ' ');
        st.identificacao = c.querySelector('#w-ident').value.trim().replace(/\s+/g, ' '); 
        st.observacoes = c.querySelector('#w-obs').value.trim();
      }
      if (passo === 3) { st.ap = numero(c.querySelector('#w-ap').value); st.bk = numero(c.querySelector('#w-bk').value); }
      return true;
    }
    function validar() {
      if (passo === 1) {
        if (!st.empresa_id) { ui.toast('Escolha a empresa.', 'erro'); return false; }
        if (!st.vaga) { ui.toast('Informe a vaga.', 'erro'); return false; }
        if (!st.identificacao) { ui.toast('Informe a identificação (ex.: 2º semestre 2026).', 'erro'); return false; }
      }
      if (passo === 2) {
        var ts = escolhidos();
        if (!ts.length) { ui.toast('Escolha pelo menos um teste.', 'erro'); return false; }
        var semNivel = ts.filter(function (t) { return t.tem_nivel && !st.testes[t.id].nivel; });
        if (semNivel.length) { ui.toast('Escolha o nível de "' + semNivel[0].nome + '".', 'erro'); return false; }
      }
      if (passo === 3) {
        if (st.ap == null || st.bk == null || st.ap < 1 || st.ap > 5 || st.bk < 1 || st.bk > 5) { ui.toast('Use notas de corte entre 1 e 5.', 'erro'); return false; }
        if (st.bk > st.ap) { ui.toast('O backup precisa ser menor ou igual ao aprovado.', 'erro'); return false; }
      }
      return true;
    }
    async function avancar() {
      ler(); if (!validar()) return false;
      if (passo < 4) { passo++; desenhar(); return false; }
      var ordem = b.testes.slice().sort(function (x, y) { return (x.padrao === y.padrao ? 0 : (x.padrao ? -1 : 1)) || areaNome(x).localeCompare(areaNome(y), 'pt-BR') || x.nome.localeCompare(y.nome, 'pt-BR'); });
      var payload = { id: proc ? proc.id : null, empresa_id: st.empresa_id, vaga: st.vaga, identificacao: st.identificacao, data_inicio: st.data_inicio || null, data_fim: st.data_fim || null,
        observacoes: st.observacoes || null, corte_aprovado: st.ap, corte_backup: st.bk,
        testes: ordem.filter(function (t) { return st.testes[t.id]; }).map(function (t) { return { teste_id: t.id, nivel: st.testes[t.id].nivel || null }; }) };
      return ui.executar(btSeguir, 'Salvando…', async function () {
        try {
          var id = await dados.processos.salvar(payload);
          ui.toast(novo ? 'Processo criado.' : 'Processo atualizado.', 'ok');
          if (window.location.hash === '#/processos/' + id) window.dispatchEvent(new HashChangeEvent('hashchange')); else window.location.hash = '#/processos/' + id;
          return true;
        } catch (x) { erro(x); return false; }
      });
    }
    desenhar();
  }
})();
