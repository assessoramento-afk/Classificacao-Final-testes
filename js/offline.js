/* =====================================================================
   Classificação Final · offline.js
   Garantia de que nenhum lançamento se perde.
   Cada lançamento (presença, nota, sugestão, observação) tem um número
   único (op_id) e passa por estes estados:
     salvo       → gravado no aparelho
     aguardando  → na fila, esperando internet (ou nova tentativa)
     enviado     → saiu do aparelho, esperando a resposta do servidor
     confirmado  → o servidor respondeu "recebido e gravado"
     rejeitado / conflito → o servidor recusou, ou outra nota chegou depois
   Só "confirmado" sai da fila. Rejeitados e conflitos ficam guardados
   até alguém decidir. O mesmo op_id nunca é gravado duas vezes.
   Também: turmas baixadas, cópia de segurança, registro do aparelho e a
   chave local para desbloquear a tela sem internet.
   ===================================================================== */
(function () {
  'use strict';
  var PREF = 'cf_off_';
  var estado = { enviando: false, ultimoErro: null, ouvintes: [], idb: null };
  var FINAIS_LIMITE = 300;

  function usuario() { var p = window.CF.perfilAtual; return p ? p.id : 'anon'; }
  function chave(k) { return PREF + usuario() + '_' + k; }
  function ler(k, padrao) { try { var v = localStorage.getItem(chave(k)); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
  function gravar(k, v) {
    var ok = true;
    try { localStorage.setItem(chave(k), JSON.stringify(v)); } catch (e) { ok = false; }
    espelhar(k, v);
    return ok;
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }

  /* ---------- Cópia em IndexedDB (área mais segura do navegador) ---------- */
  function abrirIDB() {
    return new Promise(function (ok) {
      try {
        var req = indexedDB.open('cf_seguranca', 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('dados'); };
        req.onsuccess = function () { estado.idb = req.result; ok(req.result); };
        req.onerror = function () { ok(null); };
      } catch (e) { ok(null); }
    });
  }
  function espelhar(k, v) {
    if (!estado.idb || (k !== 'fila' && k !== 'atencao')) return;
    try { estado.idb.transaction('dados', 'readwrite').objectStore('dados').put(JSON.stringify(v), chave(k)); } catch (e) { /* segue com localStorage */ }
  }
  function lerIDB(k) {
    return new Promise(function (ok) {
      if (!estado.idb) return ok(null);
      try { var r = estado.idb.transaction('dados').objectStore('dados').get(chave(k)); r.onsuccess = function () { try { ok(r.result ? JSON.parse(r.result) : null); } catch (e) { ok(null); } }; r.onerror = function () { ok(null); }; }
      catch (e) { ok(null); }
    });
  }
  // Se o navegador apagou o localStorage, recupera da cópia
  async function recuperar() {
    if (!estado.idb) await abrirIDB();
    ['fila', 'atencao'].forEach(async function (k) {
      var atual = ler(k, []), copia = await lerIDB(k);
      if ((!atual || !atual.length) && copia && copia.length) { try { localStorage.setItem(chave(k), JSON.stringify(copia)); } catch (e) { /* nada */ } avisar(); enviar(); }
    });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
  }

  /* ---------- Turmas guardadas no aparelho ---------- */
  function turmas() { return ler('turmas', {}); }
  function turma(id) { return turmas()[id] || null; }
  function aplicarLocal(snap, op) {
    var d = op.dados;
    if (op.tipo === 'presenca') snap.presencas[d.participacao_id + '|' + d.dia] = { presente: d.presente, em: d.em, estado: op.estado };
    if (op.tipo === 'nota') snap.notas[d.participacao_id + '|' + d.criterio_id] = { valor: d.valor, pontos: d.pontos, av: usuario(), em: d.em, pendente: true, estado: op.estado };
    if (op.tipo === 'observacao') snap.observacoes[d.participacao_id + '|' + d.teste_id] = { texto: d.texto, em: d.em, estado: op.estado };
    if (op.tipo === 'sugestao' && !snap.sugestoes.some(function (x) { return x.__op === op.op_id; })) snap.sugestoes.push(Object.assign({ __op: op.op_id, situacao: 'pendente', autor_id: usuario() }, d));
  }
  function guardarTurma(snap) {
    var t = turmas();
    snap.notas = snap.notas || {}; snap.observacoes = snap.observacoes || {}; snap.sugestoes = snap.sugestoes || [];
    // aplica por cima o que ainda não foi confirmado (nada feito no aparelho some ao atualizar)
    fila().concat(atencao()).forEach(function (op) { if (op.turma_id === snap.turma.id) aplicarLocal(snap, op); });
    t[snap.turma.id] = snap; gravar('turmas', t); return snap;
  }
  function esquecerTurma(id) { var t = turmas(); delete t[id]; gravar('turmas', t); }

  /* ---------- Fila, finais e itens que precisam de atenção ---------- */
  function fila() { return ler('fila', []); }
  function atencao() { return ler('atencao', []); }
  function finais() { return ler('finais', []); }
  function pendentes() { return fila().length + atencao().length; }
  function mesmoAlvo(a, b) {
    if (a.tipo !== b.tipo) return false;
    var x = a.dados, y = b.dados;
    if (a.tipo === 'presenca') return x.participacao_id === y.participacao_id && x.dia === y.dia;
    if (a.tipo === 'nota') return x.participacao_id === y.participacao_id && x.criterio_id === y.criterio_id;
    if (a.tipo === 'observacao') return x.participacao_id === y.participacao_id && x.teste_id === y.teste_id;
    return false;
  }
  function adicionar(op) {
    op.op_id = uuid(); op.criado_em = new Date().toISOString(); op.estado = 'salvo'; op.tentativas = 0;
    var f = fila();
    // um novo lançamento no mesmo lugar substitui o anterior que ainda não saiu do aparelho
    f = f.filter(function (x) { return !(x.estado !== 'enviado' && mesmoAlvo(x, op)); });
    gravar('atencao', atencao().filter(function (x) { return !mesmoAlvo(x, op); }));
    if (!op.rotulo) op.rotulo = rotular(op);
    op.estado = navigator.onLine ? 'aguardando' : 'salvo';
    f.push(op); gravar('fila', f);
    avisar(); enviar();
    return op.op_id;
  }
  // Texto legível do lançamento (para a Central de envios)
  function rotular(op) {
    try {
      var sn = turma(op.turma_id) || {}, d = op.dados, j = (sn.jovens || []).filter(function (x) { return x.id === d.participacao_id; })[0] || {};
      var ts = ((sn.processo || {}).configuracao || {}).testes || [], t = ts.filter(function (x) { return x.teste_id === d.teste_id; })[0] || {};
      var c = (t.criterios || []).filter(function (x) { return x.id === d.criterio_id; })[0] || {};
      var v = function (n) { return String(n).replace('.', ','); };
      if (op.tipo === 'presenca') return (j.nome || 'Jovem') + ' · presença ' + (d.dia ? d.dia.split('-').reverse().slice(0, 2).join('/') : '') + ' = ' + (d.presente ? 'presente' : 'faltou');
      if (op.tipo === 'nota') return (j.nome || 'Jovem') + ' · ' + (t.nome || 'teste') + ' · ' + (c.nome || '') + ' = ' + v(d.valor);
      if (op.tipo === 'sugestao') return (j.nome || 'Jovem') + ' · sugestão ' + (c.nome || '') + ' = ' + v(d.valor);
      if (op.tipo === 'observacao') return (j.nome || 'Jovem') + ' · observação em ' + (t.nome || 'teste');
    } catch (e) { /* sem rótulo */ }
    return op.tipo;
  }
  function moverPara(lista, op) { var l = ler(lista, []); l.push(op); if (lista === 'finais' && l.length > FINAIS_LIMITE) l = l.slice(-FINAIS_LIMITE); gravar(lista, l); }

  async function enviar() {
    if (estado.enviando || !navigator.onLine) { avisar(); return; }
    var f = fila(); if (!f.length) { avisar(); registrarAparelho(); return; }
    estado.enviando = true;
    var lote = f.slice(0, 80);
    var ids = lote.map(function (x) { return x.op_id; });
    gravar('fila', f.map(function (x) { if (ids.indexOf(x.op_id) >= 0) { x.estado = 'enviado'; x.enviado_em = new Date().toISOString(); x.tentativas = (x.tentativas || 0) + 1; } return x; }));
    avisar();
    try {
      var r = await window.CF.dados.avaliacao.salvarLote(lote.map(function (x) { return { op_id: x.op_id, tipo: x.tipo, dados: x.dados, forcar: !!x.forcar }; }), aparelhoId());
      var resp = {}; (r || []).forEach(function (x) { resp[x.op_id] = x; });
      var resto = [], rej = 0;
      fila().forEach(function (x) {
        var a = resp[x.op_id];
        if (!a) { if (x.estado === 'enviado' && ids.indexOf(x.op_id) >= 0) x.estado = 'aguardando'; resto.push(x); return; }
        x.respondido_em = new Date().toISOString(); x.motivo = a.motivo || null;
        if (a.estado === 'confirmado') { x.estado = 'confirmado'; moverPara('finais', x); }
        else if (a.estado === 'adiado') { x.estado = 'aguardando'; resto.push(x); }
        else { x.estado = a.estado; x.servidor = a.servidor || null; moverPara('atencao', x); rej++; }
      });
      gravar('fila', resto);
      estado.ultimoErro = null;
      if (rej && window.CF.ui) window.CF.ui.toast(rej + ' lançamento(s) precisam da sua atenção. Veja a Central de envios.', 'erro');
      if (resto.some(function (x) { return x.estado === 'aguardando' && ids.indexOf(x.op_id) < 0; })) setTimeout(enviar, 300);
    } catch (e) {
      // falhou no caminho: tudo o que estava "enviado" volta a "aguardando" (o op_id evita gravar duas vezes)
      gravar('fila', fila().map(function (x) { if (x.estado === 'enviado') x.estado = 'aguardando'; return x; }));
      estado.ultimoErro = e;
      if (window.CF.erros && navigator.onLine) window.CF.erros.registrar(e, { acao: 'enviar fila', itens: lote.length });
    }
    estado.enviando = false; avisar(); registrarAparelho();
  }
  window.addEventListener('online', function () { enviar(); avisar(); });
  window.addEventListener('offline', avisar);
  setInterval(function () { if (fila().length) enviar(); }, 30000);

  /* ---------- Decisões sobre rejeitados e conflitos ---------- */
  function tentarDeNovo(opId, forcar) {
    var a = atencao(), op = a.filter(function (x) { return x.op_id === opId; })[0]; if (!op) return;
    gravar('atencao', a.filter(function (x) { return x.op_id !== opId; }));
    var novo = { tipo: op.tipo, turma_id: op.turma_id, dados: Object.assign({}, op.dados, { em: new Date().toISOString() }), forcar: !!forcar, rotulo: op.rotulo, de: op.op_id };
    adicionar(novo);
  }
  function descartar(opId) {
    var a = atencao(), op = a.filter(function (x) { return x.op_id === opId; })[0]; if (!op) return;
    op.estado = 'descartado'; op.descartado_em = new Date().toISOString();
    gravar('atencao', a.filter(function (x) { return x.op_id !== opId; })); moverPara('finais', op); avisar();
  }
  function virarSugestao(opId, justificativa) {
    var a = atencao(), op = a.filter(function (x) { return x.op_id === opId; })[0]; if (!op || op.tipo !== 'nota') return;
    gravar('atencao', a.filter(function (x) { return x.op_id !== opId; }));
    adicionar({ tipo: 'sugestao', turma_id: op.turma_id, rotulo: op.rotulo, dados: { participacao_id: op.dados.participacao_id, criterio_id: op.dados.criterio_id, teste_id: op.dados.teste_id, valor: op.dados.valor, justificativa: justificativa, em: new Date().toISOString() } });
  }

  /* ---------- Cópia de segurança ---------- */
  function copia() {
    return { sistema: 'Classificação Final', versao: (window.CF_CONFIG || {}).versao, gerado_em: new Date().toISOString(), usuario: usuario(), aparelho: aparelhoId(),
      itens: fila().concat(atencao()).map(function (x) { return { op_id: x.op_id, tipo: x.tipo, estado: x.estado, turma_id: x.turma_id, rotulo: x.rotulo, dados: x.dados, motivo: x.motivo || null }; }) };
  }
  function baixarCopia() {
    var c = copia();
    var blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'lancamentos_pendentes_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    return c.itens.length;
  }
  // Importa a cópia de outro aparelho (administrador): os itens entram na fila deste aparelho
  function importarCopia(json) {
    var c = typeof json === 'string' ? JSON.parse(json) : json;
    if (!c || c.sistema !== 'Classificação Final' || !Array.isArray(c.itens)) throw new Error('Arquivo de cópia inválido.');
    var f = fila(), n = 0;
    c.itens.forEach(function (x) { if (!f.some(function (y) { return y.op_id === x.op_id; })) { f.push({ op_id: x.op_id, tipo: x.tipo, turma_id: x.turma_id, rotulo: x.rotulo, dados: x.dados, estado: 'aguardando', criado_em: c.gerado_em, importado: true }); n++; } });
    gravar('fila', f); avisar(); enviar(); return n;
  }

  /* ---------- Aparelho ---------- */
  function aparelhoId() { var id = localStorage.getItem('cf_aparelho_id'); if (!id) { id = uuid(); localStorage.setItem('cf_aparelho_id', id); } return id; }
  function nomeAparelho() {
    var u = navigator.userAgent;
    var so = /iphone|ipod/i.test(u) ? 'iPhone' : /ipad/i.test(u) ? 'iPad' : /android/i.test(u) ? 'Android' : /windows/i.test(u) ? 'Windows' : /mac os/i.test(u) ? 'Mac' : /linux/i.test(u) ? 'Linux' : 'Aparelho';
    var nav = /edg\//i.test(u) ? 'Edge' : /crios|chrome/i.test(u) ? 'Chrome' : /fxios|firefox/i.test(u) ? 'Firefox' : /safari/i.test(u) ? 'Safari' : '';
    var app = (window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)) ? ' (app)' : '';
    return so + (nav ? ' · ' + nav : '') + app;
  }
  var ultimoRegistro = 0;
  function registrarAparelho(forcar) {
    if (!navigator.onLine || !window.CF.perfilAtual || !window.CF.sb) return;
    if (!forcar && Date.now() - ultimoRegistro < 60000) return;
    ultimoRegistro = Date.now();
    var f = fila(), mais = f.concat(atencao()).map(function (x) { return x.criado_em; }).sort()[0] || null;
    try { window.CF.sb.rpc('registrar_aparelho', { p: { id: aparelhoId(), nome: nomeAparelho(), versao: (window.CF_CONFIG || {}).versao, pendentes: pendentes(), pendente_desde: mais, rejeitados: atencao().length } }); } catch (e) { /* tenta depois */ }
  }
  setInterval(function () { registrarAparelho(true); }, 120000);

  /* ---------- Estado (aviso do topo) e resumo (Central de envios) ---------- */
  function resumo() {
    var f = fila(), a = atencao(), hoje = new Date().toISOString().slice(0, 10);
    return {
      salvo: f.filter(function (x) { return x.estado === 'salvo'; }).length,
      aguardando: f.filter(function (x) { return x.estado === 'aguardando'; }).length,
      enviado: f.filter(function (x) { return x.estado === 'enviado'; }).length,
      confirmado: finais().filter(function (x) { return x.estado === 'confirmado' && (x.respondido_em || '').slice(0, 10) === hoje; }).length,
      atencao: a.length
    };
  }
  function situacao() {
    var n = fila().length, a = atencao().length;
    var extra = a ? ' · ' + a + ' precisa' + (a > 1 ? 'm' : '') + ' de atenção' : '';
    if (!navigator.onLine) return { tipo: 'off', texto: 'Sem internet' + (n ? ' · ' + n + ' ite' + (n === 1 ? 'm' : 'ns') + ' aguardando envio' : ' · o que você fizer fica salvo no aparelho') + extra };
    if (estado.enviando) return { tipo: 'env', texto: 'Enviando ' + n + ' ite' + (n === 1 ? 'm' : 'ns') + '…' + extra };
    if (n && estado.ultimoErro) return { tipo: 'off', texto: n + ' ite' + (n === 1 ? 'm' : 'ns') + ' aguardando envio · tentando de novo' + extra };
    if (n) return { tipo: 'env', texto: n + ' ite' + (n === 1 ? 'm' : 'ns') + ' aguardando envio' + extra };
    if (a) return { tipo: 'erro', texto: a + ' lançamento(s) precisam da sua atenção · toque para ver' };
    return { tipo: 'ok', texto: 'Online e sincronizado' };
  }
  function avisar() { var s = situacao(); estado.ouvintes.forEach(function (f) { try { f(s); } catch (e) { /* ignora */ } }); }
  function ouvir(f) { estado.ouvintes.push(f); f(situacao()); return function () { estado.ouvintes = estado.ouvintes.filter(function (x) { return x !== f; }); }; }

  /* ---------- Chave local: desbloquear sem internet (a senha não é guardada) ---------- */
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  async function derivar(senha, sal) {
    var k = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(sal), iterations: 150000, hash: 'SHA-256' }, k, 256));
  }
  async function guardarChave(email, senha) {
    try {
      if (!window.crypto || !crypto.subtle) return;
      var sal = hex(crypto.getRandomValues(new Uint8Array(16)));
      localStorage.setItem('cf_chave_local', JSON.stringify({ email: String(email).toLowerCase(), sal: sal, h: await derivar(senha, sal) }));
    } catch (e) { /* sem chave local */ }
  }
  async function conferirChave(senha) {
    try { var c = JSON.parse(localStorage.getItem('cf_chave_local') || 'null'); if (!c || !crypto.subtle) return false; return (await derivar(senha, c.sal)) === c.h; }
    catch (e) { return false; }
  }

  recuperar();
  window.CF.offline = { recuperar: recuperar, turmas: turmas, turma: turma, guardarTurma: guardarTurma, esquecerTurma: esquecerTurma, fila: fila, atencao: atencao, finais: finais,
    pendentes: pendentes, adicionar: adicionar, enviar: enviar, situacao: situacao, ouvir: ouvir, resumo: resumo,
    tentarDeNovo: tentarDeNovo, descartar: descartar, virarSugestao: virarSugestao, baixarCopia: baixarCopia, importarCopia: importarCopia, copia: copia,
    aparelhoId: aparelhoId, nomeAparelho: nomeAparelho, registrarAparelho: registrarAparelho, guardarChave: guardarChave, conferirChave: conferirChave };
})();
