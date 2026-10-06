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
      ? [['Cadastros', 'Empresas, avaliadores, áreas e competências.', 'Etapa 1.4'],
         ['Banco de testes', 'Testes, vínculos com as competências e painel de pendências.', 'Etapa 1.4'],
         ['Configurações', 'Notas de corte, prazo da pré-reserva e texto do agradecimento.', 'Etapa 1.5'],
         ['Processos e agenda', 'Turmas, agenda com pré-reserva, candidatos e crachás.', 'Fase 2']]
      : [['Lançamento de notas', 'Pelo celular ou computador, também sem internet.', 'Fase 3'],
         ['Agenda', 'Consulta das turmas marcadas.', 'Fase 2'],
         ['Banco de testes', 'Consulta dos testes e critérios de avaliação.', 'Etapa 1.4']];
    area.innerHTML = cabecalho('Olá, ' + primeiroNome + '!', 'Bem-vindo(a) ao sistema Classificação Final do Projeto Gol Jovens Talentos.') +
      '<div class="grade">' + blocos.map(function (b) {
        return '<section class="card bloco"><span class="lbl">' + esc(b[2]) + '</span><h2>' + esc(b[0]) + '</h2><p>' + esc(b[1]) + '</p></section>';
      }).join('') + '</div>';
  };

  window.CF.telas.processos = emConstrucao('Processos', 'Processos seletivos, turmas e candidatos.', 'Fase 2',
    ['Montagem do processo com empresa, vaga, testes e turmas', 'Cadastro e importação de candidatos', 'Ranking parcial e final']);
  window.CF.telas.agenda = emConstrucao('Agenda', 'Uma turma por dia, com pré-reserva.', 'Fase 2',
    ['Calendário mensal e semanal', 'Pré-reserva com prazo e aviso de vencimento', 'Bloqueio de feriados e eventos']);
  window.CF.telas.cadastros = emConstrucao('Cadastros', 'Empresas, avaliadores, áreas e competências.', 'Etapa 1.4',
    ['Empresas com logotipo', 'Avaliadores e aprovação de novos cadastros', 'Áreas e competências']);
  window.CF.telas.banco = emConstrucao('Banco de testes', 'Áreas, testes e competências.', 'Etapa 1.4',
    ['Lista de testes por área', 'Vínculos de cada critério com a competência', 'Painel de pendências']);
  window.CF.telas.config = emConstrucao('Configurações', 'Padrões usados em todo processo novo.', 'Etapa 1.5',
    ['Notas de corte padrão', 'Prazo padrão da pré-reserva', 'Texto do agradecimento']);
  window.CF.telas.portal = emConstrucao('Resultados', 'Processos seletivos liberados para a sua empresa.', 'Fase 5',
    ['Ranking final de cada processo liberado', 'Fichas dos candidatos', 'Download em PDF e Excel']);
})();
