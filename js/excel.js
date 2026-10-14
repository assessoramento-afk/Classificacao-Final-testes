/* =====================================================================
   Classificação Final · excel.js
   Planilhas formatadas (biblioteca ExcelJS), no mesmo visual dos PDFs.
   Ficha do candidato: aba "Ficha" (modelo D: coluna lateral, foto,
   nota, gráfico, testes e observações) e aba "Dados" (uma linha com
   todos os números, para arquivo e consolidação).
   Usa os mesmos dados (d) do CF.pdf.ficha.
   ===================================================================== */
(function () {
  'use strict';
  var PRETO = 'FF272323', LARANJA = 'FFEE7330', CINZA = 'FF6F696A', CINZA_CL = 'FFA7A1A2', COL = 'FFF4F1F0', LINHA = 'FFE2DCDC';
  var COR = { aprovado: '3FA66B', backup: 'E9B500', reprovado: 'D9534F', desistencia: '8A8486', incompleto: '5B6B8A' };
  var COR_TX = { aprovado: '1F6B40', backup: '7A5E00', reprovado: 'A5302C', desistencia: '5F5A5B', incompleto: '3D4A63' };
  var FONTE = 'Calibri';
  var INST = 'Kolping Estadual de São Paulo · R. Rio Branco, 36 - Cohab II, Carapicuíba - SP, 06326-030 · Telefone: (11) 4183-6018';
  var CONFIDENCIAL = 'Documento confidencial · uso restrito à empresa e à Kolping Estadual de São Paulo, exclusivamente para este processo seletivo.';

  function clarear(hex, f) {
    var n = parseInt(hex, 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.round(c + (255 - c) * f); }
    return 'FF' + [m(r), m(g), m(b)].map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('').toUpperCase();
  }
  function n2(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ','); }
  function preencher(c, argb) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb } }; }
  function fonte(c, tam, neg, cor, extra) { c.font = Object.assign({ name: FONTE, size: tam, bold: !!neg, color: { argb: cor || PRETO } }, extra || {}); }

  /* ---------- Imagens desenhadas em canvas (mesmo visual do PDF) ---------- */
  var FT = 'Poppins, Arial, sans-serif';
  function canvas(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  function arred(cx, x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function fotoRetrato(foto, iniciais) {   // 34 × 42,5 mm, cantos arredondados
    var w = 340, h = 425, cv = canvas(w, h), cx = cv.getContext('2d');
    return new Promise(function (ok) {
      cx.save(); arred(cx, 0, 0, w, h, 24); cx.clip();
      function fim() { cx.restore(); ok(cv.toDataURL('image/png')); }
      if (foto) { var im = new Image(); im.onload = function () { cx.drawImage(im, 0, 0, w, h); fim(); }; im.onerror = fim; im.src = foto.url; }
      else { cx.fillStyle = '#4a4242'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#a49b9b'; cx.font = 'bold 110px ' + FT; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(iniciais || 'FOTO', w / 2, h / 2 + 6); fim(); }
    });
  }
  function anelEscuro(nota, corHex) {
    var t = 280, cv = canvas(t, t), cx = cv.getContext('2d');
    cx.lineWidth = 30; cx.lineCap = 'round';
    cx.strokeStyle = '#4a4242'; cx.beginPath(); cx.arc(t / 2, t / 2, 112, 0, Math.PI * 2); cx.stroke();
    if (nota != null) { cx.strokeStyle = '#' + corHex; cx.beginPath(); cx.arc(t / 2, t / 2, 112, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(5, nota) / 5); cx.stroke(); }
    cx.fillStyle = '#ffffff'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = 'bold 76px ' + FT; cx.fillText(n2(nota), t / 2, t / 2 + 4);
    return cv.toDataURL('image/png');
  }
  function pilula(texto, corHex) {
    var cv = canvas(10, 10), cx = cv.getContext('2d'); cx.font = 'bold 34px ' + FT;
    var tw = cx.measureText(texto).width, w = Math.ceil(tw + 70), h = 64;
    cv = canvas(w, h); cx = cv.getContext('2d');
    cx.fillStyle = '#' + corHex; arred(cx, 0, 0, w, h, 32); cx.fill();
    cx.fillStyle = '#ffffff'; cx.font = 'bold 34px ' + FT; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(texto, w / 2, h / 2 + 2);
    return { url: cv.toDataURL('image/png'), w: w / 2.4, h: h / 2.4 };
  }
  function caixaEmpresa(logo, nome) {   // moldura arredondada com logo ou nome em laranja
    var w = 320, h = 122, cv = canvas(w, h), cx = cv.getContext('2d');
    cx.fillStyle = '#ffffff'; arred(cx, 2, 2, w - 4, h - 4, 18); cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#d3cdcc'; cx.stroke();
    return new Promise(function (ok) {
      if (logo) {
        var im = new Image(); im.onload = function () { var k = Math.min((w - 40) / im.width, (h - 30) / im.height); cx.drawImage(im, (w - im.width * k) / 2, (h - im.height * k) / 2, im.width * k, im.height * k); ok(cv.toDataURL('image/png')); };
        im.onerror = function () { ok(cv.toDataURL('image/png')); }; im.src = logo.url; return;
      }
      cx.fillStyle = '#b4501a'; cx.font = 'bold 30px ' + FT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      var palavras = String(nome || '').toUpperCase().split(/\s+/), linhas = [], at = '';
      palavras.forEach(function (p) { var t = at ? at + ' ' + p : p; if (cx.measureText(t).width > w - 40 && at) { linhas.push(at); at = p; } else at = t; });
      if (at) linhas.push(at); linhas = linhas.slice(0, 3);
      linhas.forEach(function (l, i) { cx.fillText(l, w / 2, h / 2 + (i - (linhas.length - 1) / 2) * 34); });
      ok(cv.toDataURL('image/png'));
    });
  }
  function radarImg(itens, corHex) {
    var W = 660, H = 520, cv = canvas(W, H), cx = cv.getContext('2d');
    cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H);
    var n = itens.length, rcx = W / 2, rcy = H / 2 + 10, R = 165, cor = '#' + corHex;
    if (n < 3) return { url: cv.toDataURL('image/png'), w: W, h: H };
    function pt(i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / n, r = R * v / 5; return [rcx + r * Math.cos(a), rcy + r * Math.sin(a)]; }
    function poli(vals) { cx.beginPath(); vals.forEach(function (v, i) { var p = pt(i, v); if (i) cx.lineTo(p[0], p[1]); else cx.moveTo(p[0], p[1]); }); cx.closePath(); }
    cx.strokeStyle = '#dedad9'; cx.lineWidth = 2;
    [1, 2, 3, 4, 5].forEach(function (lv) { poli(itens.map(function () { return lv; })); cx.stroke(); });
    cx.setLineDash([6, 6]); cx.strokeStyle = '#9a9495';
    itens.forEach(function (x, i) { var p = pt(i, 5); cx.beginPath(); cx.moveTo(rcx, rcy); cx.lineTo(p[0], p[1]); cx.stroke(); });
    cx.setLineDash([]);
    poli(itens.map(function (x) { return x.nota == null ? 0 : x.nota; }));
    var c = parseInt(corHex, 16); cx.fillStyle = 'rgba(' + (c >> 16) + ',' + ((c >> 8) & 255) + ',' + (c & 255) + ',0.2)'; cx.fill();
    cx.strokeStyle = cor; cx.lineWidth = 5; cx.stroke();
    cx.fillStyle = cor; itens.forEach(function (x, i) { if (x.nota == null) return; var p = pt(i, x.nota); cx.beginPath(); cx.arc(p[0], p[1], 6.5, 0, Math.PI * 2); cx.fill(); });
    var muitos = n > 6;
    cx.fillStyle = '#272323'; cx.font = 'bold ' + (muitos ? 19 : 22) + 'px ' + FT;
    itens.forEach(function (x, i) {
      var p = pt(i, 5.55), al = Math.abs(p[0] - rcx) < 10 ? 'center' : (p[0] > rcx ? 'left' : 'right');
      var yy = p[1] + (p[1] < rcy - R * 0.6 ? -8 : (p[1] > rcy + R * 0.6 ? 22 : 8));
      var nome = muitos && x.nome.length > 16 ? x.nome.slice(0, 15) + '…' : x.nome, txt = nome + ' ' + n1(x.nota);
      var livre = al === 'left' ? W - 8 - p[0] : (al === 'right' ? p[0] - 8 : W);
      cx.textAlign = al;
      if (cx.measureText(txt).width <= livre) { cx.fillText(txt, p[0], yy); return; }
      cx.fillText(nome.length > 14 && cx.measureText(nome).width > livre ? nome.slice(0, 13) + '…' : nome, p[0], yy - 12); cx.fillText(n1(x.nota), p[0], yy + 13);
    });
    return { url: cv.toDataURL('image/png'), w: W, h: H };
  }
  function n1(v) { return v == null ? '—' : Number(v).toFixed(1).replace('.', ','); }

  /* ---------- Ficha (modelo aprovado: coluna lateral escura) ---------- */
  async function ficha(d) {
    if (!window.ExcelJS) throw new Error('Recurso de planilha indisponível. Recarregue a página.');
    var P = window.CF.pdf;
    var im = await Promise.all([P.imagem(d.fotoUrl, 0.8), P.imagem(d.logoEmpresaUrl), P.imagem('assets/img/kolping_light.png')]);
    var corHex = COR[d.situacao] || COR.desistencia, desist = d.situacao === 'desistencia';
    var BRANCO = 'FFFFFFFF', CINZA_ESC = 'FF9D9596';

    var wb = new window.ExcelJS.Workbook();
    wb.creator = 'Classificação Final · Kolping Estadual de São Paulo'; wb.created = new Date();
    var ws = wb.addWorksheet('Ficha', {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
                   margins: { left: 0.2, right: 0.25, top: 0.25, bottom: 0.45, header: 0.15, footer: 0.2 } },
      headerFooter: { oddFooter: '&L&7Ficha do candidato&R&7Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' · Página &P de &N' }
    });
    // A-F coluna escura (B = linha laranja) · G espaço · H-I cartão do gráfico · J espaço · K-L cartão da lista
    ws.columns = [{ width: 1.6 }, { width: 0.8 }, { width: 1.5 }, { width: 15 }, { width: 15 }, { width: 1.5 }, { width: 2.5 },
                  { width: 28 }, { width: 18 }, { width: 1.2 }, { width: 28 }, { width: 7 }];
    var mescladas = [], imagens = [];
    function mesclar(faixa) { ws.mergeCells(faixa); mescladas.push(faixa); }
    function alto(r, h) { var a = ws.getRow(r).height; if (!a || h > a) ws.getRow(r).height = h; }
    function img(url, col, offX, row, offY, w, h) { imagens.push({ url: url, col: col, offX: offX || 0, row: row, offY: offY || 0, w: Math.round(w), h: Math.round(h) }); }
    function pxColuna(i) { var w = ws.getColumn(i + 1).width || 8.43; return Math.round(w * 7 + 5); }
    function pxLinha(i) { var h = ws.getRow(i + 1).height || 15; return Math.round(h * 96 / 72); }
    function ancora(col, offX, row, offY) {
      while (offX >= pxColuna(col)) { offX -= pxColuna(col); col++; }
      while (offY >= pxLinha(row)) { offY -= pxLinha(row); row++; }
      return { nativeCol: col, nativeColOff: Math.round(offX * 9525), nativeRow: row, nativeRowOff: Math.round(offY * 9525) };
    }
    var LAT = pxColuna(3) + pxColuna(4);   // largura de D:E em pixels
    function centroLat(w) { return (LAT - w) / 2; }
    function cel(ref, valor, tam, neg, cor, alin) { var c = ws.getCell(ref); c.value = valor; fonte(c, tam, neg, cor); if (alin) c.alignment = alin; return c; }

    /* ----- coluna escura ----- */
    alto(1, 10);
    for (var i = 2; i <= 10; i++) alto(i, 16.5);              // foto
    img(await fotoRetrato(im[0], d.iniciais), 3, centroLat(128), 1, 6, 128, 160);
    alto(11, 8);
    mesclar('D12:E12'); alto(12, d.nome.length > 22 ? 34 : 20);
    cel('D12', d.nome, 12, true, BRANCO, { horizontal: 'center', vertical: 'middle', wrapText: true });
    var r = 13;
    if (!desist) { for (i = 13; i <= 18; i++) alto(i, 15); img(anelEscuro(d.nota, corHex), 3, centroLat(100), 12, 8, 100, 100); r = 19; }
    alto(r, 20); var pl = pilula(String(d.situacaoTxt || '').toUpperCase(), corHex); img(pl.url, 3, centroLat(pl.w), r - 1, 3, pl.w, pl.h); r++;
    if (d.classificadosTxt) { mesclar('D' + r + ':E' + r); cel('D' + r, d.classificadosTxt, 9, false, 'FFCFC8C8', { horizontal: 'center', vertical: 'middle' }); alto(r, 16); r++; }
    alto(r, 10); r++;
    [['Código', d.codigo], ['Turma', d.turmaTxt || d.turma], ['Vaga', d.vaga], ['Empresa', d.empresa]].forEach(function (x) {
      if (!x[1]) return;
      mesclar('D' + r + ':E' + r); cel('D' + r, x[0], 8, false, CINZA_ESC, { vertical: 'bottom' }); alto(r, 14); r++;
      mesclar('D' + r + ':E' + r); cel('D' + r, String(x[1]), 9, true, BRANCO, { vertical: 'top', wrapText: true }); alto(r, String(x[1]).length > 30 ? 26 : 15); r++;
      alto(r, 5); r++;
    });
    var fimLateral = r;

    /* ----- conteúdo da direita ----- */
    alto(2, 30);
    if (im[2]) { var kl = Math.min(150 / im[2].w, 34 / im[2].h); img(im[2].url, 7, 0, 1, 6, im[2].w * kl, im[2].h * kl); }
    mesclar('I2:J2'); cel('I2', 'Ficha do candidato · Projeto Gol Jovens Talentos', 8.5, false, CINZA, { horizontal: 'center', vertical: 'middle', wrapText: true });
    img(await caixaEmpresa(im[1], d.empresa), 10, pxColuna(10) + pxColuna(11) - 128, 1, 4, 128, 49);
    ['H', 'I', 'J', 'K', 'L'].forEach(function (L) { ws.getCell(L + '2').border = { bottom: { style: 'medium', color: { argb: PRETO } } }; });
    var y = 4; alto(3, 8);
    var molduras = [];   // [r1, c1, r2, c2, cor, fundo]

    function cartaoTexto(titulo, partes, borda, fundo) {   // partes: richText ou texto
      mesclar('H' + y + ':L' + y); cel('H' + y, titulo, 10, true, PRETO, { vertical: 'bottom', indent: 1 }); alto(y, 20);
      var ini = y; y++;
      partes.forEach(function (pt) {
        mesclar('H' + y + ':L' + y); var c = ws.getCell('H' + y);
        c.value = pt.rich ? { richText: pt.rich } : pt.texto; if (!pt.rich) fonte(c, 9.5, false, PRETO);
        c.alignment = { wrapText: true, vertical: 'top', indent: 1 };
        alto(y, 14 * Math.max(1, Math.ceil(pt.tam / 95)) + 5); y++;
      });
      alto(y, 6); molduras.push([ini, 8, y, 12, borda, fundo]); y += 2; alto(y - 1, 8);
    }

    if (desist) cartaoTexto('Situação', [{ texto: d.desistenciaTxt || 'Desistiu do processo seletivo.', tam: (d.desistenciaTxt || '').length }]);
    if (!desist || !d.semNotas) {
      // cartões lado a lado: gráfico (H:I) e lista (K:L)
      mesclar('H' + y + ':I' + y); cel('H' + y, 'Desempenho por ' + d.eixoTitulo, 10, true, PRETO, { vertical: 'bottom', indent: 1 }); alto(y, 20);
      mesclar('K' + y + ':L' + y); cel('K' + y, d.lista ? d.lista.titulo : '', 10, true, PRETO, { vertical: 'bottom', indent: 1 });
      var ini = y; y++;
      var lista = (d.lista && d.lista.itens) || [], yl = y;
      lista.forEach(function (x) {
        var c1 = cel('K' + yl, x.nome, 8.5, false, PRETO, { vertical: 'middle', wrapText: true, indent: 1 });
        var c2 = cel('L' + yl, x.nota == null ? '—' : Number(Number(x.nota).toFixed(1)), 9.5, true, PRETO, { horizontal: 'right', vertical: 'middle', indent: 1 });
        if (x.nota != null) c2.numFmt = '0.0';
        [c1, c2].forEach(function (cc) { cc.border = { bottom: { style: 'thin', color: { argb: 'FFE3DEDD' } } }; });
        alto(yl, x.nome.length > 30 ? 26 : 17); yl++;
      });
      var rd = radarImg(d.itens || [], corHex), rw = pxColuna(7) + pxColuna(8) - 16, rh = rw * rd.h / rd.w;
      // linhas suficientes para o gráfico, contando a altura real de cada linha (a lista pode ter deixado linhas mais altas)
      var acum = 0, ry = y; while (acum < rh + 10) { alto(ry, 15); acum += pxLinha(ry - 1); ry++; }
      var fimBloco = Math.max(yl, ry);
      img(rd.url, 7, 8, y - 1, 4, rw, rh);
      molduras.push([ini, 8, fimBloco, 9]); molduras.push([ini, 11, fimBloco, 12]);
      y = fimBloco + 2; alto(y - 1, 8);
    }
    if (d.motivoTxt && !desist) {
      var pm = [{ texto: d.motivoTxt, tam: d.motivoTxt.length }];
      if (d.motivoObs) pm.push({ texto: d.motivoObs, tam: d.motivoObs.length });
      cartaoTexto('Motivo', pm, 'FF' + COR.reprovado, 'FFFDF1F1');
    }
    var obs = d.observacoes || [];
    if (obs.length) cartaoTexto('Observações dos avaliadores', obs.map(function (o) {
      var rot = (o.autor || '') + (o.data ? ', ' + o.data : '') + ': ';
      return { rich: [{ text: rot, font: { name: FONTE, size: 9.5, bold: true, color: { argb: PRETO } } }, { text: o.texto || '', font: { name: FONTE, size: 9.5, color: { argb: PRETO } } }], tam: rot.length + (o.texto || '').length };
    }));
    if (d.avaliadorTxt) cartaoTexto('Avaliador responsável', [{ texto: d.avaliadorTxt, tam: d.avaliadorTxt.length }]);
    mesclar('H' + y + ':L' + y); var cc = cel('H' + y, 'Documento confidencial. Dados compartilhados com autorização do candidato, para uso exclusivo neste processo seletivo.', 8, false, CINZA, { wrapText: true, vertical: 'top' });
    cc.font.italic = true; alto(y, 26); y++;

    /* ----- fim: fundo escuro, rodapé, mesclagens, molduras e imagens ----- */
    var ult = Math.max(y + 1, fimLateral + 1);
    for (i = 1; i <= ult; i++) {
      [1, 3, 4, 5, 6].forEach(function (k) { var c = ws.getCell(i, k); c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRETO } }; });
      ws.getCell(i, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LARANJA } };
      if (!ws.getRow(i).height) alto(i, 15);
    }
    var rf = ult - 1;
    mesclar('H' + rf + ':L' + rf); var cr = ws.getCell('H' + rf);
    cr.value = { richText: [{ text: 'Kolping Estadual de São Paulo', font: { name: FONTE, size: 8, bold: true, color: { argb: CINZA } } }, { text: INST.slice('Kolping Estadual de São Paulo'.length), font: { name: FONTE, size: 8, color: { argb: CINZA } } }] };
    cr.alignment = { horizontal: 'center', vertical: 'middle' }; cr.border = { top: { style: 'medium', color: { argb: LARANJA } } }; alto(rf, 22);

    // mesclagens: cada célula com a própria formatação (evita bordas repetidas)
    mescladas.forEach(function (faixa) {
      var p = faixa.split(':'), a = ws.getCell(p[0]), z = ws.getCell(p[1]), b = a.border || {}, fill = a.fill ? JSON.parse(JSON.stringify(a.fill)) : undefined;
      var mestre = JSON.parse(JSON.stringify(a.style || {}));
      for (var rr = a.row; rr <= z.row; rr++) for (var c = a.col; c <= z.col; c++) {
        var bord = {};
        if (rr === a.row && b.top) bord.top = b.top; if (rr === z.row && b.bottom) bord.bottom = b.bottom;
        if (c === a.col && b.left) bord.left = b.left; if (c === z.col && b.right) bord.right = b.right;
        var st = (rr === a.row && c === a.col) ? JSON.parse(JSON.stringify(mestre)) : {};
        if (fill) st.fill = JSON.parse(JSON.stringify(fill)); st.border = bord;
        ws.getCell(rr, c).style = st;
      }
    });
    // molduras dos cartões (borda fina em volta, fundo opcional)
    molduras.forEach(function (m) {
      var cor = { style: 'thin', color: { argb: m[4] || 'FFD9D3D2' } };
      for (var rr = m[0]; rr <= m[2]; rr++) for (var c = m[1]; c <= m[3]; c++) {
        var cel2 = ws.getCell(rr, c), b0 = JSON.parse(JSON.stringify(cel2.border || {}));
        if (rr === m[0]) b0.top = cor; if (rr === m[2]) b0.bottom = cor; if (c === m[1]) b0.left = cor; if (c === m[3]) b0.right = cor;
        var st = JSON.parse(JSON.stringify(cel2.style || {})); st.border = b0;
        if (m[5]) st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m[5] } };
        cel2.style = st;
      }
    });
    imagens.forEach(function (m) {
      var id = wb.addImage({ base64: m.url, extension: 'png' });
      ws.addImage(id, { tl: ancora(m.col, m.offX, m.row, m.offY), br: ancora(m.col, m.offX + m.w, m.row, m.offY + m.h), editAs: 'oneCell' });
    });
    ws.pageSetup.printArea = 'A1:L' + ult;

    /* aba Dados: uma linha com tudo */
    var wd = wb.addWorksheet('Dados', { views: [{ state: 'frozen', ySplit: 1 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 } });
    var cab = ['Código', 'Nome', 'Turma', 'Vaga', 'Empresa', 'Idade', 'Avaliador responsável', 'Nota final', 'Situação', 'Posição', 'Motivo', 'Observação do motivo'];
    var lin = [d.codigo, d.nome, d.turma, d.vaga, d.empresa, d.idade, d.avaliador, d.nota == null ? null : Number(Number(d.nota).toFixed(3)), d.situacaoTxt, d.posicaoTxt, d.motivoTxt, d.motivoObs];
    (d.areas || []).forEach(function (a) { cab.push('Área · ' + a.nome); lin.push(a.nota == null ? null : Number(a.nota)); });
    (d.competencias || []).forEach(function (a) { cab.push('Competência · ' + a.nome); lin.push(a.nota == null ? null : Number(a.nota)); });
    (d.testes || []).forEach(function (t) { cab.push('Teste · ' + t.nome); lin.push(t.nota == null ? null : Number(t.nota)); cab.push('Avaliador · ' + t.nome); lin.push(t.avaliador || null); });
    wd.addRow(cab); wd.addRow(lin);
    wd.getRow(1).eachCell(function (cc) { fonte(cc, 10, true, 'FFFFFFFF'); preencher(cc, PRETO); cc.alignment = { vertical: 'middle', wrapText: true }; });
    wd.getRow(1).height = 32;
    wd.columns.forEach(function (col, k) { col.width = k === 1 ? 34 : (k < 12 ? 18 : 16); });
    wd.getRow(2).eachCell(function (cc) { if (typeof cc.value === 'number') cc.numFmt = '0.00'; });

    var buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  window.CF = window.CF || {};
  window.CF.excel = { ficha: ficha };
})();
