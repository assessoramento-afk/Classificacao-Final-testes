/* =====================================================================
   Classificação Final · t43.js (4.30.0 · T4.3)
   Resumo do dia em PDF · Guia do avaliador para imprimir · Respostas abertas para pontuar
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc, sb = window.CF.sb;
  function q(p) { return p.then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; }); }
  function hora(x) { return x ? new Date(x).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''; }
  function dataBR(x) { var s = String(x || '').slice(0, 10).split('-'); return s.length === 3 ? s[2] + '/' + s[1] + '/' + s[0] : ''; }
  function api(e) { return window.CF.api ? window.CF.api.traduzErro(e) : ((e && e.message) || 'Erro'); }
  var ACOES = { tempo_adicionado: 'Tempo adicionado', teste_encerrado: 'Teste encerrado', teste_retomado: 'Teste retomado', teste_recomecado: 'Teste recomeçado', teste_transferido: 'Teste trocado de tablet',
    sala_pausada: 'Sala pausada', jovem_provisorio: 'Jovem sem cadastro (provisório)', aovivo_tempo: 'Tempo enviado pelo Ao vivo', aovivo_encerrar: 'Encerramento pelo Ao vivo', aovivo_chamar: 'Avaliador chamado', refazer: 'Refazer autorizado', foto: 'Foto tirada' };

  /* ---------------- 1) Resumo do dia em PDF ---------------- */
  async function resumoDia(turmaId, dia) {
    var d;
    try { d = await q(sb.rpc('aovivo_resumo', { p_turma: turmaId, p_dia: dia || null })); }
    catch (e) { ui.toast('Não foi possível gerar o resumo: ' + api(e) + '. Confira se o SQL fase6_32 foi rodado.', 'erro'); return; }
    var P = window.CF.pdf, doc = await P.novo(), W = 210, M = 14, y = 16, tu = d.turma || {}, ts = d.testes || [], js = d.jovens || [];
    function linha(txt, x, yy, peso, tam, cor) { doc.setFont('P', peso || 'normal'); doc.setFontSize(tam || 9); doc.setTextColor.apply(doc, cor || [35, 31, 31]); doc.text(String(txt), x, yy); }
    function quebra(alt) { if (y + (alt || 6) > 282) { doc.addPage(); y = 16; } }
    linha('Resumo do dia · ' + (tu.nome || 'Turma'), M, y, 'bold', 15); doc.setFont('P', 'normal'); doc.setFontSize(8); doc.setTextColor(122, 112, 108); doc.text('Projeto Gol Jovens Talentos', W - M, y - 2, { align: 'right' });
    y += 6; var hr = d.horario || {}; linha((tu.empresa || '') + ' · ' + (tu.vaga || '') + ' · ' + dataBR(d.dia) + (hr.inicio ? ' · ' + String(hr.inicio).slice(0, 5) + ' – ' + String(hr.fim || '').slice(0, 5) : ''), M, y, 'normal', 9, [106, 96, 92]);
    y += 3; doc.setDrawColor(238, 115, 48); doc.setLineWidth(0.9); doc.line(M, y, W - M, y); y += 7;
    var presentes = js.filter(function (j) { return j.presente === true; }).length, feitos = js.reduce(function (a, j) { return a + (j.resultados || []).length; }, 0);
    var prov = js.filter(function (j) { return j.provisorio; }), saidas = js.filter(function (j) { return (j.resultados || []).some(function (r) { return r.saidas > 0; }); }), confl = js.filter(function (j) { return (j.resultados || []).some(function (r) { return r.situacao === 'conflito'; }); });
    var pend = [];
    prov.forEach(function (j) { pend.push('Completar o cadastro provisório de ' + j.nome); });
    confl.forEach(function (j) { pend.push('Resolver conflito de envio do tablet · ' + j.nome); });
    saidas.forEach(function (j) { pend.push('Decidir a saída do app · ' + j.nome); });
    [[js.length, 'inscritos'], [presentes, 'presentes'], [feitos, 'testes feitos'], [pend.length, 'pendências']].forEach(function (k, i) {
      var x = M + i * 46; doc.setDrawColor(230, 222, 217); doc.setLineWidth(0.3); doc.roundedRect(x, y - 5, 42, 13, 2, 2); linha(k[0], x + 21 - doc.getTextWidth(String(k[0])) / 2, y + 2, 'bold', 13); doc.setFont('P', 'normal'); doc.setFontSize(7); doc.setTextColor(106, 96, 92); doc.text(k[1], x + 21, y + 6.5, { align: 'center' });
    });
    y += 16;
    linha('PRESENÇA E TESTES', M, y, 'bold', 9, [217, 99, 31]); y += 5;
    var cols = [M, M + 72, M + 92].concat(ts.map(function (t, i) { return M + 112 + i * Math.min(24, 70 / Math.max(1, ts.length)); }));
    linha('Jovem', cols[0], y, 'bold', 7.5, [122, 112, 108]); linha('Presença', cols[1], y, 'bold', 7.5, [122, 112, 108]);
    ts.forEach(function (t, i) { linha(String(t.nome).slice(0, 12), cols[3 + i] - 20, y, 'bold', 7, [122, 112, 108]); }); y += 4;
    js.forEach(function (j) {
      quebra(6); doc.setDrawColor(238, 234, 230); doc.line(M, y + 1.5, W - M, y + 1.5);
      linha(String(j.nome).slice(0, 38) + (j.provisorio ? ' (provisório)' : ''), cols[0], y, 'normal', 7.5, j.provisorio ? [168, 58, 54] : [35, 31, 31]);
      linha(j.presente === true ? 'presente' : j.presente === false ? 'faltou' : '—', cols[1], y, 'normal', 7.5, j.presente ? [47, 122, 76] : [154, 143, 138]);
      ts.forEach(function (t, i) { var r = (j.resultados || []).filter(function (x) { return x.teste_id === t.teste_id; })[0];
        linha(r ? (r.situacao === 'conflito' ? 'conflito' : (r.nota == null ? 'feito' : 'nota ' + r.nota)) : '—', cols[3 + i] - 20, y, 'normal', 7.5, r ? (r.situacao === 'conflito' ? [168, 58, 54] : [47, 122, 76]) : [154, 143, 138]); });
      y += 5;
    });
    y += 4; quebra(12); linha('OCORRÊNCIAS', M, y, 'bold', 9, [217, 99, 31]); y += 5;
    var oc = d.ocorrencias || [];
    if (!oc.length) { linha('Nenhuma ocorrência registrada pelos tablets.', M, y, 'normal', 8, [106, 96, 92]); y += 5; }
    oc.forEach(function (o) { quebra(6); linha(hora(o.em), M, y, 'bold', 7.5); var t = (ACOES[o.acao] || o.acao) + (o.detalhe ? ' · ' + o.detalhe : '') + (o.tablet ? ' · ' + o.tablet : '') + (o.por ? ' · ' + o.por : '');
      doc.splitTextToSize(t, W - M * 2 - 16).forEach(function (l2, k) { if (k) { y += 4; quebra(5); } linha(l2, M + 14, y, 'normal', 7.5); }); y += 5; });
    y += 3; quebra(12); linha('PENDÊNCIAS', M, y, 'bold', 9, [217, 99, 31]); y += 5;
    if (!pend.length) { linha('Nenhuma pendência.', M, y, 'normal', 8, [47, 122, 76]); y += 5; }
    pend.forEach(function (p) { quebra(6); linha('• ' + p, M, y, 'normal', 7.5); y += 5; });
    y = Math.max(y + 16, 262); if (y > 280) { doc.addPage(); y = 40; }
    doc.setDrawColor(150, 150, 150); doc.line(M, y, M + 75, y); doc.line(W - M - 75, y, W - M, y);
    linha('Avaliador(a)', M + 26, y + 4, 'normal', 8, [106, 96, 92]); linha('Coordenação', W - M - 48, y + 4, 'normal', 8, [106, 96, 92]);
    linha('Gerado pelo sistema em ' + new Date().toLocaleString('pt-BR'), M, 290, 'normal', 7, [154, 143, 138]);
    if (window.CF.drive) window.CF.drive.definirContexto({ processo_id: tu.processo_id, empresa: tu.empresa, processo: (tu.vaga || '') + (tu.identificacao ? ' · ' + tu.identificacao : '') });
    P.baixar(doc.output('blob'), 'Resumo do dia - ' + (tu.nome || 'Turma') + ' - ' + dataBR(d.dia).replace(/\//g, '-') + '.pdf');
  }

  /* ---------------- 2) Guia do avaliador ---------------- */
  function guia() {
    var B = [
      ['1 · Antes da turma', ['Carregue os tablets e confira, no topo de cada um, a versão do app (no modo avaliador, "⬆ Atualizar o app agora").', 'Crie o seu PIN em Minha conta (o tablet só aceita avaliadores com PIN).', 'Abra o Ao vivo da turma no celular (Avaliar › turma › ● Ao vivo).']],
      ['2 · Chegada dos jovens', ['O jovem digita o código do crachá (ou lê o QR Code) e confere nome, empresa e turma.', '"Tem algo errado" vira um pedido de correção para a equipe; ele segue para os testes.', 'Chegou alguém sem cadastro? Segure o logo 3 s › PIN › "Jovem sem cadastro". Anote o código no crachá.']],
      ['3 · Durante os testes', ['Modo avaliador: segure o logo do topo por 3 segundos e digite o PIN.', 'Adicionar tempo: durante o teste, segure o logo › PIN › +1, +2, +5 ou outro.', 'Teste interrompido (app fechou): ao voltar, escolha com o PIN "Continuar" ou "Recomeçar".', 'Trocar de tablet: entre com o crachá no outro tablet › "Continuar aqui (avaliador)" (precisa de internet).']],
      ['4 · Controle da sala (Ao vivo)', ['Pausar a sala: para o tempo de todos os testes; "Retomar" continua de onde parou.', 'Liberar etapas: os jovens só veem os testes das etapas liberadas.', 'Toque num jovem: adicionar tempo, chamar o avaliador ou encerrar o teste (motivo obrigatório).', 'Alertas: jovem parado há 5 min e saída do app.']],
      ['5 · Problemas comuns', ['Sem internet: tudo fica guardado no tablet e é enviado quando a conexão voltar ("Tudo enviado" no topo).', '"✓ JÁ PREENCHIDO": o teste já foi feito; refazer só com o PIN e justificativa.', 'PIN errado 5 vezes: o avaliador fica bloqueado 15 min naquele tablet.', 'Tablet "sem sinal" no Ao vivo: confira o Wi-Fi e a bateria.']],
      ['6 · Fim do dia', ['Confira "Tudo enviado" em cada tablet antes de desligar.', 'Gere o Resumo do dia (Ao vivo › Resumo do dia) e confira as pendências.', 'Pontue as respostas abertas em Tablets › Resultados recebidos.']]
    ];
    var w = window.open('', '_blank'); if (!w) { ui.toast('Libere as janelas do navegador para imprimir o guia.', 'erro'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Guia rápido do avaliador · Projeto Gol Testes</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#231f1f;font-size:11.5px;line-height:1.45}h1{margin:0;font-size:20px}small{color:#7a706c}.g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.b{border:1px solid #e6ded9;border-radius:10px;padding:10px 12px;break-inside:avoid}.b b{color:#d9631f;font-size:13px;display:block;margin-bottom:4px}ul{margin:0;padding-left:16px}li{margin:3px 0}.r{margin-top:12px;color:#7a706c;font-size:10px}</style></head><body>' +
      '<h1>Guia rápido do avaliador</h1><small>Projeto Gol Jovens Talentos · app Projeto Gol Testes · versão do sistema ' + esc(window.CF_CONFIG.versao) + '</small><div class="g">' +
      B.map(function (b) { return '<div class="b"><b>' + b[0] + '</b><ul>' + b[1].map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>'; }).join('') +
      '</div><p class="r">Dúvidas: coordenação do Projeto Gol Jovens Talentos · Kolping Estadual de São Paulo.</p><script>setTimeout(function(){print()},300)<\/script></body></html>');
    w.document.close();
  }

  /* ---------------- 3) Respostas abertas para pontuar ---------------- */
  var estruturas = {};
  async function estruturaDe(testeId, versao) {
    var k = testeId + '|' + versao; if (estruturas[k]) return estruturas[k];
    var r = await q(sb.from('teste_tablet_versoes').select('estrutura').eq('teste_id', testeId).eq('versao', versao).maybeSingle());
    estruturas[k] = r ? r.estrutura : null; return estruturas[k];
  }
  async function abertas(box) {
    box.innerHTML = '<div class="girando" style="margin:20px auto"></div>';
    var lista = [];
    try {
      var rs = await q(sb.from('tablet_resultados').select('id, participacao_id, teste_id, versao, respostas, pontos, total, nota, situacao, recebido_em').in('situacao', ['gravado', 'conflito']).order('recebido_em', { ascending: false }).limit(300));
      for (var i = 0; i < rs.length; i++) {
        var r = rs[i], est = await estruturaDe(r.teste_id, r.versao); if (!est) continue;
        (est.partes || []).forEach(function (p, pi) { if (p.tipo === 'aberta' && +p.pontos > 0) { var rr = (r.respostas || {})[pi] || {}; if (rr.pontos_avaliador == null) lista.push({ r: r, est: est, pi: pi, p: p, texto: rr.texto || '' }); } });
      }
      var ids = lista.map(function (x) { return x.r.participacao_id; });
      var nomes = {}; if (ids.length) (await q(sb.from('participacoes').select('id, jovens(nome), turmas(nome)').in('id', ids))).forEach(function (x) { nomes[x.id] = { n: (x.jovens || {}).nome, t: (x.turmas || {}).nome }; });
      var tn = {}; (await q(sb.from('testes').select('id, nome').in('id', lista.map(function (x) { return x.r.teste_id; })))).forEach(function (t) { tn[t.id] = t.nome; });
      lista.forEach(function (x) { x.nome = (nomes[x.r.participacao_id] || {}).n || 'Jovem'; x.turma = (nomes[x.r.participacao_id] || {}).t || ''; x.teste = tn[x.r.teste_id] || 'Teste'; });
    } catch (e) { box.innerHTML = '<p class="dica">Não foi possível carregar as respostas abertas: ' + esc(api(e)) + '</p>'; return; }
    if (!lista.length) { box.innerHTML = '<h2 style="margin:0 0 6px">Respostas abertas para pontuar</h2><p class="dica">✓ Nenhuma resposta aberta esperando pontos. (Elas aparecem aqui quando o teste define pontos máximos para a resposta aberta, no editor.)</p>'; return; }
    box.innerHTML = '<h2 style="margin:0 0 4px">Respostas abertas para pontuar <span class="badge">' + lista.length + '</span></h2><p class="dica">A nota do teste é recalculada na hora e vai para a Classificação.</p>' + lista.map(function (x, k) {
      var max = +x.p.pontos;
      return '<div class="ra-c" data-k="' + k + '"><div class="ra-h"><b>' + esc(x.nome) + '</b><span>' + esc(x.turma) + ' · ' + esc(x.teste) + '</span></div><p class="ra-q">' + esc(x.p.pergunta || 'Resposta aberta') + '</p>' +
        '<blockquote class="ra-r">' + (x.texto ? esc(x.texto) : '<i>em branco</i>') + '</blockquote><div class="ra-p">Pontos (máx. ' + max + '): ' +
        Array.apply(null, { length: Math.floor(max) + 1 }).map(function (z, n) { return '<button type="button" class="ra-n" data-n="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
        '<p class="ra-prev dica"></p><input class="entrada" data-com placeholder="Comentário (opcional)"><button type="button" class="btn btn-pri" data-salvar disabled>Salvar e recalcular a nota</button></div>';
    }).join('');
    box.querySelectorAll('.ra-c').forEach(function (c) {
      var x = lista[+c.getAttribute('data-k')], escolhido = null, novo = null;
      c.querySelectorAll('.ra-n').forEach(function (b) { b.addEventListener('click', function () {
        escolhido = +b.getAttribute('data-n'); c.querySelectorAll('.ra-n').forEach(function (y) { y.classList.toggle('on', y === b); });
        var resp = JSON.parse(JSON.stringify(x.r.respostas || {})); resp[x.pi] = Object.assign({}, resp[x.pi] || {}, { pontos_avaliador: escolhido });
        var cor = window.CF.testesMotor.corrigir(x.est, resp); novo = { resp: resp, cor: cor };
        c.querySelector('.ra-prev').innerHTML = 'Pontuação: ' + (x.r.pontos == null ? '—' : String(x.r.pontos).replace('.', ',')) + ' → <b>' + String(cor.pontos).replace('.', ',') + ' de ' + String(cor.total).replace('.', ',') + '</b> · nota ' + (x.r.nota == null ? '—' : x.r.nota) + ' → <b>' + cor.nota + '</b>';
        c.querySelector('[data-salvar]').disabled = false;
      }); });
      c.querySelector('[data-salvar]').addEventListener('click', async function () {
        if (!novo) return; this.disabled = true;
        try { await q(sb.rpc('tablet_resultado_pontuar', { p_res: x.r.id, p_respostas: novo.resp, p_pontos: novo.cor.pontos, p_nota: novo.cor.nota, p_detalhe: 'resposta aberta: ' + escolhido + ' de ' + x.p.pontos + (c.querySelector('[data-com]').value ? ' · ' + c.querySelector('[data-com]').value : '') }));
          ui.toast('Pontos salvos. Nota recalculada.', 'ok'); c.remove(); }
        catch (e) { ui.toast(api(e), 'erro'); this.disabled = false; }
      });
    });
  }

  window.CF.t43 = { resumoDia: resumoDia, guia: guia, abertas: abertas };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-resumo-dia]'); if (b) { e.preventDefault(); resumoDia(b.getAttribute('data-resumo-dia')); return; }
    var g = e.target.closest('[data-guia-avaliador]'); if (g) { e.preventDefault(); guia(); }
  });
})();
