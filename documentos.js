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
    '@page{size:A4 portrait;margin:0}@page paisagem{size:A4 landscape;margin:0}*{box-sizing:border-box}' +
    'body{font-family:P,Arial,sans-serif;color:#222;margin:0;font-size:11.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.pg{position:relative;width:210mm;height:297mm;padding:13mm 14mm 26mm 21mm;background:#fff;page-break-after:always;break-after:page;overflow:hidden}.pg:last-child{page-break-after:auto;break-after:auto}' +
    '.pg.paisagem{page:paisagem;width:297mm;height:210mm;padding:9mm 12mm 20mm 21mm}' +
    '.faixa{position:absolute;left:7mm;top:7mm;bottom:7mm;width:3.2mm;background:#272323;border-right:1.3mm solid #ee7330}' +
    '.cab{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #272323;padding-bottom:8px}.cab img{height:36px}.cab div{text-align:right;font-size:10px;color:#555}' +
    'h1{font-size:17px;margin:12px 0 2px}.sub{font-size:10.5px;color:#555}' +
    '.box{border:1px solid #bbb;border-radius:6px;padding:9px 13px;margin-top:10px}' +
    '.lin{display:flex;gap:6px;align-items:flex-end;margin:8px 0}.lin span:first-child{white-space:nowrap}.lin .v{flex:1;border-bottom:1px solid #777;min-height:15px;padding:0 4px;font-weight:700}' +
    '.ck{display:inline-block;width:12px;height:12px;border:1.4px solid #333;margin:0 4px -2px 12px;text-align:center;font-size:10px;line-height:10px}' +
    '.ass{display:flex;gap:24px;margin-top:30px}.ass div{flex:1;text-align:center;border-top:1px solid #333;padding-top:4px;font-size:10.5px}.ass .d{flex:none;width:55mm}' +
    '.rod{position:absolute;left:21mm;right:14mm;bottom:9mm;font-size:9px;color:#555}.paisagem .rod{right:12mm;bottom:6mm}.rod .l{display:flex;justify-content:space-between}.rod .k{border-top:2px solid #ee7330;margin-top:4px;padding-top:4px;text-align:center}' +
    /* lista de presença */
    '.pr-cab{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:2px solid #272323;padding-bottom:7px}.pr-cab .logo-k{height:34px}.pr-cab h2{font-size:22px;margin:0;text-align:center}' +
    '.pr-cab .logo-e{justify-self:end;max-height:40px;max-width:130px;object-fit:contain}.pr-cab .nome-e{justify-self:end;border:1px solid #ccc;border-radius:6px;padding:8px 10px;font-weight:700;color:#b35a1f;font-size:12px}' +
    '.pr-tit{display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px}.pr-tit h1{font-size:16px;margin:0}.pr-dia{text-align:right;border:2px solid #272323;border-radius:8px;padding:4px 12px}.pr-dia b{font-size:14px}.pr-dia div{font-size:11px}' +
    'table.pr{width:100%;border-collapse:collapse;margin-top:7px}table.pr th,table.pr td{border:1px solid #bbb;padding:0 8px;height:26.5px}table.pr th{background:#f1eeee;height:22px;font-size:10.5px;text-align:center}' +
    'table.pr .n{width:32px;text-align:center}table.pr .nm{white-space:nowrap;font-size:12px}table.pr .c{width:88px;text-align:center;font:700 11px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em}table.pr .t{width:190px}table.pr .a{width:39%}' +
    /* crachás */
    '.pg.folha-cr{display:flex;align-items:center;justify-content:center;padding:0}.cr-grade{display:grid;grid-template-columns:repeat(2,94mm);grid-template-rows:repeat(4,59mm);column-gap:5mm;row-gap:4mm}' +
    '.cr{width:94mm;height:59mm;border:1px dashed #8f898b;display:flex;overflow:hidden;background:#fff}.cr.vazio{border-color:transparent}.cr .f1{width:5.8mm;background:#272323}.cr .f2{width:1.3mm;background:#ee7330}' +
    '.cr .cc{flex:1;display:flex;flex-direction:column;min-width:0}.cr .lg{display:flex;justify-content:space-between;align-items:center;padding:2.6mm 3.7mm 0}.cr .lg .k{width:35mm}.cr .lg .g{width:12mm;height:12mm}' +
    '.cr .nm{flex:1;display:flex;align-items:center;justify-content:center;padding:0 3.5mm;text-align:center}.cr .nm span{font-size:31px;line-height:1.05;font-weight:700;color:#272323}.cr .nm span.longo{font-size:26px}' +
    '.cr .rp{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:2mm;padding:0 2.6mm 2.1mm 3.7mm}.cr .cd{justify-self:start;white-space:nowrap;font:700 12.5px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;color:#272323;border:1.4px solid #272323;border-radius:5px;padding:1px 6px}' +
    '.cr .tm{font-size:10.5px;font-weight:700;color:#444;text-align:center;align-self:center;white-space:nowrap;word-spacing:.15em;letter-spacing:.02em;max-width:36mm;overflow:hidden;text-overflow:ellipsis}.cr .q{justify-self:end;width:12.2mm;height:12.2mm}.cr .q svg{width:100%;height:100%;display:block}' +
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
  function termos(info, itens, textos, soCorpo) {
    var G = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Prefiro não informar' };
    var total = itens.length;
    var corpo = itens.map(function (j, i) {
      var nasc = j.nascimento ? window.CF.datas.completa(j.nascimento) : '';
      return '<section class="pg"><div class="faixa"></div>' + cabecalho('Termo de consentimento') +
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
    return soCorpo ? corpo : imprimir('Termos de consentimento · ' + info.vaga, corpo);
  }

  /* ---------- Nome do crachá: primeiro nome + sobrenome; nomes iguais ganham mais um sobrenome ---------- */
  var LIGA = { DE: 1, DA: 1, DO: 1, DAS: 1, DOS: 1, E: 1 };
  function nomesCracha(itens) {
    var partes = itens.map(function (j) { return String(j.nome || '').trim().split(/\s+/); });
    var qtd = partes.map(function (p) { return Math.min(2, p.length); });
    function montar(p, n) { var r = [], i = 0; while (r.filter(function (x) { return !LIGA[x]; }).length < n && i < p.length) { r.push(p[i]); i++; } while (r.length && LIGA[r[r.length - 1]]) r.pop(); return r.join(' '); }
    for (var volta = 0; volta < 4; volta++) {
      var atual = partes.map(function (p, i) { return montar(p, qtd[i]); }), mudou = false;
      atual.forEach(function (n, i) { var iguais = atual.filter(function (x) { return x === n; }).length; if (iguais > 1 && qtd[i] < partes[i].length) { qtd[i]++; mudou = true; } });
      if (!mudou) break;
    }
    return itens.map(function (j, i) { var auto = montar(partes[i], qtd[i]); return { auto: auto, ajustado: qtd[i] > 2, final: (j.nome_cracha || auto) }; });
  }

  function qr(texto) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode(0, 'M'); q.addData(texto); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
  }

  /* ---------- Crachás: 8 por folha, começando numa posição (1 a 8) ---------- */
  function crachas(info, itens, opcoes) {
    opcoes = opcoes || {};
    var inicio = Math.max(1, Math.min(8, opcoes.inicio || 1)), comQR = opcoes.qr !== false;
    var nomes = nomesCracha(itens);
    var celulas = []; for (var v = 1; v < inicio; v++) celulas.push('<div class="cr vazio"></div>');
    itens.forEach(function (j, i) {
      var n = nomes[i].final;
      celulas.push('<div class="cr"><div class="f1"></div><div class="f2"></div><div class="cc"><div class="lg"><img class="k" src="assets/img/kolping_light.png" alt=""><img class="g" src="assets/img/gol_light.png" alt=""></div>' +
        '<div class="nm"><span class="' + (n.length > 18 ? 'longo' : '') + '">' + esc(n) + '</span></div>' +
        '<div class="rp"><span class="cd">' + esc(j.codigo || '') + '</span><span class="tm">' + esc(j.turmaCurta || '') + '</span>' + (comQR ? '<span class="q">' + qr(j.codigo || '') + '</span>' : '<span></span>') + '</div></div></div>');
    });
    var paginas = [];
    for (var k = 0; k < celulas.length; k += 8) paginas.push('<section class="pg folha-cr"><div class="cr-grade">' + celulas.slice(k, k + 8).join('') + '</div></section>');
    return paginas.join('');
  }

  /* ---------- Lista de presença: uma folha (deitada) por dia; 20 nomes por folha ---------- */
  function presenca(info, turma, itens) {
    var D = window.CF.datas, dias = turma.dias || [], paginas = [];
    var grupos = []; for (var k = 0; k < itens.length; k += 20) grupos.push(itens.slice(k, k + 20));
    if (!grupos.length) grupos.push([]);
    var logo = info.logoUrl ? '<img class="logo-e" src="' + esc(info.logoUrl) + '" alt="">' : '<span class="nome-e">' + esc(info.empresa) + '</span>';
    dias.forEach(function (dia, di) {
      grupos.forEach(function (g, gi) {
        var dt = D.data(dia), semana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][dt.getDay()];
        paginas.push('<section class="pg paisagem"><div class="faixa"></div>' +
          '<div class="pr-cab"><img class="logo-k" src="assets/img/kolping_light.png" alt="Kolping Estadual de São Paulo"><h2>Lista de presença</h2>' + logo + '</div>' +
          '<div class="pr-tit"><div><h1>' + esc(info.empresa + ' · ' + info.vaga + ' · ' + turma.nome) + '</h1><div class="sub">' + esc(info.processo) + ' · ' + itens.length + ' jove' + (itens.length === 1 ? 'm' : 'ns') + '</div></div>' +
            '<div class="pr-dia"><b>Dia ' + (di + 1) + ' de ' + dias.length + '</b><div>' + semana + ', ' + D.completa(dia) + (turma.horario ? ' · ' + esc(turma.horario.toLowerCase()) : '') + '</div></div></div>' +
          '<table class="pr"><thead><tr><th class="n">Nº</th><th>Nome</th><th class="c">Código</th><th class="t">Telefone</th><th class="a">Assinatura</th></tr></thead><tbody>' +
            g.map(function (j, i) { return '<tr><td class="n">' + (gi * 20 + i + 1) + '</td><td class="nm">' + esc(j.nome) + '</td><td class="c">' + esc(j.codigo || '') + '</td><td class="t"></td><td class="a"></td></tr>'; }).join('') + '</tbody></table>' +
          '<div class="rod"><div class="l"><span>Documento com dados pessoais · guardar em local seguro</span><span>Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' · Dia ' + (di + 1) + ' de ' + dias.length + (grupos.length > 1 ? ' · Folha ' + (gi + 1) + ' de ' + grupos.length : '') + '</span></div><div class="k">' + RODAPE_INST + '</div></div></section>');
      });
    });
    return paginas.join('');
  }

  window.CF.documentos = { BASE: BASE, imprimir: imprimir, cabecalho: cabecalho, rodape: rodape, termos: termos, crachas: crachas, presenca: presenca, nomesCracha: nomesCracha };
})();
