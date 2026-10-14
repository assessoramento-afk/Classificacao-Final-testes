/* =====================================================================
   Classificação Final · views/ficha.js
   #/processos/<processo>/ficha/<participação>   ficha do candidato
   Dois modelos de tela: "lateral" (modelo D, padrão) e "cards".
   O padrão vem de Configurações › Modelos de documentos (ficha_tela);
   o botão Lateral/Cards troca só para quem está olhando, nesta sessão.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var CHAVE_MODELO = 'cf_ficha_modelo';

  function sb() { return window.CF.sb; }
  function c() { return window.CF.classif; }
  function n2(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ','); }
  function idade(nasc) {
    if (!nasc) return null;
    var p = String(nasc).split('-'), h = new Date(), a = h.getFullYear() - Number(p[0]);
    if (h.getMonth() + 1 < Number(p[1]) || (h.getMonth() + 1 === Number(p[1]) && h.getDate() < Number(p[2]))) a--;
    return a;
  }
  function iniciais(nome) {
    var ps = String(nome || '').trim().split(/\s+/).filter(function (x) { return x.length > 2; });
    if (!ps.length) ps = String(nome || '?').trim().split(/\s+/);
    return ((ps[0] || '?')[0] + (ps.length > 1 ? ps[ps.length - 1][0] : '')).toUpperCase();
  }

  /* ---------- Anel da nota final ---------- */
  function anel(nota, cor, tam, escuro) {
    tam = tam || 132;
    if (escuro) {
      var r2 = tam * 0.394, c2 = tam / 2, circ2 = 2 * Math.PI * r2, v2 = nota == null ? 0 : Math.max(0, Math.min(5, Number(nota)));
      return '<svg class="fc-anel" width="' + tam + '" height="' + tam + '" viewBox="0 0 ' + tam + ' ' + tam + '" role="img" aria-label="Nota final ' + n2(nota) + '">' +
        '<circle cx="' + c2 + '" cy="' + c2 + '" r="' + r2 + '" fill="none" stroke="#4a4242" stroke-width="' + (tam * 0.09) + '"/>' +
        (nota == null ? '' : '<circle cx="' + c2 + '" cy="' + c2 + '" r="' + r2 + '" fill="none" stroke="' + cor + '" stroke-width="' + (tam * 0.09) + '" stroke-linecap="round" stroke-dasharray="' + (circ2 * v2 / 5).toFixed(1) + ' ' + circ2.toFixed(1) + '" transform="rotate(-90 ' + c2 + ' ' + c2 + ')"/>') +
        '<text x="' + c2 + '" y="' + (c2 + tam * 0.085) + '" text-anchor="middle" font-size="' + (tam * 0.25) + '" font-weight="700" fill="#ffffff">' + n2(nota) + '</text></svg>';
    }
    var r = tam * 0.394, cx = tam / 2, circ = 2 * Math.PI * r, v = nota == null ? 0 : Math.max(0, Math.min(5, Number(nota)));
    return '<svg class="fc-anel" width="' + tam + '" height="' + tam + '" viewBox="0 0 ' + tam + ' ' + tam + '" role="img" aria-label="Nota final ' + n2(nota) + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="var(--borda)" stroke-width="' + (tam * 0.083) + '"/>' +
      (nota == null ? '' : '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + cor + '" stroke-width="' + (tam * 0.083) + '" stroke-linecap="round" stroke-dasharray="' + (circ * v / 5).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>') +
      '<text x="' + cx + '" y="' + (cx + tam * 0.03) + '" text-anchor="middle" font-size="' + (tam * 0.227) + '" font-weight="700" fill="var(--texto)">' + n2(nota) + '</text>' +
      '<text x="' + cx + '" y="' + (cx + tam * 0.197) + '" text-anchor="middle" font-size="' + Math.max(11, tam * 0.083) + '" fill="var(--texto-3)">nota final</text></svg>';
  }

  /* ---------- Radar (funciona com qualquer número de eixos) ---------- */
  function radar(itens, corR) {
    corR = corR || '#ee7330';
    var val = itens.filter(function (x) { return x.nota != null; });
    if (itens.length < 3) {
      return '<p class="dica" style="text-align:center;margin:30px 0">O gráfico de radar precisa de pelo menos 3 itens. Veja as notas ao lado.</p>';
    }
    var n = itens.length, cx = 170, cy = 150, R = 105, muitos = n > 7;
    function pt(i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / n, r = R * v / 5; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = '';
    [1, 2, 3, 4, 5].forEach(function (lv) {
      s += '<polygon points="' + itens.map(function (x, i) { return pt(i, lv).map(function (k) { return k.toFixed(1); }).join(','); }).join(' ') + '" fill="none" stroke="var(--borda)" stroke-width="1"/>';
    });
    itens.forEach(function (x, i) { var p = pt(i, 5); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="var(--borda)"/>'; });
    if (val.length) {
      s += '<polygon points="' + itens.map(function (x, i) { return pt(i, x.nota == null ? 0 : x.nota).map(function (k) { return k.toFixed(1); }).join(','); }).join(' ') + '" fill="' + corR + '" fill-opacity=".2" stroke="' + corR + '" stroke-width="2" stroke-linejoin="round"/>';
      itens.forEach(function (x, i) { if (x.nota == null) return; var p = pt(i, x.nota); s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="' + corR + '"/>'; });
    }
    itens.forEach(function (x, i) {
      var p = pt(i, muitos ? 5.75 : 6.05), anc = Math.abs(p[0] - cx) < 12 ? 'middle' : (p[0] > cx ? 'start' : 'end');
      var nome = muitos && x.nome.length > 20 ? x.nome.slice(0, 19) + '…' : x.nome;
      s += '<text x="' + p[0].toFixed(0) + '" y="' + (p[1] + 3).toFixed(0) + '" text-anchor="' + anc + '" font-size="' + (muitos ? 10 : 11.5) + '" font-weight="500" fill="var(--texto-2)"><title>' + esc(x.nome) + '</title>' + esc(nome) + '</text>' +
        '<text x="' + p[0].toFixed(0) + '" y="' + (p[1] + (muitos ? 15 : 17)).toFixed(0) + '" text-anchor="' + anc + '" font-size="' + (muitos ? 11 : 12) + '" font-weight="700" fill="var(--texto)">' + n2(x.nota) + '</text>';
    });
    return '<svg class="fc-radar" viewBox="-60 -18 460 345" role="img" aria-label="Gráfico de radar">' + s + '</svg>';
  }
  function barras(itens) {
    return itens.map(function (x) {
      return '<div class="fc-barra"><span title="' + esc(x.nome) + '">' + esc(x.nome) + '</span><i><em style="width:' + (x.nota == null ? 0 : Math.round(x.nota * 20)) + '%"></em></i><b>' + n2(x.nota) + '</b></div>';
    }).join('');
  }

  /* Monta os dados de um candidato no formato usado por CF.pdf.ficha, CF.excel.ficha e CF.pdf.processo.
     f = resultado de ficha_candidato · eu = linha do jovem em classificacao_processo · cl = classificacao_processo */
  function dataCurta(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function diasTurma(datas) {   // ['2026-11-17','2026-11-18'] → "17 e 18/11/2026"
    var ds = (datas || []).map(function (x) { return String(x).slice(0, 10); });
    if (!ds.length) return '';
    var fim = dataCurta(ds[ds.length - 1]);
    if (ds.length === 1) return fim;
    var mesmoMes = ds.every(function (x) { return x.slice(0, 7) === ds[0].slice(0, 7); });
    return ds.slice(0, -1).map(function (x) { return mesmoMes ? x.slice(8, 10) : dataCurta(x).slice(0, 5); }).join(', ') + ' e ' + fim;
  }
  function montarDados(f, eu, cl, eixo, fotoUrl, logoUrl) {
    var K = window.CF.classif, g = f.jovem.genero, nomeEmp = (f.empresa && f.empresa.nome) || '';
    var classificados = (cl.jovens || []).filter(function (j) { return j.posicao; }).length;
    var mot = eu.motivo ? K.textoMotivo(eu.motivo, g) : (eu.situacao === 'reprovado' ? 'Nota final abaixo de ' + K.corteTxt(f.processo.corte_backup) : null);
    var det = eu.situacao === 'desistencia' && eu.desistencia && eu.desistencia !== 'FALTOU' ? ' · ' + eu.desistencia.toLowerCase() : (eu.situacao === 'desistencia' && !eu.observacao ? ' · faltou' : '');
    var areas = (cl.areas || []).map(function (a) { return { nome: a, nota: (eu.areas || {})[a] == null ? null : Number(eu.areas[a]) }; });
    var comps = (f.competencias || []).map(function (x) { return { nome: x.nome, nota: x.nota == null ? null : Number(x.nota) }; });
    var compsOrd = comps.slice().sort(function (a, b) { return (b.nota == null ? -1 : b.nota) - (a.nota == null ? -1 : a.nota); });
    var areasOrd = areas.slice().sort(function (a, b) { return (b.nota == null ? -1 : b.nota) - (a.nota == null ? -1 : a.nota); });
    var datas = f.turma_datas || [], semNotas = !(f.testes || []).some(function (t) { return t.lancadas > 0; });
    var desistTxt = null;
    if (eu.situacao === 'desistencia') {
      desistTxt = K.textoMotivo('desistiu', g) + '.';
      var falta = (f.faltas || [])[0] || (f.desistencia && f.desistencia.dia);
      if (falta) {
        var n = datas.map(function (x) { return String(x).slice(0, 10); }).indexOf(String(falta).slice(0, 10));
        desistTxt += ' Faltou no dia ' + (n >= 0 ? (n + 1) + ' (' + dataCurta(falta) + ')' : dataCurta(falta));
        desistTxt += semNotas ? '; não há notas lançadas.' : '.';
      } else if (semNotas) desistTxt += ' Não há notas lançadas.';
      var obsD = (f.desistencia && f.desistencia.observacao) || eu.observacao;
      if (obsD) desistTxt += ' ' + obsD;
    }
    var porComp = eixo === 'competencias';
    return {
      nome: f.jovem.nome, iniciais: iniciais(f.jovem.nome), codigo: f.codigo, idade: idade(f.jovem.nascimento), turma: f.turma,
      turmaTxt: f.turma + (datas.length ? ' · ' + diasTurma(datas) : ''),
      vaga: f.processo.vaga, empresa: nomeEmp, avaliador: f.avaliador_responsavel,
      avaliadorTxt: f.avaliador_responsavel ? f.avaliador_responsavel + (f.grupo ? ' (GRUPO ' + f.grupo + ')' : '') : null,
      nota: eu.nota == null ? null : Number(eu.nota), situacao: eu.situacao, situacaoTxt: K.textoSituacao(eu.situacao, g),
      posicaoTxt: eu.posicao ? eu.posicao + 'º de ' + classificados + ' candidatos' + (eu.empate ? ' (empate)' : '') : null,
      classificadosTxt: eu.posicao ? eu.posicao + 'º de ' + classificados + ' classificados' + (eu.empate ? ' (empate)' : '') : null,
      motivoTxt: eu.situacao === 'desistencia' ? (mot ? mot + det : null) : mot, motivoObs: eu.situacao === 'desistencia' ? null : (eu.observacao || null),
      motivoPor: eu.motivo_por ? String(eu.motivo_por).toUpperCase() : null,
      desistenciaTxt: desistTxt, semNotas: semNotas,
      eixoTitulo: porComp ? 'competência' : 'área', itens: porComp ? comps : areas,
      lista: porComp ? { titulo: 'Notas por área', itens: areasOrd } : { titulo: 'Notas por competência', itens: compsOrd },
      areas: areas, competencias: comps, testes: f.testes || [],
      observacoes: (f.observacoes || []).map(function (o) { return { teste: o.teste, autor: o.autor, data: o.em ? dataCurta(o.em) : '', texto: o.texto }; }),
      corteAprovado: Number(f.processo.corte_aprovado), corteBackup: Number(f.processo.corte_backup),
      processoTxt: 'Projeto Gol Jovens Talentos · Processo seletivo' + (f.processo.identificacao ? ' ' + f.processo.identificacao : '') + ' · ' + nomeEmp + ' · ' + f.processo.vaga,
      fotoUrl: fotoUrl, logoEmpresaUrl: logoUrl
    };
  }
  window.CF.fichaDados = montarDados;

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.ficha = async function (area, ctx, procId, partId) {
    var st = { eixo: 'areas', modelo: null };
    area.innerHTML = '<div id="fc"><div class="girando" style="margin:40px auto"></div></div>';
    var cl, f, fotoUrl = null, padrao = 'lateral';
    try {
      var r = await Promise.all([
        dados.classificacao.carregar(procId),
        sb().rpc('ficha_candidato', { p_part: partId }).then(function (x) { if (x.error) throw x.error; return x.data; }),
        dados.config.carregar().catch(function () { return null; })
      ]);
      cl = r[0]; f = r[1];
      if (r[2] && r[2].modelos_documento && r[2].modelos_documento.ficha_tela) padrao = r[2].modelos_documento.ficha_tela;
      fotoUrl = f.jovem && f.jovem.foto_path ? await dados.jovens.urlFoto(f.jovem.foto_path).catch(function () { return null; }) : null;
    } catch (e) {
      console.error(e);
      area.innerHTML = '<a class="voltar" href="#/processos/' + esc(procId) + '/classificacao">← Classificação</a>' +
        '<div class="aviso aviso-erro" style="margin-top:12px">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>';
      return;
    }
    try { st.modelo = sessionStorage.getItem(CHAVE_MODELO); } catch (e) { st.modelo = null; }
    if (st.modelo !== 'lateral' && st.modelo !== 'cards') st.modelo = padrao === 'cards' ? 'cards' : 'lateral';

    var lista = cl.jovens || [];
    var idx = lista.map(function (j) { return j.participacao_id; }).indexOf(partId);
    var eu = lista[idx] || {};
    var cor = c().COR[eu.situacao] || 'var(--neutro)';
    var nomeEmp = (f.empresa && f.empresa.nome) || '';
    var classificados = lista.filter(function (j) { return j.posicao; }).length;

    function navegacao() {
      var ant = lista[idx - 1], prox = lista[idx + 1];
      function rot(j) { return j.posicao ? j.posicao + 'º' : (j.situacao === 'desistencia' ? 'desist.' : '—'); }
      return '<div class="fc-nav">' +
        (ant ? '<a class="btn" href="#/processos/' + procId + '/ficha/' + ant.participacao_id + '" title="' + esc(ant.nome) + '">‹ ' + rot(ant) + ' anterior</a>' : '<span class="btn" aria-disabled="true" style="opacity:.45">‹ anterior</span>') +
        '<span class="dica">' + (idx + 1) + ' de ' + lista.length + '</span>' +
        (prox ? '<a class="btn" href="#/processos/' + procId + '/ficha/' + prox.participacao_id + '" title="' + esc(prox.nome) + '">' + rot(prox) + ' próximo ›</a>' : '<span class="btn" aria-disabled="true" style="opacity:.45">próximo ›</span>') +
      '</div>';
    }
    function situacaoTxt() {
      var t = c().textoSituacao(eu.situacao, f.jovem.genero);
      return eu.posicao ? t + ' · ' + eu.posicao + 'º de ' + classificados + (eu.empate ? ' (empate)' : '') : t;
    }
    function itensEixo() {
      if (st.eixo === 'competencias') return (f.competencias || []).map(function (x) { return { nome: x.nome, nota: x.nota }; });
      var areas = cl.areas || [];
      return areas.map(function (a) { return { nome: a, nota: (eu.areas || {})[a] == null ? null : Number(eu.areas[a]) }; });
    }
    function blocoMotivo() {
      if (!eu.motivo && eu.situacao !== 'reprovado') return '';
      var t = eu.motivo ? c().textoMotivo(eu.motivo, f.jovem.genero) : 'Nota final abaixo de ' + c().corteTxt(f.processo.corte_backup);
      var det = eu.situacao === 'desistencia' && eu.desistencia && eu.desistencia !== 'FALTOU' ? ' · ' + eu.desistencia.toLowerCase() : (eu.situacao === 'desistencia' && !eu.observacao ? ' · faltou' : '');
      return '<div class="fc-motivo" style="--c:' + cor + '"><b>' + esc(t + det) + '</b>' +
        (eu.observacao ? '<p>' + esc(eu.observacao) + '</p>' : '') +
        (eu.motivo_por ? '<small>Aplicado por ' + esc(String(eu.motivo_por).toUpperCase()) + '</small>' : '') + '</div>';
    }
    function dadosLista() {
      var id = idade(f.jovem.nascimento);
      return [['Turma', f.turma], ['Vaga', f.processo.vaga], ['Empresa', nomeEmp], ['Idade', id == null ? null : id + ' anos'], ['Avaliador responsável', f.avaliador_responsavel]]
        .filter(function (x) { return x[1]; });
    }
    function foto(tam) {
      return '<div class="fc-foto" style="width:' + tam + 'px;height:' + tam + 'px;font-size:' + Math.round(tam * 0.32) + 'px">' +
        (fotoUrl ? '<img src="' + esc(fotoUrl) + '" alt="Foto de ' + esc(f.jovem.nome) + '">' : esc(iniciais(f.jovem.nome))) + '</div>';
    }
    function blocoDesempenho() {
      var it = itensEixo();
      return '<div class="fc-des"><div><div class="fc-tit"><h2>Desempenho</h2>' +
          '<div class="fc-seg" role="tablist" aria-label="Gráfico por"><button type="button" role="tab" data-eixo="areas" class="' + (st.eixo === 'areas' ? 'on' : '') + '" aria-selected="' + (st.eixo === 'areas') + '">Áreas</button>' +
          '<button type="button" role="tab" data-eixo="competencias" class="' + (st.eixo === 'competencias' ? 'on' : '') + '" aria-selected="' + (st.eixo === 'competencias') + '">Competências</button></div></div>' + radar(it) + '</div>' +
        '<div><h2>' + (st.eixo === 'areas' ? 'Notas por área' : 'Notas por competência') + '</h2><p class="dica" style="margin:0 0 6px">' + (st.eixo === 'areas' ? 'Média dos testes de cada área' : 'Média dos critérios de cada competência') + '</p>' + barras(it) +
          '<div class="fc-faixas"><span>Faixas do processo</span><span><b style="color:' + c().COR.aprovado + '">●</b> aprovado a partir de ' + c().corteTxt(f.processo.corte_aprovado) +
          ' &nbsp;<b style="color:' + c().COR.backup + '">●</b> backup ' + c().corteTxt(f.processo.corte_backup) + ' a ' + c().corteTxt(f.processo.corte_aprovado - 0.01) + '</span></div></div></div>';
    }
    function blocoTestes() {
      var ts = f.testes || [];
      if (!ts.length) return '<p class="dica">Nenhum teste neste processo.</p>';
      return '<div class="tabela-rolar"><table class="fc-tt"><thead><tr><th>Teste</th><th>Área</th><th class="num">Nota</th><th>Avaliador</th></tr></thead><tbody>' +
        ts.map(function (t) {
          var pend = t.lancadas < t.total;
          return '<tr><td><b>' + esc(t.nome) + '</b></td><td><span class="tag-area">' + esc(t.area) + '</span></td>' +
            '<td class="num"><b>' + (t.nota == null ? '—' : n2(t.nota)) + '</b>' + (pend && t.lancadas > 0 ? '<small class="dica"> parcial</small>' : '') + '</td>' +
            '<td>' + (t.avaliador ? esc(t.avaliador) : '<span class="dica">' + (t.nota == null ? 'não lançada' : '—') + '</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    function blocoObs() {
      var os = f.observacoes || [];
      if (!os.length) return '<p class="dica" style="margin:0">Nenhuma observação registrada.</p>';
      return os.map(function (o) { return '<div class="fc-obs"><small class="lbl">' + esc(o.teste + (o.autor ? ' · ' + o.autor : '')) + '</small><p>' + esc(o.texto) + '</p></div>'; }).join('');
    }

    function desenhar() {
      var topo = '<a class="voltar" href="#/processos/' + procId + '/classificacao">← Classificação · ' + esc(nomeEmp + ' · ' + f.processo.vaga) + '</a>' +
        '<div class="fc-barra-topo">' + navegacao() +
          '<div class="fc-nav"><div class="fc-seg" role="tablist" aria-label="Modelo da ficha"><button type="button" data-modelo="lateral" class="' + (st.modelo === 'lateral' ? 'on' : '') + '">Lateral</button><button type="button" data-modelo="cards" class="' + (st.modelo === 'cards' ? 'on' : '') + '">Cards</button></div>' +
          '<button type="button" class="btn" id="fc-xls">⬇ Excel</button><button type="button" class="btn btn-pri" id="fc-pdf">⬇ PDF da ficha</button></div></div>';
      var corpo;
      if (st.modelo === 'lateral') {
        // Mesmo desenho do PDF aprovado: coluna escura + cartões
        var dd = montarDados(f, eu, cl, st.eixo, fotoUrl, null), desist = eu.situacao === 'desistencia';
        var lista = dd.lista ? dd.lista.itens : [];
        corpo = '<section class="card fc-lay fc-escura" style="--c:' + cor + '"><aside class="fc-lat">' +
            '<div class="fc-retrato">' + (fotoUrl ? '<img src="' + esc(fotoUrl) + '" alt="Foto de ' + esc(f.jovem.nome) + '">' : '<span>' + esc(iniciais(f.jovem.nome)) + '</span>') + '</div>' +
            '<h1>' + esc(f.jovem.nome) + '</h1>' + (desist ? '' : anel(eu.nota, cor, 128, true)) +
            '<span class="fc-pilula">' + esc(String(dd.situacaoTxt).toUpperCase()) + '</span>' +
            (dd.classificadosTxt ? '<p class="fc-class">' + esc(dd.classificadosTxt) + '</p>' : '') +
            '<dl class="fc-dl2">' + [['Código', dd.codigo], ['Turma', dd.turmaTxt], ['Vaga', dd.vaga], ['Empresa', dd.empresa], ['Idade', dd.idade != null ? dd.idade + ' anos' : null]]
              .filter(function (x) { return x[1]; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl></aside>' +
          '<div class="fc-dir">' +
            (desist ? '<div class="fc-cart"><h2>Situação</h2><p>' + esc(dd.desistenciaTxt || '') + '</p></div>' : '') +
            (!desist || !dd.semNotas ? '<div class="fc-pares">' +
              '<div class="fc-cart"><div class="fc-tit"><h2>Desempenho por ' + esc(dd.eixoTitulo) + '</h2><div class="fc-seg" role="tablist" aria-label="Gráfico por">' +
                '<button type="button" data-eixo="areas" class="' + (st.eixo === 'areas' ? 'on' : '') + '">Áreas</button><button type="button" data-eixo="competencias" class="' + (st.eixo === 'competencias' ? 'on' : '') + '">Competências</button></div></div>' + radar(dd.itens, cor) + '</div>' +
              '<div class="fc-cart"><h2>' + esc(dd.lista ? dd.lista.titulo : '') + '</h2><ul class="fc-lista">' + lista.map(function (x) { return '<li><span>' + esc(x.nome) + '</span><b>' + (x.nota == null ? '—' : Number(x.nota).toFixed(1).replace('.', ',')) + '</b></li>'; }).join('') + '</ul>' +
                '<p class="fc-faixas2"><b style="color:' + c().COR.aprovado + '">●</b> aprovado a partir de ' + c().corteTxt(f.processo.corte_aprovado) + ' &nbsp; <b style="color:' + c().COR.backup + '">●</b> backup ' + c().corteTxt(f.processo.corte_backup) + ' a ' + c().corteTxt(f.processo.corte_aprovado - 0.01) + '</p></div></div>' : '') +
            (dd.motivoTxt && !desist ? '<div class="fc-cart fc-cart-motivo"><h2>Motivo</h2><p>' + esc(dd.motivoTxt) + '</p>' + (dd.motivoObs ? '<p>' + esc(dd.motivoObs) + '</p>' : '') + (dd.motivoPor ? '<small>Aplicado por ' + esc(dd.motivoPor) + '</small>' : '') + '</div>' : '') +
            '<div class="fc-cart"><h2>Observações dos avaliadores</h2>' + (dd.observacoes.length ? dd.observacoes.map(function (o) { return '<p><b>' + esc((o.autor || '') + (o.data ? ', ' + o.data : '')) + ':</b> ' + esc(o.texto) + '</p>'; }).join('') : '<p class="dica">Nenhuma observação registrada.</p>') + '</div>' +
            (dd.avaliadorTxt ? '<div class="fc-cart"><h2>Avaliador responsável</h2><p>' + esc(dd.avaliadorTxt) + '</p></div>' : '') +
            '<div class="fc-cart"><h2>Notas dos testes</h2>' + blocoTestes() + '</div>' +
          '</div></section>';
      } else {
        var id = idade(f.jovem.nascimento);
        corpo = '<section class="card fc-cab" style="--c:' + cor + '">' + foto(104) +
            '<div><div class="fc-nome"><h1>' + esc(f.jovem.nome) + '</h1><span class="fc-pill">' + esc(c().textoSituacao(eu.situacao, f.jovem.genero)) + '</span></div>' +
              '<p>Código <b class="fc-mono">' + esc(f.codigo || '') + '</b> · ' + esc(f.turma || '') + (id == null ? '' : ' · ' + id + ' anos') + '</p>' +
              '<p>' + esc(f.processo.vaga + ' · ' + nomeEmp) + (f.avaliador_responsavel ? ' · avaliador responsável ' + esc(f.avaliador_responsavel) : '') + '</p>' +
              (eu.posicao ? '<p class="fc-pos"><span class="lbl">Posição</span> <b>' + eu.posicao + 'º</b> <span class="dica">de ' + classificados + ' candidatos' + (eu.empate ? ' · empate' : '') + '</span></p>' : '') + '</div>' +
            '<div>' + anel(eu.nota, cor, 132) + '</div></section>' +
          (blocoMotivo() ? '<div style="margin-top:18px">' + blocoMotivo() + '</div>' : '') +
          '<section class="card fc-sec">' + blocoDesempenho() + '</section>' +
          '<section class="card fc-sec"><h2>Notas dos testes</h2>' + blocoTestes() + '</section>' +
          '<section class="card fc-sec"><h2>Observações dos avaliadores</h2>' + blocoObs() + '</section>';
      }
      area.querySelector('#fc').innerHTML = topo + corpo;
      ligar();
    }
    /* ---------- Dados para o PDF e o Excel (mesmo formato) ---------- */
    async function dadosDocumento() {
      var logoUrl = f.empresa && f.empresa.logo_path ? await dados.empresas.urlLogo(f.empresa.logo_path).catch(function () { return null; }) : null;
      return montarDados(f, eu, cl, st.eixo, fotoUrl, logoUrl);
    }
    async function gerar(tipo, botao) {
      var texto = botao.innerHTML; botao.disabled = true; botao.innerHTML = 'Gerando…';
      try {
        var d = await dadosDocumento(), blob, ext;
        if (tipo === 'pdf') { blob = await window.CF.pdf.ficha(d); ext = 'pdf'; }
        else { blob = await window.CF.excel.ficha(d); ext = 'xlsx'; }
        window.CF.pdf.baixar(blob, window.CF.pdf.nomeArquivo(['Ficha', f.jovem.nome, f.codigo], ext));
      } catch (e) { console.error(e); ui.toast(e && e.message ? e.message : 'Não foi possível gerar o arquivo.', 'erro'); }
      botao.disabled = false; botao.innerHTML = texto;
    }
    function ligar() {
      var box = area.querySelector('#fc');
      box.querySelector('#fc-pdf').addEventListener('click', function () { gerar('pdf', this); });
      box.querySelector('#fc-xls').addEventListener('click', function () { gerar('xlsx', this); });
      box.querySelectorAll('[data-eixo]').forEach(function (b) { b.addEventListener('click', function () { st.eixo = b.getAttribute('data-eixo'); desenhar(); }); });
      box.querySelectorAll('[data-modelo]').forEach(function (b) {
        b.addEventListener('click', function () {
          st.modelo = b.getAttribute('data-modelo');
          try { sessionStorage.setItem(CHAVE_MODELO, st.modelo); } catch (e) { /* sem armazenamento: vale só nesta tela */ }
          desenhar();
        });
      });
    }
    desenhar();
  };
})();
