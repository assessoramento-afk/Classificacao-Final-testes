/* =====================================================================
   Classificação Final · testes-tablet.js · Projeto Gol Testes (etapa T1)
   · editor dos testes aplicados no tablet  (#/banco/tablet/<teste>)
   · importar da planilha do Excel (Conferência de Mercadoria e Cartões)
   · versões e publicação
   · cadastro dos tablets (Configurações › Tablets)
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, sb = window.CF.sb, esc = ui.esc, M = window.CF.testesMotor;
  function erro(e) { console.error(e); ui.toast(api.traduzErro(e), 'erro'); }
  async function q(p) { var r = await p; if (r.error) throw r.error; return r.data; }
  function dataHora(s) { if (!s) return '—'; var d = new Date(s); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  var TIPOS = [
    ['contar', 'Contar diferenças', '#ee7330', 'Original × cópia; o jovem diz quantos erros há na linha', true],
    ['marcar', 'Marcar o que mudou', '#2f6fd0', 'Cartão original × cópia; marca X nos campos diferentes', true],
    ['escolha', 'Múltipla escolha', '#8b6fd6', 'Pergunta com alternativas, com figura ou texto de apoio', true],
    ['tabela', 'Preencher tabela', '#3FA66B', 'Texto, número, data ou valor por célula', false],
    ['associar', 'Associar à imagem', '#8b6fd6', 'Liga código ou nome à imagem certa', false],
    ['ordem', 'Colocar em ordem', '#e0a100', 'O jovem define a ordem dos itens', false],
    ['aberta', 'Resposta aberta', '#8a8486', 'Texto livre; o avaliador corrige', false],
    ['especial', 'Atividade especial', '#5b6b8a', 'Exercício interativo próprio (ex.: Programação)', false]
  ];
  function tipo(t) { return TIPOS.filter(function (x) { return x[0] === t; })[0] || TIPOS[0]; }
  var FAIXAS_PADRAO = { pontos: [[5, 36], [4, 27], [3, 18], [2, 9], [1, 1], [0, 0]], percentual: [[5, 80], [4, 60], [3, 40], [2, 20], [1, 0]] };
  function faixasPadrao(modo) { return FAIXAS_PADRAO[modo].map(function (f) { return { nota: f[0], min: f[1] }; }); }

  /* =================== Editor do teste =================== */
  async function editor(area, testeId) {
    area.innerHTML = '<div class="girando" style="margin:40px auto"></div>';
    var t, rasc, versoes;
    try {
      var r = await Promise.all([q(sb.from('testes').select('*').eq('id', testeId).maybeSingle()), q(sb.from('teste_tablet').select('*').eq('teste_id', testeId).maybeSingle()),
        q(sb.from('teste_tablet_versoes').select('versao, nota, publicada_em').eq('teste_id', testeId).order('versao', { ascending: false }))]);
      t = r[0]; rasc = r[1]; versoes = r[2] || [];
    } catch (e) { area.innerHTML = '<div class="aviso aviso-erro">' + esc(api.traduzErro(e)) + '</div>'; return; }
    if (!t) { area.innerHTML = '<a class="voltar" href="#/banco">← Banco de testes</a><div class="aviso aviso-erro">Teste não encontrado.</div>'; return; }
    var est = JSON.parse(JSON.stringify((rasc && rasc.estrutura) || {}));
    est.tempo_min = est.tempo_min || 10; est.partes = est.partes || []; est.modo_nota = est.modo_nota || 'pontos'; est.faixas = est.faixas && est.faixas.length ? est.faixas : faixasPadrao(est.modo_nota);
    var tablet = t.tablet !== false, mudou = false;
    var pub = rasc ? rasc.versao_publicada : 0;

    function desenhar() {
      var total = M.total(est);
      area.innerHTML = '<a class="voltar" href="#/banco">← Banco de testes</a>' +
        '<header class="cabecalho"><div><h1>' + esc(t.nome) + (t.codigo ? ' <span class="cod cod-teste">' + esc(t.codigo) + '</span>' : '') + '</h1><p>Teste aplicado no tablet · ' + (pub ? 'versão ' + pub + ' nos tablets' : 'ainda não publicado') + (mudou ? ' · <b>alterações não salvas</b>' : '') + '</p></div>' +
          '<div class="botoes-topo"><button type="button" class="btn" id="tt-prev">👁 Pré-visualizar</button><button type="button" class="btn" id="tt-imp">⬆ Importar da planilha</button><button type="button" class="btn" id="tt-sal">Salvar rascunho</button><button type="button" class="btn btn-pri" id="tt-pub">Publicar versão ' + (versoes.length ? versoes[0].versao + 1 : 1) + '</button></div></header>' +
        '<section class="card bloco"><h2 class="tt-h">Dados do teste <label class="tt-tab"><input type="checkbox" id="tt-ativo"' + (tablet ? ' checked' : '') + '> 📱 Aplicado no tablet</label></h2>' +
          '<div class="tt-grade"><label class="campo"><span>Tempo do teste (minutos)</span><input class="entrada" id="tt-tempo" inputmode="numeric" value="' + esc(est.tempo_min) + '"></label></div>' +
          '<label class="campo"><span>Instruções para o jovem</span><textarea class="entrada" id="tt-instr" rows="3">' + esc(est.instrucoes || '') + '</textarea></label></section>' +
        explicacaoEd() +
        '<section class="card bloco"><h2 class="tt-h">Partes do teste <small class="dica">total possível: ' + String(total).replace('.', ',') + ' pontos</small></h2><div id="tt-partes">' +
          (est.partes.length ? est.partes.map(parteEd).join('') : '<p class="dica">Nenhuma parte ainda. Escolha um tipo abaixo ou importe da planilha.</p>') + '</div>' +
          '<div class="tt-add"><span class="dica">+ Parte:</span>' + TIPOS.map(function (x) { return '<button type="button" class="btn btn-p" data-add="' + x[0] + '"' + (x[4] ? '' : ' disabled title="Entra na etapa T3"') + '>' + esc(x[1]) + (x[4] ? '' : ' · T3') + '</button>'; }).join('') + '</div></section>' +
        '<section class="card bloco"><h2 class="tt-h">Nota de 0 a 5 <small class="dica">a nota é a da maior faixa alcançada</small></h2>' +
          '<div class="tt-modo"><label><input type="radio" name="tt-modo" value="pontos"' + (est.modo_nota === 'pontos' ? ' checked' : '') + '> por pontos</label><label><input type="radio" name="tt-modo" value="percentual"' + (est.modo_nota === 'percentual' ? ' checked' : '') + '> por % do total (como nos Cartões)</label></div>' +
          '<div class="tt-faixas">' + est.faixas.slice().sort(function (a, b) { return b.nota - a.nota; }).map(function (f) {
            return '<label class="tt-fx tt-n' + f.nota + '"><b>' + f.nota + '</b><span>a partir de</span><input class="entrada" data-fx="' + f.nota + '" value="' + esc(String(f.min).replace('.', ',')) + '"><small>' + (est.modo_nota === 'percentual' ? '%' : 'pontos') + '</small></label>'; }).join('') + '</div></section>' +
        '<section class="card bloco"><h2 class="tt-h">Versões</h2>' + (versoes.length ? versoes.map(function (v, i) {
          return '<div class="tt-ver"><b>v' + v.versao + '</b>' + ui.pill(i === 0 ? 'Nos tablets' : 'Anterior', i === 0 ? 'ok' : 'neu') + '<span>' + esc(v.nota || '—') + '</span><small>' + dataHora(v.publicada_em) + '</small></div>'; }).join('') : '<p class="dica">Nenhuma versão publicada ainda.</p>') +
          '<p class="dica">Ao publicar, os tablets baixam a versão nova na próxima conexão. Turmas que já começaram este teste continuam na versão em que começaram.</p></section>';
      ligar();
    }
    function explicacaoEd() {
      var ex = est.explicacao || {}, ps = (ex.passos && ex.passos.length ? ex.passos : [['', ''], ['', ''], ['', '']]);
      return '<section class="card bloco"><h2 class="tt-h">Explicação antes do teste <small class="dica">tela "Como fazer este teste", que o jovem vê antes de iniciar</small></h2><div id="tt-exp">' +
        ps.map(function (x, i) { return '<div class="tt-passo"><b>' + (i + 1) + '</b><input class="entrada" data-ept="' + i + '" value="' + esc(x[0] || '') + '" placeholder="Título do passo"><input class="entrada" data-epx="' + i + '" value="' + esc(x[1] || '') + '" placeholder="Explicação do passo"></div>'; }).join('') +
        '</div><div class="tt-add"><button type="button" class="btn btn-p" id="tt-exp-mais">+ Passo</button></div>' +
        '<div class="tt-grade"><label class="campo"><span>Exemplo resolvido</span><textarea class="entrada" id="tt-ex" rows="2">' + esc(ex.exemplo || '') + '</textarea></label>' +
        '<label class="campo"><span>Dica (erros comuns)</span><textarea class="entrada" id="tt-dica" rows="2">' + esc(ex.dica || '') + '</textarea></label></div></section>';
    }
    function inp(v, a) { return '<input class="entrada tt-c" value="' + esc(v == null ? '' : v) + '"' + (a || '') + '>'; }
    function parteEd(p, i) {
      var tp = tipo(p.tipo), h = '<div class="tt-parte" style="--c:' + tp[2] + '" data-p="' + i + '"><header><b>' + (i + 1) + ' · ' + esc(tp[1]) + '</b><span class="dica">' + String(M.totalParte(p)).replace('.', ',') + ' pontos</span>' +
        '<span class="tt-pa"><button type="button" class="btn btn-p" data-sobe="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" class="btn btn-p perigo" data-rem="' + i + '">Remover parte</button></span></header>' +
        '<div class="tt-grade"><label class="campo"><span>Título (opcional)</span><input class="entrada" data-pt="titulo" value="' + esc(p.titulo || '') + '"></label>' +
        '<label class="campo"><span>Instrução desta parte (opcional)</span><input class="entrada" data-pt="instrucoes" value="' + esc(p.instrucoes || '') + '"></label></div>';
      if (p.tipo === 'contar') {
        var cols = p.colunas || [];
        h += '<div class="tt-grade"><label class="campo"><span>Colunas (separe por vírgula)</span><input class="entrada" data-pt="colunas" value="' + esc(cols.join(', ')) + '"></label>' +
          '<label class="campo"><span>Botões de resposta</span><input class="entrada" data-pt="opcoes" value="' + esc((p.opcoes || ['–', '1', '2', '3', '4']).join(', ')) + '"></label></div>' +
          '<div class="tm-rolar"><table class="tt-tab sem-vista"><thead><tr><th>#</th>' + cols.map(function (c) { return '<th>Original · ' + esc(c) + '</th>'; }).join('') + cols.map(function (c) { return '<th>Cópia · ' + esc(c) + '</th>'; }).join('') + '<th>Gabarito</th><th>Pontos</th><th></th></tr></thead><tbody>' +
          (p.linhas || []).map(function (l, k) {
            return '<tr data-l="' + k + '"><td>' + (k + 1) + '</td>' + cols.map(function (c, j) { return '<td>' + inp((l.original || [])[j], ' data-o="' + j + '"') + '</td>'; }).join('') + cols.map(function (c, j) { return '<td>' + inp((l.copia || [])[j], ' data-cp="' + j + '"') + '</td>'; }).join('') +
              '<td>' + inp(l.gabarito, ' data-g style="width:56px"') + '</td><td>' + inp(l.pontos == null ? 1 : l.pontos, ' data-pts style="width:56px"') + '</td><td><button type="button" class="ico perigo" data-rl="' + k + '" aria-label="Remover linha">×</button></td></tr>';
          }).join('') + '</tbody></table></div><div class="tt-add"><button type="button" class="btn btn-p" data-linha="' + i + '">+ Linha</button><button type="button" class="btn btn-p" data-auto="' + i + '" title="Conta quantas colunas da cópia estão diferentes do original">Calcular gabarito pelas diferenças</button></div>';
      } else if (p.tipo === 'escolha') {
        var tx = p.textos || [], L = 'ABCDEFGH';
        h += '<details class="tt-txs"' + (tx.length ? ' open' : '') + '><summary>Textos de apoio (' + tx.length + ')</summary>' + tx.map(function (t2, ti) {
            return '<div class="tt-tx" data-tx="' + ti + '"><input class="entrada" data-txt="titulo" value="' + esc(t2.titulo || '') + '" placeholder="TEXTO I"><textarea class="entrada" data-txt="texto" rows="2">' + esc(t2.texto || '') + '</textarea><input class="entrada" data-txt="autor" value="' + esc(t2.autor || '') + '" placeholder="Autor / fonte"><button type="button" class="ico perigo" data-rtx="' + ti + '" aria-label="Remover texto">×</button></div>';
          }).join('') + '<button type="button" class="btn btn-p" data-ntx="' + i + '">+ Texto de apoio</button></details>' +
          '<div class="tt-qs">' + (p.questoes || []).map(function (q, k) {
            return '<div class="tt-q" data-q="' + k + '"><div class="tt-qh"><b>' + (k + 1) + '</b><textarea class="entrada" data-qe rows="2" placeholder="Enunciado da pergunta">' + esc(q.enunciado || '') + '</textarea><button type="button" class="ico perigo" data-rq="' + k + '" aria-label="Remover pergunta">×</button></div>' +
              '<div class="tt-qm"><div class="tt-qimg">' + (q.imagem ? '<img src="' + esc(q.imagem) + '" alt="">' : '<span class="dica">sem figura</span>') + '<label class="btn btn-p">' + (q.imagem ? 'Trocar figura' : '+ Figura') + '<input type="file" accept="image/*" data-qimg hidden></label>' + (q.imagem ? '<button type="button" class="btn btn-p" data-qsem>Tirar figura</button>' : '') + '</div>' +
              '<div class="tt-qa">' + (q.alternativas || []).map(function (a, j) { return '<label class="tt-alt"><input type="radio" name="tt-c-' + i + '-' + k + '" data-qc="' + j + '"' + (+q.correta === j ? ' checked' : '') + ' title="Alternativa correta"><b>' + L[j] + '</b><input class="entrada" data-qa value="' + esc(a) + '"' + (q.so_letras ? ' placeholder="(só a letra)"' : '') + '></label>'; }).join('') +
                '<div class="tt-qx"><button type="button" class="btn btn-p" data-qmais>+ alternativa</button><button type="button" class="btn btn-p" data-qmenos>− alternativa</button>' +
                '<label><input type="checkbox" data-qso' + (q.so_letras ? ' checked' : '') + '> só letras (opções estão na figura)</label>' +
                '<label>Vale <input class="entrada" data-qp value="' + esc(q.pontos == null ? 1 : q.pontos) + '" style="width:56px"> pt</label>' +
                '<label>Texto <select class="entrada" data-qt><option value="">—</option>' + tx.map(function (t2, ti) { return '<option value="' + ti + '"' + (q.texto === ti || q.texto === t2.id ? ' selected' : '') + '>' + esc(t2.titulo || 'Texto ' + (ti + 1)) + '</option>'; }).join('') + '</select></label>' +
                '<label>Seção <input class="entrada" data-qs value="' + esc(q.secao || '') + '" placeholder="opcional" style="width:150px"></label></div></div></div></div>';
          }).join('') + '</div><div class="tt-add"><button type="button" class="btn btn-p" data-nq="' + i + '">+ Pergunta</button><span class="dica">Marque o círculo da alternativa correta.</span></div>';
      } else if (p.tipo === 'marcar') {
        var C = [['banco', 'Banco'], ['bandeira', 'Bandeira'], ['numero', 'Número'], ['nome', 'Nome'], ['validade', 'Validade'], ['agencia', 'Agência'], ['cvv', 'CVV']];
        h += '<p class="dica">O gabarito sai sozinho: cada campo diferente entre o original e a cópia é uma diferença. Pontuação = acertos − marcações sem diferença (mínimo 0).</p>' +
          '<div class="tm-rolar"><table class="tt-tab sem-vista"><thead><tr><th>#</th><th></th>' + C.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '<th>Diferenças</th><th></th></tr></thead><tbody>' +
          (p.blocos || []).map(function (b, k) {
            var dif = M.diferencas(b);
            return ['original', 'copia'].map(function (lado, z) {
              return '<tr data-b="' + k + '" data-lado="' + lado + '"' + (z ? ' class="tt-cp"' : '') + '>' + (z ? '' : '<td rowspan="2">' + (k + 1) + '<br><small>orig. nº</small>' + inp(b.orig == null ? '' : b.orig, ' data-orig style="width:52px"') + '</td>') + '<td><small>' + (z ? 'Cópia' : 'Original') + '</small></td>' +
                C.map(function (c) { return '<td>' + inp((b[lado] || {})[c[0]], ' data-cb="' + c[0] + '"' + (z && dif.indexOf(c[0]) >= 0 ? ' style="border-color:#2f6fd0"' : '')) + '</td>'; }).join('') +
                (z ? '' : '<td rowspan="2"><b>' + dif.length + '</b></td><td rowspan="2"><button type="button" class="ico perigo" data-rb="' + k + '" aria-label="Remover bloco">×</button></td>') + '</tr>';
            }).join('');
          }).join('') + '</tbody></table></div><div class="tt-add"><button type="button" class="btn btn-p" data-bloco="' + i + '">+ Bloco</button></div>';
      }
      return h + '</div>';
    }
    function ler() {
      est.tempo_min = parseInt(area.querySelector('#tt-tempo').value, 10) || 10;
      est.instrucoes = area.querySelector('#tt-instr').value.trim();
      est.explicacao = { passos: [].map.call(area.querySelectorAll('[data-ept]'), function (x) { var i = x.getAttribute('data-ept'); return [x.value.trim(), area.querySelector('[data-epx="' + i + '"]').value.trim()]; }).filter(function (x) { return x[0] || x[1]; }),
        exemplo: area.querySelector('#tt-ex').value.trim(), dica: area.querySelector('#tt-dica').value.trim() };
      tablet = area.querySelector('#tt-ativo').checked;
      var m = area.querySelector('input[name="tt-modo"]:checked'); est.modo_nota = m ? m.value : 'pontos';
      est.faixas = [].map.call(area.querySelectorAll('[data-fx]'), function (x) { return { nota: Number(x.getAttribute('data-fx')), min: parseFloat(x.value.replace(',', '.')) || 0 }; });
      area.querySelectorAll('.tt-parte').forEach(function (el) {
        var p = est.partes[el.getAttribute('data-p')];
        el.querySelectorAll('[data-pt]').forEach(function (x) {
          var k = x.getAttribute('data-pt');
          p[k] = (k === 'colunas' || k === 'opcoes') ? x.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : x.value.trim();
        });
        if (p.tipo === 'contar') p.linhas = [].map.call(el.querySelectorAll('tbody tr[data-l]'), function (tr) {
          return { original: [].map.call(tr.querySelectorAll('[data-o]'), function (x) { return x.value.trim(); }), copia: [].map.call(tr.querySelectorAll('[data-cp]'), function (x) { return x.value.trim(); }),
            gabarito: tr.querySelector('[data-g]').value.trim() || '-', pontos: parseFloat(tr.querySelector('[data-pts]').value.replace(',', '.')) || 0 };
        });
        if (p.tipo === 'escolha') {
          p.textos = [].map.call(el.querySelectorAll('[data-tx]'), function (d, ti) { return { id: ti, titulo: d.querySelector('[data-txt="titulo"]').value.trim(), texto: d.querySelector('[data-txt="texto"]').value.trim(), autor: d.querySelector('[data-txt="autor"]').value.trim() }; });
          var antes = p.questoes || [];
          p.questoes = [].map.call(el.querySelectorAll('.tt-q'), function (d) {
            var k = +d.getAttribute('data-q'), o = antes[k] || {}, c = d.querySelector('[data-qc]:checked'), tv = d.querySelector('[data-qt]').value;
            return { enunciado: d.querySelector('[data-qe]').value.trim(), imagem: o.imagem || null, alternativas: [].map.call(d.querySelectorAll('[data-qa]'), function (x) { return x.value.trim(); }),
              correta: c ? +c.getAttribute('data-qc') : 0, pontos: parseFloat(d.querySelector('[data-qp]').value.replace(',', '.')) || 0, so_letras: d.querySelector('[data-qso]').checked,
              texto: tv === '' ? null : +tv, secao: d.querySelector('[data-qs]').value.trim() || null };
          });
        }
        if (p.tipo === 'marcar') {
          var bl = [];
          el.querySelectorAll('tbody tr[data-b]').forEach(function (tr) {
            var k = tr.getAttribute('data-b'), lado = tr.getAttribute('data-lado'); bl[k] = bl[k] || { original: {}, copia: {} };
            var on = tr.querySelector('[data-orig]'); if (on) { var nv = parseInt(on.value, 10); if (nv > 0) bl[k].orig = nv; else delete bl[k].orig; }
            tr.querySelectorAll('[data-cb]').forEach(function (x) { bl[k][lado][x.getAttribute('data-cb')] = x.value.trim(); });
          });
          p.blocos = bl.filter(Boolean);
        }
      });
    }
    function redesenhar() { ler(); mudou = true; var y = window.scrollY; desenhar(); window.scrollTo(0, y); }
    function ligar() {
      area.querySelectorAll('input, textarea').forEach(function (x) { x.addEventListener('change', function () { mudou = true; }); });
      area.querySelectorAll('input[name="tt-modo"]').forEach(function (x) { x.addEventListener('change', function () { ler(); est.faixas = faixasPadrao(est.modo_nota); redesenhar(); }); });
      area.querySelectorAll('[data-add]').forEach(function (b) { b.addEventListener('click', function () {
        ler(); var t2 = b.getAttribute('data-add');
        est.partes.push(t2 === 'contar' ? { tipo: 'contar', colunas: ['Artigo', 'Tamanho', 'Nº', 'Entrega'], opcoes: ['–', '1', '2', '3', '4'], linhas: [{ original: [], copia: [], gabarito: '-', pontos: 1 }] }
          : t2 === 'escolha' ? { tipo: 'escolha', textos: [], questoes: [{ enunciado: '', alternativas: ['', '', '', ''], correta: 0, pontos: 1 }] }
          : { tipo: 'marcar', blocos: [{ original: {}, copia: {} }] });
        mudou = true; desenhar();
      }); });
      area.querySelectorAll('[data-rem]').forEach(function (b) { b.addEventListener('click', async function () { if (!(await ui.confirmar('Remover esta parte?', 'A parte e o gabarito dela saem do rascunho.', 'Remover', 'Cancelar'))) return; ler(); est.partes.splice(+b.getAttribute('data-rem'), 1); mudou = true; desenhar(); }); });
      area.querySelectorAll('[data-sobe]').forEach(function (b) { b.addEventListener('click', function () { ler(); var i = +b.getAttribute('data-sobe'); var x = est.partes.splice(i, 1)[0]; est.partes.splice(i - 1, 0, x); redesenhar(); }); });
      area.querySelectorAll('[data-linha]').forEach(function (b) { b.addEventListener('click', function () { ler(); est.partes[+b.getAttribute('data-linha')].linhas.push({ original: [], copia: [], gabarito: '-', pontos: 1 }); redesenhar(); }); });
      area.querySelectorAll('[data-bloco]').forEach(function (b) { b.addEventListener('click', function () { ler(); est.partes[+b.getAttribute('data-bloco')].blocos.push({ original: {}, copia: {} }); redesenhar(); }); });
      area.querySelectorAll('[data-rl]').forEach(function (b) { b.addEventListener('click', function () { ler(); var p = est.partes[+b.closest('.tt-parte').getAttribute('data-p')]; p.linhas.splice(+b.getAttribute('data-rl'), 1); redesenhar(); }); });
      area.querySelectorAll('[data-rb]').forEach(function (b) { b.addEventListener('click', function () { ler(); var p = est.partes[+b.closest('.tt-parte').getAttribute('data-p')]; p.blocos.splice(+b.getAttribute('data-rb'), 1); redesenhar(); }); });
      function pe(b) { return est.partes[+b.closest('.tt-parte').getAttribute('data-p')]; }
      function qi(b) { return +b.closest('.tt-q').getAttribute('data-q'); }
      area.querySelectorAll('[data-nq]').forEach(function (b) { b.addEventListener('click', function () { ler(); est.partes[+b.getAttribute('data-nq')].questoes.push({ enunciado: '', alternativas: ['', '', '', ''], correta: 0, pontos: 1 }); redesenhar(); }); });
      area.querySelectorAll('[data-rq]').forEach(function (b) { b.addEventListener('click', function () { ler(); pe(b).questoes.splice(+b.getAttribute('data-rq'), 1); redesenhar(); }); });
      area.querySelectorAll('[data-ntx]').forEach(function (b) { b.addEventListener('click', function () { ler(); var p = est.partes[+b.getAttribute('data-ntx')]; p.textos = p.textos || []; p.textos.push({ id: p.textos.length, titulo: 'TEXTO ' + ['I', 'II', 'III', 'IV', 'V', 'VI'][p.textos.length] || '', texto: '', autor: '' }); redesenhar(); }); });
      area.querySelectorAll('[data-rtx]').forEach(function (b) { b.addEventListener('click', function () { ler(); var p = pe(b), ti = +b.getAttribute('data-rtx'); p.textos.splice(ti, 1); p.textos.forEach(function (t2, n) { t2.id = n; }); p.questoes.forEach(function (q) { if (q.texto === ti) q.texto = null; else if (q.texto > ti) q.texto--; }); redesenhar(); }); });
      area.querySelectorAll('[data-qmais]').forEach(function (b) { b.addEventListener('click', function () { ler(); var q = pe(b).questoes[qi(b)]; if (q.alternativas.length < 8) q.alternativas.push(''); redesenhar(); }); });
      area.querySelectorAll('[data-qmenos]').forEach(function (b) { b.addEventListener('click', function () { ler(); var q = pe(b).questoes[qi(b)]; if (q.alternativas.length > 2) { q.alternativas.pop(); if (q.correta >= q.alternativas.length) q.correta = 0; } redesenhar(); }); });
      area.querySelectorAll('[data-qsem]').forEach(function (b) { b.addEventListener('click', function () { ler(); pe(b).questoes[qi(b)].imagem = null; redesenhar(); }); });
      area.querySelectorAll('[data-qimg]').forEach(function (inpF) { inpF.addEventListener('change', function () {
        var f = inpF.files[0]; if (!f) return; var fr = new FileReader();
        fr.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 640 / im.width, 420 / im.height), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
          ler(); pe(inpF).questoes[qi(inpF)].imagem = cv.toDataURL('image/jpeg', .78); redesenhar(); }; im.src = fr.result; };
        fr.readAsDataURL(f);
      }); });
      area.querySelectorAll('[data-auto]').forEach(function (b) { b.addEventListener('click', function () {
        ler(); var p = est.partes[+b.getAttribute('data-auto')];
        p.linhas.forEach(function (l) { var n = 0; (l.original || []).forEach(function (v, j) { if (String(v).trim().toUpperCase() !== String((l.copia || [])[j] || '').trim().toUpperCase()) n++; }); l.gabarito = n ? String(n) : '-'; });
        redesenhar(); ui.toast('Gabarito calculado. Confira as linhas antes de publicar.', 'ok');
      }); });
      area.querySelector('#tt-exp-mais').addEventListener('click', function () { ler(); est.explicacao.passos.push(['', '']); redesenhar(); });
      area.querySelector('#tt-sal').addEventListener('click', function () { salvar(this); });
      area.querySelector('#tt-pub').addEventListener('click', function () { publicar(this); });
      area.querySelector('#tt-prev').addEventListener('click', function () { ler(); previa(est, t); });
      area.querySelector('#tt-imp').addEventListener('click', function () { importar(function (novo) { ler(); est.partes = est.partes.concat(novo.partes); if (novo.faixas) { est.faixas = novo.faixas; est.modo_nota = novo.modo_nota; } if (novo.tempo_min) est.tempo_min = novo.tempo_min; if (novo.instrucoes && !est.instrucoes) est.instrucoes = novo.instrucoes; if (novo.explicacao && !(est.explicacao && est.explicacao.passos && est.explicacao.passos.length)) est.explicacao = novo.explicacao; mudou = true; desenhar(); }); });
    }
    async function salvar(bt) {
      ler(); bt.disabled = true;
      try { await q(sb.rpc('teste_tablet_salvar', { p_teste: t.id, p_estrutura: est, p_tablet: tablet })); mudou = false; ui.toast('Rascunho salvo.', 'ok'); desenhar(); }
      catch (e) { erro(e); bt.disabled = false; }
    }
    async function publicar(bt) {
      ler();
      if (!est.partes.length) { ui.toast('Inclua pelo menos uma parte antes de publicar.', 'erro'); return; }
      var j = ui.janela({ titulo: 'Publicar nova versão', largura: 520, corpo: '<p>Os tablets baixam esta versão na próxima conexão. Turmas que já começaram este teste continuam na versão antiga.</p><label class="campo"><span>O que mudou (opcional)</span><input class="entrada" id="tt-nota" placeholder="ex.: 2 linhas corrigidas no gabarito"></label>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Publicar', principal: true, aoClicar: async function (f) {
          try {
            await q(sb.rpc('teste_tablet_salvar', { p_teste: t.id, p_estrutura: est, p_tablet: true }));
            var v = await q(sb.rpc('teste_tablet_publicar', { p_teste: t.id, p_nota: f.querySelector('#tt-nota').value }));
            ui.toast('Versão ' + v + ' publicada.', 'ok'); setTimeout(function () { editor(area, testeId); }, 50); return true;
          } catch (e) { erro(e); return false; }
        } }] });
    }
    window.onbeforeunload = function () { return mudou ? 'Há alterações não salvas.' : undefined; };
    desenhar();
  }

  /* =================== Pré-visualização =================== */
  function previa(est, t) {
    var j = ui.janela({ titulo: '👁 ' + t.nome + ' · como o jovem vê', largura: 1180, confirmarDescarte: false, corpo: '<div class="tm-topo"><b>' + esc(t.nome) + '</b><span class="tm-tempo">⏱ ' + String(est.tempo_min || 10).padStart(2, '0') + ':00</span></div><div class="tm-caixa"></div><p class="dica" id="tm-res" style="text-align:center"></p>',
      botoes: [{ texto: 'Fechar', acao: 'fechar' }, { texto: 'Finalizar (ver a correção)', principal: true, aoClicar: function (f) { var r = mot.corrigir(); f.querySelector('#tm-res').innerHTML = 'Prévia da correção: <b>' + String(r.pontos).replace('.', ',') + ' de ' + String(r.total).replace('.', ',') + ' pontos</b> · nota <b>' + r.nota + '</b>. No tablet, o jovem não vê nota nem gabarito.'; return false; } }] });
    var mot = M.desenhar(j.elemento.querySelector('.tm-caixa'), est);
  }

  /* =================== Importar da planilha =================== */
  function importar(aoTerminar) {
    var j = ui.janela({ titulo: 'Importar da planilha', largura: 640, confirmarDescarte: false,
      corpo: '<p>Escolha a planilha do teste (.xlsx). O sistema lê os dados, o gabarito e as faixas da nota e mostra o que encontrou antes de incluir.</p><input type="file" id="ip-arq" accept=".xlsx,.xls"><div id="ip-res" style="margin-top:12px"></div>',
      botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Incluir no teste', principal: true, aoClicar: function () { if (!achado) { ui.toast('Escolha uma planilha primeiro.', 'erro'); return false; } aoTerminar(achado); return true; } }] });
    var achado = null, res = j.elemento.querySelector('#ip-res');
    j.elemento.querySelector('#ip-arq').addEventListener('change', async function () {
      var f = this.files[0]; if (!f) return; res.innerHTML = '<div class="girando"></div>';
      try {
        var wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' });
        achado = lerCartoes(wb) || (await lerModeloT31(wb)) || lerConferencia(wb);
        if (!achado) { res.innerHTML = '<div class="aviso aviso-erro">Não reconheci esta planilha. Por enquanto o sistema lê a Conferência de Mercadoria, os Cartões de Crédito, o Raciocínio Lógico, os Conhecimentos Gerais e o Português; os outros modelos entram nas próximas partes da T3.</div>'; return; }
        res.innerHTML = '<table class="tabela mini"><tbody>' + achado.resumo.map(function (r) { return '<tr><td>' + (r[2] ? '⚠️' : '✅') + '</td><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>';
      } catch (e) { console.error(e); res.innerHTML = '<div class="aviso aviso-erro">Não foi possível ler a planilha.</div>'; }
    });
  }
  function cel(ws, ref) { var c = ws[ref]; return c ? (c.w != null ? c.w : c.v) : ''; }
  function txt(v) { return String(v == null ? '' : v).trim(); }
  function lerCartoes(wb) {
    var ws = wb.Sheets['Dados Cartões']; if (!ws) return null;
    var orig = {}, blocos = [];
    for (var r = 6; r <= 40; r++) { var n = parseInt(cel(ws, 'A' + r), 10); if (!n || !txt(cel(ws, 'B' + r))) continue; orig[n] = ['B', 'C', 'D', 'E', 'F', 'G', 'H'].map(function (c) { return txt(cel(ws, c + r)); }); if (r > 21) break; }
    for (var r2 = 22; r2 <= 80; r2++) {
      var o = parseInt(cel(ws, 'B' + r2), 10), cp = ['C', 'D', 'E', 'F', 'G', 'H', 'I'].map(function (c) { return txt(cel(ws, c + r2)); });
      if (!o || !orig[o] || !cp[0]) continue;
      function objeto(a) { return { banco: a[0], bandeira: a[1], numero: a[2], nome: a[3], validade: a[4], agencia: a[5], cvv: a[6] }; }
      blocos.push({ orig: o, original: objeto(orig[o]), copia: objeto(cp) });
    }
    if (!blocos.length) return null;
    var p = { tipo: 'marcar', titulo: '', blocos: blocos }, dif = M.totalParte(p);
    return { partes: [p], modo_nota: 'percentual', faixas: faixasPadrao('percentual'), tempo_min: 10,
      instrucoes: 'Para cada cópia (2ª coluna), encontre o cartão original na 1ª coluna e marque X nos campos que estão diferentes. Se estiver igual, não marque.',
      resumo: [['Tipo', 'Marcar o que mudou (blocos de cartões)'], ['Dados', blocos.length + ' blocos (original e cópia)'], ['Gabarito', dif + ' diferenças, calculadas comparando original e cópia'], ['Faixas da nota', '% do total: 0 → 1, 20 → 2, 40 → 3, 60 → 4, 80 → 5'], ['Tempo', 'não está na planilha · usei 10 min; ajuste no editor', true]] };
  }
  // Raciocínio Lógico, Conhecimentos Gerais e Português: reconhece a planilha e usa o modelo pronto (questões, gabarito, faixas e figuras recortadas)
  async function lerModeloT31(wb) {
    var nomes = wb.SheetNames.join('|'), cod = /Racioc[ií]nio/i.test(nomes) ? 'RL' : /PORT/i.test(nomes) ? 'LP' : null;
    if (!cod && wb.Sheets['Teste'] && /CONHECIMENTOS/i.test(String(cel(wb.Sheets['Teste'], 'A1')))) cod = 'CG';
    if (!cod) return null;
    var r = await fetch('assets/modelos/t31.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('modelo');
    var m = (await r.json())[cod], qs = m.partes[0].questoes, tot = M.total(m);
    var NOME = { RL: 'Raciocínio Lógico', CG: 'Conhecimentos Gerais', LP: 'Língua Portuguesa' }[cod];
    return { partes: m.partes, modo_nota: m.modo_nota, faixas: m.faixas, tempo_min: m.tempo_min, instrucoes: m.instrucoes, explicacao: m.explicacao,
      resumo: [['Teste', NOME], ['Tipo', 'Múltipla escolha' + (cod === 'RL' ? ' com figura (figuras recortadas de cada exercício)' : cod === 'LP' ? ' com textos de apoio' : '')], ['Perguntas', qs.length + ' · total ' + tot + ' pontos'],
        ['Gabarito', 'lido da aba de correção da planilha'], ['Faixas da nota', m.faixas.map(function (f) { return f.nota + ': ' + f.min; }).join(' · ')], ['Tempo', m.tempo_min + ' minutos'], ['Explicação', 'rascunho dos passos, exemplo e dica incluído (revise)']] };
  }
  function lerConferencia(wb) {
    var ws = wb.Sheets[wb.SheetNames[0]], cor = wb.Sheets[wb.SheetNames[1]]; if (!ws || !cor) return null;
    var linhas = [];
    for (var r = 14; r <= 120; r++) {
      var o = ['A', 'B', 'C', 'D'].map(function (c) { return txt(cel(ws, c + r)); }), cp = ['F', 'G', 'H', 'I'].map(function (c) { return txt(cel(ws, c + r)); });
      if (!o[0] && !cp[0]) { if (linhas.length) break; continue; }
      var g = txt(cel(cor, 'B' + (r - 12)));
      linhas.push({ original: o, copia: cp, gabarito: g === '' ? '-' : g, pontos: 1 });
    }
    if (linhas.length < 3) return null;
    var n = linhas.length, fx = n === 43 ? faixasPadrao('pontos') : [[5, .84], [4, .63], [3, .42], [2, .21], [1, .01], [0, 0]].map(function (x) { return { nota: x[0], min: Math.ceil(n * x[1]) }; });
    return { partes: [{ tipo: 'contar', titulo: '', colunas: ['Artigo', 'Tamanho', 'Nº', 'Entrega'], opcoes: ['–', '1', '2', '3', '4'], linhas: linhas }], modo_nota: 'pontos', faixas: fx, tempo_min: 10,
      instrucoes: 'Compare a Cópia com o Original e informe, em cada linha, quantos erros a cópia tem. Se não houver erro, marque "–".',
      resumo: [['Tipo', 'Contar diferenças (original × cópia)'], ['Dados', n + ' linhas'], ['Gabarito', 'lido da aba de correção da planilha'], ['Faixas da nota', fx.map(function (f) { return f.nota + ': ' + f.min; }).join(' · ') + ' pontos'], ['Tempo', 'não está na planilha · usei 10 min; ajuste no editor', true]] };
  }

  /* =================== Configurações › Tablets =================== */
  async function tablets(area) {
    if (window.CF.avisoPedidos) window.CF.avisoPedidos();
    var ABAS = [['lista', 'Tablets'], ['ped', 'Pedidos'], ['res', 'Resultados recebidos'], ['hist', 'Histórico'], ['conf', 'Instalar e configurar']];
    var abaTb = 'lista'; try { abaTb = localStorage.getItem('cf_tb_aba') || 'lista'; } catch (e) {}
    area.innerHTML = '<header class="cabecalho"><div><h1>Tablets</h1><p>Projeto Gol Testes · tablets liberados, pedidos, resultados e configurações do app</p></div>' +
      '<div class="botoes-topo"><button type="button" class="btn" id="tb-etq">🖨 Imprimir etiquetas</button><button type="button" class="btn" id="tb-novo">' + ui.icone('mais', 17) + 'Cadastrar com código</button><button type="button" class="btn btn-pri" id="tb-qr">📷 Ler QR do tablet</button></div></header>' +
      '<div class="tb-kp" id="tb-kp"></div>' +
      '<nav class="tb-abas" role="tablist">' + ABAS.map(function (a) { return '<button type="button" role="tab" data-tbaba="' + a[0] + '">' + a[1] + '<em id="tb-n-' + a[0] + '" hidden></em></button>'; }).join('') + '</nav>' +
      '<div class="tb-pn" data-pn="lista"><div id="tb-lista"><div class="girando" style="margin:30px auto"></div></div><p class="dica">Se um tablet sumir, use "⋯ › Desativar": a chave dele para de funcionar na hora. Os resultados que ele já enviou continuam valendo.</p></div>' +
      '<div class="tb-pn" data-pn="ped"><section class="card pt-tab" id="tb-ped"></section></div>' +
      '<div class="tb-pn" data-pn="res"><section class="card pt-tab" id="tb-res"><h2>Resultados recebidos dos tablets</h2><div class="girando" style="margin:20px auto"></div></section></div>' +
      '<div class="tb-pn" data-pn="hist"><section class="card pt-tab" id="tb-hist"></section></div>' +
      '<div class="tb-pn" data-pn="conf"><div class="tb-duas"><section class="card bloco" id="tb-inst"></section><div style="display:flex;flex-direction:column;gap:16px"><section class="card bloco" id="tb-pin"></section><section class="card bloco" id="tb-modo"></section></div></div></div>';
    function irAba(a) {
      abaTb = a; try { localStorage.setItem('cf_tb_aba', a); } catch (e) {}
      area.querySelectorAll('[data-tbaba]').forEach(function (b) { var on = b.getAttribute('data-tbaba') === a; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      area.querySelectorAll('.tb-pn').forEach(function (p) { p.hidden = p.getAttribute('data-pn') !== a; });
    }
    area.querySelectorAll('[data-tbaba]').forEach(function (b) { b.addEventListener('click', function () { irAba(b.getAttribute('data-tbaba')); }); });
    irAba(abaTb);
    function contaAba(a, n) { var e = area.querySelector('#tb-n-' + a); if (!e) return; e.hidden = n == null; e.textContent = n == null ? '' : n; }
    var lista = [];
    // Instalação no tablet: link e QR Code do app (mesma publicação, pasta testes/)
    var urlApp = location.origin + location.pathname.replace(/[^/]*$/, '') + 'testes/';
    function qrSVG(t) { if (typeof window.qrcode !== 'function') return ''; var qq = window.qrcode(0, 'M'); qq.addData(t); qq.make(); return qq.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); }
    area.querySelector('#tb-inst').innerHTML = '<h2 style="margin:0 0 8px">Instalar o app nos tablets</h2><div class="tb-qr"><div class="tb-qrimg">' + qrSVG(urlApp) + '</div><ol>' +
      '<li>No tablet, abra o <b>Chrome</b> e leia este QR Code com a câmera, ou digite o endereço: <code>' + esc(urlApp) + '</code></li>' +
      '<li>Toque em <b>⋮ › Instalar app</b>. O ícone <b>Gol Testes</b> aparece na tela inicial.</li>' +
      '<li>Abra o app e digite o <b>código de 6 números</b> do tablet (botão "Novo código" no cartão dele).</li>' +
      '<li>Ligue a <b>Fixação de tela</b> do Android (Configurações › Segurança › Fixar app) para o jovem não sair do app.</li>' +
      '<li>Deixe o <b>Chrome atualizado</b> e a <b>economia de bateria desligada</b> para o app.</li></ol></div>' +
      '<p class="dica" style="margin:8px 0 0">Para abrir o modo avaliador no tablet: segure o logo do topo por 3 segundos e digite o PIN.</p>';
    async function pinBox() {
      var cfg = {}; try { cfg = (await q(sb.from('configuracoes').select('tablet_pin_hash').limit(1)))[0] || {}; } catch (e) {}
      var b = area.querySelector('#tb-pin');
      b.innerHTML = '<h2 style="margin:0 0 8px">PIN do avaliador</h2><p class="dica" style="margin:0 0 10px">Um PIN de 4 números para o modo avaliador de todos os tablets. ' + (cfg.tablet_pin_hash ? '<b>Já está definido.</b> Para trocar, digite um novo.' : '<b>Ainda não foi definido.</b>') + ' O tablet guarda só uma versão protegida do PIN.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="entrada" id="tb-pin-v" type="password" inputmode="numeric" maxlength="4" placeholder="4 números" style="max-width:160px"><button type="button" class="btn btn-pri" id="tb-pin-s">Salvar PIN</button></div>' +
        '<p class="dica" style="margin:8px 0 0">Depois de trocar, os tablets recebem o PIN novo na próxima atualização (com internet).</p>';
      b.querySelector('#tb-pin-s').addEventListener('click', async function () {
        var v = b.querySelector('#tb-pin-v').value.trim();
        if (!/^\d{4}$/.test(v)) { ui.toast('O PIN precisa ter 4 números.', 'erro'); return; }
        try { var r = await sb.rpc('tablet_pin_definir', { p_pin: v }); if (r.error) throw r.error; ui.toast('PIN salvo.', 'ok'); pinBox(); } catch (e) { ui.toast(api.traduzErro(e), 'erro'); }
      });
    }
    pinBox();
    /* ---------- Pedidos de liberação (QR Code do tablet) ---------- */
    async function pedidos() {
      var b = area.querySelector('#tb-ped'), ps = [];
      try { ps = await q(sb.from('tablet_pedidos').select('id,codigo,aparelho,sistema,navegador,situacao,criado_em,decidido_em,tablet_id').order('criado_em', { ascending: false }).limit(60)); }
      catch (e) { b.innerHTML = '<h2>Pedidos de liberação</h2><p class="dica">Falta rodar o SQL da versão 4.19.0.</p>'; return; }
      var pend = ps.filter(function (x) { return x.situacao === 'pendente'; }), dec = ps.filter(function (x) { return x.situacao !== 'pendente'; }).slice(0, 15);
      contaAba('ped', pend.length || null); var kp0 = area.querySelector('#tb-kp'); kp0.setAttribute('data-ped', pend.length); var kb = kp0.querySelector('[data-kped] b'); if (kb) kb.textContent = pend.length;
      var COR = { pendente: '#e0a100', liberado: '#3FA66B', rejeitado: '#D9534F' };
      function lin(x) { return '<tr style="--c:' + COR[x.situacao] + '"><td><b>' + esc(x.codigo.slice(0, 3) + '-' + x.codigo.slice(3)) + '</b></td><td>' + esc([x.aparelho, x.sistema, x.navegador].filter(Boolean).join(' · ')) + '</td><td>' + new Date(x.criado_em).toLocaleString('pt-BR') + '</td>' +
        '<td><span class="pill" style="background:color-mix(in srgb,' + COR[x.situacao] + ' 15%,transparent);color:' + COR[x.situacao] + '">' + x.situacao + '</span>' + (x.decidido_em ? '<br><small class="dica">' + new Date(x.decidido_em).toLocaleString('pt-BR') + '</small>' : '') + '</td>' +
        '<td>' + (x.situacao === 'pendente' ? '<button type="button" class="btn btn-p" data-ped="' + x.codigo + '">Ver pedido</button>' : '') + '</td></tr>'; }
      b.innerHTML = '<h2>Pedidos de liberação ' + (pend.length ? '<span class="pill" style="background:#fff4dc;color:#8a6200">' + pend.length + ' pendente' + (pend.length > 1 ? 's' : '') + '</span>' : '') + '</h2>' +
        '<p class="dica" style="margin:0 0 8px">Tablets novos mostram um QR Code de pedido. Leia com "📷 Ler QR do tablet" ou abra o pedido aqui. O tablet só entra depois que você liberar.</p>' +
        (ps.length ? '<div class="tabela-rolar"><table class="tabela"><thead><tr><th>Pedido</th><th>Aparelho</th><th>Pedido em</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' + pend.concat(dec).map(lin).join('') + '</tbody></table></div>' : '<p class="dica">Nenhum pedido ainda.</p>');
      b.querySelectorAll('[data-ped]').forEach(function (x) { x.addEventListener('click', function () { abrirPedido(x.getAttribute('data-ped')); }); });
    }
    async function abrirPedido(codigo) {
      codigo = String(codigo || '').toUpperCase().replace(/^GOLT-PEDIDO:/, '').replace(/[^A-Z0-9]/g, '');
      var p = null; try { p = (await q(sb.from('tablet_pedidos').select('id,codigo,aparelho,sistema,navegador,situacao,criado_em').eq('codigo', codigo)))[0]; } catch (e) {}
      if (!p) { ui.toast('Pedido não encontrado. Confira o QR Code do tablet.', 'erro'); return; }
      if (p.situacao !== 'pendente') { ui.toast('Este pedido já foi ' + p.situacao + '.', 'erro'); return; }
      var prox = 'TABLET ' + ('0' + (lista.length + 1)).slice(-2);
      ui.janela({ titulo: '📱 Pedido de liberação de tablet', largura: 480,
        corpo: '<div class="et-res"><div><span>Pedido</span><p><b>' + esc(p.codigo.slice(0, 3) + '-' + p.codigo.slice(3)) + '</b></p></div><div><span>Aparelho</span><p>' + esc(p.aparelho || '—') + (p.sistema ? ' · ' + esc(p.sistema) : '') + '</p></div><div><span>Navegador</span><p>' + esc(p.navegador || '—') + '</p></div><div><span>Pedido feito</span><p>' + new Date(p.criado_em).toLocaleString('pt-BR') + '</p></div></div>' +
          '<label class="campo" style="margin-top:12px"><span>Nome do tablet</span><input class="entrada" id="pd-nome" value="' + esc(prox) + '"></label><label class="campo"><span>Etiqueta</span><input class="entrada" id="pd-et" value="' + esc(prox.replace(/\D/g, '')) + '"></label>' + camposId(null) +
          '<p class="dica">Fica registrado: quem decidiu, quando, aparelho e navegador.</p>',
        botoes: [{ texto: 'Rejeitar', aoClicar: async function () { try { var r = await sb.rpc('tablet_pedido_decidir', { p_codigo: p.codigo, p_liberar: false }); if (r.error) throw r.error; ui.toast('Pedido rejeitado.', 'ok'); carregar(); pedidos(); historico(); if (window.CF.avisoPedidos) window.CF.avisoPedidos(); return true; } catch (e) { ui.toast(api.traduzErro(e), 'erro'); return false; } } },
          { texto: 'Liberar tablet', principal: true, aoClicar: async function (f) {
            try { var r = await sb.rpc('tablet_pedido_decidir', { p_codigo: p.codigo, p_liberar: true, p_nome: f.querySelector('#pd-nome').value, p_etiqueta: f.querySelector('#pd-et').value, p_imei: lerId(f).imei, p_serie: lerId(f).serie, p_email: lerId(f).email }); if (r.error) throw r.error;
              ui.toast('Tablet liberado. Ele entra sozinho em alguns segundos.', 'ok'); carregar(); pedidos(); historico(); if (window.CF.avisoPedidos) window.CF.avisoPedidos(); return true; } catch (e) { ui.toast(api.traduzErro(e), 'erro'); return false; } } }] });
    }
    function lerQR() {
      var ativo = true, stream = null;
      var j = ui.janela({ titulo: '📷 Ler QR do tablet', largura: 520, corpo: '<p class="dica" style="margin:0 0 8px">Aponte a câmera para o QR Code que aparece na tela "Ligar este tablet".</p><video id="qv" playsinline muted style="width:100%;border-radius:14px;background:#000"></video><canvas id="qc" style="display:none"></canvas>' +
        '<label class="campo" style="margin-top:10px"><span>Ou digite o pedido</span><input class="entrada" id="qd" placeholder="ex.: 4F7-K2Q" style="text-transform:uppercase"></label>',
        botoes: [{ texto: 'Fechar', acao: 'fechar' }, { texto: 'Abrir pedido', principal: true, aoClicar: function (f) { var v = f.querySelector('#qd').value; if (!v.trim()) { ui.toast('Digite o pedido ou leia o QR.', 'erro'); return false; } parar(); setTimeout(function () { abrirPedido(v); }, 30); return true; } }],
        aoFechar: function () { parar(); } });
      function parar() { ativo = false; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); }
      var el = j.elemento, video = el.querySelector('#qv'), canvas = el.querySelector('#qc'), c2 = canvas.getContext('2d'), det = ('BarcodeDetector' in window) ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
      function achou(txt) { if (!/GOLT-PEDIDO:/i.test(txt)) return; parar(); j.fechar(true); abrirPedido(txt); }
      async function quadro() {
        if (!ativo || !document.body.contains(video)) { parar(); return; }
        try {
          if (video.readyState >= 2) {
            if (det) { var cs = await det.detect(video); if (cs[0]) { achou(cs[0].rawValue); return; } }
            else if (window.jsQR) { var w = video.videoWidth, h = video.videoHeight, k = Math.min(1, 640 / w); canvas.width = Math.round(w * k); canvas.height = Math.round(h * k); c2.drawImage(video, 0, 0, canvas.width, canvas.height); var img = c2.getImageData(0, 0, canvas.width, canvas.height), r = window.jsQR(img.data, img.width, img.height); if (r && r.data) { achou(r.data); return; } }
          }
        } catch (e) {}
        setTimeout(quadro, 200);
      }
      (async function () { try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); video.srcObject = stream; await video.play(); quadro(); } catch (e) { el.querySelector('.dica').textContent = 'Não foi possível abrir a câmera. Digite o pedido que aparece no tablet.'; } })();
    }
    /* ---------- Modo de testes do app ---------- */
    async function modoBox() {
      var b = area.querySelector('#tb-modo'), lig = false;
      try { lig = (await q(sb.from('configuracoes').select('modo_testes_app').limit(1)))[0].modo_testes_app; } catch (e) {}
      b.innerHTML = '<h2 style="margin:0 0 8px">Modo de testes do app</h2><p class="dica" style="margin:0 0 10px">Com ele ligado, qualquer computador ou celular abre <code>' + esc(urlApp) + '?teste</code> e vê a tela do crachá e os testes com <b>dados fictícios</b> (TEST-01 e TEST-02). Nada é enviado e nenhum dado real aparece.</p>' +
        '<label style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="checkbox" id="tb-modo-v"' + (lig ? ' checked' : '') + '> Modo de testes ' + (lig ? 'ligado' : 'desligado') + '</label>';
      b.querySelector('#tb-modo-v').addEventListener('change', async function (e) { try { var r = await sb.rpc('tablet_modo_testes', { p_ligado: e.target.checked }); if (r.error) throw r.error; ui.toast(e.target.checked ? 'Modo de testes ligado.' : 'Modo de testes desligado.', 'ok'); modoBox(); historico(); } catch (er) { ui.toast(api.traduzErro(er), 'erro'); modoBox(); } });
    }
    /* ---------- Histórico ---------- */
    var filtroHist = null;
    async function historico() {
      var b = area.querySelector('#tb-hist'), hs = [], pessoas = [];
      try { hs = await q(sb.from('tablet_historico').select('*').order('em', { ascending: false }).limit(40)); } catch (e) { b.innerHTML = ''; return; }
      try { pessoas = await q(sb.from('perfis').select('id,nome')); } catch (e) {}
      function pn(id) { var x = pessoas.filter(function (p) { return p.id === id; })[0]; return x ? x.nome : (id ? '—' : 'o próprio tablet'); }
      function tn(id) { var t = lista.filter(function (x) { return x.id === id; })[0]; return t ? t.nome : ''; }
      if (filtroHist) hs = hs.filter(function (h) { return h.tablet_id === filtroHist; });
      b.innerHTML = '<h2>Histórico dos tablets' + (filtroHist ? ' · ' + esc(tn(filtroHist)) + ' <button type="button" class="btn btn-p" id="tb-hist-todos">Ver todos</button>' : '') + '</h2>' + (hs.length ? '<div class="tabela-rolar"><table class="tabela"><thead><tr><th>Quando</th><th>O quê</th><th>Tablet</th><th>Quem</th></tr></thead><tbody>' +
        hs.map(function (h) { return '<tr><td>' + new Date(h.em).toLocaleString('pt-BR') + '</td><td><b>' + esc(h.acao) + '</b>' + (h.detalhe ? '<br><small class="dica">' + esc(h.detalhe) + '</small>' : '') + '</td><td>' + esc(tn(h.tablet_id)) + '</td><td>' + esc(pn(h.por)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="dica">Nada registrado ainda.</p>');
      var vt = b.querySelector('#tb-hist-todos'); if (vt) vt.addEventListener('click', function () { filtroHist = null; historico(); });
    }
    area.querySelector('#tb-qr').addEventListener('click', lerQR);
    area.querySelector('#tb-etq').addEventListener('click', etiquetas);
    modoBox(); pedidos();
    var pedTimer = setInterval(function () { if (!document.body.contains(area.querySelector('#tb-ped'))) { clearInterval(pedTimer); return; } pedidos(); }, 20000);
    // Resultados recebidos (últimos 200) com "Ver respostas"
    async function resultados() {
      var box = area.querySelector('#tb-res'), rs = [];
      try {
        rs = await q(sb.from('tablet_resultados').select('id,participacao_id,teste_id,tablet_id,pontos,total,nota,inicio,fim,tempo_seg,por_tempo,situacao,motivo,recebido_em,respostas,versao,saidas').order('recebido_em', { ascending: false }).limit(200));
      } catch (e) { box.innerHTML = '<h2>Resultados recebidos dos tablets</h2><p class="dica">Ainda não há resultados (ou falta rodar o SQL da T2).</p>'; return; }
      if (!rs.length) { box.innerHTML = '<h2>Resultados recebidos dos tablets</h2><p class="dica">Nenhum resultado recebido ainda. Eles aparecem aqui assim que os tablets enviam.</p>'; return; }
      var pids = rs.map(function (r) { return r.participacao_id; }).filter(Boolean), tids = rs.map(function (r) { return r.teste_id; }).filter(Boolean);
      var parts = [], tests = [], tvs = [];
      try { parts = await q(sb.from('participacoes').select('id,codigo,jovem_id,jovens(nome)').in('id', pids)); } catch (e) {}
      try { tests = await q(sb.from('testes').select('id,nome').in('id', tids)); } catch (e) {}
      try { tvs = await q(sb.from('teste_tablet_versoes').select('teste_id,versao,estrutura').in('teste_id', tids)); } catch (e) {}
      function nm(r) { var p = parts.filter(function (x) { return x.id === r.participacao_id; })[0]; return p ? ((p.jovens && p.jovens.nome) || '') + ' · ' + (p.codigo || '') : '—'; }
      function tn(id) { var t = tests.filter(function (x) { return x.id === id; })[0]; return t ? t.nome : '—'; }
      function tbn(id) { var t = lista.filter(function (x) { return x.id === id; })[0]; return t ? t.nome : '—'; }
      var COR = { gravado: '#3FA66B', repetido: '#e0a100', recusado: '#D9534F' }, NOME = { gravado: 'Nota lançada', repetido: 'Repetido', recusado: 'Não lançado' };
      box.innerHTML = '<h2>Resultados recebidos dos tablets</h2><p class="dica" style="margin:0 0 8px">A nota de cada teste entra sozinha no teste do jovem (Avaliar). "Repetido": o jovem já tinha feito o teste, vale o primeiro.</p><div class="tabela-rolar"><table class="tabela"><thead><tr><th>Jovem</th><th>Teste</th><th>Nota</th><th>Pontos</th><th>Tempo</th><th>Situação</th><th>Tablet</th><th><span class="sr">Ações</span></th></tr></thead><tbody>' +
        rs.map(function (r, i) {
          return '<tr style="--c:' + (COR[r.situacao] || '#8a8486') + '"><td>' + esc(nm(r)) + '</td><td>' + esc(tn(r.teste_id)) + '</td><td class="num"><b>' + (r.nota == null ? '—' : r.nota) + '</b></td><td class="num">' + (r.pontos == null ? '—' : r.pontos + ' de ' + r.total) + '</td>' +
            '<td>' + (r.tempo_seg != null ? Math.floor(r.tempo_seg / 60) + ' min ' + (r.tempo_seg % 60) + ' s' : '—') + (r.por_tempo ? ' · <small>terminou por tempo</small>' : '') + '</td>' +
            '<td><span class="pill" style="background:color-mix(in srgb,' + (COR[r.situacao] || '#8a8486') + ' 15%,transparent);color:' + (COR[r.situacao] || '#8a8486') + '">' + (NOME[r.situacao] || r.situacao) + '</span>' + (r.motivo ? '<br><small class="dica">' + esc(r.motivo) + '</small>' : '') + '</td>' +
            '<td>' + esc(tbn(r.tablet_id)) + '<br><small class="dica">' + (r.fim ? new Date(r.fim).toLocaleString('pt-BR') : '') + '</small></td><td><button type="button" class="btn btn-p" data-vr="' + i + '">Ver respostas</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-vr]').forEach(function (b) { b.addEventListener('click', function () {
        var r = rs[+b.getAttribute('data-vr')], v = tvs.filter(function (x) { return x.teste_id === r.teste_id && x.versao === r.versao; })[0], est = (v && v.estrutura) || { partes: [] }, M = window.CF.testesMotor;
        var h = '<p style="margin:0 0 10px"><b>' + esc(nm(r)) + '</b> · ' + esc(tn(r.teste_id)) + ' · versão ' + (r.versao || '?') + '<br>Nota <b>' + r.nota + '</b> · ' + r.pontos + ' de ' + r.total + ' pontos · início ' + (r.inicio ? new Date(r.inicio).toLocaleTimeString('pt-BR') : '—') + ' · fim ' + (r.fim ? new Date(r.fim).toLocaleTimeString('pt-BR') : '—') + '</p>' +
          ((r.saidas || []).length ? '<div class="aviso">🚩 Saiu do app ' + r.saidas.length + ' vez(es) durante o teste.</div>' : '');
        (est.partes || []).forEach(function (p, pi) {
          var rr = (r.respostas || {})[pi] || {};
          if (p.tipo === 'contar') h += '<div class="tabela-rolar"><table class="tabela"><thead><tr><th>Linha</th><th>Resposta</th><th>Gabarito</th><th></th></tr></thead><tbody>' + (p.linhas || []).map(function (l, k) { var x = rr[k], ok = x != null && String(x).trim().toUpperCase() === String(l.gabarito).trim().toUpperCase(); return '<tr><td>' + (k + 1) + ' · ' + esc((l.original || [])[0] || '') + '</td><td>' + (x == null ? '<span class="dica">em branco</span>' : esc(x)) + '</td><td>' + esc(l.gabarito) + '</td><td>' + (ok ? '✓' : '✗') + '</td></tr>'; }).join('') + '</tbody></table></div>';
          else if (p.tipo === 'marcar') h += '<div class="tabela-rolar"><table class="tabela"><thead><tr><th>Bloco</th><th>Marcou</th><th>Diferenças certas</th></tr></thead><tbody>' + (p.blocos || []).map(function (bl, k) { var m = Object.keys(rr[k] || {}).filter(function (c) { return rr[k][c]; }); return '<tr><td>' + (k + 1) + '</td><td>' + (m.join(', ') || '<span class="dica">nada</span>') + '</td><td>' + (M ? M.diferencas(bl).join(', ') : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
        });
        ui.janela({ titulo: 'Respostas do tablet', largura: 760, corpo: h, botoes: [{ texto: 'Fechar', acao: 'fechar' }] });
      }); });
    }
    async function carregar() { try { lista = await q(sb.from('tablets').select('*').order('nome')); desenhar(); resultados(); historico(); } catch (e) { area.querySelector('#tb-lista').innerHTML = '<div class="aviso aviso-erro">' + esc(api.traduzErro(e)) + '</div>'; } }
    var buscaTb = '';
    function situacao(x) {
      if (!x.ativo) return ['Desativado', 'nao', '#8a8486'];
      if (!x.ligado_em) return ['Aguardando ligar', 'neu', '#e0a100'];
      if (x.pendentes > 0) return ['Envio pendente', 'neu', '#ee7330'];
      if (x.ultima_conexao && (Date.now() - new Date(x.ultima_conexao)) > 7 * 864e5) return ['Desatualizado', 'nao', '#D9534F'];
      return ['Pronto', 'ok', '#3FA66B'];
    }
    var filtroTb = 'todos'; try { filtroTb = localStorage.getItem('cf_tb_filtro') || 'todos'; } catch (e) {}
    function grupo(x) { var s = situacao(x)[0]; return s === 'Pronto' ? 'prontos' : s === 'Desativado' ? 'desativados' : s === 'Desatualizado' ? 'desatualizados' : 'pendentes'; }
    function quando(d) { if (!d) return '—'; var t = new Date(d), h = new Date(); var ontem = new Date(h); ontem.setDate(h.getDate() - 1);
      var hm = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return t.toDateString() === h.toDateString() ? 'hoje ' + hm : t.toDateString() === ontem.toDateString() ? 'ontem ' + hm : t.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hm; }
    function desenhar() {
      var box = area.querySelector('#tb-lista');
      var cont = { todos: lista.length, prontos: 0, pendentes: 0, desatualizados: 0, desativados: 0 }; lista.forEach(function (x) { cont[grupo(x)]++; });
      contaAba('lista', lista.length);
      var kp = area.querySelector('#tb-kp'), nPed = +(kp.getAttribute('data-ped') || 0);
      kp.innerHTML = [['prontos', 'prontos', '#3FA66B'], ['pendentes', 'com envio pendente', '#e0a100'], ['desatualizados', 'desatualizados', '#D9534F'], ['desativados', 'desativados', '#8a8486']].map(function (k) {
        return '<button type="button" class="tb-k" data-kf="' + k[0] + '" style="--c:' + k[2] + '"><b>' + cont[k[0]] + '</b><span>' + k[1] + '</span></button>'; }).join('') +
        '<button type="button" class="tb-k" data-kped="1" style="--c:#ee7330"><b>' + nPed + '</b><span>pedidos aguardando</span></button>';
      kp.querySelectorAll('[data-kf]').forEach(function (b) { b.addEventListener('click', function () { filtroTb = b.getAttribute('data-kf'); try { localStorage.setItem('cf_tb_filtro', filtroTb); } catch (e) {} irAba('lista'); desenhar(); }); });
      kp.querySelector('[data-kped]').addEventListener('click', function () { irAba('ped'); });
      if (!lista.length) { box.innerHTML = '<section class="card bloco"><p class="dica">Nenhum tablet cadastrado ainda. Use "📷 Ler QR do tablet" (o tablet mostra o QR ao abrir o app) ou "Cadastrar com código".</p></section>'; return; }
      var bus = ui.normalizar(buscaTb || '');
      var vis = lista.filter(function (x) { return (filtroTb === 'todos' || grupo(x) === filtroTb) && (!bus || ui.normalizar([x.nome, x.etiqueta, x.imei, x.numero_serie, x.email_conta, x.modelo].join(' ')).indexOf(bus) >= 0); });
      var NF = [['todos', 'Todos'], ['prontos', 'Prontos'], ['pendentes', 'Pendentes'], ['desatualizados', 'Desatualizados'], ['desativados', 'Desativados']];
      box.innerHTML = '<div class="pt-filtros tb-fl"><input class="entrada" type="search" id="tb-busca" placeholder="Buscar por nome, IMEI, série ou e-mail" value="' + esc(buscaTb || '') + '">' +
        NF.map(function (f) { return '<button type="button" class="pt-chip' + (filtroTb === f[0] ? ' on' : '') + '" data-tbf="' + f[0] + '">' + f[1] + ' <span class="pt-n">' + cont[f[0]] + '</span></button>'; }).join('') + '</div>' +
        (vis.length ? '<div class="tb-gr">' + vis.map(function (x) {
          var s = situacao(x), num = String(x.etiqueta || x.nome.replace(/\D/g, '') || '?').slice(0, 3);
          var st2 = s[0] === 'Envio pendente' && x.pendentes ? x.pendentes + ' a enviar' : s[0];
          return '<article class="tb-c" style="--c:' + s[2] + '"><div class="tb-h"><span class="tb-num">' + esc(num) + '</span><div><b>' + esc(x.nome) + '</b><small>' + esc(x.modelo || 'modelo não informado') + '</small></div></div>' +
            '<span class="tb-st" style="background:color-mix(in srgb,' + s[2] + ' 14%,transparent);color:' + s[2] + '">● ' + esc(st2) + '</span>' +
            '<div class="tb-li"><i>ÚLTIMA CONEXÃO</i>' + quando(x.ultima_conexao) + '<br><i>IMEI</i>' + esc(x.imei || '—') + '<br><i>CONTA</i>' + esc(x.email_conta || '—') + (x.liberado_por_email ? '<br><i>LIBERADO POR</i>' + esc(x.liberado_por_email) : '') + '</div>' +
            '<div class="tb-ac"><button type="button" class="btn btn-p" data-ed="' + x.id + '">Editar</button><button type="button" class="btn btn-p" data-cod="' + x.id + '">Novo código</button><button type="button" class="btn btn-p tb-mais" data-mais="' + x.id + '" aria-label="Mais opções de ' + esc(x.nome) + '">⋯</button></div></article>';
        }).join('') + '</div>' : '<p class="dica">Nenhum tablet nesse filtro ou busca.</p>');
      box.querySelectorAll('[data-tbf]').forEach(function (b) { b.addEventListener('click', function () { filtroTb = b.getAttribute('data-tbf'); try { localStorage.setItem('cf_tb_filtro', filtroTb); } catch (e) {} desenhar(); }); });
      box.querySelectorAll('[data-cod]').forEach(function (b) { b.addEventListener('click', async function () { try { mostrarCodigo(await q(sb.rpc('tablet_novo_codigo', { p_tablet: b.getAttribute('data-cod') }))); carregar(); } catch (e) { erro(e); } }); });
      box.querySelectorAll('[data-ed]').forEach(function (b) { b.addEventListener('click', function () { form(lista.filter(function (y) { return y.id === b.getAttribute('data-ed'); })[0]); }); });
      box.querySelectorAll('[data-mais]').forEach(function (b) { b.addEventListener('click', function () { maisOpcoes(lista.filter(function (y) { return y.id === b.getAttribute('data-mais'); })[0]); }); });
      var ib = box.querySelector('#tb-busca'); ib.addEventListener('input', function () { buscaTb = ib.value; var pos = ib.selectionStart; desenhar(); var n = area.querySelector('#tb-busca'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} });
    }
    function maisOpcoes(x) {
      var j = ui.janela({ titulo: x.nome, largura: 420, confirmarDescarte: false,
        corpo: '<div class="tb-menu"><button type="button" class="btn" data-o="etq">🖨 Imprimir a etiqueta deste tablet</button><button type="button" class="btn" data-o="hist">🕘 Ver o histórico deste tablet</button>' +
          '<button type="button" class="btn ' + (x.ativo ? 'btn-perigo' : '') + '" data-o="at">' + (x.ativo ? '⛔ Desativar' : '✓ Reativar') + '</button></div>',
        botoes: [{ texto: 'Fechar', acao: 'fechar' }] });
      var el = j.elemento;
      el.querySelector('[data-o="etq"]').addEventListener('click', function () { j.fechar(true); imprimirEtiquetas([x]); });
      el.querySelector('[data-o="hist"]').addEventListener('click', function () { j.fechar(true); filtroHist = x.id; irAba('hist'); historico(); });
      el.querySelector('[data-o="at"]').addEventListener('click', async function () {
        if (x.ativo && !(await ui.confirmar('Desativar ' + x.nome + '?', 'A chave deste tablet para de funcionar na hora. Para usar de novo, gere um novo código ou libere pelo QR.', 'Desativar', 'Cancelar'))) return;
        j.fechar(true);
        try { await q(sb.rpc('tablet_ativar', { p_tablet: x.id, p_ativo: !x.ativo })); carregar(); } catch (e) { erro(e); }
      });
    }
    function form(x) {
      ui.janela({ titulo: x ? 'Editar tablet' : 'Cadastrar tablet', largura: 520,
        corpo: '<label class="campo"><span>Nome *</span><input class="entrada" id="tb-n" value="' + esc(x ? x.nome : 'TABLET ' + String(lista.length + 1).padStart(2, '0')) + '"></label>' +
          '<label class="campo"><span>Etiqueta</span><input class="entrada" id="tb-e" value="' + esc(x ? x.etiqueta || '' : String(lista.length + 1).padStart(2, '0')) + '"></label>' +
          '<label class="campo"><span>Modelo (opcional)</span><input class="entrada" id="tb-m" value="' + esc(x ? x.modelo || '' : '') + '" placeholder="ex.: Samsung Tab A8"></label>' + camposId(x),
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: x ? 'Salvar' : 'Cadastrar e gerar código', principal: true, aoClicar: async function (f) {
          var n = f.querySelector('#tb-n').value, e = f.querySelector('#tb-e').value, m = f.querySelector('#tb-m').value;
          try {
            var d = lerId(f);
            if (x) { await q(sb.rpc('tablet_salvar', { p_tablet: x.id, p_nome: n, p_etiqueta: e, p_modelo: m })); await q(sb.rpc('tablet_dados_salvar', { p_tablet: x.id, p_imei: d.imei, p_serie: d.serie, p_email: d.email })); }
            else { var rc = await q(sb.rpc('tablet_cadastrar', { p_nome: n, p_etiqueta: e, p_modelo: m })); if (rc && rc.tablet && (d.imei || d.serie || d.email)) { try { await q(sb.rpc('tablet_dados_salvar', { p_tablet: rc.tablet, p_imei: d.imei, p_serie: d.serie, p_email: d.email })); } catch (e2) {} } mostrarCodigo(rc); }
            carregar(); return true;
          } catch (er) { erro(er); return false; }
        } }] });
    }
    function camposId(x) {
      return '<fieldset class="tb-fs"><legend>Identificação do aparelho (opcional)</legend><p class="dica" style="margin:0 0 6px">No tablet: Configurações › Sobre o tablet (IMEI e nº de série). O e-mail é a conta Google/Apple em que o aparelho está logado.</p>' +
        '<label class="campo"><span>IMEI</span><input class="entrada" id="tb-imei" inputmode="numeric" value="' + esc(x ? x.imei || '' : '') + '" placeholder="15 números"></label>' +
        '<label class="campo"><span>Nº de série</span><input class="entrada" id="tb-serie" value="' + esc(x ? x.numero_serie || '' : '') + '" style="text-transform:uppercase"></label>' +
        '<label class="campo"><span>E-mail da conta do aparelho</span><input class="entrada" id="tb-email" type="email" value="' + esc(x ? x.email_conta || '' : '') + '" placeholder="ex.: tablet07@kolpingsp.org"></label></fieldset>';
    }
    function lerId(f) { return { imei: f.querySelector('#tb-imei').value.trim(), serie: f.querySelector('#tb-serie').value.trim(), email: f.querySelector('#tb-email').value.trim() }; }
    /* ---------- Etiquetas (modelo A2 · 75 × 38 mm, folha A4) ---------- */
    function etiquetas() {
      if (!lista.length) { ui.toast('Nenhum tablet cadastrado.', 'erro'); return; }
      var j = ui.janela({ titulo: '🖨 Imprimir etiquetas', largura: 560, confirmarDescarte: false,
        corpo: '<p class="dica" style="margin:0 0 8px">Modelo A2 · 75 × 38 mm · folha A4 (2 colunas × 7 linhas). Use papel adesivo A4 comum. Na janela de impressão, escolha <b>tamanho real (100%)</b>.</p>' +
          '<label style="font-weight:700"><input type="checkbox" id="et-todos" checked> Todos os tablets</label><div class="et-l">' +
          lista.map(function (x) { return '<label><input type="checkbox" class="et-c" value="' + x.id + '" checked> ' + esc(x.nome) + (x.etiqueta ? ' · ' + esc(x.etiqueta) : '') + '</label>'; }).join('') + '</div>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Gerar etiquetas', principal: true, aoClicar: function (f) {
          var ids = [].map.call(f.querySelectorAll('.et-c:checked'), function (c) { return c.value; });
          if (!ids.length) { ui.toast('Escolha pelo menos um tablet.', 'erro'); return false; }
          imprimirEtiquetas(lista.filter(function (x) { return ids.indexOf(x.id) >= 0; })); return true; } }] });
      var el = j.elemento; el.querySelector('#et-todos').addEventListener('change', function (e) { el.querySelectorAll('.et-c').forEach(function (c) { c.checked = e.target.checked; }); });
    }
    function imprimirEtiquetas(ts) {
      var base = location.href.replace(/#.*$/, '').replace(/[^/]*$/, ''), urlBase = location.origin + location.pathname;
      function qr(t) { if (typeof window.qrcode !== 'function') return ''; var qq = window.qrcode(0, 'M'); qq.addData(t); qq.make(); return qq.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); }
      var ic = { imei: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>', serie: '<path d="M4 7h16M4 12h16M4 17h10"/>', email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' };
      function lin(i, rot, v) { return v ? '<li><svg viewBox="0 0 24 24">' + ic[i] + '</svg><div><em>' + rot + '</em><b>' + esc(v) + '</b></div></li>' : ''; }
      var cards = ts.map(function (x) {
        var num = String(x.etiqueta || x.nome.replace(/\D/g, '') || '').slice(0, 4);
        return '<div class="y"><div class="cab"><img src="' + base + 'assets/img/gol_dark.png"><div><b>Projeto Gol Testes</b><small>Patrimônio · Kolping Estadual de São Paulo</small></div></div>' +
          '<div class="selo"><small>TABLET</small><i>' + esc(num) + '</i></div><div class="cor"><ul>' + lin('imei', 'IMEI', x.imei) + lin('serie', 'Nº DE SÉRIE', x.numero_serie) + lin('email', 'CONTA DO APARELHO', x.email_conta) +
          (!x.imei && !x.numero_serie && !x.email_conta ? '<li><div><em>TABLET</em><b>' + esc(x.nome) + '</b></div></li>' : '') + '</ul><div class="qr">' + qr(urlBase + '#/tablets?t=' + x.id) + '</div></div>' +
          '<div class="pe"><img src="' + base + 'assets/img/kolping_light.png"><span>NÃO RETIRAR</span></div></div>';
      }).join('');
      var css = '@font-face{font-family:P;src:url(' + base + 'assets/fonts/poppins-regular.woff2)}@font-face{font-family:P;font-weight:700 800;src:url(' + base + 'assets/fonts/poppins-bold.woff2)}@font-face{font-family:CC;src:url(' + base + 'assets/fonts/codigo-cracha.woff)}' +
        '@page{size:A4;margin:10mm 15mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font-family:P,sans-serif}' +
        '.folha{display:grid;grid-template-columns:repeat(2,75mm);grid-auto-rows:38mm;gap:2mm 6mm;justify-content:center}' +
        '.y{width:75mm;height:38mm;border-radius:3.5mm;overflow:hidden;background:#fff;border:.2mm solid #ddd;display:grid;grid-template-rows:11.5mm 1fr 5mm;position:relative;break-inside:avoid}' +
        '.cab{background:linear-gradient(110deg,#1d1919,#2d2626 55%,#4a2c1b);display:flex;align-items:center;gap:2.2mm;padding:0 20mm 0 3mm;color:#f4f1ef}.cab img{width:7.5mm;height:7.5mm;border-radius:50%;box-shadow:0 0 0 .5mm rgba(238,115,48,.7)}.cab b{font-size:3.1mm;display:block}.cab small{font-size:1.9mm;color:#cfc7c7;display:block}' +
        '.selo{position:absolute;right:3mm;top:2.2mm;width:15mm;height:13.5mm;border-radius:4mm;background:linear-gradient(135deg,#f08a4b,#e0631f);box-shadow:0 0 0 1mm #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#1b1111}.selo small{font-size:1.6mm;font-weight:800;letter-spacing:.2em}.selo i{font:700 7mm/1 CC,monospace;font-style:normal}' +
        '.cor{display:flex;gap:2.5mm;align-items:flex-end;padding:2mm 3mm 1mm 3.5mm}ul{list-style:none;margin:0;padding:0;flex:1;min-width:0}li{display:flex;gap:1.5mm;margin-bottom:1.2mm}li svg{width:2.3mm;height:2.3mm;stroke:#ee7330;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;flex:none;margin-top:.3mm}li em{display:block;font-style:normal;font-size:1.7mm;font-weight:800;letter-spacing:.1em;color:#8a8486}li b{display:block;color:#272323;font-size:2.3mm;white-space:nowrap}' +
        '.qr{background:#fff;border-radius:2.5mm;padding:1mm;box-shadow:0 0 0 .4mm #f1e6df;margin-bottom:.5mm}.qr svg{width:14.5mm;height:14.5mm;display:block}' +
        '.pe{background:#f7f3f1;display:flex;align-items:center;justify-content:space-between;padding:0 3mm;border-top:.2mm solid #efe9e7}.pe img{height:2.6mm}.pe span{font-size:1.7mm;color:#8a8486;letter-spacing:.06em}';
      var w = window.open('', '_blank');
      if (!w) { ui.toast('O navegador bloqueou a nova janela. Permita pop-ups para este site.', 'erro'); return; }
      w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas dos tablets</title><style>' + css + '</style></head><body><div class="folha">' + cards + '</div><script>window.onload=function(){setTimeout(function(){window.print();},600);};<\/script></body></html>');
      w.document.close();
    }
    function mostrarCodigo(r) {
      var c = String(r.codigo || '');
      ui.janela({ titulo: 'Código para ligar o tablet', largura: 460, confirmarDescarte: false,
        corpo: '<p>No tablet, abra o <b>Projeto Gol Testes</b> e digite este código. Ele vale por <b>10 minutos</b> e só uma vez.</p><div class="tb-pin">' + esc(c.slice(0, 2) + ' ' + c.slice(2, 4) + ' ' + c.slice(4)) + '</div>' });
    }
    area.querySelector('#tb-novo').addEventListener('click', function () { form(null); });
    carregar();
  }

  window.CF.testesTablet = { editor: editor, tablets: tablets };
})();
