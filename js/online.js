/* =====================================================================
   Classificação Final · online.js
   Quem está online: presença em tempo real da equipe interna
   (administradores e avaliadores), por um canal PRIVADO do Supabase.
   Mostra só nome, perfil, foto e se está ativo ou ausente.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, sb = window.CF.sb, esc = ui.esc;
  var CANAL = 'equipe-online', AUSENTE_APOS = 5 * 60 * 1000;
  var NOMES_PERFIL = { admin: 'Administrador', avaliador: 'Avaliador' };
  var CORES = ['#7a4b33', '#4a6b8a', '#5a7d4f', '#6b5a8a', '#8a5a4a', '#3f7a78', '#8a6a2f', '#5a5f8a'];

  var estado = { canal: null, perfil: null, disponivel: false, pessoas: [], meuEstado: 'ativo', timer: null, aberto: false };

  function cor(id) {
    var h = 0; String(id).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    return CORES[h % CORES.length];
  }

  function avatar(p, classe) {
    var el = document.createElement('span');
    el.className = classe;
    el.style.background = cor(p.id);
    el.textContent = ui.iniciais(p.nome);
    if (p.foto_path && window.CF.foto) {
      window.CF.foto.urlDe(p.foto_path).then(function (url) {
        if (!url) return;
        var img = new Image(); img.alt = '';
        img.onload = function () { el.textContent = ''; el.style.background = 'none'; el.appendChild(img); };
        img.src = url;
      });
    }
    return el;
  }

  // Junta o estado de presença: uma entrada por pessoa (a mais recente)
  function lerPresenca() {
    var st = estado.canal ? estado.canal.presenceState() : {};
    var lista = Object.keys(st).map(function (k) {
      var metas = st[k] || [];
      var ativo = metas.some(function (m) { return m.estado === 'ativo'; });
      var m = metas[metas.length - 1] || {};
      return { id: m.id || k, nome: m.nome || '', perfil: m.perfil, foto_path: m.foto_path || null, ativo: ativo };
    });
    var eu = estado.perfil && estado.perfil.id;
    lista.sort(function (a, b) {
      if (a.id === eu) return -1; if (b.id === eu) return 1;
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
    estado.pessoas = lista;
  }

  /* Desenha o indicador no topo:
     sem internet → aviso "Sem internet"; com presença → botão "N online"; senão → "Online" */
  function desenhar() {
    var area = document.getElementById('conexao');
    if (!area) return;
    if (!navigator.onLine) {
      estado.aberto = false;
      area.innerHTML = '<span class="pill pill-off">' + ui.icone('nuvemOff', 15) + 'Sem internet</span>';
      return;
    }
    var emp = estado.empresas || [];
    if ((!estado.disponivel || !estado.pessoas.length) && !emp.length) {
      area.innerHTML = '<span class="pill pill-ok" title="Online">' + ui.icone('nuvem', 15) + '<span class="txt-conexao">Online</span></span>';
      return;
    }
    var n = estado.pessoas.length + emp.length;
    area.innerHTML =
      '<div class="flutuante"><button type="button" class="online-btn" id="b-online" aria-haspopup="true" aria-expanded="' + estado.aberto + '" aria-label="' + n + ' pessoa(s) da equipe online">' +
        '<span class="ponto-online" aria-hidden="true"></span><span class="pilha"></span><span class="online-txt">' + n + ' online</span></button>' +
        '<div class="painel-online card' + (estado.aberto ? '' : ' oculto') + '" id="p-online" role="dialog" aria-label="Equipe online agora">' +
          '<h3>Equipe online agora · ' + estado.pessoas.length + '</h3><div class="lista-online"></div>' +
          (emp.length ? '<h3 class="h-emp">Empresas online · ' + emp.length + ' <small>(só administradores veem)</small></h3><div class="lista-online lista-emp"></div>' : '') + '</div></div>';
    var pilha = area.querySelector('.pilha');
    estado.pessoas.slice(0, 3).forEach(function (p) { pilha.appendChild(avatar(p, 'mini')); });
    var lista = area.querySelector('.lista-online');
    var eu = estado.perfil && estado.perfil.id;
    estado.pessoas.forEach(function (p) {
      var linha = document.createElement('div');
      linha.className = 'pessoa-online';
      var av = avatar(p, 'av');
      var marca = document.createElement('i');
      marca.className = p.ativo ? 'ativo' : 'ausente';
      marca.setAttribute('aria-hidden', 'true');
      var caixa = document.createElement('span'); caixa.className = 'av-caixa'; caixa.appendChild(av); caixa.appendChild(marca);
      var txt = document.createElement('div');
      txt.innerHTML = '<b>' + esc(p.nome) + (p.id === eu ? ' <span class="voce">(você)</span>' : '') + '</b>' +
        '<small>' + esc(NOMES_PERFIL[p.perfil] || '') + ' · ' + (p.ativo ? 'ativo' : 'ausente') + '</small>';
      linha.appendChild(caixa); linha.appendChild(txt);
      lista.appendChild(linha);
    });
    var listaE = area.querySelector('.lista-emp');
    emp.forEach(function (p) {
      var linha = document.createElement('div'); linha.className = 'pessoa-online';
      var caixa = document.createElement('span'); caixa.className = 'av-caixa'; caixa.appendChild(avatar(p, 'av'));
      var marca = document.createElement('i'); marca.className = 'ativo'; marca.setAttribute('aria-hidden', 'true'); caixa.appendChild(marca);
      var txt = document.createElement('div');
      txt.innerHTML = '<b>' + esc(p.nome) + '</b><small>Empresa' + (p.empresa ? ' · ' + esc(p.empresa) : '') + '</small>';
      linha.appendChild(caixa); linha.appendChild(txt); listaE.appendChild(linha);
    });
    var botao = area.querySelector('#b-online'), painel = area.querySelector('#p-online');
    botao.addEventListener('click', function (e) {
      e.stopPropagation();
      estado.aberto = painel.classList.contains('oculto');
      painel.classList.toggle('oculto', !estado.aberto);
      botao.setAttribute('aria-expanded', String(estado.aberto));
    });
    painel.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  document.addEventListener('click', function () {
    if (!estado.aberto) return;
    estado.aberto = false;
    var p = document.getElementById('p-online'), b = document.getElementById('b-online');
    if (p) p.classList.add('oculto'); if (b) b.setAttribute('aria-expanded', 'false');
  });

  function meusDados() {
    var p = estado.perfil;
    return { id: p.id, nome: p.nome || p.email, perfil: p.perfil, foto_path: p.foto_path || null, estado: estado.meuEstado };
  }
  function enviar() { if (estado.canal && estado.disponivel) estado.canal.track(meusDados()); }

  // Ativo × ausente: sem mexer por 5 minutos, ou com a aba escondida
  function marcarAtividade() {
    if (estado.meuEstado !== 'ativo') { estado.meuEstado = 'ativo'; enviar(); }
    clearTimeout(estado.timer);
    estado.timer = setTimeout(function () { estado.meuEstado = 'ausente'; enviar(); }, AUSENTE_APOS);
  }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (estado.canal) marcarAtividade(); }, { passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (!estado.canal) return;
    if (document.hidden) { estado.meuEstado = 'ausente'; enviar(); } else marcarAtividade();
  });

  // Empresas online (consulta a cada 30 s; só o administrador recebe a lista)
  async function lerEmpresas() {
    try {
      var r = await Promise.all([window.CF.dados.pessoas.empresasOnline(), estado.nomesEmp ? Promise.resolve(estado.nomesEmp) : window.CF.sb.rpc('empresas_nomes').then(function (x) { return x.data || []; })]);
      estado.nomesEmp = r[1];
      estado.empresas = (r[0] || []).map(function (p) { var e = r[1].filter(function (x) { return x.id === p.empresa_id; })[0]; return { id: p.id, nome: p.nome, perfil: 'empresa', foto_path: p.foto_path, empresa: e ? e.nome_fantasia : '' }; });
    } catch (e) { estado.empresas = []; }
    desenhar();
  }

  async function iniciar(perfil) {
    parar();
    estado.perfil = perfil;
    if (perfil && perfil.perfil === 'admin') { lerEmpresas(); estado.timerEmp = setInterval(lerEmpresas, 30000); }
    if (!perfil || (perfil.perfil !== 'admin' && perfil.perfil !== 'avaliador')) { desenhar(); return; }
    try {
      if (sb.realtime && sb.realtime.setAuth) await sb.realtime.setAuth();
      var canal = sb.channel(CANAL, { config: { private: true, presence: { key: perfil.id } } });
      estado.canal = canal;
      canal.on('presence', { event: 'sync' }, function () { lerPresenca(); desenhar(); });
      canal.subscribe(function (status) {
        if (status === 'SUBSCRIBED') { estado.disponivel = true; marcarAtividade(); enviar(); desenhar(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { estado.disponivel = false; desenhar(); }
      });
    } catch (e) {
      console.warn('Presença indisponível:', e);
      estado.disponivel = false;
    }
    desenhar();
  }

  function parar() {
    clearTimeout(estado.timer);
    if (estado.canal) { try { estado.canal.untrack(); sb.removeChannel(estado.canal); } catch (e) { /* ignora */ } }
    clearInterval(estado.timerEmp); estado.empresas = [];
    estado.canal = null; estado.disponivel = false; estado.pessoas = []; estado.aberto = false;
  }

  // Atualiza os próprios dados (ex.: trocou a foto ou o nome)
  function atualizarMeusDados(perfil) { estado.perfil = perfil; enviar(); }

  window.CF.online = { iniciar: iniciar, parar: parar, desenhar: desenhar, atualizarMeusDados: atualizarMeusDados };
})();
