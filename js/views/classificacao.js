/* =====================================================================
   Classificação Final · views/classificacao.js
   #/processos/<id>/classificacao   ranking único do processo
   #/processos/<id>/revisao         revisão e liberação para a empresa
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var COR = { aprovado: '#3FA66B', backup: '#E9B500', reprovado: '#D9534F', desistencia: '#8a8486', incompleto: '#5b6b8a' };
  var MOTIVOS = ['perfil_programa', 'comportamento', 'perfil_vaga', 'desistiu'];

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function sujeito(g) { return g === 'feminino' ? 'Candidata' : (g === 'masculino' ? 'Candidato' : 'Participante'); }
  function flex(g, m, f) { return g === 'feminino' ? f : (g === 'masculino' ? m : m + '(a)'); }
  function textoMotivo(m, g) {
    var s = sujeito(g);
    if (m === 'perfil_programa') return s + ' não possui perfil para ingressar no programa';
    if (m === 'comportamento') return s + ' ' + flex(g, 'reprovado', 'reprovada') + ' por comportamento inadequado';
    if (m === 'perfil_vaga') return s + ' não possui perfil para a vaga';
    if (m === 'desistiu') return s + ' desistiu do processo seletivo';
    return '';
  }
  function textoSituacao(s, g) {
    if (s === 'aprovado') return flex(g, 'Aprovado', 'Aprovada');
    if (s === 'backup') return 'Backup';
    if (s === 'reprovado') return flex(g, 'Reprovado', 'Reprovada');
    if (s === 'desistencia') return 'Desistência';
    return 'Notas incompletas';
  }
  function n2(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ','); }
  function corteTxt(v) { return Number(v).toFixed(2).replace('.', ','); }
  // Mostra a 3ª casa quando ela é o que separa dois jovens que aparecem iguais com 2 casas
  function notaHTML(j, lista) {
    if (j.nota == null) return '—';
    var dois = Number(j.nota).toFixed(2), tres = Number(j.nota).toFixed(3);
    var precisa = !j.empate && lista.some(function (x) { return x !== j && x.nota != null && Number(x.nota).toFixed(2) === dois && Number(x.nota).toFixed(3) !== tres; });
    return precisa ? dois.replace('.', ',') + '<small class="casa3">' + tres.slice(-1) + '</small>' : dois.replace('.', ',');
  }
  function etapas(sit) {
    var et = [['montagem', '1 · Montagem', 'dados, testes, turmas e jovens'], ['andamento', '2 · Em andamento', 'lançamento das notas'], ['revisao', '3 · Revisão', 'conferência e fechamento'], ['liberado', '4 · Liberado', 'resultado para a empresa']];
    var idx = et.map(function (e) { return e[0]; }).indexOf(sit);
    return '<div class="etapas">' + et.map(function (e, i) { return '<div class="etapa' + (i === idx ? ' atual' : '') + (i < idx ? ' feita' : '') + '"><b>' + e[1] + '</b><small>' + e[2] + '</small></div>'; }).join('') + '</div>';
  }

  /* Monta e gera o PDF do processo. dp = dados_processo_pdf · cl = classificacao_processo (ordem do ranking) */
  async function gerarPdfProcesso(dp, cl) {
    var sb = window.CF.sb, emp = dp.empresa || {}, porId = {};
    (dp.fichas || []).forEach(function (f) { porId[f.participacao_id] = f; });
    var caminhos = (dp.fichas || []).map(function (f) { return f.jovem && f.jovem.foto_path; }).filter(Boolean), urls = {};
    if (caminhos.length) {
      var rs = await sb.storage.from('fotos').createSignedUrls(caminhos, 3600);
      (rs.data || []).forEach(function (x) { if (x.signedUrl) urls[x.path] = x.signedUrl; });
    }
    var logoUrl = emp.logo_path ? await dados.empresas.urlLogo(emp.logo_path).catch(function () { return null; }) : null;
    var cont = { aprovado: 0, backup: 0, reprovado: 0, desistencia: 0, incompleto: 0 }, ranking = [], fichas = [];
    cl.jovens.forEach(function (j) {
      cont[j.situacao] = (cont[j.situacao] || 0) + 1;
      var mot = j.motivo && j.situacao !== 'incompleto' ? textoMotivo(j.motivo, j.genero) : (j.situacao === 'reprovado' ? 'Nota final abaixo de ' + corteTxt(cl.processo.corte_backup) : '');
      var det = j.situacao === 'desistencia' && j.desistencia && j.desistencia !== 'FALTOU' ? ' · ' + j.desistencia.toLowerCase() : (j.situacao === 'desistencia' && !j.observacao ? ' · faltou' : '');
      ranking.push({ posicao: j.posicao, empate: j.empate, nome: j.nome, codigo: j.codigo, turma: j.turma, nota: j.nota == null ? null : Number(j.nota),
                     situacao: j.situacao, situacaoTxt: textoSituacao(j.situacao, j.genero), detalhe: mot || '' });
      var f = porId[j.participacao_id];
      fichas.push(f ? window.CF.fichaDados(f, j, cl, 'areas', f.jovem.foto_path ? urls[f.jovem.foto_path] || null : null, logoUrl) : null);
    });
    var pr = dp.processo || {}, quando = pr.liberado_em || new Date().toISOString();
    var vars = { empresa: emp.nome || '', vaga: pr.vaga || '', processo: pr.identificacao || '', data: new Date(quando).toLocaleDateString('pt-BR') };
    var agr = String(dp.agradecimento || '').replace(/\{(empresa|vaga|processo|data)\}/g, function (m, k) { return vars[k]; });
    return window.CF.pdf.processo({
      empresa: emp.nome || '', razaoSocial: emp.razao_social || '', logoEmpresaUrl: logoUrl, vaga: pr.vaga, identificacao: pr.identificacao, agradecimento: agr,
      turmas: dp.turmas || [], contagem: cont, total: cl.jovens.length, liberadoEm: pr.liberado_em, previa: pr.situacao !== 'liberado',
      ranking: ranking, fichas: fichas
    });
  }
  window.CF.gerarPdfProcesso = gerarPdfProcesso;

  // usados também pela ficha do candidato (views/ficha.js)
  window.CF.classif = { COR: COR, textoMotivo: textoMotivo, textoSituacao: textoSituacao, n2: n2, corteTxt: corteTxt };

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.classificacao = async function (area, ctx, procId) {
    var admin = ctx.perfil.perfil === 'admin', st = { busca: '', turma: '', sit: '' };
    area.innerHTML = '<a class="voltar" href="#/processos/' + esc(procId) + '">← Processo</a><div id="cl"><div class="girando" style="margin:30px auto"></div></div>';
    var c, emp;
    async function carregar() {
      var r = await Promise.all([dados.classificacao.carregar(procId), window.CF.sb.rpc('empresas_nomes')]);
      c = r[0]; emp = ((r[1] && r[1].data) || []).filter(function (e) { return e.id === c.processo.empresa_id; })[0] || {};
      area.querySelector('.voltar').textContent = '← ' + (emp.nome_fantasia || '') + ' · ' + c.processo.vaga;
    }
    try { await carregar(); } catch (e) { erro(e); area.querySelector('#cl').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }

    function desenhar() {
      var p = c.processo, js = c.jovens, turmas = {};
      js.forEach(function (j) { turmas[j.turma_id] = j.turma; });
      var cont = { aprovado: 0, backup: 0, reprovado: 0, desistencia: 0, incompleto: 0 }; js.forEach(function (j) { cont[j.situacao]++; });
      var podeMotivo = p.situacao === 'andamento' || p.situacao === 'revisao';
      var lista = js.filter(function (j) { return (!st.busca || ui.normalizar(j.nome + ' ' + j.codigo).indexOf(st.busca) >= 0) && (!st.turma || j.turma_id === st.turma) && (!st.sit || j.situacao === st.sit); });
      var areas = c.areas || [];
      var acao = admin ? (p.situacao === 'andamento' ? '<a class="btn btn-pri" href="#/processos/' + procId + '/revisao">Enviar para revisão</a>'
        : p.situacao === 'revisao' ? '<a class="btn btn-pri" href="#/processos/' + procId + '/revisao">Revisar e liberar</a>'
        : p.situacao === 'liberado' ? '<a class="btn" href="#/processos/' + procId + '/revisao">Liberado · ver</a>' : '') : '';
      area.querySelector('#cl').innerHTML =
        '<header class="cabecalho"><div><h1>Classificação</h1><p>' + Object.keys(turmas).length + ' turma(s) · ' + js.length + ' jovens · ranking único do processo</p></div>' +
          '<div class="botoes-topo"><button type="button" class="btn" id="cl-xls">⬇ Excel</button><button type="button" class="btn" id="cl-pdf">⬇ PDF do processo</button>' + acao + '</div></header>' + etapas(p.situacao) +
        '<div class="rk-res">' + [['aprovado', 'Aprovados · a partir de ' + corteTxt(p.corte_aprovado)], ['backup', 'Backup · ' + corteTxt(p.corte_backup) + ' a ' + corteTxt(p.corte_aprovado - 0.01)], ['reprovado', 'Reprovados'], ['desistencia', 'Desistências']].concat(cont.incompleto ? [['incompleto', 'Notas incompletas']] : []).map(function (x) {
          return '<button type="button" class="rk-c' + (st.sit === x[0] ? ' on' : '') + '" data-sit="' + x[0] + '" style="--c:' + COR[x[0]] + '"><b>' + cont[x[0]] + '</b><span>' + x[1] + '</span></button>';
        }).join('') + '</div>' +
        '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="cl-busca" placeholder="Buscar jovem" value="' + esc(st.busca) + '"></label>' +
          '<select class="entrada sel-f" id="cl-turma"><option value="">Todas as turmas</option>' + Object.keys(turmas).map(function (id) { return '<option value="' + id + '"' + (st.turma === id ? ' selected' : '') + '>' + esc(turmas[id]) + '</option>'; }).join('') + '</select></div>' +
        (lista.length ? '<div class="tabela-rolar"><table class="rk"><thead><tr><th>Pos.</th><th>Jovem</th><th>Nota final</th><th>Áreas</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
          lista.map(function (j) {
            var mot = j.motivo && j.situacao !== 'incompleto' ? textoMotivo(j.motivo, j.genero) : (j.situacao === 'reprovado' ? 'Nota final abaixo de ' + corteTxt(p.corte_backup) : '');
            var det = j.situacao === 'desistencia' && j.desistencia && j.desistencia !== 'FALTOU' ? ' · ' + j.desistencia.toLowerCase() : (j.situacao === 'desistencia' && !j.observacao ? ' · faltou' : '');
            return '<tr style="--c:' + COR[j.situacao] + '"><td class="pos">' + (j.posicao ? j.posicao + 'º' : '—') + '</td>' +
              '<td class="nm"><b>' + esc(j.nome) + '</b><small>' + esc(j.turma + ' · ' + j.codigo) + '</small></td>' +
              '<td><div class="nf"><span>' + notaHTML(j, js) + '</span>' + (j.empate ? '<span class="empate">empate</span>' : '') + (j.nota != null ? '<i><em style="width:' + Math.round(j.nota * 20) + '%"></em></i>' : '') + '</div>' + (j.situacao === 'incompleto' ? '<small class="dica">' + j.lancadas + ' de ' + j.total + ' notas</small>' : '') + '</td>' +
              '<td class="ar">' + areas.map(function (a) { var v = (j.areas || {})[a]; return v == null ? '' : '<span><b>' + esc(a.slice(0, 3)) + '</b> ' + n2(v) + '</span>'; }).join(' ') + '</td>' +
              '<td><span class="sit">' + textoSituacao(j.situacao, j.genero) + '</span>' + (mot ? '<span class="mot">' + esc(mot + det) + (j.motivo_por ? ' · por ' + esc(j.motivo_por.split(' ')[0]) : '') + '</span>' : '') + '</td>' +
              '<td class="ac"><a class="btn btn-p" href="#/processos/' + procId + '/ficha/' + j.participacao_id + '">Ficha</a>' + (podeMotivo && j.situacao !== 'desistencia' || (podeMotivo && j.motivo === 'desistiu') ? '<button type="button" class="btn btn-p" data-mot="' + j.participacao_id + '">Motivo</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="card vazio">Nenhum jovem nesse filtro.</div>') +
        '<p class="dica">Ordem: aprovados, backups, reprovados e desistências; em cada faixa, da maior para a menor nota. Notas iguais até a 3ª casa decimal ficam empatadas na mesma posição.</p>';
      ligar();
    }
    function ligar() {
      var box = area.querySelector('#cl');
      box.querySelectorAll('[data-sit]').forEach(function (b) { b.addEventListener('click', function () { st.sit = st.sit === b.getAttribute('data-sit') ? '' : b.getAttribute('data-sit'); desenhar(); }); });
      var bb = box.querySelector('#cl-busca'); bb.addEventListener('input', function () { st.busca = ui.normalizar(bb.value); var pos = bb.selectionStart; desenhar(); var n = area.querySelector('#cl-busca'); n.focus(); n.setSelectionRange(pos, pos); });
      box.querySelector('#cl-turma').addEventListener('change', function (e) { st.turma = e.target.value; desenhar(); });
      box.querySelectorAll('[data-mot]').forEach(function (b) { b.addEventListener('click', function () { motivo(c.jovens.filter(function (j) { return j.participacao_id === b.getAttribute('data-mot'); })[0]); }); });
      box.querySelector('#cl-xls').addEventListener('click', excel);
      box.querySelector('#cl-pdf').addEventListener('click', function () { pdfProcesso(this); });
    }
    function motivo(j) {
      var jn = ui.janela({ titulo: 'Motivo de reprovação · ' + j.nome,
        corpo: '<p style="margin:0;color:var(--texto-2)">Nota final ' + n2(j.nota) + (j.situacao === 'aprovado' || j.situacao === 'backup' ? ' (sem motivo, ficaria ' + textoSituacao(j.situacao, j.genero).toLowerCase() + ')' : '') + '. Escolha o motivo:</p>' +
          '<div class="mt">' + MOTIVOS.map(function (m) { return '<label class="' + (j.motivo === m ? 's' : '') + '"><input type="radio" name="mt" value="' + m + '"' + (j.motivo === m ? ' checked' : '') + '> ' + esc(textoMotivo(m, j.genero)) + '</label>'; }).join('') + '</div>' +
          '<label class="campo" for="mt-obs"><span>Observação (vai para a ficha) <span class="obrig">*</span></span><textarea class="entrada" id="mt-obs" rows="3" maxlength="600">' + esc(j.observacao || '') + '</textarea></label>' +
          '<p class="dica" style="margin:0">Qualquer avaliador pode aplicar. Fica registrado quem aplicou e quando.</p>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }].concat(j.observacao ? [{ texto: 'Retirar motivo', aoClicar: async function () {
            if (!(await ui.confirmar('Retirar o motivo?', 'A situação volta a ser calculada pela nota.', 'Retirar', 'Cancelar'))) return false;
            try { await dados.classificacao.removerMotivo(j.participacao_id); ui.toast('Motivo retirado.', 'ok'); await carregar(); desenhar(); return true; } catch (e) { erro(e); return false; } } }] : [])
          .concat([{ texto: 'Aplicar motivo', principal: true, aoClicar: async function (f) {
            var m = (f.querySelector('input[name=mt]:checked') || {}).value, obs = ui.maiusculas(f.querySelector('#mt-obs').value.trim());
            if (!m) { ui.toast('Escolha o motivo.', 'erro'); return false; }
            if (obs.length < 5) { ui.toast('Escreva a observação do motivo.', 'erro'); return false; }
            try { await dados.classificacao.aplicarMotivo(j.participacao_id, m, obs); ui.toast('Motivo aplicado.', 'ok'); await carregar(); desenhar(); return true; } catch (e) { erro(e); return false; }
          } }]) });
      jn.elemento.querySelectorAll('input[name=mt]').forEach(function (r) { r.addEventListener('change', function () { jn.elemento.querySelectorAll('.mt label').forEach(function (l) { l.classList.toggle('s', l.contains(r) && r.checked); }); }); });
    }
    async function pdfProcesso(botao) {
      if (!navigator.onLine) { ui.toast('Para gerar o PDF do processo é preciso internet.', 'erro'); return; }
      var texto = botao.innerHTML; botao.disabled = true; botao.innerHTML = 'Gerando…';
      try {
        var r = await window.CF.sb.rpc('dados_processo_pdf', { p_proc: procId });
        if (r.error) throw r.error;
        botao.innerHTML = 'Montando o PDF…';
        window.CF.ui.toast('Montando o PDF com ' + c.jovens.length + ' fichas. Pode levar alguns segundos.', 'info');
        window.CF.pdf.baixar(await gerarPdfProcesso(r.data, c), window.CF.pdf.nomeArquivo(['Processo seletivo', (r.data.empresa || {}).nome, c.processo.vaga, c.processo.situacao === 'liberado' ? '' : 'PREVIA'], 'pdf'));
      } catch (e) { console.error(e); ui.toast(e && e.message ? api.traduzErro(e) : 'Não foi possível gerar o PDF.', 'erro'); }
      botao.disabled = false; botao.innerHTML = texto;
    }
    function excel() {
      if (!window.XLSX) { ui.toast('Recurso de planilha indisponível.', 'erro'); return; }
      var areas = c.areas || [];
      var linhas = [['Posição', 'Nome', 'Código', 'Turma', 'Nota final'].concat(areas).concat(['Situação', 'Motivo', 'Observação'])];
      c.jovens.forEach(function (j) {
        linhas.push([j.posicao ? j.posicao + 'º' + (j.empate ? ' (empate)' : '') : '—', j.nome, j.codigo, j.turma, j.nota == null ? '' : Number(j.nota)]
          .concat(areas.map(function (a) { var v = (j.areas || {})[a]; return v == null ? '' : Number(v); }))
          .concat([textoSituacao(j.situacao, j.genero), j.motivo ? textoMotivo(j.motivo, j.genero) : '', j.observacao || '']));
      });
      var ws = window.XLSX.utils.aoa_to_sheet(linhas); ws['!cols'] = [{ wch: 10 }, { wch: 34 }, { wch: 10 }, { wch: 12 }, { wch: 10 }].concat(areas.map(function () { return { wch: 12 }; })).concat([{ wch: 16 }, { wch: 50 }, { wch: 50 }]);
      var wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, 'Classificação');
      window.XLSX.writeFile(wb, 'classificacao_' + (emp.nome_fantasia || 'empresa').replace(/\W+/g, '_') + '_' + c.processo.vaga.replace(/\W+/g, '_') + '.xlsx');
    }
    desenhar();
  };

  /* ================================================================
     REVISÃO E LIBERAÇÃO (administrador)
     ================================================================ */
  window.CF.telas.revisao = async function (area, ctx, procId) {
    var admin = ctx.perfil.perfil === 'admin';
    area.innerHTML = '<a class="voltar" href="#/processos/' + esc(procId) + '/classificacao">← Classificação</a><div id="rv"><div class="girando" style="margin:30px auto"></div></div>';
    var c, pend;
    async function carregar() { var r = await Promise.all([dados.classificacao.carregar(procId), dados.classificacao.pendencias(procId)]); c = r[0]; pend = r[1]; }
    try { await carregar(); } catch (e) { erro(e); return; }
    function desenhar() {
      var p = c.processo, js = c.jovens;
      var empates = {}; js.forEach(function (j) { if (j.empate) empates[j.posicao] = (empates[j.posicao] || 0) + 1; });
      var incompletos = js.filter(function (j) { return j.situacao === 'incompleto'; }).length;
      var semObs = pend.sem_observacao || 0;
      var okTurmas = pend.turmas > 0 && pend.turmas_concluidas === pend.turmas, okSug = !pend.sugestoes_pendentes, okInc = !incompletos;
      var item = function (ok, txt, link) { return '<div class="chk-i' + (ok ? ' ok' : ' pend') + '"><span>' + (ok ? '✅' : '⚠️') + '</span><span>' + txt + '</span>' + (link || '') + '</div>'; };
      var lista = item(okTurmas, 'Todas as turmas concluídas (' + pend.turmas_concluidas + ' de ' + pend.turmas + ')') +
        item(okSug, pend.sugestoes_pendentes ? pend.sugestoes_pendentes + ' sugestão(ões) aguardando decisão' : 'Nenhuma sugestão pendente') +
        item(okInc, incompletos ? incompletos + ' jovem(ns) com notas incompletas' : 'Todas as notas lançadas', incompletos ? '<a href="#/processos/' + procId + '/classificacao">ver</a>' : '') +
        item(!semObs, semObs ? semObs + ' motivo(s) sem observação' : 'Todos os motivos de reprovação têm observação') +
        (Object.keys(empates).length ? '<div class="chk-i info"><span>ℹ️</span><span>' + Object.keys(empates).map(function (k) { return empates[k] + ' jovens empatados no ' + k + 'º lugar'; }).join(' · ') + ' (nota igual até a 3ª casa)</span></div>' : '');
      var podeEnviar = p.situacao === 'andamento' && okTurmas && okSug && okInc;
      var podeLiberar = p.situacao === 'revisao' && okTurmas && okSug && okInc && !semObs;
      area.querySelector('#rv').innerHTML = '<header class="cabecalho"><div><h1>Revisão e liberação</h1><p>' + esc(p.vaga + ' · ' + p.identificacao) + '</p></div></header>' +
        '<section class="card bloco chk"><span class="lbl">' + (p.situacao === 'liberado' ? 'Processo liberado para a empresa' : 'Antes de liberar') + '</span>' + lista +
          (p.situacao === 'revisao' ? '<label class="chk-i conf"><input type="checkbox" id="rv-conf"> <span>Ranking conferido pela coordenação</span></label>' : '') + '</section>' +
        (p.situacao === 'liberado' ? '<div class="aviso aviso-ok">' + ui.icone('ok', 18) + '<span>Liberado em ' + new Date(p.liberado_em).toLocaleString('pt-BR') + '. A empresa já pode ver o resultado no portal (Fase 6).</span></div>'
          : '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>Ao <b>liberar</b>, a empresa passa a ver a classificação final, as fichas, as notas e o gráfico de radar. Os dados ficam travados; só o administrador pode reabrir, com motivo registrado.</span></div>') +
        (admin ? '<div class="bloco-botoes">' +
          (p.situacao === 'andamento' ? '<button type="button" class="btn btn-pri" id="rv-env"' + (podeEnviar ? '' : ' disabled') + '>Enviar para revisão</button>' : '') +
          (p.situacao === 'revisao' ? '<button type="button" class="btn btn-pri" id="rv-lib" disabled>Liberar para a empresa</button>' : '') +
          (p.situacao === 'revisao' || p.situacao === 'liberado' ? '<button type="button" class="btn" id="rv-reab">' + (p.situacao === 'liberado' ? 'Reabrir a revisão' : 'Voltar para em andamento') + '</button>' : '') + '</div>' : '');
      var conf = area.querySelector('#rv-conf'), lib = area.querySelector('#rv-lib');
      if (conf && lib) conf.addEventListener('change', function () { lib.disabled = !(conf.checked && podeLiberar); });
      var env = area.querySelector('#rv-env');
      if (env) env.addEventListener('click', async function () {
        if (!(await ui.confirmar('Enviar para revisão?', 'O lançamento de notas é encerrado. Ainda dá para aplicar motivos de reprovação na revisão.', 'Enviar', 'Cancelar'))) return;
        try { await dados.classificacao.enviarRevisao(procId); ui.toast('Processo em revisão.', 'ok'); await carregar(); desenhar(); } catch (e) { erro(e); }
      });
      if (lib) lib.addEventListener('click', async function () {
        if (!(await ui.confirmar('Liberar o resultado para a empresa?', 'A empresa passa a ver a classificação final. Os dados ficam travados.', 'Liberar', 'Cancelar'))) return;
        try { await dados.classificacao.liberar(procId); ui.toast('Resultado liberado para a empresa.', 'ok'); await carregar(); desenhar(); } catch (e) { erro(e); }
      });
      var reab = area.querySelector('#rv-reab');
      if (reab) reab.addEventListener('click', function () {
        ui.janela({ titulo: reab.textContent, confirmarDescarte: false, corpo: '<label class="campo"><span>Motivo <span class="obrig">*</span></span><input class="entrada" id="rb-m" maxlength="200"></label><p class="dica" style="margin:0">Fica registrado no histórico.</p>',
          botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Confirmar', principal: true, aoClicar: async function (f) {
            var m = ui.maiusculas(f.querySelector('#rb-m').value.trim()); if (m.length < 5) { ui.toast('Informe o motivo.', 'erro'); return false; }
            try { await dados.classificacao.reabrir(procId, m); ui.toast('Processo reaberto.', 'ok'); await carregar(); desenhar(); return true; } catch (e) { erro(e); return false; }
          } }] });
      });
    }
    desenhar();
  };
})();
