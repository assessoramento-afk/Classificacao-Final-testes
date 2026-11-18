/* =====================================================================
   Projeto Gol Testes · app.js  (T2)
   App dos tablets: ligação pelo código de 6 números, entrada pelo crachá,
   lista de testes, explicação, teste com tempo, conclusão e envio seguro
   dos resultados para a Classificação Final. Funciona sem internet.
   ===================================================================== */
(function () {
  'use strict';
  var VERSAO_APP = '1.0.0';
  var SB = { url: 'https://nctyfeoifbuloihidabg.supabase.co', chave: 'sb_publishable_PPZ9u2KDQa9UjnWjVBa8fA_oexm1iHh' };
  var app = document.getElementById('app'), M = window.CF.testesMotor, esc = window.CF.ui.esc;
  var LOGO = 'img/gol_dark.png';

  /* ---------- Guardar no tablet (IndexedDB) ---------- */
  var dbp = new Promise(function (ok, er) {
    var r = indexedDB.open('gol-testes', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('kv'); r.result.createObjectStore('fila'); };
    r.onsuccess = function () { ok(r.result); }; r.onerror = function () { er(r.error); };
  });
  function op(loja, modo, f) { return dbp.then(function (db) { return new Promise(function (ok, er) { var t = db.transaction(loja, modo), s = t.objectStore(loja), q = f(s); t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { er(t.error); }; }); }); }
  var kv = { ler: function (k) { return op('kv', 'readonly', function (s) { return s.get(k); }); }, gravar: function (k, v) { return op('kv', 'readwrite', function (s) { s.put(v, k); }); }, apagar: function (k) { return op('kv', 'readwrite', function (s) { s.delete(k); }); } };
  var fila = { todos: function () { return op('fila', 'readonly', function (s) { return s.getAll(); }); }, por: function (r) { return op('fila', 'readwrite', function (s) { s.put(r, r.uid); }); }, tirar: function (uid) { return op('fila', 'readwrite', function (s) { s.delete(uid); }); } };

  /* ---------- Conversa com o banco (porta restrita do tablet) ---------- */
  function rpc(nome, args) {
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 20000);
    return fetch(SB.url + '/rest/v1/rpc/' + nome, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', apikey: SB.chave, Authorization: 'Bearer ' + SB.chave }, body: JSON.stringify(args || {}) })
      .then(function (r) { clearTimeout(t); return r.json().then(function (j) { if (!r.ok) throw new Error((j && (j.message || j.hint)) || 'Falha ao falar com o servidor.'); return j; }); });
  }

  /* ---------- Estado ---------- */
  var E = { chave: null, pacote: null, jovem: null, ultimaSinc: null, enviando: false, baixando: false };
  function online() { return navigator.onLine !== false; }
  function aviso(txt, tipo) { var d = document.createElement('div'); d.textContent = txt; if (tipo) d.className = tipo; document.getElementById('avisos').appendChild(d); setTimeout(function () { d.remove(); }, 3600); }
  function uid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 10); }
  function normCod(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
  function hora(iso) { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // sem copiar e colar em nenhum teste
  ['copy', 'cut', 'paste', 'drop', 'contextmenu'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'paste' || ev === 'drop') aviso('🚫 Neste teste não é permitido colar.', 'erro'); }); });

  /* ---------- Sincronização ---------- */
  async function baixar(silencioso) {
    if (!E.chave || E.baixando || !online()) return false;
    E.baixando = true;
    try {
      var p = await rpc('tablet_baixar', { p_chave: E.chave, p_versao_app: VERSAO_APP });
      E.pacote = p; E.ultimaSinc = new Date().toISOString();
      await kv.gravar('pacote', p); await kv.gravar('ultimaSinc', E.ultimaSinc);
      if (!silencioso) aviso('Testes e turmas atualizados.');
      return true;
    } catch (e) {
      if (/não autorizado/i.test(e.message)) { await desligar('Este tablet foi desativado na Classificação Final. Peça um novo código.'); }
      else if (!silencioso) aviso('Sem conexão com o servidor. Usando o que já está no tablet.', 'erro');
      return false;
    } finally { E.baixando = false; }
  }
  async function enviar() {
    if (!E.chave || E.enviando || !online()) return;
    var lista = await fila.todos(); if (!lista.length) { atualizarStatus(); return; }
    E.enviando = true;
    try {
      var r = await rpc('tablet_enviar', { p_chave: E.chave, p_lista: lista.slice(0, 20), p_pendentes: Math.max(0, lista.length - 20), p_versao_app: VERSAO_APP });
      for (var i = 0; i < (r.recebidos || []).length; i++) await fila.tirar(r.recebidos[i]);
    } catch (e) { /* tenta de novo depois */ }
    finally { E.enviando = false; atualizarStatus(); }
  }
  setInterval(function () { enviar(); }, 30000);
  setInterval(function () { if (!emTeste) baixar(true); }, 5 * 60000);
  window.addEventListener('online', function () { enviar(); baixar(true); atualizarStatus(); });
  window.addEventListener('offline', atualizarStatus);
  async function atualizarStatus() {
    var el = document.getElementById('st'); if (!el) return;
    var n = (await fila.todos()).length;
    el.className = 'pil ' + (!online() ? 'av' : n ? 'av' : 'ok');
    el.textContent = !online() ? 'Sem internet' + (n ? ' · ' + n + ' a enviar' : '') : (n ? n + ' a enviar' : 'Tudo enviado');
  }

  /* ---------- Feitos (no banco + neste tablet) ---------- */
  async function feitos(pid) {
    var f = {};
    ((E.pacote && E.pacote.feitos) || []).forEach(function (x) { if (x.participacao_id === pid) f[x.teste_id] = x; });
    (await fila.todos()).forEach(function (x) { if (x.participacao_id === pid) f[x.teste_id] = { fim: x.fim, tablet: 'este tablet' }; });
    ((await kv.ler('feitosLocal')) || []).forEach(function (x) { if (x.participacao_id === pid && !f[x.teste_id]) f[x.teste_id] = x; });
    return f;
  }

  /* ---------- Telas ---------- */
  function topo(titulo, sub, dir) {
    return '<div class="topo"><img src="' + LOGO + '" alt="" id="logo"><div><b>' + esc(titulo) + '</b>' + (sub ? '<br><small>' + esc(sub) + '</small>' : '') + '</div><div class="dir">' + (dir || '') + '<span class="pil" id="st">…</span></div></div>';
  }
  var emTeste = false;
  // modo avaliador: segurar o logo por 3 segundos
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('#logo') || emTeste) return;
    var t = setTimeout(function () { pedirPIN(); }, 3000);
    function solta() { clearTimeout(t); document.removeEventListener('pointerup', solta); document.removeEventListener('pointercancel', solta); }
    document.addEventListener('pointerup', solta); document.addEventListener('pointercancel', solta);
  });

  // Leitor "cofre digital" + teclado (crachá: letras e números, formato 4+2; tablet: 6 números)
  var SVG_LEITOR = '<svg viewBox="0 0 210 210"><defs><clipPath id="cl"><circle cx="105" cy="105" r="52"/></clipPath><linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ee7330"/></linearGradient></defs>' +
    '<g class="ag a3"><circle cx="105" cy="105" r="98" fill="none" stroke="#ee7330" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="3 9"/></g>' +
    '<g class="ag a1"><circle cx="105" cy="105" r="86" fill="none" stroke="#f4f1ef" stroke-opacity=".75" stroke-width="2.4" stroke-dasharray="60 22 14 22"/></g>' +
    '<g class="ag a2"><circle cx="105" cy="105" r="72" fill="none" stroke="url(#gl)" stroke-width="3" stroke-dasharray="30 18"/></g>' +
    '<circle cx="105" cy="105" r="62" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>' +
    '<circle class="prog-c" cx="105" cy="105" r="62" fill="none" stroke="#ee7330" stroke-width="5" stroke-linecap="round" stroke-dasharray="389.6" stroke-dashoffset="389.6" transform="rotate(-90 105 105)"/>' +
    '<circle class="centro" cx="105" cy="105" r="54" fill="#141111" stroke="#f4f1ef" stroke-opacity=".5" stroke-width="2"/><image href="' + LOGO + '" x="53" y="53" width="104" height="104" clip-path="url(#cl)"/></svg><div class="laser"></div>';
  function cofre(opts) {   // opts: { tam, numeros, formato(4+2), aoCompletar(cod, ui) }
    var cod = '', ocupado = false;
    var teclas = opts.numeros ? '1234567890'.split('') : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    var h = '<div class="cofre"><div class="lt" id="lt">' + SVG_LEITOR + '<div class="letr" id="letr">' + (opts.numeros ? 'DIGITE O CÓDIGO' : 'DIGITE SEU CÓDIGO') + '</div></div><div class="painel"><div class="cod" id="cod"></div>' +
      '<div class="kb' + (opts.numeros ? ' so-num' : '') + '" id="kb">' + teclas.map(function (t) { return '<button type="button" data-t="' + t + '"' + (/\d/.test(t) ? ' class="num"' : '') + '>' + t + '</button>'; }).join('') +
      '<button type="button" class="ap" data-t="⌫" aria-label="Apagar">⌫</button></div></div></div>';
    function desenha() {
      var c = document.getElementById('cod'); if (!c) return; var s = '';
      for (var i = 0; i < opts.tam; i++) { if (opts.formato && i === 4) s += '<i>-</i>'; var ch = cod[i]; s += '<span class="' + (ch ? 'f' + (/\d/.test(ch) ? ' n' : '') : '') + '">' + (ch || '•') + '</span>'; }
      c.innerHTML = s; c.classList.remove('erro');
      var pr = document.querySelector('.prog-c'); if (pr) pr.style.strokeDashoffset = 389.6 * (1 - cod.length / opts.tam);
    }
    function estado(cls, txt) { var lt = document.getElementById('lt'); lt.className = 'lt ' + (cls || ''); document.getElementById('letr').textContent = txt; }
    var ui = {
      erro: function (txt) { estado('erro', txt || 'ACESSO NEGADO'); document.getElementById('cod').classList.add('erro'); setTimeout(function () { cod = ''; ocupado = false; desenha(); estado('', opts.numeros ? 'DIGITE O CÓDIGO' : 'DIGITE SEU CÓDIGO'); }, 1800); },
      ok: function (txt) { estado('ok', txt || 'ACESSO LIBERADO'); },
      lendo: function () { estado('lendo', 'VERIFICANDO…'); },
      aviso: function (txt) { estado('aviso', txt); setTimeout(function () { if (!ocupado) estado('', opts.numeros ? 'DIGITE O CÓDIGO' : 'DIGITE SEU CÓDIGO'); }, 1800); },
      definir: function (c) { cod = normCod(c).slice(0, opts.tam); desenha(); if (cod.length === opts.tam) { ocupado = true; opts.aoCompletar(cod, ui); } }
    };
    return { html: h, ligar: function () {
      desenha();
      document.getElementById('kb').addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b || ocupado) return; var t = b.getAttribute('data-t');
        if (t === '⌫') { cod = cod.slice(0, -1); desenha(); return; }
        if (cod.length >= opts.tam) return;
        cod += t; desenha();
        if (cod.length === opts.tam) { ocupado = true; opts.aoCompletar(cod, ui); }
      });
    }, ui: ui };
  }

  // 1) Ligar o tablet
  function telaLigar(msg) {
    var c = cofre({ tam: 6, numeros: true, aoCompletar: async function (cod, ui) {
      ui.lendo();
      if (!online()) { ui.erro('SEM INTERNET'); aviso('Para ligar o tablet é preciso internet (Wi-Fi, roteador 4G ou celular).', 'erro'); return; }
      try {
        var r = await rpc('tablet_ligar', { p_codigo: cod, p_modelo: navigator.userAgent.slice(0, 120) });
        E.chave = r.chave; await kv.gravar('chave', r.chave); await kv.gravar('tablet', r.tablet);
        ui.ok('TABLET LIGADO'); await baixar(true);
        setTimeout(function () { telaEntrada(); }, 900);
      } catch (e) { ui.erro('CÓDIGO INVÁLIDO'); aviso(e.message, 'erro'); }
    } });
    app.innerHTML = '<div class="entrada" style="background:var(--fundo)"><h1>Ligar este tablet</h1><p class="sub">' + esc(msg || 'Na Classificação Final, abra Configurações › Tablets, toque em "Novo código" e digite aqui os 6 números.') + '</p>' + c.html + '</div>';
    c.ligar();
  }
  async function desligar(msg) { E.chave = null; E.pacote = null; await kv.apagar('chave'); await kv.apagar('pacote'); telaLigar(msg); }

  // 2) Entrada pelo crachá
  var qrStream = null;
  function pararQR() { if (qrStream) { qrStream.getTracks().forEach(function (t) { t.stop(); }); qrStream = null; } }
  function telaEntrada() {
    emTeste = false; E.jovem = null; document.body.classList.remove('pede-paisagem', 'grande'); pararQR();
    var tb = (E.pacote && E.pacote.tablet) || {};
    var c = cofre({ tam: 6, formato: true, aoCompletar: function (cod, ui) {
      ui.lendo();
      setTimeout(function () {
        var j = ((E.pacote && E.pacote.jovens) || []).filter(function (x) { return normCod(x.codigo) === cod; })[0];
        if (!j) { ui.erro(); aviso('Código não encontrado. Confira o crachá ou chame o avaliador.', 'erro'); return; }
        ui.ok(); E.jovem = j; setTimeout(telaTestes, 900);
      }, 900);
    } });
    app.innerHTML = topo('Projeto Gol Testes', (tb.nome || 'Tablet') + (tb.etiqueta ? ' · ' + tb.etiqueta : '')) +
      '<div class="entrada"><h1>Olá! Digite o código do seu crachá</h1><p class="sub">São 6 caracteres, como no exemplo K7O1-08. Toque nas letras e nos números.</p>' + c.html +
      ('BarcodeDetector' in window && navigator.mediaDevices ? '<div class="qr"><button type="button" class="bsec" id="bqr">📷 Ler o QR Code do crachá</button></div><video class="qr-vid" id="qv" playsinline muted style="display:none"></video>' : '') + '</div>';
    c.ligar(); atualizarStatus();
    var bq = document.getElementById('bqr');
    if (bq) bq.addEventListener('click', async function () {
      try {
        var v = document.getElementById('qv'); qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); v.srcObject = qrStream; v.style.display = ''; await v.play();
        var det = new window.BarcodeDetector({ formats: ['qr_code'] }), fim = Date.now() + 30000;
        (async function ler() {
          if (!qrStream) return;
          try { var r = await det.detect(v); if (r && r[0]) { var t = r[0].rawValue || ''; var m = t.match(/[A-Z0-9]{4}-?[A-Z0-9]{2}/i); pararQR(); v.style.display = 'none'; if (m) c.ui.definir(m[0]); else aviso('QR Code não reconhecido.', 'erro'); return; } } catch (e) {}
          if (Date.now() > fim) { pararQR(); v.style.display = 'none'; return; }
          setTimeout(ler, 250);
        })();
      } catch (e) { aviso('Não foi possível abrir a câmera.', 'erro'); }
    });
  }

  // 3) Lista de testes do jovem
  async function telaTestes() {
    var j = E.jovem, tu = ((E.pacote && E.pacote.turmas) || []).filter(function (t) { return t.id === j.turma_id; })[0] || {};
    var ids = tu.testes || [], f = await feitos(j.participacao_id);
    var ts = ids.map(function (id) { return ((E.pacote && E.pacote.testes) || []).filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    app.innerHTML = topo('Projeto Gol Testes', j.nome + ' · ' + (tu.nome || ''), '<button type="button" class="bsec" id="sair" style="padding:7px 14px">Sair</button>') +
      '<div class="miolo"><div class="lista"><h1>Olá, ' + esc(String(j.nome || '').split(' ')[0]) + '!</h1><p class="sub">Escolha o teste que o avaliador indicar.</p><div class="tsts">' +
      (ts.length ? ts.map(function (t, i) {
        var est = t.estrutura || {}, ft = f[t.id];
        return '<div class="tst' + (ft ? ' feito' : '') + '" style="--c:' + (ft ? '#3FA66B' : '#ee7330') + '"><b>' + esc(t.nome) + '</b><small>⏱ ' + (est.tempo_min || '?') + ' minutos' + (est.orientacao === 'paisagem' ? ' · tela deitada' : '') + '</small>' +
          (ft ? '<small>✓ Feito' + (ft.fim ? ' às ' + hora(ft.fim) : '') + (ft.tablet ? ' · ' + esc(ft.tablet) : '') + '</small>' : '<button type="button" class="bpri" data-t="' + t.id + '">Abrir</button>') + '</div>';
      }).join('') : '<div class="bx">Nenhum teste no tablet para esta turma. Chame o avaliador.</div>') + '</div></div></div>';
    atualizarStatus();
    document.getElementById('sair').addEventListener('click', telaEntrada);
    app.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { telaExplicacao(ts.filter(function (x) { return x.id === b.getAttribute('data-t'); })[0]); }); });
  }

  // 4) Explicação + Iniciar
  function paisagem(est) { return est.orientacao ? est.orientacao === 'paisagem' : (est.partes || []).some(function (p) { return p.tipo === 'contar' || p.tipo === 'marcar'; }); }
  function telaExplicacao(t) {
    var est = t.estrutura || {}, exp = est.explicacao || {};
    var passos = exp.passos && exp.passos.length ? exp.passos : [['Leia as instruções', est.instrucoes || 'Leia com atenção antes de começar.'], ['Responda', 'Toque nas respostas. Você pode voltar e mudar enquanto houver tempo.'], ['Finalize', 'Quando terminar, toque em "Finalizar teste". Se o tempo acabar, o teste termina sozinho.']];
    app.innerHTML = topo(t.nome, E.jovem.nome) + '<div class="miolo"><div class="exp"><div class="bx"><h3>📘 Como fazer este teste</h3>' +
      passos.map(function (p, i) { return '<div class="passo"><b>' + (i + 1) + '</b><div><strong>' + esc(p[0]) + '</strong><p style="margin:4px 0 0">' + esc(p[1]) + '</p></div></div>'; }).join('') +
      '<div class="info"><span>⏱ ' + (est.tempo_min || '?') + ' minutos</span>' + (paisagem(est) ? '<span>🔄 tela deitada</span>' : '') + '</div></div>' +
      '<div>' + (exp.exemplo ? '<div class="bx" style="background:linear-gradient(160deg,#231f1f,#3a2a20);color:#f4f1ef"><h3>Exemplo</h3><p>' + esc(exp.exemplo) + '</p></div>' : '') +
      (exp.dica ? '<div class="dica2">💡 <b>Dica:</b> ' + esc(exp.dica) + '</div>' : '') + (est.instrucoes ? '<div class="bx" style="margin-top:12px"><h3>Instruções</h3><p>' + esc(est.instrucoes) + '</p></div>' : '') + '</div></div>' +
      '<div class="ini"><button type="button" class="bsec" id="volt" style="margin-right:10px">Voltar</button><button type="button" class="bpri" id="ini">Iniciar teste</button></div></div>';
    atualizarStatus();
    document.getElementById('volt').addEventListener('click', telaTestes);
    document.getElementById('ini').addEventListener('click', function () {
      janela('⏱', 'Começar agora?', 'O tempo de ' + mmss((est.tempo_min || 10) * 60) + ' começa a contar.', [['Voltar', null], ['Começar', function () { telaTeste(t); }]]);
    });
  }
  function janela(ic, tit, txt, bts) {
    var f = document.createElement('div'); f.className = 'fundoj';
    f.innerHTML = '<div class="jan" role="dialog" aria-modal="true"><div class="ji">' + ic + '</div><h2>' + esc(tit) + '</h2><p>' + txt + '</p><div class="bs">' + bts.map(function (b, i) { return '<button type="button" class="' + (i === bts.length - 1 ? 'bpri' : 'bsec') + '" data-i="' + i + '">' + esc(b[0]) + '</button>'; }).join('') + '</div></div>';
    document.body.appendChild(f);
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; f.remove(); var a = bts[+b.getAttribute('data-i')][1]; if (a) a(); });
  }

  // 5) Teste com tempo
  function telaTeste(t) {
    var est = t.estrutura || {}, tempo = (est.tempo_min || 10) * 60, inicio = new Date(), fimTs = inicio.getTime() + tempo * 1000, acabou = false, saidas = [], saiuEm = null;
    emTeste = true; if (paisagem(est)) { document.body.classList.add('pede-paisagem'); try { screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} }
    app.innerHTML = topo(t.nome, E.jovem.nome, '<div class="relo" id="relo"><span class="anel" id="anel"></span><span class="tempo" id="tempo">' + mmss(tempo) + '</span></div>') + '<div class="prog"><i id="barra"></i></div>' +
      '<div class="instr"><span class="tx">' + esc(est.instrucoes || 'Responda e toque em "Finalizar teste" quando terminar.') + '</span><button type="button" class="ib" id="ouvir">🔊 Ouvir</button><button type="button" class="ib" id="maior">A+ Letra maior</button></div>' +
      '<div class="miolo" id="mi"></div><div class="rodape"><span class="cont" id="cont"></span><div class="nav" id="nav"></div><button type="button" class="bpri" id="fin">✓ Finalizar teste</button></div>' +
      '<div class="girar"><svg viewBox="0 0 64 64"><rect x="18" y="8" width="28" height="48" rx="5"/><path d="M28 50h8"/></svg><b style="font-size:20px">Gire o tablet para a horizontal</b><span style="color:#cfc7c7">Este teste é feito com a tela deitada. O tempo continua contando.</span></div>';
    var ctl = M.desenhar(document.getElementById('mi'), est); atualizarStatus();
    var itens = [].slice.call(app.querySelectorAll('#mi tr[data-l], #mi .tm-bloco'));
    function respondidas() {
      var r = ctl.respostas(), n = 0;
      (est.partes || []).forEach(function (p, i) { var x = r[i] || {}; if (p.tipo === 'contar') n += Object.keys(x).length; else if (p.tipo === 'marcar') n += Object.keys(x).filter(function (k) { return Object.keys(x[k]).some(function (c) { return x[k][c]; }); }).length; });
      return n;
    }
    function contar() {
      var n = respondidas(), tot = itens.length || 1;
      document.getElementById('cont').innerHTML = '<em>' + n + '</em> de ' + itens.length + ' respondidas';
      document.getElementById('barra').style.width = Math.min(100, n / tot * 100) + '%';
      var nav = document.getElementById('nav'); if (!nav.childNodes.length) nav.innerHTML = itens.map(function (x, i) { return '<button type="button" data-n="' + i + '">' + (i + 1) + '</button>'; }).join('');
      var r = ctl.respostas();
      itens.forEach(function (x, i) { var feito = x.matches('tr') ? x.querySelector('.tm-ops .on') : x.querySelector('.tm-cmp .on'); var b = nav.querySelector('[data-n="' + i + '"]'); if (b) b.classList.toggle('ok', !!feito); });
    }
    document.getElementById('mi').addEventListener('click', function () { setTimeout(contar, 0); });
    document.getElementById('nav').addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (b) itens[+b.getAttribute('data-n')].scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    document.getElementById('maior').addEventListener('click', function () { document.body.classList.toggle('grande'); });
    document.getElementById('ouvir').addEventListener('click', function () { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(est.instrucoes || t.nome); u.lang = 'pt-BR'; speechSynthesis.speak(u); } catch (e) {} });
    contar();
    // tempo: relógio (não pausa ao fechar o app)
    var tick = setInterval(function () {
      var resta = (fimTs - Date.now()) / 1000, p = Math.max(0, resta / tempo);
      var el = document.getElementById('tempo'); if (!el) { clearInterval(tick); return; }
      el.textContent = mmss(resta); var an = document.getElementById('anel'); an.style.setProperty('--p', p); an.style.setProperty('--cr', resta <= 60 ? '#ff7a6e' : resta <= tempo * 0.25 ? '#ffc861' : '#7fe0a2');
      document.getElementById('relo').classList.toggle('fim', resta <= 60);
      if (resta <= 60 && resta > 59) aviso('Falta 1 minuto');
      if (resta <= 0) { clearInterval(tick); terminar(true); }
    }, 500);
    function saiu() { if (document.hidden) saiuEm = new Date().toISOString(); else if (saiuEm) { saidas.push({ de: saiuEm, ate: new Date().toISOString() }); saiuEm = null; aviso('Você saiu do teste. Isso fica registrado.', 'erro'); } }
    document.addEventListener('visibilitychange', saiu);
    document.getElementById('fin').addEventListener('click', function () {
      var falta = itens.length - respondidas();
      janela('✓', 'Finalizar o teste?', (falta > 0 ? 'Ainda faltam <b>' + falta + '</b> questões. ' : '') + 'Depois de finalizar, não dá para voltar.', [['Continuar o teste', null], ['Finalizar', function () { terminar(false); }]]);
    });
    async function terminar(porTempo) {
      if (acabou) return; acabou = true; clearInterval(tick); document.removeEventListener('visibilitychange', saiu); emTeste = false;
      var tr = document.createElement('div'); tr.className = 'trava'; tr.textContent = porTempo ? '⏱ Tempo encerrado' : 'Salvando…'; document.body.appendChild(tr);
      var c = ctl.corrigir(), fim = new Date();
      var res = { uid: uid(), participacao_id: E.jovem.participacao_id, teste_id: t.id, versao: t.versao, respostas: ctl.respostas(), pontos: c.pontos, total: c.total, nota: c.nota,
        inicio: inicio.toISOString(), fim: fim.toISOString(), tempo_seg: Math.round((fim - inicio) / 1000), por_tempo: !!porTempo, saidas: saidas };
      await fila.por(res);
      var fl = (await kv.ler('feitosLocal')) || []; fl.push({ participacao_id: res.participacao_id, teste_id: res.teste_id, fim: res.fim, tablet: 'este tablet' }); await kv.gravar('feitosLocal', fl.slice(-500));
      enviar();
      setTimeout(function () { tr.remove(); document.body.classList.remove('pede-paisagem', 'grande'); try { screen.orientation.unlock(); } catch (e) {} telaConclusao(t, res, respondidas(), itens.length); }, porTempo ? 1600 : 400);
    }
  }

  // 6) Conclusão
  function telaConclusao(t, res, resp, tot) {
    var porT = res.por_tempo, conf = '';
    if (!porT) for (var i = 0; i < 26; i++) conf += '<i class="conf" style="left:' + (4 + Math.random() * 92) + '%;background:' + ['#ee7330', '#f4f1ef', '#ffb27f', '#3FA66B'][i % 4] + ';animation-delay:' + (1.2 + Math.random() * .8) + 's"></i>';
    app.innerHTML = '<div class="fim-t">' + conf + '<div class="an"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="70" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/><circle class="pg" cx="90" cy="90" r="70" fill="none" stroke="' + (porT ? '#ffc861' : '#ee7330') + '" stroke-width="8" stroke-linecap="round" transform="rotate(-90 90 90)"/>' +
      (porT ? '<g fill="none" stroke="#ffc861" stroke-width="7" stroke-linecap="round"><path class="mc" d="M90 52v40l24 14"/></g>' : '<path class="mc" d="M58 92l22 22 44-48" fill="none" stroke="#f4f1ef" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg></div>' +
      '<h1>' + (porT ? 'Tempo encerrado' : 'Teste concluído!') + '</h1><p>' + (porT ? 'O teste foi finalizado com o que você respondeu. ' : 'Parabéns, <b>' + esc(String(E.jovem.nome || '').split(' ')[0]) + '</b>! ') + 'Suas respostas foram salvas neste tablet e vão para a Classificação Final.</p>' +
      '<div class="chips"><div class="chip"><b>' + mmss(res.tempo_seg) + '</b><span>tempo usado</span></div><div class="chip"><b>' + resp + ' de ' + tot + '</b><span>respondidas</span></div></div>' +
      '<span class="est" id="est2" style="background:rgba(63,166,107,.2);color:#9fe9bc">' + (online() ? 'Enviando…' : 'Será enviado quando houver internet') + '</span>' +
      '<div class="bs"><button type="button" class="bpri" id="outro">Fazer outro teste</button><button type="button" class="bsec" id="sair2">Sair</button></div><div class="volta">Voltando para a entrada em 20 s<i></i></div></div>';
    var vt = setTimeout(telaEntrada, 22000);
    document.getElementById('outro').addEventListener('click', function () { clearTimeout(vt); telaTestes(); });
    document.getElementById('sair2').addEventListener('click', function () { clearTimeout(vt); telaEntrada(); });
    setTimeout(async function () { var n = (await fila.todos()).filter(function (x) { return x.uid === res.uid; }).length; var e = document.getElementById('est2'); if (e) e.textContent = n ? 'Será enviado quando houver internet' : '✓ Enviado para a Classificação Final'; }, 4000);
  }

  // 7) Modo avaliador (PIN)
  async function sha(t) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function pedirPIN() {
    var h = E.pacote && E.pacote.pin_hash;
    if (!h) { aviso('O PIN do avaliador ainda não foi definido em Configurações › Tablets.', 'erro'); return; }
    var c = cofre({ tam: 4, numeros: true, aoCompletar: async function (cod, ui) {
      ui.lendo();
      if ((await sha('cfpin:' + cod)) === h) { ui.ok('MODO AVALIADOR'); setTimeout(telaAvaliador, 700); } else ui.erro('PIN INCORRETO');
    } });
    app.innerHTML = '<div class="entrada"><h1>Modo avaliador</h1><p class="sub">Digite o PIN do avaliador.</p>' + c.html + '<p><button type="button" class="bsec" id="canc">Cancelar</button></p></div>';
    c.ligar(); document.getElementById('canc').addEventListener('click', telaEntrada);
  }
  async function telaAvaliador() {
    var n = (await fila.todos()).length, p = E.pacote || {}, hoje = hojeISO(), tb = p.tablet || {};
    var tur = (p.turmas || []).filter(function (t) { return (t.dias || []).some(function (d) { return d.data === hoje; }); });
    app.innerHTML = topo('Modo avaliador', (tb.nome || '') + ' · versão ' + VERSAO_APP) + '<div class="miolo"><div class="av-l">' +
      '<div class="lin" style="--c:' + (online() ? '#3FA66B' : '#e0a100') + '"><b>Internet</b>' + (online() ? 'conectado' : 'sem internet') + '</div>' +
      '<div class="lin" style="--c:' + (n ? '#e0a100' : '#3FA66B') + '"><b>Resultados aguardando envio</b>' + n + '</div>' +
      '<div class="lin" style="--c:#2f6fd0"><b>Testes no tablet</b>' + (p.testes || []).length + '</div>' +
      '<div class="lin" style="--c:#2f6fd0"><b>Turmas de hoje</b>' + (tur.length ? tur.map(function (t) { return esc(t.nome + ' · ' + t.empresa); }).join('<br>') : 'nenhuma') + '</div>' +
      '<div class="lin" style="--c:#8a8486"><b>Última atualização</b>' + (E.ultimaSinc ? new Date(E.ultimaSinc).toLocaleString('pt-BR') : '—') + '</div>' +
      '<div class="ini" style="gap:10px;flex-wrap:wrap"><button type="button" class="bsec" id="atu">⟳ Atualizar testes e turmas</button><button type="button" class="bsec" id="env">⬆ Enviar agora</button><button type="button" class="bpri" id="sairav">Voltar ao modo jovem</button></div>' +
      '<p style="text-align:center;color:var(--texto-3);font-size:12.5px">Os outros recursos do avaliador (liberar refazer, jovem sem cadastro, adicionar tempo…) chegam na próxima etapa.</p></div></div>';
    atualizarStatus();
    var volta = setTimeout(telaEntrada, 120000);
    document.getElementById('atu').addEventListener('click', async function () { await baixar(false); clearTimeout(volta); telaAvaliador(); });
    document.getElementById('env').addEventListener('click', async function () { if (!online()) { aviso('Sem internet agora.', 'erro'); return; } await enviar(); clearTimeout(volta); telaAvaliador(); aviso('Envio concluído.'); });
    document.getElementById('sairav').addEventListener('click', function () { clearTimeout(volta); telaEntrada(); });
  }

  /* ---------- Início ---------- */
  (async function () {
    if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    E.chave = await kv.ler('chave'); E.pacote = (await kv.ler('pacote')) || null; E.ultimaSinc = await kv.ler('ultimaSinc');
    if (!E.chave) { telaLigar(); return; }
    telaEntrada(); baixar(true).then(function (ok) { if (ok && !emTeste && !E.jovem) telaEntrada(); }); enviar();
  })();
})();
