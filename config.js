/* =====================================================================
   CONFIG DO FUNIL · Plano Modo Lua
   ---------------------------------------------------------------------
   Este é o ÚNICO arquivo com dados de conta. Troque cada "PREENCHER".
   Enquanto um valor tiver a palavra PREENCHER, o site ignora o item
   (o pixel não carrega, o botão de compra não sai da página etc.).
   Passo a passo no SITE_README.md (pasta do produto 3).
   ===================================================================== */
window.CONFIG = {
  // Meta (Facebook): Gerenciador de Eventos > fonte de dados do MODO LUA > ID do pixel (só números).
  // Use um pixel próprio do Modo Lua, separado dos outros produtos.
  PIXEL_ID: "28165559309792835", // pixel PROSPE (conta de anúncios 02), escolhido pelo Victor em 22/11

  // UTMify: o valor de window.pixelId que aparece no código do pixel do UTMify.
  UTMIFY_PIXEL_ID: "PREENCHER",

  // Link do checkout da Cakto do produto principal (Plano Modo Lua, R$ 27).
  CHECKOUT_URL: "https://pay.cakto.com.br/7p4coem_1356837",

  // Endereço publicado do site (GitHub Pages). As URLs dos upsells são montadas a partir dele.
  SITE_URL: "https://plano-modo-lua.replit.app",

  // Fim do funil (último upsell/downsell).
  // "members_area" = valor especial da Cakto: o botão leva a pessoa direto para a área de membros
  // (já logada, quando ela aceita a oferta). Se trocar por uma URL comum (https://...), o fim do
  // funil passa a ser a página obrigado.html, com um botão para essa URL.
  AREA_MEMBROS_URL: "members_area",

  // Taxa de serviço que a Cakto cobra do comprador no checkout (hoje R$ 0,99, configuração da conta Cakto).
  // Enquanto tiver valor, as páginas mostram "+ R$ 0,99 de taxa de serviço da plataforma" perto de cada preço,
  // para o preço da página bater com o do checkout. Se a taxa for desligada na Cakto, deixe "" (vazio).
  TAXA_SERVICO: "0,99",

  // E-mail de suporte (aparece no rodapé de todas as páginas).
  // Enquanto estiver "PREENCHER", a linha de suporte fica escondida no site.
  SUPORTE_EMAIL: "PREENCHER",

  // offer-id de cada oferta de upsell/downsell, copiado da Cakto.
  OFFER_ID: {
    up1: "a7gfpwq", // Upsell 1   · Modo Lua Sob Medida  · R$ 67
    ds1: "8ovowmn", // Downsell 1 · Modo Lua Sob Medida  · R$ 37
    up2: "35gce3i", // Upsell 2   · Noite Sem Medo       · R$ 47
    ds2: "jub7qj3", // Downsell 2 · Noite Sem Medo       · R$ 27
    up3: "5prkrz7", // Upsell 3   · Revezamento da Noite · R$ 37
    ds3: "37y5ftp"  // Downsell 3 · Revezamento da Noite · R$ 19,90
  }
};
