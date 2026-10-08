/* =====================================================================
   Classificação Final · views/jovens.js
   Jovens do processo (#/processos/<id>/jovens) e todos os jovens
   (#/cadastros/jovens). Cadastro com foto, gênero, responsável (menores),
   termo de consentimento, alerta de cadastro repetido e importação.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc, D = window.CF.datas;
  var GENEROS = [['feminino', 'Feminino'], ['masculino', 'Masculino'], ['outro', 'Outro'], ['nao_informado', 'Prefiro não informar']];
  var NOME_G = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Não informado' };

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  function porId(l, id) { return (l || []).filter(function (x) { return x.id === id; })[0]; }
  function idade(nasc) {
    if (!nasc) return null;
    var n = D.data(nasc), h = new Date(), a = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
    return a;
  }
  function iniciais(nome) { return ui.iniciais(nome || '?'); }
  function fotoHTML(j, cls) { return '<span class="fotinho ' + (cls || '') + '" data-foto="' + esc(j.foto_path || '') + '">' + esc(iniciais(j.nome)) + '</span>'; }
  function carregarFotos(raiz) {
    raiz.querySelectorAll('[data-foto]').forEach(function (el) {
      var c = el.getAttribute('data-foto'); if (!c) return;
      dados.jovens.urlFoto(c).then(function (u) { if (u) el.innerHTML = '<img src="' + esc(u) + '" alt="">'; });
    });
  }
  // Situação do cadastro: o que falta
  function faltas(pa) {
    var f = [];
    if (!pa.jovem.foto_path) f.push('Falta foto');
    if (!pa.termo_recebido_em) f.push('Falta termo');
    var i = idade(pa.jovem.nascimento);
    if (i != null && i < 18 && !pa.responsavel_nome) f.push('Falta responsável');
    return f;
  }

  /* ================================================================
     JOVENS DO PROCESSO
     ================================================================ */
  window.CF.telas = window.CF.telas || {};
  window.CF.telas.jovensProcesso = async function (area, ctx, procId) {
    var admin = ctx.perfil.perfil === 'admin';
    area.innerHTML = '<a class="voltar" href="#/processos/' + esc(procId) + '">← Processo</a><div id="jv"><div class="girando" style="margin:30px auto"></div></div>';
    var st = { turma: null, busca: '' };
    var p, ag, emp, parts, cfg, contagem = {};
    async function carregar() {
      var r = await Promise.all([dados.processos.obter(procId), dados.agenda.carregarTudo(), dados.jovens.doProcesso(procId), dados.config.carregar(), dados.jovens.todasParticipacoes()]);
      p = r[0]; ag = r[1]; parts = r[2]; cfg = r[3];
      contagem = {}; r[4].forEach(function (x) { contagem[x.jovem_id] = (contagem[x.jovem_id] || 0) + 1; });
      emp = porId(ag.empresas, p.empresa_id) || {};
    }
    try { await carregar(); } catch (e) { erro(e); area.querySelector('#jv').innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>' + esc(api.traduzErro(e)) + '</span></div>'; return; }
    area.querySelector('.voltar').textContent = '← ' + (emp.nome_fantasia || '') + ' · ' + p.vaga;
    var aberto = p.situacao === 'montagem' || p.situacao === 'andamento';

    function turmas() {
      return ag.turmas.filter(function (t) { return t.processo_id === p.id; }).map(function (t) {
        var dias = ag.dias.filter(function (d) { return d.turma_id === t.id; }).map(function (d) { return d.data; }).sort();
        return Object.assign({}, t, { dias: dias });
      }).sort(function (a, b) { return (a.dias[0] || '').localeCompare(b.dias[0] || ''); });
    }
    function desenhar() {
      var ts = turmas();
      if (!st.turma || !porId(ts, st.turma)) st.turma = ts[0] ? ts[0].id : null;
      var tot = parts.length, vagas = ts.reduce(function (s, t) { return s + t.vagas; }, 0);
      var box = area.querySelector('#jv');
      if (!ts.length) {
        box.innerHTML = '<header class="cabecalho"><div><h1>Jovens do processo</h1><p>Crie uma turma antes de cadastrar os jovens.</p></div></header><div class="card vazio">Este processo ainda não tem turmas. Volte ao processo e use "+ Turma".</div>';
        return;
      }
      var t = porId(ts, st.turma);
      var lista = parts.filter(function (x) { return x.turma_id === t.id && (!st.busca || ui.normalizar(x.jovem.nome + ' ' + x.codigo).indexOf(st.busca) >= 0); });
      var incompletos = parts.filter(function (x) { return x.turma_id === t.id && faltas(x).length; }).length;
      box.innerHTML = '<header class="cabecalho"><div><h1>Jovens do processo</h1><p>' + ts.length + ' turma' + (ts.length > 1 ? 's' : '') + ' · ' + tot + ' jove' + (tot === 1 ? 'm' : 'ns') + ' cadastrado' + (tot === 1 ? '' : 's') + ' de ' + vagas + ' vagas</p></div>' +
        '<div class="botoes-topo">' + (lista.length ? '<button type="button" class="btn" id="jv-termos">🖨 Termos da turma</button>' : '') +
        (aberto ? '<button type="button" class="btn" id="jv-importar">⬆ Importar lista</button><button type="button" class="btn" id="jv-existente">+ Já cadastrado</button><button type="button" class="btn btn-pri" id="jv-novo">' + ui.icone('mais', 17) + 'Novo jovem</button>' : '') + '</div></header>' +
        '<div class="segmentos seg-turmas" role="group" aria-label="Turma">' + ts.map(function (x) {
          var n = parts.filter(function (y) { return y.turma_id === x.id; }).length;
          return '<button type="button" data-turma="' + x.id + '" aria-pressed="' + (x.id === t.id) + '">' + esc(x.nome + ' · ' + x.dias.map(D.curta).join(' e ') + ' · ' + n + ' de ' + x.vagas) + '</button>';
        }).join('') + '</div>' +
        '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="jv-busca" placeholder="Buscar por nome ou código" value="' + esc(st.busca) + '"></label>' +
          (incompletos ? '<span class="dica">' + incompletos + ' cadastro' + (incompletos > 1 ? 's' : '') + ' incompleto' + (incompletos > 1 ? 's' : '') + '</span>' : '') + '</div>' +
        (lista.length ? '<div class="card tabela-card"><table class="tabela tabela-jovens"><thead><tr><th>Nº</th><th>Jovem</th><th>Código</th><th>Convocação</th><th>Cadastro</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
          lista.map(function (x) {
            var i = idade(x.jovem.nascimento), f = faltas(x);
            return '<tr><td class="num">' + x.numero + '</td><td><div class="cel-j">' + fotoHTML(x.jovem) + '<div><b>' + esc(x.jovem.nome) + '</b><small>' + esc(NOME_G[x.jovem.genero] || '') + (i != null ? ' · ' + i + ' anos' : '') + '</small></div></div></td>' +
              '<td><span class="cod">' + esc(x.codigo) + '</span></td><td>' + (x.convocacao ? D.completa(x.convocacao) : '—') + '</td>' +
              '<td>' + (f.length ? f.map(function (y) { return ui.pill(y, 'off'); }).join(' ') : ui.pill('Completo', 'sim')) + (contagem[x.jovem_id] > 1 ? ' ' + ui.pill(contagem[x.jovem_id] + 'º processo', 'neu') : '') + '</td>' +
              '<td><div class="acoes"><button type="button" class="btn btn-p" data-termo="' + x.id + '" title="Imprimir termo">🖨</button>' + (aberto ? '<button type="button" class="btn btn-p" data-editar="' + x.id + '">Editar</button>' : '') +
                (admin && p.situacao === 'montagem' ? '<button type="button" class="btn btn-p btn-perigo" data-remover="' + x.id + '">Remover</button>' : '') + '</div></td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="card vazio">' + (st.busca ? 'Nenhum jovem encontrado.' : 'Nenhum jovem nesta turma ainda.' + (aberto ? ' Use "Novo jovem" ou "Importar lista".' : '')) + '</div>');
      carregarFotos(box);
      box.querySelectorAll('[data-turma]').forEach(function (b) { b.addEventListener('click', function () { st.turma = b.getAttribute('data-turma'); desenhar(); }); });
      var bb = box.querySelector('#jv-busca');
      bb.addEventListener('input', function () { st.busca = ui.normalizar(bb.value); var pos = bb.selectionStart; desenhar(); var n = area.querySelector('#jv-busca'); n.focus(); n.setSelectionRange(pos, pos); });
      if (box.querySelector('#jv-novo')) box.querySelector('#jv-novo').addEventListener('click', function () { formJovem(null); });
      if (box.querySelector('#jv-importar')) box.querySelector('#jv-importar').addEventListener('click', function () { importar(t); });
      if (box.querySelector('#jv-existente')) box.querySelector('#jv-existente').addEventListener('click', function () { adicionarExistente(t); });
      if (box.querySelector('#jv-termos')) box.querySelector('#jv-termos').addEventListener('click', function () { imprimirTermos(lista); });
      box.querySelectorAll('[data-editar]').forEach(function (b) { b.addEventListener('click', function () { formJovem(porId(parts, b.getAttribute('data-editar'))); }); });
      box.querySelectorAll('[data-termo]').forEach(function (b) { b.addEventListener('click', function () { imprimirTermos([porId(parts, b.getAttribute('data-termo'))]); }); });
      box.querySelectorAll('[data-remover]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var x = porId(parts, b.getAttribute('data-remover'));
          if (!(await ui.confirmar('Tirar ' + x.jovem.nome + ' deste processo?', 'O cadastro do jovem continua no sistema; só a participação neste processo é apagada.', 'Remover', 'Cancelar'))) return;
          try { await dados.jovens.remover(x.id); ui.toast('Jovem removido do processo.', 'ok'); await recarregar(); } catch (e) { erro(e); }
        });
      });
    }
    async function recarregar() { try { await carregar(); desenhar(); } catch (e) { erro(e); } }

    function infoDoc() { return { empresa: emp.nome_fantasia || '', vaga: p.vaga, processo: p.identificacao }; }
    function imprimirTermos(lista) {
      var ts = turmas();
      window.CF.documentos.termos(infoDoc(), lista.map(function (x) {
        var t = porId(ts, x.turma_id) || {};
        return { nome: x.jovem.nome, codigo: x.codigo, turma: t.nome, dias: (t.dias || []).map(D.curta).join(' e '), genero: x.jovem.genero, nascimento: x.jovem.nascimento,
          telefone: x.jovem.telefone, responsavel_nome: x.responsavel_nome, responsavel_parentesco: x.responsavel_parentesco };
      }), { jovem: cfg.texto_termo_jovem, responsavel: cfg.texto_termo_responsavel });
    }

    /* ---------- Cadastro / edição ---------- */
    function formJovem(pa) {
      var novo = !pa, j = pa ? pa.jovem : {}, ts = turmas();
      var genero = j.genero || '', arquivoFoto = null;
      var jn = ui.janela({
        titulo: (novo ? 'Novo jovem' : 'Editar jovem') + ' · ' + (porId(ts, pa ? pa.turma_id : st.turma) || {}).nome,
        corpo: '<div class="jovem-topo"><div class="foto-col"><div class="foto-box" id="fj-foto">' + (j.foto_path ? '' : 'SEM FOTO') + '</div>' +
            '<div class="foto-bts"><button type="button" class="btn btn-p" id="fj-camera">📷 Foto</button><button type="button" class="btn btn-p" id="fj-galeria">🖼 Galeria</button></div></div>' +
          '<div class="jovem-dados"><label class="campo" for="fj-nome"><span>Nome completo <span class="obrig">*</span></span><input class="entrada" id="fj-nome" maxlength="120" value="' + esc(j.nome || '') + '"></label>' +
            '<div class="campo"><span>Gênero <span class="obrig">*</span></span><div class="segmentos seg-genero" role="group" aria-label="Gênero">' + GENEROS.map(function (g) { return '<button type="button" data-gen="' + g[0] + '" aria-pressed="' + (genero === g[0]) + '">' + g[1] + '</button>'; }).join('') + '</div></div>' +
            '<div class="form-grade"><label class="campo" for="fj-nasc"><span>Nascimento</span><input class="entrada" type="date" id="fj-nasc" value="' + esc(j.nascimento || '') + '" max="' + D.hoje() + '"></label>' +
            '<label class="campo" for="fj-tel"><span>Telefone</span><input class="entrada" id="fj-tel" inputmode="tel" maxlength="15" value="' + esc(j.telefone || '') + '" placeholder="(11) 00000-0000"></label></div></div></div>' +
          '<div class="form-grade"><label class="campo" for="fj-turma"><span>Turma <span class="obrig">*</span></span><select class="entrada" id="fj-turma">' + ts.map(function (t) {
              var ocup = parts.filter(function (x) { return x.turma_id === t.id && (!pa || x.id !== pa.id); }).length;
              return '<option value="' + t.id + '"' + (t.id === (pa ? pa.turma_id : st.turma) ? ' selected' : '') + (ocup >= t.vagas ? ' disabled' : '') + '>' + esc(t.nome + ' · ' + t.dias.map(D.curta).join(' e ') + ' · ' + ocup + ' de ' + t.vagas) + '</option>'; }).join('') + '</select></label>' +
            '<label class="campo" for="fj-conv"><span>Convocação (informada pela empresa)</span><input class="entrada" type="date" id="fj-conv" value="' + esc(pa ? pa.convocacao || '' : '') + '"></label></div>' +
          '<div class="resp oculto" id="fj-resp"><b id="fj-resp-tit"></b><div class="form-grade"><label class="campo" for="fj-rnome"><span>Nome do responsável</span><input class="entrada" id="fj-rnome" maxlength="120" value="' + esc(pa ? pa.responsavel_nome || '' : '') + '"></label>' +
            '<label class="campo" for="fj-rpar"><span>Parentesco</span><input class="entrada" id="fj-rpar" maxlength="40" list="fj-pars" value="' + esc(pa ? pa.responsavel_parentesco || '' : '') + '" placeholder="MÃE, PAI, AVÓ…"><datalist id="fj-pars"><option value="MÃE"><option value="PAI"><option value="AVÓ"><option value="AVÔ"><option value="TIA"><option value="TIO"><option value="IRMÃ"><option value="IRMÃO"><option value="RESPONSÁVEL LEGAL"></datalist></label></div></div>' +
          '<div class="campo"><span>Termo de consentimento</span><div class="termo-linha">' + (pa ? '<button type="button" class="btn btn-p" id="fj-imp">🖨 Imprimir termo</button>' : '<span class="dica">Depois de salvar, imprima o termo para o jovem assinar.</span>') +
            '<label class="marcar"><input type="checkbox" id="fj-termo"' + (pa && pa.termo_recebido_em ? ' checked' : '') + '><span><b>Termo assinado recebido</b><small>' +
              (pa && pa.termo_recebido_em ? 'Registrado em ' + new Date(pa.termo_recebido_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ao marcar, o sistema guarda a data e quem registrou.') + '</small></span></label></div></div>' +
          (pa ? '<p class="dica" style="margin:0">Código do jovem neste processo: <span class="cod">' + esc(pa.codigo) + '</span></p>' : '<p class="dica" style="margin:0">O <b>código</b> do jovem é gerado ao salvar e sai no crachá.</p>'),
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar cadastro', principal: true, aoClicar: salvar }]
      });
      var el = jn.elemento;
      if (j.foto_path) dados.jovens.urlFoto(j.foto_path).then(function (u) { if (u) el.querySelector('#fj-foto').innerHTML = '<img src="' + esc(u) + '" alt="">'; });
      el.querySelectorAll('[data-gen]').forEach(function (b) { b.addEventListener('click', function () { genero = b.getAttribute('data-gen'); el.querySelectorAll('[data-gen]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); el.querySelector('.janela-corpo').dispatchEvent(new Event('input', { bubbles: true })); }); });
      var tel = el.querySelector('#fj-tel'); tel.addEventListener('input', function () { tel.value = ui.formatarTelefone(tel.value); });
      function verMenor() {
        var i = idade(el.querySelector('#fj-nasc').value), r = el.querySelector('#fj-resp');
        r.classList.toggle('oculto', !(i != null && i < 18));
        if (i != null && i < 18) el.querySelector('#fj-resp-tit').textContent = '⚠ Menor de idade (' + i + ' anos): o termo precisa da assinatura do responsável.';
      }
      el.querySelector('#fj-nasc').addEventListener('input', verMenor); verMenor();
      function escolherFoto(camera) {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; if (camera) inp.setAttribute('capture', 'environment');
        inp.addEventListener('change', function () {
          var f = inp.files && inp.files[0]; if (!f) return;
          if (f.size > 15 * 1024 * 1024) { ui.toast('Imagem muito grande.', 'erro'); return; }
          arquivoFoto = f; el.querySelector('#fj-foto').innerHTML = '<img src="' + URL.createObjectURL(f) + '" alt="">';
          el.querySelector('.janela-corpo').dispatchEvent(new Event('input', { bubbles: true }));
        });
        inp.click();
      }
      el.querySelector('#fj-camera').addEventListener('click', function () { escolherFoto(true); });
      el.querySelector('#fj-galeria').addEventListener('click', function () { escolherFoto(false); });
      if (el.querySelector('#fj-imp')) el.querySelector('#fj-imp').addEventListener('click', function () { imprimirTermos([pa]); });
      el.querySelector('#fj-nome').focus();

      async function salvar(f) {
        var nome = ui.maiusculas(f.querySelector('#fj-nome').value.trim().replace(/\s+/g, ' '));
        var nasc = f.querySelector('#fj-nasc').value;
        if (!nome) { ui.toast('Informe o nome completo.', 'erro'); return false; }
        if (!genero) { ui.toast('Escolha o gênero.', 'erro'); return false; }
        if (nasc && (nasc > D.hoje() || idade(nasc) > 40)) { ui.toast('Confira a data de nascimento.', 'erro'); return false; }
        var payload = { participacao_id: pa ? pa.id : null, jovem_id: pa ? pa.jovem_id : null, processo_id: p.id, turma_id: f.querySelector('#fj-turma').value,
          nome: nome, genero: genero, nascimento: nasc || null, telefone: f.querySelector('#fj-tel').value || null, convocacao: f.querySelector('#fj-conv').value || null,
          responsavel_nome: f.querySelector('#fj-rnome').value.trim() || null, responsavel_parentesco: f.querySelector('#fj-rpar').value.trim() || null,
          termo_recebido: f.querySelector('#fj-termo').checked };
        var bt = f.querySelector('.janela-pe .btn-pri');
        return ui.executar(bt, 'Salvando…', async function () {
          try {
            if (novo) {
              var iguais = await dados.jovens.iguais(nome, nasc || null);
              iguais = iguais.filter(function (x) { return !parts.some(function (y) { return y.jovem_id === x.id; }); });
              if (iguais.length) {
                var escolha = await escolherRepetido(payload, iguais[0]);
                if (escolha === null) return false;
                if (escolha) payload.jovem_id = escolha;
              } else if (parts.some(function (y) { return ui.normalizar(y.jovem.nome) === ui.normalizar(nome) && (!nasc || !y.jovem.nascimento || y.jovem.nascimento === nasc); })) {
                ui.toast('Este jovem já está cadastrado neste processo.', 'erro'); return false;
              }
            }
            var r = await dados.jovens.salvar(payload);
            if (arquivoFoto) { try { await dados.jovens.salvarFoto(r.jovem_id, arquivoFoto); } catch (e) { ui.toast('Cadastro salvo, mas a foto não foi enviada: ' + api.traduzErro(e), 'erro'); } }
            ui.toast(novo ? 'Jovem cadastrado · código ' + r.codigo + '.' : 'Cadastro atualizado.', 'ok');
            st.turma = payload.turma_id; await recarregar(); return true;
          } catch (e) { erro(e); return false; }
        });
      }
    }

    /* ---------- Adicionar jovem já cadastrado ---------- */
    async function adicionarExistente(turmaAtual) {
      var todos = [];
      try { todos = await dados.jovens.todos(); } catch (e) { erro(e); return; }
      var noProc = {}; parts.forEach(function (x) { noProc[x.jovem_id] = 1; });
      var livres = todos.filter(function (j) { return !noProc[j.id]; });
      var ts = turmas(), escolhido = null, busca = '';
      var jn = ui.janela({ titulo: 'Adicionar jovem já cadastrado',
        corpo: '<label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="ex-busca" placeholder="Digite parte do nome (pelo menos 2 letras)" autocomplete="off"></label>' +
          '<div class="res-j" id="ex-res"><p class="dica" style="margin:0">' + livres.length + ' jove' + (livres.length === 1 ? 'm' : 'ns') + ' cadastrado(s) fora deste processo.</p></div>' +
          '<div class="form-grade"><label class="campo" for="ex-turma"><span>Turma <span class="obrig">*</span></span><select class="entrada" id="ex-turma">' + ts.map(function (t) {
              var ocup = parts.filter(function (x) { return x.turma_id === t.id; }).length;
              return '<option value="' + t.id + '"' + (t.id === turmaAtual.id ? ' selected' : '') + (ocup >= t.vagas ? ' disabled' : '') + '>' + esc(t.nome + ' · ' + t.dias.map(D.curta).join(' e ') + ' · ' + ocup + ' de ' + t.vagas) + '</option>'; }).join('') + '</select></label>' +
            '<label class="campo" for="ex-conv"><span>Convocação</span><input class="entrada" type="date" id="ex-conv"></label></div>' +
          '<div class="aviso aviso-info">' + ui.icone('alerta', 18) + '<span>O termo de consentimento é deste processo (cita a empresa e a vaga). Depois de adicionar, imprima o termo para o jovem assinar.</span></div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Adicionar ao processo', principal: true, aoClicar: async function (f) {
          if (!escolhido) { ui.toast('Busque e escolha o jovem.', 'erro'); return false; }
          try {
            var r = await dados.jovens.salvar({ processo_id: p.id, turma_id: f.querySelector('#ex-turma').value, jovem_id: escolhido.id, nome: escolhido.nome, genero: escolhido.genero,
              nascimento: escolhido.nascimento, telefone: escolhido.telefone, convocacao: f.querySelector('#ex-conv').value || null });
            ui.toast(escolhido.nome + ' adicionado(a) · código ' + r.codigo + '.', 'ok'); st.turma = f.querySelector('#ex-turma').value; await recarregar(); return true;
          } catch (e) { erro(e); return false; }
        } }] });
      var el = jn.elemento, res = el.querySelector('#ex-res'), inp = el.querySelector('#ex-busca');
      function desenharRes() {
        if (busca.length < 2) { res.innerHTML = '<p class="dica" style="margin:0">' + livres.length + ' jove' + (livres.length === 1 ? 'm' : 'ns') + ' cadastrado(s) fora deste processo.</p>'; return; }
        var achados = livres.filter(function (j) { return ui.normalizar(j.nome).indexOf(busca) >= 0; }).slice(0, 30);
        res.innerHTML = achados.length ? achados.map(function (j) {
          var i = idade(j.nascimento);
          return '<button type="button" class="res-i" data-j="' + j.id + '" aria-pressed="' + (escolhido && escolhido.id === j.id) + '">' + fotoHTML(j) + '<span class="txt"><b>' + esc(j.nome) + '</b><small>' + esc(NOME_G[j.genero] || '') + (i != null ? ' · ' + i + ' anos' : '') + (j.nascimento ? ' · nascimento ' + D.completa(j.nascimento) : '') + '</small></span>' + (escolhido && escolhido.id === j.id ? ui.pill('Escolhido', 'sim') : '') + '</button>';
        }).join('') : '<p class="dica" style="margin:0">Ninguém encontrado com esse nome. Use "Novo jovem" para cadastrar.</p>';
        carregarFotos(res);
        res.querySelectorAll('[data-j]').forEach(function (b) { b.addEventListener('click', function () { escolhido = porId(livres, b.getAttribute('data-j')); desenharRes(); }); });
      }
      inp.addEventListener('input', function () { busca = ui.normalizar(inp.value); desenharRes(); });
      inp.focus();
    }

    /* ---------- Cadastro repetido ---------- */
    function escolherRepetido(novoJ, existente) {
      return new Promise(async function (resolver) {
        var hist = [];
        try { hist = await dados.jovens.participacoesDe(existente.id); } catch (e) { /* sem histórico */ }
        var linhas = hist.map(function (h) {
          var pr = porId(ag.processos, h.processo_id) || {}, em = porId(ag.empresas, pr.empresa_id) || {};
          var dias = ag.dias.filter(function (d) { return d.turma_id === h.turma_id; }).map(function (d) { return d.data; }).sort();
          return '<tr><td>' + esc((em.nome_fantasia || '') + ' · ' + (pr.identificacao || '')) + '</td><td>' + esc(pr.vaga || '') + '</td><td>' + (dias[0] ? D.completa(dias[0]) : '—') + '</td><td>—</td><td>' + esc(pr.situacao === 'liberado' ? 'Concluído' : 'Em andamento') + '</td></tr>';
        }).join('');
        var feito = false;
        var j = ui.janela({ titulo: 'Este jovem já tem cadastro', confirmarDescarte: false,
          corpo: '<p style="margin:0;color:var(--texto-2)">Encontramos um cadastro com o <b>mesmo nome</b>' + (novoJ.nascimento && existente.nascimento ? ' e a <b>mesma data de nascimento</b>' : '') + '.</p>' +
            '<div class="dup-g"><div class="dup-c"><span class="lbl">Você está cadastrando</span><b>' + esc(novoJ.nome) + '</b><small class="dica">' + (novoJ.nascimento ? 'Nascimento ' + D.completa(novoJ.nascimento) : 'Sem data de nascimento') + (novoJ.telefone ? ' · ' + esc(novoJ.telefone) : '') + '</small></div>' +
            '<div class="dup-c ex"><span class="lbl">Cadastro existente</span><b>' + esc(existente.nome) + '</b><small class="dica">' + (existente.nascimento ? 'Nascimento ' + D.completa(existente.nascimento) : 'Sem data de nascimento') + (existente.telefone ? ' · ' + esc(existente.telefone) : '') + ' · ' + esc(NOME_G[existente.genero] || '') + '</small></div></div>' +
            (hist.length ? '<span class="lbl">Processos anteriores · ' + hist.length + '</span><div class="tabela-card" style="padding:0"><table class="tabela mini"><thead><tr><th>Processo</th><th>Vaga</th><th>Data</th><th>Nota</th><th>Situação</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' : '<p class="dica">Sem processos anteriores registrados.</p>') +
            '<p class="dica" style="margin:0">Se for a mesma pessoa, o histórico fica todo junto. Os dados do cadastro existente são atualizados com os que você digitou.</p>',
          botoes: [{ texto: 'É outra pessoa, criar novo cadastro', aoClicar: function () { feito = true; resolver(''); return true; } },
                   { texto: 'É a mesma pessoa, usar este cadastro', principal: true, aoClicar: function () { feito = true; resolver(existente.id); return true; } }] });
        var obs = new MutationObserver(function () { if (!document.body.contains(j.elemento)) { obs.disconnect(); if (!feito) resolver(null); } });
        obs.observe(document.body, { childList: true });
      });
    }

    /* ---------- Importar lista (Excel ou CSV) ---------- */
    function importar(turma) {
      var linhas = [];
      var jn = ui.janela({ titulo: 'Importar lista · ' + turma.nome,
        corpo: '<p style="margin:0;color:var(--texto-2)">Escolha a planilha (Excel ou CSV) com uma linha por jovem. Colunas reconhecidas: <b>Nome</b>, <b>Gênero</b> (ou Sexo), <b>Nascimento</b>, <b>Telefone</b> e <b>Convocação</b>.</p>' +
          '<div class="botoes-fim" style="justify-content:flex-start"><button type="button" class="btn btn-pri" id="im-arq">Escolher planilha</button><button type="button" class="btn" id="im-modelo">⬇ Baixar modelo</button></div>' +
          '<div id="im-res"></div><p class="dica" style="margin:0">A foto e o termo assinado são completados depois, no cadastro de cada jovem.</p>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Importar', principal: true, aoClicar: confirmar }] });
      var el = jn.elemento, btImp = el.querySelector('.janela-pe .btn-pri'); btImp.disabled = true;
      el.querySelector('#im-modelo').addEventListener('click', function () {
        if (!window.XLSX) { ui.toast('Recurso de planilha indisponível.', 'erro'); return; }
        var ws = window.XLSX.utils.aoa_to_sheet([['Nome', 'Gênero', 'Nascimento', 'Telefone', 'Convocação'], ['MARIA DA SILVA', 'Feminino', '21/06/2008', '(11) 90000-0000', '08/10/2026']]);
        ws['!cols'] = [{ wch: 36 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
        var wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, 'Jovens');
        window.XLSX.writeFile(wb, 'modelo_lista_jovens.xlsx');
      });
      el.querySelector('#im-arq').addEventListener('click', function () {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv,text/csv';
        inp.addEventListener('change', async function () {
          var f = inp.files && inp.files[0]; if (!f) return;
          try { linhas = await lerPlanilha(f); await analisar(f.name); } catch (e) { console.error(e); ui.toast('Não foi possível ler a planilha. Confira o arquivo.', 'erro'); }
        });
        inp.click();
      });
      async function analisar(nomeArq) {
        var vagasLivres = turma.vagas - parts.filter(function (x) { return x.turma_id === turma.id; }).length;
        for (var i = 0; i < linhas.length; i++) {
          var l = linhas[i];
          if (l.erro) continue;
          if (parts.some(function (y) { return ui.normalizar(y.jovem.nome) === ui.normalizar(l.nome) && (!l.nascimento || !y.jovem.nascimento || y.jovem.nascimento === l.nascimento); })) { l.erro = 'Já está neste processo'; continue; }
          if (linhas.slice(0, i).some(function (o) { return !o.erro && ui.normalizar(o.nome) === ui.normalizar(l.nome) && o.nascimento === l.nascimento; })) { l.erro = 'Repetido na planilha'; continue; }
          var ig = await dados.jovens.iguais(l.nome, l.nascimento || null).catch(function () { return []; });
          if (ig.length) { l.existente = ig[0]; l.usarExistente = true; }
        }
        var validas = linhas.filter(function (l) { return !l.erro; });
        var res = el.querySelector('#im-res');
        res.innerHTML = '<div class="aviso aviso-' + (validas.length ? 'ok' : 'erro') + '">' + ui.icone(validas.length ? 'ok' : 'alerta', 18) + '<span>Arquivo <b>' + esc(nomeArq) + '</b> · ' + linhas.length + ' linha(s) lida(s) · ' + validas.length + ' para importar' +
            (validas.length > vagasLivres ? '. <b>Atenção:</b> a turma tem só ' + vagasLivres + ' vaga(s) livre(s); as que passarem não serão importadas.' : '.') + '</span></div>' +
          '<div class="tabela-card" style="padding:0;max-height:40vh;overflow:auto"><table class="tabela mini"><thead><tr><th>Linha</th><th>Nome</th><th>Gênero</th><th>Nascimento</th><th>Resultado</th></tr></thead><tbody>' +
          linhas.map(function (l, i) {
            var r = l.erro ? '<span class="imp-err">✕ ' + esc(l.erro) + '</span>' : (l.existente ? '<label class="imp-dup"><input type="checkbox" data-usar="' + i + '" checked> Já cadastrado (' + (l.existente.processos || 0) + ' processo(s)) · usar o mesmo cadastro</label>' : '<span class="imp-ok">✓ Novo cadastro</span>');
            return '<tr><td class="num">' + l.linha + '</td><td>' + esc(l.nome || '') + '</td><td>' + esc(NOME_G[l.genero] || l.generoTxt || '') + '</td><td>' + (l.nascimento ? D.completa(l.nascimento) : '—') + '</td><td>' + r + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        res.querySelectorAll('[data-usar]').forEach(function (c) { c.addEventListener('change', function () { linhas[+c.getAttribute('data-usar')].usarExistente = c.checked; }); });
        btImp.disabled = !validas.length;
        btImp.textContent = 'Importar ' + Math.min(validas.length, Math.max(vagasLivres, 0)) + ' jove' + (validas.length === 1 ? 'm' : 'ns');
      }
      async function confirmar() {
        var validas = linhas.filter(function (l) { return !l.erro; });
        if (!validas.length) return false;
        return ui.executar(btImp, 'Importando…', async function () {
          var ok = 0, falhas = [];
          for (var i = 0; i < validas.length; i++) {
            var l = validas[i];
            try {
              await dados.jovens.salvar({ processo_id: p.id, turma_id: turma.id, jovem_id: l.existente && l.usarExistente ? l.existente.id : null, nome: l.nome, genero: l.genero,
                nascimento: l.nascimento || null, telefone: l.telefone || null, convocacao: l.convocacao || null });
              ok++;
            } catch (e) { falhas.push(l.nome + ': ' + api.traduzErro(e)); if (/completa/i.test(e.message || '')) break; }
          }
          ui.toast(ok + ' jove' + (ok === 1 ? 'm importado' : 'ns importados') + (falhas.length ? ' · ' + falhas.length + ' não importado(s)' : '') + '.', falhas.length ? 'erro' : 'ok');
          if (falhas.length) console.warn('Não importados:', falhas);
          st.turma = turma.id; await recarregar(); return true;
        });
      }
    }

    desenhar();
  };

  /* ---------- Leitura da planilha ---------- */
  function dataPlanilha(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') { var d = new Date(Math.round((v - 25569) * 86400000)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
    var s = String(v).trim(), m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (m) {
      var a = +m[3]; if (a < 100) a += a > 30 ? 1900 : 2000;
      var dt = new Date(a, +m[2] - 1, +m[1]);
      if (dt.getDate() !== +m[1] || dt.getMonth() !== +m[2] - 1) return 'invalida';
      return D.iso(dt);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return 'invalida';
  }
  function generoPlanilha(v) {
    var s = ui.normalizar(v);
    if (!s) return null;
    if (/^f/.test(s)) return 'feminino';
    if (/^m/.test(s)) return 'masculino';
    if (/^(o|nao bin|nb)/.test(s)) return 'outro';
    if (/^(n|p|prefiro)/.test(s)) return 'nao_informado';
    return 'invalido';
  }
  async function lerPlanilha(arquivo) {
    if (!window.XLSX) throw new Error('XLSX indisponível');
    var buf = await arquivo.arrayBuffer(), wb;
    if (/\.csv$/i.test(arquivo.name) || /csv|text/.test(arquivo.type || '')) {
      // CSV: texto em UTF-8 (ou no formato antigo do Excel), sem converter datas (dd/mm/aaaa)
      var txt;
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { txt = new TextDecoder('windows-1252').decode(buf); }
      txt = txt.replace(/^\ufeff/, '');
      var l1 = txt.split(/\r?\n/)[0] || '';
      var sep = (l1.match(/;/g) || []).length > (l1.match(/,/g) || []).length ? ';' : ',';
      wb = window.XLSX.read(txt, { type: 'string', raw: true, FS: sep });
    } else {
      wb = window.XLSX.read(buf, { type: 'array', cellDates: false });
    }
    var ws = wb.Sheets[wb.SheetNames[0]];
    var linhas = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    if (!linhas.length) return [];
    var cab = linhas[0].map(function (c) { return ui.normalizar(c); });
    function col(nomes) { for (var i = 0; i < cab.length; i++) { if (nomes.some(function (n) { return cab[i].indexOf(n) === 0; })) return i; } return -1; }
    var cN = col(['nome']), cG = col(['genero', 'sexo']), cD = col(['nasc', 'data de nasc']), cT = col(['tel', 'cel', 'whats']), cC = col(['convoc']);
    if (cN < 0) throw new Error('Coluna Nome não encontrada');
    return linhas.slice(1).filter(function (r) { return String(r[cN] || '').trim(); }).map(function (r, i) {
      var nome = ui.maiusculas(String(r[cN]).trim().replace(/\s+/g, ' '));
      var g = cG >= 0 ? generoPlanilha(r[cG]) : null, nasc = cD >= 0 ? dataPlanilha(r[cD]) : null, conv = cC >= 0 ? dataPlanilha(r[cC]) : null;
      var l = { linha: i + 2, nome: nome, genero: g, generoTxt: cG >= 0 ? String(r[cG]) : '', nascimento: nasc === 'invalida' ? null : nasc, convocacao: conv === 'invalida' ? null : conv,
        telefone: cT >= 0 && String(r[cT]).trim() ? ui.formatarTelefone(String(r[cT])) : null };
      var erros = [];
      if (!g) erros.push('falta o gênero'); else if (g === 'invalido') erros.push('gênero não reconhecido');
      if (nasc === 'invalida') erros.push('data de nascimento inválida');
      if (conv === 'invalida') erros.push('data de convocação inválida');
      if (erros.length) l.erro = erros.join(', ').replace(/^./, function (c) { return c.toUpperCase(); });
      return l;
    });
  }
  window.CF.jovensPlanilha = { lerPlanilha: lerPlanilha, dataPlanilha: dataPlanilha, generoPlanilha: generoPlanilha };

  /* ================================================================
     TODOS OS JOVENS (Cadastros → Jovens)
     ================================================================ */
  window.CF.telas.jovensTodos = async function (area) {
    area.innerHTML = '<a class="voltar" href="#/cadastros">← Cadastros</a><header class="cabecalho"><div><h1>Jovens</h1><p>Todos os jovens cadastrados e o histórico de cada um</p></div>' +
      '<button type="button" class="btn btn-pri" id="tj-novo">' + ui.icone('mais', 17) + 'Novo jovem</button></header>' +
      '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="tj-busca" placeholder="Buscar por nome"></label></div><div id="tj"><div class="girando" style="margin:30px auto"></div></div>';
    var js = [], parts = [], ag = null;
    try { var r = await Promise.all([dados.jovens.todos(), dados.jovens.todasParticipacoes(), dados.agenda.carregarTudo()]); js = r[0]; parts = r[1]; ag = r[2]; }
    catch (e) { erro(e); return; }
    var busca = '';
    function desenhar() {
      var itens = js.filter(function (j) { return !busca || ui.normalizar(j.nome).indexOf(busca) >= 0; });
      var box = area.querySelector('#tj');
      if (!itens.length) { box.innerHTML = '<div class="card vazio">' + (js.length ? 'Nenhum jovem encontrado.' : 'Nenhum jovem cadastrado ainda. Os jovens são cadastrados dentro de cada processo.') + '</div>'; return; }
      box.innerHTML = '<div class="card tabela-card"><table class="tabela"><thead><tr><th>Jovem</th><th>Nascimento</th><th>Processos</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
        itens.slice(0, 300).map(function (j) {
          var n = parts.filter(function (x) { return x.jovem_id === j.id; }).length, i = idade(j.nascimento);
          return '<tr><td><div class="cel-j">' + fotoHTML(j) + '<div><b>' + esc(j.nome) + '</b><small>' + esc(NOME_G[j.genero] || '') + (i != null ? ' · ' + i + ' anos' : '') + '</small></div></div></td>' +
            '<td>' + (j.nascimento ? D.completa(j.nascimento) : '—') + '</td><td class="num">' + (n ? n : '0 · ainda sem processo') + '</td><td><div class="acoes"><button type="button" class="btn btn-p" data-ed="' + j.id + '">Editar</button><button type="button" class="btn btn-p" data-hist="' + j.id + '">Histórico</button></div></td></tr>';
        }).join('') + '</tbody></table></div>' + (itens.length > 300 ? '<p class="dica">Mostrando os 300 primeiros. Use a busca para encontrar outros.</p>' : '');
      carregarFotos(box);
      box.querySelectorAll('[data-hist]').forEach(function (b) {
        b.addEventListener('click', function () {
          var j = porId(js, b.getAttribute('data-hist')), hs = parts.filter(function (x) { return x.jovem_id === j.id; });
          ui.janela({ titulo: 'Histórico · ' + j.nome, confirmarDescarte: false,
            corpo: hs.length ? '<div class="tabela-card" style="padding:0"><table class="tabela mini"><thead><tr><th>Processo</th><th>Vaga</th><th>Turma</th><th>Código</th></tr></thead><tbody>' + hs.map(function (h) {
              var pr = porId(ag.processos, h.processo_id) || {}, em = porId(ag.empresas, pr.empresa_id) || {}, t = porId(ag.turmas, h.turma_id) || {};
              return '<tr><td><a href="#/processos/' + esc(pr.id) + '/jovens">' + esc((em.nome_fantasia || '') + ' · ' + (pr.identificacao || '')) + '</a></td><td>' + esc(pr.vaga || '') + '</td><td>' + esc(t.nome || '') + '</td><td><span class="cod">' + esc(h.codigo) + '</span></td></tr>';
            }).join('') + '</tbody></table></div>' : '<p class="dica">Sem participações.</p>' });
        });
      });
    }
    area.querySelector('#tj-busca').addEventListener('input', function (e) { busca = ui.normalizar(e.target.value); desenhar(); });
    area.querySelector('#tj-novo').addEventListener('click', function () { formPessoa(null); });
    area.querySelector('#tj').addEventListener('click', function (e) { var b = e.target.closest('[data-ed]'); if (b) formPessoa(porId(js, b.getAttribute('data-ed'))); });
    async function recarregar() { try { js = await dados.jovens.todos(); desenhar(); } catch (e) { erro(e); } }
    desenhar();

    // Cadastro da pessoa, sem processo (o vínculo é feito depois, no processo)
    function formPessoa(j) {
      var novo = !j; j = j || {};
      var genero = j.genero || '', arquivoFoto = null;
      var jn = ui.janela({ titulo: novo ? 'Novo jovem' : 'Editar jovem',
        corpo: '<div class="jovem-topo"><div class="foto-col"><div class="foto-box" id="fp-foto">' + (j.foto_path ? '' : 'SEM FOTO') + '</div>' +
            '<div class="foto-bts"><button type="button" class="btn btn-p" id="fp-camera">📷 Foto</button><button type="button" class="btn btn-p" id="fp-galeria">🖼 Galeria</button></div></div>' +
          '<div class="jovem-dados"><label class="campo" for="fp-nome"><span>Nome completo <span class="obrig">*</span></span><input class="entrada" id="fp-nome" maxlength="120" value="' + esc(j.nome || '') + '"></label>' +
            '<div class="campo"><span>Gênero <span class="obrig">*</span></span><div class="segmentos seg-genero" role="group" aria-label="Gênero">' + GENEROS.map(function (g) { return '<button type="button" data-gen="' + g[0] + '" aria-pressed="' + (genero === g[0]) + '">' + g[1] + '</button>'; }).join('') + '</div></div>' +
            '<div class="form-grade"><label class="campo" for="fp-nasc"><span>Nascimento</span><input class="entrada" type="date" id="fp-nasc" value="' + esc(j.nascimento || '') + '" max="' + D.hoje() + '"></label>' +
            '<label class="campo" for="fp-tel"><span>Telefone</span><input class="entrada" id="fp-tel" inputmode="tel" maxlength="15" value="' + esc(j.telefone || '') + '" placeholder="(11) 00000-0000"></label></div></div></div>' +
          '<p class="dica" style="margin:0">' + (novo ? 'Depois, para colocar o jovem num processo, use "+ Já cadastrado" na tela de jovens do processo.' : 'As alterações valem para todos os processos deste jovem.') + '</p>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: novo ? 'Cadastrar jovem' : 'Salvar', principal: true, aoClicar: async function (f) {
          var nome = ui.maiusculas(f.querySelector('#fp-nome').value.trim().replace(/\s+/g, ' ')), nasc = f.querySelector('#fp-nasc').value;
          if (!nome) { ui.toast('Informe o nome completo.', 'erro'); return false; }
          if (!genero) { ui.toast('Escolha o gênero.', 'erro'); return false; }
          if (nasc && (nasc > D.hoje() || idade(nasc) > 40)) { ui.toast('Confira a data de nascimento.', 'erro'); return false; }
          var dadosJ = { nome: nome, genero: genero, nascimento: nasc || null, telefone: f.querySelector('#fp-tel').value || null };
          return ui.executar(f.querySelector('.janela-pe .btn-pri'), 'Salvando…', async function () {
            try {
              if (novo) {
                var ig = await dados.jovens.iguais(nome, nasc || null);
                if (ig.length && !(await ui.confirmar('Já existe um jovem com este nome' + (nasc ? ' e nascimento' : ''), ig[0].nome + (ig[0].nascimento ? ' · nascimento ' + D.completa(ig[0].nascimento) : '') + '. Cadastrar mesmo assim (outra pessoa)?', 'Cadastrar mesmo assim', 'Voltar'))) return false;
              }
              var salvo = novo ? await dados.jovens.criar(dadosJ) : await dados.jovens.atualizar(j.id, dadosJ);
              if (arquivoFoto) { try { await dados.jovens.salvarFoto(salvo.id, arquivoFoto); } catch (e) { ui.toast('Salvo, mas a foto não foi enviada: ' + api.traduzErro(e), 'erro'); } }
              ui.toast(novo ? 'Jovem cadastrado.' : 'Cadastro atualizado.', 'ok'); await recarregar(); return true;
            } catch (e) { erro(e); return false; }
          });
        } }] });
      var el = jn.elemento;
      if (j.foto_path) dados.jovens.urlFoto(j.foto_path).then(function (u) { if (u) el.querySelector('#fp-foto').innerHTML = '<img src="' + esc(u) + '" alt="">'; });
      el.querySelectorAll('[data-gen]').forEach(function (b) { b.addEventListener('click', function () { genero = b.getAttribute('data-gen'); el.querySelectorAll('[data-gen]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); el.querySelector('.janela-corpo').dispatchEvent(new Event('input', { bubbles: true })); }); });
      var tel = el.querySelector('#fp-tel'); tel.addEventListener('input', function () { tel.value = ui.formatarTelefone(tel.value); });
      function escolherFoto(camera) {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; if (camera) inp.setAttribute('capture', 'environment');
        inp.addEventListener('change', function () { var fl = inp.files && inp.files[0]; if (!fl) return; arquivoFoto = fl; el.querySelector('#fp-foto').innerHTML = '<img src="' + URL.createObjectURL(fl) + '" alt="">'; el.querySelector('.janela-corpo').dispatchEvent(new Event('input', { bubbles: true })); });
        inp.click();
      }
      el.querySelector('#fp-camera').addEventListener('click', function () { escolherFoto(true); });
      el.querySelector('#fp-galeria').addEventListener('click', function () { escolherFoto(false); });
      el.querySelector('#fp-nome').focus();
    }
  };
})();
