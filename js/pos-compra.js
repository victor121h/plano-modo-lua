/* Páginas depois da compra: upsells, downsells e obrigado.
   Monta o botão de um clique da Cakto com o offer-id do config.js e as URLs
   absolutas do próximo passo, e dispara o Upsell_View no pixel. */
(function () {
  'use strict';

  var C = window.CONFIG || {};
  var track = window.luaTrack || function () {};
  var preenchido = window.luaPreenchido || function (v) {
    return typeof v === 'string' && v.trim() !== '' && v.indexOf('PREENCHER') === -1;
  };

  /* Cor do botão: amarelo-lua com texto azul-noite (contraste ~9:1), como no briefing. */
  var COR_BOTAO = '#F4C95D';
  var COR_TEXTO = '#1F2A44';
  var SCRIPT_CAKTO = 'https://caktoscripts.nyc3.cdn.digitaloceanspaces.com/upsell.js';

  /* Vídeos curtos da Helena nas páginas de upsell (video/up1.mp4, up2.mp4, up3.mp4).
     Deixe false até os arquivos estarem na pasta video/; com true, cada upsell mostra o seu. */
  var VIDEOS_UPSELL_PRONTOS = false;

  /* URL absoluta a partir do SITE_URL do config (ou do endereço atual, se ainda não preenchido) */
  function urlAbsoluta(pagina) {
    var base = preenchido(C.SITE_URL)
      ? C.SITE_URL.replace(/\/+$/, '') + '/'
      : new URL('.', window.location.href).href;
    return new URL(pagina, base).href;
  }

  function ehUrl(v) { return typeof v === 'string' && /^https?:\/\//i.test(v.trim()) && preenchido(v); }

  /* "fim" = fim do funil. Com AREA_MEMBROS_URL = "members_area", a própria Cakto leva a pessoa
     para a área de membros; senão, o fim é a página obrigado.html. */
  var MEMBROS_CAKTO = C.AREA_MEMBROS_URL === 'members_area';
  function destino(valor) {
    if (valor === 'fim') return MEMBROS_CAKTO ? 'members_area' : urlAbsoluta('obrigado.html');
    return urlAbsoluta(valor);
  }

  /* ---------- Botão de um clique da Cakto ---------- */
  var area = document.getElementById('cakto-area');
  if (area) {
    var oferta = area.getAttribute('data-oferta');
    var offerId = (C.OFFER_ID || {})[oferta] || '';
    var aceitar = destino(area.getAttribute('data-aceitar'));
    var recusar = destino(area.getAttribute('data-recusar'));

    /* Atributos definidos ANTES de carregar o script da Cakto (ele lê tudo ao conectar o elemento) */
    var grupo = document.createElement('cakto-upsell-buttons');
    var sim = document.createElement('cakto-upsell-accept');
    sim.setAttribute('bg-color', COR_BOTAO);
    sim.setAttribute('text-color', COR_TEXTO);
    sim.setAttribute('offer-id', offerId);
    sim.setAttribute('offer-type', area.getAttribute('data-tipo') || 'upsell');
    sim.setAttribute('app-base-url', 'https://app.cakto.com.br');
    sim.setAttribute('upsell-accept-url', aceitar);
    sim.setAttribute('upsell-reject-url', recusar);
    sim.textContent = area.getAttribute('data-texto-sim') || 'Sim, quero adicionar';

    var nao = document.createElement('cakto-upsell-reject');
    nao.setAttribute('upsell-reject-url', recusar);
    nao.textContent = 'Não, obrigada. Continuar sem isso';

    grupo.appendChild(sim);
    grupo.appendChild(nao);
    area.appendChild(grupo);

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = SCRIPT_CAKTO;
    s.onerror = function () {
      /* Se o script da Cakto não carregar, a pessoa não fica presa: mostra um "continuar" simples */
      area.innerHTML = '';
      var p = document.createElement('p');
      p.className = 'nota-up';
      p.textContent = 'Não foi possível carregar o botão agora. Sua compra principal já está garantida.';
      var a = document.createElement('a');
      a.className = 'link-discreto';
      a.href = recusar === 'members_area' ? urlAbsoluta('obrigado.html') : recusar;
      a.textContent = 'Continuar';
      area.appendChild(p);
      area.appendChild(a);
    };
    document.body.appendChild(s);
  }

  /* ---------- Vídeo curto da Helena (só nos upsells, quando VIDEOS_UPSELL_PRONTOS = true) ---------- */
  var caixaVideo = document.querySelector('[data-video]');
  if (caixaVideo && VIDEOS_UPSELL_PRONTOS) {
    var v = document.createElement('video');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.controls = true;
    v.preload = 'metadata';
    v.poster = caixaVideo.getAttribute('data-poster') || '';
    v.addEventListener('error', function () { caixaVideo.hidden = true; });
    v.src = caixaVideo.getAttribute('data-video');
    caixaVideo.appendChild(v);
    caixaVideo.hidden = false;
  }

  /* ---------- Área de membros (página de obrigado) ---------- */
  var linksArea = document.querySelectorAll('[data-area-membros]');
  for (var i = 0; i < linksArea.length; i++) {
    if (ehUrl(C.AREA_MEMBROS_URL)) {
      linksArea[i].setAttribute('href', C.AREA_MEMBROS_URL.trim());
    } else {
      linksArea[i].hidden = true; /* "members_area" ou vazio: o acesso segue pelo e-mail da Cakto */
    }
  }

  /* ---------- Dica personalizada no obrigado (lê o resultado salvo neste aparelho) ---------- */
  var dica = document.getElementById('dica-lua');
  if (dica) {
    var NOMES = { hora: 'Hora da Lua', luz: 'Luz da Lua', pouso: 'Pouso da Lua' };
    var hora = function (min) {
      min = ((Math.round(min) % 1440) + 1440) % 1440;
      var h = Math.floor(min / 60), m = min % 60;
      return h + 'h' + (m ? (m < 10 ? '0' : '') + m : '');
    };
    try {
      var q = JSON.parse(localStorage.getItem('modolua_quiz_v1') || 'null');
      var c = q && q.calc;
      if (c && typeof c.ini === 'number' && typeof c.fim === 'number' && Array.isArray(c.pontos) && c.pontos.length) {
        var ponto = NOMES[c.pontos[0]] || 'Hora da Lua';
        dica.textContent = 'O Horário da Lua dela, que ficou trancado no teste: luz apagada entre ' + hora(c.ini) + ' e ' + hora(c.fim) + '. Hoje à noite, comece pela ' + ponto + '.';
      }
    } catch (e) { /* sem quiz salvo: fica o texto padrão */ }
  }

  /* ---------- Pixel ---------- */
  var pagina = document.body.getAttribute('data-pagina');
  if (pagina && pagina !== 'obrigado') track('trackCustom', 'Upsell_View', { pagina: pagina });
})();
