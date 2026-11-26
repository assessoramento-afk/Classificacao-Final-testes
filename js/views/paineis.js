/* =====================================================================
   Classificação Final · paineis.js (4.27.0)
   Tela "Painéis": abas Coordenação · Diretoria · Financiadores · Gráficos.
   A aba Gráficos usa a tela de gráficos que já existia.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc, sb = window.CF.sb;
  var graficos = window.CF.telas.painel;   // tela antiga de gráficos
  var ABAS = [['coord', 'Coordenação'], ['dir', 'Diretoria', 1], ['fin', 'Financiadores', 1], ['graf', 'Gráficos']];
  function q(p) { return p.then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; }); }
  function talvez(p) { return p.then(function (x) { return x; }, function () { return null; }); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hm(x) { return String(x || '').slice(0, 5); }
  function dataBR(x) { var s = String(x || '').slice(0, 10).split('-'); return s.length === 3 ? s[2] + '/' + s[1] + '/' + s[0] : ''; }
  var DS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  window.CF.telas.painel = function (area, ctx) {
    var aba = 'coord'; try { aba = localStorage.getItem('cf_painel_aba') || 'coord'; } catch (e) {}
    area.innerHTML = '<header class="cabecalho"><div><h1>Painéis</h1><p>Números do Projeto Gol Jovens Talentos para cada público</p></div></header>' +
      '<nav class="pn-abas" role="tablist">' + ABAS.map(function (a) { return '<button type="button" role="tab" data-pa="' + a[0] + '">' + a[1] + (a[2] ? '<em>em breve</em>' : '') + '</button>'; }).join('') + '</nav><div id="pn-c"></div>';
    function ir(a) {
      aba = a; try { localStorage.setItem('cf_painel_aba', a); } catch (e) {}
      area.querySelectorAll('[data-pa]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pa') === a); });
      var c = area.querySelector('#pn-c');
      if (a === 'graf') { c.innerHTML = ''; graficos(c, ctx); var h = c.querySelector('.cabecalho'); if (h) h.remove(); return; }
      if (a === 'coord') { coordenacao(c, ctx); return; }
      c.innerHTML = '<section class="card bloco"><p class="dica">Este painel entra na próxima etapa.</p></section>';
    }
    area.querySelectorAll('[data-pa]').forEach(function (b) { b.addEventListener('click', function () { ir(b.getAttribute('data-pa')); }); });
    ir(aba);
  };

  /* ---------------- Coordenação ---------------- */
  async function coordenacao(box, ctx) {
    var admin = ctx && ctx.perfil && ctx.perfil.perfil === 'admin';
    var st = { per: 'hoje', emp: '' }; try { st.per = localStorage.getItem('cf_pc_per') || 'hoje'; } catch (e) {}
    box.innerHTML = '<div class="girando" style="margin:40px auto"></div>';
    var r = await Promise.all([
      talvez(window.CF.dados.agenda.carregarTudo()),
      talvez(q(sb.from('grupo_avaliadores').select('turma_id, avaliador_id'))),
      talvez(q(sb.rpc('equipe_nomes'))),
      admin ? talvez(q(sb.rpc('acomp_listar', { p_proc: null }))) : Promise.resolve([]),
      talvez(q(sb.from('tablet_resultados').select('id, participacao_id, teste_id').eq('situacao', 'conflito'))),
      talvez(q(sb.from('tablet_fotos').select('id').is('decidido_por', null))),
      talvez(q(sb.from('jovem_correcoes').select('id').is('resolvido_por', null))),
      talvez(q(sb.from('tablets').select('id, nome, etiqueta, ativo, ligado_em, estado, estado_em, versao_app').order('nome'))),
      talvez(q(sb.rpc('painel_notas_faltando'))),
      talvez(q(sb.from('participacoes').select('id, turma_id, processo_id')))
    ]);
    var ag = r[0] || { dias: [], turmas: [], processos: [], empresas: [] }, ga = r[1] || [], eq = r[2] || [], ac = r[3] || [], conf = r[4] || [], fotos = r[5] || [], corr = r[6] || [];
    var tabs = r[7], falt = r[8] || [], parts = r[9] || [];
    var nomesUso = {};
    var ids = (tabs || []).map(function (x) { return x.estado && x.estado.participacao_id; }).filter(Boolean);
    if (ids.length) { var pj = await talvez(q(sb.from('participacoes').select('id, jovens(nome)').in('id', ids))); (pj || []).forEach(function (x) { nomesUso[x.id] = (x.jovens || {}).nome || ''; }); }

    function emp(id) { var e = (ag.empresas || []).filter(function (x) { return x.id === id; })[0]; return e ? (e.nome_fantasia || e.razao_social || e.nome || '') : ''; }
    function proc(id) { return (ag.processos || []).filter(function (p) { return p.id === id; })[0] || {}; }
    function nomeEq(id) { var p = eq.filter(function (x) { return x.id === id; })[0]; return p ? String(p.nome || p.email || '').split(' ')[0] : ''; }
    function okEmp(pid) { return !st.emp || proc(pid).empresa_id === st.emp; }
    function desenhar() {
      var hoje = new Date(), h = iso(hoje), fimPer = new Date(hoje);
      fimPer.setDate(fimPer.getDate() + (st.per === 'hoje' ? 13 : st.per === 'semana' ? 13 : 30));
      var lim = iso(fimPer), semFim = new Date(hoje); semFim.setDate(hoje.getDate() + (7 - hoje.getDay()) % 7); var limSem = iso(semFim);
      // turmas com algum dia no período
      var turmas = (ag.turmas || []).map(function (t) {
        var ds = (ag.dias || []).filter(function (d) { return d.turma_id === t.id; }).sort(function (a, b) { return String(a.data) < String(b.data) ? -1 : 1; });
        var prox = ds.filter(function (d) { var x = String(d.data).slice(0, 10); return x >= h && x <= lim; })[0];
        return { t: t, d: prox, p: proc(t.processo_id) };
      }).filter(function (x) { return x.d && okEmp(x.t.processo_id) && ['montagem', 'andamento'].indexOf(x.p.situacao) >= 0; })
        .sort(function (a, b) { return String(a.d.data) < String(b.d.data) ? -1 : 1; });
      var nSemana = turmas.filter(function (x) { return String(x.d.data).slice(0, 10) <= limSem; }).length;
      // pendências
      var pend = [];
      var cf = conf.filter(function (c) { var p = parts.filter(function (y) { return y.id === c.participacao_id; })[0]; return !p || okEmp(p.processo_id); });
      if (cf.length) pend.push({ n: cf.length, cor: '#D9534F', t: 'Conflitos do tablet', s: 'O mesmo teste chegou de mais de um tablet ou já tinha nota lançada', h: '#/tablets', b: 'Resolver' });
      (ag.processos || []).filter(function (p) { return p.situacao === 'revisao' && okEmp(p.id) && p.revisao_em && (Date.now() - new Date(p.revisao_em)) > 3 * 864e5; }).forEach(function (p) {
        pend.push({ n: Math.floor((Date.now() - new Date(p.revisao_em)) / 864e5), un: 'dias', cor: '#D9534F', t: 'Processo parado em revisão', s: emp(p.empresa_id) + ' · ' + (p.vaga || ''), h: '#/processos/' + p.id, b: 'Abrir' });
      });
      falt.filter(function (f) { return okEmp(f.processo_id); }).forEach(function (f) {
        var t = (ag.turmas || []).filter(function (x) { return x.id === f.turma_id; })[0] || {};
        pend.push({ n: f.jovens, cor: '#e0a100', t: 'Notas faltando', s: (t.nome || 'Turma') + ' · ' + emp(proc(f.processo_id).empresa_id) + ' · ' + f.jovens + ' jovem(ns) · ' + f.faltam + ' nota(s)', h: '#/avaliar/' + f.turma_id, b: 'Avaliar' });
      });
      if (fotos.length) pend.push({ n: fotos.length, cor: '#e0a100', t: 'Fotos para aprovar', s: 'Tiradas pelos tablets', h: '#/tablets', b: 'Ver' });
      if (corr.length) pend.push({ n: corr.length, cor: '#8b6fd6', t: 'Pedidos de correção de cadastro', s: 'Jovens marcaram algo errado no tablet', h: '#/cadastros/jovens', b: 'Corrigir' });
      var urg = pend.filter(function (x) { return x.cor === '#D9534F'; }).length, nPend = pend.length;
      // acompanhamentos
      var atr = {}, ven = {};
      ac.forEach(function (a) {
        if (!a.aprovado || !okEmp(a.processo_id) || !window.CF.acomp) return;
        window.CF.acomp.marcos(a).forEach(function (m) {
          var k = m.marco + '|' + (a.empresa_id || proc(a.processo_id).empresa_id);
          if (m.estado === 'atrasada') { atr[k] = atr[k] || { m: m.marco, e: a.empresa_id || proc(a.processo_id).empresa_id, n: 0, lim: m.limite }; atr[k].n++; }
          else if (m.estado === 'pendente' || (m.estado === 'futura' && m.vence <= iso(new Date(Date.now() + 7 * 864e5)))) { ven[k] = ven[k] || { m: m.marco, e: a.empresa_id || proc(a.processo_id).empresa_id, n: 0, v: m.vence }; ven[k].n++; }
        });
      });
      var nAtr = Object.keys(atr).reduce(function (s, k) { return s + atr[k].n; }, 0);
      // tablets
      var tbUso = (tabs || []).filter(function (x) { return x.ativo && x.estado && x.estado.fase !== 'livre' && (Date.now() - new Date(x.estado_em || 0)) < 3 * 60000; });
      var tbSem = (tabs || []).filter(function (x) { return x.ativo && x.estado && x.estado.fase !== 'livre' && (Date.now() - new Date(x.estado_em || 0)) >= 3 * 60000; });
      var empresasLista = (ag.empresas || []).slice().sort(function (a, b) { return emp(a.id) < emp(b.id) ? -1 : 1; });
      var dataHoje = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

      box.innerHTML = '<div class="pc-cab"><div><h2>Coordenação · o que precisa de atenção</h2><p class="dica">' + esc(dataHoje) + '</p></div><button type="button" class="btn btn-pri" id="pc-pdf">' + ui.icone('impressora', 16) + 'Gerar relatório do mês (PDF)</button></div>' +
        '<div class="pt-filtros">' + [['hoje', 'Hoje'], ['semana', 'Esta semana'], ['mes', 'Este mês']].map(function (f) { return '<button type="button" class="pt-chip' + (st.per === f[0] ? ' on' : '') + '" data-per="' + f[0] + '">' + f[1] + '</button>'; }).join('') +
          '<select class="entrada" id="pc-emp" style="width:auto"><option value="">Todas as empresas</option>' + empresasLista.map(function (e) { return '<option value="' + e.id + '"' + (st.emp === e.id ? ' selected' : '') + '>' + esc(emp(e.id)) + '</option>'; }).join('') + '</select></div>' +
        '<div class="pc-kp">' +
          kp('#ee7330', nSemana, 'turmas esta semana', (turmas.length - nSemana) + ' depois') +
          kp('#D9534F', nPend, 'pendências', urg ? urg + ' urgente(s)' : 'nenhuma urgente') +
          kp('#e0a100', nAtr, 'acompanhamentos atrasados', Object.keys(atr).map(function (k) { return atr[k].n + ' de ' + atr[k].m + ' meses'; }).slice(0, 2).join(' · ') || 'tudo em dia') +
          kp('#2f6fd0', tabs ? tbUso.length : '—', 'tablets em uso agora', tabs ? (tbSem.length + ' sem sinal') : 'sem acesso aos tablets') + '</div>' +
        '<div class="pc-gr"><div>' +
          '<section class="pc-card"><h3>Precisa de atenção <span>toque para resolver</span></h3>' + (pend.length ? pend.map(function (x) {
            return '<a class="pc-it" href="' + x.h + '" style="--c:' + x.cor + '"><span class="pc-n">' + x.n + '</span><div><b>' + esc(x.t) + (x.un ? ' há ' + x.n + ' ' + x.un : '') + '</b><small>' + esc(x.s) + '</small></div><span class="pc-vai">' + x.b + ' ›</span></a>'; }).join('') : '<p class="pc-ok">✓ Nada pendente agora.</p>') + '</section>' +
          (admin ? '<section class="pc-card"><h3>Prazos de acompanhamento <span>empresas informam a situação do jovem</span></h3>' +
            (Object.keys(atr).length + Object.keys(ven).length ? Object.keys(atr).map(function (k) { var x = atr[k]; return '<a class="pc-it" href="#/acompanhamento" style="--c:#D9534F"><span class="pc-n">' + x.n + '</span><div><b>' + x.m + ' meses · atrasado</b><small>' + esc(emp(x.e)) + ' · prazo encerrou em ' + dataBR(x.lim) + '</small></div><span class="pc-vai">Cobrar ›</span></a>'; }).join('') +
              Object.keys(ven).map(function (k) { var x = ven[k]; return '<a class="pc-it" href="#/acompanhamento" style="--c:#e0a100"><span class="pc-n">' + x.n + '</span><div><b>' + x.m + ' meses · vence em breve</b><small>' + esc(emp(x.e)) + ' · ' + dataBR(x.v) + '</small></div><span class="pc-vai">Ver ›</span></a>'; }).join('')
              : '<p class="pc-ok">✓ Nenhum prazo atrasado ou vencendo.</p>') + '</section>' : '') +
        '</div><div>' +
          '<section class="pc-card"><h3>Turmas ' + (st.per === 'mes' ? 'dos próximos 30 dias' : 'desta semana e da próxima') + ' <span>avaliadores</span></h3>' + (turmas.length ? turmas.map(function (x) {
            var d = new Date(String(x.d.data).slice(0, 10) + 'T12:00:00'), av = ga.filter(function (g) { return g.turma_id === x.t.id; }).map(function (g) { return nomeEq(g.avaliador_id); }).filter(Boolean);
            var nj = parts.filter(function (p) { return p.turma_id === x.t.id; }).length;
            var hor = x.d.hora_inicio ? hm(x.d.hora_inicio) + ' – ' + hm(x.d.hora_fim) : (window.CF.datas && window.CF.datas.horario ? window.CF.datas.horario() : '');
            return '<a class="pc-tu" href="#/avaliar/' + x.t.id + '"><span class="pc-dt"><small>' + DS[d.getDay()] + '</small><b>' + ('0' + d.getDate()).slice(-2) + '</b></span><div><b>' + esc(x.t.nome) + ' · ' + esc(emp(x.p.empresa_id) || 'Escola') + '</b><small>' + esc(x.p.vaga || '') + (hor ? ' · ' + esc(hor) : '') + ' · ' + nj + ' jovem(ns)</small>' +
              (av.length ? '<span class="pc-tg ok">' + esc(av.join(', ')) + '</span>' : '<span class="pc-tg al">sem avaliador</span>') + '</div></a>'; }).join('') : '<p class="pc-ok">Nenhuma turma no período.</p>') + '</section>' +
          (tabs ? '<section class="pc-card"><h3>Tablets agora <span>atualiza sozinho</span></h3><div class="pc-tbs">' + tabs.filter(function (x) { return x.ativo && x.ligado_em; }).map(function (x) {
            var e = x.estado || {}, velho = (Date.now() - new Date(x.estado_em || 0)) >= 3 * 60000, uso = e.fase && e.fase !== 'livre';
            var cor = !e.fase ? '#c9c0bb' : uso ? (velho ? '#8a8486' : '#ee7330') : '#2f9a5b', nome = (nomesUso[e.participacao_id] || '').split(' ')[0];
            var txt = !e.fase ? 'sem informação' : uso ? (velho ? 'Sem sinal' : (nome ? nome.charAt(0) + nome.slice(1).toLowerCase() : 'Em uso') + (e.fase === 'teste' && e.fim_previsto ? ' · <span data-fim="' + esc(e.fim_previsto) + '"></span>' : '')) : 'Livre';
            var num = String(x.etiqueta || x.nome.replace(/\D/g, '') || '?').replace(/[^0-9A-Za-z]/g, '').slice(0, 3);
            return '<a class="pc-tb' + (!e.fase ? ' pc-tb-sem' : '') + '" href="#/tablets" style="--c:' + cor + '"' + (!e.fase ? ' title="Este tablet ainda não informou como está. Abra o app (versão 1.11 ou mais nova) para atualizar."' : '') + '><b>' + esc(num) + '</b><small>' + txt + '</small></a>'; }).join('') + '</div>' +
            '<div class="pc-leg"><span><i style="background:#ee7330"></i>em uso</span><span><i style="background:#2f9a5b"></i>livre</span><span><i style="background:#8a8486"></i>sem sinal</span><span><i style="background:#c9c0bb"></i>sem informação (abra o app para atualizar)</span></div></section>' : '') +
        '</div></div>';
      contar();
      box.querySelectorAll('[data-per]').forEach(function (b) { b.addEventListener('click', function () { st.per = b.getAttribute('data-per'); try { localStorage.setItem('cf_pc_per', st.per); } catch (e) {} desenhar(); }); });
      box.querySelector('#pc-emp').addEventListener('change', function () { st.emp = this.value; desenhar(); });
      box.querySelector('#pc-pdf').addEventListener('click', function () { relatorio(pend, turmas, atr, nAtr, tbUso.length); });
    }
    function kp(cor, n, rot, sub) { return '<div class="pc-k" style="--c:' + cor + '"><b>' + n + '</b><span>' + rot + '</span><small>' + esc(sub) + '</small></div>'; }
    function contar() { box.querySelectorAll('[data-fim]').forEach(function (e) { var s2 = Math.max(0, Math.round((new Date(e.getAttribute('data-fim')) - Date.now()) / 1000)); e.textContent = Math.floor(s2 / 60) + ':' + ('0' + s2 % 60).slice(-2); }); }
    function relatorio(pend, turmas, atr, nAtr, nUso) {
      var hoje = new Date(), mes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      var w = window.open('', '_blank'); if (!w) { ui.toast('Libere as janelas do navegador para gerar o relatório.', 'erro'); return; }
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Relatório da Coordenação · ' + esc(mes) + '</title><style>body{font-family:Arial,sans-serif;color:#231f1f;margin:28px}h1{margin:0;font-size:20px}h2{font-size:14px;margin:18px 0 6px;color:#d9631f}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}.k{display:inline-block;margin:6px 16px 0 0}.k b{font-size:20px;display:block}small{color:#777}</style></head><body>' +
        '<h1>Projeto Gol Jovens Talentos · Relatório da Coordenação</h1><small>' + esc(mes) + ' · gerado em ' + hoje.toLocaleString('pt-BR') + '</small>' +
        '<div><span class="k"><b>' + turmas.length + '</b>turmas no período</span><span class="k"><b>' + pend.length + '</b>tipos de pendência</span><span class="k"><b>' + nAtr + '</b>acompanhamentos atrasados</span><span class="k"><b>' + nUso + '</b>tablets em uso</span></div>' +
        '<h2>Pendências</h2><table>' + (pend.length ? pend.map(function (x) { return '<tr><td>' + esc(x.t) + '</td><td>' + esc(x.s) + '</td><td>' + x.n + (x.un ? ' ' + x.un : '') + '</td></tr>'; }).join('') : '<tr><td>Nenhuma pendência.</td></tr>') + '</table>' +
        '<h2>Turmas</h2><table><tr><th>Data</th><th>Turma</th><th>Empresa · vaga</th></tr>' + turmas.map(function (x) { return '<tr><td>' + dataBR(String(x.d.data).slice(0, 10)) + '</td><td>' + esc(x.t.nome) + '</td><td>' + esc(emp(x.p.empresa_id)) + ' · ' + esc(x.p.vaga || '') + '</td></tr>'; }).join('') + '</table>' +
        '<h2>Acompanhamentos atrasados</h2><table>' + (Object.keys(atr).length ? Object.keys(atr).map(function (k) { var x = atr[k]; return '<tr><td>' + x.m + ' meses</td><td>' + esc(emp(x.e)) + '</td><td>' + x.n + '</td></tr>'; }).join('') : '<tr><td>Nenhum.</td></tr>') + '</table>' +
        '<script>setTimeout(function(){print()},300)<\/script></body></html>');
      w.document.close();
    }
    desenhar();
    // atualiza sozinho: a cada 60 s (só com a aba aberta) e o tempo dos tablets a cada segundo
    var tA = setInterval(async function () {
      if (!document.body.contains(box)) { clearInterval(tA); clearInterval(tS); return; }
      if (document.hidden) return;
      var nt = await talvez(q(sb.from('tablets').select('id, nome, etiqueta, ativo, ligado_em, estado, estado_em, versao_app').order('nome')));
      if (nt) { tabs = nt; desenhar(); }
    }, 60000);
    var tS = setInterval(contar, 1000);
  }
})();
