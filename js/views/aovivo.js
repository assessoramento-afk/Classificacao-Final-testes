/* =====================================================================
   Classificação Final · aovivo.js (4.29.0 · T4.2)
   Ao vivo da turma: quem falta fazer o quê, pausar a sala, liberar testes
   por etapa e comandos para o tablet do jovem (tempo, chamar, encerrar).
   Abre por qualquer botão com data-aovivo="<id da turma>".
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc, sb = window.CF.sb;
  function q(p) { return p.then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; }); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function ini(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join(''); }

  async function abrir(turmaId) {
    var j = ui.janela({ titulo: 'Ao vivo', largura: 760, confirmarDescarte: false, corpo: '<div id="av-c"><div class="girando" style="margin:30px auto"></div></div>', botoes: [{ texto: 'Fechar', acao: 'fechar' }] });
    var el = j.elemento, box = el.querySelector('#av-c'), dados = null, aberto = true;
    async function carregar() {
      try { dados = await q(sb.rpc('aovivo_turma', { p_turma: turmaId })); desenhar(); }
      catch (e) { box.innerHTML = '<p class="dica">Não foi possível abrir o Ao vivo: ' + esc((e && e.message) || 'erro') + '. Confira se o SQL fase6_31 foi rodado.</p>'; }
    }
    function situacao(jv) {
      var tb = jv.tablet, ra = jv.rascunho, agora = Date.now();
      if (tb && tb.fase === 'teste') return { cor: '#ee7330', t: 'fazendo', teste: tb.teste_id, fim: tb.fim };
      if (tb && tb.fase === 'lista') return { cor: '#2f9a5b', t: 'escolhendo o teste' };
      if (ra) return { cor: '#8a8486', t: 'sem sinal · ' + (ra.feitas || 0) + ' de ' + (ra.total || '?'), teste: ra.teste_id };
      if (jv.desistiu) return { cor: '#8a8486', t: 'desistiu' };
      if ((jv.feitos || []).length) return { cor: '#2f9a5b', t: 'fora do tablet' };
      return { cor: '#c9c0bb', t: 'ainda não começou' };
    }
    function desenhar() {
      if (!aberto) return;
      var d = dados || {}, sala = d.sala || {}, ts = d.testes || [], js = d.jovens || [], nomeT = {};
      ts.forEach(function (t) { nomeT[t.teste_id] = t.nome; });
      var etapa = sala.etapa == null ? ts.length : sala.etapa;
      var fazendo = js.filter(function (x) { return x.tablet && x.tablet.fase === 'teste'; }).length;
      var feitos = js.reduce(function (a, x) { return a + (x.feitos || []).length; }, 0);
      var presentes = js.filter(function (x) { return x.presente || x.tablet || (x.feitos || []).length; }).length;
      var alertas = [];
      js.forEach(function (x) {
        var ra = x.rascunho; if (!ra) return;
        if (ra.saidas > 0) alertas.push({ r: 1, t: x.nome + ' saiu do app ' + ra.saidas + (ra.saidas > 1 ? ' vezes' : ' vez') + ' · ' + (nomeT[ra.teste_id] || 'teste'), pid: x.participacao_id });
        var parado = ra.mudou_em ? (Date.now() - new Date(ra.mudou_em)) / 60000 : 0;
        if (parado >= 5) alertas.push({ r: 0, t: x.nome + ' parado(a) há ' + Math.floor(parado) + ' min · ' + (nomeT[ra.teste_id] || 'teste'), pid: x.participacao_id });
      });
      box.innerHTML = '<div class="avv-top"><div><b>' + esc((d.turma || {}).nome || 'Turma') + '</b> · ' + esc((d.turma || {}).empresa || '') + ' · ' + esc((d.turma || {}).vaga || '') + '</div><span class="avv-live"><i></i>AO VIVO</span></div>' +
        '<div class="avv-res">' + [['#2f9a5b', presentes, 'presentes'], ['#ee7330', fazendo, 'fazendo agora'], ['#2f6fd0', feitos, 'testes feitos'], ['#8a8486', js.length - presentes, 'faltam chegar']].map(function (k) { return '<div style="--c:' + k[0] + '"><b>' + k[1] + '</b><span>' + k[2] + '</span></div>'; }).join('') + '</div>' +
        '<div class="avv-ctrl"><button type="button" class="btn' + (sala.pausada ? ' btn-pri' : '') + '" id="avv-pausa">' + (sala.pausada ? '▶ Retomar a sala' : '⏸ Pausar a sala') + '</button>' +
          '<button type="button" class="btn" data-resumo-dia="' + turmaId + '">⬇ Resumo do dia (PDF)</button><button type="button" class="btn" data-guia-avaliador>Guia do avaliador</button>' + (etapa < ts.length ? '<button type="button" class="btn btn-pri" id="avv-etapa">Liberar etapa ' + (etapa + 1) + ' · ' + esc(ts[etapa].nome) + '</button>' : '<span class="dica">Todas as etapas liberadas.</span>') + '</div>' +
        (sala.pausada ? '<div class="avv-al r">⏸ Sala pausada desde ' + new Date(sala.pausada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '. O tempo dos testes está parado.</div>' : '') +
        '<div class="avv-et"><b>Etapas</b><div>' + ts.map(function (t, i) { return '<span class="' + (i < etapa ? 'on' : 'lk') + '">' + (i < etapa ? '✓ ' : '🔒 ') + (i + 1) + ' · ' + esc(t.nome) + '</span>'; }).join('') +
          (sala.etapa != null && etapa < ts.length ? '<button type="button" class="avv-tudo" id="avv-todas">liberar todas</button>' : '') + '</div></div>' +
        alertas.map(function (a) { return '<button type="button" class="avv-al' + (a.r ? ' r' : '') + '" data-pj="' + a.pid + '">' + (a.r ? '⚠ ' : '⏳ ') + esc(a.t) + '<u>Ver</u></button>'; }).join('') +
        '<div class="avv-lst">' + js.map(function (x) {
          var s = situacao(x), resta = s.fim ? (new Date(s.fim) - Date.now()) / 1000 : null;
          return '<button type="button" class="avv-j" data-pj="' + x.participacao_id + '" style="--c:' + s.cor + '"><span class="avv-av">' + esc(ini(x.nome)) + '</span><div><b>' + esc(x.nome) + (x.provisorio ? ' <em>provisório</em>' : '') + '</b><small>' +
            (s.teste ? esc(nomeT[s.teste] || 'teste') + ' · ' : '') + esc(s.t) + (resta != null ? ' · faltam ' + mmss(resta) : '') + '</small><div class="avv-tg">' +
            ts.map(function (t) { var feito = (x.feitos || []).indexOf(t.teste_id) >= 0, faz = s.teste === t.teste_id; return '<span class="' + (feito ? 'ok' : faz ? 'fz' : 'no') + '">' + (feito ? '✓ ' : faz ? '▶ ' : '○ ') + esc(t.nome) + '</span>'; }).join('') + '</div></div>' +
            (x.tablet ? '<span class="avv-tb">' + esc(String(x.tablet.etiqueta || x.tablet.nome || '').replace(/[^0-9A-Za-z]/g, '')) + '</span>' : '') + '</button>';
        }).join('') + '</div><p class="dica">Atualiza sozinho a cada 15 segundos. Os tablets recebem os comandos em até 15 segundos (com internet).</p>';
      var bp = box.querySelector('#avv-pausa'); bp.addEventListener('click', async function () {
        if (!sala.pausada && !(await ui.confirmar('Pausar a sala?', 'O tempo de todos os testes desta turma para, e os tablets mostram "Sala pausada".', 'Pausar', 'Cancelar'))) return;
        try { await q(sb.rpc('aovivo_sala', { p_turma: turmaId, p_pausar: !sala.pausada })); carregar(); } catch (e) { ui.toast(api(e), 'erro'); }
      });
      var be = box.querySelector('#avv-etapa'); if (be) be.addEventListener('click', async function () { try { await q(sb.rpc('aovivo_sala', { p_turma: turmaId, p_etapa: etapa + 1 })); carregar(); } catch (e) { ui.toast(api(e), 'erro'); } });
      var bt = box.querySelector('#avv-todas'); if (bt) bt.addEventListener('click', async function () { try { await q(sb.rpc('aovivo_sala', { p_turma: turmaId, p_todas: true })); carregar(); } catch (e) { ui.toast(api(e), 'erro'); } });
      box.querySelectorAll('[data-pj]').forEach(function (b) { b.addEventListener('click', function () { acoes(js.filter(function (x) { return x.participacao_id === b.getAttribute('data-pj'); })[0], nomeT); }); });
    }
    function api(e) { return window.CF.api ? window.CF.api.traduzErro(e) : ((e && e.message) || 'Erro'); }
    function acoes(x, nomeT) {
      if (!x) return;
      var s = situacao(x), noTablet = !!x.tablet;
      var k = ui.janela({ titulo: x.nome, largura: 460, confirmarDescarte: false,
        corpo: '<p class="dica">' + (s.teste ? esc(nomeT[s.teste] || 'teste') + ' · ' : '') + esc(s.t) + (x.tablet ? ' · TABLET ' + esc(String(x.tablet.etiqueta || '').replace(/[^0-9A-Za-z]/g, '')) : '') + '</p>' +
          (noTablet ? '<div class="avv-ac"><b>Adicionar tempo</b><div class="avv-op">' + [1, 2, 5].map(function (m) { return '<button type="button" class="btn" data-min="' + m + '">+' + m + ' min</button>'; }).join('') + '</div>' +
            '<button type="button" class="btn" id="avc-chamar">✉ Pedir para o tablet chamar o avaliador</button>' +
            (s.teste ? '<b style="margin-top:10px">Encerrar este teste agora</b><select class="entrada" id="avc-mot"><option value="">Motivo (obrigatório)…</option><option>Passou mal e foi embora</option><option>Comportamento inadequado</option><option>Pedido do próprio jovem</option><option>Problema no tablet</option><option value="outro">Outro motivo…</option></select><input class="entrada" id="avc-out" placeholder="Descreva o motivo" hidden>' +
              '<button type="button" class="btn btn-perigo" id="avc-enc">⛔ Encerrar o teste</button><p class="dica">O tablet salva o que foi respondido e envia. Fica no histórico, com o motivo.</p>' : '') + '</div>'
            : '<p class="dica">Este jovem não está em nenhum tablet agora. Os comandos só funcionam com o jovem no tablet.</p>'),
        botoes: [{ texto: 'Fechar', acao: 'fechar' }] });
      var e2 = k.elemento;
      async function cmd(tipo, valor, motivo) { try { await q(sb.rpc('aovivo_comando', { p_participacao: x.participacao_id, p_tipo: tipo, p_valor: valor || null, p_motivo: motivo || null })); ui.toast('Comando enviado. O tablet recebe em até 15 segundos.', 'ok'); k.fechar(true); setTimeout(carregar, 2000); } catch (e) { ui.toast(api(e), 'erro'); } }
      e2.querySelectorAll('[data-min]').forEach(function (b) { b.addEventListener('click', function () { cmd('tempo', { min: +b.getAttribute('data-min') }, 'Ao vivo'); }); });
      var ch = e2.querySelector('#avc-chamar'); if (ch) ch.addEventListener('click', function () { cmd('chamar'); });
      var mo = e2.querySelector('#avc-mot'), ou = e2.querySelector('#avc-out');
      if (mo) mo.addEventListener('change', function () { ou.hidden = mo.value !== 'outro'; });
      var en = e2.querySelector('#avc-enc'); if (en) en.addEventListener('click', async function () {
        var m = mo.value === 'outro' ? ou.value.trim() : mo.value; if (!m || m.length < 3) { ui.toast('Escolha ou descreva o motivo.', 'erro'); return; }
        if (!(await ui.confirmar('Encerrar o teste de ' + x.nome + '?', 'O teste termina agora no tablet, com o que já foi respondido. Motivo: ' + m + '.', 'Encerrar', 'Cancelar'))) return;
        cmd('encerrar', null, m);
      });
    }
    await carregar();
    var tA = setInterval(function () { if (!document.body.contains(el)) { aberto = false; clearInterval(tA); return; } if (!document.hidden) carregar(); }, 15000);
  }
  window.CF.aoVivo = abrir;
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-aovivo]'); if (!b) return; e.preventDefault(); abrir(b.getAttribute('data-aovivo')); });
})();
