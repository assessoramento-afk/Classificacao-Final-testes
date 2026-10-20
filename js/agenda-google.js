/* =====================================================================
   Classificação Final · agenda-google.js
   Agenda única "Classificação Final · Turmas" no Google (serviço agenda-sincronizar).
   · turmas do sistema vão para a agenda (horário de cada dia)
   · eventos criados direto no Google só aparecem (não travam dias)
   · turma mudada no Google fica pendente: Aplicar no sistema ou Desfazer no Google
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, ultima = 0, emCurso = null;
  async function sincronizar(silencioso, extra) {
    if (!navigator.onLine || !window.CF.drive) return null;
    var pf = window.CF.perfilAtual || {}; if (pf.perfil === 'empresa') return null;
    if (emCurso && !extra) return emCurso;
    emCurso = (async function () {
      try {
        var r = await window.CF.drive.chamar('agenda-sincronizar', Object.assign({ acao: 'sincronizar' }, extra || {}));
        ultima = Date.now();
        if (!silencioso) ui.toast('Google Agenda atualizada · ' + r.resumo + (r.pendentes ? ' · ' + r.pendentes + ' alteração(ões) para decidir' : '') + '.', 'ok');
        return r;
      } catch (e) {
        if (!e.naoConectado && !silencioso) ui.toast(e.message, 'erro');
        return null;
      } finally { emCurso = null; }
    })();
    return emCurso;
  }
  // Ao abrir telas com agenda: atualiza se faz mais de 5 minutos
  function sincronizarSeVelho() { if (Date.now() - ultima > 5 * 60 * 1000) return sincronizar(true); return Promise.resolve(null); }
  async function eventosGoogle() {
    var r = await window.CF.sb.from('agenda_google_eventos').select('*').order('inicio');
    return r.error ? [] : (r.data || []);
  }
  async function pendentes() {
    var r = await window.CF.sb.from('agenda_turma_eventos').select('*').not('pendente_inicio', 'is', null);
    return r.error ? [] : (r.data || []);
  }
  // { 'AAAA-MM-DD': 'TÍTULO' } dos eventos do Google, para o calendário de escolher datas
  function mapaEventos(lista) {
    var m = {};
    (lista || []).forEach(function (e) {
      var d = new Date(e.data_ini + 'T12:00:00'), f = new Date((e.data_fim || e.data_ini) + 'T12:00:00'), n = 0;
      while (d <= f && n < 31) { var k = d.toISOString().slice(0, 10); m[k] = m[k] ? m[k] + ' · ' + e.titulo : e.titulo; d.setDate(d.getDate() + 1); n++; }
    });
    return m;
  }
  function hora(iso) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }); }
  function dia(iso) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }); }
  async function aplicar(turmaId) {
    var r = await window.CF.sb.rpc('turma_aplicar_google', { p_turma: turmaId });
    if (r.error) throw r.error;
    await sincronizar(true);
  }
  function desfazer(turmaId) { return sincronizar(false, { acao: 'desfazer', turma_id: turmaId }); }
  function vincular(eventoId, turmaId, agendaId) { return sincronizar(true, { acao: 'vincular', evento_id: eventoId, turma_id: turmaId, agenda_id: agendaId || null }); }
  // Excluir um evento criado direto no Google (pede confirmação; some também do Google Agenda)
  async function excluirEvento(g) {
    var quando = g.dia_inteiro ? (g.data_ini.slice(8) + '/' + g.data_ini.slice(5, 7) + (g.data_fim !== g.data_ini ? ' a ' + g.data_fim.slice(8) + '/' + g.data_fim.slice(5, 7) : '')) : dia(g.inicio) + ' ' + hora(g.inicio);
    if (!(await ui.confirmar('Excluir "' + g.titulo + '"?', quando + ' · agenda ' + (g.agenda_nome || 'Google') + '\nEle some também do Google Agenda. Não dá para desfazer pelo sistema.', 'Excluir', 'Cancelar'))) return false;
    try {
      await window.CF.drive.chamar('agenda-sincronizar', { acao: 'excluir_evento', evento_id: g.evento_id, agenda_id: g.agenda_id || null });
      ui.toast('Evento excluído.', 'ok'); return true;
    } catch (e) { ui.toast(e.message, 'erro'); return false; }
  }
  function listarAgendas() { return window.CF.drive.chamar('agenda-sincronizar', { acao: 'listar_agendas' }); }
  // Feriados, pontos facultativos, eventos da Kolping Estadual e lembretes do mês
  var TIPOS_ESP = { feriado: { nome: 'Feriado', cor: '#7d7577' }, ponto: { nome: 'Ponto facultativo', cor: '#8b7fd0' }, kolping: { nome: 'Kolping Estadual', cor: '#d96a1f' }, lembrete: { nome: 'Lembrete do mês', cor: '#b8901a' } };
  async function especiais() {
    var r = await window.CF.sb.from('agenda_especiais').select('*').order('data_ini');
    return r.error ? [] : (r.data || []);
  }
  // { 'AAAA-MM-DD': [especial, ...] } (lembretes do mês ficam de fora: não marcam dias)
  function mapaEspeciais(lista) {
    var m = {};
    (lista || []).forEach(function (e) {
      if (e.tipo === 'lembrete') return;
      var d = new Date(e.data_ini + 'T12:00:00'), f = new Date(e.data_fim + 'T12:00:00'), n = 0;
      while (d <= f && n < 40) { var k = d.toISOString().slice(0, 10); (m[k] = m[k] || []).push(e); d.setDate(d.getDate() + 1); n++; }
    });
    return m;
  }
  // Antes de marcar uma turma: pergunta se algum dia é feriado, ponto facultativo ou evento da Kolping Estadual
  async function confirmarDias(dias, lista) {
    var m = mapaEspeciais(lista || await especiais()), achados = [];
    (dias || []).forEach(function (d) { (m[d] || []).forEach(function (e) { achados.push(d.slice(8, 10) + '/' + d.slice(5, 7) + ' · ' + TIPOS_ESP[e.tipo].nome + ': ' + e.titulo); }); });
    if (!achados.length) return true;
    return window.CF.ui.confirmar('Marcar a turma assim mesmo?', achados.join('\n'), 'Marcar assim mesmo', 'Escolher outro dia');
  }
  window.CF.agendaG = { especiais: especiais, mapaEspeciais: mapaEspeciais, confirmarDias: confirmarDias, TIPOS_ESP: TIPOS_ESP, sincronizar: sincronizar, sincronizarSeVelho: sincronizarSeVelho, eventosGoogle: eventosGoogle, pendentes: pendentes,
    mapaEventos: mapaEventos, aplicar: aplicar, desfazer: desfazer, vincular: vincular, excluirEvento: excluirEvento, listarAgendas: listarAgendas, hora: hora, dia: dia };
})();
