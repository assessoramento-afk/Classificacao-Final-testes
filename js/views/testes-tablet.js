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
      } else if (p.tipo === 'marcar') {
        var C = [['banco', 'Banco'], ['bandeira', 'Bandeira'], ['numero', 'Número'], ['nome', 'Nome'], ['validade', 'Validade'], ['agencia', 'Agência'], ['cvv', 'CVV']];
        h += '<p class="dica">O gabarito sai sozinho: cada campo diferente entre o original e a cópia é uma diferença. Pontuação = acertos − marcações sem diferença (mínimo 0).</p>' +
          '<div class="tm-rolar"><table class="tt-tab sem-vista"><thead><tr><th>#</th><th></th>' + C.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '<th>Diferenças</th><th></th></tr></thead><tbody>' +
          (p.blocos || []).map(function (b, k) {
            var dif = M.diferencas(b);
            return ['original', 'copia'].map(function (lado, z) {
              return '<tr data-b="' + k + '" data-lado="' + lado + '"' + (z ? ' class="tt-cp"' : '') + '>' + (z ? '' : '<td rowspan="2">' + (k + 1) + '</td>') + '<td><small>' + (z ? 'Cópia' : 'Original') + '</small></td>' +
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
        if (p.tipo === 'marcar') {
          var bl = [];
          el.querySelectorAll('tbody tr[data-b]').forEach(function (tr) {
            var k = tr.getAttribute('data-b'), lado = tr.getAttribute('data-lado'); bl[k] = bl[k] || { original: {}, copia: {} };
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
          : { tipo: 'marcar', blocos: [{ original: {}, copia: {} }] });
        mudou = true; desenhar();
      }); });
      area.querySelectorAll('[data-rem]').forEach(function (b) { b.addEventListener('click', async function () { if (!(await ui.confirmar('Remover esta parte?', 'A parte e o gabarito dela saem do rascunho.', 'Remover', 'Cancelar'))) return; ler(); est.partes.splice(+b.getAttribute('data-rem'), 1); mudou = true; desenhar(); }); });
      area.querySelectorAll('[data-sobe]').forEach(function (b) { b.addEventListener('click', function () { ler(); var i = +b.getAttribute('data-sobe'); var x = est.partes.splice(i, 1)[0]; est.partes.splice(i - 1, 0, x); redesenhar(); }); });
      area.querySelectorAll('[data-linha]').forEach(function (b) { b.addEventListener('click', function () { ler(); est.partes[+b.getAttribute('data-linha')].linhas.push({ original: [], copia: [], gabarito: '-', pontos: 1 }); redesenhar(); }); });
      area.querySelectorAll('[data-bloco]').forEach(function (b) { b.addEventListener('click', function () { ler(); est.partes[+b.getAttribute('data-bloco')].blocos.push({ original: {}, copia: {} }); redesenhar(); }); });
      area.querySelectorAll('[data-rl]').forEach(function (b) { b.addEventListener('click', function () { ler(); var p = est.partes[+b.closest('.tt-parte').getAttribute('data-p')]; p.linhas.splice(+b.getAttribute('data-rl'), 1); redesenhar(); }); });
      area.querySelectorAll('[data-rb]').forEach(function (b) { b.addEventListener('click', function () { ler(); var p = est.partes[+b.closest('.tt-parte').getAttribute('data-p')]; p.blocos.splice(+b.getAttribute('data-rb'), 1); redesenhar(); }); });
      area.querySelectorAll('[data-auto]').forEach(function (b) { b.addEventListener('click', function () {
        ler(); var p = est.partes[+b.getAttribute('data-auto')];
        p.linhas.forEach(function (l) { var n = 0; (l.original || []).forEach(function (v, j) { if (String(v).trim().toUpperCase() !== String((l.copia || [])[j] || '').trim().toUpperCase()) n++; }); l.gabarito = n ? String(n) : '-'; });
        redesenhar(); ui.toast('Gabarito calculado. Confira as linhas antes de publicar.', 'ok');
      }); });
      area.querySelector('#tt-sal').addEventListener('click', function () { salvar(this); });
      area.querySelector('#tt-pub').addEventListener('click', function () { publicar(this); });
      area.querySelector('#tt-prev').addEventListener('click', function () { ler(); previa(est, t); });
      area.querySelector('#tt-imp').addEventListener('click', function () { importar(function (novo) { ler(); est.partes = est.partes.concat(novo.partes); if (novo.faixas) { est.faixas = novo.faixas; est.modo_nota = novo.modo_nota; } if (novo.tempo_min) est.tempo_min = novo.tempo_min; if (novo.instrucoes && !est.instrucoes) est.instrucoes = novo.instrucoes; mudou = true; desenhar(); }); });
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
        achado = lerCartoes(wb) || lerConferencia(wb);
        if (!achado) { res.innerHTML = '<div class="aviso aviso-erro">Não reconheci esta planilha. Por enquanto o sistema lê a Conferência de Mercadoria e os Cartões de Crédito; os outros modelos entram na etapa T3.</div>'; return; }
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
      blocos.push({ original: objeto(orig[o]), copia: objeto(cp) });
    }
    if (!blocos.length) return null;
    var p = { tipo: 'marcar', titulo: '', blocos: blocos }, dif = M.totalParte(p);
    return { partes: [p], modo_nota: 'percentual', faixas: faixasPadrao('percentual'), tempo_min: 10,
      instrucoes: 'Em cada bloco, compare o cartão da direita com o original (esquerda) e marque X nos campos que estão diferentes. Se estiver igual, não marque.',
      resumo: [['Tipo', 'Marcar o que mudou (blocos de cartões)'], ['Dados', blocos.length + ' blocos (original e cópia)'], ['Gabarito', dif + ' diferenças, calculadas comparando original e cópia'], ['Faixas da nota', '% do total: 0 → 1, 20 → 2, 40 → 3, 60 → 4, 80 → 5'], ['Tempo', 'não está na planilha · usei 10 min; ajuste no editor', true]] };
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
    area.innerHTML = '<a class="voltar" href="#/config">← Configurações</a><header class="cabecalho"><div><h1>Tablets</h1><p>Tablets do Projeto Gol Testes · cada um tem nome, etiqueta e chave própria</p></div>' +
      '<div class="botoes-topo"><button type="button" class="btn btn-pri" id="tb-qr">📷 Ler QR do tablet</button><button type="button" class="btn" id="tb-novo">' + ui.icone('mais', 17) + 'Cadastrar com código</button></div></header><section class="card pt-tab" id="tb-ped"></section><div id="tb-lista"><div class="girando" style="margin:30px auto"></div></div>' +
      '<p class="dica">Se um tablet sumir, use "Desativar": a chave dele para de funcionar na hora. Os resultados que ele já enviou continuam valendo.</p>' +
      '<div class="tb-duas"><section class="card bloco" id="tb-inst"></section><div style="display:flex;flex-direction:column;gap:16px"><section class="card bloco" id="tb-pin"></section><section class="card bloco" id="tb-modo"></section></div></div>' +
      '<section class="card pt-tab" id="tb-res"><h2>Resultados recebidos dos tablets</h2><div class="girando" style="margin:20px auto"></div></section>' +
      '<section class="card pt-tab" id="tb-hist"></section>';
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
          '<label class="campo" style="margin-top:12px"><span>Nome do tablet</span><input class="entrada" id="pd-nome" value="' + esc(prox) + '"></label><label class="campo"><span>Etiqueta</span><input class="entrada" id="pd-et" value="' + esc(prox.replace(/\D/g, '')) + '"></label>' +
          '<p class="dica">Fica registrado: quem decidiu, quando, aparelho e navegador.</p>',
        botoes: [{ texto: 'Rejeitar', aoClicar: async function () { try { var r = await sb.rpc('tablet_pedido_decidir', { p_codigo: p.codigo, p_liberar: false }); if (r.error) throw r.error; ui.toast('Pedido rejeitado.', 'ok'); carregar(); pedidos(); historico(); return true; } catch (e) { ui.toast(api.traduzErro(e), 'erro'); return false; } } },
          { texto: 'Liberar tablet', principal: true, aoClicar: async function (f) {
            try { var r = await sb.rpc('tablet_pedido_decidir', { p_codigo: p.codigo, p_liberar: true, p_nome: f.querySelector('#pd-nome').value, p_etiqueta: f.querySelector('#pd-et').value }); if (r.error) throw r.error;
              ui.toast('Tablet liberado. Ele entra sozinho em alguns segundos.', 'ok'); carregar(); pedidos(); historico(); return true; } catch (e) { ui.toast(api.traduzErro(e), 'erro'); return false; } } }] });
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
    async function historico() {
      var b = area.querySelector('#tb-hist'), hs = [], pessoas = [];
      try { hs = await q(sb.from('tablet_historico').select('*').order('em', { ascending: false }).limit(40)); } catch (e) { b.innerHTML = ''; return; }
      try { pessoas = await q(sb.from('perfis').select('id,nome')); } catch (e) {}
      function pn(id) { var x = pessoas.filter(function (p) { return p.id === id; })[0]; return x ? x.nome : (id ? '—' : 'o próprio tablet'); }
      function tn(id) { var t = lista.filter(function (x) { return x.id === id; })[0]; return t ? t.nome : ''; }
      b.innerHTML = '<h2>Histórico dos tablets</h2>' + (hs.length ? '<div class="tabela-rolar"><table class="tabela"><thead><tr><th>Quando</th><th>O quê</th><th>Tablet</th><th>Quem</th></tr></thead><tbody>' +
        hs.map(function (h) { return '<tr><td>' + new Date(h.em).toLocaleString('pt-BR') + '</td><td><b>' + esc(h.acao) + '</b>' + (h.detalhe ? '<br><small class="dica">' + esc(h.detalhe) + '</small>' : '') + '</td><td>' + esc(tn(h.tablet_id)) + '</td><td>' + esc(pn(h.por)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="dica">Nada registrado ainda.</p>');
    }
    area.querySelector('#tb-qr').addEventListener('click', lerQR);
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
    function situacao(x) {
      if (!x.ativo) return ['Desativado', 'nao', '#8a8486'];
      if (!x.ligado_em) return ['Aguardando ligar', 'neu', '#e0a100'];
      if (x.pendentes > 0) return ['Envio pendente', 'neu', '#ee7330'];
      if (x.ultima_conexao && (Date.now() - new Date(x.ultima_conexao)) > 7 * 864e5) return ['Desatualizado', 'nao', '#D9534F'];
      return ['Pronto', 'ok', '#3FA66B'];
    }
    function desenhar() {
      var box = area.querySelector('#tb-lista');
      if (!lista.length) { box.innerHTML = '<section class="card bloco"><p class="dica">Nenhum tablet cadastrado ainda. Use "Cadastrar tablet" e digite o código no app Projeto Gol Testes.</p></section>'; return; }
      box.innerHTML = '<section class="card tabela-card"><div class="tabela-rolar"><table class="tabela"><thead><tr><th>Tablet</th><th>Situação</th><th>Última conexão</th><th>Testes</th><th>Aguardando envio</th><th></th></tr></thead><tbody>' +
        lista.map(function (x) { var s = situacao(x); return '<tr style="--c:' + s[2] + '"><td><b>' + esc(x.nome) + '</b><small style="display:block;color:var(--texto-3)">' + esc([x.etiqueta ? 'etiqueta ' + x.etiqueta : '', x.modelo || ''].filter(Boolean).join(' · ') || '—') + '</small></td><td>' + ui.pill(s[0], s[1]) + '</td><td>' + dataHora(x.ultima_conexao) + '</td><td>' + esc(x.testes_versao || '—') + '</td><td>' + (x.pendentes || 0) + '</td>' +
          '<td class="acoes"><button type="button" class="btn btn-p" data-ed="' + x.id + '">Editar</button><button type="button" class="btn btn-p" data-cod="' + x.id + '">Novo código</button><button type="button" class="btn btn-p' + (x.ativo ? ' perigo' : '') + '" data-at="' + x.id + '">' + (x.ativo ? 'Desativar' : 'Ativar') + '</button></td></tr>'; }).join('') + '</tbody></table></div></section>';
      box.querySelectorAll('[data-cod]').forEach(function (b) { b.addEventListener('click', async function () { try { mostrarCodigo(await q(sb.rpc('tablet_novo_codigo', { p_tablet: b.getAttribute('data-cod') }))); carregar(); } catch (e) { erro(e); } }); });
      box.querySelectorAll('[data-at]').forEach(function (b) { b.addEventListener('click', async function () {
        var x = lista.filter(function (y) { return y.id === b.getAttribute('data-at'); })[0];
        if (x.ativo && !(await ui.confirmar('Desativar ' + x.nome + '?', 'A chave deste tablet para de funcionar na hora. Para usar de novo, gere um novo código.', 'Desativar', 'Cancelar'))) return;
        try { await q(sb.rpc('tablet_ativar', { p_tablet: x.id, p_ativo: !x.ativo })); carregar(); } catch (e) { erro(e); }
      }); });
      box.querySelectorAll('[data-ed]').forEach(function (b) { b.addEventListener('click', function () { form(lista.filter(function (y) { return y.id === b.getAttribute('data-ed'); })[0]); }); });
    }
    function form(x) {
      ui.janela({ titulo: x ? 'Editar tablet' : 'Cadastrar tablet', largura: 520,
        corpo: '<label class="campo"><span>Nome *</span><input class="entrada" id="tb-n" value="' + esc(x ? x.nome : 'TABLET ' + String(lista.length + 1).padStart(2, '0')) + '"></label>' +
          '<label class="campo"><span>Etiqueta</span><input class="entrada" id="tb-e" value="' + esc(x ? x.etiqueta || '' : String(lista.length + 1).padStart(2, '0')) + '"></label>' +
          '<label class="campo"><span>Modelo (opcional)</span><input class="entrada" id="tb-m" value="' + esc(x ? x.modelo || '' : '') + '" placeholder="ex.: Samsung Tab A8"></label>',
        botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: x ? 'Salvar' : 'Cadastrar e gerar código', principal: true, aoClicar: async function (f) {
          var n = f.querySelector('#tb-n').value, e = f.querySelector('#tb-e').value, m = f.querySelector('#tb-m').value;
          try {
            if (x) await q(sb.rpc('tablet_salvar', { p_tablet: x.id, p_nome: n, p_etiqueta: e, p_modelo: m }));
            else mostrarCodigo(await q(sb.rpc('tablet_cadastrar', { p_nome: n, p_etiqueta: e, p_modelo: m })));
            carregar(); return true;
          } catch (er) { erro(er); return false; }
        } }] });
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
