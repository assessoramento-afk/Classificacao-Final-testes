/* =====================================================================
   Classificação Final · views/banco.js
   Banco de testes em cards: Área → Testes → Competências.
   Cores: área = azul-petróleo, teste = laranja, competência = roxo.
   Regras: teste novo só com área; competência nova só ligada a um teste;
   competência em uso não pode ser excluída (Cadastros → Competências).
   Avaliador consulta tudo; só o administrador altera.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var NIVEIS = { iniciante: 'Iniciante', jovem_aprendiz: 'Jovem Aprendiz' };
  var NOVA = '__nova__';

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function porId(l, id) { return l.filter(function (x) { return x.id === id; })[0]; }
  function numero(v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function fmt(n) { return n == null ? '' : String(n).replace('.', ','); }
  function limpo(t) { return String(t || '').trim().replace(/\s+/g, ' '); }
  function campo(id, rotulo, valor, op) {
    op = op || {};
    return '<label class="campo' + (op.largo ? ' largo' : '') + '" for="' + id + '"><span>' + esc(rotulo) + (op.obrig ? ' <span class="obrig">*</span>' : '') + '</span>' +
      (op.area ? '<textarea class="entrada" id="' + id + '" rows="2" maxlength="600" placeholder="' + esc(op.ph || '') + '">' + esc(valor || '') + '</textarea>'
               : '<input class="entrada" id="' + id + '" type="' + (op.tipo || 'text') + '" value="' + esc(valor == null ? '' : valor) + '" maxlength="' + (op.max || 160) + '" placeholder="' + esc(op.ph || '') + '">') + '</label>';
  }
  function marcar(id, rotulo, ligado, dica) {
    return '<label class="marcar"><input type="checkbox" id="' + id + '"' + (ligado ? ' checked' : '') + '><span><b>' + esc(rotulo) + '</b>' + (dica ? '<small>' + esc(dica) + '</small>' : '') + '</span></label>';
  }
  function icone(n) {
    var P = { lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>', lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
      abre: '<path d="M6 9l6 6 6-6"/>', fecha: '<path d="M9 6l6 6-6 6"/>' };
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>';
  }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.banco = function (area, ctx) {
    var admin = ctx.perfil.perfil === 'admin';
    var b = null, busca = '', inativos = false, abertas = {};

    area.innerHTML = '<header class="cabecalho"><div><h1>Banco de testes</h1><p>Áreas, testes e competências usados na montagem dos processos</p></div>' +
      (admin ? '<div class="botoes-topo"><button type="button" class="btn btn-area" id="b-area">' + ui.icone('mais', 17) + 'Nova área</button>' +
        '<button type="button" class="btn btn-teste" id="b-teste">' + ui.icone('mais', 17) + 'Novo teste</button>' +
        '<button type="button" class="btn btn-comp" id="b-comp">' + ui.icone('mais', 17) + 'Nova competência</button></div>' : '') + '</header>' +
      '<div id="pend"></div>' +
      '<div class="legenda"><span><i class="cor-area"></i>Áreas</span><span><i class="cor-teste"></i>Testes</span><span><i class="cor-comp"></i>Competências</span></div>' +
      '<div class="barra barra-banco"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="busca-b" placeholder="Buscar teste ou competência"></label>' +
        '<button type="button" class="btn btn-p" id="b-abrir">Abrir todas</button><button type="button" class="btn btn-p" id="b-fechar">Fechar todas</button>' +
        '<label class="marcar-linha"><input type="checkbox" id="b-inat"> Mostrar inativos</label></div>' +
      '<div id="areas" class="areas"><div class="girando" style="margin:30px auto"></div></div>';

    if (admin) {
      area.querySelector('#b-area').addEventListener('click', function () { formArea(null); });
      area.querySelector('#b-teste').addEventListener('click', function () { formTeste(null, null); });
      area.querySelector('#b-comp').addEventListener('click', function () { formNovaCompetencia(null); });
    }
    area.querySelector('#busca-b').addEventListener('input', function (e) { busca = ui.normalizar(e.target.value); desenhar(); });
    area.querySelector('#b-inat').addEventListener('change', function (e) { inativos = e.target.checked; desenhar(); });
    area.querySelector('#b-abrir').addEventListener('click', function () { gruposVisiveis().forEach(function (g) { abertas[g.id] = true; }); desenhar(); });
    area.querySelector('#b-fechar').addEventListener('click', function () { abertas = {}; desenhar(); });

    async function carregar() {
      try { b = await dados.banco.carregarTudo(); desenhar(); }
      catch (e) { erro(e); area.querySelector('#areas').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; }
    }
    async function recarregar() { var y = window.scrollY; b = await dados.banco.carregarTudo(); desenhar(); window.scrollTo(0, y); }

    function criteriosDe(tid) { return b.criterios.filter(function (c) { return c.teste_id === tid; }).sort(function (x, y) { return x.ordem - y.ordem; }); }
    function testeCombina(t) {
      if (!busca) return true;
      if (ui.normalizar(t.nome).indexOf(busca) >= 0) return true;
      return criteriosDe(t.id).some(function (c) {
        var co = porId(b.competencias, c.competencia_id);
        return ui.normalizar(c.nome_exibido).indexOf(busca) >= 0 || (co && ui.normalizar(co.nome).indexOf(busca) >= 0);
      });
    }
    // Grupos: áreas (pela ordem) e, se houver, "Sem área" (testes antigos)
    function gruposVisiveis() {
      var g = b.areas.filter(function (a) { return a.ativa || inativos; }).sort(function (x, y) { return x.ordem - y.ordem || x.nome.localeCompare(y.nome); })
        .map(function (a) { return { id: a.id, area: a, nome: a.nome, testes: b.testes.filter(function (t) { return t.area_id === a.id; }) }; });
      var sem = b.testes.filter(function (t) { return !t.area_id; });
      if (sem.length) g.push({ id: 'sem', area: null, nome: 'Sem área', testes: sem });
      g.forEach(function (x) { x.testes = x.testes.filter(function (t) { return (t.ativo || inativos) && testeCombina(t); }).sort(function (p, q) { return p.nome.localeCompare(q.nome, 'pt-BR'); }); });
      return busca ? g.filter(function (x) { return x.testes.length; }) : g;
    }

    /* ---------- Pendências ---------- */
    function pendencias() {
      var p = [];
      b.testes.filter(function (t) { return t.ativo; }).forEach(function (t) {
        var cs = criteriosDe(t.id);
        if (!cs.some(function (c) { return c.competencia_id; })) p.push({ tipo: 'teste', texto: t.nome, teste: t.id });
        var nc = cs.filter(function (c) { return !c.conta_na_nota; }).length;
        if (nc) p.push({ tipo: 'nao_conta', texto: t.nome + ' (' + nc + ')', teste: t.id });
        if (!t.area_id) p.push({ tipo: 'sem_area', texto: t.nome, teste: t.id });
      });
      b.competencias.filter(function (c) { return c.ativa; }).forEach(function (c) {
        if (!b.criterios.some(function (x) { return x.competencia_id === c.id; })) p.push({ tipo: 'competencia', texto: c.nome });
      });
      return p;
    }
    var GRUPOS_PEND = [['teste', 'testes sem competências'], ['sem_area', 'testes sem área'], ['competencia', 'competências sem testes'], ['nao_conta', 'testes com critérios que não contam na nota']];

    function desenhar() {
      var pend = pendencias();
      var bp = area.querySelector('#pend');
      bp.innerHTML = !pend.length ? '' : '<section class="card pendencias faixa">' + ui.icone('alerta', 18) + '<span style="flex:1;min-width:220px">' + pend.length + ' pendência(s) no banco: ' +
        GRUPOS_PEND.map(function (k) { var n = pend.filter(function (x) { return x.tipo === k[0]; }).length; return n ? n + ' ' + k[1] : null; }).filter(Boolean).join(', ') +
        '.</span><button type="button" class="btn btn-p" id="b-pend">Ver pendências</button></section>';
      var bb = bp.querySelector('#b-pend'); if (bb) bb.addEventListener('click', function () { verPendencias(pend); });

      var grupos = gruposVisiveis();
      var box = area.querySelector('#areas');
      if (!grupos.length) { box.innerHTML = '<div class="card vazio">Nada encontrado' + (busca ? ' para essa busca.' : '.') + '</div>'; return; }
      box.innerHTML = grupos.map(function (g) {
        var aberta = !!abertas[g.id] || !!busca;
        var a = g.area;
        return '<section class="card area-card' + (g.id === 'sem' ? ' area-sem' : '') + '" data-grupo="' + g.id + '">' +
          '<div class="area-cab"><button type="button" class="area-toggle" aria-expanded="' + aberta + '" data-toggle="' + g.id + '">' + icone(aberta ? 'abre' : 'fecha') +
            '<h2>' + esc(g.nome) + '</h2>' + (a && !a.ativa ? ui.pill('Inativa', 'neu') : '') + (g.id === 'sem' ? ui.pill('reorganizar', 'off') : '') +
            '<span class="cont">' + g.testes.length + ' teste' + (g.testes.length === 1 ? '' : 's') + '</span></button>' +
            (admin && a ? '<div class="mini-acoes"><button type="button" class="ico" data-ed-area="' + a.id + '" title="Editar área" aria-label="Editar área ' + esc(a.nome) + '">' + icone('lapis') + '</button>' +
              '<button type="button" class="ico perigo" data-ex-area="' + a.id + '" title="Excluir área" aria-label="Excluir área ' + esc(a.nome) + '">' + icone('lixo') + '</button></div>' : '') +
          '</div>' +
          (aberta ? '<div class="area-corpo">' + g.testes.map(cardTeste).join('') +
            (admin && a ? '<button type="button" class="add-teste" data-novo-em="' + a.id + '">' + ui.icone('mais', 16) + 'Novo teste em ' + esc(a.nome) + '</button>' : '') +
            (!g.testes.length && !(admin && a) ? '<p class="dica">Nenhum teste nesta área.</p>' : '') + '</div>' : '') +
          '</section>';
      }).join('');
      ligar(box);
    }

    function cardTeste(t) {
      var cs = criteriosDe(t.id);
      var usaPont = cs.some(function (c) { return c.entrada === 'pontuacao'; });
      var selos = [t.padrao ? 'Padrão' : null, t.tem_nivel ? 'Com nível' : null, !t.ativo ? 'Inativo' : null].filter(Boolean);
      return '<article class="teste-card" id="teste-' + t.id + '"><div class="teste-cab"><div class="teste-tit"><b>' + esc(t.nome) + '</b>' +
          (selos.length ? '<div class="selos">' + selos.map(function (s) { return ui.pill(s, 'neu'); }).join('') + '</div>' : '') + '</div>' +
          (admin ? '<div class="mini-acoes"><button type="button" class="ico" data-ed-teste="' + t.id + '" title="Editar teste" aria-label="Editar teste ' + esc(t.nome) + '">' + icone('lapis') + '</button>' +
            '<button type="button" class="ico perigo" data-ex-teste="' + t.id + '" title="Excluir teste" aria-label="Excluir teste ' + esc(t.nome) + '">' + icone('lixo') + '</button></div>' : '') + '</div>' +
        (t.descricao ? '<p class="teste-desc">' + esc(t.descricao) + '</p>' : '') +
        '<div class="chips">' + (cs.length ? cs.map(function (c) {
          var co = porId(b.competencias, c.competencia_id);
          var nome = co ? co.nome : c.nome_exibido;
          var extras = [c.nivel ? NIVEIS[c.nivel] : null, c.entrada === 'pontuacao' ? 'pontuação' : null, !c.conta_na_nota ? 'não conta' : null].filter(Boolean);
          var titulo = 'No teste: ' + c.nome_exibido + (c.descricao ? ' · ' + c.descricao : '');
          return '<span class="chip' + (co ? '' : ' sem') + '" title="' + esc(titulo) + '"><span class="chip-txt">' + esc(nome) + (co ? '' : ' · sem vínculo') +
            (extras.length ? ' <small>(' + esc(extras.join(', ')) + ')</small>' : '') + '</span>' +
            (admin ? '<button type="button" data-ed-crit="' + c.id + '" title="Editar" aria-label="Editar ' + esc(nome) + ' neste teste">' + icone('lapis') + '</button>' +
              '<button type="button" data-ex-crit="' + c.id + '" title="Remover deste teste" aria-label="Remover ' + esc(nome) + ' deste teste">' + icone('lixo') + '</button>' : '') + '</span>';
        }).join('') : '<span class="dica">Sem competências</span>') + '</div>' +
        '<div class="teste-pe">' + (admin ? '<button type="button" class="btn btn-p btn-comp-leve" data-add-comp="' + t.id + '">' + ui.icone('mais', 15) + 'Competência</button>' : '') +
          (usaPont ? '<button type="button" class="btn btn-p" data-conv="' + t.id + '">Tabela de conversão</button>' : '') + '</div>' +
        '</article>';
    }

    function ligar(box) {
      box.querySelectorAll('[data-toggle]').forEach(function (x) { x.addEventListener('click', function () { var id = x.getAttribute('data-toggle'); abertas[id] = !abertas[id]; desenhar(); }); });
      if (!admin) { box.querySelectorAll('[data-conv]').forEach(function (x) { x.addEventListener('click', function () { verConversao(porId(b.testes, x.getAttribute('data-conv'))); }); }); return; }
      box.querySelectorAll('[data-ed-area]').forEach(function (x) { x.addEventListener('click', function () { formArea(porId(b.areas, x.getAttribute('data-ed-area'))); }); });
      box.querySelectorAll('[data-ex-area]').forEach(function (x) { x.addEventListener('click', function () { excluirArea(porId(b.areas, x.getAttribute('data-ex-area'))); }); });
      box.querySelectorAll('[data-novo-em]').forEach(function (x) { x.addEventListener('click', function () { formTeste(null, x.getAttribute('data-novo-em')); }); });
      box.querySelectorAll('[data-ed-teste]').forEach(function (x) { x.addEventListener('click', function () { formTeste(porId(b.testes, x.getAttribute('data-ed-teste'))); }); });
      box.querySelectorAll('[data-ex-teste]').forEach(function (x) { x.addEventListener('click', function () { excluirTeste(porId(b.testes, x.getAttribute('data-ex-teste'))); }); });
      box.querySelectorAll('[data-ed-crit]').forEach(function (x) { x.addEventListener('click', function () { var c = porId(b.criterios, x.getAttribute('data-ed-crit')); formCriterio(porId(b.testes, c.teste_id), c); }); });
      box.querySelectorAll('[data-ex-crit]').forEach(function (x) { x.addEventListener('click', function () { removerCriterio(porId(b.criterios, x.getAttribute('data-ex-crit'))); }); });
      box.querySelectorAll('[data-add-comp]').forEach(function (x) { x.addEventListener('click', function () { formCriterio(porId(b.testes, x.getAttribute('data-add-comp')), null); }); });
      box.querySelectorAll('[data-conv]').forEach(function (x) { x.addEventListener('click', function () { var t = porId(b.testes, x.getAttribute('data-conv')); formConversao(t, b.conversao.filter(function (c) { return c.teste_id === t.id; }).sort(function (p, q) { return p.pont_min - q.pont_min; })); }); });
    }

    /* ---------- Listas de opções ---------- */
    function opcoesAreas(sel, exceto) {
      return b.areas.filter(function (a) { return (a.ativa || a.id === sel) && a.id !== exceto; }).sort(function (x, y) { return x.ordem - y.ordem; })
        .map(function (a) { return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.nome) + '</option>'; }).join('');
    }
    function opcoesCompetencias(sel, comNova) {
      return '<option value="">Escolha a competência…</option>' + b.qualificacoes.map(function (q) {
        var cs = b.competencias.filter(function (x) { return x.qualificacao_id === q.id && (x.ativa || x.id === sel); }).sort(function (x, y) { return x.nome.localeCompare(y.nome, 'pt-BR'); });
        return cs.length ? '<optgroup label="' + esc(q.nome) + '">' + cs.map(function (x) { return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.nome) + '</option>'; }).join('') + '</optgroup>' : '';
      }).join('') + (comNova ? '<option value="' + NOVA + '">＋ Criar nova competência…</option>' : '');
    }
    function opcoesQualificacoes() { return b.qualificacoes.map(function (q) { return '<option value="' + q.id + '">' + esc(q.nome) + '</option>'; }).join(''); }
    function blocoNovaComp(pref) {
      return '<div class="nova-comp oculto" data-nova="' + pref + '"><span class="lbl cor-comp-txt">Nova competência</span>' +
        '<input class="entrada" data-nc="nome" placeholder="Nome da competência *" maxlength="120" aria-label="Nome da nova competência">' +
        '<select class="entrada" data-nc="qual" aria-label="Qualificação-chave">' + opcoesQualificacoes() + '</select>' +
        '<input class="entrada" data-nc="desc" placeholder="Descrição padrão (opcional)" maxlength="600" aria-label="Descrição da nova competência"></div>';
    }
    function lerNovaComp(el) {
      return { nome: limpo(el.querySelector('[data-nc=nome]').value), qualificacao_id: el.querySelector('[data-nc=qual]').value, descricao: limpo(el.querySelector('[data-nc=desc]').value) || null };
    }
    function competenciaJaExiste(nome) { return b.competencias.some(function (c) { return ui.normalizar(c.nome) === ui.normalizar(nome); }); }

    /* ---------- Teste: cadastro e edição com as competências ---------- */
    function formTeste(t, areaInicial) {
      var novo = !t;
      t = t || { area_id: areaInicial || null, ativo: true };
      var linhas = novo ? [{}] : criteriosDe(t.id).map(function (c) { return { id: c.id, nome_exibido: c.nome_exibido, competencia_id: c.competencia_id, sem: !c.competencia_id }; });
      var j = ui.janela({
        titulo: novo ? 'Novo teste' : 'Editar teste',
        corpo: '<div class="form-grade">' + campo('ft-nome', 'Nome do teste', t.nome, { obrig: true, largo: true, max: 100 }) +
          '<label class="campo" for="ft-area"><span>Área <span class="obrig">*</span></span><select class="entrada" id="ft-area">' +
            (t.area_id ? '' : '<option value="">Escolha a área…</option>') + opcoesAreas(t.area_id) + '</select></label>' +
          '<label class="campo" for="ft-entrada"><span>Como o avaliador lança</span><select class="entrada" id="ft-entrada"><option value="nota">Nota de 1 a 5</option><option value="pontuacao">Pontuação (convertida pela tabela)</option></select></label>' +
          campo('ft-desc', 'Descrição', t.descricao, { largo: true, area: true }) +
          marcar('ft-padrao', 'Teste padrão', t.padrao, 'Entra em todo processo novo') +
          marcar('ft-nivel', 'Tem seleção de nível', t.tem_nivel, 'Iniciante ou Jovem Aprendiz') +
          (novo ? '' : '<div class="largo">' + marcar('ft-ativo', 'Teste ativo', t.ativo, 'Testes inativos não aparecem para processos novos') + '</div>') +
          '</div>' +
          '<div class="bloco-comps"><span class="lbl">Competências avaliadas neste teste</span>' +
          '<div class="comp-linha comp-cab" aria-hidden="true"><span>Nome que o avaliador vê</span><span>Competência</span><span></span></div>' +
          '<div id="ft-linhas"></div>' +
          '<button type="button" class="btn btn-p btn-comp-leve" id="ft-mais" style="align-self:flex-start">' + ui.icone('mais', 15) + 'Adicionar competência</button>' +
          '<span class="dica">O nome pode ficar em branco: o sistema usa o nome da competência. Para nível, pontuação e descrição de cada uma, use o lápis na competência, no card do teste.</span></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar teste', principal: true, aoClicar: salvar }]
      });
      var el = j.elemento, caixa = el.querySelector('#ft-linhas');
      function desenharLinhas() {
        caixa.innerHTML = linhas.map(function (l, i) {
          return '<div class="comp-item" data-i="' + i + '"><div class="comp-linha">' +
            '<input class="entrada" data-c="exib" aria-label="Nome que o avaliador vê" value="' + esc(l.nome_exibido || '') + '" maxlength="120" placeholder="Ex.: Trabalho em equipe">' +
            '<select class="entrada" data-c="comp" aria-label="Competência">' + (l.sem ? '<option value="" selected>— sem vínculo —</option>' : '') + opcoesCompetencias(l.competencia_id, true) + '</select>' +
            '<button type="button" class="ico perigo" data-rem="' + i + '" title="Remover" aria-label="Remover linha">' + icone('lixo') + '</button></div>' + blocoNovaComp(i) + '</div>';
        }).join('') || '<p class="dica">Nenhuma competência ainda.</p>';
        caixa.querySelectorAll('.comp-item').forEach(function (item) {
          var sel = item.querySelector('[data-c=comp]'), nc = item.querySelector('.nova-comp');
          sel.addEventListener('change', function () { nc.classList.toggle('oculto', sel.value !== NOVA); if (sel.value === NOVA) nc.querySelector('[data-nc=nome]').focus(); });
        });
        caixa.querySelectorAll('[data-rem]').forEach(function (bt) { bt.addEventListener('click', function () { ler(); linhas.splice(+bt.getAttribute('data-rem'), 1); desenharLinhas(); }); });
      }
      function ler() {
        linhas = [].map.call(caixa.querySelectorAll('.comp-item'), function (item, i) {
          var sel = item.querySelector('[data-c=comp]').value;
          return { id: linhas[i] && linhas[i].id, sem: !!(linhas[i] && linhas[i].sem && !sel), nome_exibido: item.querySelector('[data-c=exib]').value,
            competencia_id: sel && sel !== NOVA ? sel : null, nova: sel === NOVA ? lerNovaComp(item.querySelector('.nova-comp')) : null };
        });
      }
      el.querySelector('#ft-mais').addEventListener('click', function () { ler(); linhas.push({}); desenharLinhas(); var it = caixa.querySelectorAll('.comp-item'); it[it.length - 1].querySelector('select').focus(); });
      desenharLinhas();

      async function salvar(fundo) {
        ler();
        var nome = limpo(fundo.querySelector('#ft-nome').value), areaId = fundo.querySelector('#ft-area').value;
        if (!nome) { ui.toast('Informe o nome do teste.', 'erro'); return false; }
        if (!areaId) { ui.toast('Escolha a área do teste.', 'erro'); return false; }
        if (b.testes.some(function (x) { return x.id !== t.id && ui.normalizar(x.nome) === ui.normalizar(nome); })) { ui.toast('Já existe um teste com este nome.', 'erro'); return false; }
        var entrada = fundo.querySelector('#ft-entrada').value;
        var crits = [], novasNomes = {};
        for (var i = 0; i < linhas.length; i++) {
          var l = linhas[i];
          if (l.nova) {
            if (!l.nova.nome) { ui.toast('Informe o nome da nova competência (linha ' + (i + 1) + ').', 'erro'); return false; }
            if (competenciaJaExiste(l.nova.nome) || novasNomes[ui.normalizar(l.nova.nome)]) { ui.toast('A competência "' + l.nova.nome + '" já existe. Escolha-a na lista.', 'erro'); return false; }
            novasNomes[ui.normalizar(l.nova.nome)] = 1;
          } else if (!l.competencia_id && !l.sem) { ui.toast('Escolha a competência da linha ' + (i + 1) + ', ou remova a linha.', 'erro'); return false; }
          var c = { nome_exibido: limpo(l.nome_exibido) };
          if (l.id) c.id = l.id; else { c.entrada = entrada; c.conta_na_nota = true; }
          if (l.nova) c.nova_competencia = l.nova; else c.competencia_id = l.competencia_id || null;
          crits.push(c);
        }
        var payload = { id: t.id || null, nome: nome, area_id: areaId, descricao: limpo(fundo.querySelector('#ft-desc').value) || null,
          padrao: fundo.querySelector('#ft-padrao').checked, tem_nivel: fundo.querySelector('#ft-nivel').checked, criterios: crits };
        if (!novo) payload.ativo = fundo.querySelector('#ft-ativo').checked;
        return ui.executar(fundo.querySelector('.janela-pe .btn-pri'), 'Salvando…', async function () {
          try {
            var id = await dados.banco.salvarTesteCompleto(payload);
            abertas[areaId] = true;
            ui.toast(novo ? 'Teste cadastrado.' : 'Teste atualizado.', 'ok');
            await recarregar();
            var card = document.getElementById('teste-' + id); if (card) { card.scrollIntoView({ block: 'center' }); card.classList.add('destaque'); }
            return true;
          } catch (x) { erro(x); return false; }
        });
      }
    }

    /* ---------- Competência dentro de um teste (+ Competência e lápis) ---------- */
    function formCriterio(t, c) {
      var novo = !c;
      c = c || { conta_na_nota: true, entrada: 'nota' };
      var j = ui.janela({
        titulo: (novo ? 'Adicionar competência' : 'Editar competência no teste') + ' · ' + t.nome,
        corpo: '<div class="form-grade">' +
          '<label class="campo largo" for="fk-comp"><span>Competência <span class="obrig">*</span></span><select class="entrada" id="fk-comp">' + (c.id && !c.competencia_id ? '<option value="" selected>— sem vínculo —</option>' : '') + opcoesCompetencias(c.competencia_id, true) + '</select></label>' +
          '<div class="largo">' + blocoNovaComp('k') + '</div>' +
          campo('fk-nome', 'Nome que o avaliador vê neste teste', c.nome_exibido, { largo: true, max: 120, ph: 'Em branco = nome da competência' }) +
          campo('fk-desc', 'O que observar (descrição neste teste)', c.descricao, { largo: true, area: true }) +
          '<label class="campo" for="fk-entrada"><span>Como o avaliador lança</span><select class="entrada" id="fk-entrada"><option value="nota"' + (c.entrada === 'nota' ? ' selected' : '') + '>Nota de 1 a 5</option><option value="pontuacao"' + (c.entrada === 'pontuacao' ? ' selected' : '') + '>Pontuação (convertida)</option></select></label>' +
          (t.tem_nivel ? '<label class="campo" for="fk-nivel"><span>Nível</span><select class="entrada" id="fk-nivel"><option value="">Todos</option><option value="iniciante"' + (c.nivel === 'iniciante' ? ' selected' : '') + '>Iniciante</option><option value="jovem_aprendiz"' + (c.nivel === 'jovem_aprendiz' ? ' selected' : '') + '>Jovem Aprendiz</option></select></label>' : '') +
          '<div class="largo">' + marcar('fk-conta', 'Conta na nota', c.conta_na_nota, 'Desmarque só para critérios apenas informativos') + '</div></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: novo ? 'Adicionar' : 'Salvar', principal: true, aoClicar: async function (f) {
          var sel = f.querySelector('#fk-comp').value, exib = limpo(f.querySelector('#fk-nome').value);
          var nv = f.querySelector('#fk-nivel');
          try {
            if (sel === NOVA) {
              var nova = lerNovaComp(f.querySelector('.nova-comp'));
              if (!nova.nome) { ui.toast('Informe o nome da nova competência.', 'erro'); return false; }
              if (competenciaJaExiste(nova.nome)) { ui.toast('Essa competência já existe. Escolha-a na lista.', 'erro'); return false; }
              if (novo) await dados.banco.criarCompetenciaNoTeste({ nome: nova.nome, qualificacao_id: nova.qualificacao_id, descricao: nova.descricao, teste_id: t.id, nome_exibido: exib });
              else await dados.banco.salvarTesteCompleto(montarTeste(t, c.id, { nome_exibido: exib, nova_competencia: nova }));
            } else {
              if (!sel && f.querySelector('#fk-conta').checked) { ui.toast('Escolha a competência (ou desmarque "Conta na nota").', 'erro'); return false; }
              var co = porId(b.competencias, sel);
              await dados.banco.salvarCriterio({ id: c.id, teste_id: t.id, competencia_id: sel || null, nome_exibido: exib || (co ? co.nome : c.nome_exibido),
                descricao: limpo(f.querySelector('#fk-desc').value) || null, entrada: f.querySelector('#fk-entrada').value,
                nivel: nv ? (nv.value || null) : (c.nivel || null), conta_na_nota: f.querySelector('#fk-conta').checked,
                ordem: c.id ? c.ordem : criteriosDe(t.id).length + 1 });
            }
            ui.toast(novo ? 'Competência adicionada ao teste.' : 'Competência atualizada.', 'ok'); await recarregar(); return true;
          } catch (x) { erro(x); return false; }
        } }]
      });
      var sel = j.elemento.querySelector('#fk-comp'), nc = j.elemento.querySelector('.nova-comp');
      sel.addEventListener('change', function () { nc.classList.toggle('oculto', sel.value !== NOVA); if (sel.value === NOVA) nc.querySelector('[data-nc=nome]').focus(); });
    }
    // Monta o teste inteiro trocando um critério (para criar competência nova ao editar)
    function montarTeste(t, critId, troca) {
      return { id: t.id, nome: t.nome, area_id: t.area_id, descricao: t.descricao, padrao: t.padrao, tem_nivel: t.tem_nivel,
        criterios: criteriosDe(t.id).map(function (c) { return c.id === critId ? Object.assign({ id: c.id }, troca) : { id: c.id, nome_exibido: c.nome_exibido, competencia_id: c.competencia_id }; }) };
    }

    /* ---------- Nova competência (botão do topo): sempre ligada a um teste ---------- */
    function formNovaCompetencia(testeInicial) {
      var grupos = b.areas.filter(function (a) { return a.ativa; }).sort(function (x, y) { return x.ordem - y.ordem; }).map(function (a) {
        var ts = b.testes.filter(function (t) { return t.area_id === a.id && t.ativo; }).sort(function (x, y) { return x.nome.localeCompare(y.nome, 'pt-BR'); });
        return ts.length ? '<optgroup label="' + esc(a.nome) + '">' + ts.map(function (t) { return '<option value="' + t.id + '"' + (t.id === testeInicial ? ' selected' : '') + '>' + esc(t.nome) + '</option>'; }).join('') + '</optgroup>' : '';
      }).join('');
      var semArea = b.testes.filter(function (t) { return !t.area_id && t.ativo; });
      if (semArea.length) grupos += '<optgroup label="Sem área">' + semArea.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nome) + '</option>'; }).join('') + '</optgroup>';
      ui.janela({
        titulo: 'Nova competência',
        corpo: '<div class="form-grade">' + campo('fn-nome', 'Nome da competência', '', { obrig: true, largo: true, max: 120 }) +
          '<label class="campo largo" for="fn-qual"><span>Qualificação-chave <span class="obrig">*</span></span><select class="entrada" id="fn-qual">' + opcoesQualificacoes() + '</select></label>' +
          campo('fn-desc', 'Descrição padrão', '', { largo: true, area: true, ph: 'O que o avaliador deve observar' }) +
          '<label class="campo largo" for="fn-teste"><span>Em qual teste ela será avaliada? <span class="obrig">*</span></span><select class="entrada" id="fn-teste"><option value="">Escolha o teste…</option>' + grupos + '</select></label>' +
          campo('fn-exib', 'Nome que o avaliador vê nesse teste', '', { largo: true, ph: 'Em branco = nome da competência' }) +
          '<p class="dica largo" style="margin:0">Toda competência nova já nasce ligada a um teste. Depois ela pode ser adicionada a outros testes pelo "+ Competência" de cada card.</p></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar competência', principal: true, aoClicar: async function (f) {
          var nome = limpo(f.querySelector('#fn-nome').value), teste = f.querySelector('#fn-teste').value;
          if (!nome) { ui.toast('Informe o nome da competência.', 'erro'); return false; }
          if (competenciaJaExiste(nome)) { ui.toast('Já existe uma competência com este nome.', 'erro'); return false; }
          if (!teste) { ui.toast('Escolha o teste em que a competência será avaliada.', 'erro'); return false; }
          try {
            await dados.banco.criarCompetenciaNoTeste({ nome: nome, qualificacao_id: f.querySelector('#fn-qual').value, descricao: limpo(f.querySelector('#fn-desc').value), teste_id: teste, nome_exibido: limpo(f.querySelector('#fn-exib').value) });
            var t = porId(b.testes, teste); abertas[(t && t.area_id) || 'sem'] = true;
            ui.toast('Competência criada e ligada ao teste.', 'ok'); await recarregar(); return true;
          } catch (x) { erro(x); return false; }
        } }]
      });
    }

    /* ---------- Exclusões ---------- */
    async function removerCriterio(c) {
      var co = porId(b.competencias, c.competencia_id), t = porId(b.testes, c.teste_id);
      if (!(await ui.confirmar('Remover "' + (co ? co.nome : c.nome_exibido) + '" deste teste?', 'Ela deixa de ser avaliada em "' + t.nome + '". A competência continua no banco e nos outros testes.', 'Remover', 'Cancelar'))) return;
      try { await dados.banco.excluirCriterio(c.id); ui.toast('Removida do teste.', 'ok'); await recarregar(); } catch (x) { erro(x); }
    }
    async function excluirTeste(t) {
      var n = criteriosDe(t.id).length;
      if (!(await ui.confirmar('Excluir o teste "' + t.nome + '"?', 'As ' + n + ' competência(s) ligadas a ele saem junto (elas continuam no banco). Esta ação não pode ser desfeita.', 'Excluir teste', 'Cancelar'))) return;
      try { await dados.banco.excluirTeste(t.id); ui.toast('Teste excluído.', 'ok'); await recarregar(); } catch (x) { erro(x); }
    }
    function excluirArea(a) {
      var ts = b.testes.filter(function (t) { return t.area_id === a.id; });
      if (!ts.length) {
        ui.confirmar('Excluir a área "' + a.nome + '"?', 'Ela não tem testes. Esta ação não pode ser desfeita.', 'Excluir área', 'Cancelar').then(async function (sim) {
          if (!sim) return;
          try { await dados.banco.excluirArea(a.id, null); ui.toast('Área excluída.', 'ok'); await recarregar(); } catch (x) { erro(x); }
        });
        return;
      }
      ui.janela({
        titulo: 'Excluir a área "' + a.nome + '"', confirmarDescarte: false,
        corpo: '<p style="margin:0;color:var(--texto-2)">Esta área tem <b>' + ts.length + ' teste(s)</b>. Como todo teste precisa de uma área, escolha para onde eles vão:</p>' +
          '<label class="campo" for="ea-dest"><span>Mover os testes para <span class="obrig">*</span></span><select class="entrada" id="ea-dest"><option value="">Escolha a área…</option>' + opcoesAreas(null, a.id) + '</select></label>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Mover e excluir área', principal: true, aoClicar: async function (f) {
          var dest = f.querySelector('#ea-dest').value;
          if (!dest) { ui.toast('Escolha a área de destino.', 'erro'); return false; }
          try { await dados.banco.excluirArea(a.id, dest); abertas[dest] = true; ui.toast('Testes movidos e área excluída.', 'ok'); await recarregar(); return true; } catch (x) { erro(x); return false; }
        } }]
      });
    }

    /* ---------- Área ---------- */
    function formArea(a) {
      a = a || { ordem: b.areas.reduce(function (m, x) { return Math.max(m, x.ordem); }, 0) + 1, ativa: true };
      ui.janela({
        titulo: a.id ? 'Editar área' : 'Nova área',
        corpo: '<div class="form-grade">' + campo('fa-nome', 'Nome da área', a.nome, { obrig: true, max: 60, ph: 'Ex.: Elétrica' }) + campo('fa-ordem', 'Ordem no radar', a.ordem, { tipo: 'number' }) +
          (a.id ? '<div class="largo">' + marcar('fa-ativa', 'Área ativa', a.ativa) + '</div>' : '') + '</div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar área', principal: true, aoClicar: async function (f) {
          var nome = limpo(f.querySelector('#fa-nome').value), ordem = parseInt(f.querySelector('#fa-ordem').value, 10);
          if (!nome) { ui.toast('Informe o nome da área.', 'erro'); return false; }
          if (isNaN(ordem) || ordem < 0) { ui.toast('Informe uma ordem válida.', 'erro'); return false; }
          if (b.areas.some(function (x) { return x.id !== a.id && ui.normalizar(x.nome) === ui.normalizar(nome); })) { ui.toast('Já existe uma área com este nome.', 'erro'); return false; }
          try { var s = await dados.banco.salvarArea({ id: a.id, nome: nome, ordem: ordem, ativa: a.id ? f.querySelector('#fa-ativa').checked : true }); abertas[s.id] = true; ui.toast('Área salva.', 'ok'); await recarregar(); return true; }
          catch (x) { erro(x); return false; }
        } }]
      });
    }

    /* ---------- Tabela de conversão ---------- */
    function verConversao(t) {
      var conv = b.conversao.filter(function (c) { return c.teste_id === t.id; }).sort(function (p, q) { return p.pont_min - q.pont_min; });
      ui.janela({ titulo: 'Tabela de conversão · ' + t.nome, confirmarDescarte: false,
        corpo: '<table class="tabela mini"><thead><tr><th>Pontuação</th><th>Nota</th></tr></thead><tbody>' + conv.map(function (f) { return '<tr><td>' + fmt(f.pont_min) + (f.pont_max == null ? ' ou mais' : ' a ' + fmt(f.pont_max)) + '</td><td class="num">' + fmt(f.nota) + '</td></tr>'; }).join('') + '</tbody></table>' });
    }
    function formConversao(t, conv) {
      var linhas = conv.length ? conv.map(function (f) { return { pont_min: f.pont_min, pont_max: f.pont_max, nota: f.nota }; }) : [{ pont_min: 0, pont_max: null, nota: 1 }];
      var j = ui.janela({
        titulo: 'Tabela de conversão · ' + t.nome,
        corpo: '<p class="dica" style="margin:0">Cada faixa de pontuação vira uma nota de 1 a 5. Deixe "até" em branco na última faixa para "ou mais".</p><div id="faixas"></div>' +
          '<button type="button" class="btn btn-p" id="fx-mais" style="align-self:flex-start">' + ui.icone('mais', 15) + 'Adicionar faixa</button>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar tabela', principal: true, aoClicar: async function (f) {
          var lidas = [].map.call(f.querySelectorAll('.faixa-linha'), function (l) { return { pont_min: numero(l.querySelector('[data-c=min]').value), pont_max: numero(l.querySelector('[data-c=max]').value), nota: numero(l.querySelector('[data-c=nota]').value) }; })
            .sort(function (x, y) { return (x.pont_min || 0) - (y.pont_min || 0); });
          for (var i = 0; i < lidas.length; i++) {
            var x = lidas[i];
            if (x.pont_min == null || x.nota == null) { ui.toast('Preencha "de" e "nota" em todas as faixas.', 'erro'); return false; }
            if (x.nota < 1 || x.nota > 5) { ui.toast('As notas precisam ficar entre 1 e 5.', 'erro'); return false; }
            if (x.pont_max != null && x.pont_max < x.pont_min) { ui.toast('Em cada faixa, "até" precisa ser maior ou igual a "de".', 'erro'); return false; }
            if (i > 0 && (lidas[i - 1].pont_max == null || lidas[i - 1].pont_max >= x.pont_min)) { ui.toast('As faixas não podem se sobrepor, e só a última pode ficar sem "até".', 'erro'); return false; }
          }
          try { await dados.banco.salvarConversao(t.id, lidas); ui.toast('Tabela de conversão salva.', 'ok'); await recarregar(); return true; } catch (e) { erro(e); return false; }
        } }]
      });
      var box = j.elemento.querySelector('#faixas');
      function ler() { linhas = [].map.call(box.querySelectorAll('.faixa-linha'), function (l) { return { pont_min: numero(l.querySelector('[data-c=min]').value), pont_max: numero(l.querySelector('[data-c=max]').value), nota: numero(l.querySelector('[data-c=nota]').value) }; }); }
      function desenharFaixas() {
        box.innerHTML = linhas.map(function (l, i) {
          return '<div class="faixa-linha"><label>De<input class="entrada" data-c="min" inputmode="decimal" value="' + fmt(l.pont_min) + '"></label><label>Até<input class="entrada" data-c="max" inputmode="decimal" value="' + fmt(l.pont_max) + '" placeholder="ou mais"></label>' +
            '<label>Nota<input class="entrada" data-c="nota" inputmode="decimal" value="' + fmt(l.nota) + '"></label><button type="button" class="janela-x" data-rem="' + i + '" aria-label="Remover faixa">×</button></div>';
        }).join('');
        box.querySelectorAll('[data-rem]').forEach(function (bt) { bt.addEventListener('click', function () { ler(); linhas.splice(+bt.getAttribute('data-rem'), 1); desenharFaixas(); }); });
      }
      j.elemento.querySelector('#fx-mais').addEventListener('click', function () { ler(); var u = linhas[linhas.length - 1]; linhas.push({ pont_min: u && u.pont_max != null ? u.pont_max + 1 : null, pont_max: null, nota: null }); desenharFaixas(); });
      desenharFaixas();
    }

    /* ---------- Pendências ---------- */
    function verPendencias(pend) {
      var nomes = { teste: 'Testes sem competências', sem_area: 'Testes sem área (escolha uma área ao editar)', competencia: 'Competências sem testes', nao_conta: 'Testes com critérios que não contam na nota' };
      var j = ui.janela({ titulo: 'Pendências do banco', confirmarDescarte: false,
        corpo: GRUPOS_PEND.map(function (g) {
          var itens = pend.filter(function (p) { return p.tipo === g[0]; });
          return itens.length ? '<div><span class="lbl">' + esc(nomes[g[0]]) + ' · ' + itens.length + '</span><ul class="lista-pend">' + itens.map(function (p) {
            return '<li>' + (p.teste ? '<button type="button" class="btn-link" data-ir="' + p.teste + '">' + esc(p.texto) + '</button>' : esc(p.texto)) + '</li>';
          }).join('') + '</ul></div>' : '';
        }).join('') + '<p class="dica" style="margin:0">Competências sem testes podem ser adicionadas a um teste pelo "+ Competência", ou excluídas em Cadastros → Competências.</p>' });
      j.elemento.querySelectorAll('[data-ir]').forEach(function (bt) {
        bt.addEventListener('click', function () {
          var t = porId(b.testes, bt.getAttribute('data-ir')); abertas[t.area_id || 'sem'] = true; j.fechar(true); desenhar();
          var card = document.getElementById('teste-' + t.id); if (card) { card.scrollIntoView({ block: 'center' }); card.classList.add('destaque'); }
        });
      });
    }

    carregar();
  };
})();
