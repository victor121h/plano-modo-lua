/* Quiz "Horário da Lua" + resultado + mini VSL + oferta (tudo na mesma página).
   O estado fica no localStorage deste aparelho (inclusive o nome digitado).
   Nenhuma resposta sai do navegador: para o pixel vão só o número da etapa
   e, no carregamento, a faixa de idade e a diferença em minutos (Horario_Calculado). */
(function () {
  'use strict';

  var C = window.CONFIG || {};
  var track = window.luaTrack || function () {};
  var preenchido = window.luaPreenchido || function (v) {
    return typeof v === 'string' && v.trim() !== '' && v.indexOf('PREENCHER') === -1;
  };
  var CHAVE = 'modolua_quiz_v1';

  /* Tempos da oferta. Narração (audio/mini-vsl-helena.mp3): 211 s (3:31).
     A Helena começa a oferta ("Você recebe o plano no celular") aos 153 s
     e fala o preço por volta dos 185 s. Abre o que vier primeiro. */
  var OFERTA_NO_VIDEO_S = 153;   // segundos de vídeo assistido COM SOM
  var OFERTA_NA_PAGINA_S = 180;  // segundos desde que o resultado apareceu
  var PRECO = 27;
  var VIDEO_SRC = 'video/vsl.mp4';
  var VIDEO_POSTER = 'img/helena-poster.jpg';

  var ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var SVG_ESTRELA = '<path d="M12 2c.7 6.3 3.7 9.3 10 10-6.3.7-9.3 3.7-10 10-.7-6.3-3.7-9.3-10-10 6.3-.7 9.3-3.7 10-10z" fill="currentColor"/>';

  /* ---------- Cálculo do Horário da Lua (briefing, seção 7) ---------- */
  var ACORDA = { 'Antes das 6h': 345, 'Entre 6h e 7h': 390, 'Entre 7h e 8h': 450, 'Depois das 8h': 495 };
  var DORME = { 'Antes das 20h': 1185, 'Entre 20h e 21h': 1230, 'Entre 21h e 22h': 1290, 'Entre 22h e 23h': 1350, 'Depois das 23h': 1395 };
  /* sono noturno da faixa, em minutos: [máximo, mínimo] antes da hora de acordar */
  var FAIXAS = {
    '1-2': { texto: '1 a 2 anos', antes: [720, 660] },
    '2-3': { texto: '2 a 3 anos', antes: [690, 630] },
    '3-5': { texto: '3 a 5 anos', antes: [660, 600] }
  };
  var POUSO_MOMENTOS = ['Só dorme no peito, na mamadeira ou no colo', 'Só dorme com alguém deitado junto', 'Só dorme vendo desenho ou celular'];
  var POUSO_MADRUGADA = ['Acorda 2 ou 3 vezes', 'Acorda 4 vezes ou mais', 'Vai para a cama dos pais'];
  var LUZ_TELAS = ['Menos de 1 hora antes', 'A tela faz parte da hora de dormir'];
  var PONTOS = {
    hora: 'Hora da Lua',
    luz: 'Luz da Lua',
    pouso: 'Pouso da Lua'
  };

  /* Telas na ordem. "se" = tela que só aparece em certos casos (não conta como etapa do pixel). */
  var TELAS = [
    { id: 'capa', tipo: 'capa' },
    { id: 'idade', tipo: 'unica', titulo: 'Quantos anos tem a criança?',
      opcoes: ['1 ano a 1 ano e meio', '1 ano e meio a 2 anos', '2 a 3 anos', '3 a 5 anos', 'Menos de 1 ano', 'Mais de 5 anos'] },
    { id: 'bebe', tipo: 'bebe', se: function (r) { return r.idade === 'Menos de 1 ano'; } },
    { id: 'quem', tipo: 'unica', titulo: 'Quem está respondendo?',
      opcoes: ['Mãe', 'Pai', 'Avó ou avô', 'Outro cuidador'] },
    { id: 'acorda', tipo: 'unica', titulo: 'Que horas a criança costuma acordar de manhã?',
      opcoes: ['Antes das 6h', 'Entre 6h e 7h', 'Entre 7h e 8h', 'Depois das 8h'] },
    { id: 'dorme', tipo: 'unica', titulo: 'E que horas ela pega no sono de verdade, à noite?',
      opcoes: ['Antes das 20h', 'Entre 20h e 21h', 'Entre 21h e 22h', 'Entre 22h e 23h', 'Depois das 23h'] },
    { id: 'demora', tipo: 'unica', titulo: 'Do “vamos dormir” até ela dormir, quanto tempo leva?',
      opcoes: ['Menos de 20 minutos', '20 a 40 minutos', '40 minutos a 1 hora', 'Mais de 1 hora'] },
    { id: 'momentos', tipo: 'multipla', titulo: 'O que acontece na hora de dormir?',
      opcoes: ['Fica elétrica, corre e ri', 'Chora ou faz birra', 'Pede água, xixi, mais uma história', 'Só dorme no peito, na mamadeira ou no colo', 'Só dorme com alguém deitado junto', 'Só dorme vendo desenho ou celular', 'Levanta da cama várias vezes'] },
    { id: 'madrugada', tipo: 'unica', titulo: 'E de madrugada, como costuma ser?',
      opcoes: ['Acorda 1 vez', 'Acorda 2 ou 3 vezes', 'Acorda 4 vezes ou mais', 'Vai para a cama dos pais', 'Acorda e demora para voltar a dormir', 'Quase não acorda: o difícil é a hora de dormir'] },
    { id: 'soneca', tipo: 'unica', titulo: 'Ela ainda faz soneca?',
      opcoes: ['Sim, de manhã e à tarde', 'Sim, uma à tarde', 'Às vezes, e às vezes cochila no fim da tarde', 'Não faz mais'] },
    { id: 'telas', tipo: 'unica', titulo: 'Quando é a última tela do dia (TV, celular, tablet)?',
      opcoes: ['Mais de 1 hora antes de dormir', 'Menos de 1 hora antes', 'A tela faz parte da hora de dormir', 'Quase não usa tela'] },
    { id: 'reforco1', tipo: 'reforco1' },
    { id: 'sente', tipo: 'unica', titulo: 'E você, como fica depois da hora de dormir?',
      opcoes: ['Exausta, sem tempo pra nada', 'Sem paciência, às vezes acabo gritando', 'Durmo junto e perco a minha noite', 'Com culpa por não conseguir', 'Um pouco de tudo isso'] },
    { id: 'tentou', tipo: 'multipla', titulo: 'O que você já tentou?',
      opcoes: ['Banho morno e música', 'Deixar brincar até cansar', 'Deixar dormir mais tarde para “cansar”', 'Dar o celular ou um desenho para acalmar', 'Deixar chorar (e não aguentei)', 'Vídeos e dicas da internet', 'Ainda não tentei nada'],
      exclusiva: 'Ainda não tentei nada' },
    { id: 'dia_seguinte', tipo: 'unica', titulo: 'No dia seguinte, o que mais pesa?',
      opcoes: ['Acordo cansada para trabalhar', 'Ela acorda irritada e chorosa', 'Falta tempo para mim e para o casal', 'Tudo isso'] },
    { id: 'reforco2', tipo: 'reforco2' },
    { id: 'crenca', tipo: 'unica', titulo: 'Você concorda que esperar a criança “cansar até apagar” pode estar deixando a hora de dormir mais difícil?',
      opcoes: ['Concordo totalmente', 'Concordo', 'Faz sentido, quero entender melhor'] },
    { id: 'noite', tipo: 'unica', titulo: 'Se a hora de dormir ficasse mais curta e calma, o que você faria com a sua noite?',
      opcoes: ['Descansar de verdade', 'Ter um tempo só meu', 'Ficar com meu parceiro ou parceira', 'Dormir mais cedo também', 'Tudo isso'] },
    { id: 'ritual', tipo: 'unica', titulo: 'Quanto tempo por noite você consegue dar ao ritual?',
      opcoes: ['15 a 20 minutos', '20 a 30 minutos', 'O que for preciso'] },
    { id: 'nome', tipo: 'nome' },
    { id: 'carregando', tipo: 'carregando' },
    { id: 'resultado', tipo: 'resultado' }
  ];

  function indice(id) {
    for (var i = 0; i < TELAS.length; i++) if (TELAS[i].id === id) return i;
    return -1;
  }
  var I_PRIMEIRA = 1;
  var I_NOME = indice('nome');
  var I_RESULTADO = indice('resultado');

  /* Número da etapa para o pixel: capa = 1 ... resultado = 21 (telas condicionais não contam) */
  function etapaDe(i) {
    var n = 0;
    for (var j = 0; j <= i; j++) if (!TELAS[j].se) n++;
    return n;
  }

  /* ---------- Estado ---------- */
  function novoEstado() {
    return { tela: 0, respostas: {}, nome: '', resultadoEm: 0, ofertaAberta: false, calc: null };
  }
  function lerEstado() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (s && typeof s.tela === 'number' && s.tela >= 0 && s.tela < TELAS.length &&
          s.respostas && typeof s.respostas === 'object') {
        if (typeof s.nome !== 'string') s.nome = '';
        return s;
      }
    } catch (e) { /* estado corrompido ou armazenamento bloqueado */ }
    return null;
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* segue sem salvar */ }
  }
  var estado = lerEstado() || novoEstado();

  function aplica(i) {
    var t = TELAS[i];
    return !t.se || t.se(estado.respostas);
  }
  function proxima(i) {
    var j = i + 1;
    while (j < TELAS.length - 1 && !aplica(j)) j++;
    return j;
  }
  function anterior(i) {
    var j = i - 1;
    while (j > 0 && (!aplica(j) || TELAS[j].tipo === 'carregando')) j--;
    return Math.max(0, j);
  }

  /* ---------- DOM ---------- */
  function $(id) { return document.getElementById(id); }
  var raiz = document.documentElement;
  var metaTema = document.querySelector('meta[name="theme-color"]');
  var telaCapa = $('tela-capa');
  var telaQuiz = $('tela-quiz');
  var telaCarregando = $('tela-carregando');
  var telaResultado = $('tela-resultado');
  var conteudo = $('quiz-conteudo');
  var barra = $('progresso-barra');
  var progresso = barra.parentNode;
  var btnVoltar = $('btn-voltar');

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === 'class') n.className = attrs[k];
        else if (k === 'text') n.textContent = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      }
    }
    (filhos || []).forEach(function (f) {
      if (f) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
    return n;
  }

  /* ---------- Horas ---------- */
  function hora(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    return h + 'h' + (m ? (m < 10 ? '0' : '') + m : '');
  }
  function duracao(min) {
    if (min < 60) return min + ' minutos';
    var h = Math.floor(min / 60), m = min % 60;
    return (h === 1 ? '1 hora' : h + ' horas') + (m ? ' e ' + m + ' minutos' : '');
  }
  function faixaDe(idade) {
    if (idade === '2 a 3 anos') return '2-3';
    if (idade === '3 a 5 anos' || idade === 'Mais de 5 anos') return '3-5';
    return '1-2';
  }

  function calcular() {
    var r = estado.respostas;
    var faixa = faixaDe(r.idade);
    var acorda = ACORDA[r.acorda] || ACORDA['Entre 6h e 7h'];
    var dorme = DORME[r.dorme] || DORME['Entre 21h e 22h'];
    var ini = acorda - FAIXAS[faixa].antes[0] + 1440;
    var fim = acorda - FAIXAS[faixa].antes[1] + 1440;
    var dif = dorme - fim;

    var pontos = [];
    if (dif > 30) pontos.push('hora');
    if (LUZ_TELAS.indexOf(r.telas) !== -1) pontos.push('luz');
    var momentos = Array.isArray(r.momentos) ? r.momentos : [];
    var pouso = momentos.some(function (m) { return POUSO_MOMENTOS.indexOf(m) !== -1; }) ||
      POUSO_MADRUGADA.indexOf(r.madrugada) !== -1;
    if (pouso) pontos.push('pouso');
    if (!pontos.length) pontos.push('luz');

    return {
      faixa: faixa,
      acorda: acorda,
      dorme: dorme,
      ini: ini,
      fim: fim,
      dif: dif,
      ajustes: dif > 0 ? Math.ceil(dif / 15) : 0,
      pontos: pontos.slice(0, 2)
    };
  }

  function explicacao(p, c) {
    if (p === 'hora') return 'adiante 15 minutos a cada 2 ou 3 noites: são ' + c.ajustes + ' ajustes até a janela.';
    if (p === 'luz') return 'telas desligadas 1 hora antes, casa em meia-luz e um ritual de 20 a 30 minutos, sempre na mesma ordem.';
    return 'ela pega no sono na caminha dela, com você perto, e você vai saindo em 4 degraus, sem deixar chorar sozinha.';
  }
  function fraseDiferenca(c) {
    return c.dif > 0
      ? 'Hoje ela pega no sono cerca de ' + duracao(c.dif) + ' depois do Horário da Lua: é a zona do segundo gás.'
      : 'O horário já está perto do relógio dela.';
  }

  /* ---------- Navegação ---------- */
  var timerAvanco = null;

  function mostrar(i, modo) {
    i = Math.max(0, Math.min(i, TELAS.length - 1));
    if (!aplica(i)) i = modo === 'voltar' ? anterior(i) : proxima(i);
    var t = TELAS[i];
    if (timerAvanco) { clearTimeout(timerAvanco); timerAvanco = null; }
    estado.tela = i;
    salvar();

    /* Pixel primeiro, antes de qualquer campo ser preenchido na tela. Só o número da etapa. */
    if (modo === 'avancar' || modo === 'inicio') {
      if (t.se) track('trackCustom', 'Quiz_Aviso_Bebe');
      else track('trackCustom', 'Quiz_Etapa', { etapa: etapaDe(i) });
    }
    /* Histórico do navegador: o "voltar" do celular volta uma pergunta */
    try {
      if (modo === 'avancar') history.pushState({ tela: i }, '');
      else if (modo === 'inicio' || modo === 'voltar') history.replaceState({ tela: i }, '');
    } catch (e) { /* sem histórico, segue normal */ }

    pararCarregamento();
    var noite = t.tipo === 'capa' || t.tipo === 'carregando';
    raiz.classList.toggle('fundo-noite', noite);
    if (metaTema) metaTema.setAttribute('content', noite ? '#1F2A44' : '#FBF6EC');

    var ehQuiz = ['capa', 'carregando', 'resultado'].indexOf(t.tipo) === -1;
    telaCapa.hidden = t.tipo !== 'capa';
    telaQuiz.hidden = !ehQuiz;
    telaCarregando.hidden = t.tipo !== 'carregando';
    telaResultado.hidden = t.tipo !== 'resultado';

    if (t.tipo !== 'resultado') pausarVideo();
    if (ehQuiz) desenharQuiz(t, i);
    else if (t.tipo === 'carregando') iniciarCarregamento();
    else if (t.tipo === 'resultado') mostrarResultado(modo);

    window.scrollTo(0, 0);
    raiz.classList.remove('restaurando');
  }

  function avancar() { mostrar(proxima(estado.tela), 'avancar'); }

  window.addEventListener('popstate', function (e) {
    var alvo = e.state && typeof e.state.tela === 'number' ? e.state.tela : 0;
    if (alvo < 0 || alvo >= TELAS.length) alvo = 0;
    if (TELAS[alvo].tipo === 'carregando') alvo = I_NOME; /* nunca volta para o carregamento */
    mostrar(alvo, 'historico');
  });

  /* ---------- Telas do quiz ---------- */
  function desenharQuiz(t, i) {
    var total = 0, pos = 0;
    for (var j = I_PRIMEIRA; j <= I_NOME; j++) {
      if (!aplica(j)) continue;
      total++;
      if (j <= i) pos++;
    }
    var pct = Math.round(pos / total * 100);
    barra.style.width = pct + '%';
    progresso.setAttribute('aria-valuenow', String(pct));
    progresso.setAttribute('aria-valuetext', 'Etapa ' + pos + ' de ' + total);

    conteudo.innerHTML = '';
    if (t.tipo === 'unica' || t.tipo === 'multipla') desenharPergunta(t);
    else if (t.tipo === 'bebe') desenharBebe();
    else if (t.tipo === 'reforco1') desenharReforco1();
    else if (t.tipo === 'reforco2') desenharReforco2();
    else if (t.tipo === 'nome') desenharNome();

    var h = conteudo.querySelector('h2');
    if (h) {
      h.setAttribute('tabindex', '-1');
      try { h.focus({ preventScroll: true }); } catch (e) { /* ok */ }
    }
  }

  function marcar(botao, ligado, multipla) {
    botao.classList.toggle('selecionada', ligado);
    botao.setAttribute(multipla ? 'aria-checked' : 'aria-pressed', ligado ? 'true' : 'false');
  }

  function botaoContinuar(texto, acao) {
    var b = el('button', { type: 'button', class: 'btn', text: texto || 'Continuar' });
    b.addEventListener('click', acao);
    return b;
  }

  function desenharPergunta(t) {
    var multipla = t.tipo === 'multipla';
    var resp = estado.respostas[t.id];
    var selecionadas = multipla ? (Array.isArray(resp) ? resp.slice() : []) : null;
    var tituloId = 'q-' + t.id;
    var btnCont = null;

    conteudo.appendChild(el('h2', { class: 'q-titulo', id: tituloId, text: t.titulo }));
    if (multipla) conteudo.appendChild(el('p', { class: 'q-dica', text: 'Pode marcar mais de uma.' }));

    var lista = el('div', { class: 'opcoes', role: 'group', 'aria-labelledby': tituloId });

    function atualizar() {
      var filhos = lista.children;
      for (var k = 0; k < filhos.length; k++) {
        marcar(filhos[k], selecionadas.indexOf(filhos[k].getAttribute('data-op')) !== -1, true);
      }
      btnCont.disabled = selecionadas.length === 0;
    }

    t.opcoes.forEach(function (op) {
      var b = el('button', {
        type: 'button',
        class: 'opcao' + (multipla ? ' opcao--check' : ''),
        'data-op': op
      }, [el('span', { text: op }), el('span', { class: 'marca', 'aria-hidden': 'true', html: ICONE_CHECK })]);
      if (multipla) b.setAttribute('role', 'checkbox');
      marcar(b, multipla ? selecionadas.indexOf(op) !== -1 : resp === op, multipla);

      b.addEventListener('click', function () {
        if (multipla) {
          var k = selecionadas.indexOf(op);
          if (k === -1) {
            if (t.exclusiva) {
              if (op === t.exclusiva) selecionadas = [];
              else selecionadas = selecionadas.filter(function (x) { return x !== t.exclusiva; });
            }
            selecionadas.push(op);
          } else {
            selecionadas.splice(k, 1);
          }
          estado.respostas[t.id] = selecionadas.slice();
          salvar();
          atualizar();
        } else {
          if (timerAvanco) return; /* evita toque duplo */
          estado.respostas[t.id] = op;
          salvar();
          var filhos = lista.children;
          for (var j = 0; j < filhos.length; j++) marcar(filhos[j], filhos[j] === b, false);
          timerAvanco = setTimeout(function () { timerAvanco = null; avancar(); }, 260);
        }
      });
      lista.appendChild(b);
    });
    conteudo.appendChild(lista);

    if (multipla) {
      btnCont = botaoContinuar('Continuar', function () { if (selecionadas.length) avancar(); });
      conteudo.appendChild(el('div', { class: 'rodape-fixo' }, [btnCont]));
      atualizar();
    }
  }

  /* Tela à parte para "Menos de 1 ano" */
  function desenharBebe() {
    conteudo.appendChild(el('h2', { class: 'q-titulo', text: 'Um cuidado antes de seguir' }));
    conteudo.appendChild(el('div', { class: 'aviso-bebe' }, [
      el('p', { text: 'Antes de 1 ano, o sono ainda está amadurecendo, e as mamadas da noite podem ser normais. O mais importante agora é o sono seguro: de barriga para cima, no berço, sem travesseiro, protetor, pelúcias ou cobertas soltas (Sociedade Brasileira de Pediatria).' }),
      el('p', { text: 'Fale com o pediatra sobre o sono do seu bebê. O Plano Modo Lua é para crianças de 1 a 5 anos.' })
    ]));
    var seguir = botaoContinuar('Entendi, quero ver o teste mesmo assim', avancar);
    var voltar = el('button', { type: 'button', class: 'btn btn--secundario', text: 'Voltar' });
    voltar.addEventListener('click', function () { mostrar(indice('idade'), 'voltar'); });
    conteudo.appendChild(el('div', { class: 'acoes-bebe' }, [seguir, voltar]));
  }

  function relogioSvg() {
    /* Relógio com a lua no 8 e um raio no 10 */
    var marcas = '';
    for (var h = 0; h < 12; h++) {
      var a = h * Math.PI / 6;
      var x1 = 84 + Math.sin(a) * 66, y1 = 84 - Math.cos(a) * 66;
      var x2 = 84 + Math.sin(a) * 72, y2 = 84 - Math.cos(a) * 72;
      marcas += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#1F2A44" stroke-width="' + (h % 3 === 0 ? 3 : 1.6) + '" stroke-linecap="round"/>';
    }
    return '<svg class="relogio" viewBox="0 0 168 168" role="img" aria-label="Relógio com uma lua no 8 e um raio no 10">' +
      '<circle cx="84" cy="84" r="80" fill="#DCE3F0" stroke="#1F2A44" stroke-width="4"/>' + marcas +
      /* lua no 8 (x = 84 - 0,866·50; y = 84 + 0,5·50) */
      '<g transform="translate(40.7 109)"><defs><mask id="mk-lua-rel"><rect x="-14" y="-14" width="28" height="28" fill="#fff"/><circle cx="6" cy="-5" r="10" fill="#000"/></mask></defs><circle r="12" fill="#F4C95D" stroke="#1F2A44" stroke-width="1.5" mask="url(#mk-lua-rel)"/></g>' +
      /* raio no 10 */
      '<g transform="translate(40.7 59)"><path d="M3-13L-8 2h7l-3 12L9-3H2z" fill="#F4C95D" stroke="#1F2A44" stroke-width="1.6" stroke-linejoin="round"/></g>' +
      /* ponteiros nas 10h */
      '<line x1="84" y1="84" x2="62" y2="71" stroke="#1F2A44" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="84" y1="84" x2="84" y2="34" stroke="#1F2A44" stroke-width="3.4" stroke-linecap="round"/>' +
      '<circle cx="84" cy="84" r="5" fill="#1F2A44"/></svg>';
  }

  function desenharReforco1() {
    conteudo.appendChild(el('div', { class: 'reforco' }, [
      el('h2', { class: 'q-titulo', text: 'Isso tem nome: segundo gás.' }),
      el('div', { html: relogioSvg() }),
      el('p', { text: 'O relógio da criança pequena é cedo. Com 1 ano, ela costuma começar o sono por volta das 20h; de 3 a 5 anos, por volta das 21h (Sociedade Brasileira de Pediatria). Quando passa desse ponto, muitas crianças não ficam mais sonolentas: ficam mais agitadas. Parece que perderam o sono. A gente acha que ela não está com sono e deixa mais tarde. E o segundo gás cresce.' })
    ]));
    conteudo.appendChild(el('div', { class: 'rodape-fixo' }, [botaoContinuar('Continuar', avancar)]));
  }

  function desenharReforco2() {
    var cartao = el('div', { class: 'cartao-lua' }, [
      el('span', { class: 'estrelinha', 'aria-hidden': 'true', style: 'right:16px;top:16px', html: '<svg width="12" height="12" viewBox="0 0 24 24">' + SVG_ESTRELA + '</svg>' }),
      el('span', { class: 'estrelinha', 'aria-hidden': 'true', style: 'right:36px;top:34px', html: '<svg width="7" height="7" viewBox="0 0 24 24">' + SVG_ESTRELA + '</svg>' }),
      el('p', { class: 'cl-topo', text: '🌙 Horário da Lua · 2 anos · acorda às 7h' }),
      el('ul', null, [
        el('li', null, [el('span', { text: 'Soneca' }), el('b', { text: 'até as 15h' })]),
        el('li', null, [el('span', { text: 'Telas desligadas' }), el('b', { text: 'às 18h30' })]),
        el('li', null, [el('span', { text: 'Ritual' }), el('b', { text: 'às 19h' })]),
        el('li', null, [el('span', { text: 'Luz apagada' }), el('b', { text: 'entre 19h30 e 20h30' })])
      ])
    ]);
    conteudo.appendChild(el('div', { class: 'reforco' }, [
      el('h2', { class: 'q-titulo', text: 'Ela não precisa cansar mais. Precisa deitar antes.' }),
      cartao,
      el('p', { html: 'Sem deixar chorar sozinha. Acertando a hora, a luz e o pouso. <strong>Isso é o Modo Lua.</strong>' })
    ]));
    conteudo.appendChild(el('div', { class: 'rodape-fixo' }, [botaoContinuar('Continuar', avancar)]));
  }

  function limparNome(v) {
    v = String(v || '').replace(/\s+/g, ' ').trim().split(' ')[0].slice(0, 24);
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
  }

  function desenharNome() {
    conteudo.appendChild(el('h2', { class: 'q-titulo', id: 'q-nome', text: 'Como você quer ser chamada no seu resultado?' }));
    conteudo.appendChild(el('p', { class: 'q-dica', text: 'Só o primeiro nome. É opcional.' }));
    /* Campo fora de <form> e sem atributos de "nome", para nenhum script de terceiros identificar */
    var campo = el('input', {
      class: 'campo', id: 'q-apelido', type: 'text', maxlength: '24',
      autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false',
      enterkeyhint: 'go', placeholder: 'Ex.: Ana', 'aria-labelledby': 'q-nome'
    });
    campo.value = estado.nome || '';
    conteudo.appendChild(campo);
    conteudo.appendChild(el('p', { class: 'privacidade', text: '🔒 O seu nome fica só neste aparelho e não é enviado para lugar nenhum.' }));

    function concluir(nome) {
      estado.nome = nome;
      salvar();
      avancar();
    }
    var ver = botaoContinuar('Ver meu Horário da Lua', function () { concluir(limparNome(campo.value)); });
    var pular = el('button', { type: 'button', class: 'link-discreto', text: 'pular' });
    pular.addEventListener('click', function () { concluir(''); });
    campo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); concluir(limparNome(campo.value)); }
    });
    conteudo.appendChild(el('div', { class: 'acoes-nome' }, [ver, pular]));
  }

  /* ---------- Carregamento (~6 s) ---------- */
  var timersCarregando = [];
  function pararCarregamento() {
    timersCarregando.forEach(clearTimeout);
    timersCarregando = [];
  }
  function iniciarCarregamento() {
    prepararVideo(); /* o vídeo começa a baixar enquanto a animação roda */
    estado.calc = calcular();
    salvar();
    track('trackCustom', 'Horario_Calculado', { faixa: estado.calc.faixa, diferenca_min: estado.calc.dif });

    var itens = telaCarregando.querySelectorAll('.passos-carregando li');
    for (var k = 0; k < itens.length; k++) itens[k].className = '';
    itens[0].className = 'ativo';
    function passo(ms, fn) { timersCarregando.push(setTimeout(fn, ms)); }
    passo(2000, function () { itens[0].className = 'feito'; itens[1].className = 'ativo'; });
    passo(4000, function () { itens[1].className = 'feito'; itens[2].className = 'ativo'; });
    passo(6000, function () { itens[2].className = 'feito'; });
    passo(6500, function () { mostrar(I_RESULTADO, 'avancar'); });
  }

  /* ---------- Resultado ---------- */
  function textoIdade(idade) {
    return idade || 'não informada';
  }
  function avisoIdade(idade) {
    if (idade === 'Mais de 5 anos') return 'O plano foi feito até 5 anos; para crianças maiores, use os passos 2 e 3.';
    if (idade === 'Menos de 1 ano') return 'O Plano Modo Lua é para crianças de 1 a 5 anos. Antes de 1 ano, as mamadas da noite podem ser normais e o mais importante é o sono seguro: converse com o pediatra. O horário acima é o da faixa de 1 a 2 anos, só como referência para depois do primeiro aniversário.';
    return '';
  }

  function mostrarResultado(modo) {
    var r = estado.respostas;
    var c = estado.calc || calcular();
    estado.calc = c;
    $('res-titulo').textContent = estado.nome
      ? estado.nome + ', o Horário da Lua está pronto'
      : 'O seu Horário da Lua está pronto';
    $('res-idade').textContent = textoIdade(r.idade);
    $('res-acorda').textContent = hora(c.acorda);
    $('res-janela-ini').textContent = hora(c.ini);
    $('res-janela-fim').textContent = hora(c.fim);
    $('res-dorme').textContent = hora(c.dorme);
    $('res-diferenca').textContent = fraseDiferenca(c);

    var nomes = c.pontos.map(function (p) { return PONTOS[p]; });
    $('res-ponto-titulo').textContent = 'O seu ponto de partida: ' + nomes.join(' e ');
    var caixa = $('res-pontos');
    caixa.innerHTML = '';
    c.pontos.forEach(function (p) {
      caixa.appendChild(el('span', null, [el('b', { text: PONTOS[p] + ': ' }), explicacao(p, c)]));
    });
    var aviso = avisoIdade(r.idade);
    $('res-aviso-idade').textContent = aviso;
    $('res-aviso-idade').hidden = !aviso;

    if (!estado.resultadoEm) { estado.resultadoEm = Date.now(); }
    salvar();
    if (modo !== 'historico') track('track', 'ViewContent', { content_name: 'Plano Modo Lua' });

    iniciarVideo();
    if (estado.ofertaAberta) abrirOferta('restaurada', true);
    else if (videoFalhou) abrirOferta('erro_video');
    else agendarOferta();

    try { $('res-titulo').focus({ preventScroll: true }); } catch (e) { /* ok */ }
  }

  /* ---------- "Salvar meu resultado": gera uma imagem do cartão, só neste aparelho ---------- */
  function quebrar(ctx, texto, largura) {
    var palavras = String(texto).split(' '), linhas = [], linha = '';
    palavras.forEach(function (p) {
      var teste = linha ? linha + ' ' + p : p;
      if (ctx.measureText(teste).width > largura && linha) { linhas.push(linha); linha = p; }
      else linha = teste;
    });
    if (linha) linhas.push(linha);
    return linhas;
  }
  function desenharLua(ctx, x, y, r, cor, fundo) {
    ctx.save();
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fundo;
    ctx.beginPath(); ctx.arc(x + r * 0.55, y - r * 0.45, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function gerarImagem(pronto) {
    var r = estado.respostas, c = estado.calc || calcular();
    var W = 1080, H = 1350, M = 84;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var NOITE = '#1F2A44', LUA = '#F4C95D', CREME = '#FBF6EC', NEVOA = '#DCE3F0', NOITE2 = '#2B3858';
    var T = '"Fraunces", Georgia, serif', F = '"Figtree", system-ui, sans-serif';

    ctx.fillStyle = NOITE; ctx.fillRect(0, 0, W, H);
    /* estrelas */
    ctx.fillStyle = 'rgba(251,246,236,.6)';
    [[160, 80, 5], [420, 56, 3.5], [620, 110, 4], [760, 60, 3], [290, 126, 3], [985, 290, 4], [1030, 470, 3]].forEach(function (s) {
      ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, Math.PI * 2); ctx.fill();
    });
    desenharLua(ctx, 930, 140, 70, LUA, NOITE);

    var y = 210;
    ctx.fillStyle = NEVOA; ctx.font = '700 34px ' + F;
    ctx.fillText('HORÁRIO DA LUA', M, y);
    y += 74;
    ctx.fillStyle = CREME; ctx.font = '700 60px ' + T;
    var titulo = estado.nome ? 'O Horário da Lua de ' + estado.nome : 'O meu Horário da Lua';
    quebrar(ctx, titulo, W - 2 * M - 140).forEach(function (l) { ctx.fillText(l, M, y); y += 70; });

    y += 20;
    ctx.fillStyle = NEVOA; ctx.font = '500 36px ' + F;
    ctx.fillText('Idade: ' + textoIdade(r.idade) + '  ·  acorda às ' + hora(c.acorda), M, y);

    /* caixa da janela */
    y += 46;
    ctx.fillStyle = NOITE2;
    var bx = M, bw = W - 2 * M, bh = 200;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, y, bw, bh, 28); else ctx.rect(bx, y, bw, bh);
    ctx.fill();
    ctx.fillStyle = NEVOA; ctx.font = '600 34px ' + F;
    ctx.fillText('Luz apagada entre', bx + 40, y + 70);
    ctx.fillStyle = LUA; ctx.font = '700 80px ' + T;
    ctx.fillText(hora(c.ini) + ' e ' + hora(c.fim), bx + 40, y + 160);
    y += bh + 70;

    ctx.fillStyle = CREME; ctx.font = '500 34px ' + F;
    var linhas = quebrar(ctx, 'Hoje: pega no sono por volta das ' + hora(c.dorme) + '. ' + fraseDiferenca(c), W - 2 * M);
    linhas.forEach(function (l) { ctx.fillText(l, M, y); y += 46; });

    y += 24;
    ctx.fillStyle = LUA; ctx.font = '700 36px ' + F;
    ctx.fillText('Ponto de partida', M, y);
    y += 52;
    c.pontos.forEach(function (p) {
      ctx.fillStyle = CREME; ctx.font = '700 34px ' + F;
      ctx.fillText('• ' + PONTOS[p], M, y);
      y += 44;
      ctx.fillStyle = NEVOA; ctx.font = '400 30px ' + F;
      quebrar(ctx, explicacao(p, c), W - 2 * M - 36).forEach(function (l) { ctx.fillText(l, M + 36, y); y += 40; });
      y += 14;
    });

    ctx.fillStyle = 'rgba(220,227,240,.75)'; ctx.font = '400 24px ' + F;
    var rod = quebrar(ctx, 'Plano Modo Lua · Estimativa feita com a tabela de horas de sono da Sociedade Brasileira de Pediatria. Não é avaliação médica.', W - 2 * M);
    var yr = H - 60 - (rod.length - 1) * 32;
    rod.forEach(function (l) { ctx.fillText(l, M, yr); yr += 32; });

    pronto(cv);
  }

  function abrirModalImagem(url) {
    var fechar = el('button', { type: 'button', class: 'link-discreto', text: 'Fechar' });
    var baixar = el('a', { class: 'btn', href: url, download: 'horario-da-lua.png', text: 'Baixar imagem' });
    var modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Seu Horário da Lua em imagem' }, [
      el('div', { class: 'modal-caixa' }, [
        el('img', { src: url, alt: 'Cartão com o seu Horário da Lua', width: '1080', height: '1350' }),
        el('p', { text: 'Toque e segure na imagem para salvar, ou tire um print. A imagem é feita aqui no seu aparelho.' }),
        baixar,
        fechar
      ])
    ]);
    function sair() {
      document.removeEventListener('keydown', esc);
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      try { $('btn-salvar').focus(); } catch (e) { /* ok */ }
    }
    function esc(e) { if (e.key === 'Escape') sair(); }
    fechar.addEventListener('click', sair);
    modal.addEventListener('click', function (e) { if (e.target === modal) sair(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(modal);
    try { baixar.focus(); } catch (e) { /* ok */ }
  }

  var urlImagem = null;
  $('btn-salvar').addEventListener('click', function () {
    var fontes = [];
    try {
      if (document.fonts && document.fonts.load) {
        fontes = [document.fonts.load('700 60px "Fraunces"'), document.fonts.load('700 34px "Figtree"'), document.fonts.load('400 30px "Figtree"')];
      }
    } catch (e) { /* segue com as fontes do sistema */ }
    Promise.all(fontes).catch(function () {}).then(function () {
      gerarImagem(function (cv) {
        if (urlImagem) { try { URL.revokeObjectURL(urlImagem); } catch (e) { /* ok */ } urlImagem = null; }
        if (cv.toBlob) {
          cv.toBlob(function (blob) {
            urlImagem = blob ? URL.createObjectURL(blob) : cv.toDataURL('image/png');
            abrirModalImagem(urlImagem);
          }, 'image/png');
        } else {
          abrirModalImagem(cv.toDataURL('image/png'));
        }
      });
    });
  });

  /* ---------- Mini VSL ---------- */
  var video = $('vsl-video');
  var btnSom = $('vsl-som');
  var btnToque = $('vsl-toque');
  var barraVsl = $('vsl-barra');
  var progVsl = $('vsl-progresso');
  var comSom = false;
  var videoPreparado = false;

  function prepararVideo() {
    if (videoPreparado) return;
    videoPreparado = true;
    video.setAttribute('poster', VIDEO_POSTER);
    video.preload = 'auto';
    video.src = VIDEO_SRC;
  }
  function tocar() {
    var p = video.play();
    if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay bloqueado: o botão "Toque para ouvir" continua lá */ });
  }
  function pausarVideo() { if (videoPreparado && !video.paused) video.pause(); }
  function iniciarVideo() {
    prepararVideo();
    if (videoFalhou) return;
    if (!comSom) { video.muted = true; video.loop = true; }
    if (video.paused) tocar();
  }

  btnSom.addEventListener('click', function () {
    comSom = true;
    video.muted = false;
    video.loop = false;
    try { video.currentTime = 0; } catch (e) { /* ainda sem dados */ }
    tocar();
    btnSom.hidden = true;
    btnToque.hidden = false;
    barraVsl.hidden = false;
    track('trackCustom', 'VSL_Play');
  });

  btnToque.addEventListener('click', function () {
    if (video.ended) { try { video.currentTime = 0; } catch (e) { /* ok */ } }
    if (video.paused) tocar(); else video.pause();
  });
  video.addEventListener('play', function () {
    btnToque.classList.remove('pausado');
    btnToque.setAttribute('aria-label', 'Pausar o vídeo');
  });
  video.addEventListener('pause', function () {
    if (!comSom) return;
    btnToque.classList.add('pausado');
    btnToque.setAttribute('aria-label', 'Continuar o vídeo');
  });
  video.addEventListener('timeupdate', function () {
    if (!comSom) return;
    if (video.duration) progVsl.style.width = Math.min(100, video.currentTime / video.duration * 100) + '%';
    if (video.currentTime >= OFERTA_NO_VIDEO_S) abrirOferta('video');
  });
  video.addEventListener('ended', function () { if (comSom) abrirOferta('video'); });
  var videoFalhou = false;
  video.addEventListener('error', function () {
    if (!videoPreparado) return;
    videoFalhou = true;
    btnSom.hidden = true;
    btnToque.hidden = true;
    barraVsl.hidden = true;
    $('vsl-erro').hidden = false;
    /* sem vídeo, ninguém fica esperando: a oferta abre assim que o resultado estiver na tela */
    if (!telaResultado.hidden) abrirOferta('erro_video');
  });

  /* ---------- Oferta ---------- */
  var timerOferta = null;
  var ofertaVisivel = false;

  function agendarOferta() {
    if (ofertaVisivel || timerOferta) return;
    var falta = OFERTA_NA_PAGINA_S * 1000 - (Date.now() - (estado.resultadoEm || Date.now()));
    timerOferta = setTimeout(function () { timerOferta = null; abrirOferta('tempo'); }, Math.max(0, falta));
  }

  function abrirOferta(origem, silencioso) {
    if (ofertaVisivel) return;
    ofertaVisivel = true;
    if (timerOferta) { clearTimeout(timerOferta); timerOferta = null; }
    var oferta = $('oferta');
    oferta.hidden = false;
    $('ler-oferta').hidden = true;
    if (!silencioso) oferta.classList.add('oferta-abre');
    if (!estado.ofertaAberta) { estado.ofertaAberta = true; salvar(); }
    if (!silencioso) track('trackCustom', 'VSL_Oferta', { origem: origem });
    if (origem === 'link') {
      var topo = $('oferta-topo');
      if (topo && topo.scrollIntoView) topo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ---------- Checkout (Cakto) ---------- */
  var indoAoCheckout = false;
  function urlCheckout(base) {
    return window.luaComParametros ? window.luaComParametros(base) : base;
  }
  function irParaCheckout(e) {
    e.preventDefault();
    if (!preenchido(C.CHECKOUT_URL)) return; /* checkout ainda não configurado no config.js */
    if (indoAoCheckout) return;
    indoAoCheckout = true;
    /* Parte do link como está agora (com o que o UTMify tiver acrescentado) e completa o que faltar */
    var atual = this.getAttribute('href');
    var url = urlCheckout(atual && atual !== '#' ? atual : C.CHECKOUT_URL);
    track('track', 'InitiateCheckout', { value: PRECO, currency: 'BRL' });
    /* pequena espera só quando há pixel, para o evento sair antes de trocar de página */
    setTimeout(function () { window.location.href = url; }, typeof window.fbq === 'function' ? 300 : 0);
    setTimeout(function () { indoAoCheckout = false; }, 4000);
  }
  function configurarCheckout() {
    var links = document.querySelectorAll('[data-checkout]');
    var href = preenchido(C.CHECKOUT_URL) ? urlCheckout(C.CHECKOUT_URL) : '#';
    for (var k = 0; k < links.length; k++) {
      links[k].setAttribute('href', href);
      links[k].addEventListener('click', irParaCheckout);
    }
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) indoAoCheckout = false; });

  /* ---------- Início ---------- */
  function refazer() {
    pausarVideo();
    if (timerOferta) { clearTimeout(timerOferta); timerOferta = null; }
    estado = novoEstado();
    salvar();
    comSom = false;
    btnSom.hidden = !$('vsl-erro').hidden; /* se o vídeo falhou, o botão continua escondido */
    btnToque.hidden = true;
    barraVsl.hidden = true;
    progVsl.style.width = '0';
    ofertaVisivel = false;
    $('oferta').hidden = true;
    $('oferta').classList.remove('oferta-abre');
    $('ler-oferta').hidden = false;
    mostrar(0, 'avancar');
  }

  configurarCheckout();
  $('btn-comecar').addEventListener('click', avancar);
  $('btn-ler-oferta').addEventListener('click', function () { abrirOferta('link'); });
  $('btn-refazer').addEventListener('click', refazer);
  btnVoltar.addEventListener('click', function () {
    mostrar(anterior(estado.tela), 'voltar');
  });

  mostrar(estado.tela, 'inicio');
})();
