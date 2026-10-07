/* =====================================================================
   Classificação Final · avisos.js
   Aviso luminoso de NOVO CADASTRO para o administrador, em qualquer tela,
   em tempo real, e o número de pendências no item "Cadastros" do menu.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, sb = window.CF.sb, dados = window.CF.dados, esc = ui.esc;
  var CHAVE_DISPENSADOS = 'cf_avisos_dispensados';
  var estado = { canal: null, perfil: null, pendentes: [] };

  function dispensados() { try { return JSON.parse(sessionStorage.getItem(CHAVE_DISPENSADOS) || '[]'); } catch (e) { return []; } }
  function dispensar(id) { var d = dispensados(); if (d.indexOf(id) < 0) d.push(id); try { sessionStorage.setItem(CHAVE_DISPENSADOS, JSON.stringify(d)); } catch (e) { /* ignora */ } }

  function marcarCorpo() { var a = document.getElementById('avisos-cadastro'); document.body.classList.toggle('com-avisos', !!(a && a.children.length)); }
  if (window.MutationObserver) new MutationObserver(marcarCorpo).observe(document.body, { childList: true, subtree: false });
  function area() {
    var a = document.getElementById('avisos-cadastro');
    if (!a) { a = document.createElement('div'); a.id = 'avisos-cadastro'; a.className = 'avisos-cadastro'; a.setAttribute('aria-live', 'polite'); document.body.appendChild(a); }
    return a;
  }

  // Número no item "Cadastros" do menu
  function atualizarBadge() {
    var link = document.querySelector('.menu a[data-rota="cadastros"]');
    if (!link) return;
    var b = link.querySelector('.badge-menu');
    var n = estado.pendentes.length;
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'badge-menu'; link.appendChild(b); }
    b.textContent = n; b.setAttribute('aria-label', n + ' cadastro(s) aguardando aprovação');
  }

  function quando(t) {
    if (!t) return '';
    var s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 90) return 'agora';
    if (s < 3600) return 'há ' + Math.round(s / 60) + ' min';
    return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function mostrar(p) {
    if (!p || p.aprovado || p.ativo === false) return;
    if (dispensados().indexOf(p.id) >= 0) return;
    var box = area();
    if (box.querySelector('[data-aviso="' + p.id + '"]')) return;
    var c = document.createElement('section');
    c.className = 'aviso-cadastro';
    c.setAttribute('data-aviso', p.id);
    c.setAttribute('role', 'alert');
    c.innerHTML = '<div class="ac-tit">' + ui.icone('pessoa', 16) + 'Novo cadastro aguardando aprovação</div>' +
      '<div class="ac-pessoa"><span class="avatar">' + esc(ui.iniciais(p.nome || p.email)) + '</span><div><b>' + esc(p.nome || '(sem nome)') + '</b><small>' + esc(p.email) + ' · ' + esc(quando(p.criado_em)) + '</small></div></div>' +
      '<div class="ac-botoes"><button type="button" class="btn btn-p" data-a="depois">Depois</button><button type="button" class="btn btn-p" data-a="ver">Ver cadastro</button><button type="button" class="btn btn-pri btn-p" data-a="aprovar">Aprovar</button></div>';
    c.querySelector('[data-a=depois]').addEventListener('click', function () { dispensar(p.id); c.remove(); });
    c.querySelector('[data-a=ver]').addEventListener('click', function () { dispensar(p.id); c.remove(); window.location.hash = '#/cadastros/avaliadores'; });
    c.querySelector('[data-a=aprovar]').addEventListener('click', function () { aprovar(p, c); });
    box.appendChild(c);
    new MutationObserver(marcarCorpo).observe(box, { childList: true });
    marcarCorpo();
    // limita a 3 avisos na tela
    var todos = box.querySelectorAll('.aviso-cadastro');
    if (todos.length > 3) todos[0].remove();
  }

  async function aprovar(p, card) {
    var empresas = [];
    try { empresas = (await dados.empresas.listar()).filter(function (e) { return e.ativa; }); } catch (e) { /* sem empresas */ }
    var j = ui.janela({
      titulo: 'Aprovar ' + (p.nome || p.email), confirmarDescarte: false,
      corpo: '<p style="margin:0;color:var(--texto-2)">' + esc(p.email) + '</p>' +
        '<label class="campo" for="aq-perfil"><span>Perfil</span><select class="entrada" id="aq-perfil"><option value="avaliador">Avaliador</option><option value="admin">Administrador</option>' + (empresas.length ? '<option value="empresa">Empresa</option>' : '') + '</select></label>' +
        '<label class="campo oculto" for="aq-emp" id="aq-emp-box"><span>Empresa</span><select class="entrada" id="aq-emp"><option value="">Escolha a empresa…</option>' +
          empresas.map(function (e) { return '<option value="' + e.id + '">' + esc(e.nome_fantasia) + '</option>'; }).join('') + '</select></label>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Aprovar acesso', principal: true, aoClicar: async function (f) {
        var perfil = f.querySelector('#aq-perfil').value, emp = f.querySelector('#aq-emp').value || null;
        if (perfil === 'empresa' && !emp) { ui.toast('Escolha a empresa.', 'erro'); return false; }
        try {
          await dados.pessoas.atualizar(p.id, { aprovado: true, perfil: perfil, empresa_id: perfil === 'empresa' ? emp : null });
          if (card) card.remove();
          estado.pendentes = estado.pendentes.filter(function (x) { return x.id !== p.id; }); atualizarBadge();
          ui.toast('Acesso liberado para ' + (p.nome || p.email) + '.', 'ok');
          if (/^#\/cadastros\/avaliadores/.test(window.location.hash)) window.dispatchEvent(new HashChangeEvent('hashchange'));
          return true;
        } catch (x) { ui.toast(api.traduzErro(x), 'erro'); return false; }
      } }]
    });
    var sel = j.elemento.querySelector('#aq-perfil');
    sel.addEventListener('change', function () { j.elemento.querySelector('#aq-emp-box').classList.toggle('oculto', sel.value !== 'empresa'); });
  }

  async function recontar() {
    try {
      var lista = await dados.pessoas.listar();
      estado.pendentes = lista.filter(function (p) { return !p.aprovado && p.ativo; });
    } catch (e) { estado.pendentes = []; }
    atualizarBadge();
    return estado.pendentes;
  }

  async function iniciar(perfil) {
    parar();
    estado.perfil = perfil;
    if (!perfil || perfil.perfil !== 'admin') return;
    var pend = await recontar();
    pend.slice(0, 3).forEach(mostrar);
    try {
      var canal = sb.channel('cadastros-novos');
      canal.on('postgres_changes', { event: '*', schema: 'public', table: 'perfis' }, function (msg) {
        var novo = msg.new || {};
        if (msg.eventType === 'INSERT' && !novo.aprovado) {
          recontar();
          mostrar(Object.assign({ criado_em: new Date().toISOString() }, novo));
          return;
        }
        // aprovado, recusado ou removido em outra tela/aparelho
        var id = novo.id || (msg.old && msg.old.id);
        if (novo.aprovado || novo.ativo === false || msg.eventType === 'DELETE') {
          var c = document.querySelector('[data-aviso="' + id + '"]'); if (c) c.remove();
        }
        recontar();
      });
      canal.subscribe();
      estado.canal = canal;
    } catch (e) { console.warn('Aviso de cadastro em tempo real indisponível:', e); }
  }

  function parar() {
    if (estado.canal) { try { sb.removeChannel(estado.canal); } catch (e) { /* ignora */ } }
    estado.canal = null; estado.pendentes = [];
    var a = document.getElementById('avisos-cadastro'); if (a) a.remove();
    document.body.classList.remove('com-avisos');
  }

  window.CF.avisos = { iniciar: iniciar, parar: parar, atualizarBadge: atualizarBadge, recontar: recontar };
})();
