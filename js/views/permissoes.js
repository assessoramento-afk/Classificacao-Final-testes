/* =====================================================================
   Classificação Final · views/permissoes.js
   #/config/permissoes · só o responsável (coordenacao@kolping-sp.org.br).
   Linhas = funções (por seção); colunas = pessoas da equipe (e-mails da Kolping)
   e o perfil Empresas (vale para todas as empresas, com exceções individuais).
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, esc = ui.esc;
  var EMP = 'perfil:empresa';
  function equipeEmail(e) { e = String(e || '').toLowerCase(); return /@kolpingsp\.org$/.test(e) || /@kolping-sp\.org\.br$/.test(e); }
  function dataBR(s) { return s ? new Date(s).toLocaleDateString('pt-BR') : ''; }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.permissoes = async function (area) {
    var st = { secao: '', busca: '', sensiveis: false, verExcecoes: false, canal: 0 }, base, alter = {}, funcsAtual = [], colsAtual = [], MS = {};
    area.innerHTML = '<a class="voltar" href="#/config">← Configurações</a><div id="pm"><div class="girando" style="margin:30px auto"></div></div>';
    var box = area.querySelector('#pm');
    async function carregar() {
      var r = await window.CF.sb.rpc('permissoes_carregar'); if (r.error) throw r.error; base = r.data;
      var e = await window.CF.sb.from('empresas').select('id, nome_fantasia, razao_social, ativa').order('nome_fantasia'); base.empresas = e.data || [];
    }
    try { await carregar(); } catch (e) { box.innerHTML = '<div class="aviso aviso-erro" style="margin-top:12px">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }

    function marcado(funcao, alvo) {
      var k = funcao + '|' + alvo; if (k in alter) return alter[k];
      var m = base.marcacoes.filter(function (x) { return x.funcao === funcao && x.alvo === alvo; })[0];
      return m ? m.permitido : null;
    }
    function valor(f, pessoa) {   // valor efetivo (com padrão)
      if (pessoa === EMP) { var v = marcado(f.chave, EMP); return v == null ? f.padrao_empresa : v; }
      if (String(pessoa.email).toLowerCase() === 'coordenacao@kolping-sp.org.br') return true;
      if (f.chave === 'permissoes') return false;
      var x = marcado(f.chave, pessoa.id);
      if (x != null) return x;
      if (pessoa.perfil === 'empresa') { var y = marcado(f.chave, EMP); return y == null ? f.padrao_empresa : y; }
      return pessoa.perfil === 'admin' ? f.padrao_admin : f.padrao_avaliador;
    }
    function original(f, pessoa) { var a = alter; alter = {}; var v = valor(f, pessoa); alter = a; return v; }

    function desenhar() {
      var pend = base.pessoas.filter(function (p) { return !p.aprovado; });
      var equipe = base.pessoas.filter(function (p) { return p.aprovado && p.perfil !== 'empresa'; });
      var empresas = base.pessoas.filter(function (p) { return p.aprovado && p.perfil === 'empresa'; });
      var funcs = base.funcoes.filter(function (f) {
        if (st.secao && f.secao !== st.secao) return false;
        if (st.sensiveis && !f.sensivel) return false;
        if (st.busca) { var b = ui.normalizar(st.busca); if (ui.normalizar(f.nome + ' ' + (f.descricao || '')).indexOf(b) < 0) return false; }
        return true;
      });
      var colsEq = equipe.filter(function (p) { return !st.busca || funcs.length || ui.normalizar(p.nome + ' ' + p.email).indexOf(ui.normalizar(st.busca)) >= 0; });
      var secoes = []; base.funcoes.forEach(function (f) { if (secoes.indexOf(f.secao) < 0) secoes.push(f.secao); });
      var nAlt = Object.keys(alter).length;
      var cols = colsEq.map(function (p) { return { tipo: 'p', p: p }; }).concat([{ tipo: 'emp' }]);
      if (st.verExcecoes) empresas.forEach(function (p) { cols.push({ tipo: 'pe', p: p }); });

      function cab(c) {
        if (c.tipo === 'emp') return '<th class="pm-perf"><div class="pm-pes"><span class="pm-av" style="background:#3557e0">EM</span><b>Empresas</b><small>perfil · ' + empresas.length + ' pessoa(s)</small>' +
          '<button type="button" class="btn btn-p pm-exc" id="pm-exc">' + (st.verExcecoes ? 'Ocultar exceções' : 'Exceções por empresa') + '</button></div></th>';
        var p = c.p, tot = base.funcoes.filter(function (f) { return f.chave !== 'permissoes'; }), on = tot.filter(function (f) { return valor(f, p); }).length;
        return '<th class="' + (c.tipo === 'pe' ? 'pm-perf' : '') + '"><div class="pm-pes"><span class="pm-av">' + esc(ui.iniciais(p.nome)) + '</span><b>' + esc(p.nome) + '</b>' +
          '<small>' + esc(c.tipo === 'pe' ? (p.empresa || 'empresa') : (p.perfil === 'admin' ? 'Administrador' : 'Equipe')) + '</small>' +
          '<span class="pm-prog" title="' + on + ' de ' + tot.length + ' funções"><i style="width:' + Math.round(on / tot.length * 100) + '%"></i></span></div></th>';
      }
      function celula(f, c) {
        var alvo = c.tipo === 'emp' ? EMP : c.p.id, dono = c.tipo === 'p' && String(c.p.email).toLowerCase() === 'coordenacao@kolping-sp.org.br';
        var trava = dono || f.chave === 'permissoes';
        var v = c.tipo === 'emp' ? valor(f, EMP) : valor(f, c.p), orig = c.tipo === 'emp' ? original(f, EMP) : original(f, c.p);
        var exc = c.tipo === 'pe' && marcado(f.chave, c.p.id) != null;
        return '<td class="' + (c.tipo !== 'p' ? 'pm-perf' : '') + '"><button type="button" class="pm-sw ' + (v ? 'on' : 'off') + (v !== orig ? ' alt' : '') + '"' +
          (trava ? ' disabled title="' + (dono ? 'O responsável pelas permissões tem acesso a tudo' : 'Só o responsável') + '"' : '') +
          ' data-f="' + f.chave + '" data-a="' + esc(alvo) + '" data-sens="' + (f.sensivel ? 1 : 0) + '" aria-pressed="' + v + '">' + (v ? 'SIM' : 'NÃO') + '</button>' +
          (exc ? '<span class="pm-exc-t">exceção</span>' : '') + '</td>';
      }
      /* ---------- Mesa de controle (cada pessoa é um canal) ---------- */
      function travado(c, f) { return (c.tipo === 'p' && String(c.p.email).toLowerCase() === 'coordenacao@kolping-sp.org.br') || f.chave === 'permissoes'; }
      function vDe(c, f) { return c.tipo === 'emp' ? valor(f, EMP) : valor(f, c.p); }
      function ehVer(f) { return !f.sensivel && (/(^|_)ver($|_)|visualizar|consultar/i.test(f.chave) || /^ver\b/i.test(f.nome)); }
      function nivelDe(c, fs) {
        var liv = fs.filter(function (f) { return !travado(c, f); }); if (!liv.length) return fs.some(function (f) { return vDe(c, f); }) ? 3 : 0;
        var on = liv.filter(function (f) { return vDe(c, f); });
        if (!on.length) return 0;
        if (on.length === liv.length) return 3;
        var naoSens = liv.filter(function (f) { return !f.sensivel; });
        if (on.length === naoSens.length && on.every(function (f) { return !f.sensivel; })) return 2;
        var ver = liv.filter(ehVer);
        if (ver.length && on.length === ver.length && on.every(ehVer)) return 1;
        return -1;   // ajuste fino (personalizado)
      }
      function mesa(fs, cs) {
        var secs = []; fs.forEach(function (f) { if (secs.indexOf(f.secao) < 0) secs.push(f.secao); });
        var porSec = secs.map(function (sc) { return fs.filter(function (f) { return f.secao === sc; }); });
        var rot = '<div class="ms-rot"><div class="ms-cab"><b>PERMISSÕES</b><small>MESA DE CONTROLE</small></div>' + secs.map(function (sc, si) {
          return '<div class="ms-sec">' + esc(sc) + '</div>' + porSec[si].map(function (f) { return '<div class="ms-fn" title="' + esc(f.descricao || f.nome) + '"><span>' + esc(f.nome) + '</span>' + (f.sensivel ? '<em>SENSÍVEL</em>' : '') + '</div>'; }).join('') + '<div class="ms-fadr">nível rápido</div>';
        }).join('') + '</div>';
        var tot = base.funcoes.filter(function (f) { return f.chave !== 'permissoes'; });
        var canais = cs.map(function (c, ci) {
          var nome = c.tipo === 'emp' ? 'Empresas (todas)' : c.p.nome, sub = c.tipo === 'emp' ? 'perfil · todas as empresas' : c.tipo === 'pe' ? (c.p.empresa || 'empresa') : (c.p.perfil === 'admin' ? 'Administrador' : 'Equipe');
          var ini = c.tipo === 'emp' ? 'EM' : ui.iniciais(c.p.nome), on = tot.filter(function (f) { return vDe(c, f); }).length, nv = Math.round(on / Math.max(1, tot.length) * 10), vu = '';
          for (var k = 0; k < 10; k++) vu += '<i class="' + (k < nv ? 'l' + (k >= 8 ? ' r' : k >= 6 ? ' a' : '') : '') + '"></i>';
          var h = '<div class="ms-ch' + (c.tipo !== 'p' ? ' ms-emp' : '') + '" data-canal="' + ci + '"><div class="ms-scr"><span class="ms-av">' + esc(ini) + '</span><b title="' + esc(nome) + '">' + esc(nome) + '</b><small>' + esc(sub) + '</small><div class="ms-vu" title="' + on + ' de ' + tot.length + ' funções">' + vu + '</div>' +
            (c.tipo === 'emp' ? '<button type="button" class="ms-exc" id="pm-exc">' + (st.verExcecoes ? 'Ocultar exceções' : 'Exceções por empresa') + '</button>' : '') + '</div>';
          secs.forEach(function (sc, si) {
            h += '<div class="ms-secsp"></div>' + porSec[si].map(function (f) {
              var alvo = c.tipo === 'emp' ? EMP : c.p.id, tr = travado(c, f), v = vDe(c, f), orig = c.tipo === 'emp' ? original(f, EMP) : original(f, c.p);
              var exc = c.tipo === 'pe' && marcado(f.chave, c.p.id) != null;
              return '<div class="ms-b"><button type="button" class="pm-sw ms-bt ' + (v ? 'on' : 'off') + (f.sensivel ? ' sens' : '') + (v !== orig ? ' alt' : '') + (tr ? ' fixo' : '') + '"' + (tr ? ' disabled title="' + (f.chave === 'permissoes' ? 'Só o responsável' : 'O responsável tem acesso a tudo') + '"' : ' title="' + esc(f.nome) + '"') +
                ' data-f="' + f.chave + '" data-a="' + esc(alvo) + '" data-sens="' + (f.sensivel ? 1 : 0) + '" aria-pressed="' + v + '">' + (v ? 'ON' : 'OFF') + '</button>' + (exc ? '<span class="ms-x" title="Exceção desta pessoa">EXC</span>' : '') + '</div>';
            }).join('');
            var nl = nivelDe(c, porSec[si]), fix = porSec[si].every(function (f) { return travado(c, f); });
            h += '<div class="ms-f' + (fix ? ' fixo' : '') + '"><div class="ms-tr"><span class="ms-kn" style="top:' + (nl < 0 ? 33 : [66, 44, 22, 0][nl]) + 'px"></span></div><div class="ms-esc">' +
              [3, 2, 1, 0].map(function (n) { return '<button type="button"' + (fix ? ' disabled' : '') + ' data-niv="' + n + '" data-canal="' + ci + '" data-msec="' + si + '" class="' + (nl === n ? 'on' : '') + '">' + ['Nada', 'Ver', 'Editar', 'Tudo'][n] + '</button>'; }).join('') + '</div>' + (nl < 0 ? '<small class="ms-pers">ajuste fino</small>' : '') + '</div>';
          });
          return h + '</div>';
        }).join('');
        var nAlt2 = Object.keys(alter).length;
        return '<div class="ms-cel"><label>Canal</label><select class="entrada" id="ms-canal">' + cs.map(function (c, ci) { return '<option value="' + ci + '"' + (ci === (st.canal || 0) ? ' selected' : '') + '>' + esc(c.tipo === 'emp' ? 'Empresas (todas)' : c.p.nome) + '</option>'; }).join('') + '</select></div>' +
          '<div class="ms-palco"><div class="ms-mesa" data-ativo="' + (st.canal || 0) + '" style="--n:' + cs.length + '">' + rot + '<div class="ms-canais">' + canais + '</div></div></div>' +
          '<div class="ms-leg"><span><i style="background:#ee7330"></i>ligado</span><span><i style="background:#e2483c"></i>sensível ligado</span><span><i style="background:#3a3232"></i>desligado</span><span>Toque no botão para ligar/desligar · use o fader para mudar a seção inteira</span></div>';
      }
      function aplicarNivel(ci, si, n) {
        var cs = colsAtual, c = cs[ci]; if (!c) return;
        var secs = []; funcsAtual.forEach(function (f) { if (secs.indexOf(f.secao) < 0) secs.push(f.secao); });
        var fs = funcsAtual.filter(function (f) { return f.secao === secs[si] && !travado(c, f); });
        var alvoObj = c.tipo === 'emp' ? EMP : c.p, alvoId = c.tipo === 'emp' ? EMP : c.p.id;
        fs.forEach(function (f) {
          var quer = n === 3 ? true : n === 2 ? !f.sensivel : n === 1 ? ehVer(f) : false;
          var k = f.chave + '|' + alvoId; if (original(f, alvoObj) === quer) delete alter[k]; else alter[k] = quer;
        });
        desenhar();
      }
      funcsAtual = funcs; colsAtual = cols; MS = { aplicarNivel: aplicarNivel, travado: travado, vDe: vDe };
      var linhas = '', ult = null;
      funcs.forEach(function (f) {
        if (f.secao !== ult) { linhas += '<tr class="pm-mod"><td colspan="' + (cols.length + 1) + '">' + esc(f.secao) + '</td></tr>'; ult = f.secao; }
        linhas += '<tr><td class="pm-f"><b>' + esc(f.nome) + (f.sensivel ? '<span class="pm-sens">sensível</span>' : '') + '</b>' + (f.descricao ? '<small>' + esc(f.descricao) + '</small>' : '') + '</td>' +
          cols.map(function (c) { return celula(f, c); }).join('') + '</tr>';
      });
      box.innerHTML =
        '<header class="cabecalho"><div><h1>Permissões</h1><p>Cada linha é uma função do sistema; cada coluna, uma pessoa da equipe ou o perfil Empresas.</p></div></header>' +
        (pend.length ? '<section class="card pm-aguarda"><b>' + pend.length + ' pessoa' + (pend.length === 1 ? '' : 's') + ' aguardando liberação</b>' + pend.map(function (p) {
          var eq = equipeEmail(p.email);
          return '<div class="pm-pend"><div><b>' + esc(p.nome) + '</b><small>' + esc(p.email) + ' · ' + (eq ? 'e-mail da Kolping (equipe)' : 'e-mail de fora (empresa)') + ' · pediu acesso em ' + dataBR(p.criado_em) + '</small></div>' +
            '<div class="pm-pend-b"><button type="button" class="btn btn-p" data-recusar="' + p.id + '">Recusar</button>' +
            (eq ? '<button type="button" class="btn btn-pri btn-p" data-lib-eq="' + p.id + '">Liberar na equipe</button>'
                : '<select class="entrada" data-emp-sel="' + p.id + '" aria-label="Empresa"><option value="">Escolha a empresa…</option>' + base.empresas.filter(function (e) { return e.ativa !== false; }).map(function (e) { return '<option value="' + e.id + '">' + esc(e.nome_fantasia || e.razao_social) + '</option>'; }).join('') + '</select>' +
                  '<button type="button" class="btn btn-pri btn-p" data-lib-emp="' + p.id + '">Liberar como empresa</button>') + '</div></div>';
        }).join('') + '</section>' : '') +
        '<div class="pt-filtros">' + [''].concat(secoes).map(function (s) { return '<button type="button" class="pt-chip' + (st.secao === s && !st.sensiveis ? ' on' : '') + '" data-sec="' + esc(s) + '">' + (s || 'Todas as seções') + '</button>'; }).join('') +
          '<button type="button" class="pt-chip' + (st.sensiveis ? ' on' : '') + '" id="pm-sens">Só sensíveis</button>' +
          '<input class="entrada" id="pm-busca" type="search" placeholder="Buscar função" value="' + esc(st.busca) + '"></div>' +
        mesa(funcs, cols) +
        '<p class="dica">Ligar uma função sensível pede confirmação. A coluna Empresas vale para todas as empresas; em "Exceções por empresa" dá para mudar só para uma pessoa. Pessoas liberadas na equipe começam sem nenhuma permissão.</p>' +
        (nAlt ? '<div class="pm-barra"><b>' + nAlt + ' alteraç' + (nAlt === 1 ? 'ão' : 'ões') + ' não salva' + (nAlt === 1 ? '' : 's') + '</b><button type="button" class="btn" id="pm-desc">Descartar</button><button type="button" class="btn btn-pri" id="pm-salvar">Salvar alterações</button></div>' : '');
      ligar();
    }
    function ligar() {
      box.querySelectorAll('[data-sec]').forEach(function (b) { b.addEventListener('click', function () { st.secao = b.getAttribute('data-sec'); st.sensiveis = false; desenhar(); }); });
      box.querySelector('#pm-sens').addEventListener('click', function () { st.sensiveis = !st.sensiveis; st.secao = ''; desenhar(); });
      var bus = box.querySelector('#pm-busca');
      bus.addEventListener('input', function () { st.busca = bus.value; var pos = bus.selectionStart; desenhar(); var n = box.querySelector('#pm-busca'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ok */ } });
      var ex = box.querySelector('#pm-exc'); if (ex) ex.addEventListener('click', function () { st.verExcecoes = !st.verExcecoes; desenhar(); });
      box.querySelectorAll('[data-niv]:not([disabled])').forEach(function (b) {
        b.addEventListener('click', async function () {
          var n = +b.getAttribute('data-niv');
          if (n === 3) {
            var c = colsAtual[+b.getAttribute('data-canal')], secs = []; funcsAtual.forEach(function (f) { if (secs.indexOf(f.secao) < 0) secs.push(f.secao); });
            var temSens = funcsAtual.some(function (f) { return f.secao === secs[+b.getAttribute('data-msec')] && f.sensivel && !MS.travado(c, f) && !MS.vDe(c, f); });
            if (temSens && !(await ui.confirmar('Ligar tudo nesta seção', 'Inclui funções sensíveis. Liberar para ' + (c.tipo === 'emp' ? 'todas as empresas' : c.p.nome) + '?', 'Ligar tudo', 'Cancelar'))) return;
          }
          MS.aplicarNivel(+b.getAttribute('data-canal'), +b.getAttribute('data-msec'), n);
        });
      });
      function marcarAtivo() { box.querySelectorAll('.ms-ch').forEach(function (c) { c.classList.toggle('ativo', +c.getAttribute('data-canal') === (st.canal || 0)); }); }
      marcarAtivo();
      var mc = box.querySelector('#ms-canal'); if (mc) mc.addEventListener('change', function () { st.canal = +mc.value; marcarAtivo(); });
      box.querySelectorAll('.pm-sw:not([disabled])').forEach(function (b) {
        b.addEventListener('click', async function () {
          var f = b.getAttribute('data-f'), a = b.getAttribute('data-a'), novo = b.getAttribute('aria-pressed') !== 'true';
          if (novo && b.getAttribute('data-sens') === '1') {
            var fn = base.funcoes.filter(function (x) { return x.chave === f; })[0];
            var ok = await ui.confirmar('Ligar função sensível', 'Liberar "' + fn.nome + '" para ' + (a === EMP ? 'todas as empresas' : 'esta pessoa') + '?', 'Ligar', 'Cancelar');
            if (!ok) return;
          }
          // se voltou ao valor que já valia, não conta como alteração
          var k = f + '|' + a, fn2 = base.funcoes.filter(function (x) { return x.chave === f; })[0];
          var alvoObj = a === EMP ? EMP : base.pessoas.filter(function (x) { return x.id === a; })[0];
          if (original(fn2, alvoObj) === novo) delete alter[k]; else alter[k] = novo;
          desenhar();
        });
      });
      var desc = box.querySelector('#pm-desc'); if (desc) desc.addEventListener('click', function () { alter = {}; desenhar(); });
      var sal = box.querySelector('#pm-salvar');
      if (sal) sal.addEventListener('click', async function () {
        sal.disabled = true;
        try {
          var lista = Object.keys(alter).map(function (k) { var p = k.split('|'); return { funcao: p[0], alvo: p[1], permitido: alter[k] }; });
          var r = await window.CF.sb.rpc('permissoes_salvar', { p_alteracoes: lista }); if (r.error) throw r.error;
          alter = {}; await carregar(); ui.toast('Permissões salvas.', 'ok'); desenhar();
        } catch (e) { sal.disabled = false; ui.toast(api.traduzErro(e), 'erro'); }
      });
      box.querySelectorAll('[data-lib-eq]').forEach(function (b) { b.addEventListener('click', function () { liberar(b.getAttribute('data-lib-eq'), 'equipe', null); }); });
      box.querySelectorAll('[data-lib-emp]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-lib-emp'), sel = box.querySelector('[data-emp-sel="' + id + '"]');
          if (!sel.value) { ui.toast('Escolha a empresa desta pessoa.', 'erro'); sel.focus(); return; }
          liberar(id, 'empresa', sel.value);
        });
      });
      box.querySelectorAll('[data-recusar]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var ok = await ui.confirmar('Recusar acesso', 'O cadastro desta pessoa será apagado. Ela poderá se cadastrar de novo depois.', 'Recusar', 'Cancelar');
          if (!ok) return;
          try { var r = await window.CF.sb.rpc('excluir_pessoa', { p_id: b.getAttribute('data-recusar') }); if (r.error) throw r.error; await carregar(); ui.toast('Acesso recusado.', 'ok'); desenhar(); }
          catch (e) { ui.toast(api.traduzErro(e), 'erro'); }
        });
      });
    }
    async function liberar(id, tipo, empresa) {
      try {
        var r = await window.CF.sb.rpc('pessoa_liberar', { p_id: id, p_tipo: tipo, p_empresa: empresa }); if (r.error) throw r.error;
        await carregar(); ui.toast(tipo === 'equipe' ? 'Pessoa liberada na equipe, sem permissões. Ligue o que ela pode fazer.' : 'Pessoa liberada como empresa.', 'ok'); desenhar();
      } catch (e) { ui.toast(api.traduzErro(e), 'erro'); }
    }
    desenhar();
  };
})();
