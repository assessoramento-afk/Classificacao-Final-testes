/* =====================================================================
   Classificação Final · views/graficos.js
   #/painel · tela inicial em Gráficos (substitui o antigo Painel de cartões).
   Filtros: período (últimos 3 meses · este ano · tudo) e empresa.
   Cada gráfico baixa em PNG; "Baixar todos" gera um PDF com tudo.
   Os gráficos são SVG desenhados aqui, com as cores do tema na tela e
   sempre em fundo claro nos arquivos baixados.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var CORES = { aprovado: '#3FA66B', backup: '#E9B500', reprovado: '#D9534F', desistencia: '#8a8486' };
  var NOMES = { aprovado: 'Aprovados', backup: 'Backup', reprovado: 'Reprovados', desistencia: 'Desistências' };
  var CLARO = { texto: '#272323', texto2: '#4f4949', texto3: '#8a8486', borda: '#e3dedd', trilho: '#eeeae9', fundo: '#ffffff' };
  var FT = "Poppins, 'Segoe UI', Arial, sans-serif";
  var MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hoje() { return iso(new Date()); }
  function dataBR(s) { var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function n1(v) { return v == null ? '—' : Number(v).toFixed(1).replace('.', ','); }
  function paletaTela() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, d) { var x = cs.getPropertyValue(n).trim(); return x || d; }
    return { texto: v('--texto', '#272323'), texto2: v('--texto-2', '#4f4949'), texto3: v('--texto-3', '#8a8486'), borda: v('--borda', '#e3dedd'), trilho: v('--surface-2', '#eeeae9'), fundo: 'transparent' };
  }
  function t(x, y, txt, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-family="' + FT + '" font-size="' + (o.tam || 11) + '"' + (o.neg ? ' font-weight="700"' : '') +
      ' text-anchor="' + (o.al || 'start') + '" fill="' + (o.cor || '#000') + '">' + esc(txt) + '</text>';
  }

  /* ---------- Gráficos (SVG) ---------- */
  function gResultado(procs, P) {   // opção A: colunas lado a lado, com as quantidades
    var keys = ['aprovado', 'backup', 'reprovado', 'desistencia'];
    if (!procs.length) return null;
    var max = 4; procs.forEach(function (p) { keys.forEach(function (k) { max = Math.max(max, p.cont[k]); }); });
    max = Math.ceil(max / 4) * 4;
    var gw = Math.max(96, Math.min(130, 560 / procs.length)), bw = Math.min(20, (gw - 18) / 4), W = 50 + procs.length * gw + 10, H = 250, base = 200, alt = 175, s = '';
    for (var i = 0; i <= 4; i++) { var y = base - alt * i / 4; s += '<line x1="42" x2="' + (W - 6) + '" y1="' + y + '" y2="' + y + '" stroke="' + P.borda + '"/>' + t(36, y + 3.5, String(max * i / 4), { tam: 10, al: 'end', cor: P.texto3 }); }
    procs.forEach(function (p, k) {
      var x0 = 52 + k * gw + (gw - bw * 4 - 9) / 2;
      keys.forEach(function (key, j) {
        var v = p.cont[key], h = v / max * alt, x = x0 + j * (bw + 3);
        s += '<rect x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(h, 0.5).toFixed(1) + '" rx="3" fill="' + CORES[key] + '"/>';
        s += t((x + bw / 2).toFixed(1), (base - h - 4).toFixed(1), String(v), { tam: 10, al: 'middle', neg: true, cor: P.texto });
      });
      var cx = (52 + k * gw + gw / 2).toFixed(1);
      s += t(cx, base + 17, p.empresa.length > 16 ? p.empresa.slice(0, 15) + '…' : p.empresa, { tam: 10.5, al: 'middle', cor: P.texto2 });
      s += t(cx, base + 30, p.vaga.length > 18 ? p.vaga.slice(0, 17) + '…' : p.vaga, { tam: 9.5, al: 'middle', cor: P.texto3 });
    });
    var lx = 52; keys.forEach(function (k) { s += '<rect x="' + lx + '" y="' + (H - 8) + '" width="10" height="10" rx="2" fill="' + CORES[k] + '"/>' + t(lx + 15, H + 1, NOMES[k], { tam: 11, cor: P.texto2 }); lx += 26 + NOMES[k].length * 6.6; });
    return { svg: s, w: W, h: H + 8 };
  }
  function gMeses(serie, P) {
    if (!serie.length) return null;
    var W = 620, H = 210, base = 170, alt = 140, max = 4; serie.forEach(function (x) { max = Math.max(max, x.v); }); max = Math.ceil(max / 4) * 4;
    var passo = serie.length > 1 ? (W - 80) / (serie.length - 1) : 0, s = '';
    for (var i = 0; i <= 4; i++) { var y = base - alt * i / 4; s += '<line x1="36" x2="' + (W - 10) + '" y1="' + y + '" y2="' + y + '" stroke="' + P.borda + '"/>' + t(30, y + 3.5, String(max * i / 4), { tam: 10, al: 'end', cor: P.texto3 }); }
    var pts = serie.map(function (x, k) { return [50 + k * passo, base - x.v / max * alt]; });
    s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#ee7330" stroke-width="3" stroke-linejoin="round"/>';
    serie.forEach(function (x, k) {
      s += '<circle cx="' + pts[k][0].toFixed(1) + '" cy="' + pts[k][1].toFixed(1) + '" r="4.5" fill="#ee7330"/>';
      s += t(pts[k][0].toFixed(1), (pts[k][1] - 9).toFixed(1), String(x.v), { tam: 10.5, al: 'middle', neg: true, cor: P.texto });
      s += t(pts[k][0].toFixed(1), base + 20, x.rot, { tam: 10, al: 'middle', cor: P.texto3 });
    });
    return { svg: s, w: W, h: H };
  }
  function gAreas(areas, P) {
    if (!areas.length) return null;
    var W = 420, lh = 30, H = areas.length * lh + 10, s = '';
    areas.forEach(function (a, i) {
      var y = 10 + i * lh;
      s += t(0, y + 12, a.nome.length > 16 ? a.nome.slice(0, 15) + '…' : a.nome, { tam: 11.5, cor: P.texto2 });
      s += '<rect x="130" y="' + (y + 3) + '" width="230" height="10" rx="5" fill="' + P.trilho + '"/>';
      s += '<rect x="130" y="' + (y + 3) + '" width="' + (a.v / 5 * 230).toFixed(1) + '" height="10" rx="5" fill="#ee7330"/>';
      s += t(W - 4, y + 13, n1(a.v), { tam: 12, al: 'end', neg: true, cor: P.texto });
    });
    return { svg: s, w: W, h: H };
  }
  function gEmpresa(ac, P) {
    var partes = [[ac.contratado, '#3FA66B', 'contratados'], [ac.nao, '#D9534F', 'não contratados'], [ac.andamento, '#ee7330', 'em acompanhamento']];
    var tot = ac.contratado + ac.nao + ac.andamento; if (!tot) return null;
    var cx = 80, cy = 80, r = 58, a0 = -90, s = '';
    partes.forEach(function (p) {
      if (!p[0]) return;
      var a1 = a0 + 360 * p[0] / tot;
      if (p[0] === tot) { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + p[1] + '" stroke-width="22"/>'; return; }
      var x0 = cx + r * Math.cos(a0 * Math.PI / 180), y0 = cy + r * Math.sin(a0 * Math.PI / 180), x1 = cx + r * Math.cos(a1 * Math.PI / 180), y1 = cy + r * Math.sin(a1 * Math.PI / 180);
      s += '<path d="M' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + r + ',' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + x1.toFixed(1) + ',' + y1.toFixed(1) + '" fill="none" stroke="' + p[1] + '" stroke-width="22"/>';
      a0 = a1;
    });
    var fim = ac.contratado + ac.nao;
    s += t(cx, cy + 2, fim ? pct(ac.contratado, fim) + '%' : '—', { tam: 22, al: 'middle', neg: true, cor: P.texto });
    s += t(cx, cy + 18, 'contratados', { tam: 10, al: 'middle', cor: P.texto3 });
    partes.forEach(function (p, i) { s += '<rect x="178" y="' + (52 + i * 24) + '" width="11" height="11" rx="2" fill="' + p[1] + '"/>' + t(196, 62 + i * 24, p[0] + ' ' + p[2], { tam: 12, cor: P.texto2 }); });
    return { svg: s, w: 360, h: 160 };
  }
  function svgTexto(g, fundo) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + g.w + ' ' + g.h + '" width="' + g.w + '" height="' + g.h + '">' +
      (fundo ? '<rect width="100%" height="100%" fill="' + fundo + '"/>' : '') + g.svg + '</svg>';
  }
  // SVG → PNG (fundo branco, título no topo), em alta resolução
  function png(g, titulo, sub) {
    return new Promise(function (ok, falha) {
      var esc2 = 2, mt = 64, pad = 24, W = g.w + pad * 2, H = g.h + mt + pad;
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas'); cv.width = W * esc2; cv.height = H * esc2;
        var cx = cv.getContext('2d'); cx.scale(esc2, esc2);
        cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H);
        cx.fillStyle = '#ee7330'; cx.fillRect(0, 0, 5, H);
        cx.fillStyle = '#272323'; cx.font = 'bold 17px ' + FT; cx.fillText(titulo, pad, 30);
        cx.fillStyle = '#8a8486'; cx.font = '12px ' + FT; cx.fillText(sub, pad, 49);
        cx.drawImage(img, pad, mt, g.w, g.h);
        cv.toBlob(function (b) { ok({ blob: b, url: cv.toDataURL('image/png'), w: W, h: H }); }, 'image/png');
      };
      img.onerror = function () { falha(new Error('Não foi possível gerar a imagem do gráfico.')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgTexto(g, '#ffffff'));
    });
  }

  /* ---------- Tela ---------- */
  window.CF.telas = window.CF.telas || {};
  window.CF.telas.painel = async function (area, ctx) {
    var p = ctx.perfil, admin = p.perfil === 'admin' && (!window.CF.perm || window.CF.perm.pode('graficos_acomp'));
    var primeiroNome = String(p.nome || '').split(' ')[0] || '';
    var st = { periodo: 'ano', empresa: '' }, base;
    area.innerHTML = '<div id="gf"><div class="girando" style="margin:40px auto"></div></div>';
    var box = area.querySelector('#gf');
    try {
      var r = await Promise.all([dados.agenda.carregarTudo(), dados.jovens.todasParticipacoes(),
        admin ? window.CF.sb.rpc('acomp_listar', { p_proc: null }).then(function (x) { return x.error ? [] : x.data; }) : Promise.resolve([])]);
      base = { ag: r[0], parts: r[1], acomp: r[2] || [], cls: {} };
    } catch (e) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    var ag = base.ag, procs = ag.processos || [], empresas = ag.empresas || [];
    function nomeEmp(id) { var e = empresas.filter(function (x) { return x.id === id; })[0]; return e ? (e.nome_fantasia || e.razao_social || '') : ''; }
    function diasTurma(tid) { return ag.dias.filter(function (d) { return d.turma_id === tid; }).map(function (d) { return String(d.data).slice(0, 10); }).sort(); }
    function inicioProc(pid) { var ds = []; ag.turmas.filter(function (x) { return x.processo_id === pid; }).forEach(function (x) { ds = ds.concat(diasTurma(x.id)); }); ds.sort(); return ds[0] || null; }
    function desde() {
      var d = new Date();
      if (st.periodo === '3m') { d.setMonth(d.getMonth() - 3); return iso(d); }
      if (st.periodo === 'ano') return d.getFullYear() + '-01-01';
      return '0000-01-01';
    }
    // classificação dos processos com resultado (revisão/liberado), carregada uma vez
    var comResultado = procs.filter(function (x) { return x.situacao === 'revisao' || x.situacao === 'liberado'; });
    await Promise.all(comResultado.map(function (x) { return dados.classificacao.carregar(x.id).then(function (c) { base.cls[x.id] = c; }).catch(function () { /* sem classificação */ }); }));

    function calcular() {
      var d0 = desde(), h = hoje();
      var ps = procs.filter(function (x) { return (!st.empresa || x.empresa_id === st.empresa) && x.situacao !== 'cancelado'; });
      var noPeriodo = ps.filter(function (x) { var i = inicioProc(x.id); return i ? i >= d0 : st.periodo === 'tudo'; });
      var turmasF = ag.turmas.filter(function (x) { return ps.some(function (y) { return y.id === x.processo_id; }); });
      // jovens avaliados: participantes de turmas já realizadas no período
      var porMes = {}, avaliados = 0;
      turmasF.forEach(function (x) {
        var ds = diasTurma(x.id); if (!ds.length || ds[0] > h || ds[0] < d0) return;
        var n = base.parts.filter(function (y) { return y.turma_id === x.id; }).length; avaliados += n;
        var m = ds[0].slice(0, 7); porMes[m] = (porMes[m] || 0) + n;
      });
      var meses = [], ini = st.periodo === 'tudo' ? (Object.keys(porMes).sort()[0] || h.slice(0, 7)) : d0.slice(0, 7), cur = new Date(Number(ini.slice(0, 4)), Number(ini.slice(5, 7)) - 1, 1);
      while (iso(cur).slice(0, 7) <= h.slice(0, 7) && meses.length < 36) { var k = iso(cur).slice(0, 7); meses.push({ rot: MESES[cur.getMonth()] + (st.periodo === 'tudo' || st.periodo === '3m' ? '/' + k.slice(2, 4) : ''), v: porMes[k] || 0 }); cur.setMonth(cur.getMonth() + 1); }
      // resultado por processo (os 8 mais recentes com classificação)
      var res = noPeriodo.filter(function (x) { return base.cls[x.id]; }).sort(function (a, b) { return (inicioProc(b.id) || '').localeCompare(inicioProc(a.id) || ''); }).slice(0, 8).reverse()
        .map(function (x) {
          var c = { aprovado: 0, backup: 0, reprovado: 0, desistencia: 0 };
          base.cls[x.id].jovens.forEach(function (j) { if (c[j.situacao] != null) c[j.situacao]++; });
          return { empresa: nomeEmp(x.empresa_id), vaga: x.vaga || '', cont: c };
        });
      var tot = { aprovado: 0, backup: 0, reprovado: 0, desistencia: 0 }, somaAreas = {}, nAreas = {};
      noPeriodo.forEach(function (x) {
        var c = base.cls[x.id]; if (!c) return;
        c.jovens.forEach(function (j) {
          if (tot[j.situacao] != null) tot[j.situacao]++;
          if (j.situacao === 'desistencia') return;
          Object.keys(j.areas || {}).forEach(function (a) { var v = j.areas[a]; if (v == null) return; somaAreas[a] = (somaAreas[a] || 0) + Number(v); nAreas[a] = (nAreas[a] || 0) + 1; });
        });
      });
      var totAll = tot.aprovado + tot.backup + tot.reprovado + tot.desistencia;
      var areas = Object.keys(somaAreas).sort().map(function (a) { return { nome: a, v: somaAreas[a] / nAreas[a] }; });
      // acompanhamento
      var ac = { contratado: 0, nao: 0, andamento: 0, atrasadas: 0 };
      base.acomp.forEach(function (a) {
        if (!a.aprovado) return;
        if (st.empresa && !ps.some(function (y) { return y.id === a.processo_id; })) return;
        if (a.contratado === true) ac.contratado++; else if (a.contratado === false) ac.nao++; else ac.andamento++;
        if (window.CF.acomp) window.CF.acomp.marcos(a).forEach(function (m) { if (m.estado === 'atrasada') ac.atrasadas++; });
      });
      // próximas turmas e indicadores
      var lim = new Date(); lim.setDate(lim.getDate() + 15); var limISO = iso(lim);
      var proximas = turmasF.map(function (x) { return { t: x, ds: diasTurma(x.id), p: ps.filter(function (y) { return y.id === x.processo_id; })[0] }; })
        .filter(function (x) { return x.ds.length && x.ds[x.ds.length - 1] >= h; }).sort(function (a, b) { return a.ds[0].localeCompare(b.ds[0]); });
      var em15 = proximas.filter(function (x) { return x.ds[0] <= limISO; });
      return {
        sit: { andamento: ps.filter(function (x) { return x.situacao === 'andamento'; }).length, montagem: ps.filter(function (x) { return x.situacao === 'montagem'; }).length, revisao: ps.filter(function (x) { return x.situacao === 'revisao'; }).length },
        em15: em15, proximas: proximas.slice(0, 5), avaliados: avaliados, nProcPeriodo: noPeriodo.length, tot: tot, totAll: totAll,
        res: res, meses: meses, areas: areas, ac: ac
      };
    }

    var graficos = {};   // id → { titulo, sub, g(paleta) }
    function desenhar() {
      var d = calcular(), P = paletaTela();
      var rotPer = { '3m': 'Últimos 3 meses', ano: 'Este ano', tudo: 'Todo o período' }[st.periodo] + (st.empresa ? ' · ' + nomeEmp(st.empresa) : ' · todas as empresas');
      graficos = {
        resultado: { titulo: 'Resultado por processo', sub: 'Aprovados, backup, reprovados e desistências · ' + rotPer, f: function (Q) { return gResultado(d.res, Q); } },
        meses: { titulo: 'Jovens avaliados por mês', sub: 'Jovens que participaram das turmas · ' + rotPer, f: function (Q) { return gMeses(d.meses, Q); } },
        areas: { titulo: 'Média por área', sub: 'Média das notas dos jovens avaliados · ' + rotPer, f: function (Q) { return gAreas(d.areas, Q); } },
        empresa: { titulo: 'Na empresa (acompanhamento)', sub: 'Jovens aprovados pelas empresas · ' + (st.empresa ? nomeEmp(st.empresa) : 'todas as empresas'), f: function (Q) { return gEmpresa(d.ac, Q); } }
      };
      if (!admin) delete graficos.empresa;
      function cartao(id, extra) {
        var gr = graficos[id], g = gr.f(P);
        return '<section class="card gf-g"><div class="gf-cab"><div><h2>' + esc(gr.titulo) + '</h2><p>' + esc(gr.sub) + '</p></div>' +
          (g ? '<button type="button" class="btn btn-p" data-png="' + id + '">⬇ Baixar</button>' : '') + '</div>' +
          (g ? '<div class="gf-svg">' + svgTexto(g).replace('<svg ', '<svg role="img" aria-label="' + esc(gr.titulo) + '" style="width:100%;height:auto;max-width:' + g.w + 'px" ') + '</div>' : '<p class="dica" style="margin:18px 0">Ainda não há dados para este gráfico no período.</p>') + (extra || '') + '</section>';
      }
      var aprov = d.totAll ? pct(d.tot.aprovado, d.totAll) : null;
      var kpis = [
        ['#ee7330', d.sit.andamento, 'Processos em andamento', d.sit.montagem + ' em montagem · ' + d.sit.revisao + ' em revisão'],
        ['#3f8f9a', d.em15.length, 'Turmas nos próximos 15 dias', d.em15.length ? (d.em15[0].ds[0] === hoje() ? 'a próxima é hoje' : 'a próxima em ' + dataBR(d.em15[0].ds[0])) : 'nenhuma marcada'],
        ['#5b6b8a', d.avaliados, 'Jovens avaliados', 'em ' + d.nProcPeriodo + ' processo' + (d.nProcPeriodo === 1 ? '' : 's') + ' no período'],
        ['#3FA66B', aprov == null ? '—' : aprov + '%', 'Aprovação média', d.totAll ? 'backup ' + pct(d.tot.backup, d.totAll) + '% · desistência ' + pct(d.tot.desistencia, d.totAll) + '%' : 'sem resultados no período']
      ];
      if (admin) kpis.push(['#D9534F', d.ac.atrasadas, 'Avaliações atrasadas', 'acompanhamento das empresas']);
      box.innerHTML =
        '<div class="gf-topo"><div><h1>Olá, ' + esc(primeiroNome) + '!</h1><p class="dica">Gráficos do Projeto Gol Jovens Talentos</p></div>' +
          '<div class="gf-filtros">' + [['3m', 'Últimos 3 meses'], ['ano', 'Este ano'], ['tudo', 'Tudo']].map(function (x) {
            return '<button type="button" class="pt-chip' + (st.periodo === x[0] ? ' on' : '') + '" data-per="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
            '<select class="entrada gf-emp" id="gf-emp" aria-label="Empresa"><option value="">Empresa: todas</option>' + empresas.slice().sort(function (a, b) { return (a.nome_fantasia || '').localeCompare(b.nome_fantasia || ''); }).map(function (e) {
              return '<option value="' + e.id + '"' + (st.empresa === e.id ? ' selected' : '') + '>' + esc(e.nome_fantasia || e.razao_social) + '</option>'; }).join('') + '</select>' +
            '<button type="button" class="btn btn-pri" id="gf-pdf">⬇ Baixar todos (PDF)</button></div></div>' +
        '<div class="gf-kpis" style="--n:' + kpis.length + '">' + kpis.map(function (k) { return '<div class="card gf-k" style="--c:' + k[0] + '"><b>' + esc(String(k[1])) + '</b><span>' + esc(k[2]) + '</span><small>' + esc(k[3]) + '</small></div>'; }).join('') + '</div>' +
        '<div class="gf-l1">' + cartao('resultado') + cartao('meses') + '</div>' +
        '<div class="gf-l2' + (admin ? '' : ' gf-l2b') + '">' + cartao('areas') + (admin ? cartao('empresa') : '') +
          '<section class="card gf-g"><div class="gf-cab"><div><h2>Próximas turmas</h2><p>Agenda dos próximos dias</p></div><a class="btn btn-p" href="#/cadastros/turmas">Ver todas</a></div>' +
          (d.proximas.length ? '<ul class="gf-lst">' + d.proximas.map(function (x) {
            var q = x.ds[0] === hoje() ? 'hoje' + (x.ds[1] ? ' e ' + dataBR(x.ds[1]).slice(0, 5) : '') : x.ds.map(function (s) { return dataBR(s).slice(0, 5); }).join(' e ');
            return '<li><span><b>' + esc(x.t.nome) + '</b><small>' + esc(nomeEmp(x.p.empresa_id) + ' · ' + x.p.vaga) + '</small></span><span' + (x.ds[0] === hoje() ? ' class="gf-hoje"' : '') + '>' + esc(q) + '</span></li>'; }).join('') + '</ul>'
            : '<p class="dica" style="margin:18px 0">Nenhuma turma marcada.</p>') + '</section></div>';
      box.querySelectorAll('[data-per]').forEach(function (b) { b.addEventListener('click', function () { st.periodo = b.getAttribute('data-per'); desenhar(); }); });
      box.querySelector('#gf-emp').addEventListener('change', function () { st.empresa = this.value; desenhar(); });
      box.querySelectorAll('[data-png]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var gr = graficos[b.getAttribute('data-png')], g = gr.f(CLARO);
          try { var im = await png(g, gr.titulo, gr.sub); window.CF.pdf.baixar(im.blob, window.CF.pdf.nomeArquivo(['Grafico', gr.titulo, hoje()], 'png')); }
          catch (e) { ui.toast(e.message, 'erro'); }
        });
      });
      box.querySelector('#gf-pdf').addEventListener('click', function () { baixarTudo(this, d, kpis, rotPer); });
    }

    async function baixarTudo(botao, d, kpis, rotPer) {
      var tx = botao.innerHTML; botao.disabled = true; botao.innerHTML = 'Gerando…';
      try {
        var doc = await window.CF.pdf.novo(), PDF = window.CF.pdf, W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), x0 = 21, x1 = W - 10;
        var kolping = await PDF.imagem('assets/img/kolping_light.png');
        function cab() {
          PDF.faixa(doc);
          if (kolping) { var k = Math.min(40 / kolping.w, 9 / kolping.h); doc.addImage(kolping.url, 'PNG', x0, 13, kolping.w * k, kolping.h * k); }
          doc.setFont('P', 'normal'); doc.setFontSize(7.6); doc.setTextColor('#6f696a');
          doc.text('Gráficos · Projeto Gol Jovens Talentos', x1, 18.5, { align: 'right' });
          doc.setDrawColor('#272323'); doc.setLineWidth(0.6); doc.line(x0, 26, x1, 26);
        }
        cab();
        doc.setFont('P', 'bold'); doc.setFontSize(16); doc.setTextColor('#272323'); doc.text('Gráficos', x0, 36);
        doc.setFont('P', 'normal'); doc.setFontSize(9); doc.setTextColor('#6f696a'); doc.text(rotPer + ' · gerado em ' + new Date().toLocaleDateString('pt-BR'), x0, 41.5);
        var y = 47, gap = 3, kw = (x1 - x0 - gap * (kpis.length - 1)) / kpis.length;
        kpis.forEach(function (k, i) {
          var x = x0 + i * (kw + gap);
          doc.setDrawColor('#dcd6d5'); doc.setFillColor('#ffffff'); doc.setLineWidth(0.3); doc.roundedRect(x, y, kw, 22, 2, 2, 'FD');
          doc.setFillColor(k[0]); doc.rect(x, y, 1.4, 22, 'F');
          doc.setFont('P', 'bold'); doc.setFontSize(15); doc.setTextColor('#272323'); doc.text(String(k[1]), x + 4.5, y + 8.5);
          doc.setFontSize(7); doc.text(doc.splitTextToSize(k[2], kw - 7), x + 4.5, y + 13.5);
          doc.setFont('P', 'normal'); doc.setFontSize(6); doc.setTextColor('#6f696a'); doc.text(doc.splitTextToSize(k[3], kw - 7)[0] || '', x + 4.5, y + 19.5);
        });
        y += 29;
        var ids = Object.keys(graficos);
        for (var i = 0; i < ids.length; i++) {
          var gr = graficos[ids[i]], g = gr.f(CLARO); if (!g) continue;
          var im = await png(g, gr.titulo, gr.sub), wmm = x1 - x0, hmm = wmm * im.h / im.w;
          if (hmm > 95) { hmm = 95; wmm = hmm * im.w / im.h; }
          if (y + hmm > H - 26) { doc.addPage(); cab(); y = 32; }
          doc.setDrawColor('#e3dedd'); doc.setLineWidth(0.3); doc.roundedRect(x0, y, x1 - x0, hmm + 2, 2, 2, 'S');
          doc.addImage(im.url, 'PNG', x0 + (x1 - x0 - wmm) / 2, y + 1, wmm, hmm);
          y += hmm + 7;
        }
        var total = doc.getNumberOfPages();
        for (var pg = 1; pg <= total; pg++) { doc.setPage(pg); PDF.rodape(doc, 'Gráficos', pg, total); }
        PDF.baixar(doc.output('blob'), PDF.nomeArquivo(['Graficos Projeto Gol Jovens Talentos', hoje()], 'pdf'));
      } catch (e) { console.error(e); ui.toast(e && e.message ? e.message : 'Não foi possível gerar o PDF.', 'erro'); }
      botao.disabled = false; botao.innerHTML = tx;
    }
    desenhar();
  };
})();
