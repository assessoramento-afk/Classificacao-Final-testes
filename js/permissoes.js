/* =====================================================================
   Classificação Final · permissoes.js
   Carrega o que a pessoa logada pode fazer (minhas_permissoes) e esconde
   menus e botões sem permissão. O banco confere de novo nas ações sensíveis.
   Sem internet, usa a última lista guardada neste aparelho.
   ===================================================================== */
(function () {
  'use strict';
  var estado = { carregado: false, dono: false, f: {} };
  var ROTA = { painel: 'graficos_ver', avaliar: 'avaliar_notas', processos: 'processos_ver', acompanhamento: 'acomp_ver',
               agenda: 'agenda_ver', cadastros: 'cadastros_jovens', banco: 'banco_ver', portal: 'portal_ver' };
  var CONFIG = ['config_empresas', 'config_pessoas', 'pessoas_excluir', 'config_modelos', 'banco_editar'];
  function chave(id) { return 'cf_perm_' + id; }
  async function carregar(perfil) {
    try {
      var r = await window.CF.sb.rpc('minhas_permissoes');
      if (r.error) throw r.error;
      estado = { carregado: true, dono: !!r.data.dono, f: r.data.funcoes || {} };
      try { localStorage.setItem(chave(perfil.id), JSON.stringify(estado)); } catch (e) { /* sem armazenamento */ }
    } catch (e) {
      try { var g = JSON.parse(localStorage.getItem(chave(perfil.id)) || 'null'); if (g) estado = g; } catch (e2) { /* sem cópia */ }
    }
    return estado;
  }
  // Antes de carregar (ou se o banco ainda não tem as permissões), vale o comportamento antigo por perfil
  function pode(f) { if (!estado.carregado) return true; if (estado.dono) return true; return estado.f[f] === true; }
  function rotaPermitida(rota) {
    if (!estado.carregado) return true;
    if (rota === 'config') return estado.dono || CONFIG.some(pode);
    return ROTA[rota] ? pode(ROTA[rota]) : true;
  }
  function aplicarMenu(raiz) {
    (raiz || document).querySelectorAll('.menu a[data-rota]').forEach(function (a) {
      var ok = rotaPermitida(a.getAttribute('data-rota'));
      a.hidden = !ok; if (a.parentElement && a.parentElement.tagName === 'LI') a.parentElement.hidden = !ok;
    });
  }
  window.CF.perm = { carregar: carregar, pode: pode, rotaPermitida: rotaPermitida, aplicarMenu: aplicarMenu, dono: function () { return estado.dono; }, carregado: function () { return estado.carregado; } };
})();
