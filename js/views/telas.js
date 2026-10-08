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
      ? [['Configurações', 'Empresas, avaliadores, banco de testes e padrões dos processos.', 'Disponível', '#/config'],
         ['Banco de testes', 'Áreas, testes e competências em cards.', 'Disponível', '#/banco'],
         ['Cadastros', 'Jovens e turmas dos processos seletivos.', 'Fase 2'],
         ['Processos', 'Processos seletivos de cada empresa.', 'Disponível', '#/processos']]
      : [['Lançamento de notas', 'Pelo celular ou computador, também sem internet.', 'Fase 3'],
         ['Agenda', 'Consulta das turmas marcadas.', 'Fase 2'],
         ['Banco de testes', 'Consulta dos testes e critérios de avaliação.', 'Disponível', '#/banco']];
    area.innerHTML = cabecalho('Olá, ' + primeiroNome + '!', 'Bem-vindo(a) ao sistema Classificação Final do Projeto Gol Jovens Talentos.') +
      '<div class="grade">' + blocos.map(function (b) {
        var inicio = b[3] ? '<a class="card bloco bloco-link" href="' + b[3] + '">' : '<section class="card bloco">';
        var fim = b[3] ? '</a>' : '</section>';
        return inicio + '<span class="lbl">' + esc(b[2]) + '</span><h2>' + esc(b[0]) + '</h2><p>' + esc(b[1]) + '</p>' + fim;
      }).join('') + '</div>';
  };

  // Cadastros: jovens e turmas (Fase 2). Endereços antigos de cadastros vão para Configurações.
  window.CF.telas.cadastros = function (area) {
    var m = (window.location.hash || '').match(/^#\/cadastros\/([a-z]+)/);
    if (m && ['empresas', 'avaliadores', 'areas', 'testes', 'competencias'].indexOf(m[1]) >= 0) { window.location.replace('#/config/' + m[1]); return; }
    if (m && m[1] === 'jovens') { window.CF.telas.jovensTodos(area); return; }
    area.innerHTML = cabecalho('Cadastros', 'Jovens e turmas dos processos seletivos') +
      '<div class="cards-cfg">' +
        '<a class="cfg" href="#/cadastros/jovens" style="--cor:var(--c-aval)" data-card="jovens"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></svg></span><div><b>Jovens</b><small>Todos os jovens cadastrados e o histórico de processos de cada um. O cadastro é feito dentro de cada processo.</small></div></a>' +
        '<div class="cfg em-breve-cfg" style="--cor:var(--c-area)"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span><div><b>Turmas</b><small>Crachás, lista de presença por dia e termos: use o <b>Kit da turma</b> na tela de jovens de cada processo.</small></div></div>' +
      '</div>';
  };
  window.CF.telas.portal = emConstrucao('Resultados', 'Processos seletivos liberados para a sua empresa.', 'Fase 5',
    ['Ranking final de cada processo liberado', 'Fichas dos candidatos', 'Download em PDF e Excel']);
})();
