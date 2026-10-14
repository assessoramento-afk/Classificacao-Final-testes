/* =====================================================================
   Classificação Final · pdf.js
   Gera os PDFs como arquivo, direto no navegador (biblioteca jsPDF).
   Base comum: A4, faixa lateral preta e laranja, fonte Poppins e rodapé
   institucional. Documento desta etapa: ficha do candidato (modelo D,
   coluna lateral). A função desenharFicha também será usada no PDF do
   processo (todas as fichas em um arquivo).
   ===================================================================== */
(function () {
  'use strict';
  var PRETO = '#272323', LARANJA = '#ee7330', CINZA = '#6f696a', CINZA_CL = '#a7a1a2', LINHA = '#dcd6d5', FUNDO_COL = '#f4f1f0';
  var COR = { aprovado: '#3FA66B', backup: '#E9B500', reprovado: '#D9534F', desistencia: '#8a8486', incompleto: '#5b6b8a' };
  var COR_TX = { aprovado: '#1f6b40', backup: '#7a5e00', reprovado: '#a5302c', desistencia: '#5f5a5b', incompleto: '#3d4a63' };
  var INST = 'Kolping Estadual de São Paulo · R. Rio Branco, 36 - Cohab II, Carapicuíba - SP, 06326-030 · Telefone: (11) 4183-6018';
  var CONFIDENCIAL = 'Documento confidencial · uso restrito à empresa e à Kolping Estadual de São Paulo, exclusivamente para este processo seletivo.';

  /* ---------- Carregamento (com cache) ---------- */
  var cacheFonte = null, cacheImg = {};
  function paraBase64(buf) {
    var b = new Uint8Array(buf), s = '', passo = 0x8000;
    for (var i = 0; i < b.length; i += passo) s += String.fromCharCode.apply(null, b.subarray(i, i + passo));
    return btoa(s);
  }
  async function fontes() {
    if (cacheFonte) return cacheFonte;
    var nomes = ['regular', 'medium', 'bold'];
    var r = await Promise.all(nomes.map(function (n) {
      return fetch('assets/fonts/poppins-' + n + '.ttf').then(function (x) { if (!x.ok) throw new Error('Fonte não encontrada'); return x.arrayBuffer(); });
    }));
    cacheFonte = { regular: paraBase64(r[0]), medium: paraBase64(r[1]), bold: paraBase64(r[2]) };
    return cacheFonte;
  }
  // Carrega imagem e devolve { url (dataURL PNG/JPEG), w, h }. quadrado=true recorta ao centro (foto).
  function imagem(src, quadrado) {
    if (!src) return Promise.resolve(null);
    var chave = src + (quadrado ? '#q' : '');
    if (cacheImg[chave]) return Promise.resolve(cacheImg[chave]);
    return new Promise(function (ok) {
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas'), cx;
          if (quadrado) {
            var lado = Math.min(w, h), alvo = Math.min(lado, 500);
            cv.width = cv.height = alvo; cx = cv.getContext('2d');
            cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, alvo, alvo);
            cx.drawImage(im, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, alvo, alvo);
            cacheImg[chave] = { url: cv.toDataURL('image/jpeg', 0.9), w: alvo, h: alvo, tipo: 'JPEG' };
          } else {
            var esc = Math.min(1, 900 / Math.max(w, h));
            cv.width = Math.round(w * esc); cv.height = Math.round(h * esc); cx = cv.getContext('2d');
            cx.drawImage(im, 0, 0, cv.width, cv.height);
            cacheImg[chave] = { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height, tipo: 'PNG' };
          }
          ok(cacheImg[chave]);
        } catch (e) { ok(null); }
      };
      im.onerror = function () { ok(null); };
      im.src = src;
    });
  }

  /* ---------- Documento e utilidades ---------- */
  async function novo() {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Recurso de PDF indisponível. Recarregue a página.');
    var f = await fontes();
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.addFileToVFS('Poppins-Regular.ttf', f.regular); doc.addFont('Poppins-Regular.ttf', 'P', 'normal');
    doc.addFileToVFS('Poppins-Medium.ttf', f.medium); doc.addFont('Poppins-Medium.ttf', 'PM', 'normal');
    doc.addFileToVFS('Poppins-Bold.ttf', f.bold); doc.addFont('Poppins-Bold.ttf', 'P', 'bold');
    doc.setFont('P', 'normal');
    doc.setLineHeightFactor(1.25);
    return doc;
  }
  function fonte(doc, peso, tam, cor) {
    if (peso === 'medio') doc.setFont('PM', 'normal'); else doc.setFont('P', peso === 'b' ? 'bold' : 'normal');
    doc.setFontSize(tam); doc.setTextColor(cor || PRETO);
  }
  function n2(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ','); }
  function faixa(doc) {
    var h = doc.internal.pageSize.getHeight();
    doc.setFillColor(PRETO); doc.rect(7, 7, 3.2, h - 14, 'F');
    doc.setFillColor(LARANJA); doc.rect(10.2, 7, 1.3, h - 14, 'F');
  }
  function rodape(doc, tipo, pag, total, confidencial) {
    var w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight(), x0 = 21, x1 = w - 14;
    var y = h - 15;
    if (confidencial) { fonte(doc, 'n', 6.6, CINZA); doc.text(CONFIDENCIAL, x0, y - 4.2); }
    fonte(doc, 'n', 7.2, CINZA);
    doc.text(tipo, x0, y);
    doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' · Página ' + pag + ' de ' + total, x1, y, { align: 'right' });
    doc.setDrawColor(LARANJA); doc.setLineWidth(0.6); doc.line(x0, y + 2, x1, y + 2);
    var nome = 'Kolping Estadual de São Paulo', resto = INST.slice(nome.length);
    fonte(doc, 'b', 7, CINZA); var wn = doc.getTextWidth(nome);
    fonte(doc, 'n', 7, CINZA); var wr = doc.getTextWidth(resto), xi = (x0 + x1) / 2 - (wn + wr) / 2;
    fonte(doc, 'b', 7, CINZA); doc.text(nome, xi, y + 6);
    fonte(doc, 'n', 7, CINZA); doc.text(resto, xi + wn, y + 6);
  }
  function imgCaber(doc, im, x, y, wMax, hMax, alinhar) {
    if (!im) return 0;
    var r = Math.min(wMax / im.w, hMax / im.h), w = im.w * r, h = im.h * r;
    var xx = alinhar === 'centro' ? x + (wMax - w) / 2 : (alinhar === 'direita' ? x + wMax - w : x);
    doc.addImage(im.url, im.tipo || 'PNG', xx, y + (hMax - h) / 2, w, h, undefined, 'FAST');
    return w;
  }
  function arco(doc, cx, cy, r, ini, fim, larg, cor) {   // ângulos em graus, 0 = topo, sentido horário
    doc.setDrawColor(cor); doc.setLineWidth(larg); doc.setLineCap('round');
    var passos = Math.max(2, Math.ceil(Math.abs(fim - ini) / 4)), pts = [];
    for (var i = 0; i <= passos; i++) { var a = (ini + (fim - ini) * i / passos - 90) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    var d = []; for (var k = 1; k < pts.length; k++) d.push([pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]]);
    doc.lines(d, pts[0][0], pts[0][1], [1, 1], 'S', false);
    doc.setLineCap('butt');
  }
  function anel(doc, cx, cy, r, nota, cor) {
    arco(doc, cx, cy, r, 0, 359.9, 3.4, '#e6e1e0');
    if (nota != null) arco(doc, cx, cy, r, 0, Math.max(2, 360 * Math.min(5, nota) / 5), 3.4, cor);
    fonte(doc, 'b', 19, PRETO); doc.text(n2(nota), cx, cy + 2.2, { align: 'center' });
    fonte(doc, 'n', 7, CINZA); doc.text('nota final', cx, cy + 6.8, { align: 'center' });
  }
  function radar(doc, cx, cy, R, itens) {
    var n = itens.length; if (n < 3) return;
    function pt(i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / n, r = R * v / 5; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function poli(vals, estilo) {
      var p = vals.map(function (v, i) { return pt(i, v); }), d = [];
      for (var k = 1; k < p.length; k++) d.push([p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]]);
      doc.lines(d, p[0][0], p[0][1], [1, 1], estilo, true);
    }
    doc.setLineWidth(0.2); doc.setDrawColor(LINHA);
    [1, 2, 3, 4, 5].forEach(function (lv) { poli(itens.map(function () { return lv; }), 'S'); });
    itens.forEach(function (x, i) { var p = pt(i, 5); doc.line(cx, cy, p[0], p[1]); });
    if (itens.some(function (x) { return x.nota != null; })) {
      doc.setFillColor('#fbdcca'); doc.setDrawColor(LARANJA); doc.setLineWidth(0.6);
      poli(itens.map(function (x) { return x.nota == null ? 0 : x.nota; }), 'FD');
      doc.setFillColor(LARANJA);
      itens.forEach(function (x, i) { if (x.nota == null) return; var p = pt(i, x.nota); doc.circle(p[0], p[1], 0.75, 'F'); });
    }
    var muitos = n > 7;
    itens.forEach(function (x, i) {
      var p = pt(i, muitos ? 5.95 : 6.2), al = Math.abs(p[0] - cx) < 2 ? 'center' : (p[0] > cx ? 'left' : 'right');
      var nome = muitos && x.nome.length > 15 ? x.nome.slice(0, 14) + '…' : x.nome;
      var yy = p[1] + (p[1] < cy - R * 0.5 ? -1.4 : 0.6);
      fonte(doc, 'medio', muitos ? 5.4 : 6.4, CINZA); doc.text(nome, p[0], yy, { align: al });
      fonte(doc, 'b', muitos ? 6.4 : 7.4, PRETO); doc.text(n2(x.nota), p[0], yy + (muitos ? 2.7 : 3.1), { align: al });
    });
  }

  /* ---------- Ficha do candidato (modelo D) ----------
     d = { nome, codigo, idade, turma, vaga, empresa, avaliador, nota, situacao, situacaoTxt, posicaoTxt,
           motivoTxt, motivoObs, motivoPor, eixoTitulo, itens:[{nome,nota}], testes:[{nome,area,nota,avaliador}],
           observacoes:[{teste,autor,texto}], corteAprovado, corteBackup, processoTxt,
           foto (imagem), logoEmpresa (imagem), logoKolping (imagem), logoGol (imagem) }
     Desenha a partir da página atual (primeira = nova página já existente). Devolve as páginas usadas. */
  function desenharFicha(doc, d) {
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    var paginas = [doc.getCurrentPageInfo().pageNumber];
    var cor = COR[d.situacao] || COR.desistencia, corTx = COR_TX[d.situacao] || COR_TX.desistencia;
    var LIM = H - 30;  // limite antes do rodapé

    /* coluna lateral */
    var cx0 = 14, cw = 56, cmid = cx0 + cw / 2;
    faixa(doc);
    doc.setFillColor(FUNDO_COL); doc.rect(cx0, 7, cw, H - 14 - 20, 'F');
    var y = 13;
    imgCaber(doc, d.logoKolping, cx0 + 8, y, cw - 16, 9, 'centro'); y += 15;
    // foto
    var rf = 17;
    if (d.foto) {
      doc.saveGraphicsState(); doc.circle(cmid, y + rf, rf, null); doc.clip(); doc.discardPath();
      doc.addImage(d.foto.url, 'JPEG', cmid - rf, y, rf * 2, rf * 2, undefined, 'FAST');
      doc.restoreGraphicsState();
    } else {
      doc.setFillColor('#4a3f3d'); doc.circle(cmid, y + rf, rf, 'F');
      fonte(doc, 'b', 22, '#efe3dd'); doc.text(d.iniciais || '', cmid, y + rf + 3, { align: 'center' });
    }
    doc.setDrawColor('#ffffff'); doc.setLineWidth(1); doc.circle(cmid, y + rf, rf, 'S');
    y += rf * 2 + 7;
    fonte(doc, 'b', 11.5, PRETO);
    var ln = doc.splitTextToSize(d.nome, cw - 8); doc.text(ln, cmid, y, { align: 'center' }); y += ln.length * 4.8;
    doc.setFont('courier', 'bold'); doc.setFontSize(10); doc.setTextColor(PRETO); doc.text(d.codigo || '', cmid, y + 0.6, { align: 'center' }); y += 6;
    anel(doc, cmid, y + 15, 13, d.nota, cor); y += 33;
    // situação
    doc.setFillColor(clarear(cor, 0.82)); doc.setDrawColor(cor); doc.setLineWidth(0.35);
    doc.roundedRect(cx0 + 5, y, cw - 10, d.posicaoTxt ? 12.5 : 8.5, 2, 2, 'FD');
    fonte(doc, 'b', 9.5, corTx); doc.text(d.situacaoTxt, cmid, y + 5.4, { align: 'center' });
    if (d.posicaoTxt) { fonte(doc, 'medio', 7.3, corTx); doc.text(d.posicaoTxt, cmid, y + 9.6, { align: 'center' }); }
    y += (d.posicaoTxt ? 12.5 : 8.5) + 6;
    // dados
    [['TURMA', d.turma], ['VAGA', d.vaga], ['EMPRESA', d.empresa], ['IDADE', d.idade != null ? d.idade + ' anos' : null], ['AVALIADOR RESPONSÁVEL', d.avaliador]]
      .forEach(function (x) {
        if (!x[1]) return;
        fonte(doc, 'b', 5.8, CINZA_CL); doc.text(x[0], cx0 + 6, y);
        fonte(doc, 'b', 8, PRETO); var l = doc.splitTextToSize(String(x[1]), cw - 12); doc.text(l, cx0 + 6, y + 3.6);
        y += 3.6 + l.length * 3.5 + 2.6;
      });
    // logos de baixo
    var yb = H - 14 - 20 - 26;
    if (d.logoEmpresa) {
      fonte(doc, 'b', 5.6, CINZA_CL); doc.text('EMPRESA', cmid, yb - 1.5, { align: 'center' });
      imgCaber(doc, d.logoEmpresa, cx0 + 8, yb, cw - 16, 12, 'centro');
    }
    imgCaber(doc, d.logoGol, cx0 + 8, yb + 14, cw - 16, 11, 'centro');

    /* conteúdo da direita */
    var x0 = cx0 + cw + 7, x1 = W - 14, wd = x1 - x0;
    y = 15;
    fonte(doc, 'b', 15, PRETO); doc.text('Ficha do candidato', x0, y);
    fonte(doc, 'n', 8, CINZA); var lp = doc.splitTextToSize(d.processoTxt || '', wd); doc.text(lp, x0, y + 5);
    y += 5 + lp.length * 3.5; doc.setDrawColor(PRETO); doc.setLineWidth(0.5); doc.line(x0, y, x1, y); y += 6;

    function titulo(t) { fonte(doc, 'b', 10, PRETO); doc.text(t, x0, y); y += 4.5; }
    function garantir(alt, repetirTitulo) {
      if (y + alt <= LIM) return;
      doc.addPage(); paginas.push(doc.getCurrentPageInfo().pageNumber); faixa(doc);
      x0 = 21; x1 = W - 14; wd = x1 - x0; y = 16;
      fonte(doc, 'b', 9, CINZA); doc.text(d.nome + ' · ' + (d.codigo || '') + ' · continuação', x0, y); y += 3;
      doc.setDrawColor(LINHA); doc.setLineWidth(0.3); doc.line(x0, y, x1, y); y += 6;
      if (repetirTitulo) titulo(repetirTitulo);
    }

    // motivo
    if (d.motivoTxt) {
      fonte(doc, 'n', 8, PRETO);
      var lo = d.motivoObs ? doc.splitTextToSize(d.motivoObs, wd - 10) : [];
      var alt = 9 + lo.length * 3.6 + (d.motivoPor ? 4 : 0);
      doc.setFillColor(clarear(cor, 0.88)); doc.rect(x0, y, wd, alt, 'F');
      doc.setFillColor(cor); doc.rect(x0, y, 1.4, alt, 'F');
      fonte(doc, 'b', 9, corTx); doc.text(d.motivoTxt, x0 + 5, y + 5.5);
      if (lo.length) { fonte(doc, 'n', 8, PRETO); doc.text(lo, x0 + 5, y + 10); }
      if (d.motivoPor) { fonte(doc, 'n', 6.8, CINZA); doc.text('Aplicado por ' + d.motivoPor, x0 + 5, y + alt - 2); }
      y += alt + 6;
    }

    // desempenho: radar + barras
    titulo('Desempenho por ' + d.eixoTitulo);
    var muitosItens = d.itens.length > 7, rr = muitosItens ? 19 : 20, rcx = x0 + (muitosItens ? 34 : 31), rcy = y + rr + 7;
    radar(doc, rcx, rcy, rr, d.itens);
    var bx = x0 + 78, bw = x1 - bx, by = y + 3;
    var passo = 7;
    d.itens.forEach(function (x, i) {
      var yy = by + i * passo;
      fonte(doc, 'medio', 6.4, CINZA); doc.text(doc.splitTextToSize(x.nome, bw - 12)[0], bx, yy + 2);
      doc.setFillColor('#eeeae9'); doc.roundedRect(bx, yy + 3.2, bw - 12, 1.8, 0.9, 0.9, 'F');
      if (x.nota != null) { doc.setFillColor(LARANJA); doc.roundedRect(bx, yy + 3.2, Math.max(1.8, (bw - 12) * x.nota / 5), 1.8, 0.9, 0.9, 'F'); }
      fonte(doc, 'b', 8, PRETO); doc.text(n2(x.nota), x1, yy + 4.9, { align: 'right' });
    });
    y = Math.max(rcy + rr + 9, by + d.itens.length * passo + 3);
    // faixas
    doc.setDrawColor(LINHA); doc.setLineWidth(0.25); doc.line(x0, y, x1, y); y += 4.2;
    fonte(doc, 'n', 7, CINZA); doc.text('Faixas do processo:', x0, y);
    var fx = x0 + doc.getTextWidth('Faixas do processo:') + 3;
    doc.setFillColor(COR.aprovado); doc.circle(fx + 1, y - 1, 1, 'F');
    var t1 = 'aprovado a partir de ' + n2(d.corteAprovado); doc.text(t1, fx + 3, y); fx += doc.getTextWidth(t1) + 6;
    doc.setFillColor(COR.backup); doc.circle(fx + 1, y - 1, 1, 'F');
    doc.text('backup de ' + n2(d.corteBackup) + ' a ' + n2(d.corteAprovado - 0.01), fx + 3, y);
    y += 8;

    // notas dos testes
    garantir(20); titulo('Notas dos testes');
    var cT = x0, cA = x0 + wd * 0.45, cN = x0 + wd * 0.76, cV = x0 + wd * 0.8;
    function cabTabela() {
      doc.setFillColor('#f1eeee'); doc.rect(x0, y - 3.4, wd, 5.4, 'F');
      fonte(doc, 'b', 6.2, CINZA); doc.text('TESTE', cT + 1.5, y); doc.text('ÁREA', cA, y); doc.text('NOTA', cN, y, { align: 'right' }); doc.text('AVALIADOR', cV, y);
      y += 5.5;
    }
    cabTabela();
    (d.testes || []).forEach(function (t) {
      fonte(doc, 'b', 7.6, PRETO);
      var l = doc.splitTextToSize(t.nome, cA - cT - 4), alt = Math.max(6.2, l.length * 3.3 + 2.9);
      if (y + alt > LIM) { garantir(alt + 10, 'Notas dos testes (continuação)'); cabTabela(); }
      fonte(doc, 'b', 7.6, PRETO); doc.text(l, cT + 1.5, y);
      fonte(doc, 'medio', 7, '#2c6c75'); doc.text(doc.splitTextToSize(t.area || '', cN - cA - 12)[0], cA, y);
      fonte(doc, 'b', 9, PRETO); doc.text(t.nota == null ? '—' : n2(t.nota), cN, y + 0.2, { align: 'right' });
      fonte(doc, 'n', 7, t.avaliador ? PRETO : CINZA_CL); doc.text(doc.splitTextToSize(t.avaliador || (t.nota == null ? 'não lançada' : '—'), x1 - cV)[0], cV, y);
      y += alt - 2.6; doc.setDrawColor('#ebe6e5'); doc.setLineWidth(0.2); doc.line(x0, y, x1, y); y += 4.6;
    });
    y += 3;

    // observações
    var obs = d.observacoes || [];
    garantir(16); titulo('Observações dos avaliadores');
    if (!obs.length) { fonte(doc, 'n', 7.6, CINZA); doc.text('Nenhuma observação registrada.', x0, y + 1); y += 6; }
    obs.forEach(function (o) {
      fonte(doc, 'n', 7.8, PRETO);
      var l = doc.splitTextToSize(o.texto || '', wd - 8), alt = 8 + l.length * 3.5, wAntes = wd;
      garantir(alt + 2, 'Observações dos avaliadores (continuação)');
      if (wd !== wAntes) { fonte(doc, 'n', 7.8, PRETO); l = doc.splitTextToSize(o.texto || '', wd - 8); alt = 8 + l.length * 3.5; }
      doc.setFillColor('#f7f4f3'); doc.rect(x0, y - 1, wd, alt, 'F');
      doc.setFillColor(LARANJA); doc.rect(x0, y - 1, 0.9, alt, 'F');
      fonte(doc, 'b', 6, CINZA); doc.text((o.teste || '') + (o.autor ? ' · ' + o.autor : ''), x0 + 4, y + 3);
      fonte(doc, 'n', 7.8, PRETO); doc.text(l, x0 + 4, y + 7.2);
      y += alt + 2.5;
    });
    return paginas;
  }
  function clarear(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.round(c + (255 - c) * f); }
    return '#' + [m(r), m(g), m(b)].map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('');
  }

  /* ---------- Documento: ficha avulsa ---------- */
  async function ficha(d) {
    var doc = await novo();
    var r = await Promise.all([imagem(d.fotoUrl, true), imagem(d.logoEmpresaUrl), imagem('assets/img/kolping_light.png'), imagem('assets/img/gol_light.png')]);
    d.foto = r[0]; d.logoEmpresa = r[1]; d.logoKolping = r[2]; d.logoGol = r[3];
    var pags = desenharFicha(doc, d);
    pags.forEach(function (p, i) { doc.setPage(p); rodape(doc, 'Ficha do candidato · Projeto Gol Jovens Talentos', i + 1, pags.length, true); });
    doc.setProperties({ title: 'Ficha · ' + d.nome, subject: 'Projeto Gol Jovens Talentos', author: 'Kolping Estadual de São Paulo', creator: 'Classificação Final' });
    return doc.output('blob');
  }
  function nomeArquivo(partes, ext) {
    return partes.filter(Boolean).join(' - ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ._-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) + '.' + ext;
  }
  function baixar(blob, nome) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  window.CF = window.CF || {};
  window.CF.pdf = { novo: novo, faixa: faixa, rodape: rodape, imagem: imagem, desenharFicha: desenharFicha, ficha: ficha, baixar: baixar, nomeArquivo: nomeArquivo, COR: COR };
})();
