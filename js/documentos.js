/* =====================================================================
   Classificação Final · documentos.js
   Base dos documentos impressos (A4, faixa preta e laranja, logo e
   rodapé institucional) e o termo de consentimento (1 página por jovem).
   A impressão acontece na página própria imprimir.html.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc;
  var RODAPE_INST = '<b>Kolping Estadual de São Paulo</b> · R. Rio Branco, 36 - Cohab II, Carapicuíba - SP, 06326-030 · Telefone: (11) 4183-6018';

  var BASE = '@font-face{font-family:P;src:url(assets/fonts/poppins-regular.woff2)}@font-face{font-family:P;font-weight:700;src:url(assets/fonts/poppins-bold.woff2)}' +
    '@page{size:A4;margin:0}*{box-sizing:border-box}body{font-family:P,Arial,sans-serif;color:#222;margin:0;font-size:11.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.pg{position:relative;width:210mm;min-height:297mm;padding:13mm 14mm 26mm 20mm;background:#fff;page-break-after:always;break-after:page;overflow:hidden}.pg:last-child{page-break-after:auto;break-after:auto}' +
    '.pg::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5mm;background:#272323;border-right:1.4mm solid #ee7330}' +
    '.cab{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #272323;padding-bottom:8px}.cab img{height:36px}.cab div{text-align:right;font-size:10px;color:#555}' +
    'h1{font-size:17px;margin:12px 0 2px}.sub{font-size:10.5px;color:#555}' +
    '.box{border:1px solid #bbb;border-radius:6px;padding:9px 13px;margin-top:10px}' +
    '.lin{display:flex;gap:6px;align-items:flex-end;margin:8px 0}.lin span:first-child{white-space:nowrap}.lin .v{flex:1;border-bottom:1px solid #777;min-height:15px;padding:0 4px;font-weight:700}' +
    '.ck{display:inline-block;width:12px;height:12px;border:1.4px solid #333;margin:0 4px -2px 12px;text-align:center;font-size:10px;line-height:10px}' +
    '.ass{display:flex;gap:24px;margin-top:30px}.ass div{flex:1;text-align:center;border-top:1px solid #333;padding-top:4px;font-size:10.5px}.ass .d{flex:none;width:55mm}' +
    '.rod{position:absolute;left:20mm;right:14mm;bottom:9mm;font-size:9px;color:#555}.rod .l{display:flex;justify-content:space-between}.rod .k{border-top:2px solid #ee7330;margin-top:4px;padding-top:4px;text-align:center}' +
    '@media screen{body{background:#cfcaca;padding:16px}.pg{margin:0 auto 16px;box-shadow:0 6px 20px rgba(0,0,0,.2)}}';

  function rodape(tipo, total, i) {
    return '<div class="rod"><div class="l"><span>' + esc(tipo) + '</span><span>Gerado em ' + new Date().toLocaleDateString('pt-BR') + (total > 1 ? ' · Página ' + i + ' de ' + total : ' · Página 1 de 1') + '</span></div><div class="k">' + RODAPE_INST + '</div></div>';
  }
  function cabecalho(tipo) {
    return '<div class="cab"><img src="assets/img/kolping_light.png" alt="Kolping Estadual de São Paulo"><div>Projeto Gol Jovens Talentos<br>' + esc(tipo) + '</div></div>';
  }
  function imprimir(titulo, corpo, estiloExtra) {
    try { localStorage.setItem('cf_impressao', JSON.stringify({ titulo: titulo, estilo: BASE + (estiloExtra || ''), corpo: corpo })); }
    catch (e) { ui.toast('Não foi possível preparar a impressão neste aparelho.', 'erro'); return null; }
    var w = window.open('imprimir.html', '_blank');
    if (!w) ui.toast('O navegador bloqueou a janela de impressão. Permita janelas deste site e tente de novo.', 'erro');
    return w;
  }
  function trocar(texto, v) { return esc(texto).replace(/\{(empresa|vaga|processo)\}/g, function (m, k) { return '<b>' + esc(v[k] || '') + '</b>'; }); }

  /* Termo de consentimento: itens = [{ nome, codigo, turma, dias, genero, nascimento, telefone, responsavel_nome, responsavel_parentesco }] */
  function termos(info, itens, textos) {
    var G = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Prefiro não informar' };
    var total = itens.length;
    var corpo = itens.map(function (j, i) {
      var nasc = j.nascimento ? window.CF.datas.completa(j.nascimento) : '';
      return '<section class="pg">' + cabecalho('Termo de consentimento') +
        '<h1>Termo de consentimento para uso de dados e imagem</h1>' +
        '<div class="sub">Processo seletivo: <b>' + esc(info.empresa + ' · ' + info.vaga) + '</b> · ' + esc(info.processo) + ' · ' + esc(j.turma || '') + (j.dias ? ' · ' + esc(j.dias) : '') +
          ' · Código: <b>' + esc(j.codigo || '') + '</b></div>' +
        '<div class="box"><b>Dados do(a) jovem</b> <span style="color:#777;font-size:10px">(confira e complete com letra de forma)</span>' +
          '<div class="lin"><span>Nome completo:</span><span class="v">' + esc(j.nome || '') + '</span></div>' +
          '<div style="display:flex;gap:20px"><div class="lin" style="flex:1"><span>Data de nascimento:</span><span class="v">' + esc(nasc) + '</span></div><div class="lin" style="flex:1"><span>Telefone:</span><span class="v">' + esc(j.telefone || '') + '</span></div></div>' +
          '<div style="margin:8px 0">Gênero:' + Object.keys(G).map(function (k) { return '<span class="ck">' + (j.genero === k ? '✓' : '') + '</span>' + G[k]; }).join('') + '</div></div>' +
        '<div class="box" style="line-height:1.65;text-align:justify"><b>Autorização</b><br>' + trocar(textos.jovem, info) + '</div>' +
        '<div class="ass"><div>Assinatura do(a) jovem</div><div class="d">Data</div></div>' +
        '<div class="box" style="margin-top:22px"><b>Para menores de 18 anos · responsável legal</b>' +
          '<div class="lin"><span>Nome do responsável:</span><span class="v">' + esc(j.responsavel_nome || '') + '</span></div>' +
          '<div style="display:flex;gap:20px"><div class="lin" style="flex:1"><span>Parentesco:</span><span class="v">' + esc(j.responsavel_parentesco || '') + '</span></div><div class="lin" style="flex:1"><span>Documento (RG ou CPF):</span><span class="v"></span></div></div>' +
          '<div style="font-size:10.5px;margin-top:6px;text-align:justify">' + trocar(textos.responsavel, info) + '</div>' +
          '<div class="ass"><div>Assinatura do(a) responsável</div><div class="d">Data</div></div></div>' +
        rodape('Documento com dados pessoais · guardar em local seguro', total, i + 1) + '</section>';
    }).join('');
    return imprimir('Termos de consentimento · ' + info.vaga, corpo);
  }

  window.CF.documentos = { BASE: BASE, imprimir: imprimir, cabecalho: cabecalho, rodape: rodape, termos: termos };
})();
