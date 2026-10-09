/* =====================================================================
   Classificação Final · offline.js
   Trabalho sem internet: turmas baixadas no aparelho, fila de envio
   (presença; notas na Etapa 3.2), envio automático quando a internet
   volta, aviso de estado e a chave local para desbloquear sem internet.
   ===================================================================== */
(function () {
  'use strict';
  var PREF = 'cf_off_';
  var estado = { enviando: false, ultimoErro: null, ouvintes: [] };

  function usuario() { var p = window.CF.perfilAtual; return p ? p.id : 'anon'; }
  function ler(k, padrao) { try { var v = localStorage.getItem(PREF + usuario() + '_' + k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
  function gravar(k, v) { try { localStorage.setItem(PREF + usuario() + '_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* ---------- Turmas guardadas no aparelho ---------- */
  function turmas() { return ler('turmas', {}); }
  function turma(id) { return turmas()[id] || null; }
  function guardarTurma(snap) {
    var t = turmas();
    // aplica por cima o que ainda está na fila (não perde marcações feitas sem internet)
    snap.notas = snap.notas || {}; snap.observacoes = snap.observacoes || {}; snap.sugestoes = snap.sugestoes || [];
    fila().forEach(function (op) {
      if (op.turma_id !== snap.turma.id) return;
      if (op.tipo === 'presenca') snap.presencas[op.dados.participacao_id + '|' + op.dados.dia] = { presente: op.dados.presente, em: op.dados.em };
      if (op.tipo === 'nota') snap.notas[op.dados.participacao_id + '|' + op.dados.criterio_id] = { valor: op.dados.valor, pontos: op.dados.pontos, av: usuario(), em: op.dados.em, pendente: true };
      if (op.tipo === 'observacao') snap.observacoes[op.dados.participacao_id + '|' + op.dados.teste_id] = { texto: op.dados.texto, em: op.dados.em };
      if (op.tipo === 'sugestao' && !snap.sugestoes.some(function (x) { return x.__op === op.id; })) snap.sugestoes.push(Object.assign({ __op: op.id, situacao: 'pendente', autor_id: usuario() }, op.dados));
    });
    t[snap.turma.id] = snap; gravar('turmas', t); return snap;
  }
  function esquecerTurma(id) { var t = turmas(); delete t[id]; gravar('turmas', t); }

  /* ---------- Fila de envio ---------- */
  function fila() { return ler('fila', []); }
  function pendentes() { return fila().length; }
  function adicionar(op) {
    var f = fila();
    // presença: só a marcação mais recente de cada jovem/dia precisa ir
    if (op.tipo === 'presenca') f = f.filter(function (x) { return !(x.tipo === 'presenca' && x.dados.participacao_id === op.dados.participacao_id && x.dados.dia === op.dados.dia); });
    if (op.tipo === 'nota') f = f.filter(function (x) { return !(x.tipo === 'nota' && x.dados.participacao_id === op.dados.participacao_id && x.dados.criterio_id === op.dados.criterio_id); });
    if (op.tipo === 'observacao') f = f.filter(function (x) { return !(x.tipo === 'observacao' && x.dados.participacao_id === op.dados.participacao_id && x.dados.teste_id === op.dados.teste_id); });
    op.id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    f.push(op); gravar('fila', f); avisar(); enviar();
  }
  async function enviar() {
    if (estado.enviando || !navigator.onLine) { avisar(); return; }
    var f = fila(); if (!f.length) { avisar(); return; }
    estado.enviando = true; avisar();
    try {
      var A = window.CF.dados.avaliacao;
      async function lote(tipo, fn) {
        var ops = fila().filter(function (x) { return x.tipo === tipo; });
        if (!ops.length) return;
        var r = await fn(ops.map(function (x) { return x.dados; }));
        var ids = ops.map(function (x) { return x.id; });
        gravar('fila', fila().filter(function (x) { return ids.indexOf(x.id) < 0; }));
        if (r && r.recusadas && r.recusadas.length) {
          var rec = ler('recusadas', []).concat(r.recusadas.map(function (x) { return Object.assign({ em: new Date().toISOString() }, x); }));
          gravar('recusadas', rec.slice(-50));
          if (window.CF.ui) window.CF.ui.toast(r.recusadas.length + ' nota(s) não foram aceitas: ' + r.recusadas[0].motivo, 'erro');
        }
      }
      await lote('presenca', A.salvarPresencas);
      await lote('nota', A.salvarNotas);
      await lote('sugestao', A.sugerirNotas);
      await lote('observacao', A.salvarObservacoes);
      estado.ultimoErro = null;
    } catch (e) { estado.ultimoErro = e; console.warn('Envio pendente:', e); }
    estado.enviando = false; avisar();
  }
  window.addEventListener('online', function () { enviar(); avisar(); });
  window.addEventListener('offline', avisar);
  setInterval(function () { if (pendentes()) enviar(); }, 30000);

  /* ---------- Estado (para o aviso do topo) ---------- */
  function situacao() {
    var n = pendentes();
    if (!navigator.onLine) return { tipo: 'off', texto: 'Sem internet' + (n ? ' · ' + n + ' ite' + (n === 1 ? 'm' : 'ns') + ' aguardando envio' : ' · o que você fizer fica salvo no aparelho') };
    if (estado.enviando) return { tipo: 'env', texto: 'Enviando ' + n + ' ite' + (n === 1 ? 'm' : 'ns') + '…' };
    if (n && estado.ultimoErro) return { tipo: 'off', texto: n + ' ite' + (n === 1 ? 'm' : 'ns') + ' aguardando envio · tentando de novo' };
    if (n) return { tipo: 'env', texto: n + ' ite' + (n === 1 ? 'm' : 'ns') + ' aguardando envio' };
    return { tipo: 'ok', texto: 'Online e sincronizado' };
  }
  function avisar() { var s = situacao(); estado.ouvintes.forEach(function (f) { try { f(s); } catch (e) { /* ignora */ } }); }
  function ouvir(f) { estado.ouvintes.push(f); f(situacao()); return function () { estado.ouvintes = estado.ouvintes.filter(function (x) { return x !== f; }); }; }

  /* ---------- Chave local: desbloquear sem internet (a senha não é guardada) ---------- */
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  async function derivar(senha, sal) {
    var chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(sal), iterations: 150000, hash: 'SHA-256' }, chave, 256));
  }
  async function guardarChave(email, senha) {
    try {
      if (!window.crypto || !crypto.subtle) return;
      var sal = hex(crypto.getRandomValues(new Uint8Array(16)));
      localStorage.setItem('cf_chave_local', JSON.stringify({ email: String(email).toLowerCase(), sal: sal, h: await derivar(senha, sal) }));
    } catch (e) { /* sem chave local */ }
  }
  async function conferirChave(senha) {
    try {
      var c = JSON.parse(localStorage.getItem('cf_chave_local') || 'null');
      if (!c || !crypto.subtle) return false;
      return (await derivar(senha, c.sal)) === c.h;
    } catch (e) { return false; }
  }

  window.CF.offline = { turmas: turmas, turma: turma, guardarTurma: guardarTurma, esquecerTurma: esquecerTurma, fila: fila, pendentes: pendentes,
    adicionar: adicionar, enviar: enviar, situacao: situacao, ouvir: ouvir, guardarChave: guardarChave, conferirChave: conferirChave };
})();
