/* =====================================================================
   Classificação Final · views/cadastros.js
   Cadastros (somente administrador): Empresas, Avaliadores, Áreas e
   Competências. Abas pelo endereço: #/cadastros/empresas etc.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var NOMES_PERFIL = { admin: 'Administrador', avaliador: 'Avaliador', empresa: 'Empresa' };
  var ABAS = [['empresas', 'Empresas'], ['avaliadores', 'Avaliadores'], ['areas', 'Áreas'], ['competencias', 'Competências']];

  function abaAtual() {
    var m = (window.location.hash || '').match(/^#\/cadastros\/([a-z]+)/);
    var a = m ? m[1] : 'empresas';
    return ABAS.some(function (x) { return x[0] === a; }) ? a : 'empresas';
  }

  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }

  // Campo de formulário (label + entrada)
  function campo(id, rotulo, valor, opcoes) {
    opcoes = opcoes || {};
    return '<label class="campo' + (opcoes.largo ? ' largo' : '') + '" for="' + id + '"><span>' + esc(rotulo) +
      (opcoes.obrig ? ' <span class="obrig">*</span>' : '') + '</span>' +
      (opcoes.area
        ? '<textarea class="entrada" id="' + id + '" rows="3" maxlength="' + (opcoes.max || 500) + '" placeholder="' + esc(opcoes.ph || '') + '">' + esc(valor || '') + '</textarea>'
        : '<input class="entrada" id="' + id + '" type="' + (opcoes.tipo || 'text') + '" value="' + esc(valor == null ? '' : valor) + '" maxlength="' + (opcoes.max || 160) + '" placeholder="' + esc(opcoes.ph || '') + '"' + (opcoes.modo ? ' inputmode="' + opcoes.modo + '"' : '') + '>') +
      '</label>';
  }
  function marcar(id, rotulo, ligado, dica) {
    return '<label class="marcar largo"><input type="checkbox" id="' + id + '"' + (ligado ? ' checked' : '') + '><span><b>' + esc(rotulo) + '</b>' +
      (dica ? '<small>' + esc(dica) + '</small>' : '') + '</span></label>';
  }
  function barraBusca(placeholder, extra) {
    return '<div class="barra"><label class="busca">' + ui.icone('busca', 17) + '<span class="sr">Buscar</span><input type="search" id="busca" placeholder="' + esc(placeholder) + '"></label>' +
      (extra || '') + '<label class="marcar-linha"><input type="checkbox" id="inativos"> Mostrar inativos</label></div>';
  }

  /* ================================================================
     Tela principal
     ================================================================ */
  window.CF.telas = window.CF.telas || {};
  window.CF.telas.cadastros = function (area, ctx) {
    var aba = abaAtual();
    var BOTOES = { empresas: 'Nova empresa', avaliadores: 'Copiar link de cadastro', areas: 'Nova área', competencias: 'Nova competência' };
    area.innerHTML =
      '<header class="cabecalho"><div><h1>Cadastros</h1><p>Empresas, avaliadores, áreas e competências</p></div>' +
      '<button type="button" class="btn btn-pri" id="b-novo">' + ui.icone(aba === 'avaliadores' ? 'link' : 'mais', 17) + esc(BOTOES[aba]) + '</button></header>' +
      '<div class="abas-cad" role="tablist">' + ABAS.map(function (a) {
        return '<a role="tab" href="#/cadastros/' + a[0] + '" aria-selected="' + (a[0] === aba) + '">' + esc(a[1]) + '<span class="n" id="n-' + a[0] + '"></span></a>';
      }).join('') + '</div>' +
      '<div id="aba"><div class="girando" style="margin:30px auto"></div></div>';
    var alvo = area.querySelector('#aba');
    var fn = { empresas: abaEmpresas, avaliadores: abaAvaliadores, areas: abaAreas, competencias: abaCompetencias }[aba];
    fn(alvo, area.querySelector('#b-novo'), ctx).catch(function (e) {
      erro(e); alvo.innerHTML = '<div class="aviso aviso-erro">' + ui.icone('alerta', 18) + '<span>Não foi possível carregar. ' + esc(api.traduzErro(e)) + '</span></div>';
    });
  };

  // Liga busca + "mostrar inativos" a uma função de desenho
  function ligarFiltros(raiz, desenhar) {
    var b = raiz.querySelector('#busca'), i = raiz.querySelector('#inativos');
    if (b) b.addEventListener('input', desenhar);
    if (i) i.addEventListener('change', desenhar);
    raiz.querySelectorAll('select[data-filtro]').forEach(function (s) { s.addEventListener('change', desenhar); });
  }
  function filtro(raiz) {
    var b = raiz.querySelector('#busca'), i = raiz.querySelector('#inativos');
    return { texto: ui.normalizar(b ? b.value : ''), inativos: !!(i && i.checked) };
  }
  function contar(id, n) { var el = document.getElementById('n-' + id); if (el) el.textContent = n; }
  function vazio(texto) { return '<div class="card vazio">' + esc(texto) + '</div>'; }

  /* ================================================================
     EMPRESAS
     ================================================================ */
  async function abaEmpresas(alvo, botaoNovo) {
    var lista = await dados.empresas.listar();
    contar('empresas', lista.filter(function (e) { return e.ativa; }).length);
    alvo.innerHTML = barraBusca('Buscar empresa ou CNPJ') + '<div id="lista"></div>';
    function desenhar() {
      var f = filtro(alvo);
      var itens = lista.filter(function (e) {
        if (!e.ativa && !f.inativos) return false;
        return !f.texto || ui.normalizar(e.nome_fantasia + ' ' + e.razao_social + ' ' + e.cnpj).indexOf(f.texto) >= 0 || e.cnpj.indexOf(ui.soNumeros(f.texto)) >= 0 && ui.soNumeros(f.texto);
      });
      var box = alvo.querySelector('#lista');
      if (!itens.length) { box.innerHTML = vazio(lista.length ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada ainda. Use "Nova empresa".'); return; }
      box.innerHTML = '<div class="card tabela-card"><table class="tabela"><thead><tr><th>Empresa</th><th>CNPJ</th><th>Contato</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
        itens.map(function (e) {
          var contato = [e.responsavel, e.telefone].filter(Boolean).join(' · ') || '—';
          return '<tr><td><div class="cel-empresa"><span class="logo-mini" data-logo="' + esc(e.logo_path || '') + '">' + (e.logo_path ? '' : 'SEM LOGO') + '</span>' +
            '<div><b>' + esc(e.nome_fantasia) + '</b><small>' + esc(e.razao_social) + '</small></div></div></td>' +
            '<td class="num">' + esc(ui.formatarCNPJ(e.cnpj)) + '</td><td>' + esc(contato) + '</td>' +
            '<td>' + ui.pill(e.ativa ? 'Ativa' : 'Inativa', 'neu') + '</td>' +
            '<td><div class="acoes"><button type="button" class="btn btn-p" data-editar="' + e.id + '">Editar</button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-logo]').forEach(function (el) {
        var c = el.getAttribute('data-logo'); if (!c) return;
        dados.empresas.urlLogo(c).then(function (url) { if (url) el.innerHTML = '<img src="' + esc(url) + '" alt="">'; });
      });
      box.querySelectorAll('[data-editar]').forEach(function (b) {
        b.addEventListener('click', function () { formEmpresa(lista.filter(function (e) { return e.id === b.getAttribute('data-editar'); })[0], recarregar); });
      });
    }
    async function recarregar() { lista = await dados.empresas.listar(); contar('empresas', lista.filter(function (e) { return e.ativa; }).length); desenhar(); }
    ligarFiltros(alvo, desenhar);
    desenhar();
    botaoNovo.addEventListener('click', function () { formEmpresa(null, recarregar); });
  }

  function formEmpresa(e, aoSalvar) {
    e = e || {};
    var novoLogo = null;
    var j = ui.janela({
      titulo: e.id ? 'Editar empresa' : 'Nova empresa',
      corpo: '<div class="form-grade">' +
        campo('f-razao', 'Razão social', e.razao_social, { obrig: true, largo: true, ph: 'Ex.: Empresa Exemplo Ltda.' }) +
        campo('f-fantasia', 'Nome fantasia', e.nome_fantasia, { obrig: true, ph: 'Como aparece nos relatórios' }) +
        campo('f-cnpj', 'CNPJ', e.cnpj ? ui.formatarCNPJ(e.cnpj) : '', { obrig: true, ph: '00.000.000/0000-00', modo: 'numeric', max: 18 }) +
        campo('f-resp', 'Responsável', e.responsavel, { ph: 'Nome' }) +
        campo('f-tel', 'Telefone', e.telefone, { ph: '(11) 00000-0000', modo: 'tel', max: 15 }) +
        campo('f-email', 'E-mail de contato', e.email, { largo: true, tipo: 'email', ph: 'contato@empresa.com.br' }) +
        '<div class="campo largo"><span>Logotipo</span><div class="logo-envio"><span class="logo-mini grande" id="f-logo-previa">' + (e.logo_path ? '' : 'Prévia') + '</span>' +
          '<span class="dica" style="flex:1;min-width:180px">PNG ou JPG, de preferência com fundo transparente. Aparece nos PDFs, no Excel e no portal.</span>' +
          '<button type="button" class="btn btn-p" id="f-logo-btn">Escolher arquivo</button></div></div>' +
        (e.id ? marcar('f-ativa', 'Empresa ativa', e.ativa !== false, 'Empresas inativas não aparecem para novos processos.') : '') +
        '</div>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar empresa', principal: true, aoClicar: salvar }]
    });
    var el = j.elemento;
    var cnpj = el.querySelector('#f-cnpj'), tel = el.querySelector('#f-tel');
    cnpj.addEventListener('input', function () { cnpj.value = ui.formatarCNPJ(cnpj.value); });
    tel.addEventListener('input', function () { tel.value = ui.formatarTelefone(tel.value); });
    if (e.logo_path) dados.empresas.urlLogo(e.logo_path).then(function (u) { if (u) el.querySelector('#f-logo-previa').innerHTML = '<img src="' + esc(u) + '" alt="">'; });
    el.querySelector('#f-logo-btn').addEventListener('click', function () {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0]; if (!f) return;
        if (f.size > 10 * 1024 * 1024) { ui.toast('Imagem muito grande (máximo 10 MB).', 'erro'); return; }
        novoLogo = f;
        el.querySelector('#f-logo-previa').innerHTML = '<img src="' + URL.createObjectURL(f) + '" alt="">';
        el.querySelector('.janela-corpo').dispatchEvent(new Event('input', { bubbles: true }));
      });
      inp.click();
    });

    async function salvar(fundo) {
      var v = function (id) { var x = fundo.querySelector(id); return x ? x.value.trim() : ''; };
      var obj = {
        id: e.id, razao_social: v('#f-razao').replace(/\s+/g, ' '), nome_fantasia: v('#f-fantasia').replace(/\s+/g, ' '),
        cnpj: ui.soNumeros(v('#f-cnpj')), responsavel: v('#f-resp') || null, telefone: v('#f-tel') || null,
        email: v('#f-email').toLowerCase() || null
      };
      if (e.id) obj.ativa = fundo.querySelector('#f-ativa').checked;
      if (!obj.razao_social || !obj.nome_fantasia) { ui.toast('Preencha a razão social e o nome fantasia.', 'erro'); return false; }
      if (!ui.cnpjValido(obj.cnpj)) { ui.toast('CNPJ inválido. Confira os números.', 'erro'); return false; }
      if (obj.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email)) { ui.toast('E-mail de contato inválido.', 'erro'); return false; }
      var botao = fundo.querySelector('.janela-pe .btn-pri');
      return ui.executar(botao, 'Salvando…', async function () {
        try {
          var salva = await dados.empresas.salvar(obj);
          if (novoLogo) {
            var caminho = await dados.empresas.enviarLogo(salva.id, novoLogo);
            await dados.empresas.salvar({ id: salva.id, logo_path: caminho });
            if (e.logo_path) dados.empresas.removerArquivo(e.logo_path);
          }
          ui.toast(e.id ? 'Empresa atualizada.' : 'Empresa cadastrada.', 'ok');
          await aoSalvar();
          return true;
        } catch (x) {
          if (/duplicate|unique|empresas_cnpj_key/i.test(x.message || '')) ui.toast('Já existe uma empresa com este CNPJ.', 'erro');
          else erro(x);
          return false;
        }
      });
    }
  }

  /* ================================================================
     AVALIADORES (pessoas com acesso ao sistema)
     ================================================================ */
  async function abaAvaliadores(alvo, botaoNovo, ctx) {
    var r = await Promise.all([dados.pessoas.listar(), dados.empresas.listar()]);
    var lista = r[0], empresasLista = r[1];
    var eu = ctx.perfil.id;
    botaoNovo.addEventListener('click', async function () {
      var link = api.enderecoDoSite() + '#cadastro';
      try { await navigator.clipboard.writeText(link); ui.toast('Link copiado! Envie para a pessoa se cadastrar.', 'ok'); }
      catch (e) { ui.janela({ titulo: 'Link de cadastro', corpo: '<p style="margin:0">Copie e envie este link:</p><input class="entrada" readonly value="' + esc(link) + '">', confirmarDescarte: false }); }
    });

    function nomeEmpresa(id) { var e = empresasLista.filter(function (x) { return x.id === id; })[0]; return e ? e.nome_fantasia : ''; }
    function dataHora(t) { try { return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    function avatarHTML(p) { return '<span class="avatar" data-pessoa="' + esc(p.id) + '">' + esc(ui.iniciais(p.nome || p.email)) + '</span>'; }
    function fotos(raiz) {
      raiz.querySelectorAll('[data-pessoa]').forEach(function (el) {
        var p = lista.filter(function (x) { return x.id === el.getAttribute('data-pessoa'); })[0];
        if (p) window.CF.foto.preencherAvatar(el, p);
      });
    }

    alvo.innerHTML = '<div id="pendentes"></div>' + barraBusca('Buscar por nome ou e-mail') + '<div id="lista"></div>';
    function desenhar() {
      var pend = lista.filter(function (p) { return !p.aprovado && p.ativo; });
      var ativos = lista.filter(function (p) { return p.aprovado || !p.ativo; });
      contar('avaliadores', lista.filter(function (p) { return p.aprovado && p.ativo; }).length);
      var bp = alvo.querySelector('#pendentes');
      bp.innerHTML = !pend.length ? '' :
        '<section class="card pendencias"><span class="lbl">Aguardando aprovação · ' + pend.length + '</span>' +
        pend.map(function (p) {
          return '<div class="pendente" data-id="' + esc(p.id) + '">' + avatarHTML(p) +
            '<div class="pendente-txt"><b>' + esc(p.nome || '(sem nome)') + '</b><small>' + esc(p.email) + ' · cadastrou-se em ' + esc(dataHora(p.criado_em)) + ' · ' +
            (p.email_confirmado ? 'e-mail confirmado' : '<span class="alerta-txt">e-mail ainda não confirmado</span>') + '</small></div>' +
            '<div class="pendente-acoes"><label class="sr" for="perf-' + p.id + '">Perfil</label><select class="entrada sel-p" id="perf-' + p.id + '">' +
              '<option value="avaliador">Avaliador</option><option value="admin">Administrador</option>' + (empresasLista.length ? '<option value="empresa">Empresa</option>' : '') + '</select>' +
              '<select class="entrada sel-p oculto" id="emp-' + p.id + '" aria-label="Empresa"><option value="">Escolha a empresa…</option>' +
                empresasLista.filter(function (e) { return e.ativa; }).map(function (e) { return '<option value="' + e.id + '">' + esc(e.nome_fantasia) + '</option>'; }).join('') + '</select>' +
              '<button type="button" class="btn btn-p" data-recusar>Recusar</button><button type="button" class="btn btn-pri btn-p" data-aprovar>Aprovar</button></div></div>';
        }).join('') + '</section>';
      bp.querySelectorAll('.pendente').forEach(function (linha) {
        var id = linha.getAttribute('data-id');
        var selP = linha.querySelector('#perf-' + id), selE = linha.querySelector('#emp-' + id);
        selP.addEventListener('change', function () { selE.classList.toggle('oculto', selP.value !== 'empresa'); });
        linha.querySelector('[data-aprovar]').addEventListener('click', function (ev) {
          var perfil = selP.value, emp = selE.value || null;
          if (perfil === 'empresa' && !emp) { ui.toast('Escolha a empresa que esta pessoa representa.', 'erro'); return; }
          ui.executar(ev.currentTarget, 'Aprovando…', async function () {
            try {
              await dados.pessoas.atualizar(id, { aprovado: true, perfil: perfil, empresa_id: perfil === 'empresa' ? emp : null });
              ui.toast('Acesso liberado.', 'ok'); await recarregar();
            } catch (x) { erro(x); }
          });
        });
        linha.querySelector('[data-recusar]').addEventListener('click', async function (ev) {
          var btn = ev.currentTarget;
          if (!(await ui.confirmar('Recusar este cadastro?', 'A pessoa não terá acesso ao sistema. Você pode reativar depois, se precisar.', 'Recusar', 'Cancelar'))) return;
          ui.executar(btn, 'Recusando…', async function () {
            try { await dados.pessoas.atualizar(id, { ativo: false }); ui.toast('Cadastro recusado.', 'ok'); await recarregar(); }
            catch (x) { erro(x); }
          });
        });
      });

      var f = filtro(alvo);
      var itens = ativos.filter(function (p) {
        if (!p.ativo && !f.inativos) return false;
        return !f.texto || ui.normalizar((p.nome || '') + ' ' + p.email).indexOf(f.texto) >= 0;
      });
      var box = alvo.querySelector('#lista');
      if (!itens.length) { box.innerHTML = vazio('Nenhuma pessoa encontrada.'); fotos(bp); return; }
      box.innerHTML = '<div class="card tabela-card"><table class="tabela"><thead><tr><th>Pessoa</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
        itens.map(function (p) {
          var perfil = NOMES_PERFIL[p.perfil] + (p.perfil === 'empresa' ? ' · ' + nomeEmpresa(p.empresa_id) : '');
          var situ = !p.ativo ? (p.aprovado ? 'Desativado' : 'Recusado') : 'Ativo';
          return '<tr><td><div class="cel-pessoa">' + avatarHTML(p) + '<b>' + esc(p.nome || '(sem nome)') + (p.id === eu ? ' <span class="voce">(você)</span>' : '') + '</b></div></td>' +
            '<td>' + esc(p.email) + '</td><td>' + esc(perfil) + '</td><td>' + ui.pill(situ, 'neu') + '</td>' +
            '<td><div class="acoes">' + (p.id === eu ? '' : '<button type="button" class="btn btn-p" data-editar="' + esc(p.id) + '">Editar</button>') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-editar]').forEach(function (b) {
        b.addEventListener('click', function () { formPessoa(lista.filter(function (p) { return p.id === b.getAttribute('data-editar'); })[0]); });
      });
      fotos(bp); fotos(box);
    }
    function formPessoa(p) {
      var j = ui.janela({
        titulo: 'Acesso de ' + (p.nome || p.email),
        corpo: '<p style="margin:0;color:var(--texto-2)">' + esc(p.email) + '</p>' +
          '<label class="campo" for="fp-perfil"><span>Perfil</span><select class="entrada" id="fp-perfil">' +
            ['avaliador', 'admin', 'empresa'].map(function (k) { return '<option value="' + k + '"' + (p.perfil === k ? ' selected' : '') + '>' + NOMES_PERFIL[k] + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo' + (p.perfil === 'empresa' ? '' : ' oculto') + '" for="fp-emp" id="fp-emp-box"><span>Empresa</span><select class="entrada" id="fp-emp"><option value="">Escolha a empresa…</option>' +
            empresasLista.map(function (e) { return '<option value="' + e.id + '"' + (p.empresa_id === e.id ? ' selected' : '') + '>' + esc(e.nome_fantasia) + '</option>'; }).join('') + '</select></label>' +
          marcar('fp-ativo', 'Acesso ativo', p.ativo, 'Desativado, a pessoa não consegue entrar no sistema.'),
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar', principal: true, aoClicar: async function (fundo) {
          var perfil = fundo.querySelector('#fp-perfil').value, emp = fundo.querySelector('#fp-emp').value || null, ativo = fundo.querySelector('#fp-ativo').checked;
          if (perfil === 'empresa' && !emp) { ui.toast('Escolha a empresa.', 'erro'); return false; }
          try {
            await dados.pessoas.atualizar(p.id, { perfil: perfil, empresa_id: perfil === 'empresa' ? emp : null, ativo: ativo, aprovado: ativo ? true : p.aprovado });
            ui.toast('Acesso atualizado.', 'ok'); await recarregar(); return true;
          } catch (x) { erro(x); return false; }
        } }]
      });
      var sel = j.elemento.querySelector('#fp-perfil');
      sel.addEventListener('change', function () { j.elemento.querySelector('#fp-emp-box').classList.toggle('oculto', sel.value !== 'empresa'); });
    }
    async function recarregar() { lista = await dados.pessoas.listar(); desenhar(); }
    ligarFiltros(alvo, desenhar);
    desenhar();
  }

  /* ================================================================
     ÁREAS
     ================================================================ */
  async function abaAreas(alvo, botaoNovo) {
    var b = await dados.banco.carregarTudo();
    alvo.innerHTML = '<p class="dica" style="margin:0">As áreas são os eixos do gráfico de radar. A ordem define a posição de cada eixo.</p>' + barraBusca('Buscar área') + '<div id="lista"></div>';
    function desenhar() {
      contar('areas', b.areas.filter(function (a) { return a.ativa; }).length);
      var f = filtro(alvo);
      var itens = b.areas.filter(function (a) { return (a.ativa || f.inativos) && (!f.texto || ui.normalizar(a.nome).indexOf(f.texto) >= 0); });
      var box = alvo.querySelector('#lista');
      if (!itens.length) { box.innerHTML = vazio('Nenhuma área encontrada.'); return; }
      box.innerHTML = '<div class="card tabela-card"><table class="tabela"><thead><tr><th>Ordem</th><th>Área</th><th>Testes</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
        itens.map(function (a) {
          var n = b.testes.filter(function (t) { return t.area_id === a.id && t.ativo; }).length;
          return '<tr><td class="num">' + a.ordem + '</td><td><b>' + esc(a.nome) + '</b></td><td class="num">' + n + '</td><td>' + ui.pill(a.ativa ? 'Ativa' : 'Inativa', 'neu') + '</td>' +
            '<td><div class="acoes"><button type="button" class="btn btn-p" data-editar="' + a.id + '">Editar</button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-editar]').forEach(function (bt) {
        bt.addEventListener('click', function () { formArea(b.areas.filter(function (a) { return a.id === bt.getAttribute('data-editar'); })[0]); });
      });
    }
    function formArea(a) {
      a = a || { ordem: (b.areas.reduce(function (m, x) { return Math.max(m, x.ordem); }, 0) + 1), ativa: true };
      ui.janela({
        titulo: a.id ? 'Editar área' : 'Nova área',
        corpo: '<div class="form-grade">' + campo('fa-nome', 'Nome da área', a.nome, { obrig: true, ph: 'Ex.: Elétrica', max: 60 }) +
          campo('fa-ordem', 'Ordem no radar', a.ordem, { tipo: 'number', modo: 'numeric' }) +
          (a.id ? marcar('fa-ativa', 'Área ativa', a.ativa) : '') + '</div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar área', principal: true, aoClicar: async function (fundo) {
          var nome = fundo.querySelector('#fa-nome').value.trim().replace(/\s+/g, ' ');
          var ordem = parseInt(fundo.querySelector('#fa-ordem').value, 10);
          if (!nome) { ui.toast('Informe o nome da área.', 'erro'); return false; }
          if (isNaN(ordem) || ordem < 0) { ui.toast('Informe uma ordem válida (0 ou mais).', 'erro'); return false; }
          try {
            await dados.banco.salvarArea({ id: a.id, nome: nome, ordem: ordem, ativa: a.id ? fundo.querySelector('#fa-ativa').checked : true });
            ui.toast('Área salva.', 'ok'); b = await dados.banco.carregarTudo(); desenhar(); return true;
          } catch (x) { if (/unique|duplicate/i.test(x.message || '')) ui.toast('Já existe uma área com este nome.', 'erro'); else erro(x); return false; }
        } }]
      });
    }
    ligarFiltros(alvo, desenhar);
    desenhar();
    botaoNovo.addEventListener('click', function () { formArea(null); });
  }

  /* ================================================================
     COMPETÊNCIAS
     ================================================================ */
  async function abaCompetencias(alvo, botaoNovo) {
    var b = await dados.banco.carregarTudo();
    function nTestes(id) {
      var s = {}; b.criterios.forEach(function (c) { if (c.competencia_id === id) s[c.teste_id] = 1; });
      return Object.keys(s).length;
    }
    alvo.innerHTML = barraBusca('Buscar competência',
      '<select class="entrada sel-filtro" data-filtro id="f-qual" aria-label="Qualificação-chave"><option value="">Todas as qualificações-chave</option>' +
        b.qualificacoes.map(function (q) { return '<option value="' + q.id + '">' + esc(q.nome) + '</option>'; }).join('') + '</select>' +
      '<label class="marcar-linha"><input type="checkbox" id="f-sem" data-filtro> Só sem vínculo</label>') + '<div id="lista"></div>';
    alvo.querySelector('#f-sem').addEventListener('change', function () { desenhar(); });
    function desenhar() {
      contar('competencias', b.competencias.filter(function (c) { return c.ativa; }).length);
      var f = filtro(alvo), qual = alvo.querySelector('#f-qual').value, sem = alvo.querySelector('#f-sem').checked;
      var itens = b.competencias.filter(function (c) {
        if (!c.ativa && !f.inativos) return false;
        if (qual && c.qualificacao_id !== qual) return false;
        if (sem && nTestes(c.id) > 0) return false;
        return !f.texto || ui.normalizar(c.nome).indexOf(f.texto) >= 0;
      });
      var box = alvo.querySelector('#lista');
      if (!itens.length) { box.innerHTML = vazio('Nenhuma competência encontrada.'); return; }
      function nomeQual(id) { var q = b.qualificacoes.filter(function (x) { return x.id === id; })[0]; return q ? q.nome : ''; }
      box.innerHTML = '<div class="card tabela-card"><table class="tabela"><thead><tr><th>Competência</th><th>Qualificação-chave</th><th>Testes</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
        itens.map(function (c) {
          var n = nTestes(c.id);
          var situ = !c.ativa ? ui.pill('Inativa', 'neu') : (n ? ui.pill('Ativa', 'neu') : ui.pill('Sem vínculo', 'off'));
          return '<tr><td><b>' + esc(c.nome) + '</b></td><td>' + esc(nomeQual(c.qualificacao_id)) + '</td><td class="num">' + n + '</td><td>' + situ + '</td>' +
            '<td><div class="acoes"><button type="button" class="btn btn-p" data-editar="' + c.id + '">Editar</button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-editar]').forEach(function (bt) {
        bt.addEventListener('click', function () { formCompetencia(b.competencias.filter(function (c) { return c.id === bt.getAttribute('data-editar'); })[0]); });
      });
    }
    function formCompetencia(c) {
      c = c || { ativa: true };
      var usada = c.id ? nTestes(c.id) > 0 : false;
      ui.janela({
        titulo: c.id ? 'Editar competência' : 'Nova competência',
        corpo: '<div class="form-grade">' + campo('fc-nome', 'Nome da competência', c.nome, { obrig: true, largo: true, max: 120 }) +
          '<label class="campo largo" for="fc-qual"><span>Qualificação-chave <span class="obrig">*</span></span><select class="entrada" id="fc-qual">' +
            b.qualificacoes.map(function (q) { return '<option value="' + q.id + '"' + (c.qualificacao_id === q.id ? ' selected' : '') + '>' + esc(q.nome) + '</option>'; }).join('') + '</select></label>' +
          campo('fc-desc', 'Descrição padrão', c.descricao, { largo: true, area: true, ph: 'O que o avaliador deve observar' }) +
          (c.id ? marcar('fc-ativa', 'Competência ativa', c.ativa) : '') +
          (c.id && !usada ? '<div class="largo"><button type="button" class="btn-link perigo" id="fc-excluir">Excluir esta competência</button></div>' : '') + '</div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar competência', principal: true, aoClicar: async function (fundo) {
          var nome = fundo.querySelector('#fc-nome').value.trim().replace(/\s+/g, ' ');
          if (!nome) { ui.toast('Informe o nome da competência.', 'erro'); return false; }
          try {
            await dados.banco.salvarCompetencia({ id: c.id, nome: nome, qualificacao_id: fundo.querySelector('#fc-qual').value,
              descricao: fundo.querySelector('#fc-desc').value.trim() || null, ativa: c.id ? fundo.querySelector('#fc-ativa').checked : true });
            ui.toast('Competência salva.', 'ok'); b = await dados.banco.carregarTudo(); desenhar(); return true;
          } catch (x) { if (/unique|duplicate/i.test(x.message || '')) ui.toast('Já existe uma competência com este nome.', 'erro'); else erro(x); return false; }
        } }]
      });
      var ex = document.getElementById('fc-excluir');
      if (ex) ex.addEventListener('click', async function () {
        if (!(await ui.confirmar('Excluir a competência?', 'Ela não está ligada a nenhum teste. Esta ação não pode ser desfeita.', 'Excluir', 'Cancelar'))) return;
        try {
          await dados.banco.excluirCompetencia(c.id);
          document.querySelectorAll('.janela-fundo').forEach(function (f) { f.remove(); });
          ui.toast('Competência excluída.', 'ok'); b = await dados.banco.carregarTudo(); desenhar();
        } catch (x) { erro(x); }
      });
    }
    ligarFiltros(alvo, desenhar);
    desenhar();
    botaoNovo.addEventListener('click', function () { formCompetencia(null); });
  }
})();
