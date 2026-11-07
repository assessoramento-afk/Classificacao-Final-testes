/* =====================================================================
   Classificação Final · views/envios.js
   Central de envios (#/envios): tudo o que foi lançado neste aparelho e
   a situação de cada item. Rejeitados e conflitos ficam aqui até alguém
   decidir. Nada é apagado sem confirmação.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc, OFF = window.CF.offline;
  var EST = {
    salvo: ['💾', 'Salvo no aparelho', 'est-salvo'], aguardando: ['⏳', 'Aguardando', 'est-aguard'], enviado: ['↗', 'Enviado', 'est-env'],
    confirmado: ['✓', 'Confirmado', 'est-ok'], rejeitado: ['⚠', 'Rejeitado', 'est-erro'], conflito: ['⚠', 'Conflito', 'est-erro'], descartado: ['✕', 'Descartado', 'est-desc']
  };
  function hora(iso) { try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function pill(e) { var x = EST[e] || ['', e, '']; return '<span class="est ' + x[2] + '">' + x[0] + ' ' + x[1] + '</span>'; }
  function fmt(n) { return n == null ? '—' : String(Math.round(n * 100) / 100).replace('.', ','); }

  window.CF.telas = window.CF.telas || {};
  window.CF.telas.envios = function (area) {
    var parar = null;
    function desenhar() {
      var r = OFF.resumo(), f = OFF.fila(), a = OFF.atencao(), fin = OFF.finais().slice(-40).reverse();
      area.innerHTML = '<header class="cabecalho"><div><h1>Central de envios</h1><p>Tudo o que foi lançado neste aparelho e a situação de cada item</p></div>' +
          '<div class="botoes-topo">' + (navigator.onLine && f.length ? '<button type="button" class="btn" id="ce-env">⟳ Enviar agora</button>' : '') +
          '<button type="button" class="btn" id="ce-copia"' + (f.length + a.length ? '' : ' disabled') + '>⬇ Baixar cópia dos pendentes</button></div></header>' +
        '<div class="ce-res">' + [['salvo', r.salvo], ['aguardando', r.aguardando], ['enviado', r.enviado], ['confirmado', r.confirmado], ['atencao', r.atencao]].map(function (x) {
          return '<div><b>' + x[1] + '</b>' + (x[0] === 'atencao' ? '<span class="est est-erro">⚠ Rejeitado/conflito</span>' : pill(x[0])) + (x[0] === 'confirmado' ? '<small>hoje</small>' : '') + '</div>';
        }).join('') + '</div>' +
        (a.length ? '<span class="lbl">Precisam da sua atenção</span>' + a.map(function (x) {
          var conf = x.estado === 'conflito', srv = x.servidor || {};
          return '<div class="ce-item ce-at"><div class="ce-tx"><b>' + esc(x.rotulo || x.tipo) + '</b><small>' + (conf
              ? '⚠ Conflito: você lançou ' + fmt(x.dados.valor) + ' às ' + hora(x.dados.em) + ' · ' + esc(srv.avaliador || 'outra pessoa') + ' lançou ' + fmt(srv.valor) + ' às ' + hora(srv.em)
              : '⚠ Rejeitado: ' + esc(x.motivo || 'o servidor recusou')) + '</small></div><div class="acoes">' +
            (conf ? '<button type="button" class="btn btn-p" data-forcar="' + x.op_id + '">Manter ' + fmt(x.dados.valor) + '</button><button type="button" class="btn btn-p" data-desc="' + x.op_id + '" data-msg="Manter a nota de ' + esc(srv.avaliador || 'outra pessoa') + '">Manter ' + fmt(srv.valor) + '</button>'
              : (x.tipo === 'nota' && /outro avaliador/i.test(x.motivo || '') ? '<button type="button" class="btn btn-p" data-sug="' + x.op_id + '">Transformar em sugestão</button>' : '<button type="button" class="btn btn-p" data-tentar="' + x.op_id + '">Tentar de novo</button>') +
                '<button type="button" class="btn btn-p btn-perigo" data-desc="' + x.op_id + '">Descartar</button>') + '</div></div>';
        }).join('') : '') +
        '<span class="lbl">Na fila</span>' + (f.length ? f.map(function (x) {
          return '<div class="ce-item"><div class="ce-tx"><b>' + esc(x.rotulo || x.tipo) + '</b><small>lançado ' + hora(x.criado_em) + (x.tentativas ? ' · ' + x.tentativas + ' tentativa(s)' : '') + (x.importado ? ' · importado de cópia' : '') + '</small></div>' + pill(x.estado) + '</div>';
        }).join('') : '<div class="card vazio">Nada aguardando envio neste aparelho.</div>') +
        (fin.length ? '<details class="ce-fin"><summary>Últimos confirmados e descartados (' + fin.length + ')</summary>' + fin.map(function (x) {
          return '<div class="ce-item"><div class="ce-tx"><b>' + esc(x.rotulo || x.tipo) + '</b><small>' + (x.estado === 'descartado' ? 'descartado ' + hora(x.descartado_em) : 'confirmado ' + hora(x.respondido_em)) + '</small></div>' + pill(x.estado) + '</div>';
        }).join('') + '</details>' : '') +
        '<p class="dica">Os lançamentos ficam guardados no aparelho até o servidor confirmar. Se a internet cair no meio do envio, eles voltam para a fila sem risco de gravar duas vezes. ' +
          'Se um aparelho não conseguir enviar de jeito nenhum, use "Baixar cópia dos pendentes" e entregue o arquivo ao administrador.</p>' +
        ((window.CF.perfilAtual || {}).perfil === 'admin' ? '<div><button type="button" class="btn btn-p" id="ce-imp">⬆ Importar cópia de outro aparelho</button></div>' : '');
      ligar();
    }
    function ligar() {
      var q = function (s) { return area.querySelector(s); };
      if (q('#ce-env')) q('#ce-env').addEventListener('click', function () { OFF.enviar(); });
      q('#ce-copia').addEventListener('click', function () { var n = OFF.baixarCopia(); ui.toast('Cópia com ' + n + ' item(ns) baixada.', 'ok'); });
      if (q('#ce-imp')) q('#ce-imp').addEventListener('click', function () {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
        inp.addEventListener('change', async function () {
          try { var n = OFF.importarCopia(await inp.files[0].text()); ui.toast(n + ' item(ns) importados para a fila.', 'ok'); desenhar(); } catch (e) { ui.toast(e.message || 'Arquivo inválido.', 'erro'); }
        });
        inp.click();
      });
      area.querySelectorAll('[data-forcar]').forEach(function (b) { b.addEventListener('click', function () { OFF.tentarDeNovo(b.getAttribute('data-forcar'), true); ui.toast('Sua nota foi reenviada.', 'ok'); desenhar(); }); });
      area.querySelectorAll('[data-tentar]').forEach(function (b) { b.addEventListener('click', function () { OFF.tentarDeNovo(b.getAttribute('data-tentar'), false); desenhar(); }); });
      area.querySelectorAll('[data-desc]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var msg = b.getAttribute('data-msg');
          if (!(await ui.confirmar(msg ? msg + '?' : 'Descartar este lançamento?', msg ? 'O seu lançamento será descartado e a nota do servidor continua valendo.' : 'Ele não será enviado ao servidor. Fica registrado como descartado neste aparelho.', msg ? 'Manter' : 'Descartar', 'Cancelar'))) return;
          OFF.descartar(b.getAttribute('data-desc')); desenhar();
        });
      });
      area.querySelectorAll('[data-sug]').forEach(function (b) {
        b.addEventListener('click', function () {
          ui.janela({ titulo: 'Transformar em sugestão', confirmarDescarte: false,
            corpo: '<p style="margin:0;color:var(--texto-2)">A nota vai como sugestão para o avaliador do grupo, que aprova ou nega.</p><label class="campo"><span>Justificativa <span class="obrig">*</span></span><textarea class="entrada" id="ce-just" rows="3" maxlength="500"></textarea></label>',
            botoes: [{ texto: 'Cancelar', acao: 'fechar' }, { texto: 'Enviar sugestão', principal: true, aoClicar: function (fm) {
              var j = ui.maiusculas(fm.querySelector('#ce-just').value.trim());
              if (j.length < 5) { ui.toast('Escreva a justificativa.', 'erro'); return false; }
              OFF.virarSugestao(b.getAttribute('data-sug'), j); ui.toast('Sugestão enviada.', 'ok'); desenhar(); return true;
            } }] });
        });
      });
    }
    desenhar();
    parar = OFF.ouvir(function () { if (document.body.contains(area) && /#\/envios/.test(location.hash)) { var ab = document.activeElement; if (!ab || !area.contains(ab)) desenhar(); } });
    window.addEventListener('hashchange', function x() { if (parar) parar(); window.removeEventListener('hashchange', x); });
  };
})();
