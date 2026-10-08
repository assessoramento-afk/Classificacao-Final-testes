/* =====================================================================
   Classificação Final · dados.js
   Leitura e gravação dos cadastros e do banco de testes.
   Todas as funções devolvem os dados ou lançam o erro do Supabase.
   ===================================================================== */
(function () {
  'use strict';
  var sb = window.CF.sb;

  async function q(promessa) {
    var r = await promessa;
    if (r.error) throw r.error;
    return r.data;
  }
  function limpar(obj) {
    var o = {};
    Object.keys(obj).forEach(function (k) { if (obj[k] !== undefined) o[k] = obj[k]; });
    return o;
  }
  async function salvar(tabela, obj) {
    var dados = limpar(obj); var id = dados.id; delete dados.id;
    if (id) return q(sb.from(tabela).update(dados).eq('id', id).select().single());
    return q(sb.from(tabela).insert(dados).select().single());
  }

  /* ---------- Empresas ---------- */
  var empresas = {
    listar: function () { return q(sb.from('empresas').select('*').order('nome_fantasia')); },
    salvar: function (e) { return salvar('empresas', e); },
    urlLogo: async function (caminho) {
      if (!caminho) return null;
      var r = await sb.storage.from('logos').createSignedUrl(caminho, 3600);
      return r.error ? null : r.data.signedUrl;
    },
    // Reduz o logo (máx. 600 px de largura), mantendo a transparência, e envia
    enviarLogo: async function (empresaId, arquivo) {
      var blob = await reduzirImagem(arquivo, 600, 'image/png');
      var caminho = empresaId + '/logo-' + Date.now() + '.png';
      var r = await sb.storage.from('logos').upload(caminho, blob, { contentType: 'image/png', upsert: false });
      if (r.error) throw r.error;
      return caminho;
    },
    removerArquivo: function (caminho) { if (caminho) sb.storage.from('logos').remove([caminho]); }
  };

  function reduzirImagem(arquivo, larguraMax, tipo) {
    return new Promise(function (ok, falha) {
      var url = URL.createObjectURL(arquivo);
      var img = new Image();
      img.onload = function () {
        var fator = Math.min(1, larguraMax / img.naturalWidth);
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * fator); c.height = Math.round(img.naturalHeight * fator);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : falha(new Error('imagem')); }, tipo, 0.92);
      };
      img.onerror = function () { URL.revokeObjectURL(url); falha(new Error('Não foi possível abrir esta imagem.')); };
      img.src = url;
    });
  }

  /* ---------- Pessoas (perfis) ---------- */
  var pessoas = {
    listar: function () { return q(sb.rpc('listar_pessoas')); },
    atualizar: function (id, campos) { return q(sb.from('perfis').update(campos).eq('id', id).select('id').single()); },
    excluir: function (id) { return q(sb.rpc('excluir_pessoa', { p_id: id })); },
    empresasOnline: function () { return q(sb.rpc('empresas_online')); },
    registrarAtividade: function () { return q(sb.rpc('registrar_atividade')); }
  };

  /* ---------- Banco de testes ---------- */
  var banco = {
    carregarTudo: async function () {
      var r = await Promise.all([
        q(sb.from('areas').select('*').order('ordem')),
        q(sb.from('qualificacoes').select('*').order('ordem')),
        q(sb.from('competencias').select('*').order('nome')),
        q(sb.from('testes').select('*').order('nome')),
        q(sb.from('teste_criterios').select('*').order('ordem')),
        q(sb.from('tabelas_conversao').select('*').order('pont_min')),
        q(sb.from('materiais').select('*').order('nome')).catch(function () { return []; }),
        q(sb.from('teste_materiais').select('*').order('ordem')).catch(function () { return []; })
      ]);
      return { areas: r[0], qualificacoes: r[1], competencias: r[2], testes: r[3], criterios: r[4], conversao: r[5], materiais: r[6], testeMateriais: r[7] };
    },
    salvarArea: function (a) { return salvar('areas', a); },
    salvarMaterial: function (m) { return salvar('materiais', m); },
    excluirMaterial: function (id) { return q(sb.from('materiais').delete().eq('id', id)); },
    salvarCompetencia: function (c) { return salvar('competencias', c); },
    excluirCompetencia: function (id) { return q(sb.from('competencias').delete().eq('id', id)); },
    salvarTeste: function (t) { return salvar('testes', t); },
    salvarCriterio: function (c) { return salvar('teste_criterios', c); },
    excluirCriterio: function (id) { return q(sb.from('teste_criterios').delete().eq('id', id)); },
    // Substitui a tabela de conversão de um teste inteira
    // Teste + competências de uma vez (função salvar_teste no banco)
    salvarTesteCompleto: function (dadosTeste) { return q(sb.rpc('salvar_teste', { p: dadosTeste })); },
    criarCompetenciaNoTeste: function (c) {
      return q(sb.rpc('criar_competencia_no_teste', { p_nome: c.nome, p_qualificacao: c.qualificacao_id, p_descricao: c.descricao || null, p_teste: c.teste_id, p_nome_exibido: c.nome_exibido || null }));
    },
    excluirArea: function (areaId, destinoId) { return q(sb.rpc('excluir_area', { p_area: areaId, p_destino: destinoId || null })); },
    excluirTeste: function (id) { return q(sb.from('testes').delete().eq('id', id)); },
    salvarConversao: async function (testeId, faixas) {
      await q(sb.from('tabelas_conversao').delete().eq('teste_id', testeId));
      if (!faixas.length) return [];
      return q(sb.from('tabelas_conversao').insert(faixas.map(function (f) {
        return { teste_id: testeId, pont_min: f.pont_min, pont_max: f.pont_max, nota: f.nota };
      })).select());
    }
  };

  /* ---------- Configurações gerais (linha única) ---------- */
  var config = {
    carregar: function () { return q(sb.from('configuracoes').select('*').eq('id', 1).single()); },
    salvar: function (campos) { return q(sb.from('configuracoes').update(campos).eq('id', 1).select().single()); }
  };

  /* ---------- Processos ---------- */
  var processos = {
    listar: function () { return q(sb.from('processos').select('*').order('criado_em', { ascending: false })); },
    obter: function (id) { return q(sb.from('processos').select('*').eq('id', id).single()); },
    testes: function (id) { return q(sb.from('processo_testes').select('*').eq('processo_id', id).order('ordem')); },
    salvar: function (p) { return q(sb.rpc('salvar_processo', { p: p })); },
    excluir: function (id) { return q(sb.from('processos').delete().eq('id', id)); },
    iniciar: function (id) { return q(sb.rpc('iniciar_processo', { p_id: id })); },
    modelos: async function () {
      var r = await Promise.all([q(sb.from('modelos_processo').select('*').order('nome')), q(sb.from('modelo_testes').select('*').order('ordem'))]);
      return r[0].filter(function (m) { return m.ativo !== false; }).map(function (m) { return Object.assign({}, m, { testes: r[1].filter(function (x) { return x.modelo_id === m.id; }).map(function (x) { return x.teste_id; }) }); });
    }
  };

  /* ---------- Agenda e turmas ---------- */
  var agenda = {
    carregarTudo: async function () {
      var r = await Promise.all([
        q(sb.from('agenda_dias').select('*').order('data')), q(sb.from('turmas').select('*').order('nome')),
        q(sb.from('pre_reservas').select('*')), q(sb.from('bloqueios').select('*')),
        q(sb.from('processos').select('*')), q(sb.rpc('empresas_nomes')), q(sb.from('configuracoes').select('*').eq('id', 1).single())
      ]);
      return { dias: r[0], turmas: r[1], pre: r[2], bloqueios: r[3], processos: r[4], empresas: r[5], config: r[6] };
    },
    salvarTurma: function (t) { return q(sb.rpc('salvar_turma', { p: t })); },
    excluirTurma: function (id) { return q(sb.rpc('excluir_turma', { p_id: id })); },
    salvarPreReserva: function (p) { return q(sb.rpc('salvar_pre_reserva', { p: p })); },
    decidirPreReserva: function (id, acao, novaData) { return q(sb.rpc('decidir_pre_reserva', { p_id: id, p_acao: acao, p_nova_data: novaData || null })); },
    confirmarPreReserva: function (id, processoId, nome, horario, vagas) { return q(sb.rpc('confirmar_pre_reserva', { p_id: id, p_processo: processoId, p_nome: nome, p_horario: horario || null, p_vagas: vagas })); },
    salvarBloqueio: function (b) { return q(sb.rpc('salvar_bloqueio', { p: b })); },
    excluirBloqueio: function (id) { return q(sb.from('bloqueios').delete().eq('id', id)); }
  };

  /* ---------- Jovens ---------- */
  var jovens = {
    doProcesso: async function (processoId) {
      var parts = await q(sb.from('participacoes').select('*').eq('processo_id', processoId).order('numero'));
      var ids = parts.map(function (x) { return x.jovem_id; });
      var js = ids.length ? await q(sb.from('jovens').select('*').in('id', ids)) : [];
      return parts.map(function (x) { return Object.assign({}, x, { jovem: js.filter(function (j) { return j.id === x.jovem_id; })[0] || {} }); });
    },
    todos: function () { return q(sb.from('jovens').select('*').order('nome')); },
    participacoesDe: function (jovemId) { return q(sb.from('participacoes').select('*').eq('jovem_id', jovemId)); },
    todasParticipacoes: function () { return q(sb.from('participacoes').select('*')); },
    salvar: function (p) { return q(sb.rpc('salvar_jovem', { p: p })); },
    iguais: function (nome, nascimento) { return q(sb.rpc('buscar_jovens_iguais', { p_nome: nome, p_nascimento: nascimento || null })); },
    remover: function (participacaoId) { return q(sb.rpc('remover_participacao', { p_id: participacaoId })); },
    salvarFoto: async function (jovemId, arquivo) {
      var blob = await reduzirImagem(arquivo, 600, 'image/jpeg');
      var caminho = 'jovens/' + jovemId + '/foto-' + Date.now() + '.jpg';
      var r = await sb.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
      if (r.error) throw r.error;
      await q(sb.from('jovens').update({ foto_path: caminho }).eq('id', jovemId).select('id').single());
      return caminho;
    },
    urlFoto: async function (caminho) { if (!caminho) return null; var r = await sb.storage.from('fotos').createSignedUrl(caminho, 3600); return r.error ? null : r.data.signedUrl; }
  };

  window.CF.dados = { jovens: jovens, agenda: agenda, processos: processos, config: config, empresas: empresas, pessoas: pessoas, banco: banco, reduzirImagem: reduzirImagem };
})();
