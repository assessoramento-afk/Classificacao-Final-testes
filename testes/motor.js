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
    if (p.tipo === 'tabela') return (p.linhas || []).reduce(function (a, l) { return a + edLinha(p, l).reduce(function (b, c) { return b + num(c.pontos == null ? 1 : c.pontos); }, 0) + (p.auto_num ? 1 : 0); }, 0);
    if (p.tipo === 'varias') return (p.opcoes || []).reduce(function (a, o) { return a + (o.correta ? num(o.pontos == null ? 1 : o.pontos) : 0); }, 0);
    if (p.tipo === 'grade') return (p.certas || []).reduce(function (a, c) { return a + c.length; }, 0) * num(p.pontos_acerto == null ? 1 : p.pontos_acerto);
    if (p.tipo === 'fotos') return (p.itens || []).filter(function (x) { return String(x.gabarito || '').trim(); }).length;
    if (p.tipo === 'aberta') return num(p.pontos || 0);
    if (p.tipo === 'memoria') return (p.pessoas || []).length * (p.campos || []).length;
    if (p.tipo === 'ordem') return (p.itens || []).length;
    if (p.tipo === 'agrupar') return (p.itens || []).length;
    return 0;
  }
  function corrigirParte(p, r) {   // r = respostas desta parte
    r = r || {};
    if (p.tipo === 'contar') return (p.linhas || []).reduce(function (a, l, i) { return a + (r[i] != null && norm(r[i]) === norm(l.gabarito) ? num(l.pontos == null ? 1 : l.pontos) : 0); }, 0);
    if (p.tipo === 'memoria') return (p.pessoas || []).reduce(function (a, pe, i) { var rr = r[i] || {}; return a + (p.campos || []).filter(function (c) { return memoriaCerta(rr[c[0]], pe[c[0]], (pe.aceitas || {})[c[0]]); }).length; }, 0);
    if (p.tipo === 'ordem') return Object.keys(r).filter(function (pos) { var it = r[pos]; return it != null && +(p.gabarito || [])[it] === +pos + 1; }).length;
    if (p.tipo === 'agrupar') { var esp = esperadoAgrupar(p), n = 0; Object.keys(r).forEach(function (g) { (r[g] || []).forEach(function (it, k) { if (it != null && esp[g] && esp[g][k] === +it) n++; }); }); return n; }
    if (p.tipo === 'varias') return (p.opcoes || []).reduce(function (a, o, k) { return a + (o.correta && r[k] ? num(o.pontos == null ? 1 : o.pontos) : 0); }, 0);
    if (p.tipo === 'grade') { var ng = 0; (p.certas || []).forEach(function (cs, li) { cs.forEach(function (ci) { if (r[li] && r[li][ci]) ng++; }); }); return ng * num(p.pontos_acerto == null ? 1 : p.pontos_acerto); }
    if (p.tipo === 'fotos') return Math.max(0, (p.itens || []).reduce(function (a, x, k) { var v = String(r[k] || '').trim(), g = String(x.gabarito || '').trim(); if (!g) return a - (v ? num(x.penalidade || 0) : 0); return a + (v === g ? 1 : 0); }, 0));
    if (p.tipo === 'aberta') return num(r.pontos_avaliador || 0);
    if (p.tipo === 'tabela') return (p.linhas || []).reduce(function (a, l, i) {
      var rr = r[i] || {}, ed = edLinha(p, l), algo = ed.some(function (c) { return String(rr[c.chave] || '').trim() !== ''; });
      if (!algo) return a;   // linha que o jovem nem começou não ganha ponto (nem nos campos que podem ficar vazios)
      return a + (p.auto_num && algo ? 1 : 0) + ed.filter(function (c) { return celulaCerta(p, c, rr[c.chave], (l.gabarito || {})[c.chave]); }).reduce(function (b, c) { return b + num(c.pontos == null ? 1 : c.pontos); }, 0);
    }, 0);
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
    pts = Math.round(pts * 100) / 100; tot = Math.round(tot * 100) / 100;
    return { pontos: pts, total: tot, nota: nota(est, pts, tot) };
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
  /* ---------- Marcar várias, grade, códigos nas fotos e resposta aberta (T3.4) ---------- */
  function variasHTML(p) {
    return (p.enunciado ? '<h4 class="tm-enun">' + esc(p.enunciado) + '</h4>' : '') + '<div class="tm-vs' + (p.visual === 'envelope' ? ' tm-env' : '') + '">' + (p.opcoes || []).map(function (o, k) {
      return '<button type="button" class="tm-v" data-item="' + k + '" data-vk="' + k + '"><span class="tm-vn">' + (k + 1) + '</span><span class="tm-vt">' + (o.linhas || [o.texto || '']).map(esc).join('<br>') + '</span><span class="tm-vx">X</span></button>'; }).join('') + '</div>';
  }
  function gradeHTML(p) {
    return (p.enunciado ? '<h4 class="tm-enun">' + esc(p.enunciado) + '</h4>' : '') + '<div class="tm-rolar"><table class="tm-grade sem-vista"><thead><tr><th>Situação</th>' + (p.colunas || []).map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (p.linhas || []).map(function (l, li) { return '<tr data-item="' + li + '"><td>' + (li + 1) + '. ' + esc(l) + '</td>' + (p.colunas || []).map(function (c, ci) { return '<td><button type="button" class="tm-gx" data-gl="' + li + '" data-gc="' + ci + '" aria-label="' + esc(c) + '">X</button></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fotosHTML(p) {
    return '<p class="tm-nota">Digite embaixo de cada foto o código do produto. Produto que não foi pedido fica em branco.</p><div class="tm-fotos">' + (p.itens || []).map(function (x, k) {
      return '<div class="tm-foto" data-item="' + k + '"><img src="' + esc(x.imagem) + '" alt="Produto ' + (k + 1) + '" data-zoom="1"><input class="tm-in tm-mono tm-fcod" data-fk="' + k + '" maxlength="' + (x.max || 14) + '" autocomplete="off" spellcheck="false" autocapitalize="characters" style="text-transform:uppercase" placeholder="código"></div>'; }).join('') + '</div>';
  }
  function abertaHTML(p) {
    return '<div class="tm-q" data-item="0"><h4><span>' + esc(p.pergunta || '') + '</span></h4><textarea class="tm-in tm-txt" data-aberta rows="7" placeholder="Escreva aqui a sua resposta…"></textarea><p class="tm-nota">Esta resposta é lida pelo avaliador.</p></div>';
  }

  /* ---------- Memorização (Habilidade de Retenção): correção flexível ---------- */
  function soLetras(t) { return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function distancia(a, b) { if (Math.abs(a.length - b.length) > 1) return 9; var d = []; for (var i = 0; i <= a.length; i++) { d[i] = [i]; for (var j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j; } return d[a.length][b.length]; }
  function memoriaCerta(r, certo, aceitas) {
    var x = soLetras(r); if (!x) return false;
    return [certo].concat(aceitas || []).some(function (c) { var y = soLetras(c); return x === y || (y.length > 4 && distancia(x, y) <= 1); });
  }
  function memoriaHTML(p, i) {
    var ps = p.pessoas || [], ord = ps.map(function (x, k) { return k; });
    if (p.embaralhar) { var sem = 7; ord.sort(function (a, b) { return ((a * 7919 + sem) % 13) - ((b * 7919 + sem) % 13); }); }
    var memo = '<div class="tm-memo" data-memo><div class="tm-memo-cab"><b>Memorize</b><span>nome, sobrenome e profissão de cada pessoa</span><em class="tm-memo-t">' + Math.floor((p.memo_seg || 180) / 60) + ':' + ('0' + ((p.memo_seg || 180) % 60)).slice(-2) + '</em></div><div class="tm-rostos">' +
      ps.map(function (x) { return '<div class="tm-rosto"><img src="' + esc(x.foto) + '" alt=""><b>' + esc(x.nome + ' ' + x.sobrenome) + '</b><span>' + esc(x.profissao) + '</span></div>'; }).join('') + '</div></div>';
    var resp = '<div class="tm-resp" data-resp hidden><div class="tm-rostos">' + ord.map(function (k) {
      return '<div class="tm-rosto tm-r" data-item="' + k + '"><img src="' + esc(ps[k].foto) + '" alt="Rosto ' + (k + 1) + '">' +
        (p.campos || []).map(function (c) { return '<label><span>' + esc(c[1]) + '</span><input class="tm-in" data-pes="' + k + '" data-cmp="' + c[0] + '" autocomplete="off" spellcheck="false" autocapitalize="words"></label>'; }).join('') + '</div>'; }).join('') + '</div></div>';
    return memo + resp;
  }
  /* ---------- Colocar em ordem (Priorização) ---------- */
  function ordemHTML(p) {
    var n = (p.itens || []).length;
    return (p.contexto && p.contexto.length ? '<div class="tm-ctx">' + p.contexto.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="tm-ord"><div class="tm-box"><h4><span>Tarefas</span><span class="tm-rest"></span></h4><div class="tm-livres"></div></div><div class="tm-box"><h4><span>Sua ordem</span><span>1ª = mais importante</span></h4>' +
      Array.apply(null, { length: n }).map(function (x, k) { return '<div class="tm-pos" data-item="' + k + '" data-pos="' + k + '"><i>' + (k + 1) + 'ª</i><span class="tm-pv"></span></div>'; }).join('') + '</div></div>';
  }
  /* ---------- Separar em grupos e ordenar (Organização de Produtos) ---------- */
  function esperadoAgrupar(p) {
    var e = {}; (p.grupos || []).forEach(function (g, gi) { e[gi] = (p.itens || []).map(function (x, k) { return { k: k, t: soLetras(x.texto) }; }).filter(function (x) { return p.itens[x.k].grupo === gi; }).sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; }).map(function (x) { return x.k; }); });
    return e;
  }
  function agruparHTML(p) {
    var v = p.vagas || 6;
    return '<div class="tm-prat"><h4><span>🗄️ Prateleira</span><span class="tm-rest"></span></h4><div class="tm-chips"></div></div><div class="tm-setores">' +
      (p.grupos || []).map(function (g, gi) { return '<div class="tm-setor" data-g="' + gi + '" style="--c:' + esc(g.cor || '#8a8486') + '"><header>' + esc(g.nome) + '</header><div class="tm-slots">' +
        Array.apply(null, { length: v }).map(function (x, k) { return '<div class="tm-slot" data-item="' + gi + '-' + k + '" data-g="' + gi + '" data-k="' + k + '"><i>' + (k + 1) + '</i><span></span></div>'; }).join('') + '</div></div>'; }).join('') + '</div>';
  }

  /* ---------- Preencher tabela (linhas ou cartões em sequência) ---------- */
  function editaveis(p) { return (p.colunas || []).filter(function (c) { return !c.fixo; }); }
  function edLinha(p, l) { return editaveis(p).filter(function (c) { return !l || !l.somente || l.somente.indexOf(c.chave) >= 0; }); }
  function hojeBR() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function semAcento(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function txtN(p, v) {
    var t = String(v == null ? '' : v).trim().replace(/\s+/g, ' ').toUpperCase();
    (p.equivalentes || []).forEach(function (e) { if (semAcento(t) === semAcento(String(e[0]).toUpperCase())) t = String(e[1]).toUpperCase(); });
    return p.exato ? t : semAcento(t);
  }
  function valorN(v) { var t = String(v == null ? '' : v).replace(/R\$|\s/g, ''); if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.'); var n = parseFloat(t); return isNaN(n) ? null : Math.round(n * 100); }
  function celulaCerta(p, c, r, g) {
    r = String(r == null ? '' : r).trim(); g = String(g == null ? '' : g).trim();
    if (g === '@hoje') g = hojeBR();
    if (c.tipo === 'qtd') return !!r && r.replace(/\s+/g, '').toLowerCase() === g.replace(/\s+/g, '').toLowerCase();
    if (!r) return !!c.vazio_ok && (!g || valorN(g) === 0);
    if (c.tipo === 'valor') {
      if (p.exato && !/^(\d{1,3}(\.\d{3})*|\d+),\d{2}$/.test(r)) return false;      // formato exato: vírgula e 2 casas (ponto de milhar opcional)
      return g !== '' && valorN(r) === valorN(g);
    }
    if (c.tipo === 'numero') return g !== '' && parseInt(r.replace(/\D/g, ''), 10) === parseInt(g.replace(/\D/g, ''), 10) && /^\d+$/.test(r.replace(/\s/g, ''));
    if (c.tipo === 'data') return p.exato ? r === g : r.replace(/\D/g, '') === g.replace(/\D/g, '');
    return txtN(p, r) === txtN(p, g);
  }
  var MODO = { codigo: 'text', texto: 'text', numero: 'numeric', valor: 'decimal', data: 'numeric' };
  function campoHTML(c, k) {
    if (c.tipo === 'lista') return '<select class="tm-in" data-lin="' + k + '" data-col="' + esc(c.chave) + '"><option value="">—</option>' + (c.opcoes || []).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
    return '<input class="tm-in' + (c.tipo === 'codigo' || c.tipo === 'numero' || c.tipo === 'valor' || c.tipo === 'data' ? ' tm-mono' : '') + '" data-lin="' + k + '" data-col="' + esc(c.chave) + '" inputmode="' + (MODO[c.tipo] || 'text') + '"' +
      (c.max ? ' maxlength="' + c.max + '"' : '') + (c.tipo === 'codigo' ? ' autocapitalize="characters" style="text-transform:uppercase"' : '') + ' autocomplete="off" spellcheck="false" placeholder="' + esc(c.tipo === 'data' ? 'DD/MM/AAAA' : c.tipo === 'valor' ? '0,00' : '') + '">';
  }
  function tabelaHTML(p) {
    var cols = p.colunas || [], h = '';
    var apoio = p.apoio ? '<aside class="tm-apoio"><small>' + esc(p.apoio.titulo || 'SITUAÇÃO') + '</small><p class="tm-apoio-t">' + esc(p.apoio.texto || '') + '</p>' + (p.apoio.aviso ? '<em>⚠️ ' + esc(p.apoio.aviso) + '</em>' : '') + '</aside>' : '';
    if (p.estilo === 'cartoes') {
      var grupos = []; cols.forEach(function (c) { var g = c.grupo || ''; if (grupos.indexOf(g) < 0) grupos.push(g); });
      var apoioC = p.apoio ? '<aside class="tm-apoio"><small>' + esc(p.apoio.titulo || 'SITUAÇÃO') + '</small><p class="tm-apoio-t">' + esc(p.apoio.texto || '') + '</p></aside>' : '';
      h += (p.linhas || []).map(function (l, k) {
        return '<div class="tm-lanc' + (p.sequencial && k ? ' trava' : '') + '" data-item="' + k + '" data-lanc="' + k + '"><header><em>' + (k + 1) + 'º</em><b>' + esc(p.rotulo_linha || 'Linha') + ((p.linhas || []).length > 1 ? ' ' + (k + 1) : '') + '</b><span class="tm-falta"></span></header>' +
          grupos.map(function (g) { var cs = cols.filter(function (c) { return (c.grupo || '') === g; }); return '<div class="tm-grupo">' + (g ? '<small>' + esc(g) + '</small>' : '') + '<div class="tm-gc" style="--n:' + Math.min(cs.length, 6) + '">' +
            cs.map(function (c) { return '<label class="tm-cp"><span>' + esc(c.rotulo) + (c.vazio_ok ? ' <i>· pode ficar vazio</i>' : '') + '</span>' + (c.fixo ? '<b>' + esc((l.valores || {})[c.chave]) + '</b>' : campoHTML(c, k)) + '</label>'; }).join('') + '</div></div>'; }).join('') + '</div>';
      }).join('');
      return apoioC ? '<div class="tm-port">' + apoioC + '<div>' + h + '</div></div>' : h;
    }
    var tab = (p.exemplo ? '<div class="tm-ex"><small>EXEMPLO</small><code>' + esc(p.exemplo.de) + '</code><span>→</span><code>' + esc(p.exemplo.para) + '</code></div>' : '') +
      '<div class="tm-rolar"><table class="tm-tab sem-vista"><thead><tr><th>#</th>' + cols.map(function (c) { return '<th>' + esc(c.rotulo) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (p.linhas || []).map(function (l, k) { var so = l.somente; return '<tr data-item="' + k + '"' + (so ? ' class="tm-tot"' : '') + '><td class="tm-n">' + (so ? '' : k + 1) + '</td>' + cols.map(function (c) { var vf = (l.valores || {})[c.chave];
        return '<td>' + (c.fixo || (so && so.indexOf(c.chave) < 0) ? (vf ? '<b class="tm-fixo' + (c.tipo === 'texto' ? ' tm-fixo-t' : '') + '">' + esc(vf) + '</b>' : '') : campoHTML(c, k)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    return apoio ? '<div class="tm-port' + (cols.length > 5 ? ' tm-empilha' : '') + '">' + apoio + '<div>' + tab + '</div></div>' : tab;
  }

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
    } else if (p.tipo === 'varias') {
      return '<section class="tm-parte tm-varias" data-parte="' + i + '">' + variasHTML(p) + '</section>';
    } else if (p.tipo === 'grade') {
      return '<section class="tm-parte tm-gradeP" data-parte="' + i + '">' + gradeHTML(p) + '</section>';
    } else if (p.tipo === 'fotos') {
      return '<section class="tm-parte tm-fotosP" data-parte="' + i + '">' + fotosHTML(p) + '</section>';
    } else if (p.tipo === 'aberta') {
      return '<section class="tm-parte tm-abertaP" data-parte="' + i + '">' + abertaHTML(p) + '</section>';
    } else if (p.tipo === 'memoria') {
      return '<section class="tm-parte tm-memoria" data-parte="' + i + '">' + memoriaHTML(p, i) + '</section>';
    } else if (p.tipo === 'ordem') {
      return '<section class="tm-parte tm-ordem" data-parte="' + i + '">' + ordemHTML(p) + '</section>';
    } else if (p.tipo === 'agrupar') {
      return '<section class="tm-parte tm-agrupar" data-parte="' + i + '">' + agruparHTML(p) + '</section>';
    } else if (p.tipo === 'tabela') {
      return '<section class="tm-parte tm-tabela" data-parte="' + i + '">' + tabelaHTML(p) + '</section>';
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
    if (est.abas && (est.partes || []).length > 1) {
      caixa.insertAdjacentHTML('afterbegin', '<nav class="tm-abas">' + est.partes.map(function (p, i) { return '<button type="button" class="tm-aba' + (i ? '' : ' on') + '" data-aba="' + i + '">' + esc(p.titulo || ('Parte ' + (i + 1))) + '</button>'; }).join('') + '</nav>');
      caixa.querySelectorAll('.tm-parte').forEach(function (x) { x.hidden = x.getAttribute('data-parte') !== '0'; });
    }
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
          if (typeof x[k] === 'object' && x[k] && sec.classList.contains('tm-tabela')) { Object.keys(x[k]).forEach(function (c) { var e2 = sec.querySelector('.tm-in[data-lin="' + k + '"][data-col="' + c + '"]'); if (e2) e2.value = x[k][c]; }); }
          else if (typeof x[k] === 'object' && x[k]) Object.keys(x[k]).forEach(function (c) { var b = sec.querySelector('.tm-cmp button[data-b="' + k + '"][data-c="' + c + '"]'); if (b) b.classList.toggle('on', !!x[k][c]); });
          else if (typeof x[k] === 'number') { var gq = sec.querySelector('.tm-alts[data-q="' + k + '"]'); if (gq) { gq.querySelectorAll('.tm-alt').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-a') === x[k]); }); var qe = gq.closest('.tm-q'); if (qe) qe.classList.add('feito'); } }
          else { var g = sec.querySelector('.tm-ops[data-k="' + k + '"]'); if (g) g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === x[k]); }); }
        });
      });
      caixa.querySelectorAll('.tm-tabela').forEach(revisarTabela);
      restaurarNovos();
      caixa.querySelectorAll('.tm-ordem').forEach(desenhaOrdem);
      caixa.querySelectorAll('.tm-agrupar').forEach(desenhaAgrupar);
      caixa.querySelectorAll('.tm-memoria').forEach(function (sec) {
        var pi = sec.getAttribute('data-parte'), x = resp[pi] || {}; iniciarMemoria(sec, true);
        Object.keys(x).forEach(function (k) { Object.keys(x[k] || {}).forEach(function (c) { var e2 = sec.querySelector('.tm-in[data-pes="' + k + '"][data-cmp="' + c + '"]'); if (e2) e2.value = x[k][c]; }); var it = sec.querySelector('[data-item="' + k + '"]'); if (it) it.classList.toggle('feito', [].every.call(it.querySelectorAll('.tm-in'), function (y) { return y.value.trim(); })); });
      });
    }
    /* Ordem, Agrupar e Memorização: estado na tela */
    var selOrd = {}, selAgr = {};
    function parteDe(sec) { return (est.partes || [])[sec.getAttribute('data-parte')]; }
    function desenhaOrdem(sec) {
      var pi = sec.getAttribute('data-parte'), p = parteDe(sec), r = resp[pi] || {}, usados = {};
      Object.keys(r).forEach(function (pos) { if (r[pos] != null) usados[r[pos]] = pos; });
      var liv = (p.itens || []).map(function (t, k) { return k; }).filter(function (k) { return usados[k] == null; });
      sec.querySelector('.tm-livres').innerHTML = liv.length ? liv.map(function (k) { return '<button type="button" class="tm-livre' + (selOrd[pi] === k ? ' sel' : '') + '" data-it="' + k + '">' + esc(p.itens[k]) + '</button>'; }).join('') : '<p class="tm-ok">✓ Todas colocadas. Confira a ordem e finalize.</p>';
      sec.querySelector('.tm-rest').textContent = liv.length + ' restantes';
      sec.querySelectorAll('.tm-pos').forEach(function (d) { var pos = d.getAttribute('data-pos'), it = r[pos]; d.classList.toggle('feito', it != null); d.classList.toggle('alvo', selOrd[pi] != null && it == null);
        d.querySelector('.tm-pv').textContent = it != null ? p.itens[it] : (selOrd[pi] != null ? 'toque para colocar aqui' : ''); });
    }
    function desenhaAgrupar(sec) {
      var pi = sec.getAttribute('data-parte'), p = parteDe(sec), r = resp[pi] || {}, usados = {};
      Object.keys(r).forEach(function (g) { (r[g] || []).forEach(function (it) { if (it != null) usados[it] = 1; }); });
      var liv = (p.itens || []).map(function (t, k) { return k; }).filter(function (k) { return !usados[k]; });
      sec.querySelector('.tm-chips').innerHTML = liv.length ? liv.map(function (k) { return '<button type="button" class="tm-chip' + (selAgr[pi] === k ? ' sel' : '') + '" data-it="' + k + '">' + esc(p.itens[k].texto) + '</button>'; }).join('') : '<p class="tm-ok">✓ Prateleira vazia. Confira os setores e finalize.</p>';
      sec.querySelector('.tm-rest').textContent = liv.length + ' para organizar';
      sec.querySelectorAll('.tm-setor').forEach(function (st) { var g = st.getAttribute('data-g'), cheio = (r[g] || []).filter(function (x) { return x != null; }).length >= (p.vagas || 6); st.classList.toggle('alvo', selAgr[pi] != null && !cheio); });
      sec.querySelectorAll('.tm-slot').forEach(function (d) { var it = (r[d.getAttribute('data-g')] || [])[d.getAttribute('data-k')]; d.classList.toggle('feito', it != null); d.querySelector('span').textContent = it != null ? p.itens[it].texto : ''; });
    }
    function iniciarMemoria(sec, pular) {
      var p = parteDe(sec), memo = sec.querySelector('[data-memo]'), rp = sec.querySelector('[data-resp]');
      function abrirResp() { if (memo) memo.hidden = true; rp.hidden = false; sec.classList.add('respondendo'); }
      if (pular) { abrirResp(); return; }
      var fim = Date.now() + (p.memo_seg || 180) * 1000, tt = sec.querySelector('.tm-memo-t');
      var iv = setInterval(function () { var s2 = Math.max(0, Math.round((fim - Date.now()) / 1000)); if (tt) tt.textContent = Math.floor(s2 / 60) + ':' + ('0' + s2 % 60).slice(-2); if (s2 <= 0 || !document.body.contains(sec)) { clearInterval(iv); abrirResp(); } }, 500);
    }
    caixa.querySelectorAll('.tm-ordem').forEach(desenhaOrdem);
    caixa.querySelectorAll('.tm-agrupar').forEach(desenhaAgrupar);
    caixa.querySelectorAll('.tm-memoria').forEach(function (sec) { iniciarMemoria(sec, false); });
    caixa.addEventListener('click', function (e) {
      var sec = e.target.closest('.tm-ordem'), pi;
      if (sec) {
        pi = sec.getAttribute('data-parte'); resp[pi] = resp[pi] || {};
        var li = e.target.closest('.tm-livre'); if (li) { var k = +li.getAttribute('data-it'); selOrd[pi] = selOrd[pi] === k ? null : k; desenhaOrdem(sec); return; }
        var po = e.target.closest('.tm-pos'); if (po) { var pos = po.getAttribute('data-pos');
          if (selOrd[pi] != null) { resp[pi][pos] = selOrd[pi]; selOrd[pi] = null; } else if (resp[pi][pos] != null) delete resp[pi][pos];
          desenhaOrdem(sec); } return;
      }
      sec = e.target.closest('.tm-agrupar');
      if (sec) {
        pi = sec.getAttribute('data-parte'); resp[pi] = resp[pi] || {}; var p = parteDe(sec), v = p.vagas || 6;
        var ch = e.target.closest('.tm-chip'); if (ch) { var k2 = +ch.getAttribute('data-it'); selAgr[pi] = selAgr[pi] === k2 ? null : k2; desenhaAgrupar(sec); return; }
        var sl = e.target.closest('.tm-slot'), st = e.target.closest('.tm-setor'); if (!st) return;
        var g = st.getAttribute('data-g'), arr = resp[pi][g] = resp[pi][g] || Array.apply(null, { length: v }).map(function () { return null; });
        if (selAgr[pi] != null) {
          var alvoK = sl && arr[+sl.getAttribute('data-k')] == null ? +sl.getAttribute('data-k') : arr.indexOf(null);
          if (alvoK >= 0) { arr[alvoK] = selAgr[pi]; selAgr[pi] = null; }
        } else if (sl && arr[+sl.getAttribute('data-k')] != null) arr[+sl.getAttribute('data-k')] = null;
        desenhaAgrupar(sec); return;
      }
    });
    caixa.addEventListener('input', function (e) {
      var x = e.target.closest('.tm-memoria .tm-in'); if (!x) return;
      var sec = x.closest('[data-parte]'), pi = sec.getAttribute('data-parte'), k = x.getAttribute('data-pes');
      resp[pi] = resp[pi] || {}; resp[pi][k] = resp[pi][k] || {}; resp[pi][k][x.getAttribute('data-cmp')] = x.value;
      var it = x.closest('[data-item]'); it.classList.toggle('feito', [].every.call(it.querySelectorAll('.tm-in'), function (y) { return y.value.trim(); }));
    });
    /* Marcar várias, grade, fotos e resposta aberta */
    caixa.addEventListener('click', function (e) {
      var v = e.target.closest('.tm-v');
      if (v) { var sv = v.closest('[data-parte]'), pv = sv.getAttribute('data-parte'), k = v.getAttribute('data-vk'); resp[pv] = resp[pv] || {}; resp[pv][k] = !resp[pv][k]; if (!resp[pv][k]) delete resp[pv][k]; v.classList.toggle('on', !!resp[pv][k]); v.classList.toggle('feito', !!resp[pv][k]); return; }
      var gx = e.target.closest('.tm-gx');
      if (gx) { var sg = gx.closest('[data-parte]'), pg = sg.getAttribute('data-parte'), li = gx.getAttribute('data-gl'), ci = gx.getAttribute('data-gc'); resp[pg] = resp[pg] || {}; resp[pg][li] = resp[pg][li] || {};
        resp[pg][li][ci] = !resp[pg][li][ci]; if (!resp[pg][li][ci]) delete resp[pg][li][ci]; gx.classList.toggle('on', !!resp[pg][li][ci]);
        gx.closest('tr').classList.toggle('feito', Object.keys(resp[pg][li]).length > 0); return; }
      var ab = e.target.closest('.tm-aba');
      if (ab) { var n = ab.getAttribute('data-aba'); caixa.querySelectorAll('.tm-aba').forEach(function (x) { x.classList.toggle('on', x === ab); }); caixa.querySelectorAll('.tm-parte').forEach(function (x) { x.hidden = x.getAttribute('data-parte') !== n; }); caixa.scrollTop = 0; try { window.scrollTo(0, 0); } catch (er) {} }
    });
    caixa.addEventListener('input', function (e) {
      var f = e.target.closest('.tm-fcod');
      if (f) { var sf = f.closest('[data-parte]'), pf = sf.getAttribute('data-parte'), pos = f.selectionStart; f.value = f.value.toUpperCase(); try { f.setSelectionRange(pos, pos); } catch (er) {} resp[pf] = resp[pf] || {}; resp[pf][f.getAttribute('data-fk')] = f.value; f.closest('[data-item]').classList.toggle('feito', !!f.value.trim()); return; }
      var t = e.target.closest('[data-aberta]');
      if (t) { var st = t.closest('[data-parte]'), pt = st.getAttribute('data-parte'); resp[pt] = resp[pt] || {}; resp[pt].texto = t.value; t.closest('[data-item]').classList.toggle('feito', !!t.value.trim()); }
    });
    function restaurarNovos() {
      caixa.querySelectorAll('.tm-varias').forEach(function (sv) { var x = resp[sv.getAttribute('data-parte')] || {}; sv.querySelectorAll('.tm-v').forEach(function (v) { var on = !!x[v.getAttribute('data-vk')]; v.classList.toggle('on', on); v.classList.toggle('feito', on); }); });
      caixa.querySelectorAll('.tm-gradeP').forEach(function (sg) { var x = resp[sg.getAttribute('data-parte')] || {}; sg.querySelectorAll('.tm-gx').forEach(function (g) { g.classList.toggle('on', !!(x[g.getAttribute('data-gl')] || {})[g.getAttribute('data-gc')]); }); sg.querySelectorAll('tr[data-item]').forEach(function (tr) { tr.classList.toggle('feito', Object.keys(x[tr.getAttribute('data-item')] || {}).length > 0); }); });
      caixa.querySelectorAll('.tm-fotosP').forEach(function (sf) { var x = resp[sf.getAttribute('data-parte')] || {}; sf.querySelectorAll('.tm-fcod').forEach(function (f) { f.value = x[f.getAttribute('data-fk')] || ''; f.closest('[data-item]').classList.toggle('feito', !!f.value.trim()); }); });
      caixa.querySelectorAll('.tm-abertaP').forEach(function (sa) { var x = resp[sa.getAttribute('data-parte')] || {}, t = sa.querySelector('[data-aberta]'); t.value = x.texto || ''; t.closest('[data-item]').classList.toggle('feito', !!t.value.trim()); });
    }
    // Preencher tabela: guarda o que foi digitado, marca linhas completas e destrava a próxima (em sequência)
    function revisarTabela(sec) {
      var pi = sec.getAttribute('data-parte'), p = (est.partes || [])[pi]; if (!p || p.tipo !== 'tabela') return;
      var aberto = true;
      sec.querySelectorAll('[data-item]').forEach(function (it, k) {
        var ed = edLinha(p, (p.linhas || [])[k]), rr = (resp[pi] || {})[k] || {}, falta = ed.filter(function (c) { return !c.vazio_ok && !String(rr[c.chave] || '').trim(); });
        var ok = falta.length === 0; it.classList.toggle('feito', ok);
        if (p.sequencial) {
          if (k > 0 && aberto) it.setAttribute('data-aberto', '1');
          var trav = k > 0 && !it.getAttribute('data-aberto'); it.classList.toggle('trava', trav);
          it.querySelectorAll('.tm-in').forEach(function (x) { x.disabled = trav; });
          var fl = it.querySelector('.tm-falta'); if (fl) fl.textContent = ok ? '✓ Completo' : trav ? '🔒 Termine o anterior para liberar' : 'Faltam: ' + falta.slice(0, 3).map(function (c) { return c.rotulo; }).join(', ') + (falta.length > 3 ? ' e mais ' + (falta.length - 3) : '');
          aberto = aberto && ok;
        }
      });
    }
    caixa.addEventListener('input', function (e) {
      var x = e.target.closest('.tm-tabela .tm-in'); if (!x) return;
      var pi = x.closest('[data-parte]').getAttribute('data-parte'), k = x.getAttribute('data-lin'), c = x.getAttribute('data-col');
      if (x.tagName === 'INPUT' && x.style.textTransform === 'uppercase') { var pos = x.selectionStart; x.value = x.value.toUpperCase(); try { x.setSelectionRange(pos, pos); } catch (er) {} }
      resp[pi] = resp[pi] || {}; resp[pi][k] = resp[pi][k] || {}; resp[pi][k][c] = x.value;
      revisarTabela(x.closest('[data-parte]'));
    });
    caixa.addEventListener('change', function (e) { var x = e.target.closest('select.tm-in'); if (x) x.dispatchEvent(new Event('input', { bubbles: true })); });
    caixa.querySelectorAll('.tm-tabela').forEach(revisarTabela);
    // contagem genérica (para os tipos novos): itens marcados com data-item e a classe "feito"
    function contagem() { var its = caixa.querySelectorAll('[data-item]'); return { total: its.length, feitas: caixa.querySelectorAll('[data-item].feito').length }; }
    return { respostas: function () { return resp; }, corrigir: function () { return corrigir(est, resp); }, restaurar: restaurar, contagem: contagem };
  }

  window.CF = window.CF || {};
  window.CF.testesMotor = { desenhar: desenhar, corrigir: corrigir, nota: nota, totalParte: totalParte, diferencas: diferencas, CAMPOS_CARTAO: CAMPOS_CARTAO,
    total: function (est) { return Math.round((est.partes || []).reduce(function (a, p) { return a + totalParte(p); }, 0) * 100) / 100; } };
})();
