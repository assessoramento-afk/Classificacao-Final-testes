/* =====================================================================
   Projeto Gol Testes · app.js  (T2)
   App dos tablets: ligação pelo código de 6 números, entrada pelo crachá,
   lista de testes, explicação, teste com tempo, conclusão e envio seguro
   dos resultados para a Classificação Final. Funciona sem internet.
   ===================================================================== */
(function () {
  'use strict';
  var VERSAO_APP = '1.9.0';
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

  /* ---------- Modo de testes (dados fictícios; nada é enviado) ---------- */
  var DEMO = {"gerado_em": "demo", "tablet": {"id": "demo", "nome": "MODO DE TESTES", "etiqueta": "dados fictícios"}, "pin_hash": "9aea0edb57b7c45b4bea33f8d027328456a22039999eaaa61bc4844bb04e6630", "turmas": [{"id": "tu-demo", "nome": "TURMA DE TESTE", "processo_id": "p-demo", "vaga": "Demonstração", "empresa": "Projeto Gol", "dias": [], "testes": ["t-conf", "t-cart"]}], "testes": [{"id": "t-conf", "nome": "Conferência de Mercadoria (exemplo)", "codigo": "DEMO1", "versao": 1, "estrutura": {"tempo_min": 5, "orientacao": "paisagem", "modo_nota": "pontos", "instrucoes": "Compare a Cópia com o Original e informe, em cada linha, quantos erros a cópia tem. Se não houver erro, marque \"–\".", "faixas": [{"min": 5, "nota": 5}, {"min": 4, "nota": 4}, {"min": 3, "nota": 3}, {"min": 2, "nota": 2}, {"min": 0, "nota": 1}], "explicacao": {"passos": [["Leia a linha do Original", "À esquerda está o produto como ele deve estar."], ["Compare com a Cópia", "Confira letra por letra e número por número."], ["Conte os erros da linha", "Toque em 1, 2, 3 ou 4. Se estiver igual, toque em –."]], "exemplo": "Original 224878 × Cópia 214878: 1 erro.", "dica": "Atenção a letras parecidas (coro × couro)."}, "partes": [{"tipo": "contar", "colunas": ["Artigo", "Tamanho", "Nº", "Entrega"], "linhas": [{"original": ["Camisa xadrez", "P-GG", "451203", "imediata"], "copia": ["Camisa xadrez", "P-GG", "451203", "imediata"], "gabarito": "-"}, {"original": ["Bota de couro", "35-40", "880214", "3 dias"], "copia": ["Bota de coro", "35-40", "880241", "3 dias"], "gabarito": "2"}, {"original": ["Jaqueta jeans", "M-G", "120987", "2 dias"], "copia": ["Jaqueta jeans", "M-G", "120987", "5 dias"], "gabarito": "1"}, {"original": ["Meia esportiva", "único", "300456", "imediata"], "copia": ["Meia esportiva", "único", "300456", "imediata"], "gabarito": "-"}, {"original": ["Boné aba reta", "único", "771100", "4 dias"], "copia": ["Boné aba curva", "58", "771100", "4 dias"], "gabarito": "2"}]}]}}, {"id": "t-cart", "nome": "Cartões de Crédito (exemplo)", "codigo": "DEMO2", "versao": 1, "estrutura": {"tempo_min": 5, "orientacao": "paisagem", "modo_nota": "percentual", "instrucoes": "Para cada cópia (2ª coluna), encontre o cartão original na 1ª coluna e marque X nos campos que estão diferentes.", "faixas": [{"min": 80, "nota": 5}, {"min": 60, "nota": 4}, {"min": 40, "nota": 3}, {"min": 20, "nota": 2}, {"min": 0, "nota": 1}], "partes": [{"tipo": "marcar", "blocos": [{"original": {"banco": "CAIXA", "bandeira": "ELO", "numero": "6362 9700 0000 1122", "nome": "ANA SOUZA", "validade": "03/30", "agencia": "0456", "cvv": "789"}, "copia": {"banco": "CAIXA", "bandeira": "ELO", "numero": "6362 9700 0000 1122", "nome": "ANA SOUSA", "validade": "03/31", "agencia": "0456", "cvv": "789"}, "orig": 3}, {"original": {"banco": "NUBANK", "bandeira": "MASTERCARD", "numero": "5432 1098 7654 3210", "nome": "MARIA DA SILVA", "validade": "08/29", "agencia": "0001", "cvv": "123"}, "copia": {"banco": "NUBANK", "bandeira": "MASTERCARD", "numero": "5432 1098 7654 3201", "nome": "MARIA DA SILVA", "validade": "08/29", "agencia": "0001", "cvv": "132"}, "orig": 1}, {"original": {"banco": "ITAÚ", "bandeira": "VISA", "numero": "4111 2222 3333 4444", "nome": "JOÃO PEREIRA", "validade": "11/27", "agencia": "1234", "cvv": "456"}, "copia": {"banco": "ITAÚ", "bandeira": "VISA", "numero": "4111 2222 3333 4444", "nome": "JOÃO PEREIRA", "validade": "11/27", "agencia": "1234", "cvv": "456"}, "orig": 2}]}]}}], "jovens": [{"codigo": "TEST-01", "participacao_id": "demo-1", "nome": "JOVEM DE TESTE UM", "turma_id": "tu-demo"}, {"codigo": "TEST-02", "participacao_id": "demo-2", "nome": "JOVEM DE TESTE DOIS", "turma_id": "tu-demo"}], "feitos": []};

  /* ---------- Estado ---------- */
  var E = { chave: null, pacote: null, jovem: null, ultimaSinc: null, enviando: false, baixando: false, demo: false, demoFeitos: [] };
  function online() { return navigator.onLine !== false; }
  function aviso(txt, tipo) { var d = document.createElement('div'); d.textContent = txt; if (tipo) d.className = tipo; document.getElementById('avisos').appendChild(d); setTimeout(function () { d.remove(); }, 3600); }
  function uid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 10); }
  function normCod(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
  function hora(iso) { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  // primeiro nome com só a inicial maiúscula (MARIA DA SILVA → Maria)
  function primeiroNome(n) { var p = String(n || '').trim().split(/\s+/)[0] || ''; return p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1).toLocaleLowerCase('pt-BR'); }
  function saudacao() { var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // sem copiar e colar em nenhum teste
  ['copy', 'cut', 'paste', 'drop', 'contextmenu'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'paste' || ev === 'drop') aviso('🚫 Neste teste não é permitido colar.', 'erro'); }); });

  /* ---------- Sincronização ---------- */
  async function baixar(silencioso) {
    if (E.demo || !E.chave || E.baixando || !online()) return false;
    E.baixando = true;
    try {
      var p = await rpc('tablet_baixar', { p_chave: E.chave, p_versao_app: VERSAO_APP });
      E.pacote = p; E.ultimaSinc = new Date().toISOString();
      if (p && p.gerado_em) { E.desvio = Date.parse(p.gerado_em) - Date.now(); try { localStorage.setItem('golt_desvio', String(E.desvio)); } catch (e) {} }
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
    if (E.demo || !E.chave || E.enviando || !online()) return;
    var evs = confLer('golt_eventos');
    if (evs.length) { try { var re = await rpc('tablet_eventos', { p_chave: E.chave, p_lista: evs.slice(0, 50) }); var rr = re.recebidos || []; confGravar('golt_eventos', confLer('golt_eventos').filter(function (x) { return rr.indexOf(x.uid) < 0; })); } catch (e) {} }
    var fts = confLer('golt_fotos_fila');
    if (fts.length) { try { var rf = await rpc('tablet_foto_enviar', { p_chave: E.chave, p_lista: fts.slice(0, 3) }); var rr2 = rf.recebidos || []; confGravar('golt_fotos_fila', confLer('golt_fotos_fila').filter(function (x) { return rr2.indexOf(x.uid) < 0; })); } catch (e) {} }
    var cfs = confLer('golt_conf_fila');
    if (cfs.length) { try { var rc = await rpc('tablet_conferir', { p_chave: E.chave, p_lista: cfs.slice(0, 50) }); var rec = rc.recebidos || []; confGravar('golt_conf_fila', confLer('golt_conf_fila').filter(function (x) { return rec.indexOf(x.uid) < 0; })); } catch (e) { /* tenta de novo depois */ } }
    var lista = await fila.todos(); if (!lista.length) { atualizarStatus(); return; }
    E.enviando = true;
    try {
      atualizarStatus();
      var r = await rpc('tablet_enviar', { p_chave: E.chave, p_lista: lista.slice(0, 20), p_pendentes: Math.max(0, lista.length - 20), p_versao_app: VERSAO_APP });
      if (r.servidor_em) { E.desvio = Date.parse(r.servidor_em) - Date.now(); try { localStorage.setItem('golt_desvio', String(E.desvio)); } catch (e2) {} }
      var envs = confLer('golt_enviados');
      for (var i = 0; i < (r.recebidos || []).length; i++) { var it = lista.filter(function (x) { return x.uid === r.recebidos[i]; })[0]; if (it) envs.push({ uid: it.uid, nome: it.jovem_nome || '', teste: it.teste_nome || '', em: new Date().toISOString() }); await fila.tirar(r.recebidos[i]); }
      confGravar('golt_enviados', envs.slice(-30)); E.erroEnvio = null;
    } catch (e) { E.erroEnvio = new Date().toISOString(); /* tenta de novo depois */ }
    finally { E.enviando = false; atualizarStatus(); }
  }
  setInterval(function () { enviar(); }, 30000);
  setInterval(function () { if (!emTeste) baixar(true); }, 5 * 60000);
  window.addEventListener('online', function () { enviar(); baixar(true); atualizarStatus(); });
  window.addEventListener('offline', atualizarStatus);
  /* ---------- Bateria (Chrome/Android) ---------- */
  var BAT = null; try { if (navigator.getBattery) navigator.getBattery().then(function (b) { BAT = b; ['levelchange', 'chargingchange'].forEach(function (ev) { b.addEventListener(ev, mostrarBateria); }); mostrarBateria(); }); } catch (e) {}
  function bateriaBaixa() { return !!(BAT && !BAT.charging && BAT.level < 0.2); }
  function bateriaTxt() { return BAT ? Math.round(BAT.level * 100) + '%' + (BAT.charging ? ' · carregando' : '') : 'não informado'; }
  function mostrarBateria() { var el = document.getElementById('bat'); if (!el) return; var baixa = bateriaBaixa(); el.hidden = !baixa; if (baixa) el.textContent = '🔋 ' + Math.round(BAT.level * 100) + '% · carregue o tablet'; }
  async function atualizarStatus() {
    mostrarBateria();
    var el = document.getElementById('st'); if (!el) return;
    if (E.demo) { el.className = 'pil av'; el.textContent = 'MODO DE TESTES · nada é enviado'; return; }
    var n = (await fila.todos()).length;
    el.className = 'pil ' + (!online() ? 'av' : n ? 'av' : 'ok');
    el.textContent = !online() ? 'Sem internet' + (n ? ' · ' + n + ' pendente' + (n > 1 ? 's' : '') : '') : E.enviando && n ? '⟳ Sincronizando · ' + n : (n ? (E.erroEnvio ? '⚠ Erro no envio · ' : '⏳ ') + n + ' pendente' + (n > 1 ? 's' : '') : 'Tudo enviado');
  }

  /* ---------- Feitos (no banco + neste tablet) ---------- */
  async function feitos(pid) {
    var f = {};
    if (E.demo) { E.demoFeitos.forEach(function (x) { if (x.participacao_id === pid) f[x.teste_id] = x; }); return f; }
    ((E.pacote && E.pacote.feitos) || []).forEach(function (x) { if (x.participacao_id === pid) f[x.teste_id] = x; });
    (await fila.todos()).forEach(function (x) { if (x.participacao_id === pid) f[x.teste_id] = { fim: x.fim, tablet: 'este tablet' }; });
    ((await kv.ler('feitosLocal')) || []).forEach(function (x) { if (x.participacao_id === pid && !f[x.teste_id]) f[x.teste_id] = x; });
    return f;
  }

  /* ---------- Telas ---------- */
  function topo(titulo, sub, dir) {
    return '<div class="topo"><img src="' + LOGO + '" alt="" id="logo"><div><b>' + esc(titulo) + '</b>' + (sub ? '<br><small>' + esc(sub) + '</small>' : '') + '</div><div class="dir">' + (dir || '') + '<span class="pil er" id="bat" hidden></span><span class="pil" id="st">…</span></div></div>';
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
    var h = '<div class="cofre"><div class="lt" id="lt">' + SVG_LEITOR + '<div class="letr" id="letr">' + (opts.rotulo || (opts.numeros ? 'DIGITE O CÓDIGO' : 'DIGITE SEU CÓDIGO')) + '</div></div><div class="painel"><div class="cod" id="cod"></div>' +
      (opts.numeros ? '<div class="kb so-num" id="kb">' + teclas.map(function (t) { return '<button type="button" data-t="' + t + '" class="num">' + t + '</button>'; }).join('') + '<button type="button" class="ap" data-t="⌫" aria-label="Apagar">⌫</button></div>'
        : '<div class="kb qw" id="kb">' + ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(function (l, li) {   // teclado QWERTY, números em cima
            return '<div class="kr">' + l.split('').map(function (t) { return '<button type="button" data-t="' + t + '"' + (/\d/.test(t) ? ' class="num"' : '') + '>' + t + '</button>'; }).join('') + (li === 3 ? '<button type="button" class="ap" data-t="⌫" aria-label="Apagar">⌫<span class="ap-t"> Apagar</span></button>' : '') + '</div>';
          }).join('') + '</div>') + '</div></div>';
    function desenha() {
      var c = document.getElementById('cod'); if (!c) return; var s = '';
      for (var i = 0; i < opts.tam; i++) { if (opts.formato && i === 4) s += '<i>-</i>'; var ch = cod[i]; s += '<span class="' + (ch ? 'f' + (/\d/.test(ch) ? ' n' : '') : '') + '">' + (ch || '•') + '</span>'; }
      c.innerHTML = s; c.classList.remove('erro');
      var pr = document.querySelector('.prog-c'); if (pr) pr.style.strokeDashoffset = 389.6 * (1 - cod.length / opts.tam);
    }
    function estado(cls, txt) { var lt = document.getElementById('lt'); lt.className = 'lt ' + (cls || ''); document.getElementById('letr').textContent = txt; }
    var ui = {
      erro: function (txt) { estado('erro', txt || 'ACESSO NEGADO'); document.getElementById('cod').classList.add('erro'); setTimeout(function () { cod = ''; ocupado = false; desenha(); estado('', opts.rotulo || (opts.numeros ? 'DIGITE O CÓDIGO' : 'DIGITE SEU CÓDIGO')); }, 1800); },
      ok: function (txt) { estado('ok', txt || 'ACESSO LIBERADO'); },
      lendo: function () { estado('lendo', 'VERIFICANDO…'); },
      aviso: function (txt) { estado('aviso', txt); setTimeout(function () { if (!ocupado) estado('', opts.rotulo || (opts.numeros ? 'DIGITE O CÓDIGO' : 'DIGITE SEU CÓDIGO')); }, 1800); },
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

  // 1) Ligar o tablet: QR Code do pedido (o administrador lê no celular e libera) ou código de 6 números
  async function infoAparelho() {
    var ua = navigator.userAgent, ap = '', so = '', nav = '';
    var m = ua.match(/Android ([\d.]+);\s*([^;)]+)/); if (m) { so = 'Android ' + m[1]; ap = m[2].replace(/Build.*/, '').trim(); }
    else if (/iPad|iPhone/.test(ua)) { ap = /iPad/.test(ua) ? 'iPad' : 'iPhone'; var v = ua.match(/OS (\d+)_/); so = 'iOS ' + (v ? v[1] : ''); }
    else { so = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''; ap = 'Computador'; }
    try { if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) { var h = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion']); if (h.model) ap = h.model; } } catch (e) {}
    var c = ua.match(/(Chrome|CriOS|Firefox|Edg|SamsungBrowser)\/([\d]+)/); nav = c ? ({ CriOS: 'Chrome', Edg: 'Edge', SamsungBrowser: 'Samsung Internet' }[c[1]] || c[1]) + ' ' + c[2] : 'Navegador';
    return { aparelho: (ap || 'Aparelho').slice(0, 120), sistema: so, navegador: nav };
  }
  var pollPedido = null;
  async function telaLigar(msg) {
    clearInterval(pollPedido);
    var seg = await kv.ler('pedidoSegredo');
    if (!seg) { var b = new Uint8Array(24); crypto.getRandomValues(b); seg = [].map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); await kv.gravar('pedidoSegredo', seg); }
    app.innerHTML = '<div class="entrada" style="background:var(--fundo)"><h1>Ligar este tablet</h1><p class="sub">' + esc(msg || '') + '</p><div id="ped" class="bx" style="text-align:center;min-width:min(420px,100%)"><div class="girando"></div><p>Preparando o pedido…</p></div>' +
      '<p style="margin-top:14px;color:var(--texto-3);font-size:13px">Sem celular por perto? <button type="button" class="bsec" id="usar-cod" style="padding:7px 12px;margin-left:6px">Usar o código de 6 números</button></p></div>';
    document.getElementById('usar-cod').addEventListener('click', function () { clearInterval(pollPedido); telaCodigo(); });
    var box = document.getElementById('ped');
    if (!online()) { box.innerHTML = '<p><b>Sem internet.</b><br>Para ligar o tablet é preciso internet (Wi-Fi, roteador 4G ou o celular).</p><button type="button" class="bpri" id="tenta">Tentar de novo</button>'; document.getElementById('tenta').addEventListener('click', function () { telaLigar(msg); }); return; }
    try {
      var inf = await infoAparelho();
      var r = await rpc('tablet_pedir', { p_segredo: seg, p_aparelho: inf.aparelho, p_sistema: inf.sistema, p_navegador: inf.navegador });
      if (r.situacao === 'rejeitado') { await kv.apagar('pedidoSegredo'); box.innerHTML = '<p><b>O pedido deste tablet foi rejeitado.</b></p><button type="button" class="bpri" id="denovo">Fazer um novo pedido</button>'; document.getElementById('denovo').addEventListener('click', function () { telaLigar(); }); return; }
      var qr = ''; try { var q = window.qrcode(0, 'M'); q.addData('GOLT-PEDIDO:' + r.codigo); q.make(); qr = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); } catch (e) {}
      box.innerHTML = '<p style="margin:0 0 10px">Peça a um administrador para ler este QR Code na Classificação Final › Configurações › Tablets › <b>Ler QR do tablet</b>.</p>' +
        '<div style="display:inline-block;background:#fff;padding:10px;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,.12);width:min(240px,60vw)">' + qr.replace('<svg ', '<svg style="width:100%;height:auto;display:block" ') + '</div>' +
        '<div style="font:800 22px ui-monospace,monospace;letter-spacing:.2em;color:var(--laranja);margin:10px 0 4px">PEDIDO ' + r.codigo.slice(0, 3) + '-' + r.codigo.slice(3) + '</div>' +
        '<div style="display:inline-flex;gap:8px;margin-top:6px;padding:7px 14px;border-radius:999px;background:#fff4dc;color:#8a6200;font-weight:700;font-size:13px" id="ped-st">⏳ Aguardando liberação…</div>' +
        '<p style="margin:10px 0 0;font-size:12.5px;color:var(--texto-3)">' + esc(inf.aparelho + ' · ' + inf.sistema + ' · ' + inf.navegador) + '</p>';
      pollPedido = setInterval(async function () {
        if (!online()) return;
        try {
          var s = await rpc('tablet_pedido_status', { p_segredo: seg });
          if (s.situacao === 'liberado' && s.chave) {
            clearInterval(pollPedido); E.chave = s.chave; await kv.gravar('chave', s.chave); await kv.gravar('tablet', s.tablet); await kv.apagar('pedidoSegredo');
            var st = document.getElementById('ped-st'); if (st) { st.style.background = 'rgba(63,166,107,.2)'; st.style.color = '#1f6b40'; st.textContent = '✓ Tablet liberado: ' + ((s.tablet && s.tablet.nome) || ''); }
            await baixar(true); setTimeout(telaEntrada, 1200);
          } else if (s.situacao === 'rejeitado') { clearInterval(pollPedido); telaLigar(); }
          else if (s.situacao === 'inexistente') { clearInterval(pollPedido); await kv.apagar('pedidoSegredo'); telaLigar(); }
        } catch (e) {}
      }, 4000);
    } catch (e) { box.innerHTML = '<p><b>Não foi possível criar o pedido.</b><br>' + esc(e.message) + '</p><button type="button" class="bpri" id="tenta">Tentar de novo</button>'; document.getElementById('tenta').addEventListener('click', function () { telaLigar(msg); }); }
  }
  function telaCodigo(msg) {
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
    app.innerHTML = '<div class="entrada" style="background:var(--fundo)"><h1>Ligar este tablet</h1><p class="sub">' + esc(msg || 'Na Classificação Final, abra Configurações › Tablets, toque em "Novo código" e digite aqui os 6 números.') + '</p>' + c.html + '<p><button type="button" class="bsec" id="usar-qr">Voltar para o QR Code</button></p></div>';
    c.ligar(); document.getElementById('usar-qr').addEventListener('click', function () { telaLigar(); });
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
        ui.ok(); E.jovem = j; setTimeout(function () { (precisaConferir(j) ? telaConferir : telaTestes)(); }, 900);
      }, 900);
    } });
    app.innerHTML = topo('Projeto Gol Testes', (tb.nome || 'Tablet') + (tb.etiqueta ? ' · ' + tb.etiqueta : '')) +
      '<div class="entrada"><h1>Olá! Digite o código do seu crachá</h1><p class="sub">' + (E.demo ? '<b style="color:#a54c12">MODO DE TESTES · use TEST-01 ou TEST-02</b>' : 'São 6 caracteres, como no exemplo K7O1-08. Toque nas letras e nos números.') + '</p>' + c.html +
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

  // 2b) Conferência no 1º acesso (Q2): o jovem só confere nome, empresa e turma; não edita nada
  function confLer(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function confGravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function precisaConferir(j) { return !E.demo && !j.conferido && confLer('golt_conf_feitos').indexOf(j.participacao_id) < 0; }
  function telaConferir() {
    var j = E.jovem, tu = ((E.pacote && E.pacote.turmas) || []).filter(function (t) { return t.id === j.turma_id; })[0] || {};
    var dia = (tu.dias || [])[0] ? new Date(tu.dias[0].data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    app.innerHTML = topo('Projeto Gol Testes', j.nome) + '<div class="cdados"><h1>Olá! Confira seus dados</h1><p class="sub">É só uma vez. Se algo estiver errado, avise o avaliador.</p>' +
      '<div class="conf-c"><div><small>NOME</small><b>' + esc(j.nome) + '</b></div><div><small>EMPRESA</small><b>' + esc(tu.empresa || '—') + '</b></div><div><small>TURMA</small><b>' + esc((tu.nome || '') + (dia ? ' · ' + dia : '')) + '</b></div></div>' +
      '<div class="conf-b"><button type="button" class="bpri" id="cf-ok">✓ Sou eu, está tudo certo</button><button type="button" class="bsec" id="cf-erro">Tem algo errado</button></div>' +
      '<div class="conf-p" id="cf-p" hidden><b>O que está errado?</b><div class="conf-ch">' + [['nome', 'Nome'], ['empresa', 'Empresa'], ['turma', 'Turma'], ['outro', 'Outro']].map(function (x) { return '<button type="button" data-cc="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><p>O pedido vai para a equipe. Você pode fazer os testes normalmente.</p><button type="button" class="bpri" id="cf-env" disabled>Enviar e continuar</button></div></div>';
    function registrar(ok, campos) {
      var fila2 = confLer('golt_conf_fila'); fila2.push({ uid: 'cf-' + j.participacao_id + '-' + Date.now().toString(36), participacao_id: j.participacao_id, ok: ok, campos: campos || [], em: new Date().toISOString() }); confGravar('golt_conf_fila', fila2);
      var fe = confLer('golt_conf_feitos'); fe.push(j.participacao_id); confGravar('golt_conf_feitos', fe);
      enviar(); telaTestes();
    }
    document.getElementById('cf-ok').addEventListener('click', function () { registrar(true); });
    document.getElementById('cf-erro').addEventListener('click', function () { document.getElementById('cf-p').hidden = false; this.disabled = true; });
    var sel = [];
    app.querySelectorAll('[data-cc]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-cc'), i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else sel.push(k); b.classList.toggle('on', i < 0); document.getElementById('cf-env').disabled = !sel.length; }); });
    document.getElementById('cf-env').addEventListener('click', function () { registrar(false, sel.slice()); aviso('Pedido de correção registrado. Avise o avaliador.', 'ok'); });
  }

  // 3) Lista de testes do jovem
  async function telaTestes() {
    var j = E.jovem, tu = ((E.pacote && E.pacote.turmas) || []).filter(function (t) { return t.id === j.turma_id; })[0] || {};
    var ids = tu.testes || [], f = await feitos(j.participacao_id);
    var ts = ids.map(function (id) { return ((E.pacote && E.pacote.testes) || []).filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    app.innerHTML = topo('Projeto Gol Testes', j.nome + ' · ' + (tu.nome || ''), '<button type="button" class="bsec" id="sair" style="padding:7px 14px">Sair</button>') +
      '<div class="miolo"><div class="lista"><h1>' + saudacao() + ', ' + esc(primeiroNome(j.nome)) + '!</h1><p class="sub">Escolha o teste que o avaliador indicar.</p><div class="tsts">' +
      (ts.length ? ts.map(function (t, i) {
        var est = t.estrutura || {}, ft = f[t.id];
        return '<div class="tst' + (ft ? ' feito' : '') + '" style="--c:' + (ft ? '#3FA66B' : '#ee7330') + '"><b>' + esc(t.nome) + '</b><small>⏱ ' + (est.tempo_min || '?') + ' minutos' + (est.orientacao === 'paisagem' ? ' · tela deitada' : '') + '</small>' +
          (ft ? '<small>' + (ft.fim ? 'feito às ' + hora(ft.fim) : 'feito') + (ft.tablet ? ' · ' + esc(ft.tablet) : '') + '</small><span class="ja">✓ JÁ PREENCHIDO</span><button type="button" class="bsec bref" data-ref="' + t.id + '">🔒 Liberar refazer</button>' : '<button type="button" class="bpri" data-t="' + t.id + '">Abrir</button>') + '</div>';
      }).join('') : '<div class="bx">Nenhum teste no tablet para esta turma. Chame o avaliador.</div>') + '</div></div></div>';
    atualizarStatus();
    document.getElementById('sair').addEventListener('click', telaEntrada);
    app.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { telaExplicacao(ts.filter(function (x) { return x.id === b.getAttribute('data-t'); })[0]); }); });
    app.querySelectorAll('[data-ref]').forEach(function (b) { b.addEventListener('click', function () { liberarRefazer(ts.filter(function (x) { return x.id === b.getAttribute('data-ref'); })[0]); }); });
  }
  // Refazer só com o PIN do avaliador e justificativa; o resultado anterior fica guardado como "substituído"
  function liberarRefazer(t) {
    var jv = E.jovem;
    identificar('Liberar refazer', telaTestes, function () {
      app.innerHTML = topo('Liberar refazer', jv.nome) + '<div class="cdados"><h1>Por que refazer?</h1><p class="sub">' + esc(t.nome) + ' · o resultado anterior fica guardado.' + (E.avaliador ? ' Autorizado por ' + esc(E.avaliador.nome) + '.' : '') + '</p>' +
        '<textarea id="rf-mot" class="rf-mot" rows="4" maxlength="300" placeholder="Ex.: o tablet desligou no meio do teste"></textarea><div class="conf-b" style="margin-top:12px"><button type="button" class="bpri" id="rf-ok" disabled>Liberar e abrir o teste</button><button type="button" class="bsec" id="rf-canc">Cancelar</button></div></div>';
      var m = document.getElementById('rf-mot'), okb = document.getElementById('rf-ok');
      m.addEventListener('input', function () { okb.disabled = m.value.trim().length < 5; }); m.focus();
      document.getElementById('rf-canc').addEventListener('click', telaTestes);
      okb.addEventListener('click', function () { E.refazer = { teste: t.id, motivo: m.value.trim(), por: E.avaliador ? E.avaliador.id : null }; evento('refazer', jv.nome + ' · ' + t.nome + ' · ' + m.value.trim()); telaExplicacao(t); });
    });
  }


  // 4) Explicação + Iniciar
  function paisagem(est) { return est.orientacao ? est.orientacao === 'paisagem' : (est.partes || []).some(function (p) { return p.tipo === 'contar' || p.tipo === 'marcar'; }); }
  function telaExplicacao(t) {
    var est = t.estrutura || {}, exp = est.explicacao || {};
    var passos = exp.passos && exp.passos.length ? exp.passos : [['Leia as instruções', est.instrucoes || 'Leia com atenção antes de começar.'], ['Responda', 'Toque nas respostas. Você pode voltar e mudar enquanto houver tempo.'], ['Finalize', 'Quando terminar, toque em "Finalizar teste". Se o tempo acabar, o teste termina sozinho.']];
    app.innerHTML = topo(t.nome, E.jovem.nome) + '<div class="miolo"><div class="saud"><span class="oi">👋</span><div><h1>' + saudacao() + ', ' + esc(primeiroNome(E.jovem.nome)) + '!</h1><p>Você vai fazer o teste <b>' + esc(t.nome) + '</b>. Leia as orientações com calma e toque em <b>Iniciar teste</b> quando for autorizado pela equipe Kolping. Boa sorte!</p></div></div><div class="exp"><div class="bx"><h3>📘 Como fazer este teste</h3>' +
      passos.map(function (p, i) { return '<div class="passo"><b>' + (i + 1) + '</b><div><strong>' + esc(p[0]) + '</strong><p style="margin:4px 0 0">' + esc(p[1]) + '</p></div></div>'; }).join('') +
      '<div class="info"><span>⏱ ' + (est.tempo_min || '?') + ' minutos</span>' + (paisagem(est) ? '<span>🔄 tela deitada</span>' : '') + '</div></div>' +
      '<div>' + (exp.exemplo ? '<div class="bx" style="background:linear-gradient(160deg,#231f1f,#3a2a20);color:#f4f1ef"><h3>Exemplo</h3><p>' + esc(exp.exemplo) + '</p></div>' : '') +
      (est.instrucoes ? '<div class="bx" style="margin-top:12px"><h3>Instruções</h3><p>' + esc(est.instrucoes) + '</p></div>' : '') + '</div></div>' +
      '<div class="ini"><button type="button" class="bsec" id="volt" style="margin-right:10px">Voltar</button><button type="button" class="bpri" id="ini">Iniciar teste</button></div></div>';
    atualizarStatus();
    document.getElementById('volt').addEventListener('click', telaTestes);
    document.getElementById('ini').addEventListener('click', function () {
      janela('⏱', 'Começar agora?', 'O tempo de ' + mmss((est.tempo_min || 10) * 60) + ' começa a contar.' + (bateriaBaixa() ? '<br><b style="color:#c0392b">🔋 Bateria em ' + Math.round(BAT.level * 100) + '%. Ligue o tablet na tomada antes de começar.</b>' : ''), [['Voltar', null], ['Começar', function () { telaTeste(t); }]]);
    });
  }
  function janela(ic, tit, txt, bts) {
    var f = document.createElement('div'); f.className = 'fundoj';
    f.innerHTML = '<div class="jan" role="dialog" aria-modal="true"><div class="ji">' + ic + '</div><h2>' + esc(tit) + '</h2><p>' + txt + '</p><div class="bs">' + bts.map(function (b, i) { return '<button type="button" class="' + (i === bts.length - 1 ? 'bpri' : 'bsec') + '" data-i="' + i + '">' + esc(b[0]) + '</button>'; }).join('') + '</div></div>';
    document.body.appendChild(f);
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; f.remove(); var a = bts[+b.getAttribute('data-i')][1]; if (a) a(); });
  }

  /* ---------- Proteções durante o teste: tela cheia, tela acesa e botão voltar ---------- */
  var protecoes = (function () {
    var trava = null, ativo = false;
    function tela() { try { if (ativo && navigator.wakeLock && !trava) navigator.wakeLock.request('screen').then(function (w) { trava = w; w.addEventListener('release', function () { trava = null; }); }).catch(function () {}); } catch (e) {} }
    function cheia() { try { var d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).catch(function () {}); } catch (e) {} }
    function voltar() { if (!ativo) return; history.pushState({ teste: 1 }, ''); if (!document.querySelector('.fundoj')) janela('🔒', 'O teste está em andamento', 'Para sair, toque em <b>Finalizar teste</b>.', [['Continuar o teste', null]]); }
    function fechar(e) { if (ativo) { e.preventDefault(); e.returnValue = ''; } }
    window.addEventListener('popstate', voltar);
    window.addEventListener('beforeunload', fechar);
    return {
      ligar: function () { ativo = true; cheia(); tela(); history.pushState({ teste: 1 }, ''); },
      tela: tela,
      desligar: function () { ativo = false; try { if (trava) trava.release(); } catch (e) {} trava = null; try { if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); } catch (e) {} }
    };
  })();
  // retomar um teste que foi interrompido (app fechado, tablet reiniciado, bateria acabou)
  async function retomarAndamento() {
    var a = null; try { a = await kv.ler('andamento'); } catch (e) {}
    if (!a || !!a.demo !== !!E.demo) return false;
    var t = ((E.pacote && E.pacote.testes) || []).filter(function (x) { return x.id === a.teste_id; })[0];
    if (!t || !a.jovem) { await kv.apagar('andamento'); return false; }
    E.jovem = a.jovem; telaTeste(t, a); return true;
  }

  // 5) Teste com tempo
  function telaTeste(t, ret) {   // ret = teste interrompido que está sendo retomado
    var est = t.estrutura || {}, tempo = (est.tempo_min || 10) * 60, inicio = ret ? new Date(ret.inicio) : new Date(), fimTs = ret ? ret.fimTs : inicio.getTime() + tempo * 1000, acabou = false, saidas = ret ? (ret.saidas || []) : [], saiuEm = null;
    if (ret && ret.salvoEm) saidas.push({ de: ret.salvoEm, ate: new Date().toISOString(), motivo: 'app fechado' });
    protecoes.ligar();
    emTeste = true; if (paisagem(est)) { document.body.classList.add('pede-paisagem'); try { screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} }
    app.innerHTML = topo(t.nome, E.jovem.nome, '<div class="relo" id="relo"><span class="anel" id="anel"></span><span class="tempo" id="tempo">' + mmss(tempo) + '</span></div>') + '<div class="prog"><i id="barra"></i></div>' +
      '<div class="instr"><span class="tx">' + esc(est.instrucoes || 'Responda e toque em "Finalizar teste" quando terminar.') + '</span><button type="button" class="ib" id="ouvir">🔊 Ouvir</button><button type="button" class="ib" id="maior">A+ Letra maior</button></div>' +
      '<div class="miolo" id="mi"></div><div class="rodape"><span class="cont" id="cont"></span><div class="nav" id="nav"></div><button type="button" class="bpri" id="fin">✓ Finalizar teste</button></div>' +
      '<div class="girar"><svg viewBox="0 0 64 64"><rect x="18" y="8" width="28" height="48" rx="5"/><path d="M28 50h8"/></svg><b style="font-size:20px">Gire o tablet para a horizontal</b><span style="color:#cfc7c7">Este teste é feito com a tela deitada. O tempo continua contando.</span></div>';
    var ctl = M.desenhar(document.getElementById('mi'), est); atualizarStatus();
    if (est.calculadora) calculadora();
    if (ret) { ctl.restaurar(ret.resp); aviso('Teste retomado de onde parou. O tempo continuou contando.'); }
    function guardar() { if (acabou) return; kv.gravar('andamento', { demo: E.demo, jovem: E.jovem, teste_id: t.id, versao: t.versao, inicio: inicio.toISOString(), fimTs: fimTs, saidas: saidas, resp: ctl.respostas(), salvoEm: new Date().toISOString() }).catch(function () {}); }
    guardar(); var guarda = setInterval(guardar, 15000);
    var itens = [].slice.call(app.querySelectorAll('#mi tr[data-l], #mi .tm-bloco, #mi [data-item]'));
    function respondidas() {
      var r = ctl.respostas(), n = 0;
      (est.partes || []).forEach(function (p, i) { var x = r[i] || {}; if (p.tipo === 'contar' || p.tipo === 'escolha') n += Object.keys(x).length; else if (['tabela', 'memoria', 'ordem', 'agrupar', 'fotos', 'varias', 'grade', 'aberta'].indexOf(p.tipo) >= 0) n += document.querySelectorAll('#mi [data-parte="' + i + '"] [data-item].feito').length; else if (p.tipo === 'marcar') n += Object.keys(x).filter(function (k) { return Object.keys(x[k]).some(function (c) { return x[k][c]; }); }).length; });
      return n;
    }
    function contar() {
      var n = respondidas(), tot = itens.length || 1;
      document.getElementById('cont').innerHTML = '<em>' + n + '</em> de ' + itens.length + ' respondidas';
      document.getElementById('barra').style.width = Math.min(100, n / tot * 100) + '%';
      var nav = document.getElementById('nav'); if (!nav.childNodes.length) nav.innerHTML = itens.map(function (x, i) { return '<button type="button" data-n="' + i + '">' + (i + 1) + '</button>'; }).join('');
      var r = ctl.respostas();
      itens.forEach(function (x, i) { var feito = x.hasAttribute('data-item') ? x.classList.contains('feito') : x.matches('tr') ? x.querySelector('.tm-ops .on') : x.querySelector('.tm-cmp .on'); var b = nav.querySelector('[data-n="' + i + '"]'); if (b) b.classList.toggle('ok', !!feito); });
    }
    document.getElementById('mi').addEventListener('click', function () { setTimeout(function () { contar(); guardar(); }, 0); });
    var tDig = null; document.getElementById('mi').addEventListener('input', function () { clearTimeout(tDig); tDig = setTimeout(function () { contar(); guardar(); }, 250); });
    document.getElementById('nav').addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (b) (function (it) { var sec = it.closest('.tm-parte'); if (sec && sec.hidden) { var ab = document.querySelector('.tm-aba[data-aba="' + sec.getAttribute('data-parte') + '"]'); if (ab) ab.click(); } return it; })(itens[+b.getAttribute('data-n')]).scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    document.getElementById('maior').addEventListener('click', function () { document.body.classList.toggle('grande'); });
    document.getElementById('ouvir').addEventListener('click', function () { try { speechSynthesis.cancel(); var qe = document.querySelector('#mi .tm-q.atual') || document.querySelector('#mi .tm-q:not(.feito)'); var txt = qe ? qe.innerText.replace(/\n+/g, '. ') : (est.instrucoes || t.nome); var u = new SpeechSynthesisUtterance(txt); u.lang = 'pt-BR'; speechSynthesis.speak(u); } catch (e) {} });
    contar();
    // tempo: relógio (não pausa ao fechar o app)
    var tick = setInterval(function () {
      var resta = (fimTs - Date.now()) / 1000, p = Math.max(0, resta / tempo);
      var el = document.getElementById('tempo'); if (!el) { clearInterval(tick); return; }
      el.textContent = mmss(resta); var an = document.getElementById('anel'); an.style.setProperty('--p', p); an.style.setProperty('--cr', resta <= 60 ? '#ff7a6e' : resta <= tempo * 0.25 ? '#ffc861' : '#7fe0a2');
      document.getElementById('relo').classList.toggle('fim', resta <= 60);
      if (resta <= 60 && resta > 59) aviso('Falta 1 minuto');
      if ((est.tempo_min || 10) > 15 && resta <= 300 && resta > 299) aviso('Faltam 5 minutos');
      if (resta <= 0) { clearInterval(tick); terminar(true); }
    }, 500);
    function saiu() { if (document.hidden) saiuEm = new Date().toISOString(); else if (saiuEm) { saidas.push({ de: saiuEm, ate: new Date().toISOString() }); saiuEm = null; guardar(); protecoes.tela(); aviso('Você saiu do teste. Isso fica registrado.', 'erro'); } }
    document.addEventListener('visibilitychange', saiu);
    document.getElementById('fin').addEventListener('click', function () {
      var falta = itens.length - respondidas();
      janela('✓', 'Finalizar o teste?', (falta > 0 ? 'Ainda faltam <b>' + falta + '</b> questões. ' : '') + 'Depois de finalizar, não dá para voltar.', [['Continuar o teste', null], ['Finalizar', function () { terminar(false); }]]);
    });
    async function terminar(porTempo) {
      if (acabou) return; acabou = true; clearInterval(tick); clearInterval(guarda); document.removeEventListener('visibilitychange', saiu); emTeste = false; protecoes.desligar();
      var tr = document.createElement('div'); tr.className = 'trava'; tr.textContent = porTempo ? '⏱ Tempo encerrado' : 'Salvando…'; document.body.appendChild(tr);
      var c = ctl.corrigir(), fim = new Date();
      var res = { uid: uid(), participacao_id: E.jovem.participacao_id, teste_id: t.id, versao: t.versao, respostas: ctl.respostas(), pontos: c.pontos, total: c.total, nota: c.nota,
        inicio: inicio.toISOString(), fim: fim.toISOString(), tempo_seg: Math.round((fim - inicio) / 1000), por_tempo: !!porTempo, saidas: saidas,
        desvio_ms: E.desvio == null ? null : Math.round(E.desvio), jovem_nome: E.jovem.nome, teste_nome: t.nome, refazer_motivo: E.refazer && E.refazer.teste === t.id ? E.refazer.motivo : null, autorizado_por: E.refazer && E.refazer.teste === t.id ? E.refazer.por : null };
      if (E.refazer && E.refazer.teste === t.id) E.refazer = null;
      if (E.demo) { E.demoFeitos.push({ participacao_id: res.participacao_id, teste_id: res.teste_id, fim: res.fim, tablet: 'modo de testes', nota: res.nota, pontos: res.pontos, total: res.total }); }
      else {
        await fila.por(res);
        var fl = (await kv.ler('feitosLocal')) || []; fl.push({ participacao_id: res.participacao_id, teste_id: res.teste_id, fim: res.fim, tablet: 'este tablet' }); await kv.gravar('feitosLocal', fl.slice(-500));
        enviar();
      }
      await kv.apagar('andamento');
      setTimeout(function () { tr.remove(); document.body.classList.remove('pede-paisagem', 'grande'); try { screen.orientation.unlock(); } catch (e) {} telaConclusao(t, res, respondidas(), itens.length); }, porTempo ? 1600 : 400);
    }
  }

  // Calculadora do teste (Recebimento, Administrativo): o resultado não pode ser colado, o jovem digita
  function calculadora() {
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'calc-b'; bt.innerHTML = '🧮 Calculadora';
    var c = document.createElement('div'); c.className = 'calc'; c.hidden = true;
    var T = [['C', 'C', 'fn'], ['⌫', '⌫', 'fn'], ['%', '%', 'fn'], ['/', '÷', 'op'], ['7', '7'], ['8', '8'], ['9', '9'], ['*', '×', 'op'], ['4', '4'], ['5', '5'], ['6', '6'], ['-', '−', 'op'], ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'op'], ['0', '0', 'zero'], [',', ','], ['=', '=', 'ig']];
    c.innerHTML = '<header><b>⠿ Calculadora · arraste</b><button type="button" class="calc-x" aria-label="Fechar">×</button></header><div class="vis"><small class="cx-e"> </small><span class="cx-v">0</span></div><div class="teclas">' +
      T.map(function (k) { return '<button type="button" data-k="' + k[0] + '" class="' + (k[2] || '') + '">' + k[1] + '</button>'; }).join('') + '</div>';
    app.appendChild(bt); app.appendChild(c);
    var ex = '';
    function mostra(v) { c.querySelector('.cx-v').textContent = v; }
    function bonito(x) { return x.replace(/\*/g, '×').replace(/\//g, '÷').replace(/\./g, ','); }
    bt.addEventListener('click', function () { c.hidden = false; bt.hidden = true; });
    c.querySelector('.calc-x').addEventListener('click', function () { c.hidden = true; bt.hidden = false; });
    c.querySelector('.teclas').addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return; var k = b.getAttribute('data-k');
      if (k === 'C') { ex = ''; c.querySelector('.cx-e').textContent = ' '; mostra('0'); return; }
      if (k === '⌫') { ex = ex.slice(0, -1); mostra(bonito(ex) || '0'); return; }
      if (k === '=') { try { if (!/^[\d.+\-*/%() ]+$/.test(ex)) throw 0; var r = Function('return (' + ex.replace(/%/g, '/100') + ')')(); if (!isFinite(r)) throw 0; c.querySelector('.cx-e').textContent = bonito(ex) + ' ='; r = Math.round(r * 100) / 100; ex = String(r); mostra(r.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); } catch (er) { mostra('Erro'); ex = ''; } return; }
      ex += (k === ',' ? '.' : k); mostra(bonito(ex));
    });
    var h = c.querySelector('header'), ox, oy, arr = false;
    h.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; arr = true; var r = c.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top; c.style.right = 'auto'; c.style.bottom = 'auto'; c.style.left = r.left + 'px'; c.style.top = r.top + 'px'; h.setPointerCapture(e.pointerId); });
    h.addEventListener('pointermove', function (e) { if (!arr) return; c.style.left = Math.max(0, Math.min(innerWidth - c.offsetWidth, e.clientX - ox)) + 'px'; c.style.top = Math.max(0, Math.min(innerHeight - c.offsetHeight, e.clientY - oy)) + 'px'; });
    h.addEventListener('pointerup', function () { arr = false; });
  }

  // 6) Conclusão
  // 6b) Tempo encerrado: tom acolhedor, mostra quanto foi respondido e pede para aguardar a equipe
  function telaTempoEncerrado(t, res, resp, tot) {
    var fr = tot ? Math.min(1, resp / tot) : 0, nome = primeiroNome(E.jovem && E.jovem.nome);
    app.innerHTML = '<div class="fim-t te">' +
      '<div class="an"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="70" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="10"/>' +
        '<circle class="pg te-pg" cx="90" cy="90" r="70" fill="none" stroke="#ffc861" stroke-width="10" stroke-linecap="round" transform="rotate(-90 90 90)" style="--alvo:' + (440 * (1 - fr)).toFixed(1) + '"/>' +
        '<g class="te-rel"><circle cx="90" cy="90" r="36" fill="rgba(255,200,97,.1)" stroke="#ffc861" stroke-width="3"/><path class="te-pt" d="M90 90V66" stroke="#ffc861" stroke-width="5" stroke-linecap="round"/><path d="M90 90l14 9" stroke="#ffc861" stroke-width="5" stroke-linecap="round"/><circle cx="90" cy="90" r="4" fill="#ffc861"/></g></svg></div>' +
      '<h1>O tempo acabou' + (nome ? ', ' + esc(nome) : '') + '!</h1>' +
      '<p>Não se preocupe: <b>tudo o que você respondeu foi salvo</b>. ' + (E.demo ? 'Modo de testes: as respostas não são enviadas.' : 'O resultado vai para a Classificação Final.') + '</p>' +
      '<div class="chips"><div class="chip"><b>' + resp + ' de ' + tot + '</b><span>respondidas</span><i class="te-bar"><i style="width:' + Math.round(fr * 100) + '%"></i></i></div><div class="chip"><b>' + mmss(res.tempo_seg) + '</b><span>tempo do teste</span></div></div>' +
      '<div class="te-av">🙋 Fique no seu lugar e <b>aguarde a orientação da equipe Kolping</b>.</div>' +
      '<span class="est" id="est2" style="background:rgba(63,166,107,.2);color:#9fe9bc">' + (E.demo ? '' : online() ? 'Enviando…' : 'Será enviado quando houver internet') + '</span>' +
      '<div class="bs"><button type="button" class="bsec" id="sair2">Sair</button><button type="button" class="bpri" id="outro">Fazer outro teste</button></div><div class="volta">Voltando para a entrada em 20 s<i></i></div></div>';
    var vt = setTimeout(telaEntrada, 22000);
    document.getElementById('outro').addEventListener('click', function () { clearTimeout(vt); telaTestes(); });
    document.getElementById('sair2').addEventListener('click', function () { clearTimeout(vt); telaEntrada(); });
    var e0 = document.getElementById('est2');
    if (E.demo) { e0.textContent = 'Modo de testes · nota ' + res.nota + ' (' + res.pontos + ' de ' + res.total + ' pontos) · nada foi enviado'; e0.style.background = '#fff4dc'; e0.style.color = '#8a6200'; return; }
    setTimeout(async function () { var n = (await fila.todos()).filter(function (x) { return x.uid === res.uid; }).length; var e = document.getElementById('est2'); if (e) e.textContent = n ? 'Será enviado quando houver internet' : '✓ Enviado para a Classificação Final'; }, 4000);
  }
  function telaConclusao(t, res, resp, tot) {
    var porT = res.por_tempo, conf = '';
    if (porT) { telaTempoEncerrado(t, res, resp, tot); return; }
    if (!porT) for (var i = 0; i < 26; i++) conf += '<i class="conf" style="left:' + (4 + Math.random() * 92) + '%;background:' + ['#ee7330', '#f4f1ef', '#ffb27f', '#3FA66B'][i % 4] + ';animation-delay:' + (1.2 + Math.random() * .8) + 's"></i>';
    app.innerHTML = '<div class="fim-t">' + conf + '<div class="an"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="70" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/><circle class="pg" cx="90" cy="90" r="70" fill="none" stroke="' + (porT ? '#ffc861' : '#ee7330') + '" stroke-width="8" stroke-linecap="round" transform="rotate(-90 90 90)"/>' +
      (porT ? '<g fill="none" stroke="#ffc861" stroke-width="7" stroke-linecap="round"><path class="mc" d="M90 52v40l24 14"/></g>' : '<path class="mc" d="M58 92l22 22 44-48" fill="none" stroke="#f4f1ef" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg></div>' +
      '<h1>' + (porT ? 'Tempo encerrado' : 'Teste concluído!') + '</h1><p>' + (porT ? 'O teste foi finalizado com o que você respondeu. ' : 'Parabéns, <b>' + esc(primeiroNome(E.jovem.nome)) + '</b>! ') + (E.demo ? 'Modo de testes: as respostas não são enviadas.' : 'Suas respostas foram salvas neste tablet e vão para a Classificação Final.') + '</p>' +
      '<div class="chips"><div class="chip"><b>' + mmss(res.tempo_seg) + '</b><span>tempo usado</span></div><div class="chip"><b>' + resp + ' de ' + tot + '</b><span>respondidas</span></div></div>' +
      '<span class="est" id="est2" style="background:rgba(63,166,107,.2);color:#9fe9bc">' + (online() ? 'Enviando…' : 'Será enviado quando houver internet') + '</span>' +
      '<div class="bs"><button type="button" class="bpri" id="outro">Fazer outro teste</button><button type="button" class="bsec" id="sair2">Sair</button></div><div class="volta">Voltando para a entrada em 20 s<i></i></div></div>';
    var vt = setTimeout(telaEntrada, 22000);
    document.getElementById('outro').addEventListener('click', function () { clearTimeout(vt); telaTestes(); });
    document.getElementById('sair2').addEventListener('click', function () { clearTimeout(vt); telaEntrada(); });
    if (E.demo) { var e0 = document.getElementById('est2'); if (e0) { e0.textContent = 'Modo de testes · nota ' + res.nota + ' (' + res.pontos + ' de ' + res.total + ' pontos) · nada foi enviado'; e0.style.background = '#fff4dc'; e0.style.color = '#8a6200'; } return; }
    setTimeout(async function () { var n = (await fila.todos()).filter(function (x) { return x.uid === res.uid; }).length; var e = document.getElementById('est2'); if (e) e.textContent = n ? 'Será enviado quando houver internet' : '✓ Enviado para a Classificação Final'; }, 4000);
  }

  // 7) Modo avaliador (PIN)
  async function sha(t) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  async function pbkdf2(pin, salt, iter) {
    var k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    var b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: iter }, k, 256);
    return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function evento(acao, detalhe) { var l = confLer('golt_eventos'); l.push({ uid: 'ev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), acao: acao, detalhe: detalhe || '', avaliador: E.avaliador ? E.avaliador.id : null, em: new Date().toISOString() }); confGravar('golt_eventos', l.slice(-200)); }
  // Q4 · Quem está usando? + PIN próprio (6 números). 5 erros = bloqueado 15 min neste tablet.
  function identificar(titulo, voltar, aoOk) {
    var p = E.pacote || {}, avs = (p.avaliadores || []), comPin = avs.filter(function (a) { return a.hash; });
    if (!comPin.length) {   // transição: enquanto ninguém criou o PIN próprio, vale o PIN geral
      var h = p.pin_geral_valido === false ? null : p.pin_hash;
      if (!h) { aviso('Nenhum avaliador criou o PIN ainda (Classificação Final › Minha conta › PIN do tablet).', 'erro'); return; }
      var c0 = cofre({ tam: 4, numeros: true, rotulo: 'DIGITE O PIN', aoCompletar: async function (cod, ui) { ui.lendo(); if ((await sha('cfpin:' + cod)) === h) { E.avaliador = null; ui.ok('AUTORIZADO'); setTimeout(aoOk, 600); } else ui.erro('PIN INCORRETO'); } });
      app.innerHTML = '<div class="entrada"><h1>' + esc(titulo) + '</h1><p class="sub">Digite o PIN do avaliador.</p>' + c0.html + '<p><button type="button" class="bsec" id="canc">Cancelar</button></p></div>';
      c0.ligar(); document.getElementById('canc').addEventListener('click', voltar); return;
    }
    function falhas() { try { return JSON.parse(localStorage.getItem('golt_pin_falhas') || '{}'); } catch (e) { return {}; } }
    app.innerHTML = '<div class="entrada"><h1>' + esc(titulo) + '</h1><p class="sub">Quem está usando? Toque no seu nome.</p><div class="avs">' +
      avs.map(function (a) { var ini = String(a.nome || '?').split(/\s+/).map(function (x) { return x[0]; }).slice(0, 2).join(''); return '<button type="button" class="av-b"' + (a.hash ? ' data-av="' + a.id + '"' : ' disabled') + '><i>' + esc(ini) + '</i><span>' + esc(a.nome) + '<small>' + (a.hash ? 'PIN cadastrado' : 'sem PIN ainda') + '</small></span></button>'; }).join('') +
      '</div><p><button type="button" class="bsec" id="canc">Cancelar</button></p></div>';
    document.getElementById('canc').addEventListener('click', voltar);
    app.querySelectorAll('[data-av]').forEach(function (b) { b.addEventListener('click', function () {
      var a = avs.filter(function (x) { return x.id === b.getAttribute('data-av'); })[0], f = falhas()[a.id] || { n: 0, ate: 0 };
      if (f.ate > Date.now()) { aviso('PIN bloqueado neste tablet até ' + hora(new Date(f.ate).toISOString()) + ' (5 tentativas erradas).', 'erro'); return; }
      var c = cofre({ tam: 6, numeros: true, rotulo: 'PIN DE ' + String(a.nome).split(' ')[0].toUpperCase(), aoCompletar: async function (cod, ui) {
        ui.lendo();
        var ok = (await pbkdf2(cod, a.salt, a.iter || 150000)) === a.hash, fs = falhas(), x = fs[a.id] || { n: 0, ate: 0 };
        if (ok) { delete fs[a.id]; localStorage.setItem('golt_pin_falhas', JSON.stringify(fs)); E.avaliador = { id: a.id, nome: a.nome }; ui.ok('OLÁ, ' + String(a.nome).split(' ')[0].toUpperCase()); setTimeout(aoOk, 600); return; }
        x.n++; if (x.n >= 5) { x.ate = Date.now() + 15 * 60000; x.n = 0; E.avaliador = { id: a.id }; evento('pin_bloqueado', a.nome + ' · 5 tentativas erradas'); E.avaliador = null; }
        fs[a.id] = x; localStorage.setItem('golt_pin_falhas', JSON.stringify(fs));
        ui.erro(x.ate > Date.now() ? 'BLOQUEADO 15 MIN' : 'PIN INCORRETO · RESTAM ' + (5 - x.n));
        if (x.ate > Date.now()) setTimeout(voltar, 1500);
      } });
      app.innerHTML = '<div class="entrada"><h1>' + esc(titulo) + '</h1><p class="sub">' + esc(a.nome) + ' · digite o seu PIN de 6 números.</p>' + c.html + '<p><button type="button" class="bsec" id="canc">Voltar</button></p></div>';
      c.ligar(); document.getElementById('canc').addEventListener('click', function () { identificar(titulo, voltar, aoOk); });
    }); });
  }
  function pedirPIN() { identificar('Modo avaliador', telaEntrada, function () { evento('modo_avaliador', 'entrou no modo avaliador'); telaAvaliador(); }); }
  // Q4 · Foto do jovem (vai para aprovação na Classificação Final)
  function telaFotos() {
    var p = E.pacote || {}, hoje = hojeISO(), tur = (p.turmas || []).filter(function (t) { return (t.dias || []).some(function (d) { return d.data === hoje; }); }).map(function (t) { return t.id; });
    var js = (p.jovens || []).filter(function (j) { return tur.indexOf(j.turma_id) >= 0; }), tiradas = confLer('golt_fotos_feitas');
    app.innerHTML = topo('Fotos dos jovens', (E.avaliador ? E.avaliador.nome : '') + ' · turmas de hoje') + '<div class="miolo"><div class="fts">' +
      (js.length ? js.map(function (j) { return '<button type="button" class="ft-j" data-fj="' + j.participacao_id + '"><b>' + esc(j.nome) + '</b><small>' + (tiradas.indexOf(j.participacao_id) >= 0 ? '✓ foto enviada para aprovação' : 'sem foto nova') + '</small></button>'; }).join('') : '<div class="bx">Nenhum jovem nas turmas de hoje.</div>') +
      '</div><div class="ini"><button type="button" class="bsec" id="ft-volta">Voltar</button></div></div>';
    document.getElementById('ft-volta').addEventListener('click', telaAvaliador);
    app.querySelectorAll('[data-fj]').forEach(function (b) { b.addEventListener('click', function () { camera(js.filter(function (j) { return j.participacao_id === b.getAttribute('data-fj'); })[0]); }); });
  }
  async function camera(j) {
    var modo = 'user', fluxo = null;
    app.innerHTML = topo('Foto', j.nome) + '<div class="cdados"><h1>' + esc(j.nome) + '</h1><p class="sub">Centralize o rosto no contorno.</p><div class="cam"><video id="cam-v" autoplay playsinline muted></video><canvas id="cam-c" hidden></canvas><div class="cam-o"></div></div>' +
      '<div class="cam-b"><button type="button" class="bsec" id="cam-tr">Trocar câmera</button><button type="button" class="bpri" id="cam-ok">📷 Tirar foto</button></div><p><button type="button" class="bsec" id="cam-x">Cancelar</button></p></div>';
    var v = document.getElementById('cam-v');
    async function abrir() { try { if (fluxo) fluxo.getTracks().forEach(function (t) { t.stop(); }); fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: modo, width: { ideal: 960 } }, audio: false }); v.srcObject = fluxo; } catch (e) { aviso('Não foi possível abrir a câmera. Permita o uso da câmera para este app.', 'erro'); } }
    function parar() { if (fluxo) fluxo.getTracks().forEach(function (t) { t.stop(); }); }
    await abrir();
    document.getElementById('cam-tr').addEventListener('click', function () { modo = modo === 'user' ? 'environment' : 'user'; abrir(); });
    document.getElementById('cam-x').addEventListener('click', function () { parar(); telaFotos(); });
    document.getElementById('cam-ok').addEventListener('click', function () {
      var c = document.getElementById('cam-c'), w = v.videoWidth, h = v.videoHeight; if (!w) return;
      var cw = Math.min(w, h * 0.8), ch = cw / 0.8; c.width = 480; c.height = 600;
      c.getContext('2d').drawImage(v, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, 480, 600);
      var dados = c.toDataURL('image/jpeg', 0.72).split(',')[1]; parar();
      app.querySelector('.cam').innerHTML = '<img src="data:image/jpeg;base64,' + dados + '" alt="">';
      app.querySelector('.cam-b').innerHTML = '<button type="button" class="bsec" id="cam-de">Tirar de novo</button><button type="button" class="bpri" id="cam-usa">✓ Usar esta foto</button>';
      document.getElementById('cam-de').addEventListener('click', function () { camera(j); });
      document.getElementById('cam-usa').addEventListener('click', function () {
        var f = confLer('golt_fotos_fila'); f.push({ uid: 'ft-' + Date.now().toString(36), participacao_id: j.participacao_id, avaliador: E.avaliador ? E.avaliador.id : null, imagem: dados, em: new Date().toISOString() }); confGravar('golt_fotos_fila', f.slice(-40));
        var ft = confLer('golt_fotos_feitas'); ft.push(j.participacao_id); confGravar('golt_fotos_feitas', ft.slice(-300));
        aviso('Foto guardada. Ela vai para aprovação na Classificação Final.'); enviar(); telaFotos();
      });
    });
  }
  function listaEnvios(pend) {
    var st = E.enviando ? ['⟳ Sincronizando', 'sinc'] : E.erroEnvio && online() ? ['⚠ Erro · tenta de novo sozinho', 'erro'] : ['⏳ Pendente' + (online() ? '' : ' (sem internet)'), 'pend'];
    var h = pend.map(function (x) { return '<div class="env-r"><span>' + esc((x.jovem_nome || 'Jovem') + ' · ' + (x.teste_nome || 'teste')) + '</span><i class="' + st[1] + '">' + st[0] + '</i></div>'; }).join('') +
      confLer('golt_enviados').slice(-8).reverse().map(function (x) { return '<div class="env-r"><span>' + esc((x.nome || 'Jovem') + ' · ' + (x.teste || 'teste')) + '</span><i class="ok">✓ Sincronizado</i></div>'; }).join('');
    return h || '<div class="env-r"><span>Nenhum envio ainda.</span></div>';
  }
  async function telaAvaliador() {
    var n = (await fila.todos()).length, p = E.pacote || {}, hoje = hojeISO(), tb = p.tablet || {};
    var tur = (p.turmas || []).filter(function (t) { return (t.dias || []).some(function (d) { return d.data === hoje; }); });
    app.innerHTML = topo('Modo avaliador', (tb.nome || '') + ' · versão ' + VERSAO_APP) + '<div class="miolo"><div class="av-l">' +
      '<div class="lin" style="--c:' + (online() ? '#3FA66B' : '#e0a100') + '"><b>Internet</b>' + (online() ? 'conectado' : 'sem internet') + '</div>' +
      '<div class="lin" style="--c:' + (n ? '#e0a100' : '#3FA66B') + '"><b>Resultados aguardando envio</b>' + n + '</div>' +
      '<div class="lin" style="--c:' + (bateriaBaixa() ? '#c0392b' : '#3FA66B') + '"><b>Bateria</b>' + bateriaTxt() + '</div>' +
      '<div class="lin" style="--c:#2f6fd0"><b>Testes no tablet</b>' + (p.testes || []).length + '</div>' +
      '<div class="lin" style="--c:#2f6fd0"><b>Turmas de hoje</b>' + (tur.length ? tur.map(function (t) { return esc(t.nome + ' · ' + t.empresa); }).join('<br>') : 'nenhuma') + '</div>' +
      '<div class="lin" style="--c:#8a8486"><b>Última atualização</b>' + (E.ultimaSinc ? new Date(E.ultimaSinc).toLocaleString('pt-BR') : '—') + '</div>' +
      '<div class="envs"><b>Envios deste tablet</b>' + listaEnvios(await fila.todos()) + '</div>' +
      '<div class="ini" style="gap:10px;flex-wrap:wrap"><button type="button" class="bpri" id="fotos">📷 Fotos dos jovens</button><button type="button" class="bsec" id="atu">⟳ Atualizar testes e turmas</button><button type="button" class="bsec" id="env">⬆ Enviar agora</button><button type="button" class="bpri" id="sairav">Voltar ao modo jovem</button></div>' +
      '<p style="text-align:center;color:var(--texto-3);font-size:12.5px">' + (E.avaliador ? 'Você entrou como ' + esc(E.avaliador.nome) + '.' : '') + ' Liberar refazer: na lista de testes do jovem, em "🔒 Liberar refazer".</p></div></div>';
    atualizarStatus();
    var volta = setTimeout(telaEntrada, 120000);
    document.getElementById('fotos').addEventListener('click', function () { clearTimeout(volta); telaFotos(); });
    document.getElementById('atu').addEventListener('click', async function () { await baixar(false); clearTimeout(volta); telaAvaliador(); });
    document.getElementById('env').addEventListener('click', async function () { if (!online()) { aviso('Sem internet agora.', 'erro'); return; } await enviar(); clearTimeout(volta); telaAvaliador(); aviso('Envio concluído.'); });
    document.getElementById('sairav').addEventListener('click', function () { clearTimeout(volta); telaEntrada(); });
  }

  /* ---------- Início ---------- */
  (async function () {
    if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    if (/[?&]teste\b/.test(location.search)) {
      var lig = false; try { lig = await rpc('tablet_modo_testes_ler', {}); } catch (e) {}
      if (lig === true) { E.demo = true; E.chave = 'demo'; E.pacote = DEMO; if (!(await retomarAndamento())) { telaEntrada(); aviso('Modo de testes: use TEST-01 ou TEST-02. PIN do avaliador: 1234.'); } return; }
      app.innerHTML = '<div class="entrada"><h1>Modo de testes desligado</h1><p class="sub">O modo de testes do app está desligado em Configurações › Tablets' + (online() ? '' : ' (ou o aparelho está sem internet)') + '.</p></div>'; return;
    }
    try { var dv = localStorage.getItem('golt_desvio'); if (dv != null && dv !== '') E.desvio = +dv; } catch (e) {}
    E.chave = await kv.ler('chave'); E.pacote = (await kv.ler('pacote')) || null; E.ultimaSinc = await kv.ler('ultimaSinc');
    if (!E.chave) { telaLigar(); return; }
    if (!(await retomarAndamento())) telaEntrada();
    baixar(true).then(function (ok) { if (ok && !emTeste && !E.jovem) telaEntrada(); }); enviar();
  })();
})();
