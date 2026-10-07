/* =====================================================================
   Classificação Final · ui.js
   Funções de interface usadas por todo o sistema.
   ===================================================================== */
(function () {
  'use strict';
  window.CF = window.CF || {};

  // Escapa texto antes de colocar em HTML (evita injeção de código)
  function esc(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var ICONES = {
    painel: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    processos: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    cadastros: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    banco: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    config: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    portal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 20V9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    olhoFechado: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    nuvem: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/><path d="M9 13l2 2 4-4"/>',
    nuvemOff: '<path d="M3 3l18 18"/><path d="M8.5 8.2A5 5 0 0 0 7 18h10M19.5 16.8A4 4 0 0 0 18 10a6 6 0 0 0-8-5.4"/>',
    alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ok: '<circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/>',
    pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    lua: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'
  };
  function icone(nome, tam, cor) {
    return '<svg width="' + (tam || 18) + '" height="' + (tam || 18) + '" viewBox="0 0 24 24" fill="none" stroke="' + (cor || 'currentColor') +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONES[nome] || '') + '</svg>';
  }

  // Aviso rápido no canto da tela
  function toast(mensagem, tipo) {
    var area = document.querySelector('.toasts');
    if (!area) { area = document.createElement('div'); area.className = 'toasts'; area.setAttribute('role', 'status'); document.body.appendChild(area); }
    var t = document.createElement('div');
    t.className = 'toast' + (tipo ? ' toast-' + tipo : '');
    t.textContent = mensagem;
    area.appendChild(t);
    setTimeout(function () { t.remove(); }, 4500);
  }

  /* Janela (modal)
     - NÃO fecha ao clicar fora.
     - Fecha só pelo "×" ou pelo botão Cancelar/Fechar.
     - Se houver dados preenchidos, pergunta antes de descartar. */
  function janela(opcoes) {
    var fundo = document.createElement('div');
    fundo.className = 'janela-fundo';
    var id = 'j' + Date.now();
    fundo.innerHTML =
      '<div class="janela card" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
        '<div class="janela-cab"><h2 id="' + id + '">' + esc(opcoes.titulo) + '</h2>' +
        '<button type="button" class="janela-x" aria-label="Fechar">×</button></div>' +
        '<div class="janela-corpo">' + (opcoes.corpo || '') + '</div>' +
        '<div class="janela-pe"></div>' +
      '</div>';
    var pe = fundo.querySelector('.janela-pe');
    var sujo = false;
    fundo.querySelector('.janela-corpo').addEventListener('input', function () { sujo = true; });

    function fechar(forcar) {
      if (!forcar && sujo && opcoes.confirmarDescarte !== false) {
        confirmar('Descartar as alterações?', 'Os dados preenchidos ainda não foram salvos e serão perdidos.', 'Descartar', 'Continuar editando')
          .then(function (sim) { if (sim) { fundo.remove(); if (opcoes.aoFechar) opcoes.aoFechar(); } });
        return;
      }
      fundo.remove();
      if (opcoes.aoFechar) opcoes.aoFechar();
    }
    fundo.querySelector('.janela-x').addEventListener('click', function () { fechar(false); });
    fundo.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); fechar(false); } });

    (opcoes.botoes || [{ texto: 'Fechar', acao: 'fechar' }]).forEach(function (b) {
      var bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'btn' + (b.principal ? ' btn-pri' : '');
      bt.textContent = b.texto;
      bt.addEventListener('click', function () {
        if (b.acao === 'fechar') { fechar(false); return; }
        if (b.aoClicar) {
          Promise.resolve(b.aoClicar(fundo)).then(function (ok) { if (ok !== false) fechar(true); });
        }
      });
      pe.appendChild(bt);
    });

    document.body.appendChild(fundo);
    var foco = fundo.querySelector('input, select, textarea, button.janela-x');
    if (foco) foco.focus();
    return { elemento: fundo, fechar: fechar };
  }

  // Pergunta de confirmação (também não fecha ao clicar fora)
  function confirmar(titulo, mensagem, textoSim, textoNao) {
    return new Promise(function (resolver) {
      var fundo = document.createElement('div');
      fundo.className = 'janela-fundo';
      fundo.style.zIndex = '60';
      fundo.innerHTML =
        '<div class="janela card" role="alertdialog" aria-modal="true" style="max-width:420px">' +
          '<div class="janela-corpo"><h2 style="font-size:18px">' + esc(titulo) + '</h2><p style="margin:0;color:var(--texto-2)">' + esc(mensagem) + '</p></div>' +
          '<div class="janela-pe"><button type="button" class="btn" data-r="sim">' + esc(textoSim || 'Sim') + '</button>' +
          '<button type="button" class="btn btn-pri" data-r="nao">' + esc(textoNao || 'Cancelar') + '</button></div>' +
        '</div>';
      fundo.addEventListener('click', function (e) {
        var r = e.target.getAttribute && e.target.getAttribute('data-r');
        if (!r) return;
        fundo.remove();
        resolver(r === 'sim');
      });
      document.body.appendChild(fundo);
      fundo.querySelector('[data-r="nao"]').focus();
    });
  }

  // Liga o botão de mostrar/ocultar senha
  function ligarVerSenha(raiz) {
    raiz.querySelectorAll('.senha-ver').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = b.parentElement.querySelector('input');
        var mostrar = inp.type === 'password';
        inp.type = mostrar ? 'text' : 'password';
        b.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
        b.innerHTML = icone(mostrar ? 'olhoFechado' : 'olho', 18);
      });
    });
  }

  function campoSenha(id, rotulo, autocomplete) {
    return '<label class="campo" for="' + id + '"><span>' + esc(rotulo) + ' <span class="obrig">*</span></span>' +
      '<div class="senha-wrap"><input class="entrada" id="' + id + '" type="password" required autocomplete="' + autocomplete + '">' +
      '<button type="button" class="senha-ver" aria-label="Mostrar senha">' + icone('olho', 18) + '</button></div></label>';
  }

  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  // Logo nas duas versões; o tema mostra a correta (classes so-escuro / so-claro)
  function logo(nome, classe, alt) {
    return '<img class="' + classe + ' so-escuro" src="assets/img/' + nome + '_dark.png" alt="' + esc(alt) + '">' +
           '<img class="' + classe + ' so-claro" src="assets/img/' + nome + '_light.png" alt="' + esc(alt) + '">';
  }

  // Selo pequeno (pill). tipo: 'neu' | 'ok' | 'off' | 'aviso'
  function pill(texto, tipo) { return '<span class="pill pill-' + (tipo || 'neu') + '">' + esc(texto) + '</span>'; }

  // Texto sem acentos e em minúsculas (para buscas)
  function normalizar(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

  // CNPJ: só números, formatação e verificação dos dígitos
  function soNumeros(t) { return String(t || '').replace(/\D/g, ''); }
  function formatarCNPJ(t) {
    var n = soNumeros(t).slice(0, 14);
    return n.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  function cnpjValido(t) {
    var n = soNumeros(t);
    if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
    function dv(base) {
      var pesos = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      var soma = base.split('').reduce(function (s, d, i) { return s + parseInt(d, 10) * pesos[i]; }, 0);
      var r = soma % 11; return r < 2 ? 0 : 11 - r;
    }
    var d1 = dv(n.slice(0, 12)), d2 = dv(n.slice(0, 12) + d1);
    return n.slice(12) === String(d1) + String(d2);
  }
  function formatarTelefone(t) {
    var n = soNumeros(t).slice(0, 11);
    if (n.length <= 10) return n.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return n.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }

  // Bloqueia o botão enquanto a operação acontece (evita clique duplo)
  async function executar(botao, textoOcupado, fn) {
    var original = botao ? botao.textContent : '';
    if (botao) { botao.disabled = true; botao.textContent = textoOcupado || 'Aguarde…'; }
    try { return await fn(); }
    finally { if (botao) { botao.disabled = false; botao.textContent = original; } }
  }

  /* Tudo o que é digitado fica em MAIÚSCULAS (menos e-mail, senha, busca,
     números e campos marcados com data-normal, como o texto do agradecimento) */
  function deveMaiusculo(el) {
    if (!el || !el.classList || !el.classList.contains('entrada') || el.hasAttribute('data-normal')) return false;
    // senhas nunca (mesmo com "mostrar senha", que troca o tipo para texto)
    if (/senha|password/i.test(el.id + ' ' + (el.getAttribute('autocomplete') || '') + ' ' + (el.getAttribute('name') || ''))) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    var t = (el.getAttribute('type') || 'text').toLowerCase();
    return t === 'text' || t === 'tel';
  }
  var compondo = false;
  document.addEventListener('compositionstart', function () { compondo = true; }, true);
  document.addEventListener('compositionend', function (e) { compondo = false; maiusculo(e.target); }, true);
  function maiusculo(el) {
    if (!deveMaiusculo(el)) return;
    var v = el.value, m = v.toLocaleUpperCase('pt-BR');
    if (v === m) return;
    var i = el.selectionStart, f = el.selectionEnd;
    el.value = m;
    try { el.setSelectionRange(i, f); } catch (e) { /* alguns tipos não aceitam */ }
  }
  document.addEventListener('input', function (e) { if (!compondo) maiusculo(e.target); }, true);
  function maiusculas(t) { return t == null ? t : String(t).toLocaleUpperCase('pt-BR'); }

  window.CF.ui = { maiusculas: maiusculas, pill: pill, normalizar: normalizar, soNumeros: soNumeros, formatarCNPJ: formatarCNPJ, cnpjValido: cnpjValido,
    formatarTelefone: formatarTelefone, executar: executar, logo: logo, esc: esc, icone: icone, toast: toast, janela: janela, confirmar: confirmar, ligarVerSenha: ligarVerSenha, campoSenha: campoSenha, iniciais: iniciais };
})();
