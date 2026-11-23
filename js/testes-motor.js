/* =====================================================================
   Classificação Final · testes-motor.js
   Desenha e corrige os testes "aplicados no tablet".
   É o mesmo motor que o Projeto Gol Testes usa no tablet; aqui ele serve
   para a pré-visualização no editor.
   Tipos prontos (T1): 'contar' (contar diferenças) e 'marcar' (marcar o que mudou).
   ===================================================================== */
(function () {
  'use strict';
  var CORES_BANCO = { 'BRADESCO': '#cc092f', 'NUBANK': '#820ad1', 'ITAÚ': '#ec7000', 'ITAU': '#ec7000', 'BANCO DO BRASIL': '#f2c400', 'SANTANDER': '#ea1d25', 'CAIXA': '#005ca9', 'INTER': '#ff7a00', 'C6': '#2b2b2b' };
  var CAMPOS_CARTAO = [['numero', 'Número'], ['nome', 'Nome'], ['validade', 'Validade'], ['agencia', 'Agência'], ['cvv', 'CVV']];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(v) { return String(v == null ? '' : v).trim().toUpperCase().replace(/\s+/g, ' '); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; }

  /* ---------- Correção ---------- */
  function diferencas(b) { return CAMPOS_CARTAO.filter(function (c) { return norm((b.original || {})[c[0]]) !== norm((b.copia || {})[c[0]]); }).map(function (c) { return c[0]; }); }
  function totalParte(p) {
    if (p.tipo === 'contar') return (p.linhas || []).reduce(function (a, l) { return a + num(l.pontos == null ? 1 : l.pontos); }, 0);
    if (p.tipo === 'marcar') return (p.blocos || []).reduce(function (a, b) { return a + diferencas(b).length; }, 0);
    if (p.tipo === 'escolha') return (p.questoes || []).reduce(function (a, q) { return a + num(q.pontos == null ? 1 : q.pontos); }, 0);
    return 0;
  }
  function corrigirParte(p, r) {   // r = respostas desta parte
    r = r || {};
    if (p.tipo === 'contar') return (p.linhas || []).reduce(function (a, l, i) { return a + (r[i] != null && norm(r[i]) === norm(l.gabarito) ? num(l.pontos == null ? 1 : l.pontos) : 0); }, 0);
    if (p.tipo === 'escolha') return (p.questoes || []).reduce(function (a, q, i) { return a + (r[i] != null && +r[i] === +q.correta ? num(q.pontos == null ? 1 : q.pontos) : 0); }, 0);
    if (p.tipo === 'marcar') {
      var ac = 0, er = 0;
      (p.blocos || []).forEach(function (b, i) { var dif = diferencas(b); CAMPOS_CARTAO.forEach(function (c) { if ((r[i] || {})[c[0]]) { if (dif.indexOf(c[0]) >= 0) ac++; else er++; } }); });
      return Math.max(0, ac - er);
    }
    return 0;
  }
  function nota(est, pontos, total) {
    var f = (est.faixas || []).slice().sort(function (a, b) { return num(b.min) - num(a.min); });
    var v = est.modo_nota === 'percentual' ? (total ? pontos / total * 100 : 0) : pontos;
    for (var i = 0; i < f.length; i++) if (v >= num(f[i].min)) return Number(f[i].nota);
    return 0;
  }
  function corrigir(est, resp) {
    var pts = 0, tot = 0;
    (est.partes || []).forEach(function (p, i) { pts += corrigirParte(p, (resp || {})[i]); tot += totalParte(p); });
    return { pontos: Math.round(pts * 100) / 100, total: tot, nota: nota(est, pts, tot) };
  }

  /* ---------- Desenho ---------- */
  function cartao(d, copia, rotulo) {
    d = d || {}; var bc = norm(d.banco), cor = CORES_BANCO[bc] || '#4a4444', claro = bc === 'BANCO DO BRASIL';
    return '<div class="tm-cc' + (copia ? ' copia' : '') + '" style="--bg:' + cor + ';' + (claro ? 'color:#1b2a6b' : '') + '"><span class="bc">' + esc(d.banco) + '</span><span class="bd">' + esc(d.bandeira) + '</span><div class="ch"></div>' +
      '<div class="nu">' + esc(d.numero) + '</div><div class="nm">' + esc(d.nome) + '</div><div class="rod"><span>Val ' + esc(d.validade) + '</span><span>Ag ' + esc(d.agencia) + '</span><span>CVV ' + esc(d.cvv) + '</span></div><span class="tag">' + esc(rotulo || (copia ? 'Cópia' : 'Original')) + '</span></div>';
  }
  function letra(k) { var s = ''; k++; while (k > 0) { var r = (k - 1) % 26; s = String.fromCharCode(65 + r) + s; k = Math.floor((k - 1) / 26); } return s; }
  // originais sem repetição: pelo nº da planilha (b.orig); sem nº, pela ordem em que aparecem
  function originais(p) {
    var vistos = {}, lista = [];
    (p.blocos || []).forEach(function (b) {
      var d = b.original || {}, tem = b.orig != null && b.orig !== '', ch = chaveOrig(b);
      if (!vistos[ch]) { vistos[ch] = 1; lista.push({ n: tem ? Number(b.orig) : null, d: d, ch: ch }); }
    });
    if (lista.every(function (o) { return o.n != null; })) lista.sort(function (a, b) { return a.n - b.n; });
    lista.forEach(function (o, i) { if (o.n == null) o.n = i + 1; });
    return lista;
  }
  // linhas da tela: original i na linha i; cada cópia vai para uma linha longe do seu original, numa ordem misturada (sem padrão).
  // A mistura é sempre a mesma para o mesmo teste (sorteio com semente tirada dos próprios cartões), então todos os jovens veem igual.
  function linhasCartoes(p) {
    var os = originais(p), bls = p.blocos || [], R = Math.max(os.length, bls.length), linhas = [], i;
    for (i = 0; i < R; i++) linhas.push({ o: os[i] || null, k: null });
    var cps = bls.map(function (b, k) { var ch = chaveOrig(b), pos = 0; os.forEach(function (o, j) { if (o.ch === ch) pos = j; }); return { k: k, pos: pos }; });
    if (!R) return linhas;
    var sem = 2166136261; JSON.stringify(bls.map(function (b) { return b.copia; })).split('').forEach(function (c) { sem = Math.imul(sem ^ c.charCodeAt(0), 16777619); });
    function rnd() { sem = (sem + 0x6D2B79F5) | 0; var t = Math.imul(sem ^ (sem >>> 15), 1 | sem); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    function embaralha(a) { a = a.slice(); for (var j = a.length - 1; j > 0; j--) { var r = Math.floor(rnd() * (j + 1)), x = a[j]; a[j] = a[r]; a[r] = x; } return a; }
    function tenta(D) {
      var livre = []; for (var j = 0; j < R; j++) livre.push(j);
      var res = {}, ordem = embaralha(cps).sort(function (a, b) { return Math.abs(R / 2 - a.pos) > Math.abs(R / 2 - b.pos) ? -1 : 1; });   // pontas primeiro (têm menos opções)
      for (var q = 0; q < ordem.length; q++) {
        var c = ordem[q], ops = livre.filter(function (r) { return Math.abs(r - c.pos) >= D; });
        if (!ops.length) return null;
        var r = ops[Math.floor(rnd() * ops.length)]; res[r] = c; livre.splice(livre.indexOf(r), 1);
      }
      return res;
    }
    function misturado(res) { var d = {}, n = 0; Object.keys(res).forEach(function (r) { var x = r - res[r].pos; if (!d[x]) { d[x] = 1; n++; } }); return n >= Math.min(cps.length, Math.ceil(R / 2)); }
    var melhor = null;
    for (var D = Math.floor(R / 2); D >= 1 && !melhor; D--) for (var t = 0; t < 400; t++) { var res = tenta(D); if (res && (R < 4 || misturado(res))) { melhor = res; break; } }
    if (!melhor) { melhor = {}; cps.forEach(function (c, j) { melhor[j] = c; }); }
    Object.keys(melhor).forEach(function (r) { linhas[r].k = melhor[r].k; });
    return linhas;
  }
  function chaveOrig(b) { var d = b.original || {}; return b.orig != null && b.orig !== '' ? 'n' + b.orig : 'c' + ['banco', 'bandeira', 'numero', 'nome', 'validade', 'agencia', 'cvv'].map(function (c) { return norm(d[c]); }).join('|'); }
  /* ---------- Múltipla escolha (com figura e com texto de apoio) ---------- */
  var LETRAS = 'ABCDEFGH';
  function escolhaHTML(p) {
    var h = '', sec = null, tx = undefined, n = 0, aberto = false, textos = p.textos || [];
    function fecha() { if (aberto) { h += '</div></div>'; aberto = false; } }
    (p.questoes || []).forEach(function (q, k) {
      if ((q.secao || null) !== sec) { fecha(); sec = q.secao || null; if (sec) h += '<h3 class="tm-sec">' + esc(sec) + '</h3>'; tx = undefined; }
      var t = q.texto == null ? null : q.texto;
      if (t !== tx) {
        fecha(); tx = t;
        var T = t == null ? null : textos.filter(function (x) { return x.id === t; })[0];
        if (T) { h += '<div class="tm-port"><aside class="tm-apoio"><small>' + esc(T.titulo || 'TEXTO') + '</small><p>' + esc(T.texto) + '</p>' + (T.autor ? '<em>— ' + esc(T.autor) + '</em>' : '') + '</aside><div class="tm-qs">'; aberto = true; }
      }
      n++;
      var letras = !!q.so_letras, img = q.imagem ? '<div class="tm-fig"><img src="' + esc(q.imagem) + '" alt="Figura do exercício ' + n + '" data-zoom="1"></div>' : '';
      var alts = '<div class="tm-alts' + (letras ? ' tm-letras' : '') + '" data-q="' + k + '">' + (q.alternativas || []).map(function (a, j) {
        return '<button type="button" class="tm-alt" data-a="' + j + '"><b>' + LETRAS[j] + '</b>' + (letras ? '' : '<span>' + esc(a) + '</span>') + '</button>'; }).join('') + '</div>';
      h += '<div class="tm-q" data-item="' + k + '" data-qk="' + k + '"><h4><em>' + n + '.</em><span>' + esc(q.enunciado) + '</span>' + (q.pontos && +q.pontos !== 1 ? '<i class="tm-pt">' + q.pontos + ' pts</i>' : '') + '</h4>' +
        (img ? '<div class="tm-qimg">' + img + alts + '</div>' : alts) + '</div>';
    });
    fecha();
    return h;
  }
  function parteHTML(p, i) {
    var h = '<section class="tm-parte" data-parte="' + i + '">' + (p.titulo ? '<h3>' + esc(p.titulo) + '</h3>' : '') + (p.instrucoes ? '<div class="tm-instr">' + esc(p.instrucoes) + '</div>' : '');
    if (p.tipo === 'contar') {
      var cols = p.colunas || [], ops = p.opcoes && p.opcoes.length ? p.opcoes : ['–', '1', '2', '3', '4'];
      h += '<div class="tm-rolar"><table class="tm-lado sem-vista"><thead><tr><th colspan="' + cols.length + '">Original</th><th class="sep"></th><th colspan="' + cols.length + '" class="cp">Cópia</th><th>Nº de erros</th></tr>' +
        '<tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '<th class="sep"></th>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        (p.linhas || []).map(function (l, k) {
          return '<tr data-l="' + k + '">' + cols.map(function (c, j) { return '<td' + (j ? ' class="pq"' : ' class="art"') + '>' + esc((l.original || [])[j]) + '</td>'; }).join('') + '<td class="sep"></td>' +
            cols.map(function (c, j) { return '<td class="cpv' + (j ? ' pq' : ' art') + '">' + esc((l.copia || [])[j]) + '</td>'; }).join('') +
            '<td><div class="tm-ops" data-k="' + k + '">' + ops.map(function (o) { return '<button type="button" data-v="' + esc(o === '–' ? '-' : o) + '"' + (/\d/.test(o) ? ' class="num"' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (p.tipo === 'escolha') {
      return '<section class="tm-parte tm-escolha" data-parte="' + i + '">' + escolhaHTML(p) + '</section>';
    } else if (p.tipo === 'marcar') {
      // como no papel: originais em ordem à esquerda; cada cópia na linha mais distante possível do seu original; linhas alinhadas
      var L = linhasCartoes(p), n = 0;
      h += '<div class="tm-2col"><h4>Originais</h4><h4 class="cp">Cópias</h4>' + L.map(function (r) {
        var o = r.o ? '<div class="tm-o">' + cartao(r.o.d, false, 'Original ' + r.o.n) + '</div>' : '<div class="tm-o vazio"></div>';
        if (r.k == null) return o + '<div></div>';
        var b = p.blocos[r.k], l = letra(n++);
        return o + '<div class="tm-bloco tm-cpb"><div class="tm-bl">' + cartao(b.copia, true, 'Cópia ' + l) + '<div class="tm-campos">' +
          CAMPOS_CARTAO.map(function (c) { return '<div class="tm-cmp"><span>' + c[1] + '</span><button type="button" data-b="' + r.k + '" data-c="' + c[0] + '" aria-label="Marcar ' + c[1] + ' da cópia ' + l + ' como diferente">X</button></div>'; }).join('') + '</div></div></div>';
      }).join('') + '</div>';
    } else {
      h += '<div class="tm-instr">Este tipo de questão entra na etapa T3.</div>';
    }
    return h + '</section>';
  }
  // Desenha o teste dentro de "caixa". Devolve { respostas(), corrigir() }.
  function desenhar(caixa, est) {
    var resp = {};
    caixa.innerHTML = (est.instrucoes ? '<div class="tm-instr tm-geral">' + esc(est.instrucoes) + '</div>' : '') + (est.partes || []).map(parteHTML).join('');
    caixa.addEventListener('click', function (e) {
      var b = e.target.closest('.tm-ops button');
      if (b) {
        var pi = b.closest('[data-parte]').getAttribute('data-parte'), k = b.parentNode.getAttribute('data-k');
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
        resp[pi] = resp[pi] || {}; resp[pi][k] = b.getAttribute('data-v');
        caixa.querySelectorAll('[data-parte="' + pi + '"] tr[data-l]').forEach(function (tr) { tr.classList.toggle('atual', tr.getAttribute('data-l') === k); });
        return;
      }
      var al = e.target.closest('.tm-alt');
      if (al) {
        var pa = al.closest('[data-parte]').getAttribute('data-parte'), gq = al.parentNode, qk = gq.getAttribute('data-q');
        gq.querySelectorAll('.tm-alt').forEach(function (y) { y.classList.toggle('on', y === al); });
        resp[pa] = resp[pa] || {}; resp[pa][qk] = +al.getAttribute('data-a');
        var qe = al.closest('.tm-q'); if (qe) qe.classList.add('feito');
        caixa.querySelectorAll('.tm-q.atual').forEach(function (y) { y.classList.remove('atual'); }); if (qe) qe.classList.add('atual');
        return;
      }
      var zi = e.target.closest('img[data-zoom]');
      if (zi) { var f = document.createElement('div'); f.className = 'tm-zoom'; f.innerHTML = '<img src="' + zi.getAttribute('src') + '" alt=""><span>Toque para fechar</span>'; f.addEventListener('click', function () { f.remove(); }); document.body.appendChild(f); return; }
      var x = e.target.closest('.tm-cmp button');
      if (x) {
        var pj = x.closest('[data-parte]').getAttribute('data-parte'), bl = x.getAttribute('data-b'), c = x.getAttribute('data-c');
        x.classList.toggle('on'); resp[pj] = resp[pj] || {}; resp[pj][bl] = resp[pj][bl] || {}; resp[pj][bl][c] = x.classList.contains('on');
      }
    });
    // devolve as respostas salvas para a tela (retomar um teste interrompido)
    function restaurar(r) {
      resp = JSON.parse(JSON.stringify(r || {}));
      Object.keys(resp).forEach(function (pi) {
        var sec = caixa.querySelector('[data-parte="' + pi + '"]'); if (!sec) return; var x = resp[pi] || {};
        Object.keys(x).forEach(function (k) {
          if (typeof x[k] === 'object' && x[k]) Object.keys(x[k]).forEach(function (c) { var b = sec.querySelector('.tm-cmp button[data-b="' + k + '"][data-c="' + c + '"]'); if (b) b.classList.toggle('on', !!x[k][c]); });
          else if (typeof x[k] === 'number') { var gq = sec.querySelector('.tm-alts[data-q="' + k + '"]'); if (gq) { gq.querySelectorAll('.tm-alt').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-a') === x[k]); }); var qe = gq.closest('.tm-q'); if (qe) qe.classList.add('feito'); } }
          else { var g = sec.querySelector('.tm-ops[data-k="' + k + '"]'); if (g) g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === x[k]); }); }
        });
      });
    }
    // contagem genérica (para os tipos novos): itens marcados com data-item e a classe "feito"
    function contagem() { var its = caixa.querySelectorAll('[data-item]'); return { total: its.length, feitas: caixa.querySelectorAll('[data-item].feito').length }; }
    return { respostas: function () { return resp; }, corrigir: function () { return corrigir(est, resp); }, restaurar: restaurar, contagem: contagem };
  }

  window.CF = window.CF || {};
  window.CF.testesMotor = { desenhar: desenhar, corrigir: corrigir, totalParte: totalParte, diferencas: diferencas, CAMPOS_CARTAO: CAMPOS_CARTAO,
    total: function (est) { return (est.partes || []).reduce(function (a, p) { return a + totalParte(p); }, 0); } };
})();
