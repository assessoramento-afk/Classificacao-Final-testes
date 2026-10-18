/* =====================================================================
   Classificação Final · views/configuracoes.js
   Configurações (somente administrador), em cards:
   Pessoas e empresas · Banco de testes · Padrões do sistema.
   Endereços: #/config, #/config/empresas, #/config/notas etc.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var TEXTO_PADRAO = 'A Kolping Estadual de São Paulo agradece à {empresa} pela confiança e pela parceria neste processo seletivo para a vaga de {vaga}.\n\n' +
    'Juntos, abrimos portas para que jovens deem o primeiro passo no mundo do trabalho, com oportunidade, preparo e dignidade.';
  var ICONES = {
    permissoes: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.5"/>',
    empresas: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    avaliadores: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    areas: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    testes: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
    competencias: '<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21l1.4-7L2 9.3l7-.8z"/>',
    notas: '<path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>',
    prereserva: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    agradecimento: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/>',
    saude: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    modelos: '<rect x="4" y="3" width="12" height="16" rx="1.5"/><path d="M8 7h5M8 11h5"/><rect x="9" y="8" width="11" height="13" rx="1.5"/>',
    termo: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 13h6M10 17h4"/>',
    materiais: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'
  };
  function icone(n, t) { return '<svg width="' + (t || 22) + '" height="' + (t || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONES[n] + '</svg>'; }
  function seta() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'; }
  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function fmt(n) { return n == null ? '' : Number(n).toFixed(2).replace('.', ','); }
  function numero(v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function subAtual() { var m = (window.location.hash || '').match(/^#\/config\/([a-z]+)/); return m ? m[1] : null; }
  function cabecalho(titulo, sub) {
    return '<a class="voltar" href="#/config">← Configurações</a><header class="cabecalho"><div><h1>' + esc(titulo) + '</h1><p>' + esc(sub) + '</p></div></header>';
  }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.config = function (area, ctx) {
    var sub = subAtual();
    if (sub && ['empresas', 'avaliadores', 'areas', 'testes', 'competencias', 'materiais'].indexOf(sub) >= 0) { window.CF.configPaginas.render(area, sub, ctx); return; }
    if (sub === 'notas') return paginaNotas(area);
    if (sub === 'prereserva') return paginaPreReserva(area);
    if (sub === 'agradecimento') return paginaAgradecimento(area);
    if (sub === 'termo') return paginaTermo(area);
    if (sub === 'modelos') return paginaModelos(area);
    if (sub === 'saude') return paginaSaude(area);
    if (sub === 'permissoes') return window.CF.telas.permissoes(area);
    paginaInicial(area);
  };

  /* ---------- Página inicial em cards ---------- */
  function card(chave, cor, titulo, resumo, badge) {
    return '<a class="cfg" href="#/config/' + chave + '" style="--cor:var(--c-' + cor + ')" data-card="' + chave + '">' + (badge ? '<span class="badge" aria-label="' + badge + ' pendente(s)">' + badge + '</span>' : '') +
      '<span class="ic">' + icone(chave) + '</span><div><b>' + esc(titulo) + '</b><small>' + resumo + '</small></div><span class="vai">' + seta() + '</span></a>';
  }
  async function paginaInicial(area) {
    area.innerHTML = '<header class="cabecalho"><div><h1>Configurações</h1><p>Tudo o que prepara o sistema: empresas, equipe, banco de testes e padrões dos processos</p></div></header><div id="cfg-cards"><div class="girando" style="margin:30px auto"></div></div>';
    var r = await Promise.all([
      dados.empresas.listar().catch(function () { return []; }), dados.pessoas.listar().catch(function () { return []; }),
      dados.banco.carregarTudo().catch(function () { return null; }), dados.config.carregar().catch(function () { return null; })
    ]);
    var emp = r[0], pes = r[1], b = r[2], cfg = r[3];
    var empAtivas = emp.filter(function (e) { return e.ativa; }).length;
    var comAcesso = pes.filter(function (p) { return p.aprovado && p.ativo; }).length, pend = pes.filter(function (p) { return !p.aprovado && p.ativo; }).length;
    var resumoBanco = { areas: '', testes: '', competencias: '', materiais: '' };
    if (b) {
      var nAreas = b.areas.filter(function (a) { return a.ativa; }).length;
      var testesAt = b.testes.filter(function (t) { return t.ativo; });
      var semComp = testesAt.filter(function (t) { return !b.criterios.some(function (c) { return c.teste_id === t.id && c.competencia_id; }); }).length;
      var compAt = b.competencias.filter(function (c) { return c.ativa; });
      var compSem = compAt.filter(function (c) { return !b.criterios.some(function (x) { return x.competencia_id === c.id; }); }).length;
      resumoBanco.areas = nAreas + (nAreas === 1 ? ' área' : ' áreas') + ' no radar';
      resumoBanco.testes = testesAt.length + ' testes' + (semComp ? ' · ' + semComp + ' sem competências' : '');
      resumoBanco.competencias = compAt.length + ' competências' + (compSem ? ' · ' + compSem + ' sem testes' : '');
      var nMat = (b.materiais || []).filter(function (m) { return m.ativo; }).length, tComMat = {}; (b.testeMateriais || []).forEach(function (m) { tComMat[m.teste_id] = 1; });
      resumoBanco.materiais = nMat + (nMat === 1 ? ' material' : ' materiais') + ' · ' + Object.keys(tComMat).length + ' testes com lista';
    }
    area.querySelector('#cfg-cards').innerHTML =
      '<section class="grupo"><h2>Pessoas e empresas</h2><div class="cards-cfg">' +
        card('empresas', 'empresa', 'Empresas', empAtivas + (empAtivas === 1 ? ' empresa ativa' : ' empresas ativas')) +
        card('avaliadores', 'aval', 'Avaliadores', comAcesso + (comAcesso === 1 ? ' pessoa' : ' pessoas') + ' com acesso' + (pend ? ' · ' + pend + ' aguardando aprovação' : ''), pend || '') +
        (window.CF.perm && window.CF.perm.dono() ? card('permissoes', 'aval', 'Permissões', 'O que cada pessoa da equipe e as empresas podem fazer' + (pend ? ' · ' + pend + ' aguardando liberação' : ''), pend || '') : '') + '</div></section>' +
      '<section class="grupo"><h2>Banco de testes</h2><div class="cards-cfg">' +
        card('areas', 'area', 'Áreas', resumoBanco.areas) + card('testes', 'teste', 'Testes', resumoBanco.testes) + card('competencias', 'comp', 'Competências', resumoBanco.competencias) + card('materiais', 'mat', 'Materiais', resumoBanco.materiais) + '</div></section>' +
      '<section class="grupo"><h2>Padrões do sistema</h2><div class="cards-cfg">' +
        card('notas', 'padrao', 'Notas de corte', cfg ? 'Aprovado ' + fmt(cfg.corte_aprovado) + ' · Backup ' + fmt(cfg.corte_backup) : '') +
        card('prereserva', 'padrao', 'Pré-reserva da agenda', cfg ? 'Prazo ' + cfg.prazo_pre_reserva_dias + ' dias · aviso ' + cfg.aviso_pre_reserva_dias + ' dia' + (cfg.aviso_pre_reserva_dias === 1 ? '' : 's') + ' antes' : '') +
        '</div></section>' +
      '<section class="grupo"><h2>Documentos</h2><div class="cards-cfg">' +
        card('agradecimento', 'padrao', 'Texto do agradecimento', 'Página 2 do PDF do processo') + card('termo', 'padrao', 'Termo de consentimento', 'Texto do jovem e do responsável') + card('modelos', 'padrao', 'Modelos de documentos', 'Padrão de cada documento impresso') + '</div></section>' +
      '<section class="grupo"><h2>Sistema</h2><div class="cards-cfg">' +
        card('saude', 'padrao', 'Saúde do sistema', 'Uso do Supabase, erros, envios e manutenção') + '</div></section>';
  }

  /* ---------- Notas de corte ---------- */
  async function paginaNotas(area) {
    var cfg = await dados.config.carregar();
    area.innerHTML = cabecalho('Notas de corte', 'Valores padrão usados em todo processo novo') +
      '<section class="card bloco bloco-padrao"><div class="form-grade">' +
        '<label class="campo" for="n-ap"><span>Aprovado a partir de</span><input class="entrada entrada-grande" id="n-ap" inputmode="decimal" value="' + fmt(cfg.corte_aprovado) + '"></label>' +
        '<label class="campo" for="n-bk"><span>Backup a partir de</span><input class="entrada entrada-grande" id="n-bk" inputmode="decimal" value="' + fmt(cfg.corte_backup) + '"></label></div>' +
        '<div id="regua"></div>' +
        '<p class="dica" style="margin:0">Cada processo copia estes valores quando é criado e pode ajustá-los até a primeira nota ser lançada. Depois disso, ficam travados naquele processo.</p>' +
        '<div class="botoes-fim"><button type="button" class="btn" id="n-padrao">Voltar ao padrão (3,50 e 3,30)</button><button type="button" class="btn btn-pri" id="n-salvar">Salvar</button></div></section>';
    var ap = area.querySelector('#n-ap'), bk = area.querySelector('#n-bk');
    function desenhar() { window.CF.desenharRegua(area.querySelector('#regua'), numero(ap.value), numero(bk.value)); }
    ap.addEventListener('input', desenhar); bk.addEventListener('input', desenhar);
    area.querySelector('#n-padrao').addEventListener('click', function () { ap.value = '3,50'; bk.value = '3,30'; desenhar(); });
    area.querySelector('#n-salvar').addEventListener('click', function (ev) {
      var a = numero(ap.value), k = numero(bk.value);
      if (a == null || k == null || a < 1 || a > 5 || k < 1 || k > 5) { ui.toast('Use valores entre 1 e 5.', 'erro'); return; }
      if (k > a) { ui.toast('O backup precisa ser menor ou igual ao aprovado.', 'erro'); return; }
      ui.executar(ev.currentTarget, 'Salvando…', async function () {
        try { await dados.config.salvar({ corte_aprovado: Math.round(a * 100) / 100, corte_backup: Math.round(k * 100) / 100 }); ui.toast('Notas de corte salvas.', 'ok'); }
        catch (x) { erro(x); }
      });
    });
    desenhar();
  }

  // Régua das notas de corte (usada aqui e no Novo processo)
  window.CF.desenharRegua = function (box, a, k) {
    function pct(v) { return Math.max(0, Math.min(100, (v - 1) / 4 * 100)); }
    var ok = a != null && k != null && a >= 1 && a <= 5 && k >= 1 && k <= 5 && k <= a;
    if (!ok) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>Use valores entre 1 e 5, com o backup menor ou igual ao aprovado.</span></div>'; return false; }
    var ka = fmt(k), aa = fmt(a), ab = fmt(Math.max(k, a - 0.01));
    box.innerHTML = '<div class="regua"><div class="trilho"><div class="r" style="width:' + pct(k) + '%"></div><div class="b" style="width:' + (pct(a) - pct(k)) + '%"></div><div class="a" style="flex:1"></div></div>' +
      '<div class="marca esq" style="left:calc(6px + (100% - 12px) * ' + (pct(k) / 100) + ')"><span>' + ka + '</span><i></i></div>' +
      '<div class="marca dir" style="left:calc(6px + (100% - 12px) * ' + (pct(a) / 100) + ')"><span>' + aa + '</span><i></i></div>' +
      '<div class="ticks">' + [1, 2, 3, 4, 5].map(function (v) { return '<span style="left:' + pct(v) + '%">' + v + '</span>'; }).join('') + '</div></div>' +
      '<div class="faixas">' +
        '<div class="faixa-c" style="--cf:var(--erro)"><span class="bol"><i></i></span><div><b>Reprovado</b><small>abaixo de ' + ka + '</small></div></div>' +
        '<div class="faixa-c" style="--cf:var(--backup)"><span class="bol"><i></i></span><div><b>Backup</b><small>' + (a === k ? 'sem faixa de backup' : 'de ' + ka + ' a ' + ab) + '</small></div></div>' +
        '<div class="faixa-c" style="--cf:var(--ok)"><span class="bol"><i></i></span><div><b>Aprovado</b><small>' + aa + ' ou mais</small></div></div></div>';
    return true;
  };

  /* ---------- Pré-reserva ---------- */
  async function paginaPreReserva(area) {
    var cfg = await dados.config.carregar();
    area.innerHTML = cabecalho('Pré-reserva da agenda', 'Prazo para a empresa confirmar a data') +
      '<section class="card bloco bloco-padrao"><div class="form-grade">' +
        '<label class="campo" for="p-prazo"><span>Prazo padrão para confirmar (dias)</span><input class="entrada entrada-grande" id="p-prazo" type="number" min="1" max="90" value="' + cfg.prazo_pre_reserva_dias + '"></label>' +
        '<label class="campo" for="p-aviso"><span>Avisar antes do vencimento (dias)</span><input class="entrada entrada-grande" id="p-aviso" type="number" min="0" max="30" value="' + cfg.aviso_pre_reserva_dias + '"></label></div>' +
        '<div id="p-exemplo"></div><p class="dica" style="margin:0">O prazo pode ser ajustado em cada pré-reserva.</p>' +
        '<div class="botoes-fim"><button type="button" class="btn btn-pri" id="p-salvar">Salvar</button></div></section>';
    var pz = area.querySelector('#p-prazo'), av = area.querySelector('#p-aviso');
    function data(d) { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
    function exemplo() {
      var p = parseInt(pz.value, 10), a = parseInt(av.value, 10), box = area.querySelector('#p-exemplo');
      if (isNaN(p) || isNaN(a) || p < 1 || p > 90 || a < 0 || a > 30 || a >= p) { box.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>O prazo vai de 1 a 90 dias, e o aviso precisa ser menor que o prazo.</span></div>'; return; }
      var hoje = new Date(), vence = new Date(hoje), aviso = new Date(hoje);
      vence.setDate(hoje.getDate() + p); aviso.setDate(vence.getDate() - a);
      box.innerHTML = '<div class="aviso aviso-info"><span>Exemplo: uma pré-reserva feita hoje (' + data(hoje) + ') vence em <b>' + data(vence) + '</b>. ' +
        (a ? 'O aviso aparece no painel em <b>' + data(aviso) + '</b>, e no' : 'No') + ' dia do vencimento ela fica marcada como "vencida", sem liberar o dia, até você decidir.</span></div>';
    }
    pz.addEventListener('input', exemplo); av.addEventListener('input', exemplo);
    area.querySelector('#p-salvar').addEventListener('click', function (ev) {
      var p = parseInt(pz.value, 10), a = parseInt(av.value, 10);
      if (isNaN(p) || isNaN(a) || p < 1 || p > 90 || a < 0 || a > 30 || a >= p) { ui.toast('O prazo vai de 1 a 90 dias, e o aviso precisa ser menor que o prazo.', 'erro'); return; }
      ui.executar(ev.currentTarget, 'Salvando…', async function () {
        try { await dados.config.salvar({ prazo_pre_reserva_dias: p, aviso_pre_reserva_dias: a }); ui.toast('Prazo da pré-reserva salvo.', 'ok'); }
        catch (x) { erro(x); }
      });
    });
    exemplo();
  }

  /* ---------- Saúde do sistema ---------- */
  function mb(bytes) { var m = bytes / 1048576; return m >= 1024 ? (m / 1024).toFixed(2).replace('.', ',') + ' GB' : (m < 10 ? m.toFixed(1) : Math.round(m)).toString().replace('.', ',') + ' MB'; }
  function barraUso(rotulo, bytes, limiteMb) {
    var pct = limiteMb ? bytes * 100 / (limiteMb * 1048576) : 0, cls = pct >= 95 ? 'uso-verm' : (pct >= 80 ? 'uso-amar' : 'uso-verde');
    return '<div class="uso-l"><b>' + rotulo + '</b><div class="uso-barra ' + cls + '"><i style="width:' + Math.min(100, pct).toFixed(1) + '%"></i></div><span class="' + cls + '-tx">' + mb(bytes) + ' de ' + mb(limiteMb * 1048576) + ' · ' + Math.round(pct) + '%</span></div>';
  }
  async function paginaSaude(area) {
    area.innerHTML = cabecalho('Saúde do sistema', 'Só para administradores · atualizado ao abrir esta tela') + '<div id="sd"><div class="girando" style="margin:30px auto"></div></div>';
    var cab = area.querySelector('.cabecalho');
    cab.insertAdjacentHTML('beforeend', '<div class="botoes-topo"><button type="button" class="btn" id="sd-atual">⟳ Atualizar</button><button type="button" class="btn" id="sd-manut">🛠 Modo manutenção</button></div>');
    var sd, cfg;
    async function carregar() {
      try { var r = await Promise.all([dados.saude.carregar(window.CF_CONFIG.versao), dados.config.carregar()]); sd = r[0]; cfg = r[1]; desenhar(); }
      catch (e) { area.querySelector('#sd').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + ' (o script 24 já foi rodado no Supabase?)</span></div>'; }
    }
    function desenhar() {
      var u = sd.uso || {}, c = sd.conferencia || {}, ref = (window.CF_CONFIG.supabaseUrl.match(/https:\/\/([a-z0-9]+)\./) || [])[1];
      var pb = u.banco_bytes / (u.limite_banco_mb * 1048576), pa = u.arquivos_bytes / (u.limite_arquivos_mb * 1048576);
      var m = sd.manutencao || {};
      area.querySelector('#sd').innerHTML =
        (m.ativo ? '<div class="aviso aviso-info">🛠<span><b>Modo manutenção ligado</b>' + (m.bloquear ? ' · lançamentos bloqueados para os avaliadores' : '') + ': “' + esc(m.mensagem || '') + '”</span></div>' : '') +
        '<section class="card bloco sd-bloco"><span class="lbl">Uso do Supabase · plano gratuito</span>' +
          barraUso('Banco de dados', u.banco_bytes, u.limite_banco_mb) + barraUso('Fotos e arquivos', u.arquivos_bytes, u.limite_arquivos_mb) +
          ((pb >= 0.8 || pa >= 0.8) ? '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + (pb >= 0.8 ? 'O <b>banco de dados</b> passou de 80%: acima de 500 MB o plano gratuito fica somente leitura (o sistema para de gravar). ' : '') + (pa >= 0.8 ? 'As <b>fotos e arquivos</b> passaram de 80%: considere apagar fotos de processos antigos. ' : '') + 'Planeje a limpeza ou a troca de plano.</span></div>' : '') +
          '<details><summary class="dica">O que mais ocupa espaço</summary><div class="sd-tab">' + (u.tabelas || []).map(function (t) { return '<span>' + esc(t.tabela) + '</span><b>' + mb(t.bytes) + '</b>'; }).join('') +
            Object.keys(u.por_bucket || {}).map(function (b) { return '<span>arquivos · ' + esc(b) + '</span><b>' + mb(u.por_bucket[b]) + '</b>'; }).join('') + '</div></details>' +
          '<p class="dica" style="margin:0">O tráfego de dados (5 GB por mês no plano gratuito) só aparece no painel do Supabase: ' + (ref ? '<a href="https://supabase.com/dashboard/project/' + ref + '" target="_blank" rel="noopener">abrir painel</a>' : 'abra o painel') + '. ' +
          '<button type="button" class="btn-link" id="sd-lim">Ajustar limites do plano</button></p></section>' +
        '<section class="card bloco sd-bloco"><span class="lbl">Erros · ' + sd.erros_hoje + ' hoje · ' + sd.erros_novos + ' novo(s)</span>' +
          ((sd.erros || []).length ? (sd.erros || []).map(function (g, i) {
            return '<div class="sd-item' + (g.novo ? ' novo' : '') + (g.voltou ? ' sd-voltou' : '') + '"><div class="sd-tx"><b>' + esc(g.mensagem) + '</b>' + (g.voltou ? '<span class="sd-volta">voltou depois de resolvido</span>' : '') + '<small>' + g.vezes + ' vez(es) · ' + g.aparelhos + ' aparelho(s)' + (g.tipos_aparelho ? ' (' + esc(g.tipos_aparelho) + ')' : '') + ' · tela ' + esc(g.tela || '?') + ' · versão ' + esc(g.versoes || '?') + (g.voltou ? ' · resolvido em ' + new Date(g.resolvido_em).toLocaleDateString('pt-BR') + (g.resolvido_versao ? ' (versão ' + esc(g.resolvido_versao) + ')' : '') : '') + ' · último ' + new Date(g.ultimo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</small></div>' +
              '<div class="acoes"><button type="button" class="btn btn-p" data-det="' + i + '">Ver detalhes</button><button type="button" class="btn btn-pri btn-p" data-rel="' + i + '">📋 Copiar relatório para o Claude</button><button type="button" class="btn btn-p" data-res="' + i + '">✓ Marcar como resolvido</button></div></div>';
          }).join('') + (sd.erros_novos ? '<button type="button" class="btn-link" id="sd-vistos">Marcar todos como vistos</button>' : '') : '<p class="dica" style="margin:0">✓ Nenhum erro em aberto nos últimos 30 dias.</p>') +
          (sd.erros_resolvidos ? '<button type="button" class="btn-link" id="sd-resolvidos">Ver resolvidos (' + sd.erros_resolvidos + ')</button>' : '') + '</section>' +
        '<section class="card bloco sd-bloco"><span class="lbl">Envios e aparelhos</span>' +
          (sd.recusados_hoje ? '<div class="sd-item"><div class="sd-tx"><b>' + sd.recusados_hoje + ' lançamento(s) recusado(s) hoje</b><small>' + (sd.recusas_motivos || []).map(function (x) { return esc(x.motivo) + ' (' + x.vezes + ')'; }).join(' · ') + '</small></div></div>' : '') +
          (sd.aparelhos_parados || []).map(function (a) { return '<div class="sd-item"><div class="sd-tx"><b>' + esc(a.pessoa) + ' · ' + esc(a.nome || 'aparelho') + ': ' + a.pendentes + ' item(ns) aguardando desde ' + new Date(a.desde).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</b><small>versão ' + esc(a.versao || '?') + ' · visto ' + new Date(a.visto_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' · peça para abrir o sistema com internet</small></div>' + ui.pill('⏳ parado', 'off') + '</div>'; }).join('') +
          (sd.versoes_antigas || []).map(function (a) { return '<div class="sd-item"><div class="sd-tx"><b>' + esc(a.pessoa) + ' · ' + esc(a.nome || '') + ' · versão ' + esc(a.versao || '?') + '</b><small>precisa tocar em "Atualizar agora" (versão atual ' + esc(window.CF_CONFIG.versao) + ')</small></div>' + ui.pill('desatualizado', 'nao') + '</div>'; }).join('') +
          (!sd.recusados_hoje && !(sd.aparelhos_parados || []).length && !(sd.versoes_antigas || []).length ? '<p class="dica" style="margin:0">✓ Todos os aparelhos em dia.</p>' : '') + '</section>' +
        '<section class="card bloco sd-bloco"><span class="lbl">Conferência dos dados</span>' +
          (c.jovens_sem_termo ? (c.sem_termo_por_processo ? c.sem_termo_por_processo.map(function (x) { return '<div class="sd-item"><div class="sd-tx"><b>' + x.n + ' jovem(ns) sem termo assinado</b><small>' + esc(x.empresa + ' · ' + x.vaga) + '</small></div><a class="btn btn-p" href="#/processos/' + x.processo_id + '/jovens?incompletos">Ver</a></div>'; }).join('')
            : '<div class="sd-item"><div class="sd-tx"><b>' + c.jovens_sem_termo + ' jovem(ns) sem termo assinado</b><small>em processos em andamento</small></div><a class="btn btn-p" href="#/processos">Ver</a></div>') : '') +
          (c.processos_sem_testes ? '<div class="sd-item"><div class="sd-tx"><b>' + c.processos_sem_testes + ' processo(s) em andamento sem testes guardados</b></div><a class="btn btn-p" href="#/processos">Ver</a></div>' : '') +
          (c.turmas_sem_jovens ? (c.turmas_vazias ? c.turmas_vazias.map(function (x) { return '<div class="sd-item"><div class="sd-tx"><b>' + esc(x.turma) + ' sem jovens</b><small>' + esc(x.empresa + ' · ' + x.vaga) + ' · cadastre os jovens ou exclua a turma</small></div><a class="btn btn-p" href="#/processos/' + x.processo_id + '">Ver</a></div>'; }).join('')
            : '<div class="sd-item"><div class="sd-tx"><b>' + c.turmas_sem_jovens + ' turma(s) sem jovens</b><small>em processos em montagem ou andamento</small></div><a class="btn btn-p" href="#/processos">Ver</a></div>') : '') +
          (c.turmas_passadas_abertas || []).map(function (t) { return '<div class="sd-item"><div class="sd-tx"><b>' + esc(t.turma + ' · ' + t.empresa) + ': turma já passou e não foi concluída</b><small>último dia ' + window.CF.datas.completa(t.ultimo_dia) + '</small></div><a class="btn btn-p" href="#/avaliar/' + t.turma_id + '/fechar">Abrir</a></div>'; }).join('') +
          (c.sugestoes_antigas ? '<div class="sd-item"><div class="sd-tx"><b>' + c.sugestoes_antigas + ' sugestão(ões) paradas há mais de 2 dias</b></div><a class="btn btn-p" href="#/avaliar">Ver</a></div>' : '') +
          (!c.jovens_sem_termo && !c.processos_sem_testes && !c.turmas_sem_jovens && !(c.turmas_passadas_abertas || []).length && !c.sugestoes_antigas ? '<p class="dica" style="margin:0">✓ Nada incompleto encontrado.</p>' : '') + '</section>';
      var el = area.querySelector('#sd');
      el.querySelectorAll('[data-det]').forEach(function (b) { b.addEventListener('click', function () { detalhes(sd.erros[+b.getAttribute('data-det')]); }); });
      el.querySelectorAll('[data-rel]').forEach(function (b) { b.addEventListener('click', function () { copiarRelatorio(sd.erros[+b.getAttribute('data-rel')]); }); });
      el.querySelectorAll('[data-res]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var g = sd.erros[+b.getAttribute('data-res')];
          if (!(await ui.confirmar('Marcar como resolvido?', 'O erro sai da lista. Se acontecer de novo, volta a aparecer com o aviso "voltou depois de resolvido".', 'Marcar como resolvido', 'Cancelar'))) return;
          try { await dados.saude.resolver(g.assinatura); if (window.CF.verificarMonitores) window.CF.verificarMonitores(); ui.toast('Erro marcado como resolvido.', 'ok'); carregar(); } catch (e) { erro(e); }
        });
      });
      if (el.querySelector('#sd-resolvidos')) el.querySelector('#sd-resolvidos').addEventListener('click', async function () {
        try {
          var l = await dados.saude.resolvidos();
          ui.janela({ titulo: 'Erros resolvidos', confirmarDescarte: false,
            corpo: l.length ? l.map(function (x) { return '<div class="sd-det"><b>' + esc(x.mensagem || x.assinatura) + '</b><small style="display:block">' + x.vezes + ' vez(es) antes de resolver · tela ' + esc(x.tela || '?') + ' · resolvido em ' + new Date(x.resolvido_em).toLocaleString('pt-BR') + (x.versao ? ' (versão ' + esc(x.versao) + ')' : '') + (x.por ? ' por ' + esc(x.por) : '') + '</small></div>'; }).join('') : '<p class="dica">Nenhum erro resolvido.</p>',
            botoes: [{ texto: 'Fechar', acao: 'fechar' }] });
        } catch (e) { erro(e); }
      });
      if (el.querySelector('#sd-vistos')) el.querySelector('#sd-vistos').addEventListener('click', async function () { try { await dados.saude.marcarVistos(null); if (window.CF.verificarMonitores) window.CF.verificarMonitores(); carregar(); } catch (e) { erro(e); } });
      el.querySelector('#sd-lim').addEventListener('click', limites);
    }
    async function copiarRelatorio(g) {
      try {
        var det = await dados.saude.detalhes(g.assinatura), txt = window.CF.erros.relatorio(g, det);
        try { await navigator.clipboard.writeText(txt); ui.toast('Relatório copiado. Cole na conversa com o Claude.', 'ok'); }
        catch (e) { ui.janela({ titulo: 'Relatório para o Claude', confirmarDescarte: false, corpo: '<p class="dica" style="margin:0">Selecione tudo e copie:</p><textarea class="entrada" data-normal rows="14" readonly>' + esc(txt) + '</textarea>' }); }
        await dados.saude.marcarVistos(g.assinatura);
      } catch (e) { erro(e); }
    }
    async function detalhes(g) {
      try {
        var det = await dados.saude.detalhes(g.assinatura);
        ui.janela({ titulo: 'Detalhes do erro', confirmarDescarte: false,
          corpo: '<p style="margin:0"><b>' + esc(g.mensagem) + '</b></p>' + det.map(function (d) {
            return '<div class="sd-det"><small>' + new Date(d.em).toLocaleString('pt-BR') + ' · ' + esc(d.perfil || '') + ' · ' + esc(d.aparelho || '') + ' · v' + esc(d.versao || '') + ' · ' + (d.online ? 'com internet' : 'sem internet') + ' · tela ' + esc(d.tela || '') + '</small>' +
              '<div class="dica">Passos: ' + esc(((d.contexto || {}).passos || []).join(' → ')) + '</div><pre>' + esc(String(d.pilha || '').slice(0, 1200)) + '</pre></div>';
          }).join(''),
          botoes: [{ texto: 'Fechar', acao: 'fechar' }, { texto: '📋 Copiar relatório para o Claude', principal: true, aoClicar: function () { copiarRelatorio(g); return true; } }] });
      } catch (e) { erro(e); }
    }
    function limites() {
      ui.janela({ titulo: 'Limites do plano do Supabase', confirmarDescarte: false,
        corpo: '<p class="dica" style="margin:0">No plano gratuito: banco 500 MB e arquivos 1 GB. Ajuste se mudarem de plano.</p><div class="form-grade">' +
          '<label class="campo"><span>Banco de dados (MB)</span><input class="entrada" type="number" min="100" id="lm-b" value="' + cfg.limite_banco_mb + '"></label>' +
          '<label class="campo"><span>Fotos e arquivos (MB)</span><input class="entrada" type="number" min="100" id="lm-a" value="' + cfg.limite_arquivos_mb + '"></label></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar', principal: true, aoClicar: async function (f) {
          var b = parseInt(f.querySelector('#lm-b').value, 10), a = parseInt(f.querySelector('#lm-a').value, 10);
          if (!(b >= 100) || !(a >= 100)) { ui.toast('Informe valores a partir de 100 MB.', 'erro'); return false; }
          try { await dados.config.salvar({ limite_banco_mb: b, limite_arquivos_mb: a }); ui.toast('Limites salvos.', 'ok'); carregar(); return true; } catch (e) { erro(e); return false; }
        } }] });
    }
    function manutencao() {
      var m = (cfg && cfg.manutencao) || {};
      ui.janela({ titulo: 'Modo manutenção', confirmarDescarte: false,
        corpo: '<p class="dica" style="margin:0">Mostra uma faixa no topo para toda a equipe. Se bloquear, os lançamentos dos avaliadores ficam guardados no aparelho e são enviados quando a manutenção terminar (nada se perde).</p>' +
          '<label class="marcar"><input type="checkbox" id="mn-at"' + (m.ativo ? ' checked' : '') + '><span><b>Ligar o aviso de manutenção</b></span></label>' +
          '<label class="campo"><span>Mensagem</span><input class="entrada" id="mn-msg" maxlength="160" value="' + esc(m.mensagem || 'MANUTENÇÃO PROGRAMADA HOJE ÀS 18H (5 MINUTOS). TERMINE OS LANÇAMENTOS ANTES DESSE HORÁRIO.') + '"></label>' +
          '<label class="marcar"><input type="checkbox" id="mn-bl"' + (m.bloquear ? ' checked' : '') + '><span><b>Bloquear novos lançamentos dos avaliadores</b><small>Use só durante a atualização.</small></span></label>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar', principal: true, aoClicar: async function (f) {
          var nv = { ativo: f.querySelector('#mn-at').checked, mensagem: f.querySelector('#mn-msg').value.trim(), bloquear: f.querySelector('#mn-at').checked && f.querySelector('#mn-bl').checked, em: new Date().toISOString() };
          try { await dados.config.salvar({ manutencao: nv }); ui.toast(nv.ativo ? 'Modo manutenção ligado.' : 'Modo manutenção desligado.', 'ok'); if (window.CF.verificarMonitores) window.CF.verificarMonitores(); carregar(); return true; } catch (e) { erro(e); return false; }
        } }] });
    }
    area.querySelector('#sd-atual').addEventListener('click', carregar);
    area.querySelector('#sd-manut').addEventListener('click', manutencao);
    carregar();
  }

  /* ---------- Modelos de documentos ---------- */
  var DOCS = [
    { k: 'cracha', nome: 'Crachá', det: '8 por folha A4 · 9,4 × 5,9 cm', opcoes: [['com_qr', 'Faixa lateral com código e QR Code'], ['sem_qr', 'Faixa lateral com código, sem QR Code']] },
    { k: 'presenca', nome: 'Lista de presença', det: 'folha deitada · 1 por dia · telefone e assinatura', opcoes: [['padrao', 'Com logos, código, telefone e assinatura']] },
    { k: 'termo', nome: 'Termo de consentimento', det: '1 página por jovem', opcoes: [['padrao', 'Jovem + responsável (menores de 18)']] },
    { k: 'materiais', nome: 'Lista de materiais', det: 'por turma, com conferência', opcoes: [['padrao', 'Com caixas de conferência e observações']] },
    { k: 'ficha_tela', nome: 'Ficha do candidato (tela)', det: 'como a ficha abre no sistema', opcoes: [['lateral', 'Coluna lateral (modelo D)'], ['cards', 'Cards']] },
    { k: 'ficha', nome: 'Ficha do candidato (PDF)', det: 'A4 · 1 página por candidato (mais, se houver muitas observações)', opcoes: [['lateral', 'Coluna lateral (modelo D)']] },
    { k: 'ficha_excel', nome: 'Ficha do candidato (Excel)', det: 'abas Ficha e Dados', opcoes: [['formatada', 'Formatada como o PDF · abas Ficha e Dados']] },
    { k: 'relatorio', nome: 'Classificação e relatório (PDF)', det: 'capa, agradecimento, informações, ranking com links e fichas', opcoes: [['padrao', 'Capa só com logos, ranking clicável e fichas no modelo D']] },
    { k: 'excel', nome: 'Planilha Excel do processo', det: 'arquivo completo do processo', opcoes: [['completa', 'Abas Processo, Classificação, Notas por teste, Competências, Observações e Presença']] }, { k: 'certificado', nome: 'Certificado de participação', det: 'Fase 5' }];
  async function paginaModelos(area) {
    var cfg = await dados.config.carregar(), atual = Object.assign({}, cfg.modelos_documento || {});
    area.innerHTML = cabecalho('Modelos de documentos', 'Escolha qual modelo cada documento usa como padrão') +
      '<div class="card tabela-card"><table class="tabela"><thead><tr><th>Documento</th><th>Modelo padrão</th><th>Modelos disponíveis</th></tr></thead><tbody>' +
      DOCS.map(function (d) {
        if (!d.opcoes) return '<tr><td><b>' + esc(d.nome) + '</b><small class="sub-cel">' + esc(d.det) + '</small></td><td><span class="dica">em construção</span></td><td></td></tr>';
        var v = atual[d.k] || d.opcoes[0][0];
        return '<tr><td><b>' + esc(d.nome) + '</b><small class="sub-cel">' + esc(d.det) + '</small></td>' +
          '<td>' + (d.opcoes.length > 1 ? '<select class="entrada sel-modelo" data-doc="' + d.k + '" aria-label="Modelo padrão de ' + esc(d.nome) + '">' + d.opcoes.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'
            : ui.pill(d.opcoes[0][1], 'sim')) + '</td><td class="num">' + d.opcoes.length + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="dica" style="margin:0">Novos modelos aparecem aqui conforme forem criados. Trocar o padrão não muda documentos já impressos.</p>';
    area.querySelectorAll('[data-doc]').forEach(function (sel) {
      sel.addEventListener('change', async function () {
        atual[sel.getAttribute('data-doc')] = sel.value;
        try { await dados.config.salvar({ modelos_documento: atual }); ui.toast('Modelo padrão salvo.', 'ok'); } catch (x) { erro(x); }
      });
    });
  }

  /* ---------- Texto do termo de consentimento ---------- */
  var TERMO_JOVEM = 'Eu, acima identificado(a), autorizo a Kolping Estadual de São Paulo a utilizar meus dados pessoais e minha imagem (foto) exclusivamente para a realização deste processo seletivo do Projeto Gol Jovens Talentos, e a compartilhar o resultado da minha avaliação com a empresa {empresa}, responsável pela vaga de {vaga}. Estou ciente de que posso solicitar a qualquer momento informações sobre o uso dos meus dados ou a sua exclusão, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).';
  var TERMO_RESP = 'Como responsável legal, autorizo o uso dos dados e da imagem do(a) jovem nas condições acima.';
  async function paginaTermo(area) {
    var cfg = await dados.config.carregar();
    var EX = { empresa: 'Empresa Exemplo', vaga: 'Auxiliar Administrativo', processo: '2º semestre 2026' };
    area.innerHTML = cabecalho('Termo de consentimento', 'Texto impresso para o jovem e, se menor de idade, o responsável assinarem') +
      '<div class="agr-grade"><section class="card bloco" style="gap:12px">' +
        '<label class="lbl" for="t-jovem">Autorização do jovem</label><textarea class="entrada" id="t-jovem" data-normal rows="9" maxlength="3000" style="line-height:1.6">' + esc(cfg.texto_termo_jovem || TERMO_JOVEM) + '</textarea>' +
        '<label class="lbl" for="t-resp">Autorização do responsável (menores de 18 anos)</label><textarea class="entrada" id="t-resp" data-normal rows="3" maxlength="1500" style="line-height:1.6">' + esc(cfg.texto_termo_responsavel || TERMO_RESP) + '</textarea>' +
        '<div class="vars"><span class="dica">Inserir no texto selecionado:</span>' + ['empresa', 'vaga', 'processo'].map(function (v) { return '<button type="button" class="chip-var" data-var="' + v + '">{' + v + '}</button>'; }).join('') + '</div>' +
        '<p class="dica" style="margin:0">Como o termo trata de dados pessoais e imagem de menores, recomendamos que a versão final seja revisada por quem cuida da parte jurídica ou de proteção de dados.</p>' +
        '<div class="botoes-fim"><button type="button" class="btn" id="t-padrao">Restaurar texto padrão</button><button type="button" class="btn btn-pri" id="t-salvar">Salvar</button></div></section>' +
        '<section class="grupo"><span class="lbl">Prévia (exemplo: ' + EX.empresa + ' · ' + EX.vaga + ')</span><div class="folha" id="t-previa"></div></section></div>';
    var tj = area.querySelector('#t-jovem'), tr = area.querySelector('#t-resp'), pv = area.querySelector('#t-previa'), ultimo = tj;
    [tj, tr].forEach(function (x) { x.addEventListener('focus', function () { ultimo = x; }); x.addEventListener('input', previa); });
    function troca(t) { return esc(t).replace(/\{(empresa|vaga|processo)\}/g, function (m, k) { return '<b>' + esc(EX[k]) + '</b>'; }).replace(/\n/g, '<br>'); }
    function previa() {
      pv.innerHTML = '<p><b>Autorização</b><br>' + troca(tj.value) + '</p><p style="margin-top:14px">Assinatura do(a) jovem: ____________________</p>' +
        '<p style="margin-top:14px"><b>Para menores de 18 anos · responsável legal</b><br>' + troca(tr.value) + '</p><p>Assinatura do(a) responsável: ____________________</p>';
    }
    area.querySelectorAll('[data-var]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ins = '{' + b.getAttribute('data-var') + '}', i = ultimo.selectionStart || ultimo.value.length, f = ultimo.selectionEnd || i;
        ultimo.value = ultimo.value.slice(0, i) + ins + ultimo.value.slice(f); ultimo.focus(); ultimo.setSelectionRange(i + ins.length, i + ins.length); previa();
      });
    });
    area.querySelector('#t-padrao').addEventListener('click', async function () {
      if (await ui.confirmar('Restaurar o texto padrão?', 'Os dois textos voltam ao padrão (só ficam salvos ao clicar em Salvar).', 'Restaurar', 'Cancelar')) { tj.value = TERMO_JOVEM; tr.value = TERMO_RESP; previa(); }
    });
    area.querySelector('#t-salvar').addEventListener('click', function (ev) {
      if (tj.value.trim().length < 40) { ui.toast('O texto da autorização está muito curto.', 'erro'); return; }
      ui.executar(ev.currentTarget, 'Salvando…', async function () {
        try { await dados.config.salvar({ texto_termo_jovem: tj.value.trim(), texto_termo_responsavel: tr.value.trim() }); ui.toast('Texto do termo salvo.', 'ok'); } catch (x) { erro(x); }
      });
    });
    previa();
  }

  /* ---------- Texto do agradecimento ---------- */
  async function paginaAgradecimento(area) {
    var cfg = await dados.config.carregar();
    var EXEMPLO = { empresa: 'Empresa Exemplo', vaga: 'Auxiliar Administrativo', processo: '2º semestre 2026', data: new Date().toLocaleDateString('pt-BR') };
    area.innerHTML = cabecalho('Texto do agradecimento', 'Página 2 do PDF entregue à empresa') +
      '<div class="agr-grade"><section class="card bloco" style="gap:12px"><label class="lbl" for="a-texto">Texto</label>' +
        '<textarea class="entrada" id="a-texto" data-normal rows="10" maxlength="2000" style="line-height:1.6">' + esc(cfg.texto_agradecimento) + '</textarea>' +
        '<div class="vars"><span class="dica">Inserir:</span>' + ['empresa', 'vaga', 'processo', 'data'].map(function (v) { return '<button type="button" class="chip-var" data-var="' + v + '">{' + v + '}</button>'; }).join('') + '</div>' +
        '<div class="botoes-fim"><button type="button" class="btn" id="a-padrao">Restaurar texto padrão</button><button type="button" class="btn btn-pri" id="a-salvar">Salvar</button></div></section>' +
        '<section class="grupo"><span class="lbl">Prévia (exemplo: ' + EXEMPLO.empresa + ' · ' + EXEMPLO.vaga + ')</span><div class="folha" id="a-previa"></div></section></div>';
    var tx = area.querySelector('#a-texto'), pv = area.querySelector('#a-previa');
    function previa() {
      var html = esc(tx.value).replace(/\{(empresa|vaga|processo|data)\}/g, function (m, k) { return '<b>' + esc(EXEMPLO[k]) + '</b>'; });
      pv.innerHTML = html.split(/\n\s*\n/).map(function (par) { return '<p>' + par.replace(/\n/g, '<br>') + '</p>'; }).join('') + '<p class="assina">Coordenação · Kolping Estadual de São Paulo</p>';
    }
    tx.addEventListener('input', previa);
    area.querySelectorAll('[data-var]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ins = '{' + b.getAttribute('data-var') + '}', i = tx.selectionStart || tx.value.length, f = tx.selectionEnd || i;
        tx.value = tx.value.slice(0, i) + ins + tx.value.slice(f); tx.focus(); tx.setSelectionRange(i + ins.length, i + ins.length); previa();
      });
    });
    area.querySelector('#a-padrao').addEventListener('click', async function () {
      if (tx.value === TEXTO_PADRAO) return;
      if (await ui.confirmar('Restaurar o texto padrão?', 'O texto atual será substituído (só fica salvo ao clicar em Salvar).', 'Restaurar', 'Cancelar')) { tx.value = TEXTO_PADRAO; previa(); }
    });
    area.querySelector('#a-salvar').addEventListener('click', function (ev) {
      var t = tx.value.trim();
      if (t.length < 20) { ui.toast('O texto está muito curto.', 'erro'); return; }
      ui.executar(ev.currentTarget, 'Salvando…', async function () {
        try { await dados.config.salvar({ texto_agradecimento: t }); ui.toast('Texto do agradecimento salvo.', 'ok'); }
        catch (x) { erro(x); }
      });
    });
    previa();
  }
})();
