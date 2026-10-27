/* =====================================================================
   Classificação Final · drive.js
   Tudo o que é baixado no sistema também é salvo no Drive compartilhado
   "Classificação Final" (pelo serviço drive-salvar do Supabase).
   Pastas: EMPRESA / VAGA · PROCESSO / Processo | Planilhas | Fichas ·
           Históricos · Gráficos. Mesmo nome = substitui (o Drive guarda a versão antiga).
   Só a equipe; sem internet o download acontece normalmente e a cópia não é feita.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.CF_CONFIG, ui = window.CF.ui;
  var contexto = null;   // { processo_id, empresa, processo } · definido pela tela aberta
  function definirContexto(c) { contexto = c || null; }
  function pastas(nome) {
    var ext = (nome.split('.').pop() || '').toLowerCase(), n = nome.toLowerCase();
    var base = contexto && contexto.empresa ? [contexto.empresa, contexto.processo] : null;
    if (/^processo seletivo/.test(n)) return (base || ['Processos']).concat([ext === 'xlsx' ? 'Planilhas' : 'Processo']);
    if (/^ficha/.test(n)) return (base || ['Fichas']).concat(base ? ['Fichas'] : []);
    if (/^historico geral/.test(n)) return ['Históricos'];
    if (/^historico/.test(n)) return ['Históricos', 'Por jovem'];
    if (/^grafico/.test(n)) return ['Gráficos'];
    return base ? base.concat(['Outros']) : ['Outros'];
  }
  function tipo(nome) { var n = nome.toLowerCase(); return /^processo/.test(n) ? 'processo' : /^ficha/.test(n) ? 'ficha' : /^historico/.test(n) ? 'historico' : /^grafico/.test(n) ? 'grafico' : 'outro'; }
  function base64(blob) {
    return new Promise(function (ok, falha) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = falha; r.readAsDataURL(blob); });
  }
  async function chamar(funcao, corpo) {
    var s = await window.CF.sb.auth.getSession(), tok = s && s.data && s.data.session && s.data.session.access_token;
    if (!tok) throw new Error('Sessão expirada.');
    var r = await fetch(C.supabaseUrl + '/functions/v1/' + funcao, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: C.supabaseKey }, body: JSON.stringify(corpo) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) { var e = new Error(j.erro || 'Falha no serviço do Drive.'); e.naoConectado = !!j.naoConectado; throw e; }
    return j;
  }
  async function copiar(blob, nome) {
    var pf = window.CF.perfilAtual || {};
    if (!blob || pf.perfil === 'empresa') return;
    if (!navigator.onLine) { ui.toast('Baixado. Sem internet: a cópia no Drive não foi feita.', 'info'); return; }
    try {
      var r = await chamar('drive-salvar', { acao: 'salvar', nome: nome, mime: blob.type || 'application/octet-stream', base64: await base64(blob), pastas: pastas(nome), tipo: tipo(nome), processo_id: contexto && contexto.processo_id || null });
      toastLink('✓ Baixado · salvo também no Drive', r.link);
    } catch (e) {
      if (e.naoConectado) return;   // Drive ainda não conectado: só o download
      ui.toast('Baixado. A cópia no Drive não foi feita: ' + e.message, 'erro');
    }
  }
  function toastLink(texto, link) {
    ui.toast(texto, 'ok');
    if (!link) return;
    setTimeout(function () {   // acrescenta "abrir" no último aviso
      var t = document.querySelectorAll('.toast'); var u = t[t.length - 1];
      if (u && !u.querySelector('a')) { var a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' abrir'; a.style.cssText = 'color:#ffb27a;margin-left:6px;text-decoration:underline'; u.appendChild(a); }
    }, 30);
  }
  // Todo download do sistema passa por CF.pdf.baixar: aqui ele ganha a cópia no Drive
  if (window.CF.pdf && window.CF.pdf.baixar) {
    var original = window.CF.pdf.baixar;
    window.CF.pdf.baixar = function (blob, nome) { original(blob, nome); copiar(blob, nome); };
  }
  window.CF.drive = { definirContexto: definirContexto, chamar: chamar, copiar: copiar };
})();
