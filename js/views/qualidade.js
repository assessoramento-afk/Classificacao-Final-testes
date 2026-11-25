/* =====================================================================
   Q5 · Qualidade: painel geral, checklist de cada teste/módulo,
   verificação automática e aprovação final (libera a publicação).
   Endereço: #/config/qualidade
   ===================================================================== */
(function () {
  'use strict';
  var ST = { nao_iniciado: ['Não iniciado', '#8a8486'], em_teste: ['Em teste', '#2f6fd0'], em_conferencia: ['Em conferência', '#2f6fd0'], pendencia: ['Com pendência', '#e0a100'], bloqueado: ['Bloqueado', '#D9534F'], liberado: ['Liberado', '#3FA66B'] };
  function pct(cs) { var tot = cs.reduce(function (a, c) { return a + c.peso; }, 0) || 1; return Math.round(cs.filter(function (c) { return c.situacao === 'ok'; }).reduce(function (a, c) { return a + c.peso; }, 0) / tot * 100); }

  // Verificação automática: pontos máximos dão nota 5, em branco dá a nota mínima, faixas sem buracos, toda pergunta com gabarito
  function verificar(est) {
    var M = window.CF.testesMotor, res = [], tot = M.total(est), fx = (est.faixas || []).slice().sort(function (a, b) { return a.min - b.min; });
    var notaMax = M.nota(est, est.modo_nota === 'percentual' ? tot : tot, tot), branco = M.corrigir(est, {});
    res.push(['Tudo certo (' + String(tot).replace('.', ',') + ' pontos) dá nota 5', notaMax === 5]);
    res.push(['Em branco dá 0 ponto e nota mínima (' + branco.nota + ')', branco.pontos === 0 && branco.nota <= 1]);
    res.push(['As faixas começam no 0 e não têm buracos', fx.length > 0 && Number(fx[0].min) === 0 && [1, 2, 3, 4, 5].every(function (n) { return fx.some(function (f) { return +f.nota === n; }); })]);
    var semGab = 0;
    (est.partes || []).forEach(function (p) {
      if (p.tipo === 'escolha') (p.questoes || []).forEach(function (q) { if (q.correta == null || !(q.alternativas || [])[q.correta] && !q.so_letras) semGab++; });
      if (p.tipo === 'tabela') (p.linhas || []).forEach(function (l) { (p.colunas || []).filter(function (c) { return !c.fixo && !c.vazio_ok && (!l.somente || l.somente.indexOf(c.chave) >= 0); }).forEach(function (c) { if (!String((l.gabarito || {})[c.chave] || '').trim()) semGab++; }); });
      if (p.tipo === 'ordem') { var g = (p.gabarito || []).slice().sort(function (a, b) { return a - b; }); if (g.join() !== (p.itens || []).map(function (x, i) { return i + 1; }).join()) semGab++; }
      if (p.tipo === 'agrupar') (p.itens || []).forEach(function (it) { if (it.grupo == null || !(p.grupos || [])[it.grupo]) semGab++; });
      if (p.tipo === 'memoria') (p.pessoas || []).forEach(function (pe) { (p.campos || []).forEach(function (c) { if (!String(pe[c[0]] || '').trim()) semGab++; }); });
    });
    res.push(['Toda pergunta tem resposta certa' + (semGab ? ' (faltam ' + semGab + ')' : ''), semGab === 0]);
    res.push(['O teste tem tempo definido', +est.tempo_min > 0]);
    return res;
  }

  window.CF.qualidade = async function (area) {
    var ui = window.CF.ui, esc = ui.esc, sb = window.CF.sb;
    area.innerHTML = '<a class="voltar" href="#/config">← Configurações</a><header class="cabecalho"><div><h1>Qualidade</h1><p>Conferência dos testes e dos módulos antes de irem para os tablets</p></div></header><div id="ql"><div class="girando" style="margin:30px auto"></div></div>';
    try { await sb.rpc('qualidade_preparar'); } catch (e) {}
    var its = [], cks = [];
    try { its = ((await sb.from('qualidade_itens').select('*').order('tipo').order('nome')).data) || []; cks = ((await sb.from('qualidade_checks').select('*').order('ordem')).data) || []; } catch (e) {}
    var box = area.querySelector('#ql');
    if (!its.length) { box.innerHTML = '<section class="card bloco"><p class="dica">Nenhum item ainda. Falta rodar o SQL da Q5 (fase6_26) ou marcar testes como "Aplicado no tablet".</p></section>'; return; }
    function de(id) { return cks.filter(function (c) { return c.item_id === id; }); }
    var cont = { liberado: 0, conf: 0, pend: 0, bloq: 0 };
    its.forEach(function (i) { if (i.status === 'liberado') cont.liberado++; else if (i.status === 'bloqueado') cont.bloq++; else if (i.status === 'pendencia') cont.pend++; else cont.conf++; });
    function linha(i) { var cs = de(i.id), p = pct(cs), s = ST[i.status] || ST.nao_iniciado, falta = cs.filter(function (c) { return c.situacao !== 'ok'; }).length, fl = cs.filter(function (c) { return c.situacao === 'falha'; })[0];
      return '<button type="button" class="ql-l" data-it="' + i.id + '" style="--c:' + s[1] + '"><span><b>' + esc(i.nome) + '</b><small>' + (i.tipo === 'teste' ? 'teste' : 'módulo') + (i.aprovado_em ? ' · aprovado em ' + new Date(i.aprovado_em).toLocaleDateString('pt-BR') : '') + '</small></span>' +
        '<span><span class="ql-bar"><i style="width:' + p + '%"></i></span><small>' + p + '%' + (fl ? ' · falha: ' + esc(fl.nome) : falta ? ' · faltam ' + falta + ' itens' : ' · tudo conferido') + '</small></span><span class="ql-st">' + s[0] + '</span></button>'; }
    box.innerHTML = '<div class="tb-kp">' + [['liberado', 'liberados', '#3FA66B'], ['conf', 'em conferência', '#2f6fd0'], ['pend', 'com pendência', '#e0a100'], ['bloq', 'bloqueados por falha crítica', '#D9534F']].map(function (k) { return '<div class="tb-k" style="--c:' + k[2] + '"><b>' + cont[k[0]] + '</b><span>' + k[1] + '</span></div>'; }).join('') + '</div>' +
      '<h2 class="ql-h">Testes do tablet</h2>' + its.filter(function (i) { return i.tipo === 'teste'; }).map(linha).join('') + '<h2 class="ql-h">Módulos</h2>' + its.filter(function (i) { return i.tipo === 'modulo'; }).map(linha).join('') +
      '<p class="dica">Um teste só é publicado no tablet com 100% e a aprovação final. Se o teste mudar depois da aprovação, precisa conferir e aprovar de novo.</p>';
    box.querySelectorAll('[data-it]').forEach(function (b) { b.addEventListener('click', function () { abrir(its.filter(function (x) { return x.id === b.getAttribute('data-it'); })[0]); }); });

    async function abrir(i) {
      var cs = de(i.id), est = null;
      if (i.tipo === 'teste') { try { var r = await sb.from('teste_tablet').select('estrutura').eq('teste_id', i.teste_id).maybeSingle(); est = r.data && r.data.estrutura; } catch (e) {} }
      var pode = window.CF.perm.pode('qualidade_aprovar'), p = pct(cs);
      var j = ui.janela({ titulo: i.nome, largura: 760, confirmarDescarte: false,
        corpo: '<div class="ql-bar ql-g"><i style="width:' + p + '%"></i></div><p class="dica">' + p + '% · ' + cs.map(function (c) { return c.nome.split(' ')[0].toLowerCase() + ' ' + c.peso; }).join(' · ') + '</p>' +
          (est ? '<div class="ql-auto"><b>Verificação automática</b> <button type="button" class="btn btn-p" id="ql-v">▶ Rodar agora</button><div id="ql-vr" class="dica">O sistema responde o teste sozinho e confere a nota, as faixas e o gabarito.</div></div>' : '') +
          cs.map(function (c) { return '<div class="ql-c ql-' + c.situacao + '" data-ch="' + c.chave + '"><div class="ql-ct"><b>' + esc(c.nome) + (c.critico ? ' <em>crítico</em>' : '') + '</b><small>' + (c.por ? (c.automatico ? 'verificação automática' : 'conferido') + ' em ' + new Date(c.em).toLocaleString('pt-BR') : 'pendente') + (c.obs ? ' · ' + esc(c.obs) : '') + (c.evidencia ? ' · evidência: ' + esc(c.evidencia) : '') + '</small></div>' +
            '<div class="ql-bt"><button type="button" data-s="ok" class="' + (c.situacao === 'ok' ? 'on' : '') + '">✓ OK</button><button type="button" data-s="falha" class="' + (c.situacao === 'falha' ? 'on' : '') + '">! Falha</button><button type="button" data-s="pendente" class="' + (c.situacao === 'pendente' ? 'on' : '') + '">○</button></div></div>'; }).join(''),
        botoes: [{ texto: 'Fechar', acao: 'fechar' }].concat(pode ? [{ texto: 'Aprovação final', principal: true, aoClicar: async function () {
          var r = await sb.rpc('qualidade_aprovar', { p_item: i.id }); if (r.error) { ui.toast(r.error.message, 'erro'); return false; }
          ui.toast('Aprovado. O teste já pode ser publicado no tablet.', 'ok'); window.CF.qualidade(area); return true; } }] : []) });
      var el = j.elemento;
      el.querySelectorAll('[data-ch] [data-s]').forEach(function (b) { b.addEventListener('click', async function () {
        var ch = b.closest('[data-ch]').getAttribute('data-ch'), s = b.getAttribute('data-s'), obs = null, ev = null;
        if (s === 'falha') { obs = window.prompt('Descreva a falha encontrada:'); if (!obs) return; ev = window.prompt('Evidência (link do print ou observação) · opcional:') || null; }
        var r = await sb.rpc('qualidade_marcar', { p_item: i.id, p_chave: ch, p_situacao: s, p_obs: obs, p_evidencia: ev, p_auto: false });
        if (r.error) { ui.toast(r.error.message, 'erro'); return; }
        j.fechar(true); window.CF.qualidade(area);
      }); });
      var bv = el.querySelector('#ql-v'); if (bv) bv.addEventListener('click', async function () {
        var res = verificar(est), ok = res.every(function (x) { return x[1]; });
        el.querySelector('#ql-vr').innerHTML = res.map(function (x) { return (x[1] ? '✓ ' : '✗ ') + esc(x[0]); }).join('<br>');
        var falhas = res.filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; }).join('; ');
        var gabOk = res[3][1], notaOk = res[0][1] && res[1][1] && res[2][1];
        await sb.rpc('qualidade_marcar', { p_item: i.id, p_chave: 'gabarito', p_situacao: gabOk ? 'ok' : 'falha', p_obs: gabOk ? 'verificação automática' : res[3][0], p_evidencia: null, p_auto: true });
        await sb.rpc('qualidade_marcar', { p_item: i.id, p_chave: 'nota', p_situacao: notaOk ? 'ok' : 'falha', p_obs: notaOk ? 'verificação automática' : falhas, p_evidencia: null, p_auto: true });
        ui.toast(ok ? 'Verificação automática: tudo certo.' : 'Verificação automática encontrou problema: ' + falhas, ok ? 'ok' : 'erro');
      });
    }
  };
})();
