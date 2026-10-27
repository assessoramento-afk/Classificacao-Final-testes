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
  var PRETO = '#272323', LARANJA = '#ee7330', CINZA = '#6f696a', CINZA_CL = '#a7a1a2', LINHA = '#dcd6d5';
  var COR = { aprovado: '#3FA66B', backup: '#E9B500', reprovado: '#D9534F', desistencia: '#8a8486', incompleto: '#5b6b8a' };
  var COR_TX = { aprovado: '#1f6b40', backup: '#7a5e00', reprovado: '#a5302c', desistencia: '#5f5a5b', incompleto: '#3d4a63' };
  var INST = 'Kolping Estadual de São Paulo · R. Rio Branco, 36 - Cohab II, Carapicuíba - SP, 06326-030 · Telefone: (11) 4183-6018';

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
          if (quadrado) {   // recorte ao centro: true = quadrado; número = proporção largura/altura (0.8 = retrato)
            var prop = quadrado === true ? 1 : quadrado, rw = w, rh = w / prop;
            if (rh > h) { rh = h; rw = h * prop; }
            var aw = Math.min(Math.round(rw), 480), ah = Math.round(aw / prop);
            cv.width = aw; cv.height = ah; cx = cv.getContext('2d');
            cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, aw, ah);
            cx.drawImage(im, (w - rw) / 2, (h - rh) * 0.35, rw, rh, 0, 0, aw, ah);
            cacheImg[chave] = { url: cv.toDataURL('image/jpeg', 0.9), w: aw, h: ah, tipo: 'JPEG' };
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

  function imagemRetrato(src) { return imagem(src, 0.8); }

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
  function n1(v) { return v == null ? '—' : Number(v).toFixed(1).replace('.', ','); }
  function dataBR(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function clarear(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.round(c + (255 - c) * f); }
    return '#' + [m(r), m(g), m(b)].map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('');
  }
  function faixa(doc) {
    var h = doc.internal.pageSize.getHeight();
    doc.setFillColor(PRETO); doc.rect(7, 7, 2.6, h - 14, 'F');
    doc.setFillColor(LARANJA); doc.rect(9.6, 7, 1.1, h - 14, 'F');
  }
  /* Rodapé: rótulo à esquerda, data e página à direita, linha laranja e a linha institucional.
     x0 permite começar o rodapé depois da coluna escura da ficha. */
  function rodape(doc, rotulo, pag, total, x0) {
    var w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight(), x1 = w - 10;
    x0 = x0 || 21;
    var y = h - 16.5;
    fonte(doc, 'n', 6.8, CINZA); doc.text(rotulo, x0, y);
    doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' · Página ' + pag + ' de ' + total, x1, y, { align: 'right' });
    doc.setDrawColor(LARANJA); doc.setLineWidth(0.6); doc.line(x0, y + 2.2, x1, y + 2.2);
    var nome = 'Kolping Estadual de São Paulo', resto = INST.slice(nome.length), tam = 6.8;
    for (; tam > 5.4; tam -= 0.2) { fonte(doc, 'b', tam); var a = doc.getTextWidth(nome); fonte(doc, 'n', tam); if (a + doc.getTextWidth(resto) <= x1 - x0) break; }
    fonte(doc, 'b', tam, CINZA); var wn = doc.getTextWidth(nome);
    fonte(doc, 'n', tam, CINZA); var wr = doc.getTextWidth(resto), xi = (x0 + x1) / 2 - (wn + wr) / 2;
    fonte(doc, 'b', tam, CINZA); doc.text(nome, xi, y + 6.4);
    fonte(doc, 'n', tam, CINZA); doc.text(resto, xi + wn, y + 6.4);
  }
  function imgCaber(doc, im, x, y, wMax, hMax, alinhar) {
    if (!im) return 0;
    var r = Math.min(wMax / im.w, hMax / im.h), w = im.w * r, h = im.h * r;
    var xx = alinhar === 'centro' ? x + (wMax - w) / 2 : (alinhar === 'direita' ? x + wMax - w : x);
    doc.addImage(im.url, im.tipo || 'PNG', xx, y + (hMax - h) / 2, w, h, undefined, 'FAST');
    return w;
  }
  // Caixa da empresa: logo (se houver) ou o nome em laranja, dentro de uma moldura arredondada
  function caixaEmpresa(doc, im, nome, x, y, w, h) {
    doc.setDrawColor('#d3cdcc'); doc.setLineWidth(0.3); doc.setFillColor('#ffffff'); doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    if (im) { imgCaber(doc, im, x + 3, y + 2, w - 6, h - 4, 'centro'); return; }
    fonte(doc, 'b', 7.6, '#b4501a');
    var l = doc.splitTextToSize(String(nome || '').toUpperCase(), w - 8).slice(0, 3);
    var y0 = y + h / 2 - (l.length - 1) * 1.6 + 1;
    l.forEach(function (t, i) { doc.text(t, x + w / 2, y0 + i * 3.2, { align: 'center' }); });
  }
  function arco(doc, cx, cy, r, ini, fim, larg, cor) {
    doc.setDrawColor(cor); doc.setLineWidth(larg); doc.setLineCap('round');
    var passos = Math.max(2, Math.ceil(Math.abs(fim - ini) / 4)), pts = [];
    for (var i = 0; i <= passos; i++) { var a = (ini + (fim - ini) * i / passos - 90) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    var d = []; for (var k = 1; k < pts.length; k++) d.push([pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]]);
    doc.lines(d, pts[0][0], pts[0][1], [1, 1], 'S', false);
    doc.setLineCap('butt');
  }
  function radar(doc, cx, cy, R, itens, cor, xmin, xmax) {
    var n = itens.length; if (n < 3) return;
    function pt(i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / n, r = R * v / 5; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function poli(vals, estilo) {
      var p = vals.map(function (v, i) { return pt(i, v); }), d = [];
      for (var k = 1; k < p.length; k++) d.push([p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]]);
      doc.lines(d, p[0][0], p[0][1], [1, 1], estilo, true);
    }
    doc.setLineWidth(0.2); doc.setDrawColor('#dedad9');
    [1, 2, 3, 4, 5].forEach(function (lv) { poli(itens.map(function () { return lv; }), 'S'); });
    doc.setLineDashPattern([0.6, 0.6], 0); doc.setDrawColor('#9a9495');
    itens.forEach(function (x, i) { var p = pt(i, 5); doc.line(cx, cy, p[0], p[1]); });
    doc.setLineDashPattern([], 0);
    if (itens.some(function (x) { return x.nota != null; })) {
      doc.setFillColor(clarear(cor, 0.8)); doc.setDrawColor(cor); doc.setLineWidth(0.55);
      poli(itens.map(function (x) { return x.nota == null ? 0 : x.nota; }), 'FD');
      doc.setFillColor(cor);
      itens.forEach(function (x, i) { if (x.nota == null) return; var p = pt(i, x.nota); doc.circle(p[0], p[1], 0.65, 'F'); });
    }
    var muitos = n > 6;
    itens.forEach(function (x, i) {
      var p = pt(i, 5.55), al = Math.abs(p[0] - cx) < 2 ? 'center' : (p[0] > cx ? 'left' : 'right');
      var yy = p[1] + (p[1] < cy - R * 0.6 ? -1 : (p[1] > cy + R * 0.6 ? 2.6 : 1));
      var nome = muitos && x.nome.length > 16 ? x.nome.slice(0, 15) + '…' : x.nome, txt = nome + ' ' + n1(x.nota);
      fonte(doc, 'b', muitos ? 5 : 5.5, PRETO);
      var livre = al === 'left' ? (xmax || 999) - p[0] : (al === 'right' ? p[0] - (xmin || -999) : 999);
      if (doc.getTextWidth(txt) <= livre) { doc.text(txt, p[0], yy, { align: al }); return; }
      // sem espaço na linha: nome em cima, nota embaixo
      var l = doc.splitTextToSize(nome, Math.max(10, livre));
      doc.text(l.concat([n1(x.nota)]), p[0], yy - (l.length > 1 ? 2 : 1), { align: al });
    });
  }
  function cartao(doc, x, y, w, h, borda, fundo) {
    doc.setDrawColor(borda || '#dcd6d5'); doc.setLineWidth(0.3); doc.setFillColor(fundo || '#ffffff');
    doc.roundedRect(x, y, w, h, 2.2, 2.2, 'FD');
  }
  function setaVoltar(doc, x, y, cor) {   // seta de retorno desenhada (a fonte não tem o símbolo)
    doc.setDrawColor(cor); doc.setLineWidth(0.3);
    doc.line(x + 2.4, y - 2.2, x + 2.4, y - 1); doc.line(x + 2.4, y - 1, x + 0.3, y - 1);
    doc.line(x + 0.3, y - 1, x + 1.1, y - 1.7); doc.line(x + 0.3, y - 1, x + 1.1, y - 0.3);
  }

  /* ---------- Ficha do candidato (modelo D aprovado) ----------
     d = { nome, iniciais, codigo, turmaTxt, vaga, empresa, nota, situacao, situacaoTxt, classificadosTxt,
           motivoTxt, desistenciaTxt, semNotas, eixoTitulo ('área' | 'competência'), itens (radar), lista:{titulo, itens},
           observacoes:[{autor, data, texto}], avaliadorTxt, foto, logoEmpresa, logoKolping, paginaVoltar } */
  function desenharFicha(doc, d) {
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    var paginas = [doc.getCurrentPageInfo().pageNumber];
    var cor = COR[d.situacao] || COR.desistencia, desist = d.situacao === 'desistencia';
    var LIM = H - 24;

    function colunaEscura(primeira) {
      doc.setFillColor(PRETO); doc.rect(0, 0, 63, H, 'F');   // coluna escura até o fim da folha
      doc.setFillColor(PRETO); doc.rect(7, 7, 2.6, H - 14, 'F');
      doc.setFillColor(LARANJA); doc.rect(9.6, 7, 1.1, H - 14, 'F');
      if (!primeira) { fonte(doc, 'b', 9, '#ffffff'); doc.text(doc.splitTextToSize(d.nome, 40), 37, 20, { align: 'center' }); }
    }
    colunaEscura(true);
    var cx = 37;
    // foto (retrato arredondado)
    var fx = 20, fy = 16, fw = 34, fh = 42.5;
    if (d.foto) {
      doc.saveGraphicsState(); doc.roundedRect(fx, fy, fw, fh, 2.4, 2.4, null); doc.clip(); doc.discardPath();
      doc.addImage(d.foto.url, 'JPEG', fx, fy, fw, fh, undefined, 'FAST'); doc.restoreGraphicsState();
    } else {
      doc.setFillColor('#4a4242'); doc.roundedRect(fx, fy, fw, fh, 2.4, 2.4, 'F');
      fonte(doc, 'b', 16, '#a49b9b'); doc.text(d.iniciais || 'FOTO', cx, fy + fh / 2 + 2.5, { align: 'center' });
    }
    var y = fy + fh + 6.5;
    fonte(doc, 'b', 11, '#ffffff');
    var ln = doc.splitTextToSize(d.nome, 40); doc.text(ln, cx, y, { align: 'center' }); y += ln.length * 4.5 + 1;
    if (!desist) {
      var r = 12.7, ccy = y + r + 3;
      arco(doc, cx, ccy, r, 0, 359.9, 3, '#4a4242');
      if (d.nota != null) arco(doc, cx, ccy, r, 0, Math.max(2, 360 * Math.min(5, d.nota) / 5), 3, cor);
      fonte(doc, 'b', 19, '#ffffff'); doc.text(n2(d.nota), cx, ccy + 2.4, { align: 'center' });
      y = ccy + r + 7;
    } else { y += 2; }
    // pílula da situação
    fonte(doc, 'b', 8, '#ffffff'); var st = String(d.situacaoTxt || '').toUpperCase(), pw = doc.getTextWidth(st) + 9;
    doc.setFillColor(cor); doc.roundedRect(cx - pw / 2, y - 3.7, pw, 6, 3, 3, 'F'); doc.text(st, cx, y + 0.5, { align: 'center' });
    y += 8;
    if (d.classificadosTxt) { fonte(doc, 'n', 7.8, '#cfc8c8'); doc.text(d.classificadosTxt, cx, y, { align: 'center' }); y += 3; }
    y += 7;
    [['Código', d.codigo], ['Turma', d.turmaTxt], ['Vaga', d.vaga], ['Empresa', d.empresa]].forEach(function (x) {
      if (!x[1]) return;
      fonte(doc, 'n', 7, '#9d9596'); doc.text(x[0], 19, y);
      fonte(doc, 'b', 7.4, '#ffffff'); var l = doc.splitTextToSize(String(x[1]), 40); doc.text(l, 19, y + 3.4);
      y += 3.4 + l.length * 3.2 + 2.6;
    });

    /* conteúdo da direita */
    var x0 = 71, x1 = W - 8.5, wd = x1 - x0;
    function cabecalho() {
      imgCaber(doc, d.logoKolping, x0, 13, 40, 9, 'esq');
      fonte(doc, 'n', 7.2, CINZA);
      doc.text(doc.splitTextToSize('Ficha do candidato · Projeto Gol Jovens Talentos', 50), x0 + 69, 16.5, { align: 'center' });
      caixaEmpresa(doc, d.logoEmpresa, d.empresa, x1 - 32, 12, 32, 12.2);
      doc.setDrawColor(PRETO); doc.setLineWidth(0.6); doc.line(x0, 27, x1, 27);
    }
    cabecalho();
    y = 29.5;
    function nova(alt) {
      if (y + alt <= LIM) return;
      doc.addPage(); paginas.push(doc.getCurrentPageInfo().pageNumber); colunaEscura(false); cabecalho(); y = 29.5;
    }

    if (desist) {
      fonte(doc, 'n', 8, PRETO); var ld = doc.splitTextToSize(d.desistenciaTxt || 'Candidato desistiu do processo seletivo.', wd - 9);
      var hd = 10 + ld.length * 3.6;
      cartao(doc, x0, y, wd, hd); fonte(doc, 'b', 8.5, PRETO); doc.text('Situação', x0 + 4.5, y + 5.5);
      fonte(doc, 'n', 8, PRETO); doc.text(ld, x0 + 4.5, y + 10.3); y += hd + 2.5;
    }
    if (!desist || !d.semNotas) {
      // desempenho (radar) + lista
      var lista = (d.lista && d.lista.itens) || [];
      fonte(doc, 'n', 6.6, PRETO);
      var linhasLista = lista.map(function (x) { return doc.splitTextToSize(x.nome, 47); });
      var altLista = 12 + linhasLista.reduce(function (a, l) { return a + Math.max(1, l.length) * 3.1 + 2.7; }, 0);
      var hc = Math.max(73, altLista + 3);
      var w1 = 67.5, w2 = wd - w1 - 2.4;
      cartao(doc, x0, y, w1, hc); cartao(doc, x0 + w1 + 2.4, y, w2, hc);
      fonte(doc, 'b', 8.5, PRETO); doc.text('Desempenho por ' + d.eixoTitulo, x0 + 2.8, y + 5.6);
      radar(doc, x0 + w1 / 2, y + 6 + Math.min(hc, 73) / 2, 16.5, d.itens || [], cor, x0 + 1.5, x0 + w1 - 1.5);
      var lx = x0 + w1 + 5.2, lw = w2 - 6;
      fonte(doc, 'b', 8.5, PRETO); doc.text(d.lista ? d.lista.titulo : '', lx - 2.4, y + 5.6);
      var ly = y + 11.6;
      lista.forEach(function (x, i) {
        var l = linhasLista[i], h = Math.max(1, l.length) * 3.1;
        fonte(doc, 'n', 6.6, PRETO); doc.text(l, lx, ly + 0.4);
        fonte(doc, 'b', 7.6, PRETO); doc.text(n1(x.nota), lx + lw - 1, ly + (l.length > 1 ? 1.9 : 0.4), { align: 'right' });
        ly += h + 2.7; doc.setDrawColor('#e3dedd'); doc.setLineWidth(0.25); doc.line(lx - 0.8, ly - 3.3, lx + lw, ly - 3.3);
      });
      y += hc + 2.5;
    }
    if (d.motivoTxt && !desist) {
      fonte(doc, 'n', 8, PRETO); var lm = doc.splitTextToSize(d.motivoTxt, wd - 9);
      if (d.motivoObs) lm = lm.concat(doc.splitTextToSize(d.motivoObs, wd - 9));
      var hm = 10.5 + lm.length * 3.6;
      nova(hm); cartao(doc, x0, y, wd, hm, COR.reprovado, '#fdf1f1');
      fonte(doc, 'b', 8.5, PRETO); doc.text('Motivo', x0 + 4.5, y + 5.6);
      fonte(doc, 'n', 8, PRETO); doc.text(lm, x0 + 4.5, y + 10.6); y += hm + 2.5;
    }
    var obs = d.observacoes || [];
    if (obs.length) {
      // cada observação: "AUTOR, data:" em negrito + texto, no mesmo parágrafo
      var blocos = obs.map(function (o) {
        var rot = (o.autor || '') + (o.data ? ', ' + o.data : '') + ': ';
        fonte(doc, 'b', 7.6); var wr = doc.getTextWidth(rot);
        fonte(doc, 'n', 7.6);
        var resto = String(o.texto || ''), primeira = doc.splitTextToSize(resto, wd - 9 - wr)[0] || '';
        var sobra = resto.slice(primeira.length).trim();
        return { rot: rot, wr: wr, primeira: primeira, demais: sobra ? doc.splitTextToSize(sobra, wd - 9) : [] };
      });
      var ho = 10.5 + blocos.reduce(function (a, b) { return a + (1 + b.demais.length) * 4.1; }, 0);
      nova(Math.min(ho, 60));
      cartao(doc, x0, y, wd, ho); fonte(doc, 'b', 8.5, PRETO); doc.text('Observações dos avaliadores', x0 + 4.5, y + 5.6);
      var oy = y + 10.8;
      blocos.forEach(function (b) {
        fonte(doc, 'b', 7.6, PRETO); doc.text(b.rot, x0 + 4.5, oy);
        fonte(doc, 'n', 7.6, PRETO); doc.text(b.primeira, x0 + 4.5 + b.wr, oy); oy += 4.1;
        b.demais.forEach(function (l) { doc.text(l, x0 + 4.5, oy); oy += 4.1; });
      });
      y += ho + 2.5;
    }
    if (d.avaliadorTxt) {
      nova(15); cartao(doc, x0, y, wd, 14.5); fonte(doc, 'b', 8.5, PRETO); doc.text('Avaliador responsável', x0 + 4.5, y + 5.6);
      fonte(doc, 'n', 7.8, PRETO); doc.text(d.avaliadorTxt, x0 + 4.5, y + 10.6); y += 17;
    }
    nova(14);
    fonte(doc, 'n', 6.6, CINZA);
    doc.setFont('P', 'normal');
    var conf = doc.splitTextToSize('Documento confidencial. Dados compartilhados com autorização do candidato, para uso exclusivo neste processo seletivo.', wd);
    doc.text(conf, x0, y + 2.5); y += 2.5 + conf.length * 3.2 + 2.5;
    if (d.paginaVoltar) {
      setaVoltar(doc, x0, y + 1.1, LARANJA);
      fonte(doc, 'n', 7.4, LARANJA); doc.text('voltar ao ranking', x0 + 3.6, y + 1.1);
      doc.link(x0, y - 2.5, 30, 4.8, { pageNumber: d.paginaVoltar });
    }
    return paginas;
  }

  /* ---------- PDF do processo (modelo aprovado) ---------- */
  function capa(doc, im, empresa) {
    var W = doc.internal.pageSize.getWidth();
    faixa(doc);
    imgCaber(doc, im.gol, 60, 85, W - 120, 68, 'centro');
    fonte(doc, 'b', 15.5, PRETO); doc.text('Projeto Gol Jovens Talentos', W / 2 + 4, 173, { align: 'center' });
    imgCaber(doc, im.kolping, 46, 185, 74, 16, 'centro');
    caixaEmpresa(doc, im.empresa, empresa, 133, 187.5, 31, 12);
  }
  function paginaAgradecimento(doc, texto, im, empresa) {
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), x0 = 36, x1 = W - 28, wd = x1 - x0, cxm = W / 2 + 4;
    faixa(doc);
    var pars = String(texto || '').split(/\n\s*\n/), linhas = [];
    fonte(doc, 'n', 11.5, PRETO);
    pars.forEach(function (par, i) { if (i) linhas.push(''); doc.splitTextToSize(par.replace(/\n/g, ' '), wd).forEach(function (l) { linhas.push(l); }); });
    var alt = linhas.length * 6, y = Math.max(80, (H - alt) / 2 - 10);
    fonte(doc, 'b', 17, PRETO); doc.text('Agradecimento', cxm, y - 16, { align: 'center' });
    doc.setFillColor(LARANJA); doc.rect(cxm - 10, y - 11, 20, 0.9, 'F');
    fonte(doc, 'n', 11.5, PRETO);
    linhas.forEach(function (l, i) { doc.text(l, cxm, y + i * 6, { align: 'center' }); });
    y += alt + 14;
    fonte(doc, 'b', 10.5, PRETO); doc.text('Kolping Estadual de São Paulo', cxm, y, { align: 'center' });
    imgCaber(doc, im.kolping, cxm - 70 / 2 - 22, H - 58, 60, 14, 'centro');
    caixaEmpresa(doc, im.empresa, empresa, cxm + 18, H - 58 + 1, 31, 12);
  }
  function cabecalhoDoc(doc, im, centro, empresa) {
    var W = doc.internal.pageSize.getWidth(), x0 = 21, x1 = W - 10;
    faixa(doc);
    imgCaber(doc, im.kolping, x0, 15.5, 40, 9, 'esq');
    fonte(doc, 'n', 7.4, CINZA); doc.text(centro, (x0 + 44 + x1 - 34) / 2, 21, { align: 'center' });
    caixaEmpresa(doc, im.empresa, empresa, x1 - 32, 14, 32, 12.5);
    doc.setDrawColor(PRETO); doc.setLineWidth(0.6); doc.line(x0, 29, x1, 29);
  }
  function periodoTxt(datas) {
    if (!datas.length) return null;
    var a = datas[0], b = datas[datas.length - 1];
    if (a === b) return dataBR(a);
    return a.slice(0, 4) === b.slice(0, 4) ? dataBR(a).slice(0, 5) + ' a ' + dataBR(b) : dataBR(a) + ' a ' + dataBR(b);
  }
  function diasTxt(datas, comAno) {   // ['2026-11-17','2026-11-18'] → "17 e 18/11" (ou "17 e 18/11/2026")
    if (!datas || !datas.length) return '';
    var ds = datas.map(function (x) { return String(x).slice(0, 10); }), mesmoMes = ds.every(function (x) { return x.slice(0, 7) === ds[0].slice(0, 7); });
    var fimTxt = dataBR(ds[ds.length - 1]).slice(0, comAno ? 10 : 5);
    if (ds.length === 1) return fimTxt;
    var antes = ds.slice(0, -1).map(function (x) { return mesmoMes ? x.slice(8, 10) : dataBR(x).slice(0, 5); });
    return antes.join(', ') + ' e ' + fimTxt;
  }
  function paginaInfo(doc, p, im) {
    var W = doc.internal.pageSize.getWidth(), x0 = 21, x1 = W - 10, wd = x1 - x0;
    cabecalhoDoc(doc, im, 'Resultado do processo seletivo · Projeto Gol Jovens Talentos', p.empresa);
    fonte(doc, 'b', 15, PRETO); doc.text('Informações do processo', x0, 39);
    var datas = [];
    (p.turmas || []).forEach(function (t) { (t.datas || []).forEach(function (d) { datas.push(String(d).slice(0, 10)); }); });
    datas.sort();
    var linhas = [['Empresa', p.razaoSocial || p.empresa], ['Vaga', p.vaga], ['Processo', p.identificacao], ['Período', periodoTxt(datas)],
      ['Turmas', (p.turmas || []).map(function (t) { var dt = diasTxt(t.datas); return t.nome + (dt ? ' (' + dt + ')' : ''); }).join(' · ')],
      ['Jovens avaliados', String(p.total)], ['Liberado em', p.liberadoEm ? dataBR(p.liberadoEm) : (p.previa ? 'ainda não liberado (prévia)' : null)]]
      .filter(function (x) { return x[1]; });
    var y = 48.5;
    linhas.forEach(function (x) {
      fonte(doc, 'n', 9.5, CINZA); doc.text(x[0], x0, y);
      fonte(doc, 'b', 9.5, PRETO); var l = doc.splitTextToSize(String(x[1]), wd - 44); doc.text(l, x0 + 44, y);
      y += l.length * 4.6 + 2.9;
    });
    y += 3;
    var itens = [['aprovado', 'Aprovados'], ['backup', 'Backup'], ['reprovado', 'Reprovados'], ['desistencia', 'Desistências']], gap = 3, gw = (wd - 3 * gap) / 4;
    itens.forEach(function (it, i) {
      var x = x0 + i * (gw + gap);
      cartao(doc, x, y, gw, 21);
      doc.setFillColor(COR[it[0]]); doc.roundedRect(x, y + 19.6, gw, 1.4, 0.7, 0.7, 'F');
      fonte(doc, 'b', 16, PRETO); doc.text(String(p.contagem[it[0]] || 0), x + gw / 2, y + 9.5, { align: 'center' });
      fonte(doc, 'n', 8.4, PRETO); doc.text(it[1], x + gw / 2, y + 15, { align: 'center' });
    });
    y += 29;
    fonte(doc, 'n', 8.4, CINZA);
    doc.text('Na página seguinte está o ranking final. Clique no nome de um jovem para ir direto à ficha dele.', x0, y);
  }
  var RK_LINHAS = 17;
  function paginaRanking(doc, p, im, ini, fim, primeira) {
    var W = doc.internal.pageSize.getWidth(), x0 = 21, x1 = W - 10, wd = x1 - x0;
    cabecalhoDoc(doc, im, 'Classificação final · ' + p.vaga, p.empresa);
    fonte(doc, 'b', 15, PRETO); doc.text(primeira ? 'Classificação final' : 'Classificação final (continuação)', x0, 39);
    var cP = x0, cN = x0 + 14, cNo = x0 + wd * 0.47, cS = x0 + wd * 0.59;
    var y = 44;
    doc.setFillColor('#f0eeed'); doc.rect(x0, y, wd, 7.5, 'F');
    fonte(doc, 'b', 7.6, PRETO); doc.text('Pos.', cP + 2.5, y + 4.9); doc.text('Jovem', cN, y + 4.9); doc.text('Nota final', cNo, y + 4.9); doc.text('Situação', cS, y + 4.9);
    y += 7.5;
    var links = [];
    for (var i = ini; i < fim; i++) {
      var r = p.ranking[i], c = COR[r.situacao] || COR.desistencia, h = r.detalhe ? 13.6 : 12.3;
      doc.setFillColor(c); doc.rect(x0, y, 0.9, h, 'F');
      var yc = y + h / 2;
      fonte(doc, 'b', 8.6, PRETO); doc.text(r.posicao ? r.posicao + 'º' : '—', cP + 5, yc + 1, { align: 'center' });
      fonte(doc, 'b', 8.4, PRETO); var nome = doc.splitTextToSize(r.nome, cNo - cN - 8)[0]; doc.text(nome, cN, yc - 0.6);
      var wn = doc.getTextWidth(nome);
      fonte(doc, 'b', 8.4, LARANJA); doc.text('›', cN + wn + 0.8, yc - 0.6);
      fonte(doc, 'n', 6.6, CINZA); doc.text((r.turma || '') + (r.codigo ? ' · ' + r.codigo : ''), cN, yc + 3.2);
      fonte(doc, 'b', 8.6, PRETO); doc.text(r.nota == null ? '—' : n2(r.nota), cNo, yc + 1);
      var st = r.situacaoTxt; fonte(doc, 'b', 7.2, '#ffffff'); var pw = doc.getTextWidth(st) + 7, py = r.detalhe ? yc - 4.4 : yc - 2.6;
      doc.setFillColor(c); doc.roundedRect(cS, py, pw, 5, 2.5, 2.5, 'F'); doc.text(st, cS + 3.5, py + 3.4);
      if (r.detalhe) { fonte(doc, 'n', 6.4, CINZA); doc.text(doc.splitTextToSize(r.detalhe, x1 - cS)[0], cS, yc + 4.4); }
      links.push({ i: i, x: cN, y: yc - 4, w: wn + 4, h: 8.5 });
      y += h; doc.setDrawColor('#e3dedd'); doc.setLineWidth(0.25); doc.line(x0, y, x1, y);
    }
    return links;
  }
  async function processo(p) {
    var doc = await novo();
    var r = await Promise.all([imagem('assets/img/gol_light.png'), imagem('assets/img/kolping_light.png'), imagem(p.logoEmpresaUrl)]);
    var im = { gol: r[0], kolping: r[1], empresa: r[2] };
    var fichas = p.fichas || [];   // mesma ordem do ranking (posição sem ficha = null)
    for (var k = 0; k < fichas.length; k += 8) {
      await Promise.all(fichas.slice(k, k + 8).map(async function (d) { if (d) d.foto = await imagemRetrato(d.fotoUrl); }));
    }
    fichas.forEach(function (d) { if (!d) return; d.logoEmpresa = im.empresa; d.logoKolping = im.kolping; d.logoGol = im.gol; });

    capa(doc, im, p.empresa);
    doc.addPage(); paginaAgradecimento(doc, p.agradecimento, im, p.empresa);
    doc.addPage(); paginaInfo(doc, p, im);
    var pagInfo = 3, pagRanking = [], linksRk = [], rotulo = {};
    rotulo[pagInfo] = ['Resultado do processo seletivo', 21];
    for (var i = 0; i < p.ranking.length || i === 0; i += RK_LINHAS) {
      doc.addPage(); var pr = doc.getCurrentPageInfo().pageNumber; pagRanking.push(pr); rotulo[pr] = ['Classificação final', 21];
      paginaRanking(doc, p, im, i, Math.min(p.ranking.length, i + RK_LINHAS), i === 0).forEach(function (l) { l.pagina = pr; linksRk.push(l); });
      if (!p.ranking.length) break;
    }
    var inicioFicha = [];
    fichas.forEach(function (d, idx) {
      if (!d) return;
      doc.addPage();
      d.paginaVoltar = pagRanking[Math.floor(idx / RK_LINHAS)] || pagRanking[0];
      inicioFicha[idx] = doc.getCurrentPageInfo().pageNumber;
      desenharFicha(doc, d).forEach(function (pg) { rotulo[pg] = ['Ficha do candidato', 67]; });
    });
    linksRk.forEach(function (l) { if (inicioFicha[l.i]) { doc.setPage(l.pagina); doc.link(l.x, l.y, l.w, l.h, { pageNumber: inicioFicha[l.i] }); } });
    var total = doc.getNumberOfPages();
    for (var pg = 3; pg <= total; pg++) {
      doc.setPage(pg); var ro = rotulo[pg] || ['Resultado do processo seletivo', 21];
      rodape(doc, ro[0] + (p.previa ? ' · PRÉVIA (processo ainda não liberado)' : ''), pg, total, ro[1]);
    }
    try {
      if (doc.outline) {
        doc.outline.add(null, 'Capa', { pageNumber: 1 });
        doc.outline.add(null, 'Agradecimento', { pageNumber: 2 });
        doc.outline.add(null, 'Informações do processo', { pageNumber: pagInfo });
        doc.outline.add(null, 'Classificação final', { pageNumber: pagRanking[0] });
        var fx = doc.outline.add(null, 'Fichas dos candidatos', { pageNumber: inicioFicha.filter(Boolean)[0] || pagRanking[0] });
        fichas.forEach(function (d, idx) { if (!d) return; doc.outline.add(fx, (p.ranking[idx] && p.ranking[idx].posicao ? p.ranking[idx].posicao + 'º · ' : '') + d.nome, { pageNumber: inicioFicha[idx] }); });
      }
    } catch (e) { /* marcadores são opcionais */ }
    doc.setProperties({ title: 'Processo seletivo · ' + p.empresa + ' · ' + p.vaga, subject: 'Projeto Gol Jovens Talentos', author: 'Kolping Estadual de São Paulo', creator: 'Classificação Final' });
    return doc.output('blob');
  }


  /* ---------- Certificado de participação (A4 deitado, 1 por jovem) ----------
     c = { empresa, logoEmpresaUrl, vaga, identificacao, cidadeData ('Carapicuíba, 30 de novembro de 2026'),
           assinatura: { nome, cargo }, jovens:[{ nome, codigo, turma, datasTxt ('17 e 18/11/2026') }] } */
  function dataExtenso(d) {
    var m = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return d.getDate() + ' de ' + m[d.getMonth()] + ' de ' + d.getFullYear();
  }
  async function certificado(c) {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Recurso de PDF indisponível. Recarregue a página.');
    var f = await fontes();
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
    doc.addFileToVFS('Poppins-Regular.ttf', f.regular); doc.addFont('Poppins-Regular.ttf', 'P', 'normal');
    doc.addFileToVFS('Poppins-Medium.ttf', f.medium); doc.addFont('Poppins-Medium.ttf', 'PM', 'normal');
    doc.addFileToVFS('Poppins-Bold.ttf', f.bold); doc.addFont('Poppins-Bold.ttf', 'P', 'bold');
    var r = await Promise.all([imagem('assets/img/gol_light.png'), imagem('assets/img/kolping_light.png'), imagem(c.logoEmpresaUrl)]);
    var im = { gol: r[0], kolping: r[1], empresa: r[2] };
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), cx = W / 2 + 4;
    (c.jovens || []).forEach(function (j, idx) {
      if (idx) doc.addPage();
      faixa(doc);
      // moldura fina
      doc.setDrawColor('#d9d3d2'); doc.setLineWidth(0.4); doc.rect(18, 10, W - 28, H - 20, 'S');
      doc.setDrawColor(LARANJA); doc.setLineWidth(0.25); doc.rect(20, 12, W - 32, H - 24, 'S');
      imgCaber(doc, im.gol, cx - 17, 20, 34, 34, 'centro');
      fonte(doc, 'b', 30, PRETO); doc.text('Certificado de Participação', cx, 70, { align: 'center' });
      doc.setFillColor(LARANJA); doc.rect(cx - 14, 74, 28, 1.1, 'F');
      fonte(doc, 'n', 12.5, CINZA); doc.text('Certificamos que', cx, 88, { align: 'center' });
      fonte(doc, 'b', 22, PRETO); doc.text(j.nome, cx, 101, { align: 'center' });
      doc.setDrawColor('#cfc8c8'); doc.setLineWidth(0.3); doc.line(cx - 85, 105, cx + 85, 105);
      var texto = 'participou do processo seletivo do Projeto Gol Jovens Talentos para a vaga de ' + (c.vaga || '') +
        (c.empresa ? ', em parceria com a ' + c.empresa : '') + ', realizado pela Kolping Estadual de São Paulo' +
        (j.datasTxt ? ' nos dias ' + j.datasTxt : '') + '.';
      fonte(doc, 'n', 12.5, PRETO);
      var ls = doc.splitTextToSize(texto, 190); doc.text(ls, cx, 115, { align: 'center', lineHeightFactor: 1.5 });
      var y = 115 + ls.length * 6.6 + 8;
      fonte(doc, 'n', 10.5, CINZA); doc.text(c.cidadeData || ('Carapicuíba, ' + dataExtenso(new Date())), cx, y, { align: 'center' });
      // assinatura
      var ya = H - 42;
      doc.setDrawColor(PRETO); doc.setLineWidth(0.3); doc.line(cx - 40, ya, cx + 40, ya);
      fonte(doc, 'b', 10, PRETO); doc.text((c.assinatura && c.assinatura.nome) || 'Coordenação', cx, ya + 5, { align: 'center' });
      fonte(doc, 'n', 8.5, CINZA); doc.text((c.assinatura && c.assinatura.cargo) || 'Kolping Estadual de São Paulo', cx, ya + 9.5, { align: 'center' });
      // logos embaixo
      imgCaber(doc, im.kolping, 32, H - 38, 52, 14, 'esq');
      if (im.empresa || c.empresa) caixaEmpresa(doc, im.empresa, c.empresa, W - 64, H - 38, 40, 14);
      // código e rodapé discreto
      fonte(doc, 'n', 7, CINZA_CL);
      doc.text('Código ' + (j.codigo || '') + (j.turma ? ' · ' + j.turma : '') + (c.identificacao ? ' · Processo ' + c.identificacao : ''), cx, H - 15.5, { align: 'center' });
      doc.text(INST, cx, H - 12.8 + 0.1, { align: 'center' });
    });
    doc.setProperties({ title: 'Certificados · ' + (c.empresa || '') + ' · ' + (c.vaga || ''), subject: 'Projeto Gol Jovens Talentos', author: 'Kolping Estadual de São Paulo', creator: 'Classificação Final' });
    return doc.output('blob');
  }


  /* ---------- Histórico do candidato (mesmo modelo da ficha: coluna lateral escura) ----------
     j = { nome, iniciais, genero, nascimento, idade, telefone, fotoUrl, foto,
           participacoes: [{ empresa, vaga, processo, datasTxt, turma, codigo, situacaoProc, nota, posicaoTxt,
                             situacao ('aprovado'...|null), situacaoTxt, motivo, naEmpresa, contratado }] }  (mais recente primeiro) */
  function desenharHistorico(doc, j, logoKolping) {
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    var paginas = [doc.getCurrentPageInfo().pageNumber], LIM = H - 24, cx = 37;
    var ps = j.participacoes || [], cont = { aprovado: 0, backup: 0, reprovado: 0, desistencia: 0 };
    ps.forEach(function (p) { if (cont[p.situacao] != null) cont[p.situacao]++; });
    function coluna(primeira) {
      doc.setFillColor(PRETO); doc.rect(0, 0, 63, H, 'F');
      doc.setFillColor(LARANJA); doc.rect(9.6, 7, 1.1, H - 14, 'F');
      if (!primeira) { fonte(doc, 'b', 9, '#ffffff'); doc.text(doc.splitTextToSize(j.nome, 40), cx, 20, { align: 'center' }); return; }
      var fx = 20, fy = 16, fw = 34, fh = 42.5;
      if (j.foto) {
        doc.saveGraphicsState(); doc.roundedRect(fx, fy, fw, fh, 2.4, 2.4, null); doc.clip(); doc.discardPath();
        doc.addImage(j.foto.url, 'JPEG', fx, fy, fw, fh, undefined, 'FAST'); doc.restoreGraphicsState();
      } else {
        doc.setFillColor('#4a4242'); doc.roundedRect(fx, fy, fw, fh, 2.4, 2.4, 'F');
        fonte(doc, 'b', 16, '#a49b9b'); doc.text(j.iniciais || 'FOTO', cx, fy + fh / 2 + 2.5, { align: 'center' });
      }
      var y = fy + fh + 6.5;
      fonte(doc, 'b', 11, '#ffffff'); var ln = doc.splitTextToSize(j.nome, 40); doc.text(ln, cx, y, { align: 'center' }); y += ln.length * 4.5 + 5;
      // número de processos em destaque
      fonte(doc, 'b', 26, '#ffffff'); doc.text(String(ps.length), cx, y + 7, { align: 'center' });
      fonte(doc, 'n', 7.8, '#cfc8c8'); doc.text(ps.length === 1 ? 'processo seletivo' : 'processos seletivos', cx, y + 12.5, { align: 'center' }); y += 20;
      [['aprovado', 'Aprovado'], ['backup', 'Backup'], ['reprovado', 'Reprovado'], ['desistencia', 'Desistência']].forEach(function (x) {
        doc.setFillColor(COR[x[0]]); doc.roundedRect(19, y - 3, 3.2, 3.2, 0.8, 0.8, 'F');
        fonte(doc, 'n', 7.6, '#e8e2e2'); doc.text(x[1], 24.5, y - 0.4);
        fonte(doc, 'b', 8, '#ffffff'); doc.text(String(cont[x[0]]), 55, y - 0.4, { align: 'right' });
        y += 5.6;
      });
      y += 6;
      [['Gênero', j.genero], ['Nascimento', j.nascimento ? dataBR(j.nascimento) + (j.idade != null ? ' · ' + j.idade + ' anos' : '') : null], ['Telefone', j.telefone]].forEach(function (x) {
        if (!x[1]) return;
        fonte(doc, 'n', 7, '#9d9596'); doc.text(x[0], 19, y);
        fonte(doc, 'b', 7.4, '#ffffff'); var l = doc.splitTextToSize(String(x[1]), 40); doc.text(l, 19, y + 3.4);
        y += 3.4 + l.length * 3.2 + 2.6;
      });
    }
    var x0 = 71, x1 = W - 8.5, wd = x1 - x0;
    function cabecalho() {
      imgCaber(doc, logoKolping, x0, 13, 40, 9, 'esq');
      fonte(doc, 'n', 7.2, CINZA); doc.text('Histórico do candidato · Projeto Gol Jovens Talentos', x1, 18.5, { align: 'right' });
      doc.setDrawColor(PRETO); doc.setLineWidth(0.6); doc.line(x0, 27, x1, 27);
    }
    coluna(true); cabecalho();
    var y = 36;
    fonte(doc, 'b', 15, PRETO); doc.text('Histórico do candidato', x0, y);
    fonte(doc, 'n', 8, CINZA); doc.text('Todos os processos seletivos de que participou, do mais recente ao mais antigo.', x0, y + 5); y += 11;
    if (!ps.length) { fonte(doc, 'n', 9, CINZA); doc.text('Nenhuma participação registrada.', x0, y + 4); }
    ps.forEach(function (p) {
      var cor = COR[p.situacao] || '#b9b3b3', linhasMot = [], extra = [];
      fonte(doc, 'n', 7.6, PRETO);
      if (p.motivo) linhasMot = doc.splitTextToSize(p.motivo, wd - 44);
      if (p.naEmpresa) extra.push(['Na empresa: ', p.naEmpresa]);
      if (p.contratado) extra.push(['Contratado: ', p.contratado]);
      var h = 21 + linhasMot.length * 3.6 + (extra.length ? 5 : 0);
      if (y + h > LIM) { doc.addPage(); paginas.push(doc.getCurrentPageInfo().pageNumber); coluna(false); cabecalho(); y = 33; }
      cartao(doc, x0, y, wd, h);
      doc.setFillColor(cor); doc.roundedRect(x0, y, 1.6, h, 0.8, 0.8, 'F');
      fonte(doc, 'b', 9, PRETO); doc.text(doc.splitTextToSize((p.empresa || '') + ' · ' + (p.vaga || ''), wd - 46)[0], x0 + 5, y + 6);
      fonte(doc, 'n', 7.2, CINZA);
      doc.text(doc.splitTextToSize(['Processo ' + (p.processo || ''), p.datasTxt].filter(Boolean).join(' · '), wd - 46)[0], x0 + 5, y + 10.5);
      fonte(doc, 'n', 7, CINZA); doc.text(doc.splitTextToSize([p.turma, p.codigo ? 'código ' + p.codigo : null, 'processo ' + String(p.situacaoProc || '—').toLowerCase()].filter(Boolean).join(' · '), wd - 46)[0], x0 + 5, y + 14.8);
      // nota e resultado à direita
      fonte(doc, 'b', 15, PRETO); doc.text(p.nota == null ? '—' : n2(p.nota), x1 - 4, y + 9, { align: 'right' });
      fonte(doc, 'n', 6.4, CINZA); doc.text(p.posicaoTxt || 'nota final', x1 - 4, y + 12.6, { align: 'right' });
      var st = String(p.situacaoTxt || '').toUpperCase();
      if (st) { fonte(doc, 'b', 6.8, '#ffffff'); var pw = doc.getTextWidth(st) + 6; doc.setFillColor(cor); doc.roundedRect(x1 - 4 - pw, y + 14.6, pw, 4.6, 2.3, 2.3, 'F'); doc.text(st, x1 - 4 - pw / 2, y + 17.8, { align: 'center' }); }
      var yy = y + 19;
      if (linhasMot.length) { fonte(doc, 'n', 7.6, PRETO); doc.text(linhasMot, x0 + 5, yy + 1); yy += linhasMot.length * 3.6; }
      if (extra.length) {
        var xx = x0 + 5; yy += 2.5;
        extra.forEach(function (e) { fonte(doc, 'b', 7.4, PRETO); doc.text(e[0], xx, yy); xx += doc.getTextWidth(e[0]); fonte(doc, 'n', 7.4, PRETO); doc.text(e[1], xx, yy); xx += doc.getTextWidth(e[1]) + 6; });
      }
      y += h + 3;
    });
    fonte(doc, 'n', 6.6, CINZA);
    var conf = doc.splitTextToSize('Documento confidencial. Uso interno da Kolping Estadual de São Paulo.', wd);
    if (y + 8 > LIM) { doc.addPage(); paginas.push(doc.getCurrentPageInfo().pageNumber); coluna(false); cabecalho(); y = 33; }
    doc.text(conf, x0, y + 3);
    if (j.paginaVoltar) {
      var yv = y + 3 + conf.length * 3.2 + 4;
      setaVoltar(doc, x0, yv + 1.1, LARANJA);
      fonte(doc, 'n', 7.4, LARANJA); doc.text('voltar à lista', x0 + 3.6, yv + 1.1);
      doc.link(x0, yv - 2.5, 28, 4.8, { pageNumber: j.paginaVoltar });
    }
    return paginas;
  }
  /* Lista dos candidatos (primeiras páginas do histórico geral): nome clicável leva ao histórico */
  var LISTA_LINHAS = 18;
  function paginaLista(doc, jovens, im, ini, fim, primeira) {
    var W = doc.internal.pageSize.getWidth(), x0 = 21, x1 = W - 10, wd = x1 - x0;
    faixa(doc);
    imgCaber(doc, im.kolping, x0, 15.5, 40, 9, 'esq');
    fonte(doc, 'n', 7.4, CINZA); doc.text('Histórico geral dos candidatos · Projeto Gol Jovens Talentos', x1, 21, { align: 'right' });
    doc.setDrawColor(PRETO); doc.setLineWidth(0.6); doc.line(x0, 29, x1, 29);
    fonte(doc, 'b', 15, PRETO); doc.text(primeira ? 'Lista dos candidatos' : 'Lista dos candidatos (continuação)', x0, 39);
    if (primeira) { fonte(doc, 'n', 8, CINZA); doc.text(jovens.length + ' jovens em ordem alfabética. Clique no nome para abrir o histórico do jovem.', x0, 44); }
    var cN = x0 + 3, cP = x0 + wd * 0.47, cU = x0 + wd * 0.58, y = 48;
    doc.setFillColor('#f0eeed'); doc.rect(x0, y, wd, 7.5, 'F');
    fonte(doc, 'b', 7.6, PRETO); doc.text('Jovem', cN, y + 4.9); doc.text('Processos', cP, y + 4.9); doc.text('Último resultado', cU, y + 4.9);
    y += 7.5;
    var links = [];
    for (var i = ini; i < fim; i++) {
      var j = jovens[i], u = (j.participacoes || [])[0] || {}, cor = COR[u.situacao] || '#b9b3b3', h = 11.6, yc = y + h / 2;
      doc.setFillColor(cor); doc.rect(x0, y, 0.9, h, 'F');
      fonte(doc, 'b', 8.4, PRETO); var nome = doc.splitTextToSize(j.nome, cP - cN - 8)[0]; doc.text(nome, cN, yc - 0.6);
      var wn = doc.getTextWidth(nome); fonte(doc, 'b', 8.4, LARANJA); doc.text('›', cN + wn + 0.8, yc - 0.6);
      fonte(doc, 'n', 6.6, CINZA); doc.text([j.genero, j.idade != null ? j.idade + ' anos' : null, j.telefone].filter(Boolean).join(' · '), cN, yc + 3.2);
      fonte(doc, 'b', 9, PRETO); doc.text(String((j.participacoes || []).length), cP + 6, yc + 1, { align: 'center' });
      var st = String(u.situacaoTxt || '—');
      if (u.situacaoTxt) { fonte(doc, 'b', 7, '#ffffff'); var pw = doc.getTextWidth(st) + 7; doc.setFillColor(cor); doc.roundedRect(cU, yc - 4.6, pw, 4.8, 2.4, 2.4, 'F'); doc.text(st, cU + 3.5, yc - 1.3); }
      fonte(doc, 'n', 6.4, CINZA); doc.text(doc.splitTextToSize(((u.empresa || '') + (u.vaga ? ' · ' + u.vaga : '')) || 'sem processo', x1 - cU)[0], cU, yc + 3.6);
      links.push({ i: i, x: cN, y: yc - 4, w: wn + 4, h: 8.5 });
      y += h; doc.setDrawColor('#e3dedd'); doc.setLineWidth(0.25); doc.line(x0, y, x1, y);
    }
    return links;
  }
  async function historico(jovens) {   // um jovem ou vários (um após o outro, cada um começando em página nova)
    var doc = await novo(), kol = await imagem('assets/img/kolping_light.png');
    for (var k = 0; k < jovens.length; k += 8) {
      await Promise.all(jovens.slice(k, k + 8).map(async function (j) { j.foto = await imagemRetrato(j.fotoUrl); }));
    }
    var rot = {}, comLista = jovens.length > 1, pagLista = [], links = [], inicio = [];
    if (comLista) {   // lista com links para o histórico de cada jovem
      for (var i = 0; i < jovens.length; i += LISTA_LINHAS) {
        if (i) doc.addPage(); var pl = doc.getCurrentPageInfo().pageNumber; pagLista.push(pl); rot[pl] = ['Histórico geral dos candidatos', 21];
        paginaLista(doc, jovens, { kolping: kol }, i, Math.min(jovens.length, i + LISTA_LINHAS), i === 0).forEach(function (l) { l.pagina = pl; links.push(l); });
      }
    }
    jovens.forEach(function (j, i) {
      if (i || comLista) doc.addPage();
      inicio[i] = doc.getCurrentPageInfo().pageNumber;
      if (comLista) j.paginaVoltar = pagLista[Math.floor(i / LISTA_LINHAS)];
      desenharHistorico(doc, j, kol).forEach(function (pg) { rot[pg] = ['Histórico do candidato', 67]; });
    });
    links.forEach(function (l) { doc.setPage(l.pagina); doc.link(l.x, l.y, l.w, l.h, { pageNumber: inicio[l.i] }); });
    var total = doc.getNumberOfPages();
    for (var pg = 1; pg <= total; pg++) { doc.setPage(pg); var ro = rot[pg] || ['Histórico do candidato', 67]; rodape(doc, ro[0], pg, total, ro[1]); }
    try {
      if (comLista && doc.outline) {
        doc.outline.add(null, 'Lista dos candidatos', { pageNumber: pagLista[0] });
        var ox = doc.outline.add(null, 'Históricos', { pageNumber: inicio[0] });
        jovens.forEach(function (j, i) { doc.outline.add(ox, j.nome, { pageNumber: inicio[i] }); });
      }
    } catch (e) { /* marcadores são opcionais */ }
    doc.setProperties({ title: jovens.length === 1 ? 'Histórico · ' + jovens[0].nome : 'Histórico geral dos candidatos', subject: 'Projeto Gol Jovens Talentos', author: 'Kolping Estadual de São Paulo', creator: 'Classificação Final' });
    return doc.output('blob');
  }

  /* ---------- Documento: ficha avulsa ---------- */
  async function ficha(d) {
    var doc = await novo();
    var r = await Promise.all([imagemRetrato(d.fotoUrl), imagem(d.logoEmpresaUrl), imagem('assets/img/kolping_light.png'), imagem('assets/img/gol_light.png')]);
    d.foto = r[0]; d.logoEmpresa = r[1]; d.logoKolping = r[2]; d.logoGol = r[3];
    var pags = desenharFicha(doc, d);
    pags.forEach(function (p, i) { doc.setPage(p); rodape(doc, 'Ficha do candidato', i + 1, pags.length, 67); });
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
  window.CF.pdf = { novo: novo, faixa: faixa, rodape: rodape, imagem: imagem, desenharFicha: desenharFicha, ficha: ficha, processo: processo, certificado: certificado, historico: historico, dataExtenso: dataExtenso, baixar: baixar, nomeArquivo: nomeArquivo, COR: COR };
})();
