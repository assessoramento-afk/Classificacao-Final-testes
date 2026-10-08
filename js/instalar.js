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
    if (ehCelular()) {
      ui.janela({ titulo: 'Instalar no celular', confirmarDescarte: false, corpo: '<div class="inst-passos">' + (ehIOS() ? passosIOS : passosAndroid) + fim + '</div>' });
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

  window.CF.instalar = { colocar: colocar, abrir: abrir, instalado: instalado };
})();
