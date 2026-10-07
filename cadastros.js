/* =====================================================================
   Classificação Final · views/cadastros.js
   Cadastros (somente administrador): Empresas, Avaliadores, Áreas e
   Competências. Abas pelo endereço: #/cadastros/empresas etc.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, dados = window.CF.dados, esc = ui.esc;
  var NOMES_PERFIL = { admin: 'Administrador', avaliador: 'Avaliador', empresa: 'Empresa' };
  var ABAS = [['empresas', 'Empresas', 'empresa'], ['avaliadores', 'Avaliadores', 'aval'], ['areas', 'Áreas', 'area'], ['testes', 'Testes', 'teste'], ['competencias', 'Competências', 'comp']];

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
    var BOTOES = { empresas: 'Nova empresa', avaliadores: 'Copiar link de cadastro', areas: 'Nova área', testes: 'Novo teste', competencias: 'Nova competência' };
    var corAba = ABAS.filter(function (a) { return a[0] === aba; })[0][2];
    area.innerHTML =
      '<header class="cabecalho"><div><h1>Cadastros</h1><p>Empresas, avaliadores, áreas e competências</p></div>' +
      '<button type="button" class="btn btn-' + corAba + '" id="b-novo">' + ui.icone(aba === 'avaliadores' ? 'link' : 'mais', 17) + esc(BOTOES[aba]) + '</button></header>' +
      '<div class="abas-cad" role="tablist">' + ABAS.map(function (a) {
        return '<a role="tab" href="#/cadastros/' + a[0] + '" data-cor="' + a[2] + '" aria-selected="' + (a[0] === aba) + '"><i class="ponto-cor cor-' + a[2] + '"></i>' + esc(a[1]) + '<span class="n" id="n-' + a[0] + '"></span></a>';
      }).join('') + '</div>' +
      '<div id="aba"><div class="girando" style="margin:30px auto"></div></div>';
    var alvo = area.querySelector('#aba');
    var fn = { empresas: abaEmpresas, avaliadores: abaAvaliadores, areas: abaAreas, testes: abaTestes, competencias: abaCompetencias }[aba];
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
          var contato = [e.responsavel, e.telefone_responsavel || e.telefone, e.cidade ? e.cidade + (e.uf ? '/' + e.uf : '') : null].filter(Boolean).join(' · ') || '—';
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
        b.addEventListener('click', function () { formEmpresa(lista.filter(function (e) { return e.id === b.getAttribute('data-editar'); })[0], recarregar, lista); });
      });
    }
    async function recarregar() { lista = await dados.empresas.listar(); contar('empresas', lista.filter(function (e) { return e.ativa; }).length); desenhar(); }
    ligarFiltros(alvo, desenhar);
    desenhar();
    botaoNovo.addEventListener('click', function () { formEmpresa(null, recarregar, lista); });
  }

  // Consulta os dados públicos da empresa na Receita Federal (BrasilAPI)
  async function consultarCNPJ(numero) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    try {
      var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + numero, ctrl ? { signal: ctrl.signal } : {});
      if (r.status === 404) return { naoEncontrado: true };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { dados: await r.json() };
    } finally { clearTimeout(t); }
  }

  function formEmpresa(e, aoSalvar, listaAtual) {
    e = e || {};
    var novo = !e.id, novoLogo = null, liberado = !novo;
    var j = ui.janela({
      titulo: novo ? 'Nova empresa' : 'Editar empresa',
      corpo: (novo ? '<p class="dica" style="margin:0;font-size:14px">Comece pelo CNPJ: o sistema busca os dados na Receita Federal e preenche o resto.</p>' : '') +
        '<div class="cnpj-linha"><label class="campo" for="f-cnpj"><span>CNPJ <span class="obrig">*</span></span>' +
          '<input class="entrada entrada-cnpj" id="f-cnpj" inputmode="numeric" maxlength="18" placeholder="00.000.000/0000-00" value="' + esc(e.cnpj ? ui.formatarCNPJ(e.cnpj) : '') + '"></label>' +
          '<button type="button" class="btn ' + (novo ? 'btn-pri' : '') + '" id="f-buscar">' + (novo ? 'Buscar dados' : 'Buscar de novo') + '</button></div>' +
        '<div id="f-status"></div>' +
        '<div id="f-resto" class="form-grade' + (liberado ? '' : ' oculto') + '">' +
          campo('f-razao', 'Razão social', e.razao_social, { obrig: true, largo: true }) +
          campo('f-fantasia', 'Nome fantasia', e.nome_fantasia, { obrig: true, ph: 'Como aparece nos relatórios' }) +
          campo('f-tel', 'Telefone', e.telefone, { ph: '(11) 0000-0000', modo: 'tel', max: 15 }) +
          campo('f-email', 'E-mail de contato', e.email, { largo: true, tipo: 'email', ph: 'contato@empresa.com.br' }) +
          campo('f-end', 'Endereço', e.endereco, { largo: true, max: 200, ph: 'Rua, número, complemento - bairro' }) +
          campo('f-cidade', 'Cidade / UF', e.cidade ? e.cidade + (e.uf ? ' / ' + e.uf : '') : '', { ph: 'Ex.: Carapicuíba / SP', max: 80 }) +
          campo('f-cep', 'CEP', e.cep ? e.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : '', { ph: '00000-000', modo: 'numeric', max: 9 }) +
          campo('f-resp', 'Responsável', e.responsavel, { ph: 'Nome de quem acompanha o processo' }) +
          campo('f-telresp', 'Telefone do responsável', e.telefone_responsavel, { ph: '(11) 00000-0000', modo: 'tel', max: 15 }) +
          '<div class="campo largo"><span>Logotipo</span><div class="logo-envio"><span class="logo-mini grande" id="f-logo-previa">' + (e.logo_path ? '' : 'Prévia') + '</span>' +
            '<span class="dica" style="flex:1;min-width:180px">PNG ou JPG, de preferência com fundo transparente. Aparece nos PDFs, no Excel e no portal.</span>' +
            '<button type="button" class="btn btn-p" id="f-logo-btn">Escolher arquivo</button></div></div>' +
          (e.id ? marcar('f-ativa', 'Empresa ativa', e.ativa !== false, 'Empresas inativas não aparecem para novos processos.') : '') +
        '</div>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar empresa', principal: true, aoClicar: salvar }]
    });
    var el = j.elemento;
    var cnpj = el.querySelector('#f-cnpj'), status = el.querySelector('#f-status'), resto = el.querySelector('#f-resto');
    var btSalvar = el.querySelector('.janela-pe .btn-pri');
    btSalvar.disabled = !liberado;
    function liberar() { liberado = true; resto.classList.remove('oculto'); btSalvar.disabled = false; }
    function avisar(tipo, html) { status.innerHTML = html ? '<div class="aviso aviso-' + tipo + '">' + (tipo === 'carregando' ? '<span class="girando mini"></span>' : ui.icone(tipo === 'ok' ? 'ok' : 'alerta', 20)) + '<span>' + html + '</span></div>' : ''; }
    function definir(id, v) { var x = el.querySelector(id); if (x && v != null && v !== '') { x.value = v; } }
    ['#f-tel', '#f-telresp'].forEach(function (id) { var x = el.querySelector(id); x.addEventListener('input', function () { x.value = ui.formatarTelefone(x.value); }); });
    var cep = el.querySelector('#f-cep'); cep.addEventListener('input', function () { cep.value = ui.soNumeros(cep.value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2'); });

    var ultimaBusca = '';
    async function buscar() {
      var n = ui.soNumeros(cnpj.value);
      if (!ui.cnpjValido(n)) { avisar('erro', 'CNPJ inválido. Confira os números.'); return; }
      if ((listaAtual || []).some(function (x) { return x.cnpj === n && x.id !== e.id; })) { avisar('erro', 'Já existe uma empresa cadastrada com este CNPJ.'); return; }
      ultimaBusca = n;
      avisar('carregando', 'Consultando a Receita Federal…');
      try {
        var r = await consultarCNPJ(n);
        if (ultimaBusca !== n) return;
        if (r.naoEncontrado) { avisar('erro', 'CNPJ não encontrado na Receita Federal. Confira o número ou <button type="button" class="btn-link" id="f-manual">preencha manualmente</button>.'); ligarManual(); return; }
        var d = r.dados || {};
        definir('#f-razao', d.razao_social);
        definir('#f-fantasia', d.nome_fantasia || d.razao_social);
        if (d.ddd_telefone_1) definir('#f-tel', ui.formatarTelefone(d.ddd_telefone_1));
        if (d.email) definir('#f-email', String(d.email).toLowerCase());
        var end = [[d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' '), d.numero].filter(Boolean).join(', ') + (d.complemento ? ' ' + d.complemento : '') + (d.bairro ? ' - ' + d.bairro : '');
        definir('#f-end', end.trim());
        if (d.municipio) definir('#f-cidade', d.municipio + (d.uf ? ' / ' + d.uf : ''));
        if (d.cep) definir('#f-cep', ui.soNumeros(d.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2'));
        situacao = d.descricao_situacao_cadastral || null;
        liberar();
        var ativa = !situacao || /ATIVA/i.test(situacao);
        avisar(ativa ? 'ok' : 'info', 'Dados encontrados na Receita Federal' + (situacao ? ' · empresa <b>' + esc(situacao) + '</b>' : '') + '. ' +
          (ativa ? 'Confira e complete o que faltar.' : 'Atenção: a empresa não está ativa na Receita.'));
        el.querySelector('.janela-corpo').dispatchEvent(new Event('input', { bubbles: true }));
      } catch (x) {
        console.warn('Consulta de CNPJ:', x);
        avisar('info', 'Não foi possível consultar a Receita agora. <button type="button" class="btn-link" id="f-manual">Preencher manualmente</button>');
        ligarManual();
      }
    }
    var situacao = e.situacao_receita || null;
    function ligarManual() { var m = el.querySelector('#f-manual'); if (m) m.addEventListener('click', function () { liberar(); avisar('', ''); el.querySelector('#f-razao').focus(); }); }
    var espera = null;
    cnpj.addEventListener('input', function () {
      cnpj.value = ui.formatarCNPJ(cnpj.value);
      clearTimeout(espera);
      if (novo && ui.soNumeros(cnpj.value).length === 14) espera = setTimeout(buscar, 350);
    });
    el.querySelector('#f-buscar').addEventListener('click', buscar);
    if (novo) cnpj.focus();
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
      if (!liberado) { ui.toast('Busque o CNPJ primeiro.', 'erro'); return false; }
      var v = function (id) { var x = fundo.querySelector(id); return x ? x.value.trim() : ''; };
      var cid = v('#f-cidade').split('/');
      var uf = (cid[1] || '').trim().toUpperCase();
      var obj = {
        id: e.id, razao_social: v('#f-razao').replace(/\s+/g, ' '), nome_fantasia: v('#f-fantasia').replace(/\s+/g, ' '),
        cnpj: ui.soNumeros(v('#f-cnpj')), telefone: v('#f-tel') || null, email: v('#f-email').toLowerCase() || null,
        endereco: v('#f-end') || null, cidade: (cid[0] || '').trim() || null, uf: /^[A-Z]{2}$/.test(uf) ? uf : null,
        cep: ui.soNumeros(v('#f-cep')) || null, responsavel: v('#f-resp') || null, telefone_responsavel: v('#f-telresp') || null,
        situacao_receita: situacao
      };
      if (e.id) obj.ativa = fundo.querySelector('#f-ativa').checked;
      if (!obj.razao_social || !obj.nome_fantasia) { ui.toast('Preencha a razão social e o nome fantasia.', 'erro'); return false; }
      if (!ui.cnpjValido(obj.cnpj)) { ui.toast('CNPJ inválido. Confira os números.', 'erro'); return false; }
      if (obj.cep && obj.cep.length !== 8) { ui.toast('CEP inválido (8 números).', 'erro'); return false; }
      if (obj.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email)) { ui.toast('E-mail de contato inválido.', 'erro'); return false; }
      return ui.executar(fundo.querySelector('.janela-pe .btn-pri'), 'Salvando…', async function () {
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
    async function recarregar() {
      lista = await dados.pessoas.listar(); desenhar();
      if (window.CF.avisos) {
        window.CF.avisos.recontar();
        lista.filter(function (p) { return p.aprovado || !p.ativo; }).forEach(function (p) { var c = document.querySelector('[data-aviso="' + p.id + '"]'); if (c) c.remove(); });
      }
    }
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
            '<td><div class="acoes"><button type="button" class="btn btn-p" data-editar="' + a.id + '">Editar</button><button type="button" class="btn btn-p btn-perigo" data-excluir="' + a.id + '">Excluir</button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-editar]').forEach(function (bt) {
        bt.addEventListener('click', function () { formArea(b.areas.filter(function (a) { return a.id === bt.getAttribute('data-editar'); })[0]); });
      });
      box.querySelectorAll('[data-excluir]').forEach(function (bt) {
        bt.addEventListener('click', function () { excluirArea(b.areas.filter(function (a) { return a.id === bt.getAttribute('data-excluir'); })[0]); });
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
    function excluirArea(a) {
      var ts = b.testes.filter(function (t) { return t.area_id === a.id; });
      if (!ts.length) {
        ui.confirmar('Excluir a área "' + a.nome + '"?', 'Ela não tem testes. Esta ação não pode ser desfeita.', 'Excluir área', 'Cancelar').then(async function (sim) {
          if (!sim) return;
          try { await dados.banco.excluirArea(a.id, null); ui.toast('Área excluída.', 'ok'); b = await dados.banco.carregarTudo(); desenhar(); } catch (x) { erro(x); }
        });
        return;
      }
      ui.janela({
        titulo: 'Excluir a área "' + a.nome + '"', confirmarDescarte: false,
        corpo: '<p style="margin:0;color:var(--texto-2)">Esta área tem <b>' + ts.length + ' teste(s)</b>. Como todo teste precisa de uma área, escolha para onde eles vão:</p>' +
          '<label class="campo" for="ea-dest"><span>Mover os testes para <span class="obrig">*</span></span><select class="entrada" id="ea-dest"><option value="">Escolha a área…</option>' +
          b.areas.filter(function (x) { return x.ativa && x.id !== a.id; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.nome) + '</option>'; }).join('') + '</select></label>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Mover e excluir área', principal: true, aoClicar: async function (f) {
          var dest = f.querySelector('#ea-dest').value;
          if (!dest) { ui.toast('Escolha a área de destino.', 'erro'); return false; }
          try { await dados.banco.excluirArea(a.id, dest); ui.toast('Testes movidos e área excluída.', 'ok'); b = await dados.banco.carregarTudo(); desenhar(); return true; } catch (x) { erro(x); return false; }
        } }]
      });
    }
    ligarFiltros(alvo, desenhar);
    desenhar();
    botaoNovo.addEventListener('click', function () { formArea(null); });
  }

  /* ================================================================
     TESTES (mesmo editor do Banco de testes)
     ================================================================ */
  async function abaTestes(alvo, botaoNovo) {
    var estado = { b: await dados.banco.carregarTudo(), abertas: {}, recarregar: async function () { estado.b = await dados.banco.carregarTudo(); desenhar(); } };
    var ed = window.CF.bancoEditor(estado);
    function areaDe(t) { return estado.b.areas.filter(function (a) { return a.id === t.area_id; })[0]; }
    function comps(t) { return estado.b.criterios.filter(function (c) { return c.teste_id === t.id && c.competencia_id; }).length; }
    alvo.innerHTML = barraBusca('Buscar teste',
      '<select class="entrada sel-filtro" data-filtro id="f-area" aria-label="Área"><option value="">Todas as áreas</option>' +
        estado.b.areas.slice().sort(function (x, y) { return x.ordem - y.ordem; }).map(function (a) { return '<option value="' + a.id + '">' + esc(a.nome) + '</option>'; }).join('') +
        '<option value="sem">Sem área</option></select>') + '<div id="lista"></div>';
    function desenhar() {
      var b = estado.b;
      contar('testes', b.testes.filter(function (t) { return t.ativo; }).length);
      var f = filtro(alvo), ar = alvo.querySelector('#f-area').value;
      var itens = b.testes.filter(function (t) {
        if (!t.ativo && !f.inativos) return false;
        if (ar === 'sem' && t.area_id) return false;
        if (ar && ar !== 'sem' && t.area_id !== ar) return false;
        return !f.texto || ui.normalizar(t.nome).indexOf(f.texto) >= 0;
      }).sort(function (x, y) { return x.nome.localeCompare(y.nome, 'pt-BR'); });
      var box = alvo.querySelector('#lista');
      if (!itens.length) { box.innerHTML = vazio('Nenhum teste encontrado.'); return; }
      box.innerHTML = '<div class="card tabela-card"><table class="tabela"><thead><tr><th>Teste</th><th>Área</th><th>Competências</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
        itens.map(function (t) {
          var a = areaDe(t), n = comps(t);
          var situ = !t.ativo ? ui.pill('Inativo', 'neu') : (!n ? ui.pill('Sem vínculo', 'off') : (t.padrao ? ui.pill('Padrão', 'neu') : ui.pill('Ativo', 'neu')));
          return '<tr><td><b>' + esc(t.nome) + '</b></td><td>' + (a ? '<span class="tag-area">' + esc(a.nome) + '</span>' : ui.pill('sem área', 'off')) + '</td><td class="num">' + n + '</td><td>' + situ + '</td>' +
            '<td><div class="acoes"><button type="button" class="btn btn-p" data-editar="' + t.id + '">Editar</button><button type="button" class="btn btn-p btn-perigo" data-excluir="' + t.id + '">Excluir</button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-editar]').forEach(function (bt) { bt.addEventListener('click', function () { ed.formTeste(estado.b.testes.filter(function (t) { return t.id === bt.getAttribute('data-editar'); })[0]); }); });
      box.querySelectorAll('[data-excluir]').forEach(function (bt) { bt.addEventListener('click', function () { ed.excluirTeste(estado.b.testes.filter(function (t) { return t.id === bt.getAttribute('data-excluir'); })[0]); }); });
    }
    ligarFiltros(alvo, desenhar);
    desenhar();
    botaoNovo.addEventListener('click', function () { ed.formTeste(null, null); });
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
            '<td><div class="acoes"><button type="button" class="btn btn-p" data-editar="' + c.id + '">Editar</button><button type="button" class="btn btn-p btn-perigo" data-excluir="' + c.id + '">Excluir</button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-editar]').forEach(function (bt) {
        bt.addEventListener('click', function () { formCompetencia(b.competencias.filter(function (c) { return c.id === bt.getAttribute('data-editar'); })[0]); });
      });
      box.querySelectorAll('[data-excluir]').forEach(function (bt) {
        bt.addEventListener('click', function () { excluirCompetencia(b.competencias.filter(function (c) { return c.id === bt.getAttribute('data-excluir'); })[0]); });
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
          (!c.id ? '<label class="campo largo" for="fc-teste"><span>Em qual teste ela será avaliada? <span class="obrig">*</span></span><select class="entrada" id="fc-teste"><option value="">Escolha o teste…</option>' + opcoesTestes() + '</select></label>' +
            '<label class="campo largo" for="fc-exib"><span>Nome que o avaliador vê nesse teste</span><input class="entrada" id="fc-exib" maxlength="120" placeholder="Em branco = nome da competência"></label>' +
            '<p class="dica largo" style="margin:0">Toda competência nova já nasce ligada a um teste.</p>' : '') + '</div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Salvar competência', principal: true, aoClicar: async function (fundo) {
          var nome = fundo.querySelector('#fc-nome').value.trim().replace(/\s+/g, ' ');
          if (!nome) { ui.toast('Informe o nome da competência.', 'erro'); return false; }
          try {
            if (!c.id) {
              var teste = fundo.querySelector('#fc-teste').value;
              if (!teste) { ui.toast('Escolha o teste em que a competência será avaliada.', 'erro'); return false; }
              await dados.banco.criarCompetenciaNoTeste({ nome: nome, qualificacao_id: fundo.querySelector('#fc-qual').value, descricao: fundo.querySelector('#fc-desc').value.trim() || null,
                teste_id: teste, nome_exibido: fundo.querySelector('#fc-exib').value.trim() });
            } else
            await dados.banco.salvarCompetencia({ id: c.id, nome: nome, qualificacao_id: fundo.querySelector('#fc-qual').value,
              descricao: fundo.querySelector('#fc-desc').value.trim() || null, ativa: fundo.querySelector('#fc-ativa').checked });
            ui.toast('Competência salva.', 'ok'); b = await dados.banco.carregarTudo(); desenhar(); return true;
          } catch (x) { if (/unique|duplicate/i.test(x.message || '')) ui.toast('Já existe uma competência com este nome.', 'erro'); else erro(x); return false; }
        } }]
      });
    }
    function opcoesTestes() {
      var html = b.areas.filter(function (a) { return a.ativa; }).sort(function (x, y) { return x.ordem - y.ordem; }).map(function (a) {
        var ts = b.testes.filter(function (t) { return t.area_id === a.id && t.ativo; }).sort(function (x, y) { return x.nome.localeCompare(y.nome, 'pt-BR'); });
        return ts.length ? '<optgroup label="' + esc(a.nome) + '">' + ts.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nome) + '</option>'; }).join('') + '</optgroup>' : '';
      }).join('');
      var sem = b.testes.filter(function (t) { return !t.area_id && t.ativo; });
      return html + (sem.length ? '<optgroup label="Sem área">' + sem.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nome) + '</option>'; }).join('') + '</optgroup>' : '');
    }
    // Opção A: competência em uso não pode ser excluída
    async function excluirCompetencia(c) {
      var testes = {}; b.criterios.forEach(function (x) { if (x.competencia_id === c.id) testes[x.teste_id] = 1; });
      var nomes = b.testes.filter(function (t) { return testes[t.id]; }).map(function (t) { return t.nome; }).sort();
      if (nomes.length) {
        ui.janela({ titulo: 'Não é possível excluir esta competência', confirmarDescarte: false,
          corpo: '<p style="margin:0;color:var(--texto-2)"><b>' + esc(c.nome) + '</b> está ligada a <b>' + nomes.length + ' teste(s)</b>. Remova-a desses testes primeiro (no Banco de testes), se quiser mesmo excluí-la:</p>' +
            '<ul class="lista-pend">' + nomes.slice(0, 12).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + (nomes.length > 12 ? '<li>… e mais ' + (nomes.length - 12) + '</li>' : '') + '</ul>',
          botoes: [{ texto: 'Entendi', principal: true, aoClicar: function () { return true; } }] });
        return;
      }
      if (!(await ui.confirmar('Excluir a competência?', '"' + c.nome + '" não está em nenhum teste. Esta ação não pode ser desfeita.', 'Excluir', 'Cancelar'))) return;
      try { await dados.banco.excluirCompetencia(c.id); ui.toast('Competência excluída.', 'ok'); b = await dados.banco.carregarTudo(); desenhar(); } catch (x) { erro(x); }
    }
    ligarFiltros(alvo, desenhar);
    desenhar();
    botaoNovo.addEventListener('click', function () { formCompetencia(null); });
  }
})();
