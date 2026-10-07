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
    var id = idDaRota();
    if (id) painel(area, ctx, id); else lista(area, ctx);
  };

  /* ================================================================
     LISTA
     ================================================================ */
  async function lista(area, ctx) {
    var admin = ctx.perfil.perfil === 'admin';
    var filtroSit = 'todos', busca = '';
    area.innerHTML = '<header class="cabecalho"><div><h1>Processos</h1><p>Processos seletivos de cada empresa</p></div>' +
      (admin ? '<button type="button" class="btn btn-pri" id="b-novo">' + ui.icone('mais', 17) + 'Novo processo</button>' : '') + '</header>' +
      '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="busca-p" placeholder="Buscar por empresa, vaga ou processo"></label></div>' +
      '<div class="filtros" id="filtros" role="group" aria-label="Situação"></div><div id="procs"><div class="girando" style="margin:30px auto"></div></div>';
    var procs = [], empresas = [];
    try { var r = await Promise.all([dados.processos.listar(), dados.empresas.listar()]); procs = r[0]; empresas = r[1]; }
    catch (e) { erro(e); area.querySelector('#procs').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    if (admin) area.querySelector('#b-novo').addEventListener('click', function () { assistente(null, 1, ctx); });
    area.querySelector('#busca-p').addEventListener('input', function (e) { busca = ui.normalizar(e.target.value); desenhar(); });

    function desenhar() {
      var cont = { todos: procs.length };
      Object.keys(SITUACOES).forEach(function (k) { cont[k] = procs.filter(function (p) { return p.situacao === k; }).length; });
      var opcoes = [['todos', 'Todos']].concat(Object.keys(SITUACOES).filter(function (k) { return k !== 'cancelado' || cont.cancelado; }).map(function (k) { return [k, SITUACOES[k][0]]; }));
      var fb = area.querySelector('#filtros');
      fb.innerHTML = opcoes.map(function (o) { return '<button type="button" data-sit="' + o[0] + '" aria-pressed="' + (filtroSit === o[0]) + '">' + esc(o[1]) + ' · ' + (cont[o[0]] || 0) + '</button>'; }).join('');
      fb.querySelectorAll('[data-sit]').forEach(function (b) { b.addEventListener('click', function () { filtroSit = b.getAttribute('data-sit'); desenhar(); }); });
      var itens = procs.filter(function (p) {
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
          '<div class="nums"><div><b>0</b><span>turmas</span></div><div><b>0</b><span>jovens</span></div><div><b>' + esc(periodo(p)) + '</b><span>período</span></div></div></a>';
      }).join('') + '</div>';
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
    var p, testesProc, empresas, b;
    try {
      var r = await Promise.all([dados.processos.obter(id), dados.processos.testes(id), dados.empresas.listar(), dados.banco.carregarTudo()]);
      p = r[0]; testesProc = r[1]; empresas = r[2]; b = r[3];
    } catch (e) { erro(e); area.querySelector('#painel').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>Processo não encontrado.</span></div>'; return; }
    var e = porId(empresas, p.empresa_id) || {};
    var montagem = p.situacao === 'montagem';
    var etapas = [['montagem', 'Montagem', 'dados, testes, turmas e jovens'], ['andamento', 'Em andamento', 'lançamento das notas'], ['revisao', 'Revisão', 'conferência e fechamento'], ['liberado', 'Liberado', 'resultado para a empresa']];
    var idxAtual = etapas.map(function (x) { return x[0]; }).indexOf(p.situacao);
    var porArea = {};
    testesProc.forEach(function (pt) { var t = porId(b.testes, pt.teste_id); var a = t && porId(b.areas, t.area_id); var n = a ? a.nome : 'Sem área'; porArea[n] = (porArea[n] || 0) + 1; });
    var resumoAreas = Object.keys(porArea).map(function (k) { return k + ' ' + porArea[k]; }).join(' · ');
    area.querySelector('#painel').innerHTML =
      '<header class="cabecalho"><div class="painel-tit">' + logoHTML(e, 'grande') + '<div><h1>' + esc(e.nome_fantasia || '') + ' · ' + esc(p.vaga) + '</h1>' +
        '<p>' + esc(p.identificacao) + ' · período ' + esc(periodo(p)) + '</p></div></div>' +
        '<div class="painel-acoes">' + selo(p.situacao) +
        (admin && montagem ? '<button type="button" class="btn" id="p-editar">Editar</button><button type="button" class="btn btn-pri" id="p-iniciar" disabled title="Disponível depois das etapas Turmas e Jovens">Iniciar processo</button>' : '') + '</div></header>' +
      '<div class="etapas" role="list">' + etapas.map(function (x, i) {
        return '<div role="listitem" class="' + (i < idxAtual ? 'feita' : (i === idxAtual ? 'atual' : '')) + '"' + (i === idxAtual ? ' aria-current="step"' : '') + '><b>' + (i + 1) + ' · ' + esc(x[1]) + '</b>' + esc(x[2]) + '</div>';
      }).join('') + '</div>' +
      '<div class="grade">' +
        '<section class="card bloco card-cor" style="--cor:var(--c-teste)"><span class="lbl">Testes</span><h2>' + testesProc.length + ' teste' + (testesProc.length === 1 ? '' : 's') + '</h2><p>' + esc(resumoAreas) + '</p>' +
          '<div class="bloco-botoes"><button type="button" class="btn btn-p" id="p-ver-testes">Ver testes</button>' + (admin && montagem ? '<button type="button" class="btn btn-p" id="p-aj-testes">Ajustar</button>' : '') + '</div></section>' +
        '<section class="card bloco card-cor" style="--cor:var(--c-padrao)"><span class="lbl">Notas de corte</span><h2>' + fmtNota(p.corte_aprovado) + ' · ' + fmtNota(p.corte_backup) + '</h2>' +
          '<p>Aprovado a partir de ' + fmtNota(p.corte_aprovado) + ' · Backup a partir de ' + fmtNota(p.corte_backup) + '. ' + (montagem ? 'Podem mudar até a primeira nota.' : 'Travadas neste processo.') + '</p>' +
          (admin && montagem ? '<div class="bloco-botoes"><button type="button" class="btn btn-p" id="p-aj-notas">Ajustar</button></div>' : '') + '</section>' +
        '<section class="card bloco card-cor em-espera" style="--cor:var(--c-area)"><span class="lbl">Turmas · Etapa 2.2</span><h2>Nenhuma turma</h2><p>As datas são escolhidas na agenda (uma turma por dia).</p><div class="bloco-botoes"><button type="button" class="btn btn-p" disabled>+ Turma</button></div></section>' +
        '<section class="card bloco card-cor em-espera" style="--cor:var(--c-aval)"><span class="lbl">Jovens · Etapa 2.3</span><h2>Nenhum jovem</h2><p>Cadastro e importação da lista de candidatos.</p><div class="bloco-botoes"><button type="button" class="btn btn-p" disabled>+ Jovens</button></div></section>' +
      '</div>' +
      (montagem ? '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>Para <b>iniciar</b>: pelo menos 1 turma, 1 jovem e 1 teste. Ao iniciar, a configuração de testes fica guardada e a lista de jovens de cada turma vai para os avaliadores. (Turmas e jovens chegam nas próximas etapas.)</span></div>' : '') +
      (p.observacoes ? '<section class="card bloco"><span class="lbl">Observações</span><p style="white-space:pre-wrap">' + esc(p.observacoes) + '</p></section>' : '') +
      (admin && montagem ? '<div><button type="button" class="btn-link perigo" id="p-excluir">Excluir este processo</button></div>' : '');
    carregarLogos(area);
    var q = function (s) { return area.querySelector(s); };
    q('#p-ver-testes').addEventListener('click', function () { verTestes(p, testesProc, b); });
    if (q('#p-editar')) q('#p-editar').addEventListener('click', function () { assistente(p, 1, ctx, testesProc); });
    if (q('#p-aj-testes')) q('#p-aj-testes').addEventListener('click', function () { assistente(p, 2, ctx, testesProc); });
    if (q('#p-aj-notas')) q('#p-aj-notas').addEventListener('click', function () { assistente(p, 3, ctx, testesProc); });
    if (q('#p-excluir')) q('#p-excluir').addEventListener('click', async function () {
      if (!(await ui.confirmar('Excluir este processo?', 'Ele ainda está em montagem. Os dados do processo e a lista de testes escolhidos serão apagados.', 'Excluir processo', 'Cancelar'))) return;
      try { await dados.processos.excluir(p.id); ui.toast('Processo excluído.', 'ok'); window.location.hash = '#/processos'; } catch (x) { erro(x); }
    });
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
          '<label class="campo" for="w-ini"><span>Início previsto</span><input class="entrada" type="date" id="w-ini" value="' + esc(st.data_inicio) + '"></label>' +
          '<label class="campo" for="w-fim"><span>Fim previsto</span><input class="entrada" type="date" id="w-fim" value="' + esc(st.data_fim) + '"></label>' +
          '<label class="campo largo" for="w-obs"><span>Observações</span><textarea class="entrada" id="w-obs" rows="2" maxlength="1000">' + esc(st.observacoes) + '</textarea></label></div>' +
          '<p class="dica" style="margin:0">As datas são só uma previsão. As datas reais vêm das turmas, na agenda.</p>';
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
              return '<label class="teste-op' + (on ? ' on' : '') + '"><input type="checkbox" data-teste="' + t.id + '"' + (on ? ' checked' : '') + '><span>' + esc(t.nome) + (t.padrao ? ' <small class="dica">(padrão)</small>' : '') + (semComp ? ' <small class="alerta-txt" title="Teste sem competências">sem competências</small>' : '') + '</span>' +
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
          '<dt>Período previsto</dt><dd>' + esc(periodo(st)) + '</dd>' +
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
        st.identificacao = c.querySelector('#w-ident').value.trim().replace(/\s+/g, ' '); st.data_inicio = c.querySelector('#w-ini').value; st.data_fim = c.querySelector('#w-fim').value;
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
        if (st.data_inicio && st.data_fim && st.data_fim < st.data_inicio) { ui.toast('O fim previsto não pode ser antes do início.', 'erro'); return false; }
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
