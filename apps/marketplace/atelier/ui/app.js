// ui/app.js — Atelier B2B wholesale marketplace (custom UI).
// Globals (React, ReactDOM, client, services, showToast, formatCurrency, resolveImageUrl,
// ErrorBoundary) come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  // ── Brand / constants ───────────────────────────────────────────────────────
  var BRAND = {
    name: 'Atelier',
    tag: 'wholesale marketplace',
    tagline: 'Where independent brands meet the boutiques that love them',
    hero: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000&h=1100'
  };
  var CATEGORIES = ['Home & Living', 'Apparel & Accessories', 'Beauty & Wellness',
    'Food & Drink', 'Stationery & Gifts', 'Jewelry', 'Kids & Baby'];
  var NET_TERMS = ['Prepaid', 'Net 15', 'Net 30', 'Net 60'];
  var STORE_TYPES = ['Boutique', 'Gift Shop', 'Salon & Spa', 'Cafe & Restaurant', 'Online Store', 'Department Store'];
  var CART_KEY = 'atelier_cart_v1';

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function money(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n.toFixed(2); } }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function bySort(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function statusColor(s) {
    return { pending: '#b06f2e', confirmed: '#2563eb', shipped: '#7c3aed', delivered: '#15803d', cancelled: '#9ca3af',
      paid: '#15803d', unpaid: '#b06f2e', refunded: '#9ca3af' }[s] || '#8a7d6b';
  }
  function isStaff() {
    try {
      return client.isAdmin() || client.canWrite('brand') ||
        ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0;
    } catch (e) { return false; }
  }
  function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function saveCart(items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {} }
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // ── Design system (editorial, warm) ─────────────────────────────────────────
  function injectChrome() {
    if (document.getElementById('atl-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'atl-chrome';
    st.textContent = [
      ':root{--ink:#211c15;--ink2:#4a4034;--paper:#fffdf9;--cream:#f6efe4;--clay:#b5613b;--clay-d:#974c2c;--sage:#5f6e52;--gold:#c9a14a;--line:#e8ddcc;--muted:#8a7d6b}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.atl{background:var(--cream);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.atl *{box-sizing:border-box}',
      '.atl a{color:inherit;text-decoration:none}',
      '.atl-wrap{max-width:1240px;margin:0 auto;padding:0 24px}',
      '.serif{font-family:Fraunces,Georgia,serif}',
      // top bar
      '.atl-top{position:sticky;top:0;z-index:50;background:rgba(255,253,249,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.atl-top-in{display:flex;align-items:center;gap:20px;height:70px}',
      '.atl-logo{font-family:Fraunces,serif;font-weight:600;font-size:27px;letter-spacing:.01em;cursor:pointer;flex:none;color:var(--ink)}',
      '.atl-logo span{color:var(--clay)}',
      '.atl-search{flex:1;max-width:520px;position:relative}',
      '.atl-search input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:30px;padding:11px 16px 11px 40px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.atl-search input:focus{outline:none;border-color:var(--clay)}',
      '.atl-search svg{position:absolute;left:14px;top:12px;opacity:.4}',
      '.atl-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.atl-ibtn{position:relative;background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 12px;border-radius:9px;font-weight:600;display:flex;align-items:center;gap:7px}',
      '.atl-ibtn:hover{background:var(--cream)}',
      '.atl-badge{position:absolute;top:1px;right:3px;background:var(--clay);color:#fff;font-size:10px;font-weight:700;min-width:17px;height:17px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px}',
      '.atl-catbar{border-bottom:1px solid var(--line);background:var(--paper)}',
      '.atl-catbar-in{display:flex;gap:2px;height:48px;align-items:center;overflow-x:auto}',
      '.atl-cat{background:none;border:0;color:var(--ink2);cursor:pointer;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:8px;white-space:nowrap}',
      '.atl-cat:hover{color:var(--clay)}',
      '.atl-cat.on{color:var(--clay);font-weight:700}',
      // buttons
      '.atl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:30px;font-weight:600;font-size:14px;padding:12px 22px;transition:.15s;font-family:Inter}',
      '.atl-btn:disabled{opacity:.55;cursor:default}',
      '.atl-btn-clay{background:var(--clay);color:#fff}.atl-btn-clay:hover:not(:disabled){background:var(--clay-d)}',
      '.atl-btn-ink{background:var(--ink);color:var(--paper)}.atl-btn-ink:hover:not(:disabled){background:#000}',
      '.atl-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.atl-btn-ghost:hover{border-color:var(--clay)}',
      '.atl-btn-sm{padding:8px 14px;font-size:13px}',
      // hero
      '.atl-hero{position:relative;overflow:hidden;background:var(--ink)}',
      '.atl-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}',
      '.atl-hero-in{position:relative;padding:96px 0 104px;color:#fff}',
      '.atl-hero h1{font-family:Fraunces,serif;font-weight:600;font-size:clamp(38px,5.2vw,68px);line-height:1.03;margin:14px 0 0;max-width:760px}',
      '.atl-hero p{font-size:19px;color:#f2e9da;max-width:540px;margin:18px 0 0;line-height:1.55}',
      '.atl-pill{display:inline-block;background:rgba(255,255,255,.16);color:#fff;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;padding:7px 15px;border-radius:30px;backdrop-filter:blur(4px)}',
      // sections
      '.atl-sec{padding:54px 0}',
      '.atl-h2{font-family:Fraunces,serif;font-weight:600;font-size:32px;letter-spacing:-.01em;margin:0}',
      '.atl-sub{color:var(--muted);font-size:15px;margin:4px 0 0}',
      '.atl-eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--clay)}',
      // category tiles
      '.atl-cats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:24px}',
      '.atl-cattile{position:relative;height:130px;border-radius:14px;overflow:hidden;cursor:pointer;display:flex;align-items:flex-end;padding:14px;color:#fff;background:var(--ink2)}',
      '.atl-cattile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.7;transition:.25s}',
      '.atl-cattile:hover img{transform:scale(1.06);opacity:.82}',
      '.atl-cattile span{position:relative;font-weight:600;font-size:14.5px;text-shadow:0 1px 8px rgba(0,0,0,.5)}',
      // brand cards
      '.atl-bgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:24px}',
      '.atl-bcard{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:.16s}',
      '.atl-bcard:hover{box-shadow:0 18px 44px -28px rgba(33,28,21,.4);transform:translateY(-3px)}',
      '.atl-bcard-img{height:150px;overflow:hidden}',
      '.atl-bcard-img img{width:100%;height:100%;object-fit:cover}',
      '.atl-bcard-b{padding:16px 18px 18px}',
      '.atl-bcard-b h3{font-family:Fraunces,serif;font-weight:600;font-size:19px;margin:0}',
      // product grid
      '.atl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:24px}',
      '.atl-card{background:var(--paper);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:.16s;cursor:pointer}',
      '.atl-card:hover{box-shadow:0 16px 40px -26px rgba(33,28,21,.45);transform:translateY(-2px)}',
      '.atl-card-img{height:210px;overflow:hidden;background:#efe7da;position:relative}',
      '.atl-card-img img{width:100%;height:100%;object-fit:cover;transition:.3s}',
      '.atl-card:hover .atl-card-img img{transform:scale(1.05)}',
      '.atl-card-b{padding:14px 15px 16px;display:flex;flex-direction:column;flex:1}',
      '.atl-bname{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--clay)}',
      '.atl-pname{font-weight:600;font-size:15px;line-height:1.32;margin:3px 0 0}',
      '.atl-meta{color:var(--muted);font-size:12.5px;margin-top:3px}',
      '.atl-prow{display:flex;align-items:flex-end;justify-content:space-between;margin-top:12px;gap:8px}',
      '.atl-price{font-family:Fraunces,serif;font-weight:600;font-size:21px;color:var(--ink)}',
      '.atl-msrp{font-size:12px;color:var(--muted)}',
      '.atl-locked{font-size:12.5px;color:var(--clay);font-weight:600}',
      '.atl-ribbon{position:absolute;top:10px;left:10px;background:var(--ink);color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:6px}',
      '.atl-chip{display:inline-block;font-size:10.5px;font-weight:600;letter-spacing:.03em;color:var(--sage);background:#eef0e8;border-radius:20px;padding:3px 10px}',
      // value props
      '.atl-vals{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.atl-val{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px}',
      '.atl-val .ic{font-size:22px}',
      '.atl-val h4{margin:10px 0 4px;font-size:15px;font-weight:700}',
      // panels / rows
      '.atl-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.atl-row{display:flex;align-items:center;gap:14px;padding:16px 18px;border-top:1px solid var(--line)}',
      '.atl-row:first-child{border-top:0}',
      '.atl-grow{flex:1;min-width:0}',
      '.atl-mut{color:var(--muted);font-size:13px}',
      '.atl-sbadge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 11px;border-radius:20px;color:#fff}',
      '.atl-2col{display:grid;grid-template-columns:1fr 370px;gap:26px;align-items:start}',
      // forms
      '.atl-field{display:block;margin-top:14px}',
      '.atl-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.atl-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.atl-input:focus{outline:none;border-color:var(--clay)}',
      'textarea.atl-input{min-height:78px;resize:vertical}',
      // modal
      '.atl-modal{position:fixed;inset:0;z-index:200;background:rgba(33,28,21,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.atl-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:580px;max-height:92vh;overflow:auto;position:relative}',
      '.atl-x{position:absolute;top:14px;right:16px;background:none;border:0;font-size:24px;cursor:pointer;color:var(--muted);line-height:1;z-index:2}',
      // stats
      '.atl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.atl-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px}',
      '.atl-stat-n{font-family:Fraunces,serif;font-weight:600;font-size:30px;color:var(--ink);line-height:1}',
      '.atl-stat-l{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.atl-qty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:9px;overflow:hidden}',
      '.atl-qty button{background:var(--cream);border:0;width:32px;height:34px;cursor:pointer;font-size:16px;font-weight:700;color:var(--clay)}',
      '.atl-qty span{min-width:36px;text-align:center;font-weight:700;font-size:14px}',
      '.atl-foot{background:var(--ink);color:#c9bda9;padding:40px 0;font-size:13px;margin-top:40px}',
      '.atl-foot b{color:#fff;font-family:Fraunces,serif}',
      '.atl-tabs{display:flex;gap:4px;flex-wrap:wrap}',
      '.atl-tab{background:none;border:0;color:#c9bda9;cursor:pointer;font-size:14px;font-weight:600;padding:8px 15px;border-radius:9px}',
      '.atl-tab.on{background:var(--clay);color:#fff}',
      '.atl-empty{text-align:center;padding:64px 20px;color:var(--muted)}',
      '.atl-banner{background:#fbf4e9;border:1px solid var(--gold);color:#7a5a16;border-radius:11px;padding:11px 14px;font-size:13px}',
      '@media(max-width:1000px){.atl-grid{grid-template-columns:repeat(2,1fr)}.atl-bgrid,.atl-cats{grid-template-columns:repeat(2,1fr)}.atl-vals,.atl-stats{grid-template-columns:repeat(2,1fr)}.atl-2col{grid-template-columns:1fr}.atl-search{display:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── Small shared bits ───────────────────────────────────────────────────────
  function Logo(p) { return h('div', { className: 'atl-logo', onClick: p.onClick }, 'Atelier', h('span', null, '.')); }
  function SBadge(p) { return h('span', { className: 'atl-sbadge', style: { background: statusColor(p.s) } }, p.s); }
  function Field(p) { return h('label', { className: 'atl-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Eyebrow(p) { return h('div', { className: 'atl-eyebrow' }, p.children); }

  // ── Login ───────────────────────────────────────────────────────────────────
  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'buyer@atelier.market');
    var [pw, setPw] = React.useState('');
    var [busy, setBusy] = React.useState(false);
    var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'atl-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'atl-sheet', style: { maxWidth: '420px', padding: '36px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'atl-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'atl-h2', style: { marginTop: '18px', fontSize: '26px' } }, props.title || 'Trade login'),
        h('p', { className: 'atl-mut' }, props.note || 'Sign in to see wholesale pricing, build an order and check out.'),
        h(Field, { label: 'Email', children: h('input', { className: 'atl-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'atl-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: 'var(--clay)', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'atl-btn atl-btn-clay', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '20px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'atl-mut', style: { marginTop: '15px', textAlign: 'center', fontSize: '12.5px' } },
          'Demo — buyer: buyer@atelier.market · operator: operator@atelier.market · pw Password123!')));
  }

  // ── Top bar ───────────────────────────────────────────────────────────────────
  function TopBar(props) {
    var c = props.ctx;
    return h('div', null,
      h('div', { className: 'atl-top' }, h('div', { className: 'atl-wrap atl-top-in' },
        h(Logo, { onClick: function () { c.navigate('#/'); } }),
        h('div', { className: 'atl-search' },
          h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
            h('circle', { cx: 11, cy: 11, r: 8 }), h('path', { d: 'M21 21l-4.3-4.3' })),
          h('input', { placeholder: 'Search brands & products…', value: props.query || '',
            onChange: function (e) { props.onSearch(e.target.value); if (!/^#\/shop/.test(c.route)) c.navigate('#/shop'); } })),
        h('div', { className: 'atl-act' },
          c.isAdmin ? h('button', { className: 'atl-ibtn', onClick: function () { c.navigate('#/admin'); } }, '⚙ Console') : null,
          c.authed
            ? h('button', { className: 'atl-ibtn', onClick: function () { c.navigate('#/account'); } }, '👤 ' + ((client.userInfo || {}).fullName || 'Account').split(' ')[0])
            : h('button', { className: 'atl-ibtn', onClick: c.openLogin }, '👤 Trade login'),
          c.authed ? h('button', { className: 'atl-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout') : null,
          h('button', { className: 'atl-ibtn', onClick: function () { c.navigate('#/cart'); } }, '🛒',
            c.cart.count ? h('span', { className: 'atl-badge' }, c.cart.count) : null))
      )),
      h('div', { className: 'atl-catbar' }, h('div', { className: 'atl-wrap atl-catbar-in' },
        h('button', { className: cls('atl-cat', props.cat === 'all' && 'on'), onClick: function () { props.onCat('all'); c.navigate('#/shop'); } }, 'Shop all'),
        CATEGORIES.map(function (cat) {
          return h('button', { key: cat, className: cls('atl-cat', props.cat === cat && 'on'),
            onClick: function () { props.onCat(cat); c.navigate('#/shop'); } }, cat);
        }),
        h('button', { className: 'atl-cat', style: { marginLeft: 'auto', color: 'var(--clay)', fontWeight: 700 }, onClick: function () { c.navigate('#/brands'); } }, 'Brands →'))));
  }

  // ── Product card + quick view ───────────────────────────────────────────────
  function priceBlock(p, authed) {
    if (authed) return h('div', null,
      h('div', { className: 'atl-price' }, money(p.wholesale_price)),
      p.msrp ? h('div', { className: 'atl-msrp' }, 'MSRP ' + money(p.msrp)) : null);
    return h('div', null,
      h('div', { className: 'atl-locked' }, '🔒 Sign in for wholesale'),
      p.msrp ? h('div', { className: 'atl-msrp' }, 'Retail ' + money(p.msrp)) : null);
  }

  function ProductCard(props) {
    var p = props.p, c = props.ctx;
    return h('div', { className: 'atl-card', onClick: function () { props.ctx.navigate('#/product/' + p.uuid); } },
      h('div', { className: 'atl-card-img' },
        h('img', { src: imgUrl(p.image), alt: p.product_name, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
        p.bestseller ? h('span', { className: 'atl-ribbon' }, 'Bestseller') : (p.featured ? h('span', { className: 'atl-ribbon' }, 'Featured') : null)),
      h('div', { className: 'atl-card-b' },
        h('div', { className: 'atl-bname' }, p.brand_name || 'Atelier'),
        h('div', { className: 'atl-pname' }, p.product_name),
        h('div', { className: 'atl-meta' }, [p.unit, p.case_pack ? p.case_pack + '/case' : ''].filter(Boolean).join(' · ')),
        h('div', { className: 'atl-prow' },
          priceBlock(p, c.authed),
          c.authed
            ? h('button', { className: 'atl-btn atl-btn-clay atl-btn-sm', onClick: function (e) { e.stopPropagation(); c.cart.add(p); } }, '+ Add')
            : h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function (e) { e.stopPropagation(); c.openLogin(); } }, 'Sign in'))));
  }

  function ProductModal(props) {
    var p = props.p, c = props.ctx; var [qty, setQty] = React.useState(1);
    if (!p) return null;
    return h('div', { className: 'atl-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'atl-sheet', style: { maxWidth: '760px' } },
        h('button', { className: 'atl-x', onClick: props.onClose }, '×'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 } },
          h('div', { style: { minHeight: '340px', background: '#efe7da' } },
            h('img', { src: imgUrl(p.image), alt: p.product_name, style: { width: '100%', height: '100%', objectFit: 'cover', minHeight: '340px' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { style: { padding: '28px' } },
            h('div', { className: 'atl-bname', style: { cursor: 'pointer' }, onClick: function () { props.onClose(); c.navigate('#/brand/' + slug(p.brand_name)); } }, p.brand_name || 'Atelier'),
            h('h2', { className: 'atl-h2', style: { fontSize: '26px', marginTop: '5px' } }, p.product_name),
            h('div', { className: 'atl-meta', style: { marginTop: '6px' } }, [p.category, p.materials].filter(Boolean).join(' · ')),
            h('div', { style: { margin: '16px 0' } }, c.authed
              ? h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '12px' } }, h('div', { className: 'atl-price', style: { fontSize: '32px' } }, money(p.wholesale_price)), p.msrp ? h('div', { className: 'atl-msrp' }, 'MSRP ' + money(p.msrp)) : null)
              : h('div', { className: 'atl-banner' }, '🔒 Sign in with a trade account to see wholesale pricing.')),
            h('p', { style: { fontSize: '14px', lineHeight: 1.6, color: 'var(--ink2)' } }, p.description || ''),
            p.unit ? h('div', { className: 'atl-mut', style: { marginTop: '8px' } }, 'Sold as: ' + p.unit) : null,
            c.authed ? h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginTop: '20px' } },
              h('div', { className: 'atl-qty' },
                h('button', { onClick: function () { setQty(Math.max(1, qty - 1)); } }, '−'),
                h('span', null, qty),
                h('button', { onClick: function () { setQty(qty + 1); } }, '+')),
              h('button', { className: 'atl-btn atl-btn-clay', style: { flex: 1 }, onClick: function () { c.cart.add(p, qty); props.onClose(); } }, 'Add ' + qty + ' to order'))
              : h('button', { className: 'atl-btn atl-btn-clay', style: { marginTop: '18px', width: '100%' }, onClick: function () { props.onClose(); c.openLogin(); } }, 'Sign in to order')))));
  }

  // ── Product detail page ───────────────────────────────────────────────────────
  function ProductPage(props) {
    var c = props.ctx;
    var products = c.products || [];
    var p = products.filter(function (x) { return x.uuid === props.uuid; })[0];
    var qtyState = React.useState(1); var qty = qtyState[0], setQty = qtyState[1];
    if (c.products === null) return h('div', { className: 'atl-wrap atl-sec' }, h('div', { className: 'atl-empty' }, 'Loading…'));
    if (!p) return h('div', { className: 'atl-wrap atl-sec' }, h('div', { className: 'atl-empty' }, h('h2', { className: 'atl-h2' }, 'Product not found'), h('button', { className: 'atl-btn atl-btn-clay', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/shop'); } }, 'Back to shop')));
    var sameBrand = products.filter(function (x) { return x.brand_name === p.brand_name && x.uuid !== p.uuid; }).slice(0, 4);
    var sameCat = products.filter(function (x) { return x.category === p.category && x.brand_name !== p.brand_name && x.uuid !== p.uuid; }).slice(0, 4);
    return h('div', { className: 'atl-wrap atl-sec' },
      h('div', { className: 'atl-meta', style: { marginBottom: '14px' } },
        h('span', { style: { cursor: 'pointer' }, onClick: function () { c.navigate('#/shop'); } }, 'Shop'), '  ·  ',
        h('span', { style: { cursor: 'pointer', color: 'var(--clay)' }, onClick: function () { c.navigate('#/brand/' + slug(p.brand_name)); } }, p.brand_name), '  ·  ', p.product_name),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px', alignItems: 'start' } },
        h('div', { style: { borderRadius: '16px', overflow: 'hidden', background: '#efe7da', minHeight: '440px' } },
          h('img', { src: imgUrl(p.image), alt: p.product_name, style: { width: '100%', height: '100%', objectFit: 'cover', minHeight: '440px' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
        h('div', null,
          h('div', { className: 'atl-bname', style: { cursor: 'pointer' }, onClick: function () { c.navigate('#/brand/' + slug(p.brand_name)); } }, p.brand_name),
          h('h1', { className: 'atl-h2 serif', style: { fontSize: '34px', margin: '6px 0' } }, p.product_name),
          h('div', { className: 'atl-meta' }, [p.category, p.materials].filter(Boolean).join(' · ')),
          h('div', { style: { margin: '18px 0' } }, c.authed
            ? h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' } }, h('div', { className: 'atl-price', style: { fontSize: '34px' } }, money(p.wholesale_price)), p.msrp ? h('div', { className: 'atl-msrp' }, 'MSRP ' + money(p.msrp) + ' · keystone margin') : null)
            : h('div', { className: 'atl-banner' }, '🔒 Sign in with a trade account to see wholesale pricing.')),
          h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: 'var(--ink2)' } }, p.description || ''),
          h('div', { className: 'atl-panel', style: { padding: '16px', marginTop: '16px' } },
            [['Sold as', p.unit || 'Each'], ['Case pack', (p.case_pack || 1) + ' units'], ['SKU', p.sku || '—'], ['Category', p.category]].map(function (r, i) {
              return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? '1px solid var(--line)' : 0, fontSize: '13.5px' } }, h('span', { className: 'atl-mut' }, r[0]), h('b', null, String(r[1])));
            })),
          c.authed ? h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginTop: '20px' } },
            h('div', { className: 'atl-qty' }, h('button', { onClick: function () { setQty(Math.max(1, qty - 1)); } }, '−'), h('span', null, qty), h('button', { onClick: function () { setQty(qty + 1); } }, '+')),
            h('button', { className: 'atl-btn atl-btn-clay', style: { flex: 1 }, onClick: function () { c.cart.add(p, qty); } }, 'Add ' + qty + ' to order'))
            : h('button', { className: 'atl-btn atl-btn-clay', style: { marginTop: '18px', width: '100%' }, onClick: c.openLogin }, 'Sign in to order'))),
      sameBrand.length ? h('section', { style: { marginTop: '50px' } },
        h(Eyebrow, null, 'More from this brand'),
        h('h2', { className: 'atl-h2', style: { marginTop: '4px' } }, p.brand_name),
        h('div', { className: 'atl-grid' }, sameBrand.map(function (x) { return h(ProductCard, { key: x.uuid, p: x, ctx: c, onOpen: function () {} }); }))) : null,
      sameCat.length ? h('section', { style: { marginTop: '40px' } },
        h(Eyebrow, null, 'You may also like'),
        h('h2', { className: 'atl-h2', style: { marginTop: '4px' } }, 'More in ' + p.category),
        h('div', { className: 'atl-grid' }, sameCat.map(function (x) { return h(ProductCard, { key: x.uuid, p: x, ctx: c, onOpen: function () {} }); }))) : null);
  }

  // ── Brand card + page ─────────────────────────────────────────────────────────
  function BrandCard(props) {
    var b = props.b;
    return h('div', { className: 'atl-bcard', onClick: function () { props.ctx.navigate('#/brand/' + slug(b.brand_name)); } },
      h('div', { className: 'atl-bcard-img' }, h('img', { src: imgUrl(b.hero || b.logo), alt: b.brand_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
      h('div', { className: 'atl-bcard-b' },
        h('div', { className: 'atl-bname' }, b.category || ''),
        h('h3', null, b.brand_name),
        h('div', { className: 'atl-mut', style: { marginTop: '4px' } }, b.tagline || ''),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' } },
          b.location ? h('span', { className: 'atl-chip' }, '📍 ' + b.location) : null,
          b.min_order ? h('span', { className: 'atl-chip' }, 'Min ' + money(b.min_order)) : null)));
  }

  function BrandPage(props) {
    var c = props.ctx;
    var brand = (c.brands || []).filter(function (b) { return slug(b.brand_name) === props.slug; })[0];
    var prods = (c.products || []).filter(function (p) { return brand && p.brand_name === brand.brand_name; }).sort(bySort);
    if (c.brands === null) return h('div', { className: 'atl-wrap atl-sec' }, h('div', { className: 'atl-empty' }, 'Loading…'));
    if (!brand) return h('div', { className: 'atl-wrap atl-sec' }, h('div', { className: 'atl-empty' }, h('h2', { className: 'atl-h2' }, 'Brand not found'), h('button', { className: 'atl-btn atl-btn-clay', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/brands'); } }, 'Browse brands')));
    return h('div', null,
      h('section', { className: 'atl-hero', style: { background: 'var(--ink2)' } },
        h('img', { src: imgUrl(brand.hero || brand.logo), alt: '' }),
        h('div', { className: 'atl-wrap atl-hero-in', style: { padding: '64px 0 70px' } },
          h('span', { className: 'atl-pill' }, brand.category || 'Brand'),
          h('h1', { style: { fontSize: 'clamp(32px,4vw,52px)' } }, brand.brand_name),
          h('p', null, brand.tagline || ''))),
      h('section', { className: 'atl-sec' }, h('div', { className: 'atl-wrap atl-2col' },
        h('div', null,
          h(Eyebrow, null, 'The maker'),
          h('p', { style: { fontSize: '16px', lineHeight: 1.7, color: 'var(--ink2)', marginTop: '8px' } }, brand.story || brand.tagline || ''),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' } },
            (brand.values || '').split('·').map(function (v, i) { return v.trim() ? h('span', { key: i, className: 'atl-chip' }, v.trim()) : null; }))),
        h('div', { className: 'atl-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '8px' } }, 'Wholesale terms'),
          [['Minimum order', brand.min_order ? money(brand.min_order) : '—'], ['Lead time', brand.lead_time || '—'],
           ['Location', brand.location || '—'], ['Est.', brand.year_founded || '—']].map(function (r, i) {
            return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: i ? '1px solid var(--line)' : '0', fontSize: '14px' } }, h('span', { className: 'atl-mut' }, r[0]), h('b', null, String(r[1])));
          })))),
      h('section', { style: { paddingBottom: '60px' } }, h('div', { className: 'atl-wrap' },
        h('h2', { className: 'atl-h2' }, 'From ' + brand.brand_name),
        prods.length ? h('div', { className: 'atl-grid' }, prods.map(function (p) { return h(ProductCard, { key: p.uuid, p: p, ctx: c, onOpen: props.onOpen }); }))
          : h('div', { className: 'atl-empty' }, 'No products yet.'))));
  }

  // ── Storefront ──────────────────────────────────────────────────────────────
  var CAT_IMG = {
    'Home & Living': '1586023492125-27b2c045efd7', 'Apparel & Accessories': '1523381210434-271e8be1f52b',
    'Beauty & Wellness': '1556228720-195a672e8a03', 'Food & Drink': '1497534547324-0ebb3f052e88',
    'Stationery & Gifts': '1531346878377-a5be20888e57', 'Jewelry': '1515562141207-7a88fb7ce338',
    'Kids & Baby': '1515488042361-ee00e0ddd4e4'
  };
  function catImg(cat) { return 'https://images.unsplash.com/photo-' + (CAT_IMG[cat] || CAT_IMG['Home & Living']) + '?auto=format&fit=crop&q=80&w=500&h=400'; }

  function Hero(props) {
    var c = props.ctx;
    return h('section', { className: 'atl-hero' },
      h('img', { src: BRAND.hero, alt: '' }),
      h('div', { className: 'atl-wrap atl-hero-in' },
        h('span', { className: 'atl-pill' }, 'The wholesale marketplace for independents'),
        h('h1', null, 'Stock your shelves with brands you won’t find anywhere else.'),
        h('p', null, 'Discover ' + (c.brands ? c.brands.length : '100s of') + ' independent makers, order across brands in one cart, and pay on flexible net terms.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '26px', flexWrap: 'wrap' } },
          h('button', { className: 'atl-btn atl-btn-clay', onClick: function () { c.navigate('#/shop'); } }, 'Browse the marketplace'),
          h('button', { className: 'atl-btn atl-btn-ghost', style: { background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.openCurate(); } }, '✦ Curate my order with AI'))));
  }

  function ValueProps() {
    var v = [['🌿', 'Independent only', 'Every brand is a small, independent maker — curated, never mass-market.'],
      ['🧾', 'Flexible net terms', 'Buy now, pay in 30, 60 days. Approved trade accounts only.'],
      ['📦', 'One cart, many brands', 'Mix dozens of brands in a single order and a single checkout.'],
      ['↩️', 'Free returns', 'Try a new brand risk-free on your opening order.']];
    return h('div', { className: 'atl-vals' }, v.map(function (x, i) {
      return h('div', { key: i, className: 'atl-val' }, h('div', { className: 'ic' }, x[0]), h('h4', null, x[1]), h('div', { className: 'atl-mut' }, x[2]));
    }));
  }

  function Storefront(props) {
    var c = props.ctx;
    var products = (c.products || []).slice().sort(bySort);
    var brands = (c.brands || []).slice().sort(bySort);
    var featuredBrands = brands.filter(function (b) { return b.featured; }).slice(0, 6);
    var trending = products.filter(function (p) { return p.bestseller; }).slice(0, 8);
    if (!trending.length) trending = products.slice(0, 8);
    return h('div', null,
      h(Hero, { ctx: c }),
      h('section', { className: 'atl-sec' }, h('div', { className: 'atl-wrap' },
        h(Eyebrow, null, 'Shop by category'),
        h('div', { className: 'atl-cats' }, CATEGORIES.map(function (cat) {
          return h('div', { key: cat, className: 'atl-cattile', onClick: function () { props.onCat(cat); c.navigate('#/shop'); } },
            h('img', { src: catImg(cat), alt: cat, onError: function (e) { e.target.style.visibility = 'hidden'; } }), h('span', null, cat));
        })))),
      featuredBrands.length ? h('section', { style: { paddingBottom: '10px' } }, h('div', { className: 'atl-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h(Eyebrow, null, 'Featured makers'), h('h2', { className: 'atl-h2', style: { marginTop: '4px' } }, 'Brands we love right now')),
          h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { c.navigate('#/brands'); } }, 'All brands')),
        h('div', { className: 'atl-bgrid' }, featuredBrands.map(function (b) { return h(BrandCard, { key: b.uuid, b: b, ctx: c }); })))) : null,
      h('section', { className: 'atl-sec' }, h('div', { className: 'atl-wrap' },
        h(Eyebrow, null, 'Trending'),
        h('h2', { className: 'atl-h2', style: { marginTop: '4px' } }, 'Bestsellers across the marketplace'),
        c.products === null ? h('div', { className: 'atl-empty' }, 'Loading catalog…')
          : h('div', { className: 'atl-grid' }, trending.map(function (p) { return h(ProductCard, { key: p.uuid, p: p, ctx: c, onOpen: props.onOpen }); })))),
      h('section', { style: { paddingBottom: '40px' } }, h('div', { className: 'atl-wrap' }, h(ValueProps, null))));
  }

  function ShopPage(props) {
    var c = props.ctx; var cat = props.cat, q = (props.query || '').toLowerCase();
    var products = (c.products || []).slice().sort(bySort);
    var list = products.filter(function (p) {
      if (cat && cat !== 'all' && p.category !== cat) return false;
      if (q && (p.product_name + ' ' + (p.brand_name || '') + ' ' + (p.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    return h('div', { className: 'atl-wrap atl-sec' },
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
        h('h2', { className: 'atl-h2' }, cat && cat !== 'all' ? cat : (q ? 'Search' : 'Shop all')),
        h('div', { className: 'atl-mut' }, list.length + ' product' + (list.length === 1 ? '' : 's'))),
      c.products === null ? h('div', { className: 'atl-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'atl-grid' }, list.map(function (p) { return h(ProductCard, { key: p.uuid, p: p, ctx: c, onOpen: props.onOpen }); }))
        : h('div', { className: 'atl-empty' }, h('div', { style: { fontSize: '40px' } }, '🔍'), h('div', { style: { marginTop: '8px', fontWeight: 600 } }, 'No products found')));
  }

  function BrandsPage(props) {
    var c = props.ctx; var brands = (c.brands || []).slice().sort(bySort);
    return h('div', { className: 'atl-wrap atl-sec' },
      h(Eyebrow, null, 'Every maker on Atelier'),
      h('h2', { className: 'atl-h2', style: { marginTop: '4px' } }, 'Browse all brands'),
      c.brands === null ? h('div', { className: 'atl-empty' }, 'Loading…')
        : h('div', { className: 'atl-bgrid' }, brands.map(function (b) { return h(BrandCard, { key: b.uuid, b: b, ctx: c }); })));
  }

  // ── AI buyer-curation assistant ───────────────────────────────────────────────
  function CuratePanel(props) {
    var c = props.ctx;
    var [storeType, setStoreType] = React.useState('Boutique');
    var [desc, setDesc] = React.useState('');
    var [busy, setBusy] = React.useState(false);
    var [recs, setRecs] = React.useState(null);
    var [note, setNote] = React.useState('');
    function run() {
      var products = c.products || [];
      if (!products.length) { showToast('Catalog still loading', 'info'); return; }
      setBusy(true); setRecs(null); setNote('');
      var catalog = products.map(function (p) { return '- ' + p.product_name + ' | ' + p.brand_name + ' | ' + p.category + ' | wholesale $' + p.wholesale_price; }).join('\n');
      var prompt = 'You are a wholesale buying assistant for Atelier, a marketplace of independent brands. ' +
        'A retailer describes their shop; recommend 6 to 8 products from the CATALOG that would sell well for them, mixing brands and price points. ' +
        'Shop type: ' + storeType + '. Description: "' + (desc || 'a tasteful, modern independent shop') + '".\n\n' +
        'CATALOG:\n' + catalog + '\n\n' +
        'Respond with ONLY a JSON array of the exact product names you recommend, e.g. ["Name A","Name B"]. No other text.';
      Promise.resolve()
        .then(function () { if (!services || !services.ai || !services.ai.complete) throw new Error('no-ai'); return services.ai.complete({ prompt: prompt }); })
        .then(function (res) {
          var text = (res && (res.output && (res.output.text || res.output.completion || res.output)) || res.text || res.completion || res.content || res) || '';
          if (typeof text !== 'string') text = JSON.stringify(text);
          var names = [];
          try { var m = text.match(/\[[\s\S]*\]/); if (m) names = JSON.parse(m[0]); } catch (e) {}
          var picked = [];
          (names || []).forEach(function (n) {
            var p = products.filter(function (x) { return x.product_name.toLowerCase() === String(n).toLowerCase(); })[0]
              || products.filter(function (x) { return x.product_name.toLowerCase().indexOf(String(n).toLowerCase()) >= 0; })[0];
            if (p && picked.indexOf(p) < 0) picked.push(p);
          });
          if (!picked.length) { picked = products.filter(function (p) { return p.bestseller; }).slice(0, 6); setNote('Showing our bestsellers — refine your description for a tailored pick.'); }
          setRecs(picked); setBusy(false);
        })
        .catch(function () {
          // graceful fallback: curate from bestsellers + category fit
          var picked = products.filter(function (p) { return p.bestseller; }).slice(0, 6);
          if (!picked.length) picked = products.slice(0, 6);
          setRecs(picked); setBusy(false); setNote('AI is offline in this environment — here is a curated bestseller set.');
        });
    }
    function addAll() { (recs || []).forEach(function (p) { c.cart.add(p, 1, true); }); showToast('Added ' + (recs || []).length + ' items to your order', 'success'); props.onClose(); c.navigate('#/cart'); }
    return h('div', { className: 'atl-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'atl-sheet', style: { maxWidth: '680px', padding: '30px' } },
        h('button', { className: 'atl-x', onClick: props.onClose }, '×'),
        h(Eyebrow, null, '✦ AI buyer assistant'),
        h('h2', { className: 'atl-h2', style: { marginTop: '4px' } }, 'Curate a starter order'),
        h('p', { className: 'atl-mut' }, 'Tell us about your shop and we’ll hand-pick products from across the marketplace.'),
        h(Field, { label: 'Shop type', children: h('select', { className: 'atl-input', value: storeType, onChange: function (e) { setStoreType(e.target.value); } }, STORE_TYPES.map(function (s) { return h('option', { key: s, value: s }, s); })) }),
        h(Field, { label: 'Describe your shop & customers', children: h('textarea', { className: 'atl-input', placeholder: 'e.g. a coastal home & gift shop for design-led shoppers who care about sustainability', value: desc, onChange: function (e) { setDesc(e.target.value); } }) }),
        h('button', { className: 'atl-btn atl-btn-clay', style: { marginTop: '16px' }, disabled: busy, onClick: run }, busy ? 'Curating…' : '✦ Curate my order'),
        note ? h('div', { className: 'atl-banner', style: { marginTop: '14px' } }, note) : null,
        recs ? h('div', { style: { marginTop: '18px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
            h('div', { style: { fontWeight: 700 } }, 'Recommended (' + recs.length + ')'),
            c.authed ? h('button', { className: 'atl-btn atl-btn-ink atl-btn-sm', onClick: addAll }, 'Add all to order') : null),
          recs.map(function (p) {
            return h('div', { key: p.uuid, className: 'atl-row', style: { padding: '10px 0' } },
              h('div', { style: { width: '46px', height: '46px', borderRadius: '8px', overflow: 'hidden', flex: 'none', background: '#efe7da' } }, h('img', { src: imgUrl(p.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
              h('div', { className: 'atl-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, p.product_name), h('div', { className: 'atl-mut' }, p.brand_name)),
              c.authed ? h('div', { style: { fontWeight: 700 } }, money(p.wholesale_price)) : h('span', { className: 'atl-locked' }, '🔒'));
          })) : null));
  }

  // ── Cart ──────────────────────────────────────────────────────────────────────
  function CartPage(props) {
    var c = props.ctx; var items = c.cart.items;
    if (!items.length) return h('div', { className: 'atl-wrap atl-sec' },
      h('div', { className: 'atl-empty' }, h('div', { style: { fontSize: '46px' } }, '🛒'),
        h('h2', { className: 'atl-h2', style: { marginTop: '10px' } }, 'Your order is empty'),
        h('p', { className: 'atl-mut' }, 'Discover brands and add products to build your wholesale order.'),
        h('button', { className: 'atl-btn atl-btn-clay', style: { marginTop: '16px' }, onClick: function () { c.navigate('#/shop'); } }, 'Browse the marketplace')));
    // group by brand
    var groups = {};
    items.forEach(function (it) { (groups[it.brand_name || 'Other'] = groups[it.brand_name || 'Other'] || []).push(it); });
    return h('div', { className: 'atl-wrap atl-sec' },
      h('h2', { className: 'atl-h2' }, 'Your wholesale order'),
      h('p', { className: 'atl-mut', style: { marginBottom: '4px' } }, Object.keys(groups).length + ' brand' + (Object.keys(groups).length === 1 ? '' : 's') + ' · ' + c.cart.count + ' items'),
      h('div', { className: 'atl-2col', style: { marginTop: '18px' } },
        h('div', null, Object.keys(groups).map(function (bn) {
          return h('div', { key: bn, className: 'atl-panel', style: { marginBottom: '16px' } },
            h('div', { style: { padding: '13px 18px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontFamily: 'Fraunces,serif' } }, bn),
            groups[bn].map(function (it) {
              return h('div', { key: it.product_uuid, className: 'atl-row' },
                h('div', { style: { width: '54px', height: '54px', borderRadius: '8px', overflow: 'hidden', flex: 'none', background: '#efe7da' } }, h('img', { src: imgUrl(it.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
                h('div', { className: 'atl-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, it.product_name), h('div', { className: 'atl-mut' }, money(it.unit_price) + ' · ' + (it.unit || 'each'))),
                h('div', { className: 'atl-qty' },
                  h('button', { onClick: function () { c.cart.setQty(it, it.quantity - 1); } }, '−'),
                  h('span', null, it.quantity),
                  h('button', { onClick: function () { c.cart.setQty(it, it.quantity + 1); } }, '+')),
                h('div', { style: { fontWeight: 700, minWidth: '80px', textAlign: 'right' } }, money(it.unit_price * it.quantity)),
                h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { c.cart.remove(it); } }, '✕'));
            }));
        })),
        h('div', { className: 'atl-panel', style: { padding: '22px', position: 'sticky', top: '90px' } },
          h('div', { style: { fontWeight: 700, fontSize: '16px', marginBottom: '12px' } }, 'Order summary'),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } }, h('span', { className: 'atl-mut' }, 'Subtotal'), h('b', null, money(c.cart.subtotal))),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } }, h('span', { className: 'atl-mut' }, 'Shipping'), h('span', null, 'Calculated at fulfilment')),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '6px', fontSize: '18px' } }, h('b', null, 'Total'), h('b', { style: { color: 'var(--clay)' } }, money(c.cart.subtotal))),
          h('button', { className: 'atl-btn atl-btn-clay', style: { width: '100%', marginTop: '18px' }, onClick: function () { c.navigate('#/checkout'); } }, 'Proceed to checkout'),
          h('button', { className: 'atl-btn atl-btn-ghost', style: { width: '100%', marginTop: '10px' }, onClick: function () { c.navigate('#/shop'); } }, 'Keep shopping'))));
  }

  function Checkout(props) {
    var c = props.ctx; var u = client.userInfo || {};
    var [f, setF] = React.useState({ buyer_name: u.fullName || '', buyer_email: u.email || '', buyer_phone: '', business_name: '', shipping_address: '', notes: '' });
    var [terms, setTerms] = React.useState('Net 30');
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    React.useEffect(function () {
      if (!c.authed) return;
      client.getObjects('buyer').then(function (rows) { var b = arr(rows)[0]; if (b) setF(function (p) { return Object.assign({}, p, { buyer_name: b.buyer_name || p.buyer_name, business_name: b.business_name || '', buyer_phone: b.phone || '', shipping_address: b.address || '' }); }); }).catch(function () {});
    }, [c.authed]);
    if (!c.cart.items.length) { c.navigate('#/shop'); return null; }
    function submit(e) {
      e.preventDefault();
      if (!c.authed) { c.openLogin(); return; }
      setBusy(true);
      c.placeOrder(f, { payment_terms: terms }).then(function (r) {
        setBusy(false); if (r && r.redirected) return;
      }).catch(function (err) { setBusy(false); showToast('Checkout failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    var prepaid = terms === 'Prepaid';
    return h('div', { className: 'atl-wrap atl-sec' },
      h('h2', { className: 'atl-h2' }, 'Checkout'),
      h('form', { className: 'atl-2col', style: { marginTop: '18px' }, onSubmit: submit },
        h('div', { className: 'atl-panel', style: { padding: '24px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Shipping & account'),
          !c.authed ? h('div', { className: 'atl-banner', style: { marginTop: '8px' } }, 'Sign in to place your wholesale order — click below and you’ll be prompted.') : null,
          h(Field, { label: 'Business / shop name', req: true, children: h('input', { className: 'atl-input', required: true, value: f.business_name, onChange: function (e) { set('business_name', e.target.value); } }) }),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h(Field, { label: 'Contact name', req: true, children: h('input', { className: 'atl-input', required: true, value: f.buyer_name, onChange: function (e) { set('buyer_name', e.target.value); } }) }),
            h(Field, { label: 'Email', req: true, children: h('input', { className: 'atl-input', type: 'email', required: true, value: f.buyer_email, onChange: function (e) { set('buyer_email', e.target.value); } }) })),
          h(Field, { label: 'Phone', children: h('input', { className: 'atl-input', value: f.buyer_phone, onChange: function (e) { set('buyer_phone', e.target.value); } }) }),
          h(Field, { label: 'Shipping address', req: true, children: h('textarea', { className: 'atl-input', required: true, value: f.shipping_address, onChange: function (e) { set('shipping_address', e.target.value); } }) }),
          h(Field, { label: 'Order notes', children: h('textarea', { className: 'atl-input', value: f.notes, onChange: function (e) { set('notes', e.target.value); } }) })),
        h('div', { className: 'atl-panel', style: { padding: '22px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, c.cart.count + ' items'),
          c.cart.items.map(function (it) {
            return h('div', { key: it.product_uuid, style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '7px' } },
              h('span', null, it.quantity + '× ' + it.product_name), h('b', null, money(it.unit_price * it.quantity)));
          }),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '8px', fontSize: '18px' } }, h('b', null, 'Total'), h('b', { style: { color: 'var(--clay)' } }, money(c.cart.subtotal))),
          h(Field, { label: 'Payment terms', children: h('select', { className: 'atl-input', value: terms, onChange: function (e) { setTerms(e.target.value); } }, NET_TERMS.map(function (t) { return h('option', { key: t, value: t }, t === 'Prepaid' ? 'Prepaid (card via Stripe)' : t + ' (invoice)'); })) }),
          h('button', { className: 'atl-btn atl-btn-clay', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '16px' } }, busy ? 'Processing…' : (prepaid ? 'Pay with Stripe' : 'Place order on ' + terms)),
          h('p', { className: 'atl-mut', style: { marginTop: '10px', textAlign: 'center', fontSize: '12px' } }, prepaid ? '🔒 Secure checkout via Stripe' : '🧾 We’ll invoice you on ' + terms + ' terms'))));
  }

  function OrderConfirm(props) {
    var c = props.ctx;
    var [order, setOrder] = React.useState(null);
    var [items, setItems] = React.useState([]);
    React.useEffect(function () {
      client.getObjects('order').then(function (rows) {
        var o = arr(rows).filter(function (x) { return x.uuid === props.uuid; })[0];
        setOrder(o || null);
        if (o) client.getScopedList('order', o.uuid, 'order_item').then(function (it) { setItems(arr(it)); }).catch(function () {});
      }).catch(function () {});
    }, [props.uuid]);
    return h('div', { className: 'atl-wrap atl-sec' },
      h('div', { className: 'atl-panel', style: { padding: '36px', maxWidth: '660px', margin: '0 auto', textAlign: 'center' } },
        h('div', { style: { fontSize: '46px' } }, '✅'),
        h('h2', { className: 'atl-h2', style: { marginTop: '8px' } }, 'Order placed'),
        h('p', { className: 'atl-mut' }, order ? ('Order ' + order.order_number + ' — thank you!') : 'Thank you for your order!'),
        order && order.payment_provider === 'simulated' ? h('div', { className: 'atl-banner', style: { margin: '12px 0' } }, 'Payment was simulated (Stripe not configured in this environment).') : null,
        order ? h('div', { style: { textAlign: 'left', marginTop: '16px' } },
          items.map(function (it) { return h('div', { key: it.uuid, style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' } }, h('span', null, it.quantity + '× ' + it.product_name), h('b', null, money(it.line_total))); }),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '10px', marginTop: '6px', fontSize: '17px' } }, h('b', null, 'Total'), h('b', { style: { color: 'var(--clay)' } }, money(order.total)))) : null,
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '22px' } },
          h('button', { className: 'atl-btn atl-btn-ink', onClick: function () { c.navigate('#/account'); } }, 'My orders'),
          h('button', { className: 'atl-btn atl-btn-ghost', onClick: function () { c.navigate('#/shop'); } }, 'Keep shopping'))));
  }

  function MyOrders(props) {
    var c = props.ctx;
    var [orders, setOrders] = React.useState(null);
    React.useEffect(function () {
      if (!c.authed) return;
      client.getObjects('order').then(function (rows) { setOrders(arr(rows).sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); })); }).catch(function () { setOrders([]); });
    }, [c.authed]);
    if (!c.authed) return h('div', { className: 'atl-wrap atl-sec' }, h('div', { className: 'atl-empty' }, h('h2', { className: 'atl-h2' }, 'Sign in to view your orders'), h('button', { className: 'atl-btn atl-btn-clay', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Trade login')));
    return h('div', { className: 'atl-wrap atl-sec' },
      h('h2', { className: 'atl-h2' }, 'My orders'),
      h('div', { className: 'atl-panel', style: { marginTop: '16px' } },
        orders === null ? h('div', { className: 'atl-row atl-mut' }, 'Loading…')
          : orders.length ? orders.map(function (o) {
            return h('div', { key: o.uuid, className: 'atl-row' },
              h('div', { className: 'atl-grow' }, h('div', { style: { fontWeight: 700 } }, o.order_number),
                h('div', { className: 'atl-mut' }, (o.item_count || 0) + ' items · ' + (o.brand_count || 1) + ' brands · ' + (o.created_at || '').slice(0, 10) + (o.payment_terms ? ' · ' + o.payment_terms : ''))),
              h(SBadge, { s: o.order_state }), h(SBadge, { s: o.pay_state || 'unpaid' }),
              h('div', { style: { fontWeight: 700, minWidth: '92px', textAlign: 'right' } }, money(o.total)));
          }) : h('div', { className: 'atl-empty' }, 'No orders yet — start with an AI-curated order!')));
  }

  // ── Admin / operator console ────────────────────────────────────────────────
  function AStat(p) { return h('div', { className: 'atl-stat' }, h('div', { className: 'atl-stat-n' }, p.n), h('div', { className: 'atl-stat-l' }, p.l)); }

  function AdminHome(props) {
    var c = props.ctx;
    var [orders, setOrders] = React.useState([]);
    React.useEffect(function () { client.getObjects('order').then(function (r) { setOrders(arr(r)); }).catch(function () {}); }, []);
    var gmv = orders.reduce(function (s, o) { return s + (o.total || 0); }, 0);
    var open = orders.filter(function (o) { return ['pending', 'confirmed', 'shipped'].indexOf(o.order_state) >= 0; }).length;
    var topBrands = {};
    (c.products || []).forEach(function (p) { topBrands[p.brand_name] = 1; });
    return h('div', null,
      h('div', { className: 'atl-stats' },
        h(AStat, { n: money(gmv), l: 'Gross merch. value' }),
        h(AStat, { n: orders.length, l: 'Orders' }),
        h(AStat, { n: open, l: 'Open orders' }),
        h(AStat, { n: (c.brands || []).length, l: 'Brands' })),
      h('div', { className: 'atl-stats', style: { marginTop: '16px' } },
        h(AStat, { n: (c.products || []).length, l: 'Products' }),
        h(AStat, { n: orders.filter(function (o) { return o.pay_state === 'paid'; }).length, l: 'Paid orders' }),
        h(AStat, { n: orders.filter(function (o) { return o.pay_state === 'unpaid'; }).length, l: 'On terms (unpaid)' }),
        h(AStat, { n: money(orders.length ? gmv / orders.length : 0), l: 'Avg order' })),
      h('div', { className: 'atl-panel', style: { marginTop: '18px', padding: '22px' } },
        h('div', { style: { fontWeight: 700, marginBottom: '6px', fontFamily: 'Fraunces,serif', fontSize: '18px' } }, 'Welcome to the Atelier console'),
        h('div', { className: 'atl-mut' }, 'Manage brands and their catalogs, review and fulfil wholesale orders across the marketplace, and see who’s buying. Use the tabs above.')));
  }

  function AdminOrders(props) {
    var c = props.ctx;
    var [orders, setOrders] = React.useState(null);
    var [open, setOpen] = React.useState(null);
    var [items, setItems] = React.useState([]);
    function load() { client.getObjects('order').then(function (r) { setOrders(arr(r).sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); })); }).catch(function () { setOrders([]); }); }
    React.useEffect(load, []);
    function openOrder(o) { setOpen(o); setItems([]); client.getScopedList('order', o.uuid, 'order_item').then(function (it) { setItems(arr(it)); }).catch(function () {}); }
    function setState(o, st) {
      var patch = { order_state: st };
      if (st === 'delivered' && o.pay_state === 'unpaid' && o.payment_terms === 'Prepaid') patch.pay_state = 'paid';
      client.updateObject('order', o.uuid, patch, o).then(function () { showToast('Order ' + st, 'success'); load(); setOpen(Object.assign({}, o, patch)); }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    function setPay(o, ps) {
      var patch = { pay_state: ps }; if (ps === 'paid') patch.paid_at = new Date().toISOString();
      client.updateObject('order', o.uuid, patch, o).then(function () { showToast('Marked ' + ps, 'success'); load(); setOpen(Object.assign({}, o, patch)); }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    var NEXT = { pending: 'confirmed', confirmed: 'shipped', shipped: 'delivered' };
    return h('div', { className: 'atl-2col' },
      h('div', null,
        h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'All orders'),
        h('div', { className: 'atl-panel' },
          orders === null ? h('div', { className: 'atl-row atl-mut' }, 'Loading…')
            : orders.length ? orders.map(function (o) {
              return h('div', { key: o.uuid, className: 'atl-row', style: { cursor: 'pointer', background: open && open.uuid === o.uuid ? '#faf4ea' : '' }, onClick: function () { openOrder(o); } },
                h('div', { className: 'atl-grow' }, h('div', { style: { fontWeight: 700 } }, o.order_number, o.placed_by === 'admin' ? h('span', { className: 'atl-chip', style: { marginLeft: '8px' } }, 'On behalf') : null),
                  h('div', { className: 'atl-mut' }, (o.business_name || o.buyer_name || '—') + ' · ' + (o.item_count || 0) + ' items')),
                h(SBadge, { s: o.order_state }), h(SBadge, { s: o.pay_state || 'unpaid' }),
                h('div', { style: { fontWeight: 700, minWidth: '86px', textAlign: 'right' } }, money(o.total)));
            }) : h('div', { className: 'atl-empty' }, 'No orders yet.'))),
      h('div', { className: 'atl-panel', style: { padding: '22px', position: 'sticky', top: '90px' } },
        open ? h('div', null,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { style: { fontWeight: 800, fontSize: '18px' } }, open.order_number), h(SBadge, { s: open.order_state })),
          h('div', { className: 'atl-mut', style: { marginTop: '4px' } }, (open.business_name || '') + ' · ' + (open.buyer_email || '')),
          open.shipping_address ? h('div', { className: 'atl-mut', style: { marginTop: '6px' } }, '📍 ' + open.shipping_address) : null,
          open.payment_terms ? h('div', { className: 'atl-mut' }, 'Terms: ' + open.payment_terms) : null,
          h('div', { style: { margin: '14px 0', borderTop: '1px solid var(--line)', paddingTop: '12px' } },
            items.map(function (it) { return h('div', { key: it.uuid, style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' } }, h('span', null, it.quantity + '× ' + it.product_name + (it.brand_name ? ' (' + it.brand_name + ')' : '')), h('b', null, money(it.line_total))); }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', borderTop: '1px solid var(--line)', paddingTop: '8px', marginTop: '6px' } }, h('b', null, 'Total'), h('b', { style: { color: 'var(--clay)' } }, money(open.total)))),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
            NEXT[open.order_state] ? h('button', { className: 'atl-btn atl-btn-ink atl-btn-sm', onClick: function () { setState(open, NEXT[open.order_state]); } }, 'Mark ' + NEXT[open.order_state]) : null,
            open.order_state !== 'cancelled' && open.order_state !== 'delivered' ? h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { setState(open, 'cancelled'); } }, 'Cancel') : null,
            open.pay_state !== 'paid' ? h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { setPay(open, 'paid'); } }, 'Mark paid') : h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { setPay(open, 'refunded'); } }, 'Refund')))
          : h('div', { className: 'atl-empty' }, 'Select an order to view details.')));
  }

  // generic CRUD form modal
  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () {
      var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; if (fd.k === 'image_url') v = imgUrl(init.image); if (fd.k === 'hero_url') v = imgUrl(init.hero); f[fd.k] = (v == null) ? '' : v; }); return f;
    });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {};
      fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; }
        if (v === '' || v == null) return;
        if (fd.type === 'number') v = Number(v);
        if (fd.k === 'image_url') { data.image = { url: v, thumbnail_url: v }; return; }
        if (fd.k === 'hero_url') { data.hero = { url: v, thumbnail_url: v }; return; }
        data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data);
      setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'atl-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'atl-sheet', style: { padding: '28px' } },
        h('button', { className: 'atl-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'atl-h2', style: { fontSize: '22px' } }, init.uuid ? props.editTitle : props.newTitle),
        fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'atl-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'atl-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'atl-mut' }, 'Yes'));
          else input = h('input', { className: 'atl-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h(Field, { key: fd.k, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'atl-btn atl-btn-clay', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'atl-btn atl-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  var BRAND_FIELDS = [
    { k: 'brand_name', label: 'Brand name', req: true }, { k: 'tagline', label: 'Tagline' },
    { k: 'category', label: 'Category', type: 'select', opts: CATEGORIES }, { k: 'location', label: 'Location' },
    { k: 'values', label: 'Values (· separated)' }, { k: 'min_order', label: 'Minimum order ($)', type: 'number' },
    { k: 'lead_time', label: 'Lead time' }, { k: 'year_founded', label: 'Year founded', type: 'number' },
    { k: 'hero_url', label: 'Hero image URL' }, { k: 'story', label: 'Story', type: 'textarea' },
    { k: 'featured', label: 'Featured on homepage', type: 'check' }
  ];
  var PRODUCT_FIELDS = [
    { k: 'product_name', label: 'Product name', req: true }, { k: 'brand_name', label: 'Brand name', req: true },
    { k: 'category', label: 'Category', type: 'select', opts: CATEGORIES },
    { k: 'wholesale_price', label: 'Wholesale price ($)', type: 'number', req: true }, { k: 'msrp', label: 'Suggested retail ($)', type: 'number' },
    { k: 'case_pack', label: 'Case pack (units)', type: 'number' }, { k: 'unit', label: 'Unit (e.g. Case of 12)' },
    { k: 'materials', label: 'Materials' }, { k: 'image_url', label: 'Image URL' },
    { k: 'description', label: 'Description', type: 'textarea' },
    { k: 'featured', label: 'Featured', type: 'check' }, { k: 'bestseller', label: 'Bestseller', type: 'check' }
  ];

  function AdminBrands(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.brands || []).slice().sort(bySort);
    function del(b) { if (!window.confirm('Delete ' + b.brand_name + '?')) return; client.deleteObject('brand', b.uuid, b).then(function () { showToast('Deleted', 'success'); c.reload(); }).catch(function (e) { showToast('Delete failed: ' + ((e && e.message) || 'error'), 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' brands'),
        h('button', { className: 'atl-btn atl-btn-clay atl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New brand')),
      h('div', { className: 'atl-panel' }, list.map(function (b) {
        return h('div', { key: b.uuid, className: 'atl-row' },
          h('div', { style: { width: '46px', height: '46px', borderRadius: '8px', overflow: 'hidden', flex: 'none', background: '#efe7da' } }, h('img', { src: imgUrl(b.hero || b.logo), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'atl-grow' }, h('div', { style: { fontWeight: 600 } }, b.brand_name, b.featured ? h('span', { className: 'atl-chip', style: { marginLeft: '8px' } }, 'Featured') : null), h('div', { className: 'atl-mut' }, (b.category || '') + ' · ' + (b.location || ''))),
          h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { setEdit(b); } }, 'Edit'),
          h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { del(b); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'brand', fields: BRAND_FIELDS, initial: edit, newTitle: 'New brand', editTitle: 'Edit brand',
        beforeSave: function (d) { d.display_name = d.brand_name || 'Brand'; d.description = d.tagline || d.brand_name || ''; },
        onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function AdminProducts(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null); var [q, setQ] = React.useState('');
    var list = (c.products || []).slice().sort(bySort).filter(function (p) { return !q || (p.product_name + ' ' + p.brand_name).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    function del(p) { if (!window.confirm('Delete ' + p.product_name + '?')) return; client.deleteObject('product', p.uuid, p).then(function () { showToast('Deleted', 'success'); c.reload(); }).catch(function (e) { showToast('Delete failed: ' + ((e && e.message) || 'error'), 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
        h('input', { className: 'atl-input', style: { maxWidth: '280px' }, placeholder: 'Search products…', value: q, onChange: function (e) { setQ(e.target.value); } }),
        h('div', { className: 'atl-mut' }, list.length + ' products'),
        h('button', { className: 'atl-btn atl-btn-clay atl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New product')),
      h('div', { className: 'atl-panel' }, list.map(function (p) {
        return h('div', { key: p.uuid, className: 'atl-row' },
          h('div', { style: { width: '46px', height: '46px', borderRadius: '8px', overflow: 'hidden', flex: 'none', background: '#efe7da' } }, h('img', { src: imgUrl(p.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'atl-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, p.product_name), h('div', { className: 'atl-mut' }, (p.brand_name || '') + ' · ' + (p.category || ''))),
          h('div', { style: { fontWeight: 700 } }, money(p.wholesale_price)),
          h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'),
          h('button', { className: 'atl-btn atl-btn-ghost atl-btn-sm', onClick: function () { del(p); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'product', fields: PRODUCT_FIELDS, initial: edit, newTitle: 'New product', editTitle: 'Edit product',
        beforeSave: function (d) { d.in_stock = true; d.display_name = d.product_name || 'Product'; d.description = (d.description || d.product_name || '').toString(); },
        onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function AdminBuyers(props) {
    var [buyers, setBuyers] = React.useState(null);
    React.useEffect(function () { client.getObjects('buyer').then(function (r) { setBuyers(arr(r)); }).catch(function () { setBuyers([]); }); }, []);
    return h('div', null, h('div', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Retail buyers'),
      h('div', { className: 'atl-panel' }, buyers === null ? h('div', { className: 'atl-row atl-mut' }, 'Loading…')
        : buyers.length ? buyers.map(function (b) {
          return h('div', { key: b.uuid, className: 'atl-row' },
            h('div', { style: { width: '42px', height: '42px', borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none', fontFamily: 'Fraunces,serif' } }, (b.business_name || '?').charAt(0)),
            h('div', { className: 'atl-grow' }, h('div', { style: { fontWeight: 600 } }, b.business_name, h('span', { className: 'atl-chip', style: { marginLeft: '8px' } }, b.store_type || 'Shop')), h('div', { className: 'atl-mut' }, (b.buyer_name || '') + ' · ' + (b.email || '') + (b.net_terms ? ' · ' + b.net_terms : ''))),
            h('div', { className: 'atl-mut', style: { fontSize: '12px', maxWidth: '220px' } }, b.region || b.address || ''));
        }) : h('div', { className: 'atl-empty' }, 'No buyers yet.')));
  }

  function AdminConsole(props) {
    var c = props.ctx; var tab = props.tab || 'home';
    var tabs = [['home', 'Dashboard'], ['orders', 'Orders'], ['brands', 'Brands'], ['products', 'Products'], ['buyers', 'Buyers']];
    return h('div', { className: 'atl' },
      h('div', { style: { background: 'var(--ink)' } }, h('div', { className: 'atl-wrap', style: { display: 'flex', alignItems: 'center', height: '62px', gap: '14px' } },
        h('div', { className: 'atl-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, 'Atelier', h('span', { style: { color: 'var(--gold)' } }, '.')),
        h('span', { style: { color: '#c9bda9', fontWeight: 600, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase' } }, 'Operator'),
        h('div', { className: 'atl-tabs', style: { marginLeft: '12px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('atl-tab', tab === t[0] && 'on'), onClick: function () { c.navigate('#/admin' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'atl-ibtn', style: { marginLeft: 'auto', color: '#c9bda9' }, onClick: function () { c.navigate('#/'); } }, 'View marketplace ↗'))),
      h('div', { className: 'atl-wrap', style: { padding: '28px 24px 64px' } },
        tab === 'home' ? h(AdminHome, { ctx: c })
          : tab === 'orders' ? h(AdminOrders, { ctx: c })
          : tab === 'brands' ? h(AdminBrands, { ctx: c })
          : tab === 'products' ? h(AdminProducts, { ctx: c })
          : h(AdminBuyers, { ctx: c })));
  }

  function Footer(props) {
    return h('footer', { className: 'atl-foot' }, h('div', { className: 'atl-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' } },
      h('div', null, h('b', null, 'Atelier'), ' — the wholesale marketplace for independent brands.'),
      h('div', null, CATEGORIES.slice(0, 5).join('  ·  '))));
  }

  // ── Root ──────────────────────────────────────────────────────────────────────
  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [showCurate, setShowCurate] = React.useState(false);
    var [brands, setBrands] = React.useState(null);
    var [products, setProducts] = React.useState(null);
    var [cartItems, setCartItems] = React.useState(loadCart());
    var [cat, setCat] = React.useState('all');
    var [query, setQuery] = React.useState('');
    var [modalP, setModalP] = React.useState(null);

    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () {
      function onHash() { setRoute(window.location.hash || '#/'); }
      window.addEventListener('hashchange', onHash);
      return function () { window.removeEventListener('hashchange', onHash); };
    }, []);

    React.useEffect(function () { saveCart(cartItems); }, [cartItems]);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() {
      client.getObjects('brand').then(function (r) { setBrands(arr(r)); }).catch(function () { setBrands([]); });
      client.getObjects('product').then(function (r) { setProducts(arr(r)); }).catch(function () { setProducts([]); });
    }
    React.useEffect(reload, []);
    // reload when auth changes (public vs trade reads)
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    // Stripe return: ?paid=1&order=<uuid>
    React.useEffect(function () {
      var qp = new URLSearchParams(window.location.search || '');
      if (qp.get('paid') === '1' && qp.get('order')) {
        var ouid = qp.get('order');
        client.getObjects('order').then(function (rows) {
          var o = arr(rows).filter(function (x) { return x.uuid === ouid; })[0];
          if (o && o.pay_state !== 'paid') client.updateObject('order', ouid, { order_state: 'confirmed', pay_state: 'paid', payment_provider: 'stripe', paid_at: new Date().toISOString() }, o).catch(function () {});
        }).catch(function () {});
        setCartItems([]); saveCart([]);
        try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
        window.location.hash = '#/order/' + ouid; setRoute('#/order/' + ouid);
      }
    }, []);

    // Cart API
    function addToCart(p, qty, silent) {
      qty = qty || 1;
      setCartItems(function (items) {
        var ex = items.filter(function (x) { return x.product_uuid === p.uuid; })[0];
        if (ex) return items.map(function (x) { return x.product_uuid === p.uuid ? Object.assign({}, x, { quantity: x.quantity + qty }) : x; });
        return items.concat([{ product_uuid: p.uuid, product_name: p.product_name, brand_name: p.brand_name, unit: p.unit, case_pack: p.case_pack, unit_price: p.wholesale_price, image: p.image, quantity: qty }]);
      });
      if (!silent) showToast(p.product_name + ' added to order', 'success');
    }
    function setQty(it, q) { if (q < 1) return setCartItems(function (items) { return items.filter(function (x) { return x.product_uuid !== it.product_uuid; }); }); setCartItems(function (items) { return items.map(function (x) { return x.product_uuid === it.product_uuid ? Object.assign({}, x, { quantity: q }) : x; }); }); }
    function removeItem(it) { setCartItems(function (items) { return items.filter(function (x) { return x.product_uuid !== it.product_uuid; }); }); }
    var cartCount = cartItems.reduce(function (s, x) { return s + x.quantity; }, 0);
    var cartSubtotal = cartItems.reduce(function (s, x) { return s + x.unit_price * x.quantity; }, 0);

    function placeOrder(billing, opts) {
      opts = opts || {};
      var lines = opts.lines || cartItems;
      var subtotal = opts.subtotal != null ? opts.subtotal : cartSubtotal;
      var brandSet = {}; lines.forEach(function (l) { brandSet[l.brand_name] = 1; });
      var num = 'ATL-' + Date.now().toString(36).toUpperCase();
      var terms = opts.payment_terms || 'Net 30';
      var prepaid = terms === 'Prepaid';
      var orderData = {
        order_number: num, order_state: opts.onBehalf ? 'confirmed' : 'pending',
        business_name: billing.business_name, buyer_name: billing.buyer_name,
        buyer_email: billing.buyer_email, buyer_phone: billing.buyer_phone,
        shipping_address: billing.shipping_address, notes: billing.notes,
        payment_terms: terms, subtotal: subtotal, shipping_fee: 0, total: subtotal,
        item_count: lines.reduce(function (s, l) { return s + l.quantity; }, 0),
        brand_count: Object.keys(brandSet).length,
        pay_state: opts.pay_state || 'unpaid', placed_by: opts.onBehalf ? 'admin' : 'buyer',
        display_name: num
      };
      if (opts.owner_username) orderData.owner_username = opts.owner_username;
      var theOrder;
      return client.createObject('order', orderData).then(function (order) {
        theOrder = order;
        return Promise.all(lines.map(function (l) {
          return client.createObject('order_item', {
            product_name: l.product_name, product_uuid: l.product_uuid, brand_name: l.brand_name, sku: l.sku,
            unit_price: l.unit_price, case_pack: l.case_pack, quantity: l.quantity, line_total: l.unit_price * l.quantity,
            image: l.image, display_name: l.product_name, owner_username: opts.owner_username || billing.buyer_email,
            parent_type: 'order', parent_uuid: order.uuid
          });
        }));
      }).then(function () {
        if (opts.onBehalf) return { order: theOrder };
        if (!prepaid) {
          // net terms → invoice, confirmed
          return client.updateObject('order', theOrder.uuid, { order_state: 'confirmed' }, theOrder).catch(function () {}).then(function () {
            setCartItems([]); navigate('#/order/' + theOrder.uuid); return { order: theOrder };
          });
        }
        // prepaid → Stripe hosted checkout, simulated fallback
        var origin = window.location.origin;
        return Promise.resolve().then(function () {
          if (!services || !services.stripe || !services.stripe.checkout) return null;
          return services.stripe.checkout({ amount: subtotal, product: 'Atelier Order ' + num, successUrl: origin + '/?paid=1&order=' + theOrder.uuid, cancelUrl: origin + '/?cart=1' }).catch(function () { return null; });
        }).then(function (res) {
          var url = ((res && res.output) || res || {}); url = url.checkout_url || url.url || url.checkoutUrl || '';
          if (url) return client.updateObject('order', theOrder.uuid, { stripe_checkout_url: url, order_state: 'confirmed' }, theOrder).catch(function () {}).then(function () { window.location.href = url; return { redirected: true }; });
          return client.updateObject('order', theOrder.uuid, { order_state: 'confirmed', pay_state: 'paid', payment_provider: 'simulated', paid_at: new Date().toISOString() }, theOrder).catch(function () {}).then(function () {
            setCartItems([]); navigate('#/order/' + theOrder.uuid); return { order: theOrder };
          });
        });
      });
    }

    var ctx = {
      route: route, navigate: navigate, authed: authed, setAuthed: setAuthed,
      isAdmin: authed && isStaff(), openLogin: function () { setShowLogin(true); }, openCurate: function () { setShowCurate(true); },
      brands: brands, products: products, reload: reload, placeOrder: placeOrder,
      cart: { items: cartItems, count: cartCount, subtotal: cartSubtotal, add: addToCart, setQty: setQty, remove: removeItem }
    };

    var seg = route.replace(/^#\//, '').split('/');
    var top = seg[0] || '';
    function shell(inner) {
      return h('div', { className: 'atl' },
        h(TopBar, { ctx: ctx, cat: cat, onCat: setCat, query: query, onSearch: setQuery }),
        inner,
        modalP ? h(ProductModal, { p: modalP, ctx: ctx, onClose: function () { setModalP(null); } }) : null,
        showCurate ? h(CuratePanel, { ctx: ctx, onClose: function () { setShowCurate(false); } }) : null,
        h(Footer, null),
        showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); setAuthed(true); } }) : null);
    }

    if (top === 'admin' && ctx.isAdmin) return h(ErrorBoundary, null, h(AdminConsole, { ctx: ctx, tab: seg[1] || 'home' }),
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'shop') page = h(ShopPage, { ctx: ctx, cat: cat, query: query, onOpen: setModalP });
    else if (top === 'brands') page = h(BrandsPage, { ctx: ctx });
    else if (top === 'brand') page = h(BrandPage, { ctx: ctx, slug: seg[1], onOpen: setModalP });
    else if (top === 'product') page = h(ProductPage, { ctx: ctx, uuid: seg[1] });
    else if (top === 'cart') page = h(CartPage, { ctx: ctx });
    else if (top === 'checkout') page = h(Checkout, { ctx: ctx });
    else if (top === 'order') page = h(OrderConfirm, { ctx: ctx, uuid: seg[1] });
    else if (top === 'account') page = h(MyOrders, { ctx: ctx });
    else page = h(Storefront, { ctx: ctx, onCat: setCat, onOpen: setModalP });
    return h(ErrorBoundary, null, shell(page));
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
