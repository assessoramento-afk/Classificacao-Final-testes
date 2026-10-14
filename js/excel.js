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

  /* ---------- Imagens desenhadas em canvas ---------- */
  function fotoRedonda(foto, iniciais) {
    var t = 300, cv = document.createElement('canvas'), cx; cv.width = cv.height = t; cx = cv.getContext('2d');
    return new Promise(function (ok) {
      function fim() {
        cx.lineWidth = 10; cx.strokeStyle = '#ffffff'; cx.beginPath(); cx.arc(t / 2, t / 2, t / 2 - 5, 0, Math.PI * 2); cx.stroke();
        ok(cv.toDataURL('image/png'));
      }
      cx.save(); cx.beginPath(); cx.arc(t / 2, t / 2, t / 2 - 5, 0, Math.PI * 2); cx.clip();
      if (foto) {
        var im = new Image(); im.onload = function () { cx.drawImage(im, 0, 0, t, t); cx.restore(); fim(); }; im.onerror = function () { cx.restore(); fim(); }; im.src = foto.url;
      } else {
        cx.fillStyle = '#4a3f3d'; cx.fillRect(0, 0, t, t);
        cx.fillStyle = '#efe3dd'; cx.font = 'bold 110px Poppins, Arial, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText(iniciais || '', t / 2, t / 2 + 6); cx.restore(); fim();
      }
    });
  }
  function anelImg(nota, corHex) {
    var t = 240, cv = document.createElement('canvas'), cx; cv.width = cv.height = t; cx = cv.getContext('2d');
    cx.lineWidth = 22; cx.lineCap = 'round';
    cx.strokeStyle = '#e6e1e0'; cx.beginPath(); cx.arc(t / 2, t / 2, 95, 0, Math.PI * 2); cx.stroke();
    if (nota != null) { cx.strokeStyle = '#' + corHex; cx.beginPath(); cx.arc(t / 2, t / 2, 95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(5, nota) / 5); cx.stroke(); }
    cx.fillStyle = '#272323'; cx.textAlign = 'center'; cx.font = 'bold 58px Poppins, Arial, sans-serif'; cx.fillText(n2(nota), t / 2, t / 2 + 12);
    cx.fillStyle = '#6f696a'; cx.font = '22px Poppins, Arial, sans-serif'; cx.fillText('nota final', t / 2, t / 2 + 46);
    return cv.toDataURL('image/png');
  }
  function desempenhoImg(itens) {   // radar + barras, como no PDF
    var W = 1180, H = 470, cv = document.createElement('canvas'), cx; cv.width = W; cv.height = H; cx = cv.getContext('2d');
    cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H);
    var n = itens.length, rcx = 335, rcy = 240, R = 150, muitos = n > 7;
    function pt(i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / n, r = R * v / 5; return [rcx + r * Math.cos(a), rcy + r * Math.sin(a)]; }
    function poli(vals) { cx.beginPath(); vals.forEach(function (v, i) { var p = pt(i, v); if (i) cx.lineTo(p[0], p[1]); else cx.moveTo(p[0], p[1]); }); cx.closePath(); }
    if (n >= 3) {
      cx.strokeStyle = '#dcd6d5'; cx.lineWidth = 1.5;
      [1, 2, 3, 4, 5].forEach(function (lv) { poli(itens.map(function () { return lv; })); cx.stroke(); });
      itens.forEach(function (x, i) { var p = pt(i, 5); cx.beginPath(); cx.moveTo(rcx, rcy); cx.lineTo(p[0], p[1]); cx.stroke(); });
      poli(itens.map(function (x) { return x.nota == null ? 0 : x.nota; })); cx.fillStyle = '#fbdcca'; cx.fill(); cx.strokeStyle = '#ee7330'; cx.lineWidth = 4; cx.stroke();
      cx.fillStyle = '#ee7330'; itens.forEach(function (x, i) { if (x.nota == null) return; var p = pt(i, x.nota); cx.beginPath(); cx.arc(p[0], p[1], 6, 0, Math.PI * 2); cx.fill(); });
      itens.forEach(function (x, i) {
        var p = pt(i, muitos ? 5.95 : 6.2), al = Math.abs(p[0] - rcx) < 10 ? 'center' : (p[0] > rcx ? 'left' : 'right');
        var nome = muitos && x.nome.length > 15 ? x.nome.slice(0, 14) + '…' : x.nome, yy = p[1] + (p[1] < rcy - R * 0.5 ? -8 : 4);
        cx.textAlign = al; cx.fillStyle = '#6f696a'; cx.font = '500 ' + (muitos ? 19 : 22) + 'px Poppins, Arial, sans-serif'; cx.fillText(nome, p[0], yy);
        cx.fillStyle = '#272323'; cx.font = 'bold ' + (muitos ? 22 : 25) + 'px Poppins, Arial, sans-serif'; cx.fillText(n2(x.nota), p[0], yy + (muitos ? 24 : 28));
      });
    }
    var bx = 680, bw = 400, passo = Math.min(56, (H - 30) / Math.max(1, n)), by = Math.max(20, (H - passo * n) / 2);
    itens.forEach(function (x, i) {
      var y = by + i * passo;
      cx.textAlign = 'left'; cx.fillStyle = '#6f696a'; cx.font = '500 21px Poppins, Arial, sans-serif'; cx.fillText(x.nome, bx, y + 18);
      cx.fillStyle = '#eeeae9'; rr(cx, bx, y + 28, bw, 13); cx.fill();
      if (x.nota != null) { cx.fillStyle = '#ee7330'; rr(cx, bx, y + 28, Math.max(13, bw * x.nota / 5), 13); cx.fill(); }
      cx.textAlign = 'right'; cx.fillStyle = '#272323'; cx.font = 'bold 27px Poppins, Arial, sans-serif'; cx.fillText(n2(x.nota), W - 10, y + 42);
    });
    return { url: cv.toDataURL('image/png'), w: W, h: H };
  }
  function rr(cx, x, y, w, h) { var r = h / 2; cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }

  /* ---------- Ficha ---------- */
  async function ficha(d) {
    if (!window.ExcelJS) throw new Error('Recurso de planilha indisponível. Recarregue a página.');
    var P = window.CF.pdf;
    var im = await Promise.all([P.imagem(d.fotoUrl, true), P.imagem(d.logoEmpresaUrl), P.imagem('assets/img/kolping_light.png'), P.imagem('assets/img/gol_light.png')]);
    var corHex = COR[d.situacao] || COR.desistencia, corTx = 'FF' + (COR_TX[d.situacao] || COR_TX.desistencia);

    var wb = new window.ExcelJS.Workbook();
    wb.creator = 'Classificação Final · Kolping Estadual de São Paulo'; wb.created = new Date();
    var ws = wb.addWorksheet('Ficha', {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
                   margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.6, header: 0.2, footer: 0.25 } },
      headerFooter: { oddFooter: '&L&7' + CONFIDENCIAL.replace(/&/g, '&&') + '&R&7Página &P de &N' }
    });
    // A faixa preta · B faixa laranja · C margem · D-E coluna lateral · F margem · G espaço · H-K conteúdo
    ws.columns = [{ width: 1.6 }, { width: 0.8 }, { width: 1.5 }, { width: 15 }, { width: 15 }, { width: 1.5 }, { width: 2 },
                  { width: 34 }, { width: 17 }, { width: 8 }, { width: 18 }];
    // Mesclagens: guardadas para acertar as bordas no fim (cada célula com a sua própria formatação)
    var mescladas = [];
    function mesclar(faixa) { ws.mergeCells(faixa); mescladas.push(faixa); }
    // Imagens: guardadas e ancoradas no fim, quando todas as alturas de linha já estão definidas.
    // Âncora de duas células (início e fim), o formato que todos os programas de planilha leem.
    var imagens = [];
    function img(dataUrl, tipo, col, offX, row, offY, w, h) { imagens.push({ url: dataUrl, tipo: tipo || 'png', col: col, offX: offX || 0, row: row, offY: offY || 0, w: Math.round(w), h: Math.round(h) }); }
    function pxColuna(i) { var w = ws.getColumn(i + 1).width || 8.43; return Math.round(w * 7 + 5); }
    function pxLinha(i) { var h = ws.getRow(i + 1).height || 15; return Math.round(h * 96 / 72); }
    function ancora(col, offX, row, offY) {
      while (offX >= pxColuna(col)) { offX -= pxColuna(col); col++; }
      while (offY >= pxLinha(row)) { offY -= pxLinha(row); row++; }
      return { nativeCol: col, nativeColOff: Math.round(offX * 9525), nativeRow: row, nativeRowOff: Math.round(offY * 9525) };
    }
    function aplicarImagens() {
      imagens.forEach(function (m) {
        var id = wb.addImage({ base64: m.url, extension: m.tipo });
        ws.addImage(id, { tl: ancora(m.col, m.offX, m.row, m.offY), br: ancora(m.col, m.offX + m.w, m.row, m.offY + m.h), editAs: 'oneCell' });
      });
    }
    function acertarMescladas() {
      mescladas.forEach(function (faixa) {
        var p = faixa.split(':'), a = ws.getCell(p[0]), z = ws.getCell(p[1]);
        var r1 = a.row, c1 = a.col, r2 = z.row, c2 = z.col, b = a.border || {}, fill = a.fill ? JSON.parse(JSON.stringify(a.fill)) : undefined;
        var mestre = JSON.parse(JSON.stringify(a.style || {}));
        for (var r = r1; r <= r2; r++) for (var c = c1; c <= c2; c++) {
          var bord = {};
          if (r === r1 && b.top) bord.top = b.top; if (r === r2 && b.bottom) bord.bottom = b.bottom;
          if (c === c1 && b.left) bord.left = b.left; if (c === c2 && b.right) bord.right = b.right;
          var st = (r === r1 && c === c1) ? JSON.parse(JSON.stringify(mestre)) : {};
          if (fill) st.fill = JSON.parse(JSON.stringify(fill));
          st.border = bord;
          ws.getCell(r, c).style = st;
        }
      });
    }
    // A coluna lateral e o conteúdo da direita dividem as mesmas linhas: cada linha fica com a maior altura pedida
    function alto(r, h) { var a = ws.getRow(r).height; if (!a || h > a) ws.getRow(r).height = h; }
    function caber(imgObj, wMax, hMax) { var k = Math.min(wMax / imgObj.w, hMax / imgObj.h); return [imgObj.w * k, imgObj.h * k]; }
    var LARG_COL = 220;   // largura da coluna lateral D:E em pixels (2 × 110)
    function offX(w) { return (LARG_COL - w) / 2; }   // centraliza na coluna lateral (a partir da coluna D)

    /* coluna lateral */
    var r = 1; alto(1, 8);
    r = 2; alto(2, 34);
    if (im[2]) { var k1 = caber(im[2], 150, 36); img(im[2].url, 'png', 3, offX(k1[0]), 1, (45 - k1[1]) / 2, k1[0], k1[1]); }
    // foto: linhas 4-10
    for (var i = 3; i <= 10; i++) alto(i, 16);
    var foto = await fotoRedonda(im[0], d.iniciais);
    img(foto, 'png', 3, offX(116), 3, 6, 116, 116);
    r = 11; alto(r, d.nome.length > 24 ? 46 : 32); mesclar('D11:E11');
    var c = ws.getCell('D11'); c.value = d.nome; fonte(c, 12, true); c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    r = 12; mesclar('D12:E12'); c = ws.getCell('D12'); c.value = d.codigo || ''; c.font = { name: 'Courier New', size: 11, bold: true, color: { argb: PRETO } }; c.alignment = { horizontal: 'center' };
    for (i = 13; i <= 18; i++) alto(i, 15);
    img(anelImg(d.nota, corHex), 'png', 3, offX(96), 12, 10, 96, 96);
    r = 20; alto(20, 22); mesclar('D20:E20'); c = ws.getCell('D20'); c.value = d.situacaoTxt; fonte(c, 12, true, corTx);
    c.alignment = { horizontal: 'center', vertical: 'middle' }; preencher(c, clarear(corHex, 0.82));
    c.border = { top: { style: 'thin', color: { argb: 'FF' + corHex } }, left: { style: 'thin', color: { argb: 'FF' + corHex } }, right: { style: 'thin', color: { argb: 'FF' + corHex } }, bottom: d.posicaoTxt ? undefined : { style: 'thin', color: { argb: 'FF' + corHex } } };
    if (d.posicaoTxt) {
      mesclar('D21:E21'); c = ws.getCell('D21'); c.value = d.posicaoTxt; fonte(c, 9, false, corTx); c.alignment = { horizontal: 'center', vertical: 'top' }; preencher(c, clarear(corHex, 0.82));
      c.border = { bottom: { style: 'thin', color: { argb: 'FF' + corHex } }, left: { style: 'thin', color: { argb: 'FF' + corHex } }, right: { style: 'thin', color: { argb: 'FF' + corHex } } };
    }
    r = 23;
    [['TURMA', d.turma], ['VAGA', d.vaga], ['EMPRESA', d.empresa], ['IDADE', d.idade != null ? d.idade + ' anos' : null], ['AVALIADOR RESPONSÁVEL', d.avaliador]].forEach(function (x) {
      if (!x[1]) return;
      mesclar('D' + r + ':E' + r); c = ws.getCell('D' + r); c.value = x[0]; fonte(c, 7.5, true, CINZA_CL); c.alignment = { vertical: 'bottom' }; alto(r, 15); r++;
      mesclar('D' + r + ':E' + r); c = ws.getCell('D' + r); c.value = String(x[1]); fonte(c, 10, true); c.alignment = { wrapText: true, vertical: 'top' };
      alto(r, String(x[1]).length > 26 ? 28 : 16); r++; alto(r, 6); r++;
    });
    var fimLateral = r;

    /* conteúdo da direita */
    var y = 2;
    mesclar('H2:K2'); c = ws.getCell('H2'); c.value = 'Ficha do candidato'; fonte(c, 18, true); c.alignment = { vertical: 'middle' };
    mesclar('H3:K3'); c = ws.getCell('H3'); c.value = d.processoTxt || ''; fonte(c, 9, false, CINZA); c.alignment = { wrapText: true, vertical: 'top' };
    alto(3, (d.processoTxt || '').length > 90 ? 26 : 15);
    ['H', 'I', 'J', 'K'].forEach(function (L) { ws.getCell(L + '3').border = { bottom: { style: 'medium', color: { argb: PRETO } } }; });
    y = 5;
    if (d.motivoTxt) {
      mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = d.motivoTxt; fonte(c, 10.5, true, corTx); preencher(c, clarear(corHex, 0.88));
      c.border = { left: { style: 'thick', color: { argb: 'FF' + corHex } } }; c.alignment = { vertical: 'middle', indent: 1 }; alto(y, 20); y++;
      if (d.motivoObs) {
        mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = d.motivoObs; fonte(c, 9.5); preencher(c, clarear(corHex, 0.88));
        c.border = { left: { style: 'thick', color: { argb: 'FF' + corHex } } }; c.alignment = { wrapText: true, vertical: 'top', indent: 1 }; alto(y, 14 * Math.ceil(d.motivoObs.length / 95) + 4); y++;
      }
      if (d.motivoPor) {
        mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = 'Aplicado por ' + d.motivoPor; fonte(c, 8, false, CINZA); preencher(c, clarear(corHex, 0.88));
        c.border = { left: { style: 'thick', color: { argb: 'FF' + corHex } } }; c.alignment = { indent: 1 }; y++;
      }
      y++;
    }
    mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = 'Desempenho por ' + (d.eixoTitulo === 'competência' ? 'competências' : (d.eixoTitulo === 'área' ? 'áreas' : d.eixoTitulo)); fonte(c, 12, true); alto(y, 20); y++;
    var dsp = desempenhoImg(d.itens || []), dW = 77 * 7.0, dH = dW * dsp.h / dsp.w, linhas = Math.ceil(dH / 20);
    for (i = 0; i < linhas; i++) alto(y + i, 20);
    img(dsp.url, 'png', 7, 0, y - 1, 0, dW, dH); y += linhas;
    mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y);
    c.value = { richText: [
      { text: 'Faixas do processo:  ', font: { name: FONTE, size: 8.5, color: { argb: CINZA } } },
      { text: '● ', font: { name: FONTE, size: 9, color: { argb: 'FF' + COR.aprovado } } }, { text: 'aprovado a partir de ' + n2(d.corteAprovado) + '     ', font: { name: FONTE, size: 8.5, color: { argb: CINZA } } },
      { text: '● ', font: { name: FONTE, size: 9, color: { argb: 'FF' + COR.backup } } }, { text: 'backup de ' + n2(d.corteBackup) + ' a ' + n2(d.corteAprovado - 0.01), font: { name: FONTE, size: 8.5, color: { argb: CINZA } } }] };
    ['H', 'I', 'J', 'K'].forEach(function (L) { ws.getCell(L + y).border = { top: { style: 'thin', color: { argb: LINHA } } }; });
    y += 2;

    // notas dos testes
    mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = 'Notas dos testes'; fonte(c, 12, true); alto(y, 20); y++;
    ['TESTE', 'ÁREA', 'NOTA', 'AVALIADOR'].forEach(function (t, k) {
      c = ws.getCell(y, 8 + k); c.value = t; fonte(c, 8, true, CINZA); preencher(c, 'FFF1EEEE'); c.alignment = { horizontal: k === 2 ? 'right' : 'left', vertical: 'middle', indent: k === 0 || k === 3 ? 1 : 0 };
    });
    alto(y, 17); y++;
    (d.testes || []).forEach(function (t) {
      var vals = [t.nome, t.area || '', t.nota == null ? '—' : Number(t.nota), t.avaliador || (t.nota == null ? 'não lançada' : '—')];
      vals.forEach(function (v, k) {
        c = ws.getCell(y, 8 + k); c.value = v;
        fonte(c, k === 2 ? 11 : 9.5, k === 0 || k === 2, k === 1 ? 'FF2C6C75' : (k === 3 && !t.avaliador ? CINZA_CL : PRETO));
        c.alignment = { horizontal: k === 2 ? 'right' : 'left', vertical: 'middle', wrapText: k === 0, indent: k === 0 || k === 3 ? 1 : 0 };
        if (k === 2 && typeof v === 'number') c.numFmt = '0.00';
        c.border = { bottom: { style: 'thin', color: { argb: 'FFEBE6E5' } } };
      });
      alto(y, t.nome.length > 36 ? 30 : 19); y++;
    });
    y++;

    // observações
    mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = 'Observações dos avaliadores'; fonte(c, 12, true); alto(y, 20); y++;
    var obs = d.observacoes || [];
    if (!obs.length) { mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = 'Nenhuma observação registrada.'; fonte(c, 9.5, false, CINZA); y++; }
    obs.forEach(function (o) {
      mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = (o.teste || '') + (o.autor ? ' · ' + o.autor : '');
      fonte(c, 7.5, true, CINZA); preencher(c, 'FFF7F4F3'); c.border = { left: { style: 'thick', color: { argb: LARANJA } } }; c.alignment = { indent: 1, vertical: 'bottom' }; alto(y, 15); y++;
      mesclar('H' + y + ':K' + y); c = ws.getCell('H' + y); c.value = o.texto || '';
      fonte(c, 9.5); preencher(c, 'FFF7F4F3'); c.border = { left: { style: 'thick', color: { argb: LARANJA } } }; c.alignment = { wrapText: true, vertical: 'top', indent: 1 };
      alto(y, 14 * Math.max(1, Math.ceil((o.texto || '').length / 92)) + 6); y++;
      alto(y, 6); y++;
    });

    /* logos da coluna lateral, no fim da coluna */
    var ult = Math.max(y, fimLateral + 9) + 1;
    if (im[1]) {
      mesclar('D' + (ult - 8) + ':E' + (ult - 8)); c = ws.getCell('D' + (ult - 8)); c.value = 'EMPRESA'; fonte(c, 7.5, true, CINZA_CL); c.alignment = { horizontal: 'center' };
      var k2 = caber(im[1], 140, 44); img(im[1].url, 'png', 3, offX(k2[0]), ult - 8, 2, k2[0], k2[1]);
    }
    if (im[3]) { var k3 = caber(im[3], 140, 46); img(im[3].url, 'png', 3, offX(k3[0]), ult - 5, 6, k3[0], k3[1]); }
    // fundo da coluna lateral e faixas, até a última linha
    for (i = 1; i <= ult; i++) {
      preencher(ws.getCell(i, 1), PRETO); preencher(ws.getCell(i, 2), LARANJA);
      [3, 4, 5, 6].forEach(function (k) { var cc = ws.getCell(i, k); if (!cc.fill || cc.fill.fgColor === undefined || k === 3 || k === 6) preencher(cc, COL); });
      if (!ws.getRow(i).height) alto(i, 15);
    }
    // rodapé institucional
    var rf = ult + 2;
    mesclar('D' + rf + ':K' + rf); c = ws.getCell('D' + rf); c.value = CONFIDENCIAL; fonte(c, 8, false, CINZA);
    rf++;
    mesclar('D' + rf + ':K' + rf); c = ws.getCell('D' + rf);
    c.value = { richText: [{ text: 'Kolping Estadual de São Paulo', font: { name: FONTE, size: 8.5, bold: true, color: { argb: CINZA } } }, { text: INST.slice('Kolping Estadual de São Paulo'.length), font: { name: FONTE, size: 8.5, color: { argb: CINZA } } }] };
    c.alignment = { horizontal: 'center' }; c.border = { top: { style: 'medium', color: { argb: LARANJA } } };
    ws.getCell('D' + rf).border = { top: { style: 'medium', color: { argb: LARANJA } } };
    acertarMescladas();
    aplicarImagens();
    ws.pageSetup.printArea = 'A1:K' + rf;

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
