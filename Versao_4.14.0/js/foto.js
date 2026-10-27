/* =====================================================================
   Classificação Final · foto.js
   Foto do perfil: escolher a imagem, enquadrar no círculo, reduzir,
   enviar para o espaço privado "avatares" e exibir no sistema.
   ===================================================================== */
(function () {
  'use strict';
  var ui = window.CF.ui, api = window.CF.api, sb = window.CF.sb;
  var BUCKET = 'avatares', TAM_FINAL = 320, TAM_TELA = 560, LIMITE_MB = 15;
  var cache = {}; // caminho -> { url, expira }

  // Endereço temporário e protegido da foto (válido por 1 hora)
  async function urlDe(caminho) {
    if (!caminho) return null;
    var c = cache[caminho];
    if (c && c.expira > Date.now()) return c.url;
    var r = await sb.storage.from(BUCKET).createSignedUrl(caminho, 3600);
    if (r.error || !r.data) return null;
    cache[caminho] = { url: r.data.signedUrl, expira: Date.now() + 50 * 60 * 1000 };
    return r.data.signedUrl;
  }

  // Preenche um elemento .avatar com a foto (ou as iniciais)
  async function preencherAvatar(el, perfil) {
    if (!el) return;
    var ini = ui.iniciais(perfil.nome || perfil.email);
    el.classList.remove('com-foto');
    el.textContent = ini;
    if (!perfil.foto_path) return;
    try {
      var url = await urlDe(perfil.foto_path);
      if (!url) return;
      var img = new Image();
      img.alt = '';
      img.onload = function () { el.textContent = ''; el.appendChild(img); el.classList.add('com-foto'); };
      img.src = url;
    } catch (e) { /* sem foto: ficam as iniciais */ }
  }

  function escolherArquivo() {
    return new Promise(function (resolver) {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/jpeg,image/png,image/webp,image/heic,image/*';
      inp.addEventListener('change', function () { resolver(inp.files && inp.files[0] ? inp.files[0] : null); });
      inp.click();
    });
  }

  function carregarImagem(arquivo) {
    return new Promise(function (resolver, rejeitar) {
      var url = URL.createObjectURL(arquivo);
      var img = new Image();
      img.onload = function () { resolver(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rejeitar(new Error('formato')); };
      img.src = url;
    });
  }

  /* Janela de ajuste: arrastar para enquadrar e zoom.
     Devolve uma Promise com o Blob final (JPEG 320×320) ou null. */
  function ajustar(img) {
    return new Promise(function (resolver) {
      var resolvido = false;
      function fim(v) { if (!resolvido) { resolvido = true; resolver(v); } }
      var j = ui.janela({
        titulo: 'Ajustar foto',
        confirmarDescarte: false,
        corpo: '<div class="recorte"><canvas width="' + TAM_TELA + '" height="' + TAM_TELA + '" aria-label="Pré-visualização da foto"></canvas></div>' +
          '<label class="zoom"><span>Zoom</span><input type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom da foto"></label>' +
          '<span class="dica" style="text-align:center">Arraste a foto para enquadrar o rosto no círculo.</span>',
        aoFechar: function () { fim(null); },
        botoes: [
          { texto: 'Cancelar', acao: 'fechar' },
          { texto: 'Salvar foto', principal: true, aoClicar: function () {
              return new Promise(function (ok) {
                var saida = document.createElement('canvas');
                saida.width = TAM_FINAL; saida.height = TAM_FINAL;
                desenhar(saida.getContext('2d'), TAM_FINAL / TAM_TELA, false);
                saida.toBlob(function (blob) { fim(blob); ok(true); }, 'image/jpeg', 0.85);
              });
            } }
        ]
      });
      var canvas = j.elemento.querySelector('canvas');
      var ctx = canvas.getContext('2d');
      var zoomEl = j.elemento.querySelector('input[type=range]');
      var base = Math.max(TAM_TELA / img.naturalWidth, TAM_TELA / img.naturalHeight); // cobre o quadro
      var zoom = 1, cx = TAM_TELA / 2, cy = TAM_TELA / 2; // centro da imagem no quadro

      function limitar() {
        var w = img.naturalWidth * base * zoom, h = img.naturalHeight * base * zoom;
        cx = Math.min(w / 2, Math.max(TAM_TELA - w / 2, cx));
        cy = Math.min(h / 2, Math.max(TAM_TELA - h / 2, cy));
      }
      function desenhar(c, fator, comMascara) {
        var w = img.naturalWidth * base * zoom * fator, h = img.naturalHeight * base * zoom * fator;
        var t = TAM_TELA * fator;
        c.clearRect(0, 0, t, t);
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, t, t);
        c.drawImage(img, cx * fator - w / 2, cy * fator - h / 2, w, h);
        if (comMascara) {
          c.save();
          c.fillStyle = 'rgba(0,0,0,.55)';
          c.beginPath(); c.rect(0, 0, t, t); c.arc(t / 2, t / 2, t / 2 - 18, 0, Math.PI * 2, true); c.fill('evenodd');
          c.strokeStyle = '#ee7330'; c.lineWidth = 6;
          c.beginPath(); c.arc(t / 2, t / 2, t / 2 - 18, 0, Math.PI * 2); c.stroke();
          c.restore();
        }
      }
      function redesenhar() { limitar(); desenhar(ctx, 1, true); }

      zoomEl.addEventListener('input', function () { zoom = parseFloat(zoomEl.value) || 1; redesenhar(); });
      var arrastando = null;
      canvas.addEventListener('pointerdown', function (e) {
        arrastando = { x: e.clientX, y: e.clientY, cx: cx, cy: cy };
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!arrastando) return;
        var escala = TAM_TELA / canvas.getBoundingClientRect().width;
        cx = arrastando.cx + (e.clientX - arrastando.x) * escala;
        cy = arrastando.cy + (e.clientY - arrastando.y) * escala;
        redesenhar();
      });
      canvas.addEventListener('pointerup', function () { arrastando = null; });
      canvas.addEventListener('pointercancel', function () { arrastando = null; });
      redesenhar();
    });
  }

  // Fluxo completo: escolher → ajustar → enviar → gravar no perfil
  async function trocar(perfil) {
    var arquivo = await escolherArquivo();
    if (!arquivo) return false;
    if (arquivo.size > LIMITE_MB * 1024 * 1024) { ui.toast('A imagem é muito grande. Escolha uma de até ' + LIMITE_MB + ' MB.', 'erro'); return false; }
    var img;
    try { img = await carregarImagem(arquivo); }
    catch (e) { ui.toast('Não foi possível abrir esta imagem. Use uma foto em JPG ou PNG.', 'erro'); return false; }
    var blob = await ajustar(img);
    URL.revokeObjectURL(img.src);
    if (!blob) return false;

    var caminho = perfil.id + '/foto-' + Date.now() + '.jpg';
    var envio = await sb.storage.from(BUCKET).upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
    if (envio.error) { ui.toast(api.traduzErro(envio.error), 'erro'); return false; }
    var anterior = perfil.foto_path;
    var r = await sb.from('perfis').update({ foto_path: caminho }).eq('id', perfil.id).select('id').single();
    if (r.error) {
      await sb.storage.from(BUCKET).remove([caminho]);
      ui.toast(api.traduzErro(r.error), 'erro'); return false;
    }
    perfil.foto_path = caminho;
    if (anterior) { delete cache[anterior]; sb.storage.from(BUCKET).remove([anterior]); }
    ui.toast('Foto atualizada.', 'ok');
    return true;
  }

  async function remover(perfil) {
    if (!perfil.foto_path) return false;
    var ok = await ui.confirmar('Remover a foto?', 'No lugar da foto, voltam a aparecer as suas iniciais.', 'Remover', 'Cancelar');
    if (!ok) return false;
    var anterior = perfil.foto_path;
    var r = await sb.from('perfis').update({ foto_path: null }).eq('id', perfil.id).select('id').single();
    if (r.error) { ui.toast(api.traduzErro(r.error), 'erro'); return false; }
    perfil.foto_path = null;
    delete cache[anterior];
    sb.storage.from(BUCKET).remove([anterior]);
    ui.toast('Foto removida.', 'ok');
    return true;
  }

  window.CF.foto = { urlDe: urlDe, preencherAvatar: preencherAvatar, trocar: trocar, remover: remover };
})();
