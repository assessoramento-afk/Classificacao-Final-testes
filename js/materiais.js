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

  /* Lista impressa: abre uma janela de impressão (A4, fundo branco) */
  function imprimir(opcoes) {
    var hoje = new Date().toLocaleDateString('pt-BR');
    var tabelas = opcoes.grupos.map(function (g) {
      return '<section class="t"><h3><span>' + esc(g.teste) + '</span><span class="mod">' + esc(rotuloModalidade(g, opcoes.pessoas)) + '</span></h3>' +
        '<table><thead><tr><th class="ck">☐</th><th>Material</th><th class="q">Quantidade</th><th class="c">Conferido por</th><th>Observações</th></tr></thead><tbody>' +
        g.itens.map(function (i) {
          return '<tr><td class="ck">☐</td><td>' + esc(i.nome) + '</td><td class="q"><b>' + esc(fmtQtd(i.qtd) + ' ' + i.unidade) + '</b></td><td class="c"></td><td class="obs">' + esc(ui.maiusculas([i.obs, i.fixa ? 'QUANTIDADE FIXA' : ''].filter(Boolean).join(' · '))) + '</td></tr>';
        }).join('') + '</tbody></table></section>';
    }).join('');
    var estilo = '@font-face{font-family:P;src:url(assets/fonts/poppins-regular.woff2)}@font-face{font-family:P;font-weight:700;src:url(assets/fonts/poppins-bold.woff2)}' +
      '@page{size:A4;margin:14mm 14mm 24mm 18mm}*{box-sizing:border-box}body{font-family:P,Arial,sans-serif;color:#222;margin:0;font-size:11.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.faixa{position:fixed;left:-18mm;top:-14mm;bottom:-24mm;width:5mm;background:#272323;border-right:1.4mm solid #ee7330}' +
      '.cab{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #272323;padding-bottom:8px}.cab img{height:36px}.cab div{text-align:right;font-size:10px;color:#555}' +
      'h1{font-size:18px;margin:12px 0 4px}.dados{width:100%;font-size:11.5px;margin:4px 0}.dados td{padding:2px 0;border:0}.nota{font-size:10px;color:#666;margin:2px 0 6px}' +
      '.t{break-inside:avoid;margin-top:14px}h3{display:flex;justify-content:space-between;font-size:12.5px;margin:0 0 5px}.mod{font-weight:400;color:#555}' +
      'table{width:100%;border-collapse:collapse}.t th,.t td{border:1px solid #bbb;padding:5px 6px;text-align:left;vertical-align:middle}.t th{background:#f1eeee;font-size:11px}' +
      '.ck{width:26px;text-align:center !important;font-size:14px}.q{width:15%}.c{width:20%}.obs{color:#555;font-size:10.5px}' +
      '.gerais{margin-top:16px;break-inside:avoid}.gerais div{border:1px solid #bbb;height:70px;margin-top:5px}.ass{margin-top:16px}' +
      '.rod{position:fixed;left:0;right:0;bottom:-18mm;font-size:9px;color:#555}.rod .l{display:flex;justify-content:space-between}.rod .k{border-top:2px solid #ee7330;margin-top:4px;padding-top:4px;text-align:center}' +
      '@media screen{body{background:#cfcaca;padding:20px}.folha{position:relative;max-width:794px;margin:0 auto;background:#fff;padding:36px 42px 90px 50px;min-height:1123px;box-shadow:0 6px 20px rgba(0,0,0,.2)}.faixa{position:absolute;left:0;top:0;bottom:0;width:10px;border-right-width:4px}.rod{position:absolute;left:50px;right:42px;bottom:22px}}' +
      '@page{@bottom-right{content:"Página " counter(page) " de " counter(pages);font-family:Arial;font-size:8px;color:#777}}';
    var corpo = '<div class="folha"><div class="faixa"></div>' +
      '<div class="cab"><img src="assets/img/kolping_light.png" alt="Kolping Estadual de São Paulo"><div>Projeto Gol Jovens Talentos<br>Lista de materiais para conferência</div></div>' +
      '<h1>Materiais · ' + esc(opcoes.titulo) + '</h1>' +
      '<table class="dados"><tr><td><b>Turma:</b> ' + esc(opcoes.turma || '—') + '</td><td><b>Data:</b> ' + esc(opcoes.data || '—') + '</td></tr>' +
      '<tr><td><b>Separado por:</b> ______________________</td><td><b>Conferido por:</b> ______________________</td></tr></table>' +
      '<p class="nota">' + esc(descricaoAjuste(opcoes.pessoas)) + '</p>' + tabelas +
      '<div class="gerais"><b>Observações gerais</b><div></div></div><div class="ass">Assinatura do responsável: ______________________________</div>' +
      '<div class="rod"><div class="l"><span>Documento de uso interno · lista de materiais para conferência</span><span>Gerado em ' + hoje + '</span></div>' +
      '<div class="k"><b>Kolping Estadual de São Paulo</b> · R. Rio Branco, 36 - Cohab II, Carapicuíba - SP, 06326-030 · Telefone: (11) 4183-6018</div></div></div>';
    try { localStorage.setItem('cf_impressao', JSON.stringify({ titulo: 'Materiais · ' + opcoes.titulo, estilo: estilo, corpo: corpo })); }
    catch (e) { ui.toast('Não foi possível preparar a impressão neste aparelho.', 'erro'); return null; }
    var w = window.open('imprimir.html', '_blank');
    if (!w) { ui.toast('O navegador bloqueou a janela de impressão. Permita janelas deste site e tente de novo.', 'erro'); return null; }
    return w;
  }

  window.CF.materiais = { fmtQtd: fmtQtd, calcular: calcular, grupos: grupos, lista: lista, descricaoAjuste: descricaoAjuste, rotuloModalidade: rotuloModalidade, imprimir: imprimir };
})();
