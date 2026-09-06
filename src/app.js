/* ============================================================
   Inglaterra 2026 — app de viagem (11 a 19 de setembro de 2026)
   React + htm, sem build. Tudo em localStorage, funciona offline.
   ============================================================ */
(function () {
  'use strict';

  var h = React.createElement;
  var useState = React.useState,
    useEffect = React.useEffect,
    useMemo = React.useMemo,
    useRef = React.useRef;

  /* ---------------------------------------------------------
     1. Tempo — tudo em horário de Londres (Europe/London)
     --------------------------------------------------------- */
  var TZ = 'Europe/London';
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  var _fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  function partsIn(ms) {
    var p = {};
    _fmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return {
      y: +p.year, m: +p.month, d: +p.day,
      hh: +p.hour % 24, mm: +p.minute, ss: +p.second
    };
  }

  /** Deslocamento (min) do fuso de Londres num dado instante UTC. */
  function offsetAt(ms) {
    var p = partsIn(ms);
    return (Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss) - Math.floor(ms / 1000) * 1000) / 60000;
  }

  /** "2026-09-13" + "15:05" (hora de Londres) -> epoch ms. */
  function londonEpoch(dateStr, timeStr) {
    var a = dateStr.split('-'), b = (timeStr || '00:00').split(':');
    var guess = Date.UTC(+a[0], +a[1] - 1, +a[2], +b[0], +b[1]);
    var off = offsetAt(guess);
    var ts = guess - off * 60000;
    off = offsetAt(ts);
    return guess - off * 60000;
  }

  /** Agora, já convertido para Londres. */
  function nowLondon(ms) {
    var p = partsIn(ms);
    return {
      ms: ms,
      date: p.y + '-' + pad(p.m) + '-' + pad(p.d),
      hhmm: pad(p.hh) + ':' + pad(p.mm),
      hhmmss: pad(p.hh) + ':' + pad(p.mm) + ':' + pad(p.ss)
    };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function weekdayOf(dateStr) {
    var a = dateStr.split('-');
    return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])).getUTCDay();
  }
  function dmOf(dateStr) {
    var a = dateStr.split('-');
    return +a[2] + ' de ' + MESES[+a[1] - 1];
  }
  function ddmm(dateStr) {
    var a = dateStr.split('-');
    return a[2] + '/' + a[1];
  }

  /** "Domingo, 13 de setembro" */
  function longDate(dateStr) {
    return DIAS[weekdayOf(dateStr)] + ', ' + dmOf(dateStr);
  }

  /** Contagem regressiva legível. */
  function humanDelta(msLeft) {
    var s = Math.max(0, Math.floor(msLeft / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var hh = Math.floor(s / 3600); s -= hh * 3600;
    var mi = Math.floor(s / 60); s -= mi * 60;
    if (d > 0) return d + (d === 1 ? ' dia ' : ' dias ') + hh + 'h ' + pad(mi) + 'min';
    if (hh > 0) return hh + 'h ' + pad(mi) + 'min';
    if (mi > 0) return mi + 'min ' + pad(s) + 's';
    return s + 's';
  }

  /* ---------------------------------------------------------
     2. Ícones (SVG simples, monocromáticos)
     --------------------------------------------------------- */
  var PATHS = {
    voo: 'M2.5 19.5l19-7.5-19-7.5 4.5 7.5-4.5 7.5zM7 12h14',
    trem: 'M5 3h14v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V3zM5 8h14M8.5 13h.01M15.5 13h.01M8 17l-2.5 4M16 17l2.5 4',
    jogo: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 7l4.5 3.3-1.7 5.3h-5.6L7.5 10.3 12 7zM12 2v5M20.6 9l-4.1 1.3M18.3 19.6l-3.5-4.1M5.7 19.6l3.5-4.1M3.4 9l4.1 1.3',
    museu: 'M3 10l9-6 9 6M5 10v9M9.5 10v9M14.5 10v9M19 10v9M3 21h18M3 10h18',
    refeicao: 'M6 2v9a2.5 2.5 0 0 0 5 0V2M8.5 11v11M17.5 2c-1.5 1.5-2 3.5-2 6 0 2 .7 3 2 3.2V22',
    hotel: 'M3 20V7l9-4 9 4v13M3 20h18M9 20v-6h6v6M9.5 10.5h.01M14.5 10.5h.01',
    livre: 'M12 2l2.6 6.6L21.5 9l-5.2 4.6 1.6 6.9L12 16.9 6.1 20.5l1.6-6.9L2.5 9l6.9-.4L12 2z'
  };
  var TYPE_LABEL = {
    voo: 'Voo', trem: 'Trem', jogo: 'Jogo', museu: 'Museu',
    refeicao: 'Comida', hotel: 'Hotel', livre: 'Livre'
  };
  var TYPES = ['voo', 'trem', 'jogo', 'museu', 'refeicao', 'hotel', 'livre'];

  function Icon(p) {
    var d = PATHS[p.name] || PATHS.livre;
    return h('svg', {
      width: p.size || 18, height: p.size || 18, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: p.w || 1.7,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true'
    }, h('path', { d: d }));
  }

  function Glyph(p) {
    var d = {
      check: 'M4 12.5l5 5L20 6.5',
      left: 'M15 5l-7 7 7 7',
      right: 'M9 5l7 7-7 7',
      down: 'M6 9l6 6 6-6',
      plus: 'M12 5v14M5 12h14',
      x: 'M6 6l12 12M18 6L6 18',
      pen: 'M4 20h4L20 8l-4-4L4 16v4z',
      trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
      gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15h-.3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.5 8.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z',
      home: 'M3 10.5L12 3l9 7.5V21H3V10.5zM9 21v-7h6v7',
      list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
      gift: 'M20 12v9H4v-9M2 7h20v5H2V7zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z',
      bag: 'M6 2l-2 5h16l-2-5H6zM4 7h16v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zM9 11a3 3 0 0 0 6 0'
    }[p.name];
    return h('svg', {
      width: p.size || 20, height: p.size || 20, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: p.w || 2,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true'
    }, h('path', { d: d }));
  }

  /* ---------------------------------------------------------
     3. Roteiro — dados iniciais
     --------------------------------------------------------- */
  function it(id, time, title, type, fixed, place, note) {
    return {
      id: id, time: time, title: title, type: type,
      fixed: !!fixed, place: place || '', note: note || '', done: false
    };
  }

  var SEED_DAYS = [
    {
      id: 'd1', date: '2026-09-11', city: 'Londres', items: [
        it('d1a', '15:05', 'Pousa em Heathrow', 'voo', true, 'Terminal 3', 'Voo LA8084 de Guarulhos'),
        it('d1b', '16:00', 'Elizabeth line até Liverpool Street', 'trem', false, 'Heathrow → Liverpool Street', ''),
        it('d1c', '17:30', 'Check-in no Hart Shoreditch', 'hotel', false, 'Great Eastern St', ''),
        it('d1d', '19:30', 'Jantar em Shoreditch', 'refeicao', false, '', 'Noite livre, dormir cedo')
      ]
    },
    {
      id: 'd2', date: '2026-09-12', city: 'Londres', items: [
        it('d2a', '09:00', 'Torre de Londres', 'museu', true, 'Tower of London', 'Ingresso comprado, entrada por data. Ir direto às Joias da Coroa antes da fila'),
        it('d2b', '11:30', 'Tower Bridge a pé', 'livre', false, 'Tower Bridge', ''),
        it('d2c', '12:30', 'Almoço no Borough Market', 'refeicao', false, 'Borough Market', ''),
        it('d2d', '16:00', 'Sair pro estádio', 'trem', false, 'Overground: Liverpool Street → White Hart Lane', ''),
        it('d2e', '17:30', 'Tottenham x Everton', 'jogo', true, 'Tottenham Hotspur Stadium', ''),
        it('d2f', '20:00', 'Noite livre em Shoreditch', 'livre', false, '', '')
      ]
    },
    {
      id: 'd3', date: '2026-09-13', city: 'Londres', items: [
        it('d3a', '09:00', 'Columbia Road Flower Market', 'livre', false, 'Columbia Road', 'Só funciona domingo, 8h–15h'),
        it('d3b', '11:00', 'Brick Lane', 'livre', false, 'Brick Lane', 'Mercado de domingo'),
        it('d3c', '13:00', 'Sunday roast', 'refeicao', false, '', 'Harwood Arms, Blacklock Soho ou The Marksman'),
        it('d3d', '15:30', 'Tate Modern e South Bank', 'museu', false, 'Bankside', 'Caminhada pela South Bank depois'),
        it('d3e', '19:30', 'Noite livre', 'livre', false, '', '')
      ]
    },
    {
      id: 'd4', date: '2026-09-14', city: 'Londres → Manchester', items: [
        it('d4a', '09:30', 'Check-out do hotel de Londres', 'hotel', false, 'Hart Shoreditch', 'Deixar a mala grande guardada na recepção até dia 17'),
        it('d4b', '10:13', 'Trem London Euston → Manchester Piccadilly', 'trem', true, 'London Euston', 'Chega 12:19'),
        it('d4c', '12:45', 'Check-in no hotel de Manchester', 'hotel', false, '', ''),
        it('d4d', '13:15', 'Almoço no Northern Quarter', 'refeicao', false, 'Northern Quarter', ''),
        it('d4e', '14:15', 'Metrolink até Old Trafford', 'trem', false, '', ''),
        it('d4f', '15:00', 'Tour do Old Trafford + Museu', 'museu', true, 'Old Trafford', ''),
        it('d4g', '18:00', 'Northern Quarter', 'livre', false, '', 'Piccadilly Records, Vinyl Exchange, Afflecks'),
        it('d4h', '20:00', 'Jantar e pub', 'refeicao', false, '', 'Mackie Mayor, Peveril of the Peak')
      ]
    },
    {
      id: 'd5', date: '2026-09-15', city: 'Manchester → Liverpool', items: [
        it('d5a', '09:30', 'Check-out em Manchester', 'hotel', false, '', ''),
        it('d5b', '10:00', 'National Football Museum', 'museu', false, 'Cathedral Gardens', ''),
        it('d5c', '11:45', 'Caminhar até Piccadilly', 'livre', false, '', ''),
        it('d5d', '12:07', 'Trem Manchester Piccadilly → Liverpool Lime Street', 'trem', true, 'Manchester Piccadilly', 'Chega 13:00'),
        it('d5e', '13:30', 'Check-in no School Lane Hotel', 'hotel', false, 'School Lane, L1', ''),
        it('d5f', '14:30', 'Royal Albert Dock e Museum of Liverpool', 'museu', false, 'Royal Albert Dock', ''),
        it('d5g', '17:00', 'Cavern Quarter e Mathew Street', 'livre', false, 'Mathew Street', ''),
        it('d5h', '20:00', 'Jantar na Bold Street', 'refeicao', false, 'Bold Street', '')
      ]
    },
    {
      id: 'd6', date: '2026-09-16', city: 'Liverpool', items: [
        it('d6a', '09:20', 'Ônibus pro Anfield', 'trem', false, '', ''),
        it('d6b', '10:00', 'LFC Stadium Tour and Museum', 'museu', true, 'Anfield', ''),
        it('d6c', '12:30', 'Volta ao centro, almoço', 'refeicao', false, '', ''),
        it('d6d', '14:30', 'Liverpool Cathedral', 'museu', false, 'St James Mount', 'Subir a torre'),
        it('d6e', '16:00', 'Metropolitan Cathedral', 'museu', false, 'Mount Pleasant', ''),
        it('d6f', '19:00', 'Baltic Triangle', 'livre', false, '', 'Ye Cracke ou Philharmonic Dining Rooms')
      ]
    },
    {
      id: 'd7', date: '2026-09-17', city: 'Liverpool → Londres', items: [
        it('d7a', '09:15', 'Check-out em Liverpool', 'hotel', false, '', ''),
        it('d7b', '10:08', 'Trem Liverpool Lime Street → London Euston', 'trem', true, 'Liverpool Lime Street', 'Chega 12:30'),
        it('d7c', '13:15', 'Check-in no Hart Shoreditch', 'hotel', false, 'Great Eastern St', 'Recuperar a mala grande'),
        it('d7d', '14:30', 'Abbey Road', 'livre', false, "St John's Wood (linha Jubilee)", 'É rua aberta, sem ingresso. Atravessar com cuidado, tem carro'),
        it('d7e', '16:30', 'Camden', 'livre', false, 'Camden Town', 'Hawley Arms, The Black Heart, Camden Market'),
        it('d7f', '20:00', 'Jantar em Camden', 'refeicao', false, '', '')
      ]
    },
    {
      id: 'd8', date: '2026-09-18', city: 'Londres', items: [
        it('d8a', '09:30', 'Churchill War Rooms', 'museu', true, 'King Charles Street', 'Ingresso com horário marcado, chegar 15 min antes'),
        it('d8b', '11:30', 'Abadia de Westminster', 'museu', false, 'Westminster Abbey', ''),
        it('d8c', '12:00', 'Big Ben e Parliament Square', 'livre', false, 'Parliament Square', 'Badaladas ao meio-dia'),
        it('d8d', '13:15', "Almoço em St James's", 'refeicao', false, "St James's", ''),
        it('d8e', '14:30', 'British Museum', 'museu', false, 'Great Russell St', 'Gratuito, reservar slot online'),
        it('d8f', '19:00', 'Última noite — Shoreditch', 'livre', false, 'Shoreditch', '')
      ]
    },
    {
      id: 'd9', date: '2026-09-19', city: 'Londres → São Paulo', items: [
        it('d9a', '10:30', 'Check-out, deixar mala na recepção', 'hotel', false, 'Hart Shoreditch', ''),
        it('d9b', '11:15', 'Sair pro estádio', 'trem', false, '', ''),
        it('d9c', '12:30', 'Tottenham x Aston Villa', 'jogo', true, 'Tottenham Hotspur Stadium', ''),
        it('d9d', '15:30', 'Voltar ao hotel e pegar a mala', 'hotel', false, '', ''),
        it('d9e', '17:30', 'Elizabeth line até Heathrow', 'trem', false, 'Liverpool Street → Heathrow', 'Cerca de 40 min'),
        it('d9f', '21:20', 'Voo LA8085 Heathrow → Guarulhos', 'voo', true, 'Heathrow', 'Chega 04:45 do dia 20')
      ]
    }
  ];

  var SEED_LEVAR = [
    'Passaporte português', 'Adaptador de tomada tipo G', 'Carregador',
    'Fone de ouvido', 'Casaco corta-vento', 'Guarda-chuva pequeno',
    'Tênis confortável', 'Comprovante do seguro viagem'
  ];

  var TRIP_START = SEED_DAYS[0].date;
  var TRIP_END = SEED_DAYS[SEED_DAYS.length - 1].date;

  /* ---------------------------------------------------------
     4. Persistência local
     --------------------------------------------------------- */
  var KEY = 'inglaterra2026';
  var VERSION = 1;

  function uid(p) {
    return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function freshState() {
    return {
      version: VERSION,
      days: JSON.parse(JSON.stringify(SEED_DAYS)),
      gifts: [],
      checklist: {
        levar: SEED_LEVAR.map(function (t) { return { id: uid('l'), text: t, done: false }; }),
        trazer: []
      }
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return freshState();
      var s = JSON.parse(raw);
      if (!s || s.version !== VERSION || !Array.isArray(s.days)) return freshState();
      if (!s.gifts) s.gifts = [];
      if (!s.checklist) s.checklist = { levar: [], trazer: [] };
      if (!s.checklist.levar) s.checklist.levar = [];
      if (!s.checklist.trazer) s.checklist.trazer = [];
      return s;
    } catch (e) {
      return freshState();
    }
  }

  function saveState(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* quota / modo privado */ }
  }

  /* ---------------------------------------------------------
     5. Componentes reutilizáveis
     --------------------------------------------------------- */
  function sortItems(items) {
    return items.slice().sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
  }

  function Sheet(p) {
    useEffect(function () {
      var prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function () { document.body.style.overflow = prev; };
    }, []);
    return h('div', {
      className: 'scrim',
      onClick: function (e) { if (e.target === e.currentTarget) p.onClose(); }
    }, h('div', { className: 'sheet' },
      h('div', { className: 'grab' }),
      p.title ? h('h3', null, p.title) : null,
      p.children
    ));
  }

  function Bar(p) {
    var pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return h('div', { className: 'bar' + (p.sm ? ' sm' : '') },
      h('i', { style: { width: pct + '%' } }));
  }

  function Check(p) {
    return h('button', {
      className: 'chk' + (p.on ? ' on' : ''),
      onClick: p.onClick,
      'aria-label': p.on ? 'Desmarcar' : 'Marcar como feito'
    }, h(Glyph, { name: 'check', size: 14, w: 3 }));
  }

  function ItemRow(p) {
    var i = p.item, st = p.status;
    var cls = 'item' + (i.fixed ? ' fixed' : '') + (i.done ? ' done' : '') +
      (st === 'past' || i.done ? ' past' : '') +
      (st === 'current' ? ' current' : '');
    return h('div', { className: cls },
      h(Check, { on: i.done, onClick: p.onToggle }),
      h('div', { className: 'it-body' },
        h('div', { className: 'it-top' },
          h('span', { className: 'ic' }, h(Icon, { name: i.type })),
          h('span', { className: 'it-time' }, i.time),
          i.fixed ? h('span', { className: 'badge-fix' }, 'FIXO') : null,
          st === 'current' ? h('span', { className: 'now-tag' }, 'AGORA') : null
        ),
        h('div', { className: 'it-title' }, i.title),
        i.place ? h('div', { className: 'it-place' }, i.place) : null,
        i.note ? h('div', { className: 'it-note' }, i.note) : null
      ),
      p.onEdit ? h('button', {
        className: 'it-edit', onClick: p.onEdit, 'aria-label': 'Editar compromisso'
      }, h(Glyph, { name: 'pen', size: 16 })) : null
    );
  }

  /** Formulário de criar/editar compromisso. */
  function ItemForm(p) {
    var base = p.item || { time: '12:00', title: '', place: '', note: '', type: 'livre', fixed: false };
    var s = useState({
      time: base.time, title: base.title, place: base.place,
      note: base.note, type: base.type, fixed: base.fixed
    });
    var f = s[0], set = s[1];
    function upd(k, v) {
      set(function (prev) { var n = Object.assign({}, prev); n[k] = v; return n; });
    }
    return h(Sheet, { onClose: p.onClose, title: p.item ? 'Editar compromisso' : 'Novo compromisso' },
      h('div', { className: 'field' },
        h('label', null, 'Horário (Londres)'),
        h('input', {
          className: 'input', type: 'time', value: f.time,
          onChange: function (e) { upd('time', e.target.value); }
        })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Título'),
        h('input', {
          className: 'input', type: 'text', value: f.title, placeholder: 'O que é',
          onChange: function (e) { upd('title', e.target.value); }
        })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Local'),
        h('input', {
          className: 'input', type: 'text', value: f.place, placeholder: 'Opcional',
          onChange: function (e) { upd('place', e.target.value); }
        })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Nota'),
        h('textarea', {
          className: 'input', value: f.note, placeholder: 'Opcional',
          onChange: function (e) { upd('note', e.target.value); }
        })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Tipo'),
        h('div', { className: 'types' }, TYPES.map(function (t) {
          return h('button', {
            key: t, className: 'typebtn' + (f.type === t ? ' on' : ''),
            onClick: function () { upd('type', t); }
          }, h(Icon, { name: t, size: 19 }), h('span', null, TYPE_LABEL[t]));
        }))
      ),
      h('div', { className: 'field' },
        h('button', {
          className: 'switch', onClick: function () { upd('fixed', !f.fixed); }
        },
          h('span', null,
            h('b', null, 'Compromisso fixo'),
            h('div', { className: 'tiny muted' }, 'Hora marcada, ingresso comprado')
          ),
          h('span', { className: 'track' + (f.fixed ? ' on' : '') }, h('i', null))
        )
      ),
      h('button', {
        className: 'btn primary',
        onClick: function () {
          if (!f.title.trim()) return;
          p.onSave({
            time: f.time || '00:00', title: f.title.trim(), place: f.place.trim(),
            note: f.note.trim(), type: f.type, fixed: f.fixed
          });
        }
      }, 'Salvar'),
      p.onDelete ? h('div', { style: { marginTop: '10px' } }, h('button', {
        className: 'btn danger',
        onClick: function () {
          if (confirm('Excluir "' + base.title + '" do roteiro?')) p.onDelete();
        }
      }, h(Glyph, { name: 'trash', size: 17 }), 'Excluir compromisso')) : null
    );
  }

  /* ---------------------------------------------------------
     6. Aba HOJE
     --------------------------------------------------------- */
  function statusOf(dayDate, items, i, nowL) {
    if (dayDate < nowL.date) return 'past';
    if (dayDate > nowL.date) return 'future';
    var t = items[i].time;
    var nxt = items[i + 1] ? items[i + 1].time : null;
    if (nowL.hhmm < t) return 'future';
    if (nxt && nowL.hhmm >= nxt) return 'past';
    return 'current';
  }

  function dayProgress(day) {
    var done = day.items.filter(function (x) { return x.done; }).length;
    return { done: done, total: day.items.length };
  }

  function TabHoje(p) {
    var st = p.st, api = p.api, nowL = p.nowL;
    var days = st.days;
    var todayIdx = -1;
    for (var k = 0; k < days.length; k++) if (days[k].date === nowL.date) todayIdx = k;
    var phase = nowL.date < TRIP_START ? 'antes' : (nowL.date > TRIP_END ? 'depois' : 'durante');

    var vs = useState(null), view = vs[0], setView = vs[1];
    var es = useState(null), editing = es[0], setEditing = es[1];
    var as = useState(false), adding = as[0], setAdding = as[1];

    var fallback = todayIdx >= 0 ? todayIdx : (phase === 'antes' ? 0 : days.length - 1);
    var idx = view === null ? fallback : Math.min(Math.max(view, 0), days.length - 1);
    var day = days[idx];
    var items = sortItems(day.items);
    var prog = dayProgress(day);

    /* próximo compromisso de toda a viagem */
    var next = null;
    var firstUpcoming = null;
    for (var di = 0; di < days.length; di++) {
      var dd = days[di], ii = sortItems(dd.items);
      for (var j = 0; j < ii.length; j++) {
        var ep = londonEpoch(dd.date, ii[j].time);
        if (ep > p.now) {
          if (!firstUpcoming) firstUpcoming = { day: dd, item: ii[j], ep: ep };
          if (!ii[j].done && !next) next = { day: dd, item: ii[j], ep: ep };
        }
      }
    }
    if (!next) next = firstUpcoming;

    var cabecalho = h('div', { className: 'daynav' },
      h('button', {
        className: 'nav', disabled: idx <= 0,
        onClick: function () { setView(idx - 1); }, 'aria-label': 'Dia anterior'
      }, h(Glyph, { name: 'left', size: 20 })),
      h('div', { className: 'mid' },
        h('b', null, 'Dia ' + (idx + 1) + ' — ' + longDate(day.date)),
        h('div', { className: 'sub' }, day.city)
      ),
      h('button', {
        className: 'nav', disabled: idx >= days.length - 1,
        onClick: function () { setView(idx + 1); }, 'aria-label': 'Próximo dia'
      }, h(Glyph, { name: 'right', size: 20 }))
    );

    var destaque;
    if (phase === 'antes') {
      var start = londonEpoch(days[0].date, sortItems(days[0].items)[0].time);
      destaque = h('div', { className: 'next' },
        h('div', { className: 'label' }, 'A viagem ainda não começou'),
        h('h2', null, 'Inglaterra 2026'),
        h('div', { className: 'where' }, '11 a 19 de setembro · Londres, Manchester e Liverpool'),
        h('div', { className: 'cd' },
          h('span', { className: 'big' }, humanDelta(start - p.now)),
          h('span', { className: 'hh' }, 'até o pouso')
        ),
        h('div', { className: 'tiny muted', style: { marginTop: '8px' } },
          'Voo LA8084 · Guarulhos → Heathrow, pousa 15:05 (Londres) de sexta, 11 de setembro')
      );
    } else if (phase === 'depois') {
      var tot = 0, fez = 0, fixos = 0, fixosFeitos = 0;
      days.forEach(function (d) {
        d.items.forEach(function (x) {
          tot++; if (x.done) fez++;
          if (x.fixed) { fixos++; if (x.done) fixosFeitos++; }
        });
      });
      var gtot = 0, gcomp = 0;
      st.gifts.forEach(function (g) {
        g.ideas.forEach(function (x) { gtot++; if (x.bought) gcomp++; });
      });
      var tz = st.checklist.trazer;
      var destaques = [];
      days.forEach(function (d, di) {
        d.items.forEach(function (x) {
          if (x.fixed) destaques.push({ d: d, di: di, x: x });
        });
      });
      destaque = h('div', { className: 'next' },
        h('div', { className: 'label' }, 'Viagem concluída'),
        h('h2', null, 'Foram 9 dias na Inglaterra'),
        h('div', { className: 'where' }, '11 a 19 de setembro de 2026'),
        h('div', { style: { marginTop: '14px' } },
          h('div', { className: 'totals' },
            h('div', { className: 'tot' }, h('div', { className: 'k' }, 'Compromissos'), h('div', { className: 'v' }, fez + ' / ' + tot)),
            h('div', { className: 'tot' }, h('div', { className: 'k' }, 'Fixos'), h('div', { className: 'v' }, fixosFeitos + ' / ' + fixos)),
            h('div', { className: 'tot' }, h('div', { className: 'k' }, 'Presentes'), h('div', { className: 'v' }, gcomp + ' / ' + gtot)),
            h('div', { className: 'tot' }, h('div', { className: 'k' }, 'Trazer'), h('div', { className: 'v' }, tz.filter(function (x) { return x.done; }).length + ' / ' + tz.length))
          )
        ),
        h('div', { className: 'hr' }),
        h('div', { className: 'tiny muted', style: { fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' } }, 'OS COMPROMISSOS FIXOS'),
        destaques.map(function (o) {
          return h('div', {
            key: o.x.id, className: 'row small',
            style: { padding: '4px 0', opacity: o.x.done ? 1 : .45 }
          },
            h('span', { style: { color: o.x.done ? 'var(--ok)' : 'var(--dim2)', display: 'flex' } },
              h(Glyph, { name: o.x.done ? 'check' : 'x', size: 14, w: 2.6 })),
            h('span', { className: 'muted', style: { minWidth: '46px' } }, 'Dia ' + (o.di + 1)),
            h('span', { style: { flex: 1, minWidth: 0 } }, o.x.title)
          );
        })
      );
    } else if (next) {
      var left = next.ep - p.now;
      var mesmoDia = next.day.date === nowL.date;
      var soon = left < 60 * 60 * 1000;
      destaque = h('div', { className: 'next' },
        h('div', { className: 'label' }, 'Próximo' + (mesmoDia ? '' : ' · ' + DIAS_CURTO[weekdayOf(next.day.date)] + ' ' + ddmm(next.day.date))),
        h('h2', null, next.item.title),
        h('div', { className: 'where' },
          next.item.place ? next.item.place : next.day.city,
          next.item.fixed ? ' · ingresso/hora fixa' : ''),
        h('div', { className: 'cd' },
          h('span', { className: 'big' + (soon ? ' soon' : '') }, humanDelta(left)),
          h('span', { className: 'hh' }, next.item.time)
        )
      );
    } else {
      destaque = h('div', { className: 'next' },
        h('div', { className: 'label' }, 'Último dia'),
        h('h2', null, 'Nada mais na agenda'),
        h('div', { className: 'where' }, 'Aproveite o resto do dia')
      );
    }

    return h('div', { className: 'page' },
      destaque,
      h('div', { style: { height: '14px' } }),
      cabecalho,
      h('div', { className: 'spread', style: { margin: '0 2px 10px' } },
        idx === todayIdx
          ? h('span', { className: 'pill accent' }, 'Hoje')
          : (todayIdx >= 0 || idx !== fallback)
            ? h('button', {
              className: 'pill', onClick: function () { setView(null); }
            }, h(Glyph, { name: 'home', size: 13, w: 2.2 }),
              todayIdx >= 0 ? 'Voltar para hoje' : (phase === 'antes' ? 'Voltar ao Dia 1' : 'Voltar ao Dia 9'))
            : h('span', { className: 'pill' }, phase === 'antes' ? 'Antes da viagem' : 'Viagem encerrada'),
        h('span', { className: 'pill' + (prog.done === prog.total && prog.total ? ' ok' : '') },
          prog.done + ' de ' + prog.total + ' feitos')
      ),
      items.length === 0
        ? h('div', { className: 'empty' }, 'Nenhum compromisso neste dia.')
        : items.map(function (item, i) {
          return h(ItemRow, {
            key: item.id, item: item,
            status: statusOf(day.date, items, i, nowL),
            onToggle: function () { api.toggleItem(day.id, item.id); },
            onEdit: function () { setEditing(item); }
          });
        }),
      h('button', {
        className: 'btn ghost', style: { marginTop: '4px' },
        onClick: function () { setAdding(true); }
      }, h(Glyph, { name: 'plus', size: 18 }), 'Adicionar compromisso neste dia'),
      editing ? h(ItemForm, {
        item: editing,
        onClose: function () { setEditing(null); },
        onSave: function (v) { api.saveItem(day.id, editing.id, v); setEditing(null); },
        onDelete: function () { api.deleteItem(day.id, editing.id); setEditing(null); }
      }) : null,
      adding ? h(ItemForm, {
        onClose: function () { setAdding(false); },
        onSave: function (v) { api.addItem(day.id, v); setAdding(false); }
      }) : null
    );
  }

  /* ---------------------------------------------------------
     7. Aba ROTEIRO
     --------------------------------------------------------- */
  function TabRoteiro(p) {
    var st = p.st, api = p.api, nowL = p.nowL;
    var days = st.days;

    var os = useState(function () {
      var o = {};
      days.forEach(function (d) { if (d.date === nowL.date) o[d.id] = true; });
      if (nowL.date < TRIP_START) o[days[0].id] = true;
      return o;
    });
    var open = os[0], setOpen = os[1];
    var es = useState(null), editing = es[0], setEditing = es[1];
    var as = useState(null), adding = as[0], setAdding = as[1];

    var tot = 0, fez = 0;
    days.forEach(function (d) {
      d.items.forEach(function (x) { tot++; if (x.done) fez++; });
    });

    return h('div', { className: 'page' },
      h('div', { className: 'card' },
        h('div', { className: 'spread', style: { marginBottom: '9px' } },
          h('b', null, 'Progresso da viagem'),
          h('span', { className: 'small muted' }, fez + ' de ' + tot + ' feitos')
        ),
        h(Bar, { done: fez, total: tot })
      ),
      h('div', { className: 'sectitle' }, '9 dias · 11 a 19 de setembro'),
      days.map(function (day, idx) {
        var items = sortItems(day.items);
        var pr = dayProgress(day);
        var isToday = day.date === nowL.date;
        var isOpen = !!open[day.id];
        return h('div', { key: day.id },
          h('button', {
            className: 'dayhead' + (isOpen ? ' open' : '') + (isToday ? ' today' : ''),
            onClick: function () {
              setOpen(function (o) {
                var n = Object.assign({}, o); n[day.id] = !n[day.id]; return n;
              });
            }
          },
            h('span', { className: 'daynum' },
              h('b', null, idx + 1),
              h('span', null, DIAS_CURTO[weekdayOf(day.date)])
            ),
            h('span', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 700, fontSize: '15px' } },
                ddmm(day.date) + ' · ' + day.city),
              h('div', { className: 'tiny muted', style: { marginTop: '3px' } },
                pr.done + ' de ' + pr.total + ' feitos' + (isToday ? ' · hoje' : '')),
              h('div', { style: { marginTop: '6px' } }, h(Bar, { done: pr.done, total: pr.total, sm: true }))
            ),
            h('span', { className: 'chev' + (isOpen ? ' open' : '') }, h(Glyph, { name: 'down', size: 18 }))
          ),
          isOpen ? h('div', { className: 'daybody' },
            items.map(function (item, i) {
              return h(ItemRow, {
                key: item.id, item: item,
                status: statusOf(day.date, items, i, nowL),
                onToggle: function () { api.toggleItem(day.id, item.id); },
                onEdit: function () { setEditing({ dayId: day.id, item: item }); }
              });
            }),
            h('button', {
              className: 'btn ghost', style: { marginBottom: '8px' },
              onClick: function () { setAdding(day.id); }
            }, h(Glyph, { name: 'plus', size: 18 }), 'Adicionar compromisso')
          ) : null
        );
      }),
      editing ? h(ItemForm, {
        item: editing.item,
        onClose: function () { setEditing(null); },
        onSave: function (v) { api.saveItem(editing.dayId, editing.item.id, v); setEditing(null); },
        onDelete: function () { api.deleteItem(editing.dayId, editing.item.id); setEditing(null); }
      }) : null,
      adding ? h(ItemForm, {
        onClose: function () { setAdding(null); },
        onSave: function (v) { api.addItem(adding, v); setAdding(null); }
      }) : null
    );
  }

  /* ---------------------------------------------------------
     8. Aba PRESENTES
     --------------------------------------------------------- */
  function money(n) {
    return '£ ' + (Number(n) || 0).toFixed(2).replace('.', ',');
  }

  function GiftForm(p) {
    var base = p.gift || { desc: '', price: '', where: '' };
    var s = useState({
      desc: base.desc, price: base.price === null || base.price === undefined ? '' : String(base.price),
      where: base.where || ''
    });
    var f = s[0], set = s[1];
    function upd(k, v) {
      set(function (prev) { var n = Object.assign({}, prev); n[k] = v; return n; });
    }
    return h(Sheet, { onClose: p.onClose, title: p.gift ? 'Editar presente' : 'Nova ideia de presente' },
      h('div', { className: 'field' },
        h('label', null, 'O que é'),
        h('input', {
          className: 'input', type: 'text', value: f.desc, placeholder: 'Ex.: caneca do Liverpool',
          onChange: function (e) { upd('desc', e.target.value); }
        })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Valor estimado (£)'),
        h('input', {
          className: 'input', type: 'number', inputMode: 'decimal', step: '0.01', min: '0',
          value: f.price, placeholder: 'Opcional',
          onChange: function (e) { upd('price', e.target.value); }
        })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Onde comprar'),
        h('input', {
          className: 'input', type: 'text', value: f.where, placeholder: 'Opcional',
          onChange: function (e) { upd('where', e.target.value); }
        })
      ),
      h('button', {
        className: 'btn primary',
        onClick: function () {
          if (!f.desc.trim()) return;
          p.onSave({
            desc: f.desc.trim(),
            price: f.price === '' ? null : Math.max(0, Number(f.price) || 0),
            where: f.where.trim()
          });
        }
      }, 'Salvar'),
      p.onDelete ? h('div', { style: { marginTop: '10px' } }, h('button', {
        className: 'btn danger',
        onClick: function () { if (confirm('Excluir este presente?')) p.onDelete(); }
      }, h(Glyph, { name: 'trash', size: 17 }), 'Excluir presente')) : null
    );
  }

  function TabPresentes(p) {
    var st = p.st, api = p.api;
    var ns = useState(''), nome = ns[0], setNome = ns[1];
    var fs = useState(null), form = fs[0], setForm = fs[1];

    var estimado = 0, gasto = 0, comprados = 0, total = 0;
    st.gifts.forEach(function (g) {
      g.ideas.forEach(function (x) {
        var v = Number(x.price) || 0;
        estimado += v; total++;
        if (x.bought) { gasto += v; comprados++; }
      });
    });

    return h('div', { className: 'page' },
      h('div', { className: 'card' },
        h('div', { className: 'totals' },
          h('div', { className: 'tot' },
            h('div', { className: 'k' }, 'Estimado'),
            h('div', { className: 'v' }, money(estimado))),
          h('div', { className: 'tot' },
            h('div', { className: 'k' }, 'Já gasto'),
            h('div', { className: 'v', style: { color: 'var(--ok)' } }, money(gasto)))
        ),
        h('div', { className: 'small muted', style: { marginTop: '10px' } },
          comprados + ' de ' + total + ' presentes comprados'),
        h('div', { style: { marginTop: '8px' } }, h(Bar, { done: comprados, total: total, sm: true }))
      ),
      h('div', { className: 'sectitle' }, 'Pessoas'),
      h('div', { className: 'addrow', style: { marginBottom: '12px' } },
        h('input', {
          className: 'input', type: 'text', value: nome, placeholder: 'Nome da pessoa',
          onChange: function (e) { setNome(e.target.value); },
          onKeyDown: function (e) {
            if (e.key === 'Enter' && nome.trim()) { api.addPerson(nome.trim()); setNome(''); }
          }
        }),
        h('button', {
          className: 'btn primary',
          onClick: function () { if (nome.trim()) { api.addPerson(nome.trim()); setNome(''); } },
          'aria-label': 'Adicionar pessoa'
        }, h(Glyph, { name: 'plus', size: 20 }))
      ),
      st.gifts.length === 0
        ? h('div', { className: 'empty' }, 'Ninguém na lista ainda. Adicione a primeira pessoa acima.')
        : st.gifts.map(function (g) {
          var comp = g.ideas.filter(function (x) { return x.bought; }).length;
          return h('div', { className: 'card', key: g.id, style: { marginBottom: '12px' } },
            h('div', { className: 'spread' },
              h('div', { style: { minWidth: 0 } },
                h('div', { style: { fontSize: '17px', fontWeight: 700, letterSpacing: '-.2px' } }, g.name),
                h('div', { className: 'tiny muted', style: { marginTop: '2px' } },
                  comp + ' de ' + g.ideas.length + ' comprados')
              ),
              h('div', { className: 'row' },
                h('button', {
                  className: 'it-edit', 'aria-label': 'Renomear pessoa',
                  onClick: function () {
                    var v = prompt('Nome da pessoa:', g.name);
                    if (v && v.trim()) api.renamePerson(g.id, v.trim());
                  }
                }, h(Glyph, { name: 'pen', size: 16 })),
                h('button', {
                  className: 'it-edit', 'aria-label': 'Excluir pessoa',
                  onClick: function () {
                    if (confirm('Excluir ' + g.name + ' e todos os presentes dessa pessoa?')) api.delPerson(g.id);
                  }
                }, h(Glyph, { name: 'trash', size: 16 }))
              )
            ),
            g.ideas.map(function (x) {
              return h('div', { className: 'gift' + (x.bought ? ' bought' : ''), key: x.id },
                h(Check, { on: x.bought, onClick: function () { api.toggleIdea(g.id, x.id); } }),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { className: 'g-desc' }, x.desc),
                  (x.price !== null && x.price !== undefined && x.price !== '') || x.where
                    ? h('div', { className: 'meta' },
                      (x.price !== null && x.price !== undefined && x.price !== ''
                        ? h('span', { className: 'money' }, money(x.price)) : null),
                      (x.price !== null && x.price !== undefined && x.price !== '') && x.where ? ' · ' : null,
                      x.where || null)
                    : null
                ),
                h('button', {
                  className: 'it-edit', 'aria-label': 'Editar presente',
                  onClick: function () { setForm({ personId: g.id, gift: x }); }
                }, h(Glyph, { name: 'pen', size: 16 }))
              );
            }),
            h('button', {
              className: 'btn ghost', style: { marginTop: '10px' },
              onClick: function () { setForm({ personId: g.id, gift: null }); }
            }, h(Glyph, { name: 'plus', size: 18 }), 'Adicionar ideia')
          );
        }),
      form ? h(GiftForm, {
        gift: form.gift,
        onClose: function () { setForm(null); },
        onSave: function (v) {
          if (form.gift) api.saveIdea(form.personId, form.gift.id, v);
          else api.addIdea(form.personId, v);
          setForm(null);
        },
        onDelete: form.gift ? function () { api.delIdea(form.personId, form.gift.id); setForm(null); } : null
      }) : null
    );
  }

  /* ---------------------------------------------------------
     9. Aba CHECKLIST
     --------------------------------------------------------- */
  function TabChecklist(p) {
    var st = p.st, api = p.api;
    var ls = useState('levar'), lista = ls[0], setLista = ls[1];
    var ts = useState(''), txt = ts[0], setTxt = ts[1];

    var items = st.checklist[lista];
    var ordered = items.slice()
      .map(function (x, i) { return { x: x, i: i }; })
      .sort(function (a, b) {
        if (a.x.done !== b.x.done) return a.x.done ? 1 : -1;
        return a.i - b.i;
      })
      .map(function (o) { return o.x; });
    var feitos = items.filter(function (x) { return x.done; }).length;

    function add() {
      var v = txt.trim();
      if (!v) return;
      api.addCheck(lista, v);
      setTxt('');
    }

    return h('div', { className: 'page' },
      h('div', { className: 'seg' },
        h('button', {
          className: lista === 'levar' ? 'on' : '',
          onClick: function () { setLista('levar'); }
        }, 'Levar'),
        h('button', {
          className: lista === 'trazer' ? 'on' : '',
          onClick: function () { setLista('trazer'); }
        }, 'Trazer')
      ),
      h('div', { className: 'card', style: { marginTop: '12px' } },
        h('div', { className: 'spread', style: { marginBottom: '9px' } },
          h('b', null, lista === 'levar' ? 'Levar do Brasil' : 'Trazer da Inglaterra'),
          h('span', { className: 'small muted' }, feitos + ' de ' + items.length)
        ),
        h(Bar, { done: feitos, total: items.length })
      ),
      h('div', { className: 'addrow', style: { margin: '12px 0' } },
        h('input', {
          className: 'input', type: 'text', value: txt,
          placeholder: lista === 'levar' ? 'Novo item pra levar' : 'Novo item pra trazer',
          onChange: function (e) { setTxt(e.target.value); },
          onKeyDown: function (e) { if (e.key === 'Enter') add(); }
        }),
        h('button', { className: 'btn primary', onClick: add, 'aria-label': 'Adicionar item' },
          h(Glyph, { name: 'plus', size: 20 }))
      ),
      ordered.length === 0
        ? h('div', { className: 'empty' },
          lista === 'levar' ? 'Lista vazia.' : 'Nada na lista de trazer ainda. Vá anotando o que quiser trazer de lá.')
        : ordered.map(function (x) {
          return h('div', { className: 'item' + (x.done ? ' done past' : ''), key: x.id },
            h(Check, { on: x.done, onClick: function () { api.toggleCheck(lista, x.id); } }),
            h('div', { className: 'it-body' },
              h('div', { className: 'it-title' }, x.text)
            ),
            h('button', {
              className: 'it-edit', 'aria-label': 'Excluir item',
              onClick: function () { api.delCheck(lista, x.id); }
            }, h(Glyph, { name: 'trash', size: 16 }))
          );
        })
    );
  }

  /* ---------------------------------------------------------
     10. Configurações
     --------------------------------------------------------- */
  function Config(p) {
    var cs = useState(false), confirmando = cs[0], setConfirmando = cs[1];
    var tzLocal = '';
    try { tzLocal = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { }
    return h(Sheet, { onClose: p.onClose, title: 'Configurações' },
      h('div', { className: 'card' },
        h('b', null, 'Inglaterra 2026'),
        h('div', { className: 'small muted', style: { marginTop: '6px' } },
          '11 a 19 de setembro de 2026 · Londres, Manchester e Liverpool.'),
        h('div', { className: 'small muted', style: { marginTop: '8px' } },
          'Todos os horários do app são de Londres (BST, UTC+1)' +
          (tzLocal ? '. Fuso deste aparelho: ' + tzLocal : '') + '.'),
        h('div', { className: 'small muted', style: { marginTop: '8px' } },
          'Os dados ficam salvos só neste navegador e funcionam sem internet.')
      ),
      h('div', { className: 'hr' }),
      confirmando
        ? h('div', { className: 'card', style: { borderColor: '#5a2b2b' } },
          h('b', null, 'Apagar tudo mesmo?'),
          h('div', { className: 'small muted', style: { margin: '6px 0 12px' } },
            'Isso volta o roteiro ao original e apaga presentes, checklist e tudo que você marcou. Não dá pra desfazer.'),
          h('button', {
            className: 'btn danger', onClick: function () { p.onReset(); }
          }, 'Sim, resetar tudo'),
          h('div', { style: { height: '8px' } }),
          h('button', {
            className: 'btn', onClick: function () { setConfirmando(false); }
          }, 'Cancelar')
        )
        : h('button', {
          className: 'btn ghost', onClick: function () { setConfirmando(true); }
        }, h(Glyph, { name: 'trash', size: 17 }), 'Resetar tudo')
    );
  }

  /* ---------------------------------------------------------
     11. App
     --------------------------------------------------------- */
  var TABS = [
    { id: 'hoje', label: 'Hoje', icon: 'home' },
    { id: 'roteiro', label: 'Roteiro', icon: 'list' },
    { id: 'presentes', label: 'Presentes', icon: 'gift' },
    { id: 'checklist', label: 'Checklist', icon: 'bag' }
  ];

  function App() {
    var ss = useState(loadState), st = ss[0], setSt = ss[1];
    var ts = useState('hoje'), tab = ts[0], setTab = ts[1];
    var ns = useState(function () { return Date.now(); }), now = ns[0], setNow = ns[1];
    var cs = useState(false), cfg = cs[0], setCfg = cs[1];

    useEffect(function () { saveState(st); }, [st]);

    useEffect(function () {
      var t = setInterval(function () { setNow(Date.now()); }, 1000);
      var onVis = function () { if (!document.hidden) setNow(Date.now()); };
      document.addEventListener('visibilitychange', onVis);
      return function () { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
    }, []);

    var nowL = nowLondon(now);

    var api = useMemo(function () {
      function mapDay(dayId, fn) {
        setSt(function (s) {
          return Object.assign({}, s, {
            days: s.days.map(function (d) { return d.id === dayId ? fn(d) : d; })
          });
        });
      }
      function mapPerson(pid, fn) {
        setSt(function (s) {
          return Object.assign({}, s, {
            gifts: s.gifts.map(function (g) { return g.id === pid ? fn(g) : g; })
          });
        });
      }
      function mapList(lista, fn) {
        setSt(function (s) {
          var c = Object.assign({}, s.checklist);
          c[lista] = fn(c[lista]);
          return Object.assign({}, s, { checklist: c });
        });
      }
      return {
        toggleItem: function (dayId, itemId) {
          mapDay(dayId, function (d) {
            return Object.assign({}, d, {
              items: d.items.map(function (i) {
                return i.id === itemId ? Object.assign({}, i, { done: !i.done }) : i;
              })
            });
          });
        },
        saveItem: function (dayId, itemId, vals) {
          mapDay(dayId, function (d) {
            return Object.assign({}, d, {
              items: d.items.map(function (i) {
                return i.id === itemId ? Object.assign({}, i, vals) : i;
              })
            });
          });
        },
        addItem: function (dayId, vals) {
          mapDay(dayId, function (d) {
            return Object.assign({}, d, {
              items: d.items.concat([Object.assign({ id: uid('i'), done: false }, vals)])
            });
          });
        },
        deleteItem: function (dayId, itemId) {
          mapDay(dayId, function (d) {
            return Object.assign({}, d, {
              items: d.items.filter(function (i) { return i.id !== itemId; })
            });
          });
        },
        addPerson: function (name) {
          setSt(function (s) {
            return Object.assign({}, s, {
              gifts: s.gifts.concat([{ id: uid('p'), name: name, ideas: [] }])
            });
          });
        },
        renamePerson: function (pid, name) {
          mapPerson(pid, function (g) { return Object.assign({}, g, { name: name }); });
        },
        delPerson: function (pid) {
          setSt(function (s) {
            return Object.assign({}, s, {
              gifts: s.gifts.filter(function (g) { return g.id !== pid; })
            });
          });
        },
        addIdea: function (pid, vals) {
          mapPerson(pid, function (g) {
            return Object.assign({}, g, {
              ideas: g.ideas.concat([Object.assign({ id: uid('g'), bought: false }, vals)])
            });
          });
        },
        saveIdea: function (pid, gid, vals) {
          mapPerson(pid, function (g) {
            return Object.assign({}, g, {
              ideas: g.ideas.map(function (x) { return x.id === gid ? Object.assign({}, x, vals) : x; })
            });
          });
        },
        toggleIdea: function (pid, gid) {
          mapPerson(pid, function (g) {
            return Object.assign({}, g, {
              ideas: g.ideas.map(function (x) {
                return x.id === gid ? Object.assign({}, x, { bought: !x.bought }) : x;
              })
            });
          });
        },
        delIdea: function (pid, gid) {
          mapPerson(pid, function (g) {
            return Object.assign({}, g, {
              ideas: g.ideas.filter(function (x) { return x.id !== gid; })
            });
          });
        },
        addCheck: function (lista, text) {
          mapList(lista, function (arr) {
            return arr.concat([{ id: uid('c'), text: text, done: false }]);
          });
        },
        toggleCheck: function (lista, id) {
          mapList(lista, function (arr) {
            return arr.map(function (x) {
              return x.id === id ? Object.assign({}, x, { done: !x.done }) : x;
            });
          });
        },
        delCheck: function (lista, id) {
          mapList(lista, function (arr) {
            return arr.filter(function (x) { return x.id !== id; });
          });
        },
        reset: function () { setSt(freshState()); }
      };
    }, []);

    var conteudo;
    if (tab === 'hoje') conteudo = h(TabHoje, { st: st, api: api, now: now, nowL: nowL });
    else if (tab === 'roteiro') conteudo = h(TabRoteiro, { st: st, api: api, now: now, nowL: nowL });
    else if (tab === 'presentes') conteudo = h(TabPresentes, { st: st, api: api });
    else conteudo = h(TabChecklist, { st: st, api: api });

    var titulo = { hoje: 'Hoje', roteiro: 'Roteiro', presentes: 'Presentes', checklist: 'Checklist' }[tab];

    return h('div', { className: 'app' },
      h('div', { className: 'topbar' },
        h('h1', null, titulo),
        h('div', { className: 'clock' }, nowL.hhmm, h('span', null, 'Londres')),
        h('button', {
          className: 'iconbtn', onClick: function () { setCfg(true); }, 'aria-label': 'Configurações'
        }, h(Glyph, { name: 'gear', size: 19, w: 1.7 }))
      ),
      conteudo,
      h('nav', { className: 'tabs' }, TABS.map(function (t) {
        return h('button', {
          key: t.id, className: tab === t.id ? 'on' : '',
          onClick: function () {
            setTab(t.id);
            window.scrollTo(0, 0);
          }
        }, h(Glyph, { name: t.icon, size: 21, w: 1.8 }), h('span', null, t.label));
      })),
      cfg ? h(Config, {
        onClose: function () { setCfg(false); },
        onReset: function () { api.reset(); setCfg(false); setTab('hoje'); }
      }) : null
    );
  }

  var root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(h(App));
})();
