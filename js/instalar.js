/* =====================================================================
   Classificação Final · instalar.js
   Botão "Instalar no celular" (administrador e avaliador).
   - Android/Chrome com o sistema aberto: instala direto.
   - iPhone: mostra como "Adicionar à Tela de Início".
   - Computador: mostra um QR Code para abrir no celular.
   Some quando o sistema já está instalado (aberto como aplicativo).
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, esc = ui.esc;
  var pedido = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); pedido = e; });
  window.addEventListener('appinstalled', function () { pedido = null; remover(); ui.toast('Aplicativo instalado.', 'ok'); });

  function instalado() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function ehIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function ehCelular() { return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent); }
  // Safari "de verdade" (outros apps no iPhone não mostram "Adicionar à Tela de Início")
  function ehSafariIOS() { var u = navigator.userAgent; return ehIOS() && /Safari/i.test(u) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|WhatsApp|Snapchat/i.test(u); }
  var SHARE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/></svg>';
  var MAIS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  // Painel de baixo com os passos do iPhone
  function guiaIOS() {
    fecharGuia();
    var safari = ehSafariIOS();
    var f = document.createElement('div');
    f.className = 'ios-fundo'; f.id = 'ios-guia';
    f.innerHTML = '<div class="ios-folha" role="dialog" aria-modal="true" aria-labelledby="ios-tit">' +
      (safari
        ? '<h2 id="ios-tit"><img src="assets/img/icon-180.png" alt="">Instalar no iPhone</h2>' +
          '<div class="ios-p"><span class="n">1</span><span>Toque no botão <span class="ios-ic">' + SHARE + '</span> <b>Compartilhar</b>, na barra do Safari (a seta indica).</span></div>' +
          '<div class="ios-p"><span class="n">2</span><span>Role a lista e toque em <span class="ios-ic">' + MAIS + '</span> <b>Adicionar à Tela de Início</b>.</span></div>' +
          '<div class="ios-p"><span class="n">3</span><span>Toque em <b>Adicionar</b>, no canto de cima.</span></div>' +
          '<button type="button" class="btn" data-ios="ok">Entendi</button>'
        : '<h2 id="ios-tit"><img src="assets/img/icon-180.png" alt="">Abra no Safari para instalar</h2>' +
          '<p class="ios-txt">No iPhone, só o <b>Safari</b> instala o aplicativo. Você abriu o sistema por outro aplicativo (como WhatsApp, Instagram ou Chrome).</p>' +
          '<div class="ios-p"><span class="n">1</span><span>Toque em <b>Copiar link</b>.</span></div>' +
          '<div class="ios-p"><span class="n">2</span><span>Abra o <b>Safari</b>, cole o link na barra de endereço e entre.</span></div>' +
          '<div class="ios-p"><span class="n">3</span><span>Toque de novo em <b>Instalar no celular</b> e siga os passos.</span></div>' +
          '<button type="button" class="btn btn-pri" data-ios="copiar">Copiar link</button><button type="button" class="btn" data-ios="ok">Fechar</button>') +
      '</div>' + (safari ? '<div class="seta-ios" aria-hidden="true"><span>Toque aqui</span><span class="seta-ic">⬇</span></div>' : '');
    f.addEventListener('click', function (e) { if (e.target === f) fecharGuia(); });
    f.querySelectorAll('[data-ios="ok"]').forEach(function (b) { b.addEventListener('click', fecharGuia); });
    var cp = f.querySelector('[data-ios="copiar"]');
    if (cp) cp.addEventListener('click', async function () {
      try { await navigator.clipboard.writeText(endereco()); ui.toast('Link copiado. Agora abra o Safari e cole.', 'ok'); }
      catch (e) { window.prompt('Copie o link:', endereco()); }
    });
    document.body.appendChild(f);
    var foco = f.querySelector('button'); if (foco) foco.focus();
  }
  function fecharGuia() { var g = document.getElementById('ios-guia'); if (g) g.remove(); }

  function endereco() { return window.location.href.replace(/#.*$/, ''); }
  function remover() { var b = document.getElementById('b-instalar'); if (b) b.remove(); }

  function qrSVG(texto) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode(0, 'M'); q.addData(texto); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }

  async function abrir() {
    if (pedido) {
      pedido.prompt();
      try { var r = await pedido.userChoice; if (r && r.outcome === 'accepted') remover(); } catch (e) { /* ignora */ }
      pedido = null;
      return;
    }
    var passosAndroid = '<b class="sub">Android (Chrome)</b><div class="passo-i"><b>1</b><span>Toque em <b>Instalar aplicativo</b> no aviso que aparece, ou no menu <b>⋮</b> → <b>Instalar app</b>.</span></div>';
    var passosIOS = '<b class="sub">iPhone (Safari)</b><div class="passo-i"><b>1</b><span>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</span></div><div class="passo-i"><b>2</b><span>Escolha <b>Adicionar à Tela de Início</b> e confirme.</span></div>';
    var fim = '<p class="dica" style="margin:10px 0 0">O ícone do Classificação Final aparece na tela do celular, e o sistema abre em tela cheia, como um aplicativo.</p>';
    if (ehIOS()) { guiaIOS(); return; }
    if (ehCelular()) {
      ui.janela({ titulo: 'Instalar no celular', confirmarDescarte: false, corpo: '<div class="inst-passos">' + passosAndroid + fim + '</div>' });
      return;
    }
    var j = ui.janela({ titulo: 'Instalar no celular', confirmarDescarte: false,
      corpo: '<div class="inst"><div class="inst-qr" aria-label="QR Code com o endereço do sistema">' + qrSVG(endereco()) + '</div><div class="inst-passos">' +
        '<p style="margin:0 0 8px;color:var(--texto-2)">Aponte a câmera do celular para o código e abra o link. Depois:</p>' + passosAndroid + passosIOS + fim + '</div></div>',
      botoes: [{ texto: 'Copiar link', aoClicar: async function () {
        try { await navigator.clipboard.writeText(endereco()); ui.toast('Link copiado. Envie para o seu celular.', 'ok'); } catch (e) { ui.toast(endereco(), 'ok'); }
        return false;
      } }, { texto: 'Fechar', principal: true, acao: 'fechar' }] });
    return j;
  }

  // Coloca o botão no menu lateral (só administrador e avaliador)
  function colocar(perfil) {
    remover();
    if (!perfil || (perfil.perfil !== 'admin' && perfil.perfil !== 'avaliador') || instalado()) return;
    var menu = document.querySelector('.menu'); if (!menu) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'b-instalar'; b.className = 'instalar-menu';
    b.innerHTML = '<span aria-hidden="true">📱</span> Instalar no celular';
    b.addEventListener('click', abrir);
    menu.insertAdjacentElement('afterend', b);
  }

  window.CF.instalar = { colocar: colocar, abrir: abrir, instalado: instalado, ehSafariIOS: ehSafariIOS };
})();
