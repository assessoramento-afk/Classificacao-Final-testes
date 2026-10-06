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
    atualizar: function (id, campos) { return q(sb.from('perfis').update(campos).eq('id', id).select('id').single()); }
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
        q(sb.from('tabelas_conversao').select('*').order('pont_min'))
      ]);
      return { areas: r[0], qualificacoes: r[1], competencias: r[2], testes: r[3], criterios: r[4], conversao: r[5] };
    },
    salvarArea: function (a) { return salvar('areas', a); },
    salvarCompetencia: function (c) { return salvar('competencias', c); },
    excluirCompetencia: function (id) { return q(sb.from('competencias').delete().eq('id', id)); },
    salvarTeste: function (t) { return salvar('testes', t); },
    salvarCriterio: function (c) { return salvar('teste_criterios', c); },
    excluirCriterio: function (id) { return q(sb.from('teste_criterios').delete().eq('id', id)); },
    // Substitui a tabela de conversão de um teste inteira
    salvarConversao: async function (testeId, faixas) {
      await q(sb.from('tabelas_conversao').delete().eq('teste_id', testeId));
      if (!faixas.length) return [];
      return q(sb.from('tabelas_conversao').insert(faixas.map(function (f) {
        return { teste_id: testeId, pont_min: f.pont_min, pont_max: f.pont_max, nota: f.nota };
      })).select());
    }
  };

  window.CF.dados = { empresas: empresas, pessoas: pessoas, banco: banco, reduzirImagem: reduzirImagem };
})();
