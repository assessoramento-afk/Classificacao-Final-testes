/* =====================================================================
   Classificação Final · views/telas.js
   Telas da Fase 1. As telas marcadas como "em construção" serão
   preenchidas nas próximas etapas, cada uma no seu próprio arquivo.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc;
  window.CF.telas = window.CF.telas || {};

  function cabecalho(titulo, subtitulo) {
    return '<header class="cabecalho"><div><h1>' + esc(titulo) + '</h1>' +
      (subtitulo ? '<p>' + esc(subtitulo) + '</p>' : '') + '</div></header>';
  }

  function emConstrucao(titulo, subtitulo, etapa, itens) {
    return function (area) {
      area.innerHTML = cabecalho(titulo, subtitulo) +
        '<section class="card em-breve"><span class="lbl">Em construção · ' + esc(etapa) + '</span>' +
        '<p>Esta área será liberada na próxima entrega. Ela vai trazer:</p>' +
        '<ul style="margin:0;padding-left:20px;color:var(--texto-2);line-height:1.8">' +
        itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></section>';
    };
  }

  window.CF.telas.painel = function (area, ctx) {
    var p = ctx.perfil;
    var primeiroNome = String(p.nome || '').split(' ')[0] || '';
    var blocos = p.perfil === 'admin'
      ? [['Avaliar', 'Presença, grupos e notas das turmas: botão Avaliar em cada processo do Profiling Empresas, também sem internet.', 'Disponível', '#/processos'],
         ['Profiling Empresas', 'Processos seletivos de cada empresa, classificação, PDF e Excel.', 'Disponível', '#/processos'],
         ['Acompanhamento', 'Jovens aprovados pelas empresas: avaliações a cada 3 meses e contratação.', 'Disponível', '#/acompanhamento'],
         ['Cadastros', 'Jovens e turmas dos processos seletivos.', 'Disponível', '#/cadastros'],
         ['Banco de testes', 'Áreas, testes e competências em cards.', 'Disponível', '#/banco'],
         ['Configurações', 'Empresas, avaliadores, modelos de documentos e padrões dos processos.', 'Disponível', '#/config']]
      : [['Avaliar', 'Presença, grupos e notas das turmas: botão Avaliar em cada processo do Profiling Empresas, também sem internet.', 'Disponível', '#/processos'],
         ['Profiling Empresas', 'Processos seletivos e classificação.', 'Disponível', '#/processos'],
         ['Agenda', 'Consulta das turmas marcadas.', 'Disponível', '#/agenda'],
         ['Banco de testes', 'Consulta dos testes e critérios de avaliação.', 'Disponível', '#/banco']];
    area.innerHTML = cabecalho('Olá, ' + primeiroNome + '!', 'Bem-vindo(a) ao sistema Classificação Final do Projeto Gol Jovens Talentos.') +
      '<div class="grade">' + blocos.map(function (b) {
        var inicio = b[3] ? '<a class="card bloco bloco-link" href="' + b[3] + '">' : '<section class="card bloco">';
        var fim = b[3] ? '</a>' : '</section>';
        return inicio + '<span class="lbl">' + esc(b[2]) + '</span><h2>' + esc(b[0]) + '</h2><p>' + esc(b[1]) + '</p>' + fim;
      }).join('') + '</div>';
  };

  // Cadastros: jovens e turmas (Fase 2). Endereços antigos de cadastros vão para Configurações.
  window.CF.telas.tablets = function (area) {
    if (!(window.CF.perm && window.CF.perm.pode && window.CF.perm.pode('banco_editar'))) { area.innerHTML = '<div class="card vazio">Sem permissão para ver os tablets.</div>'; return; }
    window.CF.testesTablet.tablets(area);
  };
  function voltarCadastros(area) {   // nas páginas abertas por Cadastros, o "voltar" leva para Cadastros
    var fix = function () { var v = area.querySelector('a.voltar'); if (v) { v.setAttribute('href', '#/cadastros'); v.textContent = '← Cadastros'; } };
    fix(); setTimeout(fix, 0); setTimeout(fix, 400);
  }
  window.CF.telas.cadastros = function (area) {
    var m = (window.location.hash || '').match(/^#\/cadastros\/([a-z]+)/);
    if (m && (m[1] === 'empresas' || m[1] === 'avaliadores')) { window.CF.configPaginas.render(area, m[1], {}); voltarCadastros(area); return; }
    if (m && m[1] === 'escolas') { window.CF.paginaEscolas(area); voltarCadastros(area); return; }
    if (m && ['areas', 'testes', 'competencias'].indexOf(m[1]) >= 0) { window.location.replace('#/config/' + m[1]); return; }
    if (m && m[1] === 'jovens') { window.CF.telas.jovensTodos(area); return; }
    if (m && m[1] === 'turmas') { window.CF.telas.turmasTodas(area); return; }
    area.innerHTML = cabecalho('Cadastros', 'Tudo o que o Projeto Gol Jovens Talentos cadastra, num só lugar') +
      '<div class="cards-cfg">' +
        '<a class="cfg" href="#/cadastros/empresas" style="--cor:var(--c-empresa)" data-card="empresas"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg></span><div><b>Empresas</b><small>Empresas parceiras, contatos e vagas</small></div><span class="vai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>' +
        '<a class="cfg" href="#/cadastros/jovens" style="--cor:var(--c-aval)" data-card="jovens"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.6c3 .1 5.5 2 5.5 5.4"/></svg></span><div><b>Jovens</b><small>Cadastro, crachá e histórico de cada jovem</small></div><span class="vai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>' +
        '<a class="cfg" href="#/cadastros/escolas" style="--cor:var(--c-escola)" data-card="escolas"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg></span><div><b>Comunidades Kolping e Escolas</b><small>CKs e escolas de origem dos jovens</small></div><span class="vai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>' +
        '<a class="cfg" href="#/cadastros/turmas" style="--cor:var(--c-area)" data-card="turmas"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span><div><b>Turmas</b><small>Turmas, datas e testes</small></div><span class="vai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>' +
        '<a class="cfg" href="#/cadastros/avaliadores" style="--cor:var(--c-comp)" data-card="avaliadores"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></svg></span><div><b>Avaliadores</b><small>Equipe que avalia e quem tem acesso ao sistema</small></div><span class="vai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>' +
      '</div>';
  };
})();
