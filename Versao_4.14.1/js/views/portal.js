/* =====================================================================
   Classificação Final · views/portal.js
   · #/portal ..................................... empresa: processos liberados
   · #/portal/<processo> .......................... empresa: resultado + acompanhamento
   · #/portal/<processo>/ficha/<participação> ..... empresa: ficha (só consulta)
   · #/acompanhamento ............................. Kolping: todos os jovens aprovados pelas empresas
   Acompanhamento: a empresa informa se aprovou o jovem (e a data). A partir dessa data
   o sistema pede uma avaliação aos 3, 6, 9 e 12 meses (nota 1 a 5 + observação opcional);
   aos 12 meses pergunta também se o jovem foi contratado. Atrasada = 15 dias após a data.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, esc = ui.esc;
  var MARCOS = [3, 6, 9, 12], TOLERANCIA = 15;
  var COR = { aprovado: '#3FA66B', backup: '#E9B500', reprovado: '#D9534F', desistencia: '#8a8486', incompleto: '#5b6b8a' };

  function sb() { return window.CF.sb; }
  async function rpc(nome, args) { var r = await sb().rpc(nome, args || {}); if (r.error) throw r.error; return r.data; }
  function dataBR(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function somarMeses(iso, m) {
    var p = String(iso).slice(0, 10).split('-').map(Number), d = new Date(p[0], p[1] - 1 + m, p[2]);
    if (d.getDate() !== p[2]) d = new Date(p[0], p[1] - 1 + m + 1, 0);   // 31/01 + 1 mês = último dia de fevereiro
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function somarDias(iso, n) { var p = String(iso).split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function flex(g, m, f) { return g === 'feminino' ? f : (g === 'masculino' ? m : m + '(a)'); }

  /* Situação de cada marco: feita · futura · pendente · atrasada */
  function marcos(a) {
    var hoje = hojeISO(), feitas = {};
    (a.avaliacoes || []).forEach(function (v) { feitas[v.marco] = v; });
    return MARCOS.map(function (m) {
      var vence = somarMeses(a.aprovado_em, m), limite = somarDias(vence, TOLERANCIA);
      var st = feitas[m] ? 'feita' : (hoje < vence ? 'futura' : (hoje <= limite ? 'pendente' : 'atrasada'));
      return { marco: m, vence: vence, limite: limite, estado: st, avaliacao: feitas[m] || null };
    });
  }
  function resumo(a) {
    if (!a.aprovado) return { cls: 'nao', txt: flex(a.genero, 'Reprovado', 'Reprovada') + ' pela empresa' };
    var ms = marcos(a), atr = ms.filter(function (x) { return x.estado === 'atrasada'; }), pen = ms.filter(function (x) { return x.estado === 'pendente'; });
    if (atr.length) return { cls: 'atrasada', txt: 'Atrasada: ' + atr[0].marco + ' meses (prazo encerrou em ' + dataBR(atr[0].limite) + ')' };
    if (pen.length) return { cls: 'pendente', txt: 'Aguardando: ' + pen[0].marco + ' meses (vence ' + dataBR(pen[0].limite) + ')' };
    if (ms.every(function (x) { return x.estado === 'feita'; })) return { cls: 'concluido', txt: 'Concluído · ' + (a.contratado ? flex(a.genero, 'contratado', 'contratada') : flex(a.genero, 'não contratado', 'não contratada')) };
    var prox = ms.filter(function (x) { return x.estado === 'futura'; })[0];
    return { cls: 'emdia', txt: 'Em dia · próxima em ' + dataBR(prox.vence) };
  }
  // Barra de progresso das avaliações (3, 6, 9 e 12 meses) + contratação
  function trilha(a) {
    var ms = marcos(a), r = resumo(a);
    var COR = { atrasada: '#D9534F', pendente: '#b38600', emdia: '#3FA66B', concluido: '#5b6b8a', nao: '#8a8486' };
    var ROT = { atrasada: 'Atrasada', pendente: 'Aguardando', emdia: 'Em dia', concluido: 'Concluído', nao: '' };
    var pend = ms.filter(function (x) { return x.estado === 'atrasada' || x.estado === 'pendente'; })[0], prox = ms.filter(function (x) { return x.estado === 'futura'; })[0];
    var frase = r.cls === 'atrasada' ? pend.marco + ' meses venceu em ' + dataBR(pend.limite) : (r.cls === 'pendente' ? pend.marco + ' meses até ' + dataBR(pend.limite)
      : (r.cls === 'concluido' ? 'todas as avaliações feitas' : (prox ? 'próxima: <b>' + prox.marco + ' meses</b> em ' + dataBR(prox.vence) : '')));
    var seg = ms.map(function (x) {
      var cls = { feita: 'ok', pendente: 'pe', atrasada: 'at', futura: '' }[x.estado];
      var tip = x.marco + ' meses · ' + (x.estado === 'feita' ? 'nota ' + x.avaliacao.nota + (x.avaliacao.observacao ? ' · ' + x.avaliacao.observacao : '') : (x.estado === 'futura' ? 'a partir de ' + dataBR(x.vence) : 'prazo até ' + dataBR(x.limite)));
      return '<i class="' + cls + '" title="' + esc(tip) + '"></i>';
    }).join('');
    var ct = a.contratado === true ? '<span class="tb-ct ok">' + flex(a.genero, 'Contratado', 'Contratada') + ' ✓</span>' : (a.contratado === false ? '<span class="tb-ct nao">Não ' + flex(a.genero, 'contratado', 'contratada') + '</span>' : '<span class="tb-ct">Contratado?</span>');
    return '<div class="tb"><div class="tb-st" style="--c:' + (COR[r.cls] || '#8a8486') + '"><b>● ' + (ROT[r.cls] || '') + '</b>' + (frase ? ' · ' + frase : '') + '</div>' +
      '<div class="tb-barra">' + seg + ct + '</div><div class="tb-rot">' + ms.map(function (x) { return '<span>' + x.marco + ' meses' + (x.estado === 'feita' ? ' ✓' : '') + '</span>'; }).join('') + '<span class="tb-esp"></span></div></div>';
  }
  function pendencias(lista) {
    var out = [];
    lista.forEach(function (a) {
      if (!a.aprovado) return;
      marcos(a).forEach(function (x) { if (x.estado === 'pendente' || x.estado === 'atrasada') out.push({ a: a, m: x }); });
    });
    return out.sort(function (p, q) { return p.m.vence < q.m.vence ? -1 : 1; });
  }

  /* ---------- Número no menu (empresa: pendências · Kolping: atrasadas) ---------- */
  async function atualizarBadge(perfil) {
    var rota = perfil.perfil === 'empresa' ? 'aprovados' : (perfil.perfil === 'admin' ? 'acompanhamento' : null);
    if (!rota || !navigator.onLine) return;
    try {
      var lista = await rpc('acomp_listar', { p_proc: null }), n = 0;
      lista.forEach(function (a) { if (!a.aprovado) return; marcos(a).forEach(function (x) { if (perfil.perfil === 'empresa' ? (x.estado === 'pendente' || x.estado === 'atrasada') : x.estado === 'atrasada') n++; }); });
      var link = document.querySelector('.menu a[data-rota="' + rota + '"]'); if (!link) return;
      var b = link.querySelector('.badge-menu');
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'badge-menu'; link.appendChild(b); }
      b.textContent = n; b.setAttribute('aria-label', n + (perfil.perfil === 'empresa' ? ' avaliação(ões) pendente(s)' : ' avaliação(ões) atrasada(s)'));
      if (n && perfil.perfil === 'empresa' && !sessionStorage.getItem('cf_acomp_avisado')) {
        sessionStorage.setItem('cf_acomp_avisado', '1');
        ui.toast('Você tem ' + n + ' avaliação(ões) de acompanhamento para fazer em Jovens aprovados.', 'info');
      }
    } catch (e) { /* o número no menu é opcional */ }
  }

  /* ---------- Janelas ---------- */
  function janelaAprovar(j, a, aoSalvar) {
    var jan = ui.janela({
      titulo: j.nome,
      corpo: '<p style="margin:0 0 12px">Qual foi a decisão da empresa sobre ' + esc(flex(j.genero, 'o jovem', 'a jovem')) + '?</p>' +
        '<div class="ac-simnao"><button type="button" class="btn" data-v="sim" aria-pressed="' + (!!(a && a.aprovado)) + '">✓ ' + flex(j.genero, 'Aprovado', 'Aprovada') + '</button><button type="button" class="btn" data-v="nao" aria-pressed="' + (!!(a && !a.aprovado)) + '">✕ ' + flex(j.genero, 'Reprovado', 'Reprovada') + '</button></div>' +
        '<label class="campo" id="ac-dt-box" style="margin-top:14px;' + (a && a.aprovado ? '' : 'display:none') + '"><span>Data em que foi ' + flex(j.genero, 'aprovado', 'aprovada') + ' pela empresa</span>' +
        '<input class="entrada" type="date" id="ac-dt" max="' + hojeISO() + '" value="' + esc((a && a.aprovado_em) || hojeISO()) + '"></label>' +
        '<p class="dica" style="margin:10px 0 0">A partir dessa data o sistema pede uma avaliação a cada 3 meses e, ao completar 1 ano, pergunta se ' + flex(j.genero, 'o jovem', 'a jovem') + ' foi ' + flex(j.genero, 'contratado', 'contratada') + '.</p>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar', principal: true, aoClicar: async function (el) {
        var esc2 = el.querySelector('[data-v][aria-pressed="true"]');
        if (!esc2) { ui.toast('Escolha ' + flex(j.genero, 'Aprovado', 'Aprovada') + ' ou ' + flex(j.genero, 'Reprovado', 'Reprovada') + '.', 'erro'); return false; }
        var sim = esc2.getAttribute('data-v') === 'sim', dt = el.querySelector('#ac-dt').value;
        if (sim && !dt) { ui.toast('Informe a data.', 'erro'); return false; }
        try { await rpc('acomp_marcar', { p_part: j.participacao_id, p_aprovado: sim, p_data: sim ? dt : null }); ui.toast('Informação salva.', 'ok'); aoSalvar(); }
        catch (e) { ui.toast(api.traduzErro(e), 'erro'); return false; }
      } }]
    });
    jan.elemento.querySelectorAll('[data-v]').forEach(function (b) {
      b.addEventListener('click', function () {
        jan.elemento.querySelectorAll('[data-v]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        jan.elemento.querySelector('#ac-dt-box').style.display = b.getAttribute('data-v') === 'sim' ? '' : 'none';
      });
    });
  }
  function janelaAvaliar(a, m, aoSalvar) {
    var ultimo = m.marco === 12, g = a.genero;
    var jan = ui.janela({
      titulo: 'Avaliação de ' + m.marco + ' meses',
      corpo: '<p class="dica" style="margin:0">' + esc(a.nome) + ' · ' + flex(g, 'aprovado', 'aprovada') + ' pela empresa em ' + dataBR(a.aprovado_em) + '</p>' +
        '<p style="margin:14px 0 6px;font-weight:700">Como está o desempenho ' + flex(g, 'do jovem', 'da jovem') + ' na empresa?</p>' +
        '<div class="ac-notas" role="radiogroup" aria-label="Nota de 1 a 5">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="ac-nb" role="radio" aria-checked="' + (m.avaliacao && m.avaliacao.nota === n) + '" data-n="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
        '<div class="ac-leg"><span>1 · muito abaixo</span><span>5 · excelente</span></div>' +
        (ultimo ? '<p style="margin:16px 0 6px;font-weight:700">' + esc(flex(g, 'O jovem', 'A jovem')) + ' foi ' + flex(g, 'contratado', 'contratada') + ' pela empresa?</p>' +
          '<div class="ac-simnao"><button type="button" class="btn" data-c="sim" aria-pressed="' + (a.contratado === true) + '">Sim</button><button type="button" class="btn" data-c="nao" aria-pressed="' + (a.contratado === false) + '">Não</button></div>' : '') +
        '<label class="campo" style="margin-top:14px"><span>Observações (opcional)</span><textarea class="entrada" id="ac-obs" rows="3" maxlength="1000">' + esc((m.avaliacao && m.avaliacao.observacao) || '') + '</textarea></label>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Enviar avaliação', principal: true, aoClicar: async function (el) {
        var n = el.querySelector('.ac-nb[aria-checked="true"]');
        if (!n) { ui.toast('Escolha uma nota de 1 a 5.', 'erro'); return false; }
        var ct = null;
        if (ultimo) { var c = el.querySelector('[data-c][aria-pressed="true"]'); if (!c) { ui.toast('Informe se foi contratado.', 'erro'); return false; } ct = c.getAttribute('data-c') === 'sim'; }
        try {
          await rpc('acomp_avaliar', { p_part: a.participacao_id, p_marco: m.marco, p_nota: Number(n.getAttribute('data-n')), p_obs: el.querySelector('#ac-obs').value || null, p_contratado: ct });
          ui.toast('Avaliação enviada. Obrigado!', 'ok'); aoSalvar();
        } catch (e) { ui.toast(api.traduzErro(e), 'erro'); return false; }
      } }]
    });
    jan.elemento.querySelectorAll('.ac-nb').forEach(function (b) {
      b.addEventListener('click', function () { jan.elemento.querySelectorAll('.ac-nb').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); });
    });
    jan.elemento.querySelectorAll('[data-c]').forEach(function (b) {
      b.addEventListener('click', function () { jan.elemento.querySelectorAll('[data-c]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
    });
  }
  function janelaDetalhe(a) {
    var ms = marcos(a);
    ui.janela({
      titulo: a.nome,
      corpo: '<p class="dica" style="margin:0 0 10px">' + esc(a.empresa + ' · ' + a.vaga) + ' · ' + flex(a.genero, 'aprovado', 'aprovada') + ' pela empresa em ' + dataBR(a.aprovado_em) + '</p>' + trilha(a) +
        '<div style="margin-top:14px">' + ms.map(function (x) {
          var v = x.avaliacao;
          return '<div class="ac-det"><b>' + x.marco + ' meses</b> <span class="dica">· vence ' + dataBR(x.vence) + '</span><br>' +
            (v ? 'Nota <b>' + v.nota + '</b>' + (v.autor ? ' · ' + esc(v.autor) : '') + ' · ' + dataBR(v.avaliado_em) + (v.observacao ? '<br><span>' + esc(v.observacao) + '</span>' : '')
               : '<span class="dica">' + ({ futura: 'Ainda não disponível', pendente: 'Aguardando a empresa', atrasada: 'Atrasada' }[x.estado]) + '</span>') + '</div>';
        }).join('') + '</div>' +
        (a.contratado != null ? '<p style="margin:12px 0 0"><b>' + (a.contratado ? flex(a.genero, 'Contratado', 'Contratada') : flex(a.genero, 'Não contratado', 'Não contratada')) + '</b> ao fim do primeiro ano.</p>' : ''),
      botoes: [{ texto: 'Fechar', acao: 'fechar' }]
    });
  }

  /* ---------- "Preparar e-mail": o sistema NÃO envia; abre no Outlook de quem clicou ---------- */
  var cfgEmail = null;
  async function janelaEmail(a, ctx) {
    if (!cfgEmail) { try { cfgEmail = await window.CF.dados.config.carregar(); } catch (e) { cfgEmail = {}; } }
    var ms = marcos(a), alvo = ms.filter(function (x) { return x.estado === 'atrasada' || x.estado === 'pendente'; })[0] || ms.filter(function (x) { return x.estado === 'futura'; })[0];
    if (!alvo) { ui.toast('Não há avaliação pendente para este jovem.', 'info'); return; }
    var nomeRem = String((ctx.perfil && ctx.perfil.nome) || '').split(' ')[0] || 'Kolping';
    var vars = {
      empresa: a.empresa, jovem: a.nome, avaliacao: alvo.marco + ' meses' + (alvo.marco === 12 ? ' (com a informação sobre a contratação)' : ''),
      aprovado: flex(a.genero, 'aprovado', 'aprovada'), aprovado_em: dataBR(a.aprovado_em),
      situacao: alvo.estado === 'futura' ? 'estará disponível em ' + dataBR(alvo.vence) : 'está pendente desde ' + dataBR(alvo.vence),
      link: window.location.origin + window.location.pathname, remetente: nomeRem.toUpperCase()
    };
    var texto = String(cfgEmail.texto_email_acomp || window.CF.EMAIL_ACOMP_PADRAO || '').replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    var para = (a.emails || []).join('; '), assunto = 'Projeto Gol Jovens Talentos · avaliação de ' + alvo.marco + ' meses · ' + a.nome;
    var jan = ui.janela({
      titulo: 'E-mail para ' + a.empresa, confirmarDescarte: false,
      corpo: '<p class="dica" style="margin:0 0 8px">Confira o texto. Nada é enviado pelo sistema: o e-mail abre no seu Outlook para você revisar e enviar.' + (a.contato_kolping ? ' Contato desta empresa: <b>' + esc(a.contato_kolping) + '</b>.' : '') + '</p>' +
        '<label class="campo"><span>Para</span><input class="entrada" id="em-para" value="' + esc(para) + '" placeholder="e-mail da empresa"></label>' +
        (para ? '' : '<p class="dica" style="margin:-4px 0 8px;color:#a5302c">A empresa não tem e-mail cadastrado. Preencha acima ou cadastre em Configurações › Empresas.</p>') +
        '<label class="campo"><span>Assunto</span><input class="entrada" id="em-ass" value="' + esc(assunto) + '"></label>' +
        '<label class="campo"><span>Texto</span><textarea class="entrada" id="em-txt" data-normal rows="12" style="line-height:1.5">' + esc(texto) + '</textarea></label>',
      botoes: [{ texto: 'Copiar texto', aoClicar: function (el) { copiar(el.querySelector('#em-txt').value); return false; } },
               { texto: 'Abrir no programa de e-mail', aoClicar: function (el) { abrir(el, 'mailto'); return false; } },
               { texto: 'Abrir no Outlook (web)', principal: true, aoClicar: function (el) { abrir(el, 'owa'); return false; } }]
    });
    function copiar(t) {
      try { navigator.clipboard.writeText(t).then(function () { ui.toast('Texto copiado.', 'ok'); }); } catch (e) { ui.toast('Não foi possível copiar.', 'erro'); }
    }
    function abrir(el, tipo) {
      var to = el.querySelector('#em-para').value.trim(), su = el.querySelector('#em-ass').value, bo = el.querySelector('#em-txt').value;
      if (!to) { ui.toast('Informe o e-mail da empresa.', 'erro'); return; }
      var url = tipo === 'owa'
        ? 'https://outlook.office.com/mail/deeplink/compose?to=' + encodeURIComponent(to.replace(/;\s*/g, ',')) + '&subject=' + encodeURIComponent(su) + '&body=' + encodeURIComponent(bo)
        : 'mailto:' + to.replace(/;\s*/g, ',') + '?subject=' + encodeURIComponent(su) + '&body=' + encodeURIComponent(bo);
      window.open(url, tipo === 'owa' ? '_blank' : '_self');
    }
    return jan;
  }

  /* ================================================================
     PORTAL DA EMPRESA
     ================================================================ */
  window.CF.telas = window.CF.telas || {};
  window.CF.telas.portal = function (area, ctx) {
    var h = window.location.hash || '';
    var mf = h.match(/^#\/portal\/([0-9a-z-]{8,})\/ficha\/([0-9a-z-]{8,})/i);
    if (mf) { window.CF.telas.ficha(area, ctx, mf[1], mf[2]); return; }
    var mp = h.match(/^#\/portal\/([0-9a-z-]{8,})/i);
    if (mp) { processoEmpresa(area, ctx, mp[1]); return; }
    listaEmpresa(area, ctx);
  };

  /* ---------- Quadro "Como funciona" (pode esconder neste aparelho) ---------- */
  function comoFunciona(chave, passos) {
    var esc0 = false; try { esc0 = localStorage.getItem('cf_ajuda_' + chave) === '1'; } catch (e) { /* sem armazenamento */ }
    if (esc0) return '<p class="dica" style="margin:0 0 12px"><button type="button" class="btn-link" data-ajuda-ver="' + chave + '">Como funciona?</button></p>';
    return '<section class="card pt-ajuda"><div class="pt-ajuda-cab"><b>Como funciona</b><button type="button" class="btn btn-p" data-ajuda-esc="' + chave + '">Entendi, esconder</button></div><ol>' + passos.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
      '<small class="dica">Dúvidas: (11) 4183-6018 · Kolping Estadual de São Paulo.</small></section>';
  }
  function ligarAjuda(area, redesenhar) {
    area.querySelectorAll('[data-ajuda-esc]').forEach(function (b) { b.addEventListener('click', function () { try { localStorage.setItem('cf_ajuda_' + b.getAttribute('data-ajuda-esc'), '1'); } catch (e) { /* segue */ } redesenhar(); }); });
    area.querySelectorAll('[data-ajuda-ver]').forEach(function (b) { b.addEventListener('click', function () { try { localStorage.removeItem('cf_ajuda_' + b.getAttribute('data-ajuda-ver')); } catch (e) { /* segue */ } redesenhar(); }); });
  }
  var AJUDA_RESULTADOS = ['Quando a Kolping <b>libera</b> o resultado de um processo, ele aparece aqui.',
    'Em cada processo você vê a <b>classificação final</b> (aprovados, backup e reprovados), com a nota e o gráfico de competências de cada jovem, e pode <b>baixar o PDF</b> com as fichas.',
    'Depois das entrevistas, marque <b>"Aprovar"</b> nos jovens que a empresa escolheu. Eles passam para o menu <b>Jovens aprovados</b>, onde ficam as avaliações a cada 3 meses.'];
  var AJUDA_APROVADOS = ['Ao <b>aprovar</b> um jovem em <b>Resultados</b>, ele aparece aqui.',
    'A cada <b>3 meses</b>, durante <b>1 ano</b>, a empresa faz uma <b>avaliação rápida</b> (nota de 1 a 5 e, se quiser, uma observação).',
    'Ao fim do ano, a empresa informa se o jovem foi <b>contratado</b>.'];

  /* ---------- Empresa · Jovens aprovados (todos os processos) ---------- */
  window.CF.telas.aprovados = async function (area, ctx) {
    var st = { f: 'todos' }, lista = [];
    area.innerHTML = '<header class="cabecalho"><div><h1>Jovens aprovados</h1><p>Os jovens que a sua empresa aprovou nos processos do Projeto Gol Jovens Talentos</p></div></header><div id="ja"><div class="girando" style="margin:30px auto"></div></div>';
    var box = area.querySelector('#ja');
    try { lista = (await rpc('acomp_listar', { p_proc: null })).filter(function (a) { return a.aprovado; }); }
    catch (e) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    function grupo(a) { var r = resumo(a).cls; return r === 'atrasada' || r === 'pendente' ? 'avaliar' : (r === 'concluido' ? 'concluido' : 'emdia'); }
    var CORS = { atrasada: '#D9534F', pendente: '#E9B500', emdia: '#3FA66B', concluido: '#5b6b8a' }, ROT = { atrasada: 'Atrasada', pendente: 'Aguardando', emdia: 'Em dia', concluido: 'Concluído' };
    function desenhar() {
      var cont = { todos: lista.length, avaliar: 0, emdia: 0, concluido: 0 }; lista.forEach(function (a) { cont[grupo(a)]++; });
      var vis = lista.filter(function (a) { return st.f === 'todos' || grupo(a) === st.f; }).sort(function (x, y) { var o = { avaliar: 0, emdia: 1, concluido: 2 }; return o[grupo(x)] - o[grupo(y)] || String(x.nome).localeCompare(y.nome); });
      box.innerHTML = comoFunciona('aprovados', AJUDA_APROVADOS) +
        '<div class="pt-filtros">' + [['todos', 'Todos'], ['avaliar', 'Para avaliar'], ['emdia', 'Em dia'], ['concluido', 'Concluídos']].map(function (x) { return '<button type="button" class="pt-chip' + (st.f === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + ' ' + cont[x[0]] + '</button>'; }).join('') + '</div>' +
        (vis.length ? '<section class="card pt-tab"><div class="tabela-rolar"><table class="pt-rk"><thead><tr><th>Jovem e vaga</th><th>Aprovado em</th><th>Avaliações</th><th></th></tr></thead><tbody>' + vis.map(function (a) {
          var r = resumo(a), cor = CORS[r.cls] || '#8a8486', pend = pendencias([a])[0];
          return '<tr style="--c:' + cor + '"><td class="pt-nm pt-barra"><b>' + esc(a.nome) + '</b><small>' + esc(a.vaga + (a.identificacao ? ' · ' + a.identificacao : '')) + '</small></td>' +
            '<td>' + dataBR(a.aprovado_em) + (a.aprovado_por ? '<small class="dica" style="display:block">por ' + esc(a.aprovado_por) + '</small>' : '') + '</td>' +
            '<td>' + trilha(a) + '</td>' +
            '<td style="text-align:right;white-space:nowrap">' + (pend ? '<button type="button" class="btn btn-pri btn-p" data-av="' + a.participacao_id + '">Avaliar agora</button>' : '<button type="button" class="btn btn-p" data-ver="' + a.participacao_id + '">Ver avaliações</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div></section>'
          : '<section class="card bloco"><p style="margin:0">' + (lista.length ? 'Nenhum jovem neste filtro.' : 'Nenhum jovem aprovado ainda. Em <b>Resultados</b>, abra um processo e marque "Aprovar" nos jovens escolhidos.') + '</p></section>');
      ligarAjuda(box, desenhar);
      box.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { st.f = b.getAttribute('data-f'); desenhar(); }); });
      function porId(id) { return lista.filter(function (x) { return x.participacao_id === id; })[0]; }
      async function recarregar() { lista = (await rpc('acomp_listar', { p_proc: null })).filter(function (a) { return a.aprovado; }); desenhar(); atualizarBadge(ctx.perfil); }
      box.querySelectorAll('[data-av]').forEach(function (b) { b.addEventListener('click', function () { var a = porId(b.getAttribute('data-av')), pd = pendencias([a])[0]; if (pd) janelaAvaliar(a, pd.m, recarregar); }); });
      box.querySelectorAll('[data-ver]').forEach(function (b) { b.addEventListener('click', function () { janelaDetalhe(porId(b.getAttribute('data-ver'))); }); });
    }
    desenhar();
    atualizarBadge(ctx.perfil);
  };

  async function listaEmpresa(area, ctx) {
    area.innerHTML = '<header class="cabecalho"><div><h1>Resultados</h1><p class="dica">Processos seletivos do Projeto Gol Jovens Talentos liberados para a sua empresa.</p></div></header><div id="pt"><div class="girando" style="margin:30px auto"></div></div>';
    var box = area.querySelector('#pt'), procs, acomp, cls = {};
    try {
      var r = await Promise.all([rpc('portal_processos'), rpc('acomp_listar', { p_proc: null })]);
      procs = r[0]; acomp = r[1];
      var cl = await Promise.all(procs.map(function (p) { return window.CF.dados.classificacao.carregar(p.id).catch(function () { return null; }); }));
      procs.forEach(function (p, i) { cls[p.id] = cl[i]; });
    } catch (e) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    if (!procs.length) { box.innerHTML = comoFunciona('resultados', AJUDA_RESULTADOS) + '<section class="card bloco"><p style="margin:0">Ainda não há resultados liberados para a sua empresa. Assim que a Kolping liberar um processo seletivo, ele aparece aqui.</p></section>'; return; }
    var ajudaR = function () { var x = box.querySelector('#pt-ajuda'); if (x) { x.innerHTML = comoFunciona('resultados', AJUDA_RESULTADOS); ligarAjuda(x, ajudaR); } };
    box.innerHTML = '<div id="pt-ajuda"></div>' + procs.map(function (p) {
      var c = cls[p.id], cont = { aprovado: 0, backup: 0, reprovado: 0, desistencia: 0 };
      (c && c.jovens || []).forEach(function (j) { if (cont[j.situacao] != null) cont[j.situacao]++; });
      var meus = acomp.filter(function (a) { return a.processo_id === p.id; }), pend = pendencias(meus).length;
      var ds = (p.datas || []).map(function (x) { return String(x).slice(0, 10); });
      var per = ds.length ? dataBR(ds[0]) + (ds[0] !== ds[ds.length - 1] ? ' a ' + dataBR(ds[ds.length - 1]) : '') : '';
      return '<section class="card pt-card">' +
        '<div><h2>' + esc(p.vaga) + '</h2><p>Processo ' + esc(p.identificacao || '') + (per ? ' · ' + per : '') + ' · ' + p.turmas + ' turma' + (p.turmas === 1 ? '' : 's') + ' · ' + p.jovens + ' jovens avaliados</p>' +
          '<p class="dica">Resultado liberado em ' + dataBR(p.liberado_em) + ' · ' + meus.filter(function (a) { return a.aprovado; }).length + ' aprovado(s) pela empresa' +
          (pend ? ' · <b style="color:#ee7330">' + pend + ' avaliação(ões) para fazer</b>' : '') + '</p>' +
          '<div class="pt-cts">' + [['aprovado', 'aprovados'], ['backup', 'backup'], ['reprovado', 'reprovados'], ['desistencia', 'desistências']].map(function (x) {
            return '<span class="pt-ct" style="--c:' + COR[x[0]] + '"><b>' + cont[x[0]] + '</b> ' + x[1] + '</span>'; }).join('') + '</div></div>' +
        '<div class="pt-acoes"><a class="btn btn-pri" href="#/portal/' + p.id + '">Abrir resultado</a><button type="button" class="btn" data-pdf="' + p.id + '">⬇ PDF do processo</button></div></section>';
    }).join('');
    box.querySelectorAll('[data-pdf]').forEach(function (b) { b.addEventListener('click', function () { baixarPdf(b.getAttribute('data-pdf'), cls[b.getAttribute('data-pdf')], b); }); });
    ajudaR();
    atualizarBadge(ctx.perfil);
  }

  async function baixarPdf(procId, cl, botao) {
    if (!navigator.onLine) { ui.toast('Para baixar o PDF é preciso internet.', 'erro'); return; }
    var t = botao.innerHTML; botao.disabled = true; botao.innerHTML = 'Gerando…';
    try {
      cl = cl || await window.CF.dados.classificacao.carregar(procId);
      var dp = await rpc('dados_processo_pdf', { p_proc: procId });
      ui.toast('Montando o PDF. Pode levar alguns segundos.', 'info');
      window.CF.pdf.baixar(await window.CF.gerarPdfProcesso(dp, cl), window.CF.pdf.nomeArquivo(['Processo seletivo', (dp.empresa || {}).nome, cl.processo.vaga], 'pdf'));
    } catch (e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
    botao.disabled = false; botao.innerHTML = t;
  }

  async function processoEmpresa(area, ctx, procId) {
    var st = { filtro: 'todos', busca: '' }, c, acomp, info;
    area.innerHTML = '<a class="voltar" href="#/portal">← Resultados</a><div id="pp"><div class="girando" style="margin:30px auto"></div></div>';
    var box = area.querySelector('#pp');
    async function carregar() {
      var r = await Promise.all([window.CF.dados.classificacao.carregar(procId), rpc('acomp_listar', { p_proc: procId }), rpc('portal_processos')]);
      c = r[0]; acomp = {}; r[1].forEach(function (a) { acomp[a.participacao_id] = a; });
      info = r[2].filter(function (p) { return p.id === procId; })[0] || {};
    }
    try { await carregar(); } catch (e) { box.innerHTML = '<div class="aviso aviso-erro" style="margin-top:12px">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }

    function desenhar() {
      var cont = { aprovado: 0, backup: 0, reprovado: 0, desistencia: 0 };
      c.jovens.forEach(function (j) { if (cont[j.situacao] != null) cont[j.situacao]++; });
      var lista = Object.keys(acomp).map(function (k) { return acomp[k]; });
      var pend = pendencias(lista), nEmp = lista.filter(function (a) { return a.aprovado; }).length;
      var ds = (info.datas || []).map(function (x) { return String(x).slice(0, 10); });
      var per = ds.length ? dataBR(ds[0]) + (ds[0] !== ds[ds.length - 1] ? ' a ' + dataBR(ds[ds.length - 1]) : '') : '';
      var vis = c.jovens.filter(function (j) {
        if (st.filtro === 'aprovado' && j.situacao !== 'aprovado') return false;
        if (st.filtro === 'backup' && j.situacao !== 'backup') return false;
        if (st.filtro === 'empresa' && !(acomp[j.participacao_id] && acomp[j.participacao_id].aprovado)) return false;
        if (st.busca) { var b = st.busca.toUpperCase(); if (j.nome.toUpperCase().indexOf(b) < 0 && String(j.codigo || '').toUpperCase().indexOf(b) < 0) return false; }
        return true;
      });
      var K = window.CF.classif;
      box.innerHTML =
        '<div class="pt-topo"><div><h1>' + esc(c.processo.vaga) + '</h1><p class="dica">Processo ' + esc(info.identificacao || c.processo.identificacao || '') + (per ? ' · ' + per : '') + ' · liberado em ' + dataBR(info.liberado_em || c.processo.liberado_em) + '</p></div>' +
          '<button type="button" class="btn btn-pri" id="pp-pdf">⬇ PDF do processo</button></div>' +
        '<div class="pt-cont">' + [['aprovado', 'Aprovados'], ['backup', 'Backup'], ['reprovado', 'Reprovados'], ['desistencia', 'Desistências']].map(function (x) {
          return '<div class="card pt-cbox" style="--c:' + COR[x[0]] + '"><b>' + cont[x[0]] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>' +
        (pend.length ? '<section class="card pt-pend"><h2>Pendências do acompanhamento · ' + pend.length + '</h2>' + pend.map(function (p, i) {
          return '<div class="pt-pi"><div><b>Avaliação de ' + p.m.marco + ' meses · ' + esc(p.a.nome) + '</b><small>' + flex(p.a.genero, 'Aprovado', 'Aprovada') + ' pela empresa em ' + dataBR(p.a.aprovado_em) + ' · ' +
            (p.m.estado === 'atrasada' ? '<span class="pt-atr">prazo encerrado em ' + dataBR(p.m.limite) + '</span>' : 'prazo até ' + dataBR(p.m.limite)) + (p.m.marco === 12 ? ' · inclui a contratação' : '') + '</small></div>' +
            '<button type="button" class="btn btn-pri btn-p" data-av="' + i + '">Avaliar</button></div>'; }).join('') + '</section>' : '') +
        '<section class="card pt-tab"><div class="pt-filtros">' + [['todos', 'Todos', c.jovens.length], ['aprovado', 'Aprovados', cont.aprovado], ['backup', 'Backup', cont.backup], ['empresa', 'Aprovados pela empresa', nEmp]].map(function (x) {
            return '<button type="button" class="pt-chip' + (st.filtro === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + ' ' + x[2] + '</button>'; }).join('') +
          '<input class="entrada" id="pp-busca" type="search" placeholder="Buscar pelo nome ou código" value="' + esc(st.busca) + '"></div>' +
          '<div class="tabela-rolar"><table class="pt-rk"><thead><tr><th>Pos.</th><th>Jovem</th><th>Nota final</th><th>Situação</th><th class="pt-col-emp">Na empresa</th></tr></thead><tbody>' +
          vis.map(function (j) {
            var a = acomp[j.participacao_id], pode = j.situacao === 'aprovado' || j.situacao === 'backup', cel;
            if (a && a.aprovado) cel = '<div class="ne"><span class="ne-p ok">✓ ' + flex(j.genero, 'Aprovado', 'Aprovada') + '</span> <span class="dica">em ' + dataBR(a.aprovado_em) + '</span>' +
              ((a.avaliacoes || []).length ? '' : ' <button type="button" class="btn btn-p pt-alt" data-mk="' + j.participacao_id + '">Alterar</button>') + '</div><div style="margin-top:8px">' + trilha(a) + '</div>';
            else if (a) cel = '<div class="ne"><span class="ne-p nao">✕ ' + flex(j.genero, 'Reprovado', 'Reprovada') + '</span> <button type="button" class="btn btn-p pt-alt" data-mk="' + j.participacao_id + '">Alterar</button></div>';
            else if (pode) cel = '<div class="ne"><span class="ne-p">Aguardando decisão</span> <button type="button" class="btn btn-p" data-mk="' + j.participacao_id + '">Informar</button></div>';
            else cel = '<span class="dica">—</span>';
            var mot = j.motivo && j.situacao !== 'incompleto' ? K.textoMotivo(j.motivo, j.genero) : (j.situacao === 'reprovado' ? 'Nota final abaixo de ' + K.corteTxt(c.processo.corte_backup) : '');
            return '<tr style="--c:' + (COR[j.situacao] || COR.desistencia) + '"><td class="pt-pos">' + (j.posicao ? j.posicao + 'º' : '—') + '</td>' +
              '<td class="pt-nm"><a href="#/portal/' + procId + '/ficha/' + j.participacao_id + '">' + esc(j.nome) + '</a><small>' + esc((j.turma || '') + (j.codigo ? ' · ' + j.codigo : '')) + '</small></td>' +
              '<td class="pt-nota">' + (j.nota == null ? '—' : K.n2(j.nota)) + '</td>' +
              '<td><span class="pt-pl">' + esc(K.textoSituacao(j.situacao, j.genero)) + '</span>' + (mot ? '<small class="pt-det">' + esc(mot) + '</small>' : '') + '</td>' +
              '<td>' + cel + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          (vis.length ? '' : '<p class="dica" style="margin:12px 0 0">Nenhum jovem neste filtro.</p>') +
          '<p class="dica" style="margin:12px 0 0">Clique no nome para abrir a ficha. Ao informar que o jovem foi aprovado pela empresa, o sistema pede uma avaliação a cada 3 meses e, ao completar 1 ano, pergunta se ele foi contratado.</p></section>';
      box.querySelector('#pp-pdf').addEventListener('click', function () { baixarPdf(procId, c, this); });
      box.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { st.filtro = b.getAttribute('data-f'); desenhar(); }); });
      var bus = box.querySelector('#pp-busca');
      bus.addEventListener('input', function () { st.busca = bus.value; var pos = bus.selectionStart; desenhar(); var n = box.querySelector('#pp-busca'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ok */ } });
      box.querySelectorAll('[data-mk]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-mk'), j = c.jovens.filter(function (x) { return x.participacao_id === id; })[0];
          janelaAprovar(j, acomp[id], recarregar);
        });
      });
      box.querySelectorAll('[data-av]').forEach(function (b) { b.addEventListener('click', function () { var p = pend[Number(b.getAttribute('data-av'))]; janelaAvaliar(p.a, p.m, recarregar); }); });
    }
    async function recarregar() { try { await carregar(); desenhar(); atualizarBadge(ctx.perfil); } catch (e) { ui.toast(api.traduzErro(e), 'erro'); } }
    desenhar();
  }

  /* ================================================================
     ACOMPANHAMENTO (Kolping)
     ================================================================ */
  window.CF.telas.acompanhamento = async function (area, ctx) {
    var st = { filtro: 'todos', busca: '' }, lista;
    area.innerHTML = '<header class="cabecalho"><div><h1>Acompanhamento</h1><p class="dica">Jovens aprovados pelas empresas · avaliações a cada 3 meses e contratação ao fim de 1 ano.</p></div></header><div id="ak"><div class="girando" style="margin:30px auto"></div></div>';
    var box = area.querySelector('#ak');
    try { lista = (await rpc('acomp_listar', { p_proc: null })).filter(function (a) { return a.aprovado; }); }
    catch (e) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    function desenhar() {
      var res = lista.map(function (a) { return { a: a, r: resumo(a) }; });
      var cnt = { emdia: 0, pendente: 0, atrasada: 0, contratado: lista.filter(function (a) { return a.contratado === true; }).length };
      res.forEach(function (x) { if (cnt[x.r.cls] != null) cnt[x.r.cls]++; });
      var vis = res.filter(function (x) {
        if (st.filtro === 'atrasada' && x.r.cls !== 'atrasada') return false;
        if (st.filtro === 'pendente' && x.r.cls !== 'pendente') return false;
        if (st.filtro === 'concluido' && x.r.cls !== 'concluido') return false;
        if (st.busca) { var b = st.busca.toUpperCase(); if ((x.a.nome + ' ' + x.a.empresa + ' ' + x.a.codigo).toUpperCase().indexOf(b) < 0) return false; }
        return true;
      }).sort(function (p, q) { var o = { atrasada: 0, pendente: 1, emdia: 2, concluido: 3 }; return (o[p.r.cls] - o[q.r.cls]) || p.a.nome.localeCompare(q.a.nome); });
      var CORR = { atrasada: '#D9534F', pendente: '#ee7330', emdia: '#3FA66B', concluido: '#5b6b8a' };
      box.innerHTML =
        '<div class="pt-cont">' + [['emdia', 'Em dia', '#3FA66B'], ['pendente', 'Aguardando empresa', '#ee7330'], ['atrasada', 'Atrasadas', '#D9534F'], ['contratado', 'Contratados', '#5b6b8a']].map(function (x) {
          return '<div class="card pt-cbox" style="--c:' + x[2] + '"><b>' + cnt[x[0]] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>' +
        '<section class="card pt-tab"><div class="pt-filtros">' + [['todos', 'Todos'], ['atrasada', 'Atrasadas'], ['pendente', 'Aguardando'], ['concluido', 'Concluídos']].map(function (x) {
            return '<button type="button" class="pt-chip' + (st.filtro === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
          '<input class="entrada" id="ak-busca" type="search" placeholder="Buscar jovem, código ou empresa" value="' + esc(st.busca) + '"></div>' +
          (vis.length ? '<div class="tabela-rolar"><table class="pt-rk"><thead><tr><th>Jovem</th><th>Aprovado em</th><th>Avaliações</th><th>Situação</th><th></th></tr></thead><tbody>' +
            vis.map(function (x, i) {
              return '<tr style="--c:' + CORR[x.r.cls] + '"><td class="pt-nm pt-barra"><b>' + esc(x.a.nome) + '</b><small>' + esc(x.a.empresa + ' · ' + x.a.vaga + ' · ' + x.a.codigo + (x.a.contato_kolping ? ' · contato: ' + x.a.contato_kolping : '')) + '</small></td>' +
                '<td>' + dataBR(x.a.aprovado_em) + '</td><td>' + trilha(x.a) + '</td>' +
                '<td style="color:' + CORR[x.r.cls] + ';font-weight:700;font-size:13px">' + esc(x.r.txt) + '</td>' +
                '<td><div class="ak-bts"><button type="button" class="btn btn-p" data-ver="' + x.a.participacao_id + '">Ver</button>' +
                (x.r.cls === 'atrasada' || x.r.cls === 'pendente' ? '<button type="button" class="btn btn-p" data-mail="' + x.a.participacao_id + '">✉ Preparar e-mail</button>' : '') + '</div></td></tr>';
            }).join('') + '</tbody></table></div>' : '<p class="dica" style="margin:6px 0 0">' + (lista.length ? 'Nenhum jovem neste filtro.' : 'Nenhuma empresa informou jovens aprovados ainda.') + '</p>') + '</section>';
      box.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { st.filtro = b.getAttribute('data-f'); desenhar(); }); });
      var bus = box.querySelector('#ak-busca');
      bus.addEventListener('input', function () { st.busca = bus.value; var pos = bus.selectionStart; desenhar(); var n = box.querySelector('#ak-busca'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ok */ } });
      box.querySelectorAll('[data-ver]').forEach(function (b) { b.addEventListener('click', function () { janelaDetalhe(lista.filter(function (a) { return a.participacao_id === b.getAttribute('data-ver'); })[0]); }); });
      box.querySelectorAll('[data-mail]').forEach(function (b) { b.addEventListener('click', function () { janelaEmail(lista.filter(function (a) { return a.participacao_id === b.getAttribute('data-mail'); })[0], ctx); }); });
    }
    desenhar();
    atualizarBadge(ctx.perfil);
  };

  window.CF.acomp = { atualizarBadge: atualizarBadge, marcos: marcos, resumo: resumo };
})();
