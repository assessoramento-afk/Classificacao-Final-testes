/* =====================================================================
   Classificação Final · erros.js
   Registra sozinho os erros que acontecem nas telas (com os últimos
   passos da pessoa), para o administrador ver em Saúde do sistema e
   gerar o relatório para o Claude. Sem dados de jovens: só a tela,
   a ação, o aparelho, a versão e a mensagem técnica.
   ===================================================================== */
(function () {
  'use strict';
  var passos = [], enviados = {}, IGNORAR = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection captured/i;

  function tela() { return (window.location.hash || '#/').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id'); }
  function passo(txt) { passos.push(new Date().toTimeString().slice(0, 8) + ' ' + txt); if (passos.length > 12) passos.shift(); }
  passo('abriu o sistema em ' + tela());
  window.addEventListener('hashchange', function () { passo('abriu ' + tela()); });
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button, a, [role=tab]');
    if (!b) return;
    var t = (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (t) passo('clicou "' + t + '"');
  }, true);

  function assinatura(msg, t) {
    return (String(msg || '').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').replace(/\d+/g, 'N').slice(0, 200) + '|' + t.split('/').slice(0, 2).join('/')).slice(0, 300);
  }
  function pendentesLocais() { try { return JSON.parse(localStorage.getItem('cf_erros_pendentes') || '[]'); } catch (e) { return []; } }
  function guardar(l) { try { localStorage.setItem('cf_erros_pendentes', JSON.stringify(l.slice(-20))); } catch (e) { /* sem espaço */ } }

  function registrar(erro, contexto) {
    try {
      var msg = erro && (erro.message || erro.reason && erro.reason.message) || String(erro || 'Erro');
      if (IGNORAR.test(msg)) return;
      var t = tela(), ass = assinatura(msg, t);
      if (enviados[ass] && Date.now() - enviados[ass] < 60000) return;   // o mesmo erro, de novo em menos de 1 minuto: não repete
      enviados[ass] = Date.now();
      var OFF = window.CF.offline;
      var p = { mensagem: msg.slice(0, 1000), pilha: String((erro && erro.stack) || '').slice(0, 4000), tela: t, assinatura: ass,
        versao: (window.CF_CONFIG || {}).versao, aparelho: OFF ? OFF.nomeAparelho() : '', aparelho_id: OFF ? OFF.aparelhoId() : null,
        navegador: navigator.userAgent.slice(0, 200), online: navigator.onLine, fila: OFF ? OFF.pendentes() : null,
        contexto: Object.assign({ passos: passos.slice(), tela_largura: window.innerWidth, tema: document.documentElement.getAttribute('data-tema') }, contexto || {}) };
      var l = pendentesLocais(); l.push(p); guardar(l);
      enviarPendentes();
    } catch (e) { /* o registro de erro nunca pode causar outro erro */ }
  }
  async function enviarPendentes() {
    if (!navigator.onLine || !window.CF.sb || !window.CF.perfilAtual) return;
    var l = pendentesLocais(); if (!l.length) return;
    guardar([]);
    for (var i = 0; i < l.length; i++) {
      try { var r = await window.CF.sb.rpc('registrar_erro', { p: l[i] }); if (r && r.error) throw r.error; }
      catch (e) { guardar(pendentesLocais().concat(l.slice(i))); return; }
    }
  }
  window.addEventListener('error', function (e) { registrar(e.error || e, { origem: 'erro', arquivo: e.filename, linha: e.lineno }); });
  window.addEventListener('unhandledrejection', function (e) { registrar(e.reason || e, { origem: 'promessa' }); });
  window.addEventListener('online', function () { setTimeout(enviarPendentes, 1500); });
  setInterval(enviarPendentes, 60000);

  /* Relatório pronto para colar na conversa com o Claude */
  function relatorio(grupo, detalhes) {
    var d = (detalhes || [])[0] || {};
    var linhas = [
      '## Relatório de erro · Classificação Final',
      '',
      '**Erro:** ' + (grupo.mensagem || d.mensagem || ''),
      '**Tela:** ' + (grupo.tela || d.tela || ''),
      '**Quantas vezes:** ' + (grupo.vezes || (detalhes || []).length) + ' · em ' + (grupo.aparelhos || 1) + ' aparelho(s)' + (grupo.tipos_aparelho ? ' (' + grupo.tipos_aparelho + ')' : ''),
      '**Versões:** ' + (grupo.versoes || d.versao || '?') + ' · última vez: ' + (grupo.ultimo ? new Date(grupo.ultimo).toLocaleString('pt-BR') : '?'),
      '',
      '### Última ocorrência',
      '- Perfil: ' + (d.perfil || '?') + ' · Aparelho: ' + (d.aparelho || '?') + ' · ' + (d.online ? 'com internet' : 'SEM internet') + ' · itens na fila: ' + (d.fila == null ? '?' : d.fila),
      '- Navegador: ' + (d.navegador || '?'),
      '- Últimos passos antes do erro:',
    ].concat(((d.contexto || {}).passos || ['(sem registro)']).map(function (x) { return '  - ' + x; })).concat([
      '',
      '### Detalhe técnico',
      '```',
      String(d.pilha || d.mensagem || '').slice(0, 3000),
      '```',
      '',
      'Contexto: ' + JSON.stringify(Object.assign({}, d.contexto || {}, { passos: undefined })),
      '',
      'Por favor, encontre a causa e proponha a correção.'
    ]);
    return linhas.join('\n');
  }

  window.CF.erros = { registrar: registrar, enviarPendentes: enviarPendentes, relatorio: relatorio, passo: passo };
})();
