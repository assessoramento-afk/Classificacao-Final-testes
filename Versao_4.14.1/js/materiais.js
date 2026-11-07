/* =====================================================================
   Classificação Final · materiais.js
   Quantidades de referência: 20 pessoas (4 grupos de 5).
   - Teste em grupo: ajusta pelo número de grupos (1 grupo a cada 5 pessoas).
   - Teste individual: ajusta pelo número de pessoas.
   - Material com quantidade fixa: não muda.
   Também monta a lista impressa (A4) com caixas de conferência.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc;
  var REF_PESSOAS = 20, REF_GRUPOS = 4, POR_GRUPO = 5;

  function fmtQtd(n) {
    if (n == null || isNaN(n)) return '';
    var r = Math.round(n * 100) / 100;
    return (r % 1 === 0 ? String(r) : r.toFixed(r * 10 % 1 === 0 ? 1 : 2)).replace('.', ',');
  }
  function grupos(pessoas) { return Math.max(1, Math.ceil(pessoas / POR_GRUPO)); }
  // Quantidade para a turma, sempre arredondando para cima
  function calcular(qtd, modalidade, fixa, pessoas) {
    qtd = Number(qtd);
    if (fixa || !pessoas) return qtd;
    var fator = modalidade === 'grupo' ? grupos(pessoas) / REF_GRUPOS : pessoas / REF_PESSOAS;
    var v = qtd * fator;
    if (qtd % 1 === 0) return Math.max(1, Math.ceil(v - 1e-9));
    return Math.ceil(v * 10 - 1e-9) / 10;
  }
  // Lista agrupada por teste: [{ teste, modalidade, itens: [{ nome, unidade, qtd, obs, fixa }] }]
  function lista(b, testeIds, pessoas) {
    return testeIds.map(function (tid) {
      var t = (b.testes || []).filter(function (x) { return x.id === tid; })[0];
      if (!t) return null;
      var itens = (b.testeMateriais || []).filter(function (m) { return m.teste_id === tid; }).sort(function (x, y) { return x.ordem - y.ordem; }).map(function (m) {
        var mat = (b.materiais || []).filter(function (x) { return x.id === m.material_id; })[0] || { nome: '?', unidade: '' };
        return { nome: mat.nome, unidade: mat.unidade, qtd: calcular(m.quantidade, t.modalidade, m.fixa, pessoas), ref: Number(m.quantidade), obs: m.observacao || '', fixa: m.fixa };
      });
      return itens.length ? { teste: t.nome, modalidade: t.modalidade || 'individual', itens: itens } : null;
    }).filter(Boolean);
  }
  function descricaoAjuste(pessoas) {
    if (!pessoas) return 'Quantidades de referência: 20 pessoas (4 grupos de 5).';
    return 'Quantidades ajustadas para ' + pessoas + ' pessoa' + (pessoas > 1 ? 's' : '') + ' (' + grupos(pessoas) + ' grupo' + (grupos(pessoas) > 1 ? 's' : '') + ' nos testes em grupo). Referência do banco: 20 pessoas em 4 grupos de 5.';
  }
  function rotuloModalidade(g, pessoas) {
    if (g.modalidade === 'grupo') return 'Em grupo' + (pessoas ? ' · ' + grupos(pessoas) + ' grupo' + (grupos(pessoas) > 1 ? 's' : '') : ' · 4 grupos');
    return 'Individual · ' + (pessoas || REF_PESSOAS) + ' pessoas';
  }

  /* Lista impressa (A4 em pé) no padrão dos documentos, com faixa a 7 mm da borda */
  var CSS_MAT = '.dados{width:100%;font-size:11.5px;margin:4px 0}.dados td{padding:2px 0}.nota{font-size:10px;color:#666;margin:2px 0 6px}' +
    '.t{break-inside:avoid;margin-top:12px}.t h3{display:flex;justify-content:space-between;font-size:12.5px;margin:0 0 5px}.mod{font-weight:400;color:#555}' +
    'table.mt{width:100%;border-collapse:collapse}table.mt th,table.mt td{border:1px solid #bbb;padding:5px 6px;text-align:left;vertical-align:middle}table.mt th{background:#f1eeee;font-size:11px;text-align:center}' +
    'table.mt .ck{width:26px;text-align:center;font-size:14px}table.mt .q{width:15%}table.mt .c{width:20%}table.mt .obs{color:#555;font-size:10.5px}' +
    '.gerais{margin-top:14px;break-inside:avoid}.gerais div{border:1px solid #bbb;height:62px;margin-top:5px}.assm{margin-top:14px}';
  function secao(opcoes) {
    var tabelas = opcoes.grupos.map(function (g) {
      return '<section class="t"><h3><span>' + esc(g.teste) + '</span><span class="mod">' + esc(rotuloModalidade(g, opcoes.pessoas)) + '</span></h3>' +
        '<table class="mt"><thead><tr><th class="ck">☐</th><th>Material</th><th class="q">Quantidade</th><th class="c">Conferido por</th><th>Observações</th></tr></thead><tbody>' +
        g.itens.map(function (i) {
          return '<tr><td class="ck">☐</td><td>' + esc(i.nome) + '</td><td class="q"><b>' + esc(fmtQtd(i.qtd) + ' ' + i.unidade) + '</b></td><td class="c"></td><td class="obs">' + esc(ui.maiusculas([i.obs, i.fixa ? 'QUANTIDADE FIXA' : ''].filter(Boolean).join(' · '))) + '</td></tr>';
        }).join('') + '</tbody></table></section>';
    }).join('');
    var doc = window.CF.documentos;
    return '<section class="pg" style="height:auto;min-height:297mm"><div class="faixa"></div>' + doc.cabecalho('Lista de materiais para conferência') +
      '<h1>Materiais · ' + esc(opcoes.titulo) + '</h1>' +
      '<table class="dados"><tr><td><b>Turma:</b> ' + esc(opcoes.turma || '—') + '</td><td><b>Data:</b> ' + esc(opcoes.data || '—') + '</td></tr>' +
      '<tr><td><b>Separado por:</b> ______________________</td><td><b>Conferido por:</b> ______________________</td></tr></table>' +
      '<p class="nota">' + esc(descricaoAjuste(opcoes.pessoas)) + '</p>' + tabelas +
      '<div class="gerais"><b>Observações gerais</b><div></div></div><div class="assm">Assinatura do responsável: ______________________________</div>' +
      doc.rodape('Documento de uso interno · lista de materiais para conferência', 1, 1) + '</section>';
  }
  function imprimir(opcoes) { return window.CF.documentos.imprimir('Materiais · ' + opcoes.titulo, secao(opcoes), CSS_MAT); }

  window.CF.materiais = { fmtQtd: fmtQtd, calcular: calcular, grupos: grupos, lista: lista, descricaoAjuste: descricaoAjuste, rotuloModalidade: rotuloModalidade, imprimir: imprimir, secao: secao, CSS: CSS_MAT };
})();
