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
    return 0;
  }
  function corrigirParte(p, r) {   // r = respostas desta parte
    r = r || {};
    if (p.tipo === 'contar') return (p.linhas || []).reduce(function (a, l, i) { return a + (r[i] != null && norm(r[i]) === norm(l.gabarito) ? num(l.pontos == null ? 1 : l.pontos) : 0); }, 0);
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
  function cartao(d, copia) {
    d = d || {}; var bc = norm(d.banco), cor = CORES_BANCO[bc] || '#4a4444', claro = bc === 'BANCO DO BRASIL';
    return '<div class="tm-cc' + (copia ? ' copia' : '') + '" style="--bg:' + cor + ';' + (claro ? 'color:#1b2a6b' : '') + '"><span class="bc">' + esc(d.banco) + '</span><span class="bd">' + esc(d.bandeira) + '</span><div class="ch"></div>' +
      '<div class="nu">' + esc(d.numero) + '</div><div class="nm">' + esc(d.nome) + '</div><div class="rod"><span>Val ' + esc(d.validade) + '</span><span>Ag ' + esc(d.agencia) + '</span><span>CVV ' + esc(d.cvv) + '</span></div><span class="tag">' + (copia ? 'Cópia' : 'Original') + '</span></div>';
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
    } else if (p.tipo === 'marcar') {
      h += (p.blocos || []).map(function (b, k) {
        return '<div class="tm-bloco"><h4>Bloco ' + (k + 1) + '</h4><div class="tm-bl">' + cartao(b.original, false) + cartao(b.copia, true) + '<div class="tm-campos">' +
          CAMPOS_CARTAO.map(function (c) { return '<div class="tm-cmp"><span>' + c[1] + '</span><button type="button" data-b="' + k + '" data-c="' + c[0] + '" aria-label="Marcar ' + c[1] + ' do bloco ' + (k + 1) + ' como diferente">X</button></div>'; }).join('') + '</div></div></div>';
      }).join('');
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
      var x = e.target.closest('.tm-cmp button');
      if (x) {
        var pj = x.closest('[data-parte]').getAttribute('data-parte'), bl = x.getAttribute('data-b'), c = x.getAttribute('data-c');
        x.classList.toggle('on'); resp[pj] = resp[pj] || {}; resp[pj][bl] = resp[pj][bl] || {}; resp[pj][bl][c] = x.classList.contains('on');
      }
    });
    return { respostas: function () { return resp; }, corrigir: function () { return corrigir(est, resp); } };
  }

  window.CF = window.CF || {};
  window.CF.testesMotor = { desenhar: desenhar, corrigir: corrigir, totalParte: totalParte, diferencas: diferencas, CAMPOS_CARTAO: CAMPOS_CARTAO,
    total: function (est) { return (est.partes || []).reduce(function (a, p) { return a + totalParte(p); }, 0); } };
})();
