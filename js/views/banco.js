/* =====================================================================
   Classificação Final · views/banco.js
   Banco de testes: filtro por área, lista de testes, detalhe com os
   critérios (vínculos com as competências), tabela de conversão e
   painel de pendências. Avaliador vê tudo, mas só o administrador altera.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var NIVEIS = { iniciante: 'Iniciante', jovem_aprendiz: 'Jovem Aprendiz' };

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function porId(lista, id) { return lista.filter(function (x) { return x.id === id; })[0]; }
  function campoTexto(id, rotulo, valor, op) {
    op = op || {};
    return '<label class="campo' + (op.largo ? ' largo' : '') + '" for="' + id + '"><span>' + esc(rotulo) + (op.obrig ? ' <span class="obrig">*</span>' : '') + '</span>' +
      (op.area ? '<textarea class="entrada" id="' + id + '" rows="3" maxlength="600">' + esc(valor || '') + '</textarea>'
               : '<input class="entrada" id="' + id + '" type="' + (op.tipo || 'text') + '" value="' + esc(valor == null ? '' : valor) + '" maxlength="' + (op.max || 160) + '"' + (op.passo ? ' step="' + op.passo + '"' : '') + '>') + '</label>';
  }
  function marcar(id, rotulo, ligado, dica) {
    return '<label class="marcar largo"><input type="checkbox" id="' + id + '"' + (ligado ? ' checked' : '') + '><span><b>' + esc(rotulo) + '</b>' + (dica ? '<small>' + esc(dica) + '</small>' : '') + '</span></label>';
  }
  function numero(v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function fmt(n) { return n == null ? '' : String(n).replace('.', ','); }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.banco = function (area, ctx) {
    var admin = ctx.perfil.perfil === 'admin';
    var b = null, filtroArea = 'todas', selecionado = null, busca = '', inativos = false;

    area.innerHTML = '<header class="cabecalho"><div><h1>Banco de testes</h1><p>Áreas, testes e competências usados na montagem dos processos</p></div>' +
      (admin ? '<button type="button" class="btn btn-pri" id="b-novo">' + ui.icone('mais', 17) + 'Novo teste</button>' : '') + '</header>' +
      '<div id="pend"></div><div id="banco"><div class="girando" style="margin:30px auto"></div></div>';
    if (admin) area.querySelector('#b-novo').addEventListener('click', function () { formTeste(null); });

    async function carregar() {
      try { b = await dados.banco.carregarTudo(); desenhar(); }
      catch (e) { erro(e); area.querySelector('#banco').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; }
    }

    /* ---------- Pendências (calculadas na tela, iguais ao painel do banco) ---------- */
    function pendencias() {
      var p = [];
      b.testes.filter(function (t) { return t.ativo; }).forEach(function (t) {
        var cs = b.criterios.filter(function (c) { return c.teste_id === t.id; });
        if (!cs.some(function (c) { return c.competencia_id; })) p.push({ tipo: 'teste', texto: 'Teste sem competências: ' + t.nome, teste: t.id });
        var nc = cs.filter(function (c) { return !c.conta_na_nota; }).length;
        if (nc) p.push({ tipo: 'nao_conta', texto: t.nome + ': ' + nc + ' critério(s) não contam na nota', teste: t.id });
      });
      b.competencias.filter(function (c) { return c.ativa; }).forEach(function (c) {
        if (!b.criterios.some(function (x) { return x.competencia_id === c.id; })) p.push({ tipo: 'competencia', texto: 'Competência sem testes: ' + c.nome });
      });
      return p;
    }

    function desenhar() {
      var pend = pendencias();
      var bp = area.querySelector('#pend');
      bp.innerHTML = !pend.length ? '' :
        '<section class="card pendencias faixa">' + ui.icone('alerta', 18) + '<span style="flex:1;min-width:220px">' + pend.length + ' pendência(s) no banco: ' +
        [['teste', 'testes sem competências'], ['competencia', 'competências sem testes'], ['nao_conta', 'testes com critérios que não contam na nota']].map(function (k) {
          var n = pend.filter(function (x) { return x.tipo === k[0]; }).length; return n ? n + ' ' + k[1] : null;
        }).filter(Boolean).join(', ') + '.</span><button type="button" class="btn btn-p" id="b-pend">Ver pendências</button></section>';
      var bpb = bp.querySelector('#b-pend');
      if (bpb) bpb.addEventListener('click', function () { verPendencias(pend); });

      var ativos = b.testes.filter(function (t) { return t.ativo || inativos; });
      var contagem = function (aid) { return ativos.filter(function (t) { return aid === 'todas' ? true : (aid === 'sem' ? !t.area_id : t.area_id === aid); }).length; };
      var opcoesArea = [['todas', 'Todas']].concat(b.areas.filter(function (a) { return a.ativa; }).map(function (a) { return [a.id, a.nome]; })).concat([['sem', 'Sem área']]);
      var lista = ativos.filter(function (t) {
        if (filtroArea === 'sem' && t.area_id) return false;
        if (filtroArea !== 'todas' && filtroArea !== 'sem' && t.area_id !== filtroArea) return false;
        return !busca || ui.normalizar(t.nome).indexOf(busca) >= 0;
      });
      if (!selecionado || !lista.some(function (t) { return t.id === selecionado; })) selecionado = lista[0] ? lista[0].id : null;

      var box = area.querySelector('#banco');
      box.innerHTML =
        '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar teste</span><input type="search" id="busca-t" placeholder="Buscar teste" value="' + esc(busca) + '"></label>' +
        '<label class="marcar-linha"><input type="checkbox" id="inat"' + (inativos ? ' checked' : '') + '> Mostrar inativos</label></div>' +
        '<div class="banco-lado">' +
          '<nav class="card filtro-areas" aria-label="Filtrar por área">' + opcoesArea.map(function (a) {
            return '<button type="button" data-area="' + a[0] + '" aria-pressed="' + (filtroArea === a[0]) + '"><span>' + esc(a[1]) + '</span><small>' + contagem(a[0]) + '</small></button>';
          }).join('') + '</nav>' +
          '<div class="card tabela-card lista-testes">' + (lista.length ? '<table class="tabela"><thead><tr><th>Teste</th><th>Critérios</th><th>Situação</th></tr></thead><tbody>' +
            lista.map(function (t) {
              var cs = b.criterios.filter(function (c) { return c.teste_id === t.id; });
              var nc = cs.filter(function (c) { return !c.conta_na_nota; }).length;
              var situ = !t.ativo ? ui.pill('Inativo', 'neu') : (!cs.some(function (c) { return c.competencia_id; }) ? ui.pill('Sem vínculo', 'off') : (nc ? ui.pill(nc + ' não conta' + (nc > 1 ? 'm' : ''), 'off') : (t.padrao ? ui.pill('Padrão', 'neu') : ui.pill('Ativo', 'neu'))));
              return '<tr class="clicavel' + (t.id === selecionado ? ' sel' : '') + '" data-teste="' + t.id + '" tabindex="0"><td><b>' + esc(t.nome) + '</b></td><td class="num">' + cs.length + '</td><td>' + situ + '</td></tr>';
            }).join('') + '</tbody></table>' : '<div class="vazio">Nenhum teste nesta área.</div>') + '</div>' +
          '<aside class="card detalhe-teste" id="detalhe"></aside>' +
        '</div>';
      box.querySelector('#busca-t').addEventListener('input', function (e) { busca = ui.normalizar(e.target.value); var pos = e.target.selectionStart; desenhar(); var n = area.querySelector('#busca-t'); n.focus(); n.setSelectionRange(pos, pos); });
      box.querySelector('#inat').addEventListener('change', function (e) { inativos = e.target.checked; desenhar(); });
      box.querySelectorAll('[data-area]').forEach(function (bt) { bt.addEventListener('click', function () { filtroArea = bt.getAttribute('data-area'); selecionado = null; desenhar(); }); });
      box.querySelectorAll('[data-teste]').forEach(function (tr) {
        var abrir = function () { selecionado = tr.getAttribute('data-teste'); desenhar(); if (window.innerWidth < 1100) area.querySelector('#detalhe').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        tr.addEventListener('click', abrir);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
      });
      desenharDetalhe();
    }

    function desenharDetalhe() {
      var d = area.querySelector('#detalhe');
      var t = porId(b.testes, selecionado);
      if (!t) { d.innerHTML = '<span class="dica">Selecione um teste para ver os detalhes.</span>'; return; }
      var ar = porId(b.areas, t.area_id);
      var cs = b.criterios.filter(function (c) { return c.teste_id === t.id; }).sort(function (x, y) { return x.ordem - y.ordem; });
      var conv = b.conversao.filter(function (c) { return c.teste_id === t.id; }).sort(function (x, y) { return x.pont_min - y.pont_min; });
      var usaPont = cs.some(function (c) { return c.entrada === 'pontuacao'; });
      d.innerHTML = '<span class="lbl">Teste selecionado</span><h2>' + esc(t.nome) + '</h2>' +
        '<div class="selos">' + ui.pill('Área: ' + (ar ? ar.nome : 'sem área'), 'neu') + ui.pill(cs.length + ' critério(s)', 'neu') +
          (t.padrao ? ui.pill('Teste padrão', 'neu') : '') + (t.tem_nivel ? ui.pill('Com nível', 'neu') : '') + (!t.ativo ? ui.pill('Inativo', 'neu') : '') + '</div>' +
        (t.descricao ? '<p class="desc">' + esc(t.descricao) + '</p>' : '') +
        '<div class="crit-cab"><span>No teste</span><span></span><span>Competência</span></div>' +
        (cs.length ? cs.map(function (c) {
          var co = porId(b.competencias, c.competencia_id);
          var extras = [c.nivel ? NIVEIS[c.nivel] : null, c.entrada === 'pontuacao' ? 'pontuação convertida' : null, !c.conta_na_nota ? 'não conta na nota' : null].filter(Boolean);
          return '<div class="crit' + (admin ? ' clicavel' : '') + '" data-crit="' + c.id + '"' + (admin ? ' tabindex="0" title="Editar critério"' : '') + '><div><b>' + esc(c.nome_exibido) + '</b>' +
            (extras.length ? '<small>' + esc(extras.join(' · ')) + '</small>' : '') + (c.descricao ? '<small class="desc-c">' + esc(c.descricao) + '</small>' : '') + '</div>' +
            '<span aria-hidden="true">' + ui.icone('seta', 14) + '</span><span>' + (co ? esc(co.nome) : '<em class="alerta-txt">sem vínculo</em>') + '</span></div>';
        }).join('') : '<p class="dica">Este teste ainda não tem critérios.</p>') +
        (usaPont ? '<div class="conv"><span class="lbl">Tabela de conversão</span>' + (conv.length ? '<table class="tabela mini"><thead><tr><th>Pontuação</th><th>Nota</th></tr></thead><tbody>' +
          conv.map(function (f) { return '<tr><td>' + fmt(f.pont_min) + (f.pont_max == null ? ' ou mais' : ' a ' + fmt(f.pont_max)) + '</td><td class="num">' + fmt(f.nota) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="dica">Sem faixas cadastradas.</p>') + '</div>' : '') +
        (admin ? '<div class="botoes-det"><button type="button" class="btn btn-p" id="d-crit">' + ui.icone('mais', 15) + 'Novo critério</button><button type="button" class="btn btn-p" id="d-editar">Editar teste</button>' +
          (usaPont ? '<button type="button" class="btn btn-p" id="d-conv">Editar conversão</button>' : '') + '</div>' : '') +
        '<span class="dica">Mudanças valem para processos novos. Processos já iniciados mantêm a configuração da época.</span>';
      if (!admin) return;
      d.querySelector('#d-editar').addEventListener('click', function () { formTeste(t); });
      d.querySelector('#d-crit').addEventListener('click', function () { formCriterio(t, null); });
      var dc = d.querySelector('#d-conv'); if (dc) dc.addEventListener('click', function () { formConversao(t, conv); });
      d.querySelectorAll('[data-crit]').forEach(function (el) {
        var abrir = function () { formCriterio(t, porId(b.criterios, el.getAttribute('data-crit'))); };
        el.addEventListener('click', abrir);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
      });
    }

    /* ---------- Formulários (somente administrador) ---------- */
    function formTeste(t) {
      t = t || { ativo: true, area_id: (filtroArea !== 'todas' && filtroArea !== 'sem') ? filtroArea : null };
      ui.janela({
        titulo: t.id ? 'Editar teste' : 'Novo teste',
        corpo: '<div class="form-grade">' + campoTexto('ft-nome', 'Nome do teste', t.nome, { obrig: true, largo: true, max: 100 }) +
          '<label class="campo largo" for="ft-area"><span>Área</span><select class="entrada" id="ft-area"><option value="">Sem área (conta na nota, não aparece no radar)</option>' +
            b.areas.filter(function (a) { return a.ativa || a.id === t.area_id; }).map(function (a) { return '<option value="' + a.id + '"' + (a.id === t.area_id ? ' selected' : '') + '>' + esc(a.nome) + '</option>'; }).join('') + '</select></label>' +
          campoTexto('ft-desc', 'Descrição', t.descricao, { largo: true, area: true }) +
          marcar('ft-padrao', 'Teste padrão', t.padrao, 'Entra automaticamente em todo processo novo (pode ser removido no processo).') +
          marcar('ft-nivel', 'Tem seleção de nível', t.tem_nivel, 'Como o Teste de Programação: Iniciante ou Jovem Aprendiz.') +
          (t.id ? marcar('ft-ativo', 'Teste ativo', t.ativo, 'Testes inativos não aparecem para processos novos.') : '') + '</div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar teste', principal: true, aoClicar: async function (f) {
          var nome = f.querySelector('#ft-nome').value.trim().replace(/\s+/g, ' ');
          if (!nome) { ui.toast('Informe o nome do teste.', 'erro'); return false; }
          try {
            var s = await dados.banco.salvarTeste({ id: t.id, nome: nome, area_id: f.querySelector('#ft-area').value || null, descricao: f.querySelector('#ft-desc').value.trim() || null,
              padrao: f.querySelector('#ft-padrao').checked, tem_nivel: f.querySelector('#ft-nivel').checked, ativo: t.id ? f.querySelector('#ft-ativo').checked : true });
            ui.toast('Teste salvo.', 'ok'); selecionado = s.id; await carregar(); return true;
          } catch (x) { if (/unique|duplicate/i.test(x.message || '')) ui.toast('Já existe um teste com este nome.', 'erro'); else erro(x); return false; }
        } }]
      });
    }

    function formCriterio(t, c) {
      var novo = !c;
      c = c || { conta_na_nota: true, entrada: 'nota', ordem: b.criterios.filter(function (x) { return x.teste_id === t.id; }).length + 1 };
      var opcoesComp = b.qualificacoes.map(function (q) {
        var cs = b.competencias.filter(function (x) { return x.qualificacao_id === q.id && (x.ativa || x.id === c.competencia_id); });
        return cs.length ? '<optgroup label="' + esc(q.nome) + '">' + cs.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.competencia_id ? ' selected' : '') + '>' + esc(x.nome) + '</option>'; }).join('') + '</optgroup>' : '';
      }).join('');
      var j = ui.janela({
        titulo: (novo ? 'Novo critério' : 'Editar critério') + ' · ' + t.nome,
        corpo: '<div class="form-grade">' + campoTexto('fk-nome', 'Nome que o avaliador vê', c.nome_exibido, { obrig: true, largo: true, max: 120 }) +
          campoTexto('fk-desc', 'Descrição (o que observar)', c.descricao, { largo: true, area: true }) +
          '<label class="campo largo" for="fk-comp"><span>Competência</span><select class="entrada" id="fk-comp"><option value="">— sem vínculo —</option>' + opcoesComp + '</select></label>' +
          marcar('fk-conta', 'Conta na nota', c.conta_na_nota, 'Se marcado, o critério precisa estar ligado a uma competência.') +
          '<label class="campo" for="fk-entrada"><span>Como o avaliador lança</span><select class="entrada" id="fk-entrada"><option value="nota"' + (c.entrada === 'nota' ? ' selected' : '') + '>Nota de 1 a 5</option><option value="pontuacao"' + (c.entrada === 'pontuacao' ? ' selected' : '') + '>Pontuação (convertida pela tabela)</option></select></label>' +
          (t.tem_nivel ? '<label class="campo" for="fk-nivel"><span>Nível</span><select class="entrada" id="fk-nivel"><option value="">Todos</option><option value="iniciante"' + (c.nivel === 'iniciante' ? ' selected' : '') + '>Iniciante</option><option value="jovem_aprendiz"' + (c.nivel === 'jovem_aprendiz' ? ' selected' : '') + '>Jovem Aprendiz</option></select></label>' : '') +
          campoTexto('fk-ordem', 'Ordem', c.ordem, { tipo: 'number' }) +
          (novo ? '' : '<div class="largo"><button type="button" class="btn-link perigo" id="fk-excluir">Excluir este critério</button></div>') + '</div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar critério', principal: true, aoClicar: async function (f) {
          var nome = f.querySelector('#fk-nome').value.trim().replace(/\s+/g, ' ');
          var comp = f.querySelector('#fk-comp').value || null, conta = f.querySelector('#fk-conta').checked;
          if (!nome) { ui.toast('Informe o nome do critério.', 'erro'); return false; }
          if (conta && !comp) { ui.toast('Para contar na nota, escolha a competência (ou desmarque "Conta na nota").', 'erro'); return false; }
          var ordem = parseInt(f.querySelector('#fk-ordem').value, 10);
          var nv = f.querySelector('#fk-nivel');
          try {
            await dados.banco.salvarCriterio({ id: c.id, teste_id: t.id, nome_exibido: nome, descricao: f.querySelector('#fk-desc').value.trim() || null,
              competencia_id: comp, conta_na_nota: conta, entrada: f.querySelector('#fk-entrada').value, nivel: nv ? (nv.value || null) : null, ordem: isNaN(ordem) ? 0 : ordem });
            ui.toast('Critério salvo.', 'ok'); await carregar(); return true;
          } catch (x) { erro(x); return false; }
        } }]
      });
      var ex = j.elemento.querySelector('#fk-excluir');
      if (ex) ex.addEventListener('click', async function () {
        if (!(await ui.confirmar('Excluir o critério?', 'O vínculo com a competência deixa de existir para processos novos.', 'Excluir', 'Cancelar'))) return;
        try { await dados.banco.excluirCriterio(c.id); j.fechar(true); ui.toast('Critério excluído.', 'ok'); await carregar(); } catch (x) { erro(x); }
      });
    }

    function formConversao(t, conv) {
      var linhas = conv.length ? conv.map(function (f) { return { pont_min: f.pont_min, pont_max: f.pont_max, nota: f.nota }; }) : [{ pont_min: 0, pont_max: null, nota: 1 }];
      var j = ui.janela({
        titulo: 'Tabela de conversão · ' + t.nome,
        corpo: '<p class="dica" style="margin:0">Cada faixa de pontuação vira uma nota de 1 a 5. Deixe "até" em branco na última faixa para "ou mais".</p><div id="faixas"></div>' +
          '<button type="button" class="btn btn-p" id="fx-mais" style="align-self:flex-start">' + ui.icone('mais', 15) + 'Adicionar faixa</button>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar tabela', principal: true, aoClicar: async function (f) {
          var lidas = [].map.call(f.querySelectorAll('.faixa-linha'), function (l) {
            return { pont_min: numero(l.querySelector('[data-c=min]').value), pont_max: numero(l.querySelector('[data-c=max]').value), nota: numero(l.querySelector('[data-c=nota]').value) };
          }).sort(function (a, b2) { return (a.pont_min || 0) - (b2.pont_min || 0); });
          for (var i = 0; i < lidas.length; i++) {
            var x = lidas[i];
            if (x.pont_min == null || x.nota == null) { ui.toast('Preencha "de" e "nota" em todas as faixas.', 'erro'); return false; }
            if (x.nota < 1 || x.nota > 5) { ui.toast('As notas precisam ficar entre 1 e 5.', 'erro'); return false; }
            if (x.pont_max != null && x.pont_max < x.pont_min) { ui.toast('Em cada faixa, "até" precisa ser maior ou igual a "de".', 'erro'); return false; }
            if (i > 0 && (lidas[i - 1].pont_max == null || lidas[i - 1].pont_max >= x.pont_min)) { ui.toast('As faixas não podem se sobrepor, e só a última pode ficar sem "até".', 'erro'); return false; }
          }
          try { await dados.banco.salvarConversao(t.id, lidas); ui.toast('Tabela de conversão salva.', 'ok'); await carregar(); return true; }
          catch (e) { erro(e); return false; }
        } }]
      });
      var box = j.elemento.querySelector('#faixas');
      function desenharFaixas() {
        box.innerHTML = linhas.map(function (l, i) {
          return '<div class="faixa-linha"><label>De<input class="entrada" data-c="min" inputmode="decimal" value="' + fmt(l.pont_min) + '"></label>' +
            '<label>Até<input class="entrada" data-c="max" inputmode="decimal" value="' + fmt(l.pont_max) + '" placeholder="ou mais"></label>' +
            '<label>Nota<input class="entrada" data-c="nota" inputmode="decimal" value="' + fmt(l.nota) + '"></label>' +
            '<button type="button" class="janela-x" data-rem="' + i + '" aria-label="Remover faixa">×</button></div>';
        }).join('');
        box.querySelectorAll('[data-rem]').forEach(function (bt) {
          bt.addEventListener('click', function () { ler(); linhas.splice(parseInt(bt.getAttribute('data-rem'), 10), 1); desenharFaixas(); });
        });
      }
      function ler() {
        linhas = [].map.call(box.querySelectorAll('.faixa-linha'), function (l) {
          return { pont_min: numero(l.querySelector('[data-c=min]').value), pont_max: numero(l.querySelector('[data-c=max]').value), nota: numero(l.querySelector('[data-c=nota]').value) };
        });
      }
      j.elemento.querySelector('#fx-mais').addEventListener('click', function () {
        ler(); var ult = linhas[linhas.length - 1];
        linhas.push({ pont_min: ult && ult.pont_max != null ? ult.pont_max + 1 : null, pont_max: null, nota: null }); desenharFaixas();
      });
      desenharFaixas();
    }

    function verPendencias(pend) {
      var grupos = [['teste', 'Testes sem competências'], ['competencia', 'Competências sem testes'], ['nao_conta', 'Critérios que não contam na nota']];
      var j = ui.janela({
        titulo: 'Pendências do banco', confirmarDescarte: false,
        corpo: grupos.map(function (g) {
          var itens = pend.filter(function (p) { return p.tipo === g[0]; });
          return itens.length ? '<div><span class="lbl">' + esc(g[1]) + ' · ' + itens.length + '</span><ul class="lista-pend">' + itens.map(function (p) {
            return '<li>' + (p.teste ? '<button type="button" class="btn-link" data-ir="' + p.teste + '">' + esc(p.texto) + '</button>' : esc(p.texto)) + '</li>';
          }).join('') + '</ul></div>' : '';
        }).join('') + '<p class="dica" style="margin:0">Competências sem testes podem ser vinculadas pelo "Novo critério" de um teste, ou excluídas em Cadastros → Competências.</p>'
      });
      j.elemento.querySelectorAll('[data-ir]').forEach(function (bt) {
        bt.addEventListener('click', function () { selecionado = bt.getAttribute('data-ir'); filtroArea = 'todas'; j.fechar(true); desenhar(); });
      });
    }

    carregar();
  };
})();
