/* =====================================================================
   Classificação Final · views/historico.js
   Monta o histórico dos jovens (todos os processos) para o PDF (modelo da
   ficha, com lista clicável) e para a planilha Excel. Usado em Cadastros › Jovens.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados;
  var SIT_PROC = { montagem: 'Em montagem', andamento: 'Em andamento', revisao: 'Em revisão', liberado: 'Liberado', cancelado: 'Cancelado' };
  var NOME_G = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Não informado' };
  function porId(l, id) { return (l || []).filter(function (x) { return x.id === id; })[0]; }
  function dataBR(s) { var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function flex(g, m, f) { return g === 'feminino' ? f : (g === 'masculino' ? m : m + '(a)'); }
  function idade(n) {
    if (!n) return null; var p = String(n).split('-').map(Number), h = new Date(), a = h.getFullYear() - p[0];
    if (h.getMonth() + 1 < p[1] || (h.getMonth() + 1 === p[1] && h.getDate() < p[2])) a--; return a;
  }
  function diasTxt(ds) {
    if (!ds.length) return '';
    var fim = dataBR(ds[ds.length - 1]); if (ds.length === 1) return fim;
    var mesmo = ds.every(function (x) { return x.slice(0, 7) === ds[0].slice(0, 7); });
    return ds.slice(0, -1).map(function (x) { return mesmo ? x.slice(8, 10) : dataBR(x).slice(0, 5); }).join(', ') + ' e ' + fim;
  }

  /* jovens: lista de jovens · parts: participações · ag: agenda.carregarTudo() */
  async function montar(jovens, parts, ag, comFotos) {
    var K = window.CF.classif, procIds = {}, cls = {}, acomp = {};
    parts.forEach(function (p) { if (jovens.some(function (j) { return j.id === p.jovem_id; })) procIds[p.processo_id] = true; });
    var comResultado = Object.keys(procIds).filter(function (id) { var pr = porId(ag.processos, id); return pr && (pr.situacao === 'revisao' || pr.situacao === 'liberado'); });
    await Promise.all(comResultado.map(function (id) { return dados.classificacao.carregar(id).then(function (c) { cls[id] = c; }).catch(function () { /* sem classificação */ }); }));
    try { var ac = await window.CF.sb.rpc('acomp_listar', { p_proc: null }); (ac.data || []).forEach(function (a) { acomp[a.participacao_id] = a; }); } catch (e) { /* sem acompanhamento */ }
    var urls = {};
    if (comFotos) {
      var caminhos = jovens.map(function (j) { return j.foto_path; }).filter(Boolean);
      for (var i = 0; i < caminhos.length; i += 100) {
        var rs = await window.CF.sb.storage.from('fotos').createSignedUrls(caminhos.slice(i, i + 100), 3600);
        (rs.data || []).forEach(function (x) { if (x.signedUrl) urls[x.path] = x.signedUrl; });
      }
    }
    return jovens.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); }).map(function (j) {
      var g = j.genero;
      var ps = parts.filter(function (p) { return p.jovem_id === j.id; }).map(function (p) {
        var pr = porId(ag.processos, p.processo_id) || {}, em = porId(ag.empresas, pr.empresa_id) || {}, t = porId(ag.turmas, p.turma_id) || {};
        var ds = ag.dias.filter(function (d) { return d.turma_id === p.turma_id; }).map(function (d) { return String(d.data).slice(0, 10); }).sort();
        var c = cls[p.processo_id], eu = c ? c.jovens.filter(function (x) { return x.participacao_id === p.id; })[0] : null;
        var classificados = c ? c.jovens.filter(function (x) { return x.posicao; }).length : 0;
        var mot = '';
        if (eu) {
          if (eu.motivo && eu.situacao !== 'incompleto') mot = K.textoMotivo(eu.motivo, g); else if (eu.situacao === 'reprovado') mot = 'Nota final abaixo de ' + K.corteTxt(c.processo.corte_backup);
          if (mot && eu.observacao) mot += '. ' + eu.observacao;
        }
        var a = acomp[p.id];
        return {
          inicio: ds[0] || '', empresa: em.nome_fantasia || em.razao_social || '', vaga: pr.vaga || '', processo: pr.identificacao || '', datasTxt: diasTxt(ds), turma: t.nome || '', codigo: p.codigo || '',
          situacaoProc: SIT_PROC[pr.situacao] || '', nota: eu && eu.nota != null ? Number(eu.nota) : null,
          posicao: eu ? eu.posicao : null, posicaoTxt: eu && eu.posicao ? eu.posicao + 'º de ' + classificados + ' classificados' : '',
          situacao: eu ? eu.situacao : null, situacaoTxt: eu ? K.textoSituacao(eu.situacao, g) : (SIT_PROC[pr.situacao] || ''), motivo: mot,
          naEmpresa: a ? (a.aprovado ? flex(g, 'aprovado', 'aprovada') + ' em ' + dataBR(a.aprovado_em) : flex(g, 'não aprovado', 'não aprovada')) : '',
          contratado: a && a.contratado != null ? (a.contratado ? 'Sim' : 'Não') : ''
        };
      }).sort(function (x, y) { return (y.inicio || '').localeCompare(x.inicio || ''); });
      return { nome: j.nome, iniciais: ui.iniciais ? ui.iniciais(j.nome) : '', genero: NOME_G[g] || '', generoCod: g, nascimento: j.nascimento, idade: idade(j.nascimento), telefone: j.telefone || '',
               fotoUrl: j.foto_path ? urls[j.foto_path] || null : null, participacoes: ps };
    });
  }
  function linhasExcel(lista) {
    var out = [];
    lista.forEach(function (j) {
      j.participacoes.forEach(function (p) {
        out.push({ nome: j.nome, genero: j.genero, nascimento: j.nascimento, telefone: j.telefone, codigo: p.codigo, empresa: p.empresa, vaga: p.vaga, processo: p.processo, inicio: p.inicio,
          turma: p.turma, situacaoProc: p.situacaoProc, nota: p.nota, posicao: p.posicao, situacao: p.situacaoTxt, cor: p.situacao || '', motivo: p.motivo,
          naEmpresa: p.naEmpresa ? p.naEmpresa.charAt(0).toUpperCase() + p.naEmpresa.slice(1) : '', contratado: p.contratado });
      });
    });
    return out;
  }
  async function baixar(tipo, jovens, parts, ag, botao) {
    if (!navigator.onLine) { ui.toast('Para gerar o histórico é preciso internet.', 'erro'); return; }
    var tx = botao.innerHTML; botao.disabled = true; botao.innerHTML = 'Gerando…';
    try {
      var lista = await montar(jovens, parts, ag, tipo === 'pdf'), blob, um = jovens.length === 1;
      if (tipo === 'pdf') { if (!um) ui.toast('Montando o PDF com ' + lista.length + ' jovens. Pode levar alguns segundos.', 'info'); blob = await window.CF.pdf.historico(lista); }
      else blob = await window.CF.excel.historico({ linhas: linhasExcel(lista) });
      var nome = um ? ['Historico', jovens[0].nome] : ['Historico geral dos candidatos', new Date().toISOString().slice(0, 10)];
      window.CF.pdf.baixar(blob, window.CF.pdf.nomeArquivo(nome, tipo === 'pdf' ? 'pdf' : 'xlsx'));
    } catch (e) { console.error(e); ui.toast(e && e.message ? api.traduzErro(e) : 'Não foi possível gerar o histórico.', 'erro'); }
    botao.disabled = false; botao.innerHTML = tx;
  }
  window.CF.historico = { montar: montar, baixar: baixar };
})();
