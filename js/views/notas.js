/* =====================================================================
   Classificação Final · views/notas.js
   Lançamento das notas (funciona sem internet):
   #/avaliar/<turma>/notas            por teste (padrão) ou por jovem
   #/avaliar/<turma>/sugestoes        sugestões para decidir
   Nota oficial = avaliador do grupo do jovem (ou administrador).
   Para jovens de outros grupos, o avaliador envia sugestão com justificativa.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc, D = window.CF.datas, OFF = window.CF.offline;
  var estado = { modo: 'teste', teste: null, todos: false, jovem: null };

  function eu() { return (window.CF.perfilAtual || {}).id; }
  function ehAdmin() { return (window.CF.perfilAtual || {}).perfil === 'admin'; }
  function fmt(n) { return n == null || n === '' || isNaN(n) ? '' : (Math.round(n * 100) / 100).toString().replace('.', ','); }
  function numero(v) { var n = parseFloat(String(v || '').trim().replace(',', '.')); return isNaN(n) ? null : n; }
  function testes(snap) { return ((snap.processo.configuracao || {}).testes || []).slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); }); }
  function resp(snap, j) { return j.grupo ? snap.grupos[j.grupo] : null; }
  function pode(snap, j) { return ehAdmin() || resp(snap, j) === eu(); }
  function desistiu(snap, j) { return snap.dias.some(function (d) { var x = snap.presencas[j.id + '|' + d]; return x && x.presente === false; }); }
  function nota(snap, j, c) { return snap.notas[j.id + '|' + c.id]; }
  function converter(t, pontos) {
    var linha = (t.conversao || []).filter(function (l) { return pontos >= Number(l.min) && pontos <= Number(l.max); })[0];
    return linha ? Number(linha.nota) : null;
  }
  function visiveis(snap) {
    var meus = snap.jovens.filter(function (j) { return pode(snap, j); });
    var lista = estado.todos || !meus.length ? snap.jovens.filter(function (j) { return j.grupo || ehAdmin(); }) : meus;
    return lista.slice().sort(function (a, b) { var ma = pode(snap, a) ? 0 : 1, mb = pode(snap, b) ? 0 : 1; return ma - mb || String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });
  }
  function media(snap, j, t) {
    var vs = t.criterios.filter(function (c) { return c.conta_na_nota !== false; }).map(function (c) { var n = nota(snap, j, c); return n ? n.valor : null; });
    if (!vs.length || vs.some(function (v) { return v == null; })) return null;
    return vs.reduce(function (a, b) { return a + b; }, 0) / vs.length;
  }
  function completo(snap, j, t) { return t.criterios.every(function (c) { return !!nota(snap, j, c); }); }
  function gravarNota(snap, j, t, c, valor, pontos) {
    var em = new Date().toISOString();
    snap.notas[j.id + '|' + c.id] = { valor: valor, pontos: pontos, av: eu(), em: em, pendente: true };
    OFF.guardarTurma(snap);
    OFF.adicionar({ tipo: 'nota', turma_id: snap.turma.id, dados: { participacao_id: j.id, criterio_id: c.id, teste_id: t.teste_id, valor: valor, pontos: pontos, em: em } });
  }
  // Valida o que foi digitado: nota 1 a 5 (meio ponto ou outro valor) ou pontuação convertida
  function lerEntrada(t, c, txt) {
    var n = numero(txt);
    if (n == null) return { erro: 'Digite um número.' };
    if (c.entrada === 'pontuacao') { var v = converter(t, n); if (v == null) return { erro: 'Pontuação fora da tabela de conversão.' }; return { valor: v, pontos: n }; }
    if (n < 1 || n > 5) return { erro: 'A nota vai de 1 a 5.' };
    return { valor: Math.round(n * 100) / 100, pontos: null };
  }

  /* ================================================================
     TELA DE LANÇAMENTO
     ================================================================ */
  window.CF.avaliarNotas = function (area, ctx, snap) {
    var ts = testes(snap);
    if (!ts.length) { area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '">← ' + esc(snap.turma.nome) + '</a><div class="card vazio">Este processo não tem testes guardados. Ele precisa ser iniciado pelo administrador.</div>'; return; }
    if (!estado.teste || !ts.some(function (t) { return t.teste_id === estado.teste; })) estado.teste = ts[0].teste_id;
    var largo = window.matchMedia('(min-width: 760px)').matches;
    var lista = visiveis(snap);
    var meus = snap.jovens.filter(function (j) { return pode(snap, j); }).length;
    var pend = (snap.sugestoes || []).filter(function (s) { var j = snap.jovens.filter(function (x) { return x.id === s.participacao_id; })[0]; return s.situacao === 'pendente' && j && pode(snap, j) && s.autor_id !== eu(); }).length;

    area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '">← ' + esc(snap.turma.nome) + '</a>' +
      '<header class="cabecalho"><div><h1>Lançar notas · ' + esc(snap.turma.nome) + '</h1><p>' + esc(snap.empresa.nome + ' · ' + snap.processo.vaga) + ' · ' + (ehAdmin() ? 'administrador: todos os grupos' : meus + ' jovem(ns) nos seus grupos') + '</p></div>' +
        '<div class="segmentos" role="group" aria-label="Modo de lançamento"><button type="button" data-modo="teste" aria-pressed="' + (estado.modo === 'teste') + '">Por teste</button><button type="button" data-modo="jovem" aria-pressed="' + (estado.modo === 'jovem') + '">Por jovem</button></div></header>' +
      (pend ? '<a class="aviso aviso-info link-aviso" href="#/avaliar/' + snap.turma.id + '/sugestoes">' + ui.icone('alerta', 18) + '<span><b>' + pend + ' sugestão(ões)</b> de outros avaliadores aguardando sua decisão. Toque para ver.</span></a>' : '') +
      '<div id="nt-corpo"></div>';
    area.querySelectorAll('[data-modo]').forEach(function (b) { b.addEventListener('click', function () { estado.modo = b.getAttribute('data-modo'); window.CF.avaliarNotas(area, ctx, snap); }); });
    if (window.CF.barraSync) window.CF.barraSync(area);
    var corpo = area.querySelector('#nt-corpo');
    if (estado.modo === 'teste') porTeste(corpo, snap, ts, lista, largo); else porJovem(corpo, snap, ts, lista);
  };

  /* ---------- Por teste ---------- */
  function porTeste(box, snap, ts, lista, largo) {
    var t = ts.filter(function (x) { return x.teste_id === estado.teste; })[0];
    var ativos = lista.filter(function (j) { return !desistiu(snap, j); });
    function abas() {
      return '<div class="tgrid" role="tablist" aria-label="Testes">' + ts.map(function (x) {
        var feitos = ativos.filter(function (j) { return completo(snap, j, x); }).length, todos = feitos === ativos.length && ativos.length > 0, pct = ativos.length ? Math.round(feitos * 100 / ativos.length) : 0;
        return '<button type="button" role="tab" class="tc' + (x.teste_id === t.teste_id ? ' on' : '') + (todos ? ' ok' : '') + '" data-teste="' + x.teste_id + '" aria-selected="' + (x.teste_id === t.teste_id) + '">' +
          '<b>' + esc(x.nome) + '</b><span class="pr">' + (todos ? '✓ completo' : feitos + '/' + ativos.length + ' lançados') + '<span class="bar"><i style="width:' + pct + '%"></i></span></span></button>';
      }).join('') + '</div>';
    }
    var feitos = ativos.filter(function (j) { return completo(snap, j, t); }).length;
    box.innerHTML = abas() +
      '<section class="card bloco nt-bloco"><div class="nt-topo"><div><h2>' + esc(t.nome) + '</h2><span class="dica">' + (t.modalidade === 'grupo' ? '👥 Em grupo' : '👤 Individual') + (t.nivel ? ' · nível ' + (t.nivel === 'iniciante' ? 'Iniciante' : 'Jovem Aprendiz') : '') +
        ' · notas de 1 a 5 (meio ponto ou outro valor)' + (largo ? ' · Enter avança para a próxima nota' : '') + '</span></div>' +
        '<div class="nt-prog"><span class="dica">' + feitos + ' de ' + ativos.length + ' jovens completos</span><div class="prog"><i style="width:' + (ativos.length ? Math.round(feitos * 100 / ativos.length) : 0) + '%"></i></div></div></div>' +
        '<label class="marcar-linha"><input type="checkbox" id="nt-todos"' + (estado.todos ? ' checked' : '') + '> Ver toda a turma</label>' +
        '<div id="nt-lista"></div><span class="dica">Ordem alfabética (seus grupos primeiro). Quem faltou fica bloqueado. 📝 = observação do jovem neste teste.</span></section>';
    box.querySelectorAll('[data-teste]').forEach(function (b) { b.addEventListener('click', function () { estado.teste = b.getAttribute('data-teste'); porTeste(box, snap, ts, lista, largo); }); });
    box.querySelector('#nt-todos').addEventListener('change', function (e) { estado.todos = e.target.checked; var area = box.parentNode; window.CF.avaliarNotas(area, {}, snap); });
    var el = box.querySelector('#nt-lista');
    if (largo) tabela(el, snap, t, lista); else cartoes(el, snap, t, lista);
  }

  function tabela(el, snap, t, lista) {
    el.innerHTML = '<div class="tabela-rolar"><table class="grade-n"><thead><tr><th>Nº</th><th>Jovem</th>' + t.criterios.map(function (c) { return '<th title="' + esc(c.nome) + '">' + esc(c.nome) + (c.entrada === 'pontuacao' ? '<small>(pontos)</small>' : '') + '</th>'; }).join('') + '<th>Média</th><th></th></tr></thead><tbody>' +
      lista.map(function (j, i) {
        var des = desistiu(snap, j), meu = pode(snap, j), m = media(snap, j, t), ob = snap.observacoes[j.id + '|' + t.teste_id];
        return '<tr class="' + (des ? 'falta' : '') + (meu ? '' : ' outro') + '"><td class="num">' + (i + 1) + '</td><td class="nm"><b>' + esc(j.nome) + '</b> <small>' + esc(j.codigo) + (j.grupo ? ' · G' + j.grupo : '') + '</small></td>' +
          t.criterios.map(function (c) {
            var n = nota(snap, j, c), v = n ? (c.entrada === 'pontuacao' ? fmt(n.pontos) : fmt(n.valor)) : '';
            return '<td><input class="nt' + (n && n.pendente ? ' pend' : '') + '" data-j="' + j.id + '" data-c="' + c.id + '" inputmode="decimal" value="' + v + '" placeholder="–" aria-label="' + esc(c.nome + ' de ' + j.nome) + '"' + (des || !meu ? ' disabled' : '') + '>' +
              (c.entrada === 'pontuacao' && n ? '<small class="conv">= ' + fmt(n.valor) + '</small>' : '') + '</td>';
          }).join('') +
          '<td class="media">' + (des ? ui.pill('Faltou', 'nao') : (m == null ? '—' : fmt(m.toFixed(2)))) + '</td>' +
          '<td class="acoes-nt">' + (des ? '' : '<button type="button" class="btn btn-p" data-obs="' + j.id + '" title="Observação"' + (ob ? ' aria-pressed="true"' : '') + '>📝</button>' + (meu ? '' : '<button type="button" class="btn btn-p" data-sug="' + j.id + '">Sugerir</button>')) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var inputs = [].slice.call(el.querySelectorAll('input.nt:not([disabled])'));
    inputs.forEach(function (inp, k) {
      function salvar() {
        var j = porId(snap.jovens, inp.getAttribute('data-j')), c = porId(t.criterios, inp.getAttribute('data-c'));
        var atual = nota(snap, j, c), txt = inp.value.trim();
        if (!txt) { return; }
        var r = lerEntrada(t, c, txt);
        if (r.erro) { ui.toast(r.erro, 'erro'); inp.value = atual ? fmt(c.entrada === 'pontuacao' ? atual.pontos : atual.valor) : ''; return; }
        if (atual && atual.valor === r.valor && (atual.pontos || null) === (r.pontos || null)) { inp.value = fmt(c.entrada === 'pontuacao' ? r.pontos : r.valor); return; }
        gravarNota(snap, j, t, c, r.valor, r.pontos);
        inp.value = fmt(c.entrada === 'pontuacao' ? r.pontos : r.valor); inp.classList.add('pend');
        var tr = inp.closest('tr'), m = media(snap, j, t); tr.querySelector('.media').textContent = m == null ? '—' : fmt(m.toFixed(2));
        if (c.entrada === 'pontuacao') { var cv = inp.parentNode.querySelector('.conv'); if (!cv) { cv = document.createElement('small'); cv.className = 'conv'; inp.parentNode.appendChild(cv); } cv.textContent = '= ' + fmt(r.valor); }
      }
      inp.addEventListener('change', salvar);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); salvar(); var prox = inputs[k + 1]; if (prox) { prox.focus(); prox.select(); } } });
      inp.addEventListener('focus', function () { inp.select(); });
    });
    ligarAcoes(el, snap, t);
  }

  function cartoes(el, snap, t, lista) {
    el.innerHTML = lista.map(function (j) {
      var des = desistiu(snap, j), meu = pode(snap, j), m = media(snap, j, t);
      return '<section class="cj' + (des ? ' falta' : '') + (meu ? '' : ' outro') + '"><div class="cj-cab"><b>' + esc(j.nome) + '</b><span class="cod">' + esc(j.codigo) + '</span></div>' +
        (des ? '<p class="dica" style="margin:0">' + ui.pill('Faltou', 'nao') + ' Bloqueado (desistência).</p>' :
        t.criterios.map(function (c) {
          var n = nota(snap, j, c);
          if (c.entrada === 'pontuacao') return '<div class="crit"><span>' + esc(c.nome) + ' <small>(pontos)</small></span><input class="nt nt-p" data-j="' + j.id + '" data-c="' + c.id + '" inputmode="decimal" value="' + (n ? fmt(n.pontos) : '') + '" placeholder="pontos"' + (meu ? '' : ' disabled') + '><small class="conv">' + (n ? '= ' + fmt(n.valor) : '') + '</small></div>';
          var VAL = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
          return '<div class="crit c9"><span>' + esc(c.nome) + '</span><div class="n9" role="group" aria-label="' + esc(c.nome) + '">' + VAL.map(function (v) {
            return '<button type="button" class="' + (v % 1 ? 'm' : '') + '" data-j="' + j.id + '" data-c="' + c.id + '" data-v="' + v + '" aria-pressed="' + (!!n && n.valor === v) + '"' + (meu ? '' : ' disabled') + '>' + fmt(v) + '</button>'; }).join('') + '</div>' +
            (n && VAL.indexOf(n.valor) < 0 ? '<small class="conv">outro valor: ' + fmt(n.valor) + '</small>' : '') + '</div>';
        }).join('') +
        '<div class="cj-pe"><span class="dica">Média: <b>' + (m == null ? '—' : fmt(m.toFixed(2))) + '</b></span><span><button type="button" class="btn btn-p" data-obs="' + j.id + '">📝</button>' + (meu ? '<button type="button" class="btn btn-p" data-outro="' + j.id + '">Outro valor</button>' : '<button type="button" class="btn btn-p" data-sug="' + j.id + '">Sugerir</button>') + '</span></div>') + '</section>';
    }).join('') || '<div class="card vazio">Nenhum jovem nos seus grupos.</div>';
    el.querySelectorAll('[data-v]').forEach(function (b) {
      b.addEventListener('click', function () {
        var j = porId(snap.jovens, b.getAttribute('data-j')), c = porId(t.criterios, b.getAttribute('data-c'));
        gravarNota(snap, j, t, c, Number(b.getAttribute('data-v')), null); cartoes(el, snap, t, lista);
      });
    });
    el.querySelectorAll('.nt-p').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var j = porId(snap.jovens, inp.getAttribute('data-j')), c = porId(t.criterios, inp.getAttribute('data-c')), r = lerEntrada(t, c, inp.value);
        if (r.erro) { ui.toast(r.erro, 'erro'); return; }
        gravarNota(snap, j, t, c, r.valor, r.pontos); cartoes(el, snap, t, lista);
      });
    });
    el.querySelectorAll('[data-outro]').forEach(function (b) { b.addEventListener('click', function () { outroValor(snap, t, porId(snap.jovens, b.getAttribute('data-outro')), function () { cartoes(el, snap, t, lista); }); }); });
    ligarAcoes(el, snap, t);
  }

  function ligarAcoes(el, snap, t) {
    el.querySelectorAll('[data-obs]').forEach(function (b) { b.addEventListener('click', function () { observacao(snap, t, porId(snap.jovens, b.getAttribute('data-obs')), function () { b.setAttribute('aria-pressed', 'true'); }); }); });
    el.querySelectorAll('[data-sug]').forEach(function (b) { b.addEventListener('click', function () { sugerir(snap, t, porId(snap.jovens, b.getAttribute('data-sug'))); }); });
  }
  function porId(l, id) { return l.filter(function (x) { return x.id === id; })[0]; }

  /* ---------- Por jovem ---------- */
  function porJovem(box, snap, ts, lista) {
    var ativos = lista.filter(function (j) { return !desistiu(snap, j); });
    if (!estado.jovem || !ativos.some(function (j) { return j.id === estado.jovem; })) estado.jovem = ativos[0] ? ativos[0].id : null;
    var j = porId(snap.jovens, estado.jovem);
    if (!j) { box.innerHTML = '<div class="card vazio">Nenhum jovem disponível.</div>'; return; }
    var i = ativos.indexOf(j);
    box.innerHTML = '<div class="pj-nav"><button type="button" class="btn btn-p" id="pj-ant"' + (i <= 0 ? ' disabled' : '') + '>‹</button>' +
      '<select class="entrada" id="pj-sel" aria-label="Jovem">' + ativos.map(function (x) { return '<option value="' + x.id + '"' + (x.id === j.id ? ' selected' : '') + '>' + esc(x.nome + (pode(snap, x) ? '' : ' (outro grupo)')) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="btn btn-p" id="pj-prox"' + (i >= ativos.length - 1 ? ' disabled' : '') + '>›</button><button type="button" class="btn btn-p" id="pj-qr">📷</button></div>' +
      '<div class="tgrid" id="pj-res"></div><div id="pj-testes" class="pj-testes"></div>';
    var cont = box.querySelector('#pj-testes');
    box.querySelector('#pj-res').innerHTML = ts.map(function (t) { var ok = completo(snap, j, t); return '<button type="button" class="tc' + (ok ? ' ok' : '') + '" data-ir="' + t.teste_id + '"><b>' + esc(t.nome) + '</b><span class="pr">' + (ok ? '✓ completo' : 'falta lançar') + '</span></button>'; }).join('');
    cont.innerHTML = ts.map(function (t) { var ok = completo(snap, j, t); return '<section class="card bloco pj-t' + (ok ? ' feito' : '') + '" data-t="' + t.teste_id + '" id="pj-' + t.teste_id + '"><h2>' + esc(t.nome) + (ok ? ' <span class="pill pill-sim">✓</span>' : '') + '</h2><div class="pj-l"></div></section>'; }).join('');
    ts.forEach(function (t) { cartoes(cont.querySelector('[data-t="' + t.teste_id + '"] .pj-l'), snap, t, [j]); });
    box.querySelectorAll('[data-ir]').forEach(function (b) { b.addEventListener('click', function () { var alvo = document.getElementById('pj-' + b.getAttribute('data-ir')); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    function ir(id) { estado.jovem = id; porJovem(box, snap, ts, lista); window.scrollTo(0, 0); }
    box.querySelector('#pj-sel').addEventListener('change', function (e) { ir(e.target.value); });
    box.querySelector('#pj-ant').addEventListener('click', function () { if (i > 0) ir(ativos[i - 1].id); });
    box.querySelector('#pj-prox').addEventListener('click', function () { if (i < ativos.length - 1) ir(ativos[i + 1].id); });
    box.querySelector('#pj-qr').addEventListener('click', function () {
      window.CF.lerCracha(snap, function (x) { return { texto: 'Abrir notas', acao: function () { document.querySelector('.cam') && document.querySelector('.cam').remove(); if (!ativos.some(function (a) { return a.id === x.id; })) { estado.todos = true; } ir(x.id); } }; });
    });
  }

  /* ---------- Outro valor, observação e sugestão ---------- */
  function outroValor(snap, t, j, aoSalvar) {
    var crits = t.criterios.filter(function (c) { return c.entrada !== 'pontuacao'; });
    ui.janela({ titulo: 'Outro valor · ' + j.nome, confirmarDescarte: false,
      corpo: '<p class="dica" style="margin:0">Notas de 1 a 5 com decimais (ex.: 3,25). Deixe em branco para manter.</p>' + crits.map(function (c) { var n = nota(snap, j, c); return '<label class="campo"><span>' + esc(c.nome) + '</span><input class="entrada" data-ov="' + c.id + '" inputmode="decimal" value="' + (n ? fmt(n.valor) : '') + '"></label>'; }).join(''),
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar', principal: true, aoClicar: function (f) {
        var erroMsg = null;
        f.querySelectorAll('[data-ov]').forEach(function (inp) {
          if (!inp.value.trim()) return;
          var c = porId(t.criterios, inp.getAttribute('data-ov')), r = lerEntrada(t, c, inp.value);
          if (r.erro) { erroMsg = r.erro; return; }
          var n = nota(snap, j, c); if (!n || n.valor !== r.valor) gravarNota(snap, j, t, c, r.valor, null);
        });
        if (erroMsg) { ui.toast(erroMsg, 'erro'); return false; }
        aoSalvar(); return true;
      } }] });
  }
  function observacao(snap, t, j, aoSalvar) {
    var ob = snap.observacoes[j.id + '|' + t.teste_id];
    ui.janela({ titulo: 'Observação · ' + j.nome, confirmarDescarte: false,
      corpo: '<p class="dica" style="margin:0">' + esc(t.nome) + ' · a observação aparece na ficha do jovem.</p><textarea class="entrada" id="ob-txt" rows="5" maxlength="1000">' + esc(ob ? ob.texto : '') + '</textarea>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar', principal: true, aoClicar: function (f) {
        var txt = ui.maiusculas(f.querySelector('#ob-txt').value.trim()), em = new Date().toISOString();
        snap.observacoes[j.id + '|' + t.teste_id] = { texto: txt, em: em }; OFF.guardarTurma(snap);
        OFF.adicionar({ tipo: 'observacao', turma_id: snap.turma.id, dados: { participacao_id: j.id, teste_id: t.teste_id, texto: txt, em: em } });
        ui.toast('Observação salva.', 'ok'); aoSalvar(); return true;
      } }] });
  }
  function sugerir(snap, t, j) {
    var dono = snap.equipe[resp(snap, j)] || 'avaliador do grupo';
    ui.janela({ titulo: 'Sugerir nota · ' + j.nome, confirmarDescarte: false,
      corpo: '<p style="margin:0;color:var(--texto-2)">' + esc(t.nome) + ' · a sugestão vai para <b>' + esc(dono) + '</b>, que aprova ou nega.</p>' +
        t.criterios.filter(function (c) { return c.entrada !== 'pontuacao'; }).map(function (c) { var n = nota(snap, j, c); return '<label class="campo"><span>' + esc(c.nome) + ' <small class="dica">atual: ' + (n ? fmt(n.valor) : '—') + '</small></span><input class="entrada" data-sg="' + c.id + '" inputmode="decimal" placeholder="sua sugestão (1 a 5)"></label>'; }).join('') +
        '<label class="campo"><span>Justificativa <span class="obrig">*</span></span><textarea class="entrada" id="sg-just" rows="3" maxlength="500" placeholder="O que você observou?"></textarea></label>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Enviar sugestão', principal: true, aoClicar: function (f) {
        var just = ui.maiusculas(f.querySelector('#sg-just').value.trim()), itens = [], erroMsg = null;
        f.querySelectorAll('[data-sg]').forEach(function (inp) {
          if (!inp.value.trim()) return;
          var c = porId(t.criterios, inp.getAttribute('data-sg')), r = lerEntrada(t, c, inp.value);
          if (r.erro) erroMsg = r.erro; else itens.push({ c: c, valor: r.valor });
        });
        if (erroMsg) { ui.toast(erroMsg, 'erro'); return false; }
        if (!itens.length) { ui.toast('Digite pelo menos uma nota sugerida.', 'erro'); return false; }
        if (just.length < 5) { ui.toast('Escreva a justificativa.', 'erro'); return false; }
        itens.forEach(function (it) { OFF.adicionar({ tipo: 'sugestao', turma_id: snap.turma.id, dados: { participacao_id: j.id, criterio_id: it.c.id, teste_id: t.teste_id, valor: it.valor, justificativa: just, em: new Date().toISOString() } }); });
        OFF.guardarTurma(snap);
        ui.toast('Sugestão enviada para ' + dono + '.', 'ok'); return true;
      } }] });
  }

  /* ================================================================
     SUGESTÕES PARA DECIDIR (com internet)
     ================================================================ */
  window.CF.avaliarSugestoes = function (area, ctx, snap) {
    var ts = testes(snap), crit = {};
    ts.forEach(function (t) { t.criterios.forEach(function (c) { crit[c.id] = { c: c, t: t }; }); });
    var minhas = (snap.sugestoes || []).filter(function (s) { var j = porId(snap.jovens, s.participacao_id); return j && s.situacao === 'pendente' && pode(snap, j) && s.autor_id !== eu(); });
    var enviadas = (snap.sugestoes || []).filter(function (s) { return s.autor_id === eu(); });
    function linha(s, decidir) {
      var j = porId(snap.jovens, s.participacao_id) || {}, k = crit[s.criterio_id] || { c: { nome: '?' }, t: { nome: '?' } }, n = snap.notas[s.participacao_id + '|' + s.criterio_id];
      return '<div class="sug card"><div class="sug-tx"><b>' + esc(j.nome || '') + '</b><small>' + esc(k.t.nome + ' · ' + k.c.nome) + '</small>' +
        '<div class="sug-val">' + (n ? fmt(n.valor) : '—') + ' → <b>' + fmt(Number(s.valor)) + '</b></div><p>“' + esc(s.justificativa) + '” <small>· ' + esc((snap.equipe[s.autor_id] || 'avaliador').split(' ')[0]) + '</small></p></div>' +
        (decidir ? '<div class="sug-bt"><button type="button" class="btn btn-p" data-neg="' + s.id + '">Negar</button><button type="button" class="btn btn-pri btn-p" data-apr="' + s.id + '">Aprovar</button></div>'
          : '<span>' + ui.pill(s.situacao === 'pendente' ? 'Aguardando' : (s.situacao === 'aprovada' ? 'Aprovada' : 'Negada'), s.situacao === 'aprovada' ? 'sim' : (s.situacao === 'negada' ? 'nao' : 'neu')) + '</span>') + '</div>';
    }
    area.innerHTML = '<a class="voltar" href="#/avaliar/' + snap.turma.id + '/notas">← Lançar notas</a><header class="cabecalho"><div><h1>Sugestões</h1><p>Sugestões de outros avaliadores para jovens dos seus grupos</p></div></header>' +
      (minhas.length ? minhas.map(function (s) { return linha(s, true); }).join('') : '<div class="card vazio">Nenhuma sugestão aguardando sua decisão.</div>') +
      (enviadas.length ? '<span class="lbl" style="margin-top:8px">Sugestões que você enviou</span>' + enviadas.map(function (s) { return linha(s, false); }).join('') : '');
    function decidir(id, aprovar) {
      if (!navigator.onLine) { ui.toast('Conecte-se à internet para decidir sugestões.', 'erro'); return; }
      var feito = async function (motivo) {
        try {
          await dados.avaliacao.decidirSugestao(id, aprovar, motivo);
          var novo = OFF.guardarTurma(await dados.avaliacao.baixarTurma(snap.turma.id));
          ui.toast(aprovar ? 'Sugestão aprovada: a nota foi atualizada.' : 'Sugestão negada.', 'ok'); window.CF.avaliarSugestoes(area, ctx, novo);
        } catch (e) { ui.toast(api.traduzErro(e), 'erro'); }
      };
      if (aprovar) { feito(null); return; }
      ui.janela({ titulo: 'Negar sugestão', confirmarDescarte: false, corpo: '<label class="campo"><span>Motivo (opcional)</span><input class="entrada" id="ng-m" maxlength="200"></label>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Negar', principal: true, aoClicar: function (f) { feito(ui.maiusculas(f.querySelector('#ng-m').value.trim())); return true; } }] });
    }
    if (window.CF.barraSync) window.CF.barraSync(area);
    area.querySelectorAll('[data-apr]').forEach(function (b) { b.addEventListener('click', function () { decidir(b.getAttribute('data-apr'), true); }); });
    area.querySelectorAll('[data-neg]').forEach(function (b) { b.addEventListener('click', function () { decidir(b.getAttribute('data-neg'), false); }); });
  };
})();
