// ui/app.js — Tavola multi-location restaurant group (custom UI).
// Globals (React, ReactDOM, client, services, showToast, formatCurrency, resolveImageUrl,
// ErrorBoundary) come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  // ── Brand / constants ───────────────────────────────────────────────────────
  var BRAND = {
    name: 'Tavola',
    tagline: 'Your table, your order, your way.',
    hero: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=2000&h=1200'
  };
  var CUISINES = ['Italian', 'Japanese', 'Mexican', 'American', 'Mediterranean', 'Indian', 'Thai', 'Cafe'];
  var MENU_CATEGORIES = ['Starters', 'Mains', 'Pasta', 'Pizza', 'Sides', 'Desserts', 'Drinks'];
  var ORDER_TYPES = ['Pickup', 'Delivery', 'Dine-in'];
  var ORDER_STATES = ['received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
  var RES_STATES = ['requested', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'];
  var CART_KEY = 'tavola_cart_v1';
  var CUISINE_ICON = { Italian: '🍝', Japanese: '🍣', Mexican: '🌮', American: '🍔', Mediterranean: '🥙', Indian: '🍛', Thai: '🍜', Cafe: '☕' };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function money(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n.toFixed(2); } }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function bySort(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function fmtDT(s) { if (!s) return ''; try { return new Date(s).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function statusColor(s) {
    return { received: '#b06a2c', preparing: '#c2410c', ready: '#15803d', out_for_delivery: '#7c3aed',
      completed: '#0f766e', cancelled: '#9ca3af',
      requested: '#b06a2c', confirmed: '#2563eb', seated: '#15803d', no_show: '#dc2626',
      paid: '#15803d', unpaid: '#b06a2c' }[s] || '#9a6a3a';
  }
  function isStaff() {
    try {
      return client.isAdmin() || client.canWrite('restaurant') ||
        ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0;
    } catch (e) { return false; }
  }
  function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || { restaurant: '', items: [] }; } catch (e) { return { restaurant: '', items: [] }; } }
  function saveCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {} }

  // ── Design system (warm, appetizing — terracotta / cream / charcoal) ──────────
  function injectChrome() {
    if (document.getElementById('tv-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'tv-chrome';
    st.textContent = [
      ':root{--ink:#26201a;--ink2:#5a4d40;--paper:#fffaf3;--cream:#f7eee0;--clay:#c0562f;--clay-d:#9e431f;--terra:#d98a4e;--olive:#6b7250;--gold:#caa05a;--line:#ecdfca;--muted:#8c7c68}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.tv{background:var(--cream);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.tv *{box-sizing:border-box}.tv a{color:inherit;text-decoration:none}',
      '.tv-wrap{max-width:1240px;margin:0 auto;padding:0 24px}',
      '.serif{font-family:Fraunces,Georgia,serif}',
      // top bar
      '.tv-top{position:sticky;top:0;z-index:50;background:rgba(255,250,243,.93);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.tv-top-in{display:flex;align-items:center;gap:18px;height:70px}',
      '.tv-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:Fraunces,serif;font-weight:600;font-size:26px;color:var(--ink)}',
      '.tv-logo .dot{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,var(--clay),var(--terra));display:flex;align-items:center;justify-content:center;color:#fff;font-size:17px}',
      '.tv-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.tv-ibtn{position:relative;background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600;display:flex;align-items:center;gap:7px}',
      '.tv-ibtn:hover{background:var(--cream)}',
      '.tv-cbadge{position:absolute;top:0;right:1px;background:var(--clay);color:#fff;font-size:10px;font-weight:700;min-width:17px;height:17px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px}',
      // buttons
      '.tv-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:30px;font-weight:600;font-size:14px;padding:12px 22px;transition:.15s;font-family:Inter}',
      '.tv-btn:disabled{opacity:.55;cursor:default}',
      '.tv-btn-clay{background:var(--clay);color:#fff}.tv-btn-clay:hover:not(:disabled){background:var(--clay-d)}',
      '.tv-btn-ink{background:var(--ink);color:#fff}.tv-btn-ink:hover:not(:disabled){background:#000}',
      '.tv-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.tv-btn-ghost:hover{border-color:var(--clay)}',
      '.tv-btn-sm{padding:8px 14px;font-size:13px}',
      // hero
      '.tv-hero{position:relative;overflow:hidden;background:var(--ink)}',
      '.tv-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5}',
      '.tv-hero-in{position:relative;padding:104px 0 112px;color:#fff}',
      '.tv-hero h1{font-family:Fraunces,serif;font-weight:600;font-size:clamp(40px,5.6vw,72px);line-height:1.02;margin:14px 0 0;max-width:780px}',
      '.tv-hero p{font-size:19px;color:#fbeede;max-width:560px;margin:18px 0 0;line-height:1.55}',
      '.tv-pill{display:inline-block;background:rgba(255,255,255,.16);color:#fff;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;padding:7px 15px;border-radius:30px;backdrop-filter:blur(4px)}',
      // sections
      '.tv-sec{padding:54px 0}',
      '.tv-h2{font-family:Fraunces,serif;font-weight:600;font-size:32px;letter-spacing:-.01em;margin:0}',
      '.tv-eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--clay)}',
      '.tv-sub{color:var(--muted);font-size:15px;margin:4px 0 0}',
      // restaurant cards
      '.tv-rgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin-top:24px}',
      '.tv-rcard{background:var(--paper);border:1px solid var(--line);border-radius:18px;overflow:hidden;cursor:pointer;transition:.16s;display:flex;flex-direction:column}',
      '.tv-rcard:hover{box-shadow:0 20px 48px -28px rgba(38,32,26,.5);transform:translateY(-3px)}',
      '.tv-rcard-img{height:200px;overflow:hidden;background:#efe3cf;position:relative}',
      '.tv-rcard-img img{width:100%;height:100%;object-fit:cover;transition:.3s}',
      '.tv-rcard:hover .tv-rcard-img img{transform:scale(1.05)}',
      '.tv-rcard-b{padding:18px 20px 20px}',
      '.tv-rcard-b h3{font-family:Fraunces,serif;font-weight:600;font-size:22px;margin:0}',
      '.tv-tier{position:absolute;top:12px;right:12px;background:rgba(38,32,26,.85);color:#fff;font-size:12px;font-weight:700;padding:5px 11px;border-radius:20px;backdrop-filter:blur(4px)}',
      // category pills
      '.tv-catbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}',
      '.tv-cat{background:var(--paper);border:1px solid var(--line);color:var(--ink2);cursor:pointer;font-size:13.5px;font-weight:600;padding:8px 16px;border-radius:30px}',
      '.tv-cat:hover{border-color:var(--clay)}.tv-cat.on{background:var(--clay);color:#fff;border-color:var(--clay)}',
      // dish grid
      '.tv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:8px}',
      '.tv-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:.16s}',
      '.tv-card:hover{box-shadow:0 16px 40px -26px rgba(38,32,26,.45);transform:translateY(-2px)}',
      '.tv-card-img{height:190px;overflow:hidden;background:#efe3cf;position:relative}',
      '.tv-card-img img{width:100%;height:100%;object-fit:cover;transition:.3s}',
      '.tv-card:hover .tv-card-img img{transform:scale(1.05)}',
      '.tv-card-b{padding:15px 16px 17px;display:flex;flex-direction:column;flex:1}',
      '.tv-pname{font-family:Fraunces,serif;font-weight:600;font-size:18px;line-height:1.25;margin:0}',
      '.tv-meta{color:var(--muted);font-size:12.5px;margin-top:4px;line-height:1.45;flex:1}',
      '.tv-prow{display:flex;align-items:center;justify-content:space-between;margin-top:14px;gap:8px}',
      '.tv-price{font-family:Fraunces,serif;font-weight:600;font-size:21px;color:var(--clay)}',
      '.tv-ribbon{position:absolute;top:10px;left:10px;background:var(--clay);color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:6px}',
      '.tv-chip{display:inline-block;font-size:10.5px;font-weight:600;letter-spacing:.02em;color:var(--olive);background:#eef0e6;border-radius:20px;padding:3px 10px}',
      // panels / rows
      '.tv-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.tv-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.tv-row:first-child{border-top:0}.tv-grow{flex:1;min-width:0}.tv-mut{color:var(--muted);font-size:13px}',
      '.tv-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 11px;border-radius:20px;color:#fff;white-space:nowrap}',
      '.tv-2col{display:grid;grid-template-columns:1fr 370px;gap:26px;align-items:start}',
      // forms
      '.tv-field{display:block;margin-top:14px}',
      '.tv-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.tv-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.tv-input:focus{outline:none;border-color:var(--clay)}textarea.tv-input{min-height:78px;resize:vertical}',
      // modal
      '.tv-modal{position:fixed;inset:0;z-index:200;background:rgba(38,32,26,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.tv-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:580px;max-height:92vh;overflow:auto;position:relative}',
      '.tv-x{position:absolute;top:14px;right:16px;background:none;border:0;font-size:24px;cursor:pointer;color:var(--muted);line-height:1;z-index:2}',
      // stats
      '.tv-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.tv-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px}',
      '.tv-stat-n{font-family:Fraunces,serif;font-weight:600;font-size:30px;color:var(--ink);line-height:1}',
      '.tv-stat-l{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      // bar chart
      '.tv-bars{display:flex;align-items:flex-end;gap:14px;height:170px;padding-top:18px}',
      '.tv-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%}',
      '.tv-bar .b{width:100%;max-width:64px;background:linear-gradient(180deg,var(--terra),var(--clay));border-radius:8px 8px 0 0;min-height:4px}',
      '.tv-bar .v{font-size:12px;font-weight:700;color:var(--ink)}',
      '.tv-bar .l{font-size:11px;color:var(--muted);text-align:center}',
      // kitchen board
      '.tv-board{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.tv-col{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:12px;min-height:120px}',
      '.tv-col-h{font-weight:700;font-size:13px;text-transform:capitalize;padding:4px 6px 10px;display:flex;justify-content:space-between;align-items:center}',
      '.tv-ticket{background:var(--cream);border:1px solid var(--line);border-radius:11px;padding:11px 12px;margin-bottom:10px}',
      // qty
      '.tv-qty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:9px;overflow:hidden}',
      '.tv-qty button{background:var(--cream);border:0;width:32px;height:34px;cursor:pointer;font-size:16px;font-weight:700;color:var(--clay)}',
      '.tv-qty span{min-width:36px;text-align:center;font-weight:700;font-size:14px}',
      '.tv-tabs{display:flex;gap:4px;flex-wrap:wrap}',
      '.tv-tab{background:none;border:0;color:#e8d6bb;cursor:pointer;font-size:14px;font-weight:600;padding:8px 15px;border-radius:9px}.tv-tab.on{background:var(--clay);color:#fff}',
      '.tv-foot{background:var(--ink);color:#cbb89e;padding:40px 0;font-size:13px;margin-top:40px}.tv-foot b{color:#fff;font-family:Fraunces,serif}',
      '.tv-empty{text-align:center;padding:64px 20px;color:var(--muted)}',
      '.tv-banner{background:#fbf2e3;border:1px solid var(--gold);color:#7a5a16;border-radius:11px;padding:11px 14px;font-size:13px}',
      '.tv-loyal{background:linear-gradient(120deg,var(--clay),var(--terra));color:#fff;border-radius:16px;padding:22px 24px}',
      '@media(max-width:1000px){.tv-grid,.tv-board{grid-template-columns:repeat(2,1fr)}.tv-rgrid{grid-template-columns:1fr}.tv-stats{grid-template-columns:repeat(2,1fr)}.tv-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── Small shared bits ───────────────────────────────────────────────────────
  function Logo(p) { return h('div', { className: 'tv-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '🍽'), 'Tavola'); }
  function Badge(p) { return h('span', { className: 'tv-badge', style: { background: statusColor(p.s) } }, (p.s || '').replace(/_/g, ' ')); }
  function Field(p) { return h('label', { className: 'tv-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Eyebrow(p) { return h('div', { className: 'tv-eyebrow' }, p.children); }

  // ── Login ───────────────────────────────────────────────────────────────────
  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'diner@tavola.dining');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'tv-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'tv-sheet', style: { maxWidth: '420px', padding: '36px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'tv-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'tv-h2', style: { marginTop: '18px', fontSize: '26px' } }, props.title || 'Sign in'),
        h('p', { className: 'tv-mut' }, props.note || 'Sign in to order, book a table and earn loyalty points.'),
        h(Field, { label: 'Email', children: h('input', { className: 'tv-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'tv-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: 'var(--clay)', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'tv-btn tv-btn-clay', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '20px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'tv-mut', style: { marginTop: '15px', textAlign: 'center', fontSize: '12.5px' } },
          'Demo — diner: diner@tavola.dining · ops: ops@tavola.dining · pw Password123!')));
  }

  // ── Top bar ───────────────────────────────────────────────────────────────────
  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'tv-top' }, h('div', { className: 'tv-wrap tv-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'tv-act' },
        h('button', { className: 'tv-ibtn', onClick: function () { c.navigate('#/restaurants'); } }, 'Locations'),
        h('button', { className: 'tv-ibtn', onClick: function () { c.navigate('#/menu'); } }, 'Menu'),
        h('button', { className: 'tv-ibtn', onClick: function () { c.navigate('#/book'); } }, 'Book a table'),
        c.isAdmin ? h('button', { className: 'tv-ibtn', onClick: function () { c.navigate('#/console'); } }, '👩‍🍳 Console') : null,
        c.authed ? h('button', { className: 'tv-ibtn', onClick: function () { c.navigate('#/portal'); } }, '👤 ' + (((client.userInfo || {}).fullName || 'Account').split(' ')[0]))
          : h('button', { className: 'tv-ibtn', onClick: c.openLogin }, '👤 Sign in'),
        c.authed ? h('button', { className: 'tv-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout') : null,
        h('button', { className: 'tv-ibtn', onClick: function () { c.navigate('#/cart'); } }, '🛒',
          c.cart.count ? h('span', { className: 'tv-cbadge' }, c.cart.count) : null))));
  }

  // ── Public: landing ───────────────────────────────────────────────────────────
  function Hero(props) {
    var c = props.ctx;
    return h('section', { className: 'tv-hero' }, h('img', { src: BRAND.hero, alt: '' }),
      h('div', { className: 'tv-wrap tv-hero-in' },
        h('span', { className: 'tv-pill' }, 'Four kitchens · one Tavola'),
        h('h1', null, BRAND.tagline),
        h('p', null, 'Order online from our neighborhood kitchens, reserve the perfect table, and earn points with every plate.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' } },
          h('button', { className: 'tv-btn tv-btn-clay', onClick: function () { c.navigate('#/menu'); } }, 'Order now'),
          h('button', { className: 'tv-btn tv-btn-ghost', style: { background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.navigate('#/book'); } }, 'Book a table'))));
  }

  function RestaurantCard(props) {
    var r = props.r, c = props.ctx;
    return h('div', { className: 'tv-rcard', onClick: function () { c.navigate('#/restaurant/' + r.uuid); } },
      h('div', { className: 'tv-rcard-img' },
        h('img', { src: imgUrl(r.image), alt: r.name, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
        r.price_tier ? h('span', { className: 'tv-tier' }, r.price_tier) : null),
      h('div', { className: 'tv-rcard-b' },
        h('div', { className: 'tv-eyebrow' }, (CUISINE_ICON[r.cuisine] || '🍴') + ' ' + (r.cuisine || '')),
        h('h3', { style: { marginTop: '4px' } }, r.name),
        h('div', { className: 'tv-mut', style: { marginTop: '4px' } }, '★ ' + (r.rating || '4.8') + ' · ' + (r.neighborhood || '') + (r.address ? ' · ' + r.address : '')),
        h('div', { className: 'tv-mut', style: { marginTop: '4px' } }, '🕑 ' + (r.hours || '')),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '14px' } },
          h('button', { className: 'tv-btn tv-btn-clay tv-btn-sm', onClick: function (e) { e.stopPropagation(); c.navigate('#/restaurant/' + r.uuid); } }, 'View menu'),
          h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function (e) { e.stopPropagation(); c.navigate('#/book?restaurant=' + encodeURIComponent(r.name)); } }, 'Book'))));
  }

  function Home(props) {
    var c = props.ctx;
    var rests = (c.restaurants || []).slice().sort(bySort);
    var popular = (c.menu || []).filter(function (m) { return m.popular; }).slice(0, 6);
    if (!popular.length) popular = (c.menu || []).slice(0, 6);
    return h('div', null, h(Hero, { ctx: c }),
      h('section', { className: 'tv-sec' }, h('div', { className: 'tv-wrap' },
        h(Eyebrow, null, 'Our locations'),
        h('h2', { className: 'tv-h2', style: { marginTop: '4px' } }, 'Find your Tavola'),
        c.restaurants === null ? h('div', { className: 'tv-empty' }, 'Loading…')
          : h('div', { className: 'tv-rgrid' }, rests.map(function (r) { return h(RestaurantCard, { key: r.uuid, r: r, ctx: c }); })))),
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'tv-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h(Eyebrow, null, 'Crowd favorites'), h('h2', { className: 'tv-h2', style: { marginTop: '4px' } }, 'Most-loved dishes')),
          h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { c.navigate('#/menu'); } }, 'See full menu')),
        c.menu === null ? h('div', { className: 'tv-empty' }, 'Loading…')
          : h('div', { className: 'tv-grid', style: { marginTop: '20px' } }, popular.map(function (m) { return h(DishCard, { key: m.uuid, m: m, ctx: c }); })))),
      h('section', { className: 'tv-sec' }, h('div', { className: 'tv-wrap' },
        h('div', { className: 'tv-panel', style: { padding: '28px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '40px' } }, '⭐'),
          h('div', { style: { flex: 1, minWidth: '240px' } },
            h('div', { className: 'serif', style: { fontSize: '22px', fontWeight: 600 } }, 'Tavola Rewards'),
            h('div', { className: 'tv-mut', style: { marginTop: '4px' } }, 'Earn about a point for every dollar — across all four kitchens. Sign in to track your balance.')),
          h('button', { className: 'tv-btn tv-btn-clay', onClick: function () { c.authed ? c.navigate('#/portal') : c.openLogin(); } }, c.authed ? 'My rewards' : 'Join now')))));
  }

  // ── Public: restaurants grid ────────────────────────────────────────────────
  function RestaurantsPage(props) {
    var c = props.ctx;
    var [cuisine, setCuisine] = React.useState('');
    var list = (c.restaurants || []).filter(function (r) { return !cuisine || r.cuisine === cuisine; }).sort(bySort);
    var cuisines = CUISINES.filter(function (cu) { return (c.restaurants || []).some(function (r) { return r.cuisine === cu; }); });
    return h('div', { className: 'tv-wrap tv-sec' },
      h(Eyebrow, null, 'All locations'),
      h('h2', { className: 'tv-h2', style: { marginTop: '4px' } }, 'The Tavola family'),
      h('div', { className: 'tv-catbar' },
        h('button', { className: cls('tv-cat', !cuisine && 'on'), onClick: function () { setCuisine(''); } }, 'All'),
        cuisines.map(function (cu) { return h('button', { key: cu, className: cls('tv-cat', cuisine === cu && 'on'), onClick: function () { setCuisine(cu); } }, (CUISINE_ICON[cu] || '') + ' ' + cu); })),
      c.restaurants === null ? h('div', { className: 'tv-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'tv-rgrid' }, list.map(function (r) { return h(RestaurantCard, { key: r.uuid, r: r, ctx: c }); }))
        : h('div', { className: 'tv-empty' }, 'No locations for this cuisine.'));
  }

  // ── Dish card ───────────────────────────────────────────────────────────────
  function DishCard(props) {
    var m = props.m, c = props.ctx;
    return h('div', { className: 'tv-card' },
      h('div', { className: 'tv-card-img' },
        h('img', { src: imgUrl(m.image), alt: m.name, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
        m.popular ? h('span', { className: 'tv-ribbon' }, '★ Popular') : null),
      h('div', { className: 'tv-card-b' },
        h('div', { className: 'tv-eyebrow', style: { fontSize: '10px' } }, m.restaurant_name || ''),
        h('div', { className: 'tv-pname', style: { marginTop: '4px' } }, m.name),
        h('div', { className: 'tv-meta' }, m.description || ''),
        m.dietary ? h('div', { style: { marginTop: '8px' } }, h('span', { className: 'tv-chip' }, m.dietary)) : null,
        h('div', { className: 'tv-prow' },
          h('div', { className: 'tv-price' }, money(m.price)),
          h('button', { className: 'tv-btn tv-btn-clay tv-btn-sm', onClick: function () { c.cart.add(m); } }, '+ Add'))));
  }

  // ── Public: full menu browse (filter by restaurant + category) ──────────────
  function MenuPage(props) {
    var c = props.ctx;
    var [rest, setRest] = React.useState('');
    var [cat, setCat] = React.useState('');
    var rests = (c.restaurants || []).slice().sort(bySort);
    var list = (c.menu || []).slice().sort(bySort).filter(function (m) {
      if (rest && m.restaurant_name !== rest) return false;
      if (cat && m.category !== cat) return false;
      return true;
    });
    var cats = MENU_CATEGORIES.filter(function (ct) { return list.length ? true : (c.menu || []).some(function (m) { return m.category === ct; }); });
    return h('div', { className: 'tv-wrap tv-sec' },
      h(Eyebrow, null, 'Order online'),
      h('h2', { className: 'tv-h2', style: { marginTop: '4px' } }, 'Browse the menu'),
      h('div', { className: 'tv-catbar' },
        h('button', { className: cls('tv-cat', !rest && 'on'), onClick: function () { setRest(''); } }, 'All kitchens'),
        rests.map(function (r) { return h('button', { key: r.uuid, className: cls('tv-cat', rest === r.name && 'on'), onClick: function () { setRest(r.name); } }, (CUISINE_ICON[r.cuisine] || '') + ' ' + r.name); })),
      h('div', { className: 'tv-catbar' },
        h('button', { className: cls('tv-cat', !cat && 'on'), onClick: function () { setCat(''); } }, 'All courses'),
        MENU_CATEGORIES.map(function (ct) { return h('button', { key: ct, className: cls('tv-cat', cat === ct && 'on'), onClick: function () { setCat(ct); } }, ct); })),
      c.menu === null ? h('div', { className: 'tv-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'tv-grid' }, list.map(function (m) { return h(DishCard, { key: m.uuid, m: m, ctx: c }); }))
        : h('div', { className: 'tv-empty' }, h('div', { style: { fontSize: '40px' } }, '🍽'), h('div', { style: { marginTop: '8px', fontWeight: 600 } }, 'Nothing here yet.')));
  }

  // ── Public: restaurant detail + its menu ─────────────────────────────────────
  function RestaurantPage(props) {
    var c = props.ctx;
    var r = (c.restaurants || []).filter(function (x) { return x.uuid === props.uuid; })[0];
    var [cat, setCat] = React.useState('');
    if (c.restaurants === null) return h('div', { className: 'tv-wrap tv-sec' }, h('div', { className: 'tv-empty' }, 'Loading…'));
    if (!r) return h('div', { className: 'tv-wrap tv-sec' }, h('div', { className: 'tv-empty' }, h('h2', { className: 'tv-h2' }, 'Location not found'), h('button', { className: 'tv-btn tv-btn-clay', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/restaurants'); } }, 'All locations')));
    var dishes = (c.menu || []).filter(function (m) { return m.restaurant_name === r.name; }).sort(bySort);
    var cats = MENU_CATEGORIES.filter(function (ct) { return dishes.some(function (m) { return m.category === ct; }); });
    var shown = cat ? dishes.filter(function (m) { return m.category === cat; }) : dishes;
    return h('div', null,
      h('section', { className: 'tv-hero', style: { background: 'var(--ink2)' } },
        h('img', { src: imgUrl(r.image), alt: '' }),
        h('div', { className: 'tv-wrap tv-hero-in', style: { padding: '70px 0 76px' } },
          h('span', { className: 'tv-pill' }, (CUISINE_ICON[r.cuisine] || '🍴') + ' ' + (r.cuisine || '') + ' · ' + (r.price_tier || '')),
          h('h1', { style: { fontSize: 'clamp(34px,4.4vw,56px)' } }, r.name),
          h('p', null, '★ ' + (r.rating || '4.8') + ' · ' + (r.neighborhood || '') + ' · ' + (r.address || '')),
          h('div', { style: { display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' } },
            h('button', { className: 'tv-btn tv-btn-clay', onClick: function () { c.cart.setRestaurant(r.name); document.getElementById('tv-menu-anchor') && document.getElementById('tv-menu-anchor').scrollIntoView({ behavior: 'smooth' }); } }, 'Order from here'),
            h('button', { className: 'tv-btn tv-btn-ghost', style: { background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.navigate('#/book?restaurant=' + encodeURIComponent(r.name)); } }, 'Book a table')))),
      h('section', { className: 'tv-sec' }, h('div', { className: 'tv-wrap' },
        h('div', { id: 'tv-menu-anchor' }),
        h('div', { className: 'tv-panel', style: { padding: '16px 20px', marginBottom: '22px', display: 'flex', gap: '18px', flexWrap: 'wrap' } },
          h('div', null, h('div', { className: 'tv-mut' }, '📞 Phone'), h('b', null, r.phone || '—')),
          h('div', null, h('div', { className: 'tv-mut' }, '🕑 Hours'), h('b', null, r.hours || '—')),
          h('div', null, h('div', { className: 'tv-mut' }, '📍 Address'), h('b', null, r.address || '—'))),
        h(Eyebrow, null, 'The menu'),
        h('h2', { className: 'tv-h2', style: { marginTop: '4px' } }, 'What\'s cooking at ' + r.name),
        h('div', { className: 'tv-catbar' },
          h('button', { className: cls('tv-cat', !cat && 'on'), onClick: function () { setCat(''); } }, 'All'),
          cats.map(function (ct) { return h('button', { key: ct, className: cls('tv-cat', cat === ct && 'on'), onClick: function () { setCat(ct); } }, ct); })),
        shown.length ? h('div', { className: 'tv-grid' }, shown.map(function (m) { return h(DishCard, { key: m.uuid, m: m, ctx: c }); }))
          : h('div', { className: 'tv-empty' }, 'No dishes yet.'))));
  }

  // ── Cart ──────────────────────────────────────────────────────────────────────
  function CartPage(props) {
    var c = props.ctx; var items = c.cart.items;
    if (!items.length) return h('div', { className: 'tv-wrap tv-sec' },
      h('div', { className: 'tv-empty' }, h('div', { style: { fontSize: '46px' } }, '🛒'),
        h('h2', { className: 'tv-h2', style: { marginTop: '10px' } }, 'Your cart is empty'),
        h('p', { className: 'tv-mut' }, 'Add some delicious dishes to get started.'),
        h('button', { className: 'tv-btn tv-btn-clay', style: { marginTop: '16px' }, onClick: function () { c.navigate('#/menu'); } }, 'Browse the menu')));
    return h('div', { className: 'tv-wrap tv-sec' },
      h('h2', { className: 'tv-h2' }, 'Your order'),
      h('p', { className: 'tv-mut', style: { marginBottom: '4px' } }, (c.cart.restaurant ? 'From ' + c.cart.restaurant + ' · ' : '') + c.cart.count + ' item' + (c.cart.count === 1 ? '' : 's')),
      h('div', { className: 'tv-2col', style: { marginTop: '18px' } },
        h('div', { className: 'tv-panel' }, items.map(function (it) {
          return h('div', { key: it.item_uuid, className: 'tv-row' },
            h('div', { style: { width: '54px', height: '54px', borderRadius: '10px', overflow: 'hidden', flex: 'none', background: '#efe3cf' } }, h('img', { src: imgUrl(it.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { className: 'tv-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, it.item_name), h('div', { className: 'tv-mut' }, money(it.unit_price) + (it.restaurant_name ? ' · ' + it.restaurant_name : ''))),
            h('div', { className: 'tv-qty' },
              h('button', { onClick: function () { c.cart.setQty(it, it.quantity - 1); } }, '−'),
              h('span', null, it.quantity),
              h('button', { onClick: function () { c.cart.setQty(it, it.quantity + 1); } }, '+')),
            h('div', { style: { fontWeight: 700, minWidth: '74px', textAlign: 'right' } }, money(it.unit_price * it.quantity)),
            h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { c.cart.remove(it); } }, '✕'));
        })),
        h('div', { className: 'tv-panel', style: { padding: '22px', position: 'sticky', top: '90px' } },
          h('div', { style: { fontWeight: 700, fontSize: '16px', marginBottom: '12px' } }, 'Summary'),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } }, h('span', { className: 'tv-mut' }, 'Subtotal'), h('b', null, money(c.cart.subtotal))),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } }, h('span', { className: 'tv-mut' }, 'You\'ll earn'), h('b', { style: { color: 'var(--clay)' } }, '+' + Math.round(c.cart.subtotal) + ' pts')),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '6px', fontSize: '18px' } }, h('b', null, 'Total'), h('b', { style: { color: 'var(--clay)' } }, money(c.cart.subtotal))),
          h('button', { className: 'tv-btn tv-btn-clay', style: { width: '100%', marginTop: '18px' }, onClick: function () { c.navigate('#/checkout'); } }, 'Checkout'),
          h('button', { className: 'tv-btn tv-btn-ghost', style: { width: '100%', marginTop: '10px' }, onClick: function () { c.navigate('#/menu'); } }, 'Add more'))));
  }

  // ── Checkout ────────────────────────────────────────────────────────────────
  function Checkout(props) {
    var c = props.ctx; var u = client.userInfo || {};
    var [f, setF] = React.useState({ customer_name: u.fullName || '', customer_email: u.email || '', customer_phone: '' });
    var [otype, setOtype] = React.useState('Pickup');
    var [pay, setPay] = React.useState('card');
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    if (!c.cart.items.length) { c.navigate('#/menu'); return null; }
    function submit(e) {
      e.preventDefault();
      if (!c.authed) { c.openLogin(); return; }
      setBusy(true);
      c.placeOrder(f, { order_type: otype, pay: pay }).then(function (r) {
        setBusy(false); if (r && r.redirected) return;
      }).catch(function (err) { setBusy(false); showToast('Checkout failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'tv-wrap tv-sec' },
      h('h2', { className: 'tv-h2' }, 'Checkout'),
      h('form', { className: 'tv-2col', style: { marginTop: '18px' }, onSubmit: submit },
        h('div', { className: 'tv-panel', style: { padding: '24px' } },
          !c.authed ? h('div', { className: 'tv-banner', style: { marginBottom: '8px' } }, 'Sign in to place your order — click below and you\'ll be prompted.') : null,
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Your details'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h(Field, { label: 'Name', req: true, children: h('input', { className: 'tv-input', required: true, value: f.customer_name, onChange: function (e) { set('customer_name', e.target.value); } }) }),
            h(Field, { label: 'Email', req: true, children: h('input', { className: 'tv-input', type: 'email', required: true, value: f.customer_email, onChange: function (e) { set('customer_email', e.target.value); } }) })),
          h(Field, { label: 'Phone', children: h('input', { className: 'tv-input', value: f.customer_phone, onChange: function (e) { set('customer_phone', e.target.value); } }) }),
          h(Field, { label: 'Order type', children: h('div', { style: { display: 'flex', gap: '8px' } }, ORDER_TYPES.map(function (t) {
            return h('button', { key: t, type: 'button', className: cls('tv-cat', otype === t && 'on'), onClick: function () { setOtype(t); } }, t);
          })) })),
        h('div', { className: 'tv-panel', style: { padding: '22px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, c.cart.count + ' items' + (c.cart.restaurant ? ' · ' + c.cart.restaurant : '')),
          c.cart.items.map(function (it) {
            return h('div', { key: it.item_uuid, style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '7px' } },
              h('span', null, it.quantity + '× ' + it.item_name), h('b', null, money(it.unit_price * it.quantity)));
          }),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '8px', fontSize: '18px' } }, h('b', null, 'Total'), h('b', { style: { color: 'var(--clay)' } }, money(c.cart.subtotal))),
          h('div', { className: 'tv-banner', style: { marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' } }, '⭐ Earn +' + Math.round(c.cart.subtotal) + ' loyalty points'),
          h(Field, { label: 'Payment', children: h('select', { className: 'tv-input', value: pay, onChange: function (e) { setPay(e.target.value); } }, h('option', { value: 'card' }, 'Pay now by card (Stripe)'), h('option', { value: 'store' }, 'Pay at the restaurant')) }),
          h('button', { className: 'tv-btn tv-btn-clay', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '16px' } }, busy ? 'Processing…' : (pay === 'card' ? 'Pay ' + money(c.cart.subtotal) : 'Place order')),
          h('p', { className: 'tv-mut', style: { marginTop: '10px', textAlign: 'center', fontSize: '12px' } }, pay === 'card' ? '🔒 Secure checkout via Stripe' : 'Pay when you pick up or dine in'))));
  }

  function OrderConfirm(props) {
    var c = props.ctx;
    var [order, setOrder] = React.useState(null); var [items, setItems] = React.useState([]);
    React.useEffect(function () {
      client.getObjects('order').then(function (rows) {
        var o = arr(rows).filter(function (x) { return x.uuid === props.uuid; })[0];
        setOrder(o || null);
        if (o) client.getScopedList('order', o.uuid, 'order_line').then(function (it) { setItems(arr(it)); }).catch(function () {});
      }).catch(function () {});
    }, [props.uuid]);
    return h('div', { className: 'tv-wrap tv-sec' },
      h('div', { className: 'tv-panel', style: { padding: '36px', maxWidth: '660px', margin: '0 auto', textAlign: 'center' } },
        h('div', { style: { fontSize: '46px' } }, '✅'),
        h('h2', { className: 'tv-h2', style: { marginTop: '8px' } }, 'Order placed!'),
        h('p', { className: 'tv-mut' }, order ? ('Order ' + order.order_number + ' — ' + (order.restaurant_name || '')) : 'Thank you for your order!'),
        order && order.pay_state === 'paid' && order.payment_provider === 'simulated' ? h('div', { className: 'tv-banner', style: { margin: '12px 0' } }, 'Payment was simulated (Stripe not configured in this environment).') : null,
        order ? h('div', { className: 'tv-loyal', style: { margin: '16px 0' } }, h('div', { style: { fontSize: '13px', opacity: .9 } }, 'Points earned'), h('div', { style: { fontFamily: 'Fraunces,serif', fontSize: '30px', fontWeight: 600 } }, '+' + (order.points_earned || 0) + ' pts')) : null,
        order ? h('div', { style: { textAlign: 'left', marginTop: '8px' } },
          items.map(function (it) { return h('div', { key: it.uuid, style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' } }, h('span', null, it.quantity + '× ' + it.item_name), h('b', null, money(it.line_total))); }),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '10px', marginTop: '6px', fontSize: '17px' } }, h('b', null, 'Total'), h('b', { style: { color: 'var(--clay)' } }, money(order.total)))) : null,
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '22px' } },
          h('button', { className: 'tv-btn tv-btn-ink', onClick: function () { c.navigate('#/portal'); } }, 'Track my order'),
          h('button', { className: 'tv-btn tv-btn-ghost', onClick: function () { c.navigate('#/menu'); } }, 'Order more'))));
  }

  // ── Diner portal ────────────────────────────────────────────────────────────
  var ORDER_STEP_LABEL = { received: 'Received', preparing: 'Preparing', ready: 'Ready', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };
  function OrderProgress(p) {
    var o = p.o;
    var flow = o.order_type === 'Delivery' ? ['received', 'preparing', 'ready', 'out_for_delivery', 'completed'] : ['received', 'preparing', 'ready', 'completed'];
    var idx = flow.indexOf(o.order_state);
    if (o.order_state === 'cancelled') return h('span', { className: 'tv-mut' }, 'Cancelled');
    return h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } }, flow.map(function (st, i) {
      var done = idx >= i;
      return h('span', { key: st, style: { display: 'flex', alignItems: 'center', gap: '6px' } },
        h('span', { style: { width: '9px', height: '9px', borderRadius: '50%', background: done ? statusColor(st) : '#ddd' } }),
        h('span', { style: { fontSize: '11.5px', fontWeight: done ? 700 : 500, color: done ? statusColor(st) : 'var(--muted)' } }, ORDER_STEP_LABEL[st]),
        i < flow.length - 1 ? h('span', { style: { color: '#ddd' } }, '›') : null);
    }));
  }

  function Portal(props) {
    var c = props.ctx;
    var sub = props.sub || 'orders';
    var [orders, setOrders] = React.useState(null);
    var [reservations, setReservations] = React.useState(null);
    function load() {
      client.getObjects('order').then(function (r) { setOrders(arr(r).sort(function (a, b) { return (b.placed_at || b.created_at || '').localeCompare(a.placed_at || a.created_at || ''); })); }).catch(function () { setOrders([]); });
      client.getObjects('reservation').then(function (r) { setReservations(arr(r).sort(function (a, b) { return (b.start_time || '').localeCompare(a.start_time || ''); })); }).catch(function () { setReservations([]); });
    }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'tv-wrap tv-sec' }, h('div', { className: 'tv-empty' }, h('h2', { className: 'tv-h2' }, 'Sign in to your account'), h('button', { className: 'tv-btn tv-btn-clay', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    var points = (orders || []).reduce(function (s, o) { return s + (o.points_earned || 0); }, 0);
    var active = (orders || []).filter(function (o) { return ['received', 'preparing', 'ready', 'out_for_delivery'].indexOf(o.order_state) >= 0; });
    var tabs = [['orders', 'My orders'], ['reservations', 'My reservations']];
    function cancelRes(r) { client.updateObject('reservation', r.uuid, { reservation_state: 'cancelled' }, r).then(function () { showToast('Reservation cancelled', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    return h('div', { className: 'tv-wrap tv-sec' },
      h('div', { className: 'tv-loyal', style: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '22px' } },
        h('div', { style: { fontSize: '38px' } }, '⭐'),
        h('div', { style: { flex: 1, minWidth: '180px' } },
          h('div', { style: { fontSize: '13px', opacity: .9 } }, 'Hi ' + ((client.userInfo || {}).fullName || 'there') + ' — your Tavola Rewards'),
          h('div', { style: { fontFamily: 'Fraunces,serif', fontSize: '36px', fontWeight: 600 } }, points.toLocaleString() + ' pts')),
        h('div', { style: { textAlign: 'right' } }, h('div', { style: { fontSize: '13px', opacity: .9 } }, 'Active orders'), h('div', { style: { fontFamily: 'Fraunces,serif', fontSize: '28px', fontWeight: 600 } }, active.length))),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' } },
        tabs.map(function (t) { return h('button', { key: t[0], className: cls('tv-cat', sub === t[0] && 'on'), onClick: function () { c.navigate('#/portal/' + t[0]); } }, t[1]); }),
        h('button', { className: 'tv-btn tv-btn-clay tv-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.navigate(sub === 'reservations' ? '#/book' : '#/menu'); } }, sub === 'reservations' ? '+ Book a table' : '+ New order')),
      sub === 'reservations'
        ? h('div', { className: 'tv-panel' }, reservations === null ? h('div', { className: 'tv-row tv-mut' }, 'Loading…')
          : reservations.length ? reservations.map(function (r) {
            return h('div', { key: r.uuid, className: 'tv-row' },
              h('div', { className: 'tv-grow' }, h('div', { style: { fontWeight: 700 } }, r.restaurant_name + ' · party of ' + (r.party_size || 1)),
                h('div', { className: 'tv-mut' }, fmtDT(r.start_time) + (r.table_name ? ' · ' + r.table_name : '') + (r.notes ? ' · ' + r.notes : ''))),
              h(Badge, { s: r.reservation_state }),
              ['requested', 'confirmed'].indexOf(r.reservation_state) >= 0 ? h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { cancelRes(r); } }, 'Cancel') : null);
          }) : h('div', { className: 'tv-empty' }, 'No reservations yet.'))
        : h('div', { className: 'tv-panel' }, orders === null ? h('div', { className: 'tv-row tv-mut' }, 'Loading…')
          : orders.length ? orders.map(function (o) {
            return h('div', { key: o.uuid, className: 'tv-row', style: { flexWrap: 'wrap' } },
              h('div', { className: 'tv-grow' }, h('div', { style: { fontWeight: 700 } }, o.order_number + ' · ' + (o.restaurant_name || ''),
                h('span', { className: 'tv-chip', style: { marginLeft: '8px' } }, o.order_type || 'Pickup')),
                h('div', { className: 'tv-mut', style: { marginTop: '2px' } }, (o.item_count || 0) + ' items · ' + money(o.total) + ' · +' + (o.points_earned || 0) + ' pts · ' + fmtDate(o.placed_at || o.created_at)),
                h('div', { style: { marginTop: '8px' } }, h(OrderProgress, { o: o }))),
              h(Badge, { s: o.order_state }), h(Badge, { s: o.pay_state || 'unpaid' }));
          }) : h('div', { className: 'tv-empty' }, 'No orders yet — order something delicious!')));
  }

  // ── Book a table ────────────────────────────────────────────────────────────
  function BookPage(props) {
    var c = props.ctx; var u = client.userInfo || {};
    var qp = new URLSearchParams((props.q || '').replace(/^\?/, ''));
    var [f, setF] = React.useState({ restaurant_name: qp.get('restaurant') || '', customer_name: u.fullName || '', customer_email: u.email || '', customer_phone: '', party_size: 2, date: '', time: '19:00', notes: '' });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    var rests = (c.restaurants || []).slice().sort(bySort);
    React.useEffect(function () { if (!f.restaurant_name && rests.length) set('restaurant_name', rests[0].name); }, [c.restaurants]);
    function submit(e) {
      e.preventDefault();
      if (!c.authed) { c.openLogin(); return; }
      if (!f.date) { showToast('Pick a date', 'error'); return; }
      setBusy(true);
      var start = new Date(f.date + 'T' + (f.time || '19:00') + ':00').toISOString();
      var rec = { restaurant_name: f.restaurant_name, customer_name: f.customer_name, customer_email: f.customer_email,
        customer_phone: f.customer_phone, party_size: Number(f.party_size) || 1, reservation_state: 'requested',
        start_time: start, notes: f.notes, owner_username: u.email || '',
        display_name: f.restaurant_name + ' · party of ' + (f.party_size || 1), description: f.restaurant_name + ' · requested' };
      client.createObject('reservation', rec).then(function () { setBusy(false); showToast('Reservation requested — we\'ll confirm by email', 'success'); c.navigate('#/portal/reservations'); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'tv-wrap tv-sec' },
      h(Eyebrow, null, 'Reserve a table'),
      h('h2', { className: 'tv-h2', style: { marginTop: '4px' } }, 'Book your table'),
      h('form', { className: 'tv-panel', style: { padding: '24px', marginTop: '18px', maxWidth: '680px' }, onSubmit: submit },
        !c.authed ? h('div', { className: 'tv-banner', style: { marginBottom: '8px' } }, 'Fill this in now — you\'ll be asked to sign in to confirm.') : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Restaurant', req: true, children: h('select', { className: 'tv-input', required: true, value: f.restaurant_name, onChange: function (e) { set('restaurant_name', e.target.value); } }, h('option', { value: '' }, 'Choose a location'), rests.map(function (r) { return h('option', { key: r.uuid, value: r.name }, r.name); })) }),
          h(Field, { label: 'Party size', req: true, children: h('input', { className: 'tv-input', type: 'number', min: 1, max: 20, required: true, value: f.party_size, onChange: function (e) { set('party_size', e.target.value); } }) })),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Date', req: true, children: h('input', { className: 'tv-input', type: 'date', required: true, value: f.date, onChange: function (e) { set('date', e.target.value); } }) }),
          h(Field, { label: 'Time', children: h('input', { className: 'tv-input', type: 'time', value: f.time, onChange: function (e) { set('time', e.target.value); } }) })),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Name', req: true, children: h('input', { className: 'tv-input', required: true, value: f.customer_name, onChange: function (e) { set('customer_name', e.target.value); } }) }),
          h(Field, { label: 'Email', req: true, children: h('input', { className: 'tv-input', type: 'email', required: true, value: f.customer_email, onChange: function (e) { set('customer_email', e.target.value); } }) })),
        h(Field, { label: 'Phone', children: h('input', { className: 'tv-input', value: f.customer_phone, onChange: function (e) { set('customer_phone', e.target.value); } }) }),
        h(Field, { label: 'Special requests', children: h('textarea', { className: 'tv-input', value: f.notes, placeholder: 'Allergies, occasion, seating preference…', onChange: function (e) { set('notes', e.target.value); } }) }),
        h('button', { className: 'tv-btn tv-btn-clay', type: 'submit', disabled: busy, style: { marginTop: '16px' } }, busy ? 'Booking…' : (c.authed ? 'Request reservation' : 'Sign in & request'))));
  }

  // ── Restaurant console (tenant_admin) ────────────────────────────────────────
  function CStat(p) { return h('div', { className: 'tv-stat' }, h('div', { className: 'tv-stat-n', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'tv-stat-l' }, p.l)); }

  function LocationSwitcher(props) {
    var c = props.ctx;
    var rests = (c.restaurants || []).slice().sort(bySort);
    return h('select', { className: 'tv-input', style: { maxWidth: '240px', borderRadius: '30px' }, value: props.value, onChange: function (e) { props.onChange(e.target.value); } },
      h('option', { value: '' }, '🍽 All locations'),
      rests.map(function (r) { return h('option', { key: r.uuid, value: r.name }, r.name); }));
  }

  function ConsoleHome(props) {
    var c = props.ctx; var loc = props.loc;
    var [orders, setOrders] = React.useState([]); var [reservations, setReservations] = React.useState([]);
    React.useEffect(function () {
      client.getObjects('order').then(function (r) { setOrders(arr(r)); }).catch(function () {});
      client.getObjects('reservation').then(function (r) { setReservations(arr(r)); }).catch(function () {});
    }, []);
    var ords = loc ? orders.filter(function (o) { return o.restaurant_name === loc; }) : orders;
    var resv = loc ? reservations.filter(function (r) { return r.restaurant_name === loc; }) : reservations;
    var today = new Date().toDateString();
    var todays = ords.filter(function (o) { try { return new Date(o.placed_at || o.created_at).toDateString() === today; } catch (e) { return false; } });
    var revenue = ords.filter(function (o) { return o.order_state !== 'cancelled'; }).reduce(function (s, o) { return s + (o.total || 0); }, 0);
    var inKitchen = ords.filter(function (o) { return ['received', 'preparing'].indexOf(o.order_state) >= 0; }).length;
    var todaysRes = resv.filter(function (r) { try { return new Date(r.start_time).toDateString() === today; } catch (e) { return false; } });
    // revenue by location (bar chart)
    var rests = (c.restaurants || []).slice().sort(bySort);
    var byLoc = rests.map(function (r) { return { label: r.name.replace('Tavola ', '').replace(' by Tavola', ''), value: orders.filter(function (o) { return o.restaurant_name === r.name && o.order_state !== 'cancelled'; }).reduce(function (s, o) { return s + (o.total || 0); }, 0) }; });
    var maxV = Math.max.apply(null, byLoc.map(function (b) { return b.value; }).concat([1]));
    return h('div', null,
      h('div', { className: 'tv-stats' },
        h(CStat, { n: todays.length, l: "Today's orders", color: 'var(--clay)' }),
        h(CStat, { n: money(revenue), l: 'Revenue' + (loc ? '' : ' (all)') }),
        h(CStat, { n: inKitchen, l: 'In the kitchen', color: 'var(--terra)' }),
        h(CStat, { n: todaysRes.length, l: "Today's reservations" })),
      h('div', { className: 'tv-2col', style: { marginTop: '18px' } },
        h('div', { className: 'tv-panel', style: { padding: '22px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Revenue by location'),
          h('div', { className: 'tv-bars' }, byLoc.map(function (b) {
            return h('div', { key: b.label, className: 'tv-bar' },
              h('div', { className: 'v' }, '$' + Math.round(b.value)),
              h('div', { className: 'b', style: { height: Math.max(4, (b.value / maxV) * 120) + 'px' } }),
              h('div', { className: 'l' }, b.label));
          }))),
        h('div', { className: 'tv-panel', style: { padding: '22px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '8px' } }, 'Upcoming reservations'),
          (function () {
            var up = resv.filter(function (r) { return ['requested', 'confirmed'].indexOf(r.reservation_state) >= 0; }).sort(function (a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); }).slice(0, 6);
            return up.length ? up.map(function (r) {
              return h('div', { key: r.uuid, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '13.5px' } },
                h('span', null, r.restaurant_name + ' · party of ' + r.party_size + ' · ' + fmtDT(r.start_time)), h(Badge, { s: r.reservation_state }));
            }) : h('div', { className: 'tv-mut' }, 'No upcoming reservations.');
          })(),
          h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', style: { marginTop: '12px' }, onClick: function () { c.navigate('#/console/reservations'); } }, 'Reservations book →'))));
  }

  // Kitchen / order board — grouped by state; advance received→preparing→ready→completed
  function KitchenBoard(props) {
    var c = props.ctx; var loc = props.loc;
    var [orders, setOrders] = React.useState(null);
    function load() { client.getObjects('order').then(function (r) { setOrders(arr(r)); }).catch(function () { setOrders([]); }); }
    React.useEffect(load, []);
    var COLS = ['received', 'preparing', 'ready', 'out_for_delivery'];
    var NEXT = { received: 'preparing', preparing: 'ready', ready: 'completed', out_for_delivery: 'completed' };
    function advance(o, st) {
      var patch = { order_state: st };
      client.updateObject('order', o.uuid, patch, o).then(function () { showToast('Order → ' + st.replace(/_/g, ' '), 'success'); load(); }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    // Saga trigger — order_ready: marks ready + texts the customer (compensating on SMS fail)
    function markReady(o) {
      var prev = o.order_state;
      var run = (services && services.workflow && services.workflow.run)
        ? services.workflow.run('order_ready', { order_uuid: o.uuid, customer_phone: o.customer_phone, customer_name: o.customer_name, order_number: o.order_number, restaurant_name: o.restaurant_name, prev_state: prev })
        : Promise.reject();
      run.then(function () { showToast('Ready saga ran — customer texted for ' + o.order_number, 'success'); load(); })
        .catch(function () { advance(o, 'ready'); showToast('Marked ready (SMS queued)', 'info'); });
    }
    var ords = (orders || []).filter(function (o) { return !loc || o.restaurant_name === loc; });
    return h('div', null,
      h('div', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Kitchen board' + (loc ? ' · ' + loc : '')),
      orders === null ? h('div', { className: 'tv-empty' }, 'Loading…')
        : h('div', { className: 'tv-board' }, COLS.map(function (col) {
          var list = ords.filter(function (o) { return o.order_state === col; });
          return h('div', { key: col, className: 'tv-col' },
            h('div', { className: 'tv-col-h' }, h('span', null, col.replace(/_/g, ' ')), h('span', { className: 'tv-chip' }, list.length)),
            list.length ? list.map(function (o) {
              return h('div', { key: o.uuid, className: 'tv-ticket' },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  h('b', { style: { fontSize: '13px' } }, o.order_number), h('span', { className: 'tv-chip' }, o.order_type || 'Pickup')),
                h('div', { className: 'tv-mut', style: { fontSize: '12px', marginTop: '2px' } }, o.restaurant_name + ' · ' + (o.item_count || 0) + ' items · ' + money(o.total)),
                h('div', { className: 'tv-mut', style: { fontSize: '12px' } }, o.customer_name || ''),
                h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' } },
                  col === 'preparing'
                    ? h('button', { className: 'tv-btn tv-btn-clay tv-btn-sm', onClick: function () { markReady(o); } }, '🔔 Mark ready')
                    : (NEXT[col] ? h('button', { className: 'tv-btn tv-btn-ink tv-btn-sm', onClick: function () { advance(o, NEXT[col]); } }, '→ ' + NEXT[col].replace(/_/g, ' ')) : null),
                  col === 'ready' && o.order_type === 'Delivery' ? h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { advance(o, 'out_for_delivery'); } }, 'Out for delivery') : null,
                  o.order_state !== 'cancelled' ? h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { advance(o, 'cancelled'); } }, '✕') : null));
            }) : h('div', { className: 'tv-mut', style: { fontSize: '12px', padding: '6px' } }, '—'));
        })));
  }

  // Reservations book — confirm / seat / complete
  function ConsoleReservations(props) {
    var loc = props.loc;
    var [reservations, setReservations] = React.useState(null); var [f, setF] = React.useState('all');
    function load() { client.getObjects('reservation').then(function (r) { setReservations(arr(r).sort(function (a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); })); }).catch(function () { setReservations([]); }); }
    React.useEffect(load, []);
    function setState(r, st) { client.updateObject('reservation', r.uuid, { reservation_state: st }, r).then(function () { showToast('Reservation ' + st.replace(/_/g, ' '), 'success'); load(); }).catch(function (e) { showToast('Failed', 'error'); }); }
    var list = (reservations || []).filter(function (r) { return (f === 'all' || r.reservation_state === f) && (!loc || r.restaurant_name === loc); });
    return h('div', null,
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' } },
        ['all'].concat(RES_STATES).map(function (s) { return h('button', { key: s, className: cls('tv-cat', f === s && 'on'), onClick: function () { setF(s); } }, s.replace(/_/g, ' ')); })),
      h('div', { className: 'tv-panel' }, reservations === null ? h('div', { className: 'tv-row tv-mut' }, 'Loading…')
        : list.length ? list.map(function (r) {
          return h('div', { key: r.uuid, className: 'tv-row', style: { flexWrap: 'wrap' } },
            h('div', { className: 'tv-grow' }, h('div', { style: { fontWeight: 700 } }, r.customer_name + ' · party of ' + (r.party_size || 1),
              h('span', { className: 'tv-chip', style: { marginLeft: '8px' } }, r.restaurant_name)),
              h('div', { className: 'tv-mut' }, fmtDT(r.start_time) + (r.table_name ? ' · ' + r.table_name : '') + (r.customer_phone ? ' · ' + r.customer_phone : '') + (r.notes ? ' · ' + r.notes : ''))),
            h(Badge, { s: r.reservation_state }),
            r.reservation_state === 'requested' ? h('button', { className: 'tv-btn tv-btn-clay tv-btn-sm', onClick: function () { setState(r, 'confirmed'); } }, 'Confirm') : null,
            r.reservation_state === 'confirmed' ? h('button', { className: 'tv-btn tv-btn-ink tv-btn-sm', onClick: function () { setState(r, 'seated'); } }, 'Seat') : null,
            r.reservation_state === 'seated' ? h('button', { className: 'tv-btn tv-btn-ink tv-btn-sm', onClick: function () { setState(r, 'completed'); } }, 'Complete') : null,
            ['requested', 'confirmed'].indexOf(r.reservation_state) >= 0 ? h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { setState(r, 'no_show'); } }, 'No-show') : null,
            ['completed', 'cancelled', 'no_show'].indexOf(r.reservation_state) < 0 ? h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { setState(r, 'cancelled'); } }, 'Cancel') : null);
        }) : h('div', { className: 'tv-empty' }, 'No reservations.')));
  }

  // Generic CRUD modal (menu + restaurants)
  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; if (fd.k === 'image_url') v = imgUrl(init.image); f[fd.k] = (v == null) ? '' : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {};
      fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; }
        if (v === '' || v == null) return; if (fd.type === 'number') v = Number(v);
        if (fd.k === 'image_url') { data.image = { url: v, thumbnail_url: v }; return; } data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'tv-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'tv-sheet', style: { padding: '28px' } }, h('button', { className: 'tv-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'tv-h2', style: { fontSize: '22px' } }, init.uuid ? props.editTitle : props.newTitle),
        fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'tv-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'tv-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'tv-mut' }, 'Yes'));
          else input = h('input', { className: 'tv-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h(Field, { key: fd.k, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'tv-btn tv-btn-clay', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'tv-btn tv-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  var MENU_FIELDS = [
    { k: 'name', label: 'Dish name', req: true },
    { k: 'restaurant_name', label: 'Restaurant', type: 'select', opts: [] },
    { k: 'category', label: 'Category', type: 'select', opts: MENU_CATEGORIES },
    { k: 'price', label: 'Price ($)', type: 'number', req: true },
    { k: 'dietary', label: 'Dietary tags (· separated)' },
    { k: 'image_url', label: 'Image URL' },
    { k: 'description', label: 'Description', type: 'textarea' },
    { k: 'popular', label: 'Popular / featured', type: 'check' }
  ];
  var REST_FIELDS = [
    { k: 'name', label: 'Restaurant name', req: true },
    { k: 'cuisine', label: 'Cuisine', type: 'select', opts: CUISINES },
    { k: 'neighborhood', label: 'Neighborhood' }, { k: 'address', label: 'Address' },
    { k: 'phone', label: 'Phone' }, { k: 'hours', label: 'Hours' },
    { k: 'price_tier', label: 'Price tier', type: 'select', opts: ['$', '$$', '$$$', '$$$$'] },
    { k: 'rating', label: 'Rating', type: 'number' }, { k: 'image_url', label: 'Image URL' }
  ];

  function ConsoleMenu(props) {
    var c = props.ctx; var loc = props.loc; var [edit, setEdit] = React.useState(null); var [q, setQ] = React.useState('');
    var rests = (c.restaurants || []).map(function (r) { return r.name; });
    var fields = MENU_FIELDS.map(function (f) { return f.k === 'restaurant_name' ? Object.assign({}, f, { opts: rests }) : f; });
    var list = (c.menu || []).slice().sort(bySort).filter(function (m) { return (!loc || m.restaurant_name === loc) && (!q || (m.name + ' ' + (m.restaurant_name || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0); });
    function del(m) { if (!window.confirm('Delete ' + m.name + '?')) return; client.deleteObject('menu_item', m.uuid, m).then(function () { showToast('Deleted', 'success'); c.reload(); }).catch(function (e) { showToast('Delete failed: ' + ((e && e.message) || 'error'), 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
        h('input', { className: 'tv-input', style: { maxWidth: '260px' }, placeholder: 'Search dishes…', value: q, onChange: function (e) { setQ(e.target.value); } }),
        h('div', { className: 'tv-mut' }, list.length + ' dishes'),
        h('button', { className: 'tv-btn tv-btn-clay tv-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({ restaurant_name: loc || '' }); } }, '+ New dish')),
      h('div', { className: 'tv-panel' }, list.map(function (m) {
        return h('div', { key: m.uuid, className: 'tv-row' },
          h('div', { style: { width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flex: 'none', background: '#efe3cf' } }, h('img', { src: imgUrl(m.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'tv-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, m.name, m.popular ? h('span', { className: 'tv-chip', style: { marginLeft: '8px' } }, '★') : null), h('div', { className: 'tv-mut' }, (m.restaurant_name || '') + ' · ' + (m.category || ''))),
          h('div', { style: { fontWeight: 700 } }, money(m.price)),
          h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { setEdit(m); } }, 'Edit'),
          h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { del(m); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'menu_item', fields: fields, initial: edit, newTitle: 'New dish', editTitle: 'Edit dish',
        beforeSave: function (d) { d.display_name = d.name || 'Dish'; d.description = (d.description || d.name || '').toString(); }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function ConsoleRestaurants(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.restaurants || []).slice().sort(bySort);
    function del(r) { if (!window.confirm('Delete ' + r.name + '?')) return; client.deleteObject('restaurant', r.uuid, r).then(function () { showToast('Deleted', 'success'); c.reload(); }).catch(function (e) { showToast('Delete failed: ' + ((e && e.message) || 'error'), 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' locations'),
        h('button', { className: 'tv-btn tv-btn-clay tv-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New location')),
      h('div', { className: 'tv-panel' }, list.map(function (r) {
        return h('div', { key: r.uuid, className: 'tv-row' },
          h('div', { style: { width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flex: 'none', background: '#efe3cf' } }, h('img', { src: imgUrl(r.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'tv-grow' }, h('div', { style: { fontWeight: 600 } }, r.name, h('span', { className: 'tv-chip', style: { marginLeft: '8px' } }, r.price_tier || '$$')), h('div', { className: 'tv-mut' }, (r.cuisine || '') + ' · ' + (r.neighborhood || '') + ' · ★ ' + (r.rating || '4.8'))),
          h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { setEdit(r); } }, 'Edit'),
          h('button', { className: 'tv-btn tv-btn-ghost tv-btn-sm', onClick: function () { del(r); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'restaurant', fields: REST_FIELDS, initial: edit, newTitle: 'New location', editTitle: 'Edit location',
        beforeSave: function (d) { d.display_name = d.name || 'Restaurant'; d.description = (d.cuisine || '') + ' · ' + (d.neighborhood || ''); }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function Console(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var [loc, setLoc] = React.useState('');
    var tabs = [['home', 'Dashboard'], ['kitchen', 'Kitchen board'], ['reservations', 'Reservations'], ['menu', 'Menu'], ['restaurants', 'Locations']];
    return h('div', { className: 'tv' },
      h('div', { style: { background: 'linear-gradient(100deg,#26201a,#9e431f)' } }, h('div', { className: 'tv-wrap', style: { display: 'flex', alignItems: 'center', height: '62px', gap: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'tv-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot' }, '🍽'), 'Tavola'),
        h('span', { style: { color: '#e8d6bb', fontWeight: 600, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase' } }, 'Console'),
        h('div', { className: 'tv-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('tv-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/console' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' } },
          h(LocationSwitcher, { ctx: c, value: loc, onChange: setLoc }),
          h('button', { className: 'tv-ibtn', style: { color: '#e8d6bb' }, onClick: function () { c.navigate('#/'); } }, 'Site ↗')))),
      h('div', { className: 'tv-wrap', style: { padding: '28px 24px 64px' } },
        sub === 'home' ? h(ConsoleHome, { ctx: c, loc: loc })
          : sub === 'kitchen' ? h(KitchenBoard, { ctx: c, loc: loc })
          : sub === 'reservations' ? h(ConsoleReservations, { ctx: c, loc: loc })
          : sub === 'menu' ? h(ConsoleMenu, { ctx: c, loc: loc })
          : h(ConsoleRestaurants, { ctx: c })));
  }

  function Footer() {
    return h('footer', { className: 'tv-foot' }, h('div', { className: 'tv-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' } },
      h('div', null, h('b', null, 'Tavola'), ' — ' + BRAND.tagline),
      h('div', null, 'Order · Reserve · Earn rewards')));
  }

  // ── Root ──────────────────────────────────────────────────────────────────────
  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [restaurants, setRestaurants] = React.useState(null);
    var [menu, setMenu] = React.useState(null);
    var [cart, setCart] = React.useState(loadCart());

    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () { saveCart(cart); }, [cart]);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() {
      client.getObjects('restaurant').then(function (r) { setRestaurants(arr(r)); }).catch(function () { setRestaurants([]); });
      client.getObjects('menu_item').then(function (r) { setMenu(arr(r)); }).catch(function () { setMenu([]); });
    }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    // Stripe return: ?paid=1&order=<uuid>
    React.useEffect(function () {
      var qp = new URLSearchParams(window.location.search || '');
      if (qp.get('paid') === '1' && qp.get('order')) {
        var ouid = qp.get('order');
        client.getObjects('order').then(function (rows) {
          var o = arr(rows).filter(function (x) { return x.uuid === ouid; })[0];
          if (o && o.pay_state !== 'paid') client.updateObject('order', ouid, { pay_state: 'paid', payment_provider: 'stripe' }, o).catch(function () {});
        }).catch(function () {});
        setCart({ restaurant: '', items: [] }); saveCart({ restaurant: '', items: [] });
        try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
        window.location.hash = '#/order/' + ouid; setRoute('#/order/' + ouid);
      }
    }, []);

    // Cart API
    function addToCart(m, qty) {
      qty = qty || 1;
      setCart(function (cur) {
        var items = cur.items.slice(); var rest = cur.restaurant;
        // single-restaurant cart: switching kitchens resets the cart
        if (rest && m.restaurant_name && rest !== m.restaurant_name) {
          if (!window.confirm('Your cart has items from ' + rest + '. Start a new order from ' + m.restaurant_name + '?')) return cur;
          items = []; rest = m.restaurant_name;
        }
        if (!rest) rest = m.restaurant_name || '';
        var ex = items.filter(function (x) { return x.item_uuid === m.uuid; })[0];
        if (ex) items = items.map(function (x) { return x.item_uuid === m.uuid ? Object.assign({}, x, { quantity: x.quantity + qty }) : x; });
        else items = items.concat([{ item_uuid: m.uuid, item_name: m.name, restaurant_name: m.restaurant_name, unit_price: m.price, image: m.image, quantity: qty }]);
        showToast(m.name + ' added', 'success');
        return { restaurant: rest, items: items };
      });
    }
    function setQty(it, q) { setCart(function (cur) { var items = q < 1 ? cur.items.filter(function (x) { return x.item_uuid !== it.item_uuid; }) : cur.items.map(function (x) { return x.item_uuid === it.item_uuid ? Object.assign({}, x, { quantity: q }) : x; }); return { restaurant: items.length ? cur.restaurant : '', items: items }; }); }
    function removeItem(it) { setCart(function (cur) { var items = cur.items.filter(function (x) { return x.item_uuid !== it.item_uuid; }); return { restaurant: items.length ? cur.restaurant : '', items: items }; }); }
    function setRestaurant(name) { setCart(function (cur) { return Object.assign({}, cur, { restaurant: cur.restaurant || name }); }); }
    var cartCount = cart.items.reduce(function (s, x) { return s + x.quantity; }, 0);
    var cartSubtotal = cart.items.reduce(function (s, x) { return s + x.unit_price * x.quantity; }, 0);

    function placeOrder(billing, opts) {
      opts = opts || {};
      var lines = cart.items;
      var subtotal = cartSubtotal;
      var num = 'TAV-' + Date.now().toString(36).toUpperCase();
      var points = Math.round(subtotal);
      var card = opts.pay === 'card';
      var orderData = {
        order_number: num, restaurant_name: cart.restaurant || (lines[0] && lines[0].restaurant_name) || 'Tavola',
        customer_name: billing.customer_name, customer_email: billing.customer_email, customer_phone: billing.customer_phone,
        order_type: opts.order_type || 'Pickup', order_state: 'received',
        item_count: lines.reduce(function (s, l) { return s + l.quantity; }, 0),
        subtotal: subtotal, total: subtotal, pay_state: 'unpaid', points_earned: points,
        owner_username: billing.customer_email || (client.userInfo || {}).email || '',
        placed_at: new Date().toISOString(), display_name: num
      };
      var theOrder;
      return client.createObject('order', orderData).then(function (order) {
        theOrder = order;
        return Promise.all(lines.map(function (l) {
          return client.createObject('order_line', {
            item_name: l.item_name, quantity: l.quantity, unit_price: l.unit_price,
            line_total: l.unit_price * l.quantity, restaurant_name: l.restaurant_name,
            owner_username: orderData.owner_username, display_name: l.quantity + 'x ' + l.item_name,
            parent_type: 'order', parent_uuid: order.uuid
          });
        }));
      }).then(function () {
        if (!card) {
          setCart({ restaurant: '', items: [] }); navigate('#/order/' + theOrder.uuid); return { order: theOrder };
        }
        // prepaid → Stripe hosted checkout, simulated fallback
        var origin = window.location.origin;
        return Promise.resolve().then(function () {
          if (!services || !services.stripe || !services.stripe.checkout) return null;
          return services.stripe.checkout({ amount: subtotal, product: 'Tavola Order ' + num, successUrl: origin + '/?paid=1&order=' + theOrder.uuid, cancelUrl: origin + '/?cart=1' }).catch(function () { return null; });
        }).then(function (res) {
          var url = ((res && res.output) || res || {}); url = url.checkout_url || url.url || url.checkoutUrl || '';
          if (url) return client.updateObject('order', theOrder.uuid, { stripe_checkout_url: url }, theOrder).catch(function () {}).then(function () { window.location.href = url; return { redirected: true }; });
          return client.updateObject('order', theOrder.uuid, { pay_state: 'paid', payment_provider: 'simulated' }, theOrder).catch(function () {}).then(function () {
            setCart({ restaurant: '', items: [] }); navigate('#/order/' + theOrder.uuid); return { order: theOrder };
          });
        });
      });
    }

    var ctx = {
      route: route, navigate: navigate, authed: authed, setAuthed: setAuthed,
      isAdmin: authed && isStaff(), openLogin: function () { setShowLogin(true); },
      restaurants: restaurants, menu: menu, reload: reload, placeOrder: placeOrder,
      cart: { items: cart.items, restaurant: cart.restaurant, count: cartCount, subtotal: cartSubtotal, add: addToCart, setQty: setQty, remove: removeItem, setRestaurant: setRestaurant }
    };

    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var q = qi >= 0 ? hash.slice(qi) : ''; var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';

    if (top === 'console' && ctx.isAdmin) return h(ErrorBoundary, null, h(Console, { ctx: ctx, seg: seg }),
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'restaurants') page = h(RestaurantsPage, { ctx: ctx });
    else if (top === 'restaurant') page = h(RestaurantPage, { ctx: ctx, uuid: seg[1] });
    else if (top === 'menu') page = h(MenuPage, { ctx: ctx });
    else if (top === 'cart') page = h(CartPage, { ctx: ctx });
    else if (top === 'checkout') page = h(Checkout, { ctx: ctx });
    else if (top === 'order') page = h(OrderConfirm, { ctx: ctx, uuid: seg[1] });
    else if (top === 'portal') page = h(Portal, { ctx: ctx, sub: seg[1] || 'orders' });
    else if (top === 'book') page = h(BookPage, { ctx: ctx, q: q });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'tv' }, h(TopBar, { ctx: ctx }), page, h(Footer, null),
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); setAuthed(true); } }) : null));
  }

  // ── Mount ───────────────────────────────────────────────────────────────────
  var __root = null;
  function mountApp() {
    injectChrome();
    var pl = document.getElementById('supero-preloader'); if (pl && pl.parentNode) pl.parentNode.removeChild(pl);
    var el = document.getElementById('myapp-root'); if (!el) { el = document.createElement('div'); el.id = 'myapp-root'; document.body.appendChild(el); }
    if (!__root) __root = ReactDOM.createRoot(el);
    __root.render(h(App, null));
  }
  function boot() { var n = 0; (function tick() { n++; if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') setTimeout(mountApp, 50); else if (n < 50) setTimeout(tick, 100); })(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
