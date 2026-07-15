// ui/app.js — Haven premium real-estate marketplace + agent platform (custom UI).
// Globals (React, ReactDOM, client, services, showToast, formatCurrency, resolveImageUrl,
// ErrorBoundary) come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  // ── Brand / constants ───────────────────────────────────────────────────────
  var BRAND = { name: 'Haven', tagline: 'Find your place.' };
  var HERO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000&h=1100';
  var LISTING_TYPES = ['For Sale', 'For Rent'];
  var PROPERTY_TYPES = ['House', 'Condo', 'Townhouse', 'Apartment', 'Land', 'Commercial'];
  var LISTING_STATES = ['active', 'pending', 'sold', 'off_market'];
  var TOUR_STATES = ['requested', 'confirmed', 'completed', 'cancelled'];
  var OFFER_STATES = ['submitted', 'under_review', 'accepted', 'countered', 'rejected', 'withdrawn'];
  var FINANCING = ['Cash', 'Conventional', 'FHA', 'VA'];
  var PRICE_BANDS = [['Any price', 0, 0], ['Under $750K', 0, 750000], ['$750K–$1.5M', 750000, 1500000],
    ['$1.5M–$3M', 1500000, 3000000], ['$3M+', 3000000, 0]];
  var BED_OPTS = [['Any beds', 0], ['1+', 1], ['2+', 2], ['3+', 3], ['4+', 4]];

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n.toLocaleString(); } }
  function priceLabel(p) {
    if (p.listing_type === 'For Rent') return money(p.price) + '/mo';
    return money(p.price);
  }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function bySort(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }
  function fmtDT(s) { if (!s) return ''; try { return new Date(s).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function statusColor(s) {
    return { active: '#0e7c5a', pending: '#b45309', sold: '#64748b', off_market: '#9ca3af',
      requested: '#b45309', confirmed: '#1d4ed8', completed: '#0e7c5a', cancelled: '#9ca3af',
      submitted: '#1d4ed8', under_review: '#b45309', accepted: '#0e7c5a', countered: '#7c3aed',
      rejected: '#dc2626', withdrawn: '#9ca3af' }[s] || '#1d4ed8';
  }
  function isStaff() {
    try {
      return client.isAdmin() || client.canWrite('listing') ||
        ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0;
    } catch (e) { return false; }
  }
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // ── Design system (premium real estate: white + navy + gold) ─────────────────
  function injectChrome() {
    if (document.getElementById('hv-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'hv-chrome';
    st.textContent = [
      ':root{--ink:#0c1a33;--ink2:#33415c;--paper:#fff;--bg:#f5f7fb;--navy:#0c1a33;--navy2:#16294d;--blue:#2563eb;--blue2:#1d4ed8;--gold:#b8893b;--gold2:#9a6f28;--line:#e4e9f2;--muted:#5d6b85}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.hv{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.hv *{box-sizing:border-box}.hv a{color:inherit;text-decoration:none}',
      '.hv-wrap{max-width:1220px;margin:0 auto;padding:0 24px}',
      '.serif{font-family:Fraunces,Georgia,serif}',
      // top bar
      '.hv-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.hv-top-in{display:flex;align-items:center;gap:18px;height:70px}',
      '.hv-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:Fraunces,serif;font-weight:600;font-size:25px;color:var(--ink);flex:none}',
      '.hv-logo .dot{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--navy),var(--blue));display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px}',
      '.hv-logo b{color:var(--gold);font-weight:600}',
      '.hv-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.hv-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}',
      '.hv-ibtn:hover{background:var(--bg)}',
      // buttons
      '.hv-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:11px;font-weight:600;font-size:14px;padding:11px 20px;font-family:Inter;transition:.15s}',
      '.hv-btn:disabled{opacity:.55;cursor:default}',
      '.hv-btn-blue{background:var(--blue);color:#fff}.hv-btn-blue:hover:not(:disabled){background:var(--blue2)}',
      '.hv-btn-navy{background:var(--navy);color:#fff}.hv-btn-navy:hover:not(:disabled){background:var(--navy2)}',
      '.hv-btn-gold{background:var(--gold);color:#fff}.hv-btn-gold:hover:not(:disabled){background:var(--gold2)}',
      '.hv-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.hv-btn-ghost:hover{border-color:var(--blue)}',
      '.hv-btn-sm{padding:7px 13px;font-size:13px}',
      // hero
      '.hv-hero{position:relative;overflow:hidden;background:var(--navy)}',
      '.hv-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.46}',
      '.hv-hero-in{position:relative;padding:90px 0 104px;color:#fff}',
      '.hv-hero h1{font-family:Fraunces,serif;font-weight:600;font-size:clamp(36px,5vw,62px);line-height:1.04;margin:12px 0 0;max-width:760px}',
      '.hv-hero p{font-size:19px;color:#dbe4f5;max-width:560px;margin:16px 0 0;line-height:1.55}',
      '.hv-pill{display:inline-block;background:rgba(255,255,255,.16);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;padding:7px 15px;border-radius:30px}',
      // search bar
      '.hv-searchbar{background:var(--paper);border-radius:16px;box-shadow:0 24px 60px -28px rgba(12,26,51,.55);padding:14px;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr auto;gap:10px;margin-top:30px;align-items:end}',
      '.hv-sf{display:flex;flex-direction:column;gap:5px}',
      '.hv-sf label{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}',
      '.hv-sf input,.hv-sf select{border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:11px 12px;font-size:14px;font-family:Inter;color:var(--ink);width:100%}',
      '.hv-sf input:focus,.hv-sf select:focus{outline:none;border-color:var(--blue)}',
      // sections
      '.hv-sec{padding:52px 0}',
      '.hv-h2{font-family:Fraunces,serif;font-weight:600;font-size:30px;letter-spacing:-.01em;margin:0}',
      '.hv-eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}',
      '.hv-sub{color:var(--muted);font-size:15px;margin:4px 0 0}',
      // listing grid + cards
      '.hv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:24px}',
      '.hv-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;transition:.16s}',
      '.hv-card:hover{box-shadow:0 22px 50px -30px rgba(12,26,51,.5);transform:translateY(-3px)}',
      '.hv-card-img{height:220px;overflow:hidden;background:#dde5f1;position:relative}',
      '.hv-card-img img{width:100%;height:100%;object-fit:cover;transition:.3s}',
      '.hv-card:hover .hv-card-img img{transform:scale(1.05)}',
      '.hv-card-b{padding:16px 18px 18px;display:flex;flex-direction:column;flex:1}',
      '.hv-cprice{font-family:Fraunces,serif;font-weight:600;font-size:23px;color:var(--ink)}',
      '.hv-ctitle{font-weight:600;font-size:15px;line-height:1.34;margin:6px 0 0}',
      '.hv-cmeta{color:var(--muted);font-size:13px;margin-top:3px}',
      '.hv-cspecs{display:flex;gap:14px;margin-top:11px;padding-top:11px;border-top:1px solid var(--line);color:var(--ink2);font-size:13px;font-weight:600}',
      '.hv-cspecs span{display:flex;gap:5px;align-items:center}',
      '.hv-cspecs em{color:var(--muted);font-weight:500;font-style:normal}',
      '.hv-ribbon{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.95);color:var(--ink);font-size:11px;font-weight:700;letter-spacing:.04em;padding:5px 11px;border-radius:8px}',
      '.hv-chip{position:absolute;top:12px;right:12px;font-size:10.5px;font-weight:700;text-transform:capitalize;padding:5px 11px;border-radius:8px;color:#fff}',
      // agent cards
      '.hv-agrid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:24px}',
      '.hv-acard{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:.16s;text-align:center}',
      '.hv-acard:hover{box-shadow:0 18px 44px -28px rgba(12,26,51,.45);transform:translateY(-3px)}',
      '.hv-acard-img{height:200px;overflow:hidden;background:#dde5f1}.hv-acard-img img{width:100%;height:100%;object-fit:cover}',
      '.hv-acard-b{padding:16px 14px 18px}.hv-acard-b h3{font-weight:700;font-size:16px;margin:0}',
      // panels / rows
      '.hv-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.hv-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.hv-row:first-child{border-top:0}.hv-grow{flex:1;min-width:0}.hv-mut{color:var(--muted);font-size:13px}',
      '.hv-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 11px;border-radius:20px;color:#fff;white-space:nowrap}',
      '.hv-2col{display:grid;grid-template-columns:1fr 360px;gap:26px;align-items:start}',
      // forms
      '.hv-field{display:block;margin-top:14px}.hv-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.hv-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:11px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.hv-input:focus{outline:none;border-color:var(--blue)}textarea.hv-input{min-height:84px;resize:vertical}',
      // modal
      '.hv-modal{position:fixed;inset:0;z-index:200;background:rgba(12,26,51,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.hv-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:580px;max-height:92vh;overflow:auto;position:relative}',
      '.hv-x{position:absolute;top:14px;right:16px;background:none;border:0;font-size:24px;cursor:pointer;color:var(--muted);line-height:1;z-index:2}',
      // stats / dashboard
      '.hv-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.hv-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px}',
      '.hv-stat-n{font-family:Fraunces,serif;font-weight:600;font-size:28px;line-height:1}',
      '.hv-stat-l{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.hv-bars{display:flex;align-items:flex-end;gap:14px;height:200px;padding:10px 4px 0}',
      '.hv-bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end}',
      '.hv-bar .b{width:100%;max-width:54px;background:linear-gradient(180deg,var(--blue),var(--navy));border-radius:8px 8px 0 0;min-height:4px}',
      '.hv-bar .l{font-size:11px;color:var(--muted);text-align:center;font-weight:600}',
      '.hv-bar .v{font-size:12px;font-weight:700}',
      // detail
      '.hv-specbox{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-top:18px}',
      '.hv-specbox > div{padding:16px;border-right:1px solid var(--line);text-align:center}',
      '.hv-specbox > div:last-child{border-right:0}',
      '.hv-specbox .n{font-family:Fraunces,serif;font-weight:600;font-size:22px}',
      '.hv-specbox .k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:4px}',
      '.hv-tabs{display:flex;gap:4px;flex-wrap:wrap}.hv-tab{background:none;border:0;color:#c5d2ec;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.hv-tab.on{background:rgba(255,255,255,.16);color:#fff}',
      '.hv-foot{background:var(--navy);color:#9fb0d0;padding:38px 0;font-size:13px;margin-top:40px}.hv-foot b{color:#fff;font-family:Fraunces,serif}',
      '.hv-empty{text-align:center;padding:64px 20px;color:var(--muted)}',
      '.hv-banner{background:#eff4ff;border:1px solid #c9dcff;color:#1d4ed8;border-radius:11px;padding:11px 14px;font-size:13px}',
      '.hv-filterbar{display:flex;gap:10px;flex-wrap:wrap;align-items:end;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px 16px}',
      '@media(max-width:1000px){.hv-grid{grid-template-columns:repeat(2,1fr)}.hv-agrid{grid-template-columns:repeat(2,1fr)}.hv-stats{grid-template-columns:repeat(2,1fr)}.hv-2col{grid-template-columns:1fr}.hv-searchbar{grid-template-columns:1fr 1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── Small shared bits ───────────────────────────────────────────────────────
  function Logo(p) { return h('div', { className: 'hv-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '⌂'), 'Haven'); }
  function Badge(p) { return h('span', { className: 'hv-badge', style: { background: statusColor(p.s) } }, (p.s || '').replace('_', ' ')); }
  function Field(p) { return h('label', { className: 'hv-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Eyebrow(p) { return h('div', { className: 'hv-eyebrow' }, p.children); }

  // ── Login ───────────────────────────────────────────────────────────────────
  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'buyer@haven.realty');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'hv-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'hv-sheet', style: { maxWidth: '420px', padding: '36px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'hv-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'hv-h2', style: { marginTop: '18px', fontSize: '26px' } }, props.title || 'Sign in'),
        h('p', { className: 'hv-mut' }, props.note || 'Sign in to request tours, make offers and track your search.'),
        h(Field, { label: 'Email', children: h('input', { className: 'hv-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'hv-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: '#dc2626', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'hv-btn hv-btn-blue', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '20px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'hv-mut', style: { marginTop: '15px', textAlign: 'center', fontSize: '12.5px' } },
          'Demo — buyer: buyer@haven.realty · broker: broker@haven.realty · pw Password123!')));
  }

  // ── Top bar ───────────────────────────────────────────────────────────────────
  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'hv-top' }, h('div', { className: 'hv-wrap hv-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'hv-act' },
        h('button', { className: 'hv-ibtn', onClick: function () { c.navigate('#/search'); } }, 'Buy'),
        h('button', { className: 'hv-ibtn', onClick: function () { c.navigate('#/search?lt=' + encodeURIComponent('For Rent')); } }, 'Rent'),
        h('button', { className: 'hv-ibtn', onClick: function () { c.navigate('#/agents'); } }, 'Agents'),
        c.isAdmin ? h('button', { className: 'hv-ibtn', onClick: function () { c.navigate('#/console'); } }, '⚙ Console') : null,
        c.authed ? h('button', { className: 'hv-ibtn', onClick: function () { c.navigate('#/portal'); } }, '👤 My Haven') : null,
        c.authed ? h('button', { className: 'hv-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'hv-btn hv-btn-blue hv-btn-sm', onClick: c.openLogin }, 'Sign in'))));
  }

  // ── Listing card ──────────────────────────────────────────────────────────────
  function ListingCard(props) {
    var p = props.p, c = props.ctx;
    return h('div', { className: 'hv-card', onClick: function () { c.navigate('#/listing/' + p.uuid); } },
      h('div', { className: 'hv-card-img' },
        h('img', { src: imgUrl(p.image), alt: p.title, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
        h('span', { className: 'hv-ribbon' }, p.listing_type || 'For Sale'),
        p.listing_state && p.listing_state !== 'active' ? h('span', { className: 'hv-chip', style: { background: statusColor(p.listing_state) } }, (p.listing_state || '').replace('_', ' ')) : null),
      h('div', { className: 'hv-card-b' },
        h('div', { className: 'hv-cprice' }, priceLabel(p)),
        h('div', { className: 'hv-ctitle' }, p.title),
        h('div', { className: 'hv-cmeta' }, [p.neighborhood, p.city].filter(Boolean).join(', ') + (p.state ? ', ' + p.state : '')),
        h('div', { className: 'hv-cspecs' },
          h('span', null, h('b', null, p.beds || 0), h('em', null, 'bd')),
          h('span', null, h('b', null, p.baths || 0), h('em', null, 'ba')),
          h('span', null, h('b', null, (p.sqft || 0).toLocaleString()), h('em', null, 'sqft')),
          h('span', { style: { marginLeft: 'auto', color: 'var(--muted)', fontWeight: 500 } }, p.property_type || ''))));
  }

  // ── Listing detail page ─────────────────────────────────────────────────────
  function ListingPage(props) {
    var c = props.ctx;
    var listings = c.listings || [];
    var p = listings.filter(function (x) { return x.uuid === props.uuid; })[0];
    if (c.listings === null) return h('div', { className: 'hv-wrap hv-sec' }, h('div', { className: 'hv-empty' }, 'Loading…'));
    if (!p) return h('div', { className: 'hv-wrap hv-sec' }, h('div', { className: 'hv-empty' }, h('h2', { className: 'hv-h2' }, 'Listing not found'), h('button', { className: 'hv-btn hv-btn-blue', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/search'); } }, 'Back to search')));
    var agent = (c.agents || []).filter(function (a) { return a.full_name === p.agent_name; })[0];
    // Similar homes — same city or property type, near price.
    var similar = listings.filter(function (x) {
      if (x.uuid === p.uuid) return false;
      var sameish = x.city === p.city || x.property_type === p.property_type;
      var near = p.price && x.price ? Math.abs(x.price - p.price) <= p.price * 0.6 : true;
      return sameish && near;
    }).sort(function (a, b) { return Math.abs((a.price || 0) - (p.price || 0)) - Math.abs((b.price || 0) - (p.price || 0)); }).slice(0, 3);
    if (similar.length < 3) {
      listings.filter(function (x) { return x.uuid !== p.uuid && similar.indexOf(x) < 0; }).slice(0, 3 - similar.length).forEach(function (x) { similar.push(x); });
    }
    return h('div', { className: 'hv-wrap hv-sec' },
      h('div', { className: 'hv-cmeta', style: { marginBottom: '14px' } },
        h('span', { style: { cursor: 'pointer' }, onClick: function () { c.navigate('#/search'); } }, 'Search'), '  ·  ',
        [p.neighborhood, p.city].filter(Boolean).join(', ')),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '28px', alignItems: 'start' } },
        // gallery
        h('div', null,
          h('div', { style: { borderRadius: '16px', overflow: 'hidden', background: '#dde5f1', height: '440px' } },
            h('img', { src: imgUrl(p.image), alt: p.title, style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginTop: '18px' } },
            h('div', { className: 'hv-cprice', style: { fontSize: '34px' } }, priceLabel(p)),
            h(Badge, { s: p.listing_state }),
            h('span', { className: 'hv-mut' }, p.listing_type + ' · ' + (p.property_type || ''))),
          h('h1', { className: 'serif', style: { fontSize: '30px', fontWeight: 600, margin: '6px 0 2px' } }, p.title),
          h('div', { className: 'hv-mut' }, [p.address, p.neighborhood, p.city, p.state].filter(Boolean).join(', ')),
          h('div', { className: 'hv-specbox' },
            h('div', null, h('div', { className: 'n' }, p.beds || 0), h('div', { className: 'k' }, 'Beds')),
            h('div', null, h('div', { className: 'n' }, p.baths || 0), h('div', { className: 'k' }, 'Baths')),
            h('div', null, h('div', { className: 'n' }, (p.sqft || 0).toLocaleString()), h('div', { className: 'k' }, 'Sq Ft')),
            h('div', null, h('div', { className: 'n' }, p.year_built || '—'), h('div', { className: 'k' }, 'Built'))),
          h('h3', { style: { margin: '24px 0 8px', fontSize: '17px' } }, 'About this home'),
          h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: 'var(--ink2)' } }, p.description || '')),
        // sidebar: agent + CTAs
        h('div', { style: { position: 'sticky', top: '90px' } },
          h('div', { className: 'hv-panel', style: { padding: '22px' } },
            h('div', { className: 'hv-eyebrow' }, 'Listed by'),
            agent ? h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', cursor: 'pointer' }, onClick: function () { c.navigate('#/agent/' + agent.uuid); } },
              h('div', { style: { width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flex: 'none', background: '#dde5f1' } }, h('img', { src: imgUrl(agent.photo), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
              h('div', null, h('div', { style: { fontWeight: 700 } }, agent.full_name), h('div', { className: 'hv-mut' }, agent.title || 'Agent'), h('div', { className: 'hv-mut' }, '★ ' + (agent.rating || '5.0') + ' · ' + (agent.sales_count || 0) + ' sales')))
              : h('div', { style: { marginTop: '8px', fontWeight: 700 } }, p.agent_name || 'Haven Realty'),
            h('button', { className: 'hv-btn hv-btn-blue', style: { width: '100%', marginTop: '18px' }, onClick: function () { c.openTour(p); } }, '🗓 Request a tour'),
            h('button', { className: 'hv-btn hv-btn-gold', style: { width: '100%', marginTop: '10px' }, onClick: function () { c.openOffer(p); } }, '✦ Make an offer'),
            agent && agent.phone ? h('div', { className: 'hv-mut', style: { textAlign: 'center', marginTop: '12px' } }, '📞 ' + agent.phone) : null))),
      // similar
      similar.length ? h('section', { style: { marginTop: '52px' } },
        h(Eyebrow, null, 'You may also like'),
        h('h2', { className: 'hv-h2', style: { marginTop: '4px' } }, 'Similar homes'),
        h('div', { className: 'hv-grid' }, similar.map(function (x) { return h(ListingCard, { key: x.uuid, p: x, ctx: c }); }))) : null);
  }

  // ── Hero + search ─────────────────────────────────────────────────────────────
  function Hero(props) {
    var c = props.ctx;
    var [q, setQ] = React.useState({ city: '', lt: '', band: 0, beds: 0 });
    function set(k, v) { setQ(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function go() {
      var parts = [];
      if (q.city) parts.push('city=' + encodeURIComponent(q.city));
      if (q.lt) parts.push('lt=' + encodeURIComponent(q.lt));
      if (q.band) parts.push('band=' + q.band);
      if (q.beds) parts.push('beds=' + q.beds);
      c.navigate('#/search' + (parts.length ? '?' + parts.join('&') : ''));
    }
    return h('section', { className: 'hv-hero' }, h('img', { src: HERO, alt: '' }),
      h('div', { className: 'hv-wrap hv-hero-in' },
        h('span', { className: 'hv-pill' }, 'Premium real estate'),
        h('h1', null, 'Find your place.'),
        h('p', null, 'Search beautiful homes for sale and rent across the Bay Area, tour them in a tap, and make an offer — all in one trusted place.'),
        h('div', { className: 'hv-searchbar' },
          h('div', { className: 'hv-sf' }, h('label', null, 'Location'), h('input', { placeholder: 'City or neighborhood', value: q.city, onChange: function (e) { set('city', e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') go(); } })),
          h('div', { className: 'hv-sf' }, h('label', null, 'Type'), h('select', { value: q.lt, onChange: function (e) { set('lt', e.target.value); } }, h('option', { value: '' }, 'Buy or rent'), LISTING_TYPES.map(function (t) { return h('option', { key: t, value: t }, t); }))),
          h('div', { className: 'hv-sf' }, h('label', null, 'Price'), h('select', { value: q.band, onChange: function (e) { set('band', Number(e.target.value)); } }, PRICE_BANDS.map(function (b, i) { return h('option', { key: i, value: i }, b[0]); }))),
          h('div', { className: 'hv-sf' }, h('label', null, 'Beds'), h('select', { value: q.beds, onChange: function (e) { set('beds', Number(e.target.value)); } }, BED_OPTS.map(function (b, i) { return h('option', { key: i, value: b[1] }, b[0]); }))),
          h('button', { className: 'hv-btn hv-btn-blue', style: { height: '44px' }, onClick: go }, '🔍 Search'))));
  }

  function StatStrip(props) {
    var c = props.ctx; var L = c.listings || []; var A = c.agents || [];
    var forSale = L.filter(function (x) { return x.listing_type === 'For Sale' && x.listing_state === 'active'; }).length;
    var forRent = L.filter(function (x) { return x.listing_type === 'For Rent' && x.listing_state === 'active'; }).length;
    var v = [[L.length, 'Listings'], [forSale, 'For sale'], [forRent, 'For rent'], [A.length, 'Expert agents']];
    return h('div', { className: 'hv-stats' }, v.map(function (x, i) {
      return h('div', { key: i, className: 'hv-stat' }, h('div', { className: 'hv-stat-n', style: { color: 'var(--blue)' } }, x[0]), h('div', { className: 'hv-stat-l' }, x[1]));
    }));
  }

  function Home(props) {
    var c = props.ctx;
    var featured = (c.listings || []).filter(function (x) { return x.featured && x.listing_state !== 'sold'; }).sort(bySort);
    if (!featured.length) featured = (c.listings || []).filter(function (x) { return x.listing_state === 'active'; }).slice(0, 6);
    var agents = (c.agents || []).slice().sort(bySort).slice(0, 4);
    return h('div', null, h(Hero, { ctx: c }),
      h('section', { className: 'hv-sec' }, h('div', { className: 'hv-wrap' }, h(StatStrip, { ctx: c }))),
      h('section', { style: { paddingBottom: '10px' } }, h('div', { className: 'hv-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h(Eyebrow, null, 'Featured'), h('h2', { className: 'hv-h2', style: { marginTop: '4px' } }, 'Homes we love right now')),
          h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { c.navigate('#/search'); } }, 'See all')),
        c.listings === null ? h('div', { className: 'hv-empty' }, 'Loading listings…')
          : h('div', { className: 'hv-grid' }, featured.slice(0, 6).map(function (p) { return h(ListingCard, { key: p.uuid, p: p, ctx: c }); })))),
      h('section', { className: 'hv-sec' }, h('div', { className: 'hv-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h(Eyebrow, null, 'Our team'), h('h2', { className: 'hv-h2', style: { marginTop: '4px' } }, 'Top-rated Haven agents')),
          h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { c.navigate('#/agents'); } }, 'Meet the team')),
        h('div', { className: 'hv-agrid' }, agents.map(function (a) { return h(AgentCard, { key: a.uuid, a: a, ctx: c }); })))),
      h('section', { style: { paddingBottom: '50px' } }, h('div', { className: 'hv-wrap' },
        h('div', { className: 'hv-panel', style: { padding: '30px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--navy)', color: '#fff', border: 0 } },
          h('div', { style: { fontSize: '40px' } }, '🏡'),
          h('div', { style: { flex: 1, minWidth: '260px' } }, h('div', { className: 'serif', style: { fontSize: '22px', fontWeight: 600 } }, 'Ready to find your place?'),
            h('div', { style: { marginTop: '6px', color: '#cdd9ef' } }, 'Browse the full catalog, request tours in a tap, and make offers backed by a Haven agent.')),
          h('button', { className: 'hv-btn hv-btn-gold', onClick: function () { c.navigate('#/search'); } }, 'Browse all listings')))));
  }

  // ── Search results ────────────────────────────────────────────────────────────
  function SearchPage(props) {
    var c = props.ctx; var qp = props.qp;
    var [city, setCity] = React.useState(qp.get('city') || '');
    var [lt, setLt] = React.useState(qp.get('lt') || '');
    var [pt, setPt] = React.useState(qp.get('pt') || '');
    var [band, setBand] = React.useState(Number(qp.get('band') || 0));
    var [beds, setBeds] = React.useState(Number(qp.get('beds') || 0));
    React.useEffect(function () {
      setCity(qp.get('city') || ''); setLt(qp.get('lt') || ''); setPt(qp.get('pt') || '');
      setBand(Number(qp.get('band') || 0)); setBeds(Number(qp.get('beds') || 0));
    }, [props.q]);
    var listings = (c.listings || []).slice().sort(bySort);
    var list = listings.filter(function (p) {
      if (p.listing_state === 'sold' || p.listing_state === 'off_market') { /* still shown but de-emphasized via state chip */ }
      if (city) { var hay = ((p.city || '') + ' ' + (p.neighborhood || '') + ' ' + (p.state || '') + ' ' + (p.address || '')).toLowerCase(); if (hay.indexOf(city.toLowerCase()) < 0) return false; }
      if (lt && p.listing_type !== lt) return false;
      if (pt && p.property_type !== pt) return false;
      if (beds && (p.beds || 0) < beds) return false;
      if (band) { var b = PRICE_BANDS[band]; if (b[1] && (p.price || 0) < b[1]) return false; if (b[2] && (p.price || 0) >= b[2]) return false; }
      return true;
    });
    return h('div', { className: 'hv-wrap hv-sec' },
      h('div', { className: 'hv-filterbar' },
        h('div', { className: 'hv-sf', style: { minWidth: '180px', flex: 1 } }, h('label', null, 'Location'), h('input', { className: 'hv-input', placeholder: 'City or neighborhood', value: city, onChange: function (e) { setCity(e.target.value); } })),
        h('div', { className: 'hv-sf' }, h('label', null, 'Type'), h('select', { className: 'hv-input', value: lt, onChange: function (e) { setLt(e.target.value); } }, h('option', { value: '' }, 'Buy or rent'), LISTING_TYPES.map(function (t) { return h('option', { key: t, value: t }, t); }))),
        h('div', { className: 'hv-sf' }, h('label', null, 'Property'), h('select', { className: 'hv-input', value: pt, onChange: function (e) { setPt(e.target.value); } }, h('option', { value: '' }, 'All types'), PROPERTY_TYPES.map(function (t) { return h('option', { key: t, value: t }, t); }))),
        h('div', { className: 'hv-sf' }, h('label', null, 'Price'), h('select', { className: 'hv-input', value: band, onChange: function (e) { setBand(Number(e.target.value)); } }, PRICE_BANDS.map(function (b, i) { return h('option', { key: i, value: i }, b[0]); }))),
        h('div', { className: 'hv-sf' }, h('label', null, 'Beds'), h('select', { className: 'hv-input', value: beds, onChange: function (e) { setBeds(Number(e.target.value)); } }, BED_OPTS.map(function (b, i) { return h('option', { key: i, value: b[1] }, b[0]); })))),
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '20px 0 0' } },
        h('h2', { className: 'hv-h2' }, city ? 'Homes in ' + city : (lt || 'All homes')),
        h('div', { className: 'hv-mut' }, list.length + ' result' + (list.length === 1 ? '' : 's'))),
      c.listings === null ? h('div', { className: 'hv-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'hv-grid' }, list.map(function (p) { return h(ListingCard, { key: p.uuid, p: p, ctx: c }); }))
        : h('div', { className: 'hv-empty' }, h('div', { style: { fontSize: '42px' } }, '🔍'), h('div', { style: { marginTop: '8px', fontWeight: 600 } }, 'No homes match those filters'), h('div', { className: 'hv-mut', style: { marginTop: '4px' } }, 'Try widening your price range or location.')));
  }

  // ── Agents ──────────────────────────────────────────────────────────────────
  function AgentCard(props) {
    var a = props.a;
    return h('div', { className: 'hv-acard', onClick: function () { props.ctx.navigate('#/agent/' + a.uuid); } },
      h('div', { className: 'hv-acard-img' }, h('img', { src: imgUrl(a.photo), alt: a.full_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
      h('div', { className: 'hv-acard-b' },
        h('h3', null, a.full_name),
        h('div', { className: 'hv-mut', style: { marginTop: '3px' } }, a.title || 'Agent'),
        h('div', { className: 'hv-mut', style: { marginTop: '6px' } }, '★ ' + (a.rating || '5.0') + ' · ' + (a.sales_count || 0) + ' sales'),
        a.region ? h('div', { className: 'hv-mut', style: { marginTop: '2px' } }, '📍 ' + a.region) : null));
  }

  function AgentsPage(props) {
    var c = props.ctx; var list = (c.agents || []).slice().sort(bySort);
    return h('div', { className: 'hv-wrap hv-sec' },
      h(Eyebrow, null, 'The Haven team'),
      h('h2', { className: 'hv-h2', style: { marginTop: '4px' } }, 'Meet our agents'),
      h('p', { className: 'hv-sub' }, 'Local experts who negotiate hard and treat your search like their own.'),
      c.agents === null ? h('div', { className: 'hv-empty' }, 'Loading…')
        : h('div', { className: 'hv-agrid' }, list.map(function (a) { return h(AgentCard, { key: a.uuid, a: a, ctx: c }); })));
  }

  function AgentPage(props) {
    var c = props.ctx;
    var a = (c.agents || []).filter(function (x) { return x.uuid === props.uuid; })[0];
    if (c.agents === null) return h('div', { className: 'hv-wrap hv-sec' }, h('div', { className: 'hv-empty' }, 'Loading…'));
    if (!a) return h('div', { className: 'hv-wrap hv-sec' }, h('div', { className: 'hv-empty' }, h('h2', { className: 'hv-h2' }, 'Agent not found'), h('button', { className: 'hv-btn hv-btn-blue', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/agents'); } }, 'All agents')));
    var theirs = (c.listings || []).filter(function (p) { return p.agent_name === a.full_name; }).sort(bySort);
    return h('div', { className: 'hv-wrap hv-sec' },
      h('div', { className: 'hv-2col' },
        h('div', null,
          h('div', { style: { display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' } },
            h('div', { style: { width: '120px', height: '120px', borderRadius: '18px', overflow: 'hidden', flex: 'none', background: '#dde5f1' } }, h('img', { src: imgUrl(a.photo), alt: a.full_name, style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', null,
              h('h1', { className: 'serif', style: { fontSize: '30px', fontWeight: 600, margin: 0 } }, a.full_name),
              h('div', { className: 'hv-mut', style: { marginTop: '4px' } }, (a.title || 'Agent') + ' · ' + (a.brokerage || 'Haven Realty')),
              h('div', { className: 'hv-mut', style: { marginTop: '4px' } }, '★ ' + (a.rating || '5.0') + ' · ' + (a.sales_count || 0) + ' sales · ' + (a.region || '')))),
          h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: 'var(--ink2)', marginTop: '20px' } }, a.bio || ''),
          theirs.length ? h('div', { style: { marginTop: '28px' } },
            h(Eyebrow, null, 'Active listings'),
            h('h2', { className: 'hv-h2', style: { marginTop: '4px' } }, a.full_name.split(' ')[0] + "'s homes"),
            h('div', { className: 'hv-grid', style: { gridTemplateColumns: 'repeat(2,1fr)' } }, theirs.map(function (p) { return h(ListingCard, { key: p.uuid, p: p, ctx: c }); }))) : null),
        h('div', { className: 'hv-panel', style: { padding: '22px', position: 'sticky', top: '90px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Contact ' + a.full_name.split(' ')[0]),
          [['Brokerage', a.brokerage || 'Haven Realty'], ['Region', a.region || '—'], ['Email', a.email || '—'], ['Phone', a.phone || '—']].map(function (r, i) {
            return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 0, fontSize: '13.5px' } }, h('span', { className: 'hv-mut' }, r[0]), h('b', { style: { textAlign: 'right', wordBreak: 'break-all' } }, r[1]));
          }),
          h('button', { className: 'hv-btn hv-btn-blue', style: { width: '100%', marginTop: '14px' }, onClick: function () { c.navigate('#/agents'); } }, 'See all agents'))));
  }

  // ── Tour + Offer modals (buyer) ───────────────────────────────────────────────
  function TourModal(props) {
    var c = props.ctx; var p = props.listing; var u = client.userInfo || {};
    var [f, setF] = React.useState({ date: '', time: '11:00', phone: '', notes: '' });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setF(function (x) { var n = Object.assign({}, x); n[k] = v; return n; }); }
    function submit(e) {
      e.preventDefault();
      if (!c.authed) { c.openLogin(); return; }
      if (!f.date) { showToast('Pick a date', 'error'); return; }
      setBusy(true);
      var start = new Date(f.date + 'T' + (f.time || '11:00') + ':00').toISOString();
      var rec = { listing_title: p.title, listing_address: [p.address, p.city].filter(Boolean).join(', '),
        customer_name: u.fullName || '', customer_email: u.email || '', customer_phone: f.phone,
        agent_name: p.agent_name || '', tour_state: 'requested', start_time: start, notes: f.notes,
        owner_username: u.email || '', display_name: 'Tour · ' + p.title };
      client.createObject('tour', rec).then(function () { setBusy(false); showToast('Tour requested — we\'ll confirm by email & text', 'success'); props.onClose(); c.navigate('#/portal'); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'hv-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('form', { className: 'hv-sheet', style: { padding: '30px' }, onSubmit: submit },
        h('button', { type: 'button', className: 'hv-x', onClick: props.onClose }, '×'),
        h(Eyebrow, null, 'Request a tour'),
        h('h2', { className: 'hv-h2', style: { marginTop: '4px', fontSize: '22px' } }, p.title),
        h('div', { className: 'hv-mut' }, [p.neighborhood, p.city].filter(Boolean).join(', ')),
        !c.authed ? h('div', { className: 'hv-banner', style: { marginTop: '12px' } }, 'Sign in to confirm your tour — click below.') : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Preferred date', req: true, children: h('input', { className: 'hv-input', type: 'date', required: true, value: f.date, onChange: function (e) { set('date', e.target.value); } }) }),
          h(Field, { label: 'Time', children: h('input', { className: 'hv-input', type: 'time', value: f.time, onChange: function (e) { set('time', e.target.value); } }) })),
        h(Field, { label: 'Phone', children: h('input', { className: 'hv-input', value: f.phone, onChange: function (e) { set('phone', e.target.value); } }) }),
        h(Field, { label: 'Notes for the agent', children: h('textarea', { className: 'hv-input', value: f.notes, onChange: function (e) { set('notes', e.target.value); } }) }),
        h('button', { className: 'hv-btn hv-btn-blue', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '16px' } }, busy ? 'Requesting…' : (c.authed ? 'Request tour' : 'Sign in & request'))));
  }

  function OfferModal(props) {
    var c = props.ctx; var p = props.listing; var u = client.userInfo || {};
    var [f, setF] = React.useState({ amount: p.price || '', financing: 'Conventional', notes: '' });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setF(function (x) { var n = Object.assign({}, x); n[k] = v; return n; }); }
    function submit(e) {
      e.preventDefault();
      if (!c.authed) { c.openLogin(); return; }
      if (!f.amount) { showToast('Enter an offer amount', 'error'); return; }
      setBusy(true);
      var rec = { listing_title: p.title, customer_name: u.fullName || '', customer_email: u.email || '',
        amount: Number(f.amount), financing: f.financing, offer_state: 'submitted',
        submitted_date: new Date().toISOString().slice(0, 10), agent_name: p.agent_name || '',
        notes: f.notes, owner_username: u.email || '', display_name: 'Offer · ' + p.title };
      client.createObject('offer', rec).then(function () { setBusy(false); showToast('Offer submitted — your agent has been notified', 'success'); props.onClose(); c.navigate('#/portal/offers'); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'hv-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('form', { className: 'hv-sheet', style: { padding: '30px' }, onSubmit: submit },
        h('button', { type: 'button', className: 'hv-x', onClick: props.onClose }, '×'),
        h(Eyebrow, null, 'Make an offer'),
        h('h2', { className: 'hv-h2', style: { marginTop: '4px', fontSize: '22px' } }, p.title),
        h('div', { className: 'hv-mut' }, 'List price ' + priceLabel(p)),
        !c.authed ? h('div', { className: 'hv-banner', style: { marginTop: '12px' } }, 'Sign in to submit your offer — click below.') : null,
        h(Field, { label: 'Offer amount ($)', req: true, children: h('input', { className: 'hv-input', type: 'number', required: true, value: f.amount, onChange: function (e) { set('amount', e.target.value); } }) }),
        h(Field, { label: 'Financing', children: h('select', { className: 'hv-input', value: f.financing, onChange: function (e) { set('financing', e.target.value); } }, FINANCING.map(function (x) { return h('option', { key: x, value: x }, x); })) }),
        h(Field, { label: 'Notes / terms', children: h('textarea', { className: 'hv-input', placeholder: 'e.g. 20% down, flexible close, inspection contingency', value: f.notes, onChange: function (e) { set('notes', e.target.value); } }) }),
        h('button', { className: 'hv-btn hv-btn-gold', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '16px' } }, busy ? 'Submitting…' : (c.authed ? 'Submit offer' : 'Sign in & submit'))));
  }

  // ── Buyer portal ──────────────────────────────────────────────────────────────
  function Portal(props) {
    var c = props.ctx; var sub = props.sub || 'tours';
    var [tours, setTours] = React.useState(null); var [offers, setOffers] = React.useState(null);
    function load() {
      client.getObjects('tour').then(function (r) { setTours(arr(r).sort(function (a, b) { return (b.start_time || '').localeCompare(a.start_time || ''); })); }).catch(function () { setTours([]); });
      client.getObjects('offer').then(function (r) { setOffers(arr(r).sort(function (a, b) { return (b.submitted_date || '').localeCompare(a.submitted_date || ''); })); }).catch(function () { setOffers([]); });
    }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'hv-wrap hv-sec' }, h('div', { className: 'hv-empty' }, h('h2', { className: 'hv-h2' }, 'Sign in to My Haven'), h('button', { className: 'hv-btn hv-btn-blue', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    function cancelTour(t) { client.updateObject('tour', t.uuid, { tour_state: 'cancelled' }, t).then(function () { showToast('Tour cancelled', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    function withdrawOffer(o) { client.updateObject('offer', o.uuid, { offer_state: 'withdrawn' }, o).then(function () { showToast('Offer withdrawn', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    var tabs = [['tours', 'My tours'], ['offers', 'My offers']];
    return h('div', { className: 'hv-wrap hv-sec' },
      h('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' } },
        h('h2', { className: 'hv-h2' }, 'My Haven'),
        h('div', { style: { display: 'flex', gap: '6px', marginLeft: '6px' } }, tabs.map(function (t) {
          return h('button', { key: t[0], className: cls('hv-btn hv-btn-sm', sub === t[0] ? 'hv-btn-navy' : 'hv-btn-ghost'), onClick: function () { c.navigate('#/portal/' + t[0]); } }, t[1]);
        })),
        h('button', { className: 'hv-btn hv-btn-blue', style: { marginLeft: 'auto' }, onClick: function () { c.navigate('#/search'); } }, '🔍 Browse homes')),
      sub === 'offers'
        ? h('div', { className: 'hv-panel', style: { marginTop: '18px' } }, offers === null ? h('div', { className: 'hv-row hv-mut' }, 'Loading…')
          : offers.length ? offers.map(function (o) {
            return h('div', { key: o.uuid, className: 'hv-row' },
              h('div', { className: 'hv-grow' }, h('div', { style: { fontWeight: 700 } }, o.listing_title),
                h('div', { className: 'hv-mut' }, money(o.amount) + ' · ' + (o.financing || '') + ' · ' + fmtDate(o.submitted_date) + (o.agent_name ? ' · ' + o.agent_name : ''))),
              h(Badge, { s: o.offer_state }),
              ['submitted', 'under_review', 'countered'].indexOf(o.offer_state) >= 0 ? h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { withdrawOffer(o); } }, 'Withdraw') : null);
          }) : h('div', { className: 'hv-empty' }, 'No offers yet. Find a home and make an offer.'))
        : h('div', { className: 'hv-panel', style: { marginTop: '18px' } }, tours === null ? h('div', { className: 'hv-row hv-mut' }, 'Loading…')
          : tours.length ? tours.map(function (t) {
            return h('div', { key: t.uuid, className: 'hv-row' },
              h('div', { className: 'hv-grow' }, h('div', { style: { fontWeight: 700 } }, t.listing_title),
                h('div', { className: 'hv-mut' }, fmtDT(t.start_time) + (t.agent_name ? ' · with ' + t.agent_name : ''))),
              h(Badge, { s: t.tour_state }),
              ['requested', 'confirmed'].indexOf(t.tour_state) >= 0 ? h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { cancelTour(t); } }, 'Cancel') : null);
          }) : h('div', { className: 'hv-empty' }, 'No tours yet. Browse homes and request a tour.')));
  }

  // ── Broker / agent console ──────────────────────────────────────────────────
  function CStat(p) { return h('div', { className: 'hv-stat' }, h('div', { className: 'hv-stat-n', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'hv-stat-l' }, p.l)); }

  function BarChart(props) {
    var data = props.data || []; var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    return h('div', { className: 'hv-bars' }, data.map(function (d, i) {
      return h('div', { key: i, className: 'hv-bar' },
        h('div', { className: 'v' }, d.value),
        h('div', { className: 'b', style: { height: Math.round((d.value / max) * 150) + 'px' } }),
        h('div', { className: 'l' }, d.label));
    }));
  }

  function ConsoleHome(props) {
    var c = props.ctx;
    var [offers, setOffers] = React.useState([]); var [tours, setTours] = React.useState([]);
    React.useEffect(function () {
      client.getObjects('offer').then(function (r) { setOffers(arr(r)); }).catch(function () {});
      client.getObjects('tour').then(function (r) { setTours(arr(r)); }).catch(function () {});
    }, []);
    var L = c.listings || [];
    var active = L.filter(function (x) { return x.listing_state === 'active'; });
    var pendingOffers = offers.filter(function (o) { return ['submitted', 'under_review', 'countered'].indexOf(o.offer_state) >= 0; }).length;
    var weekStart = new Date(); weekStart.setHours(0, 0, 0, 0);
    var weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    var toursWeek = tours.filter(function (t) { try { var d = new Date(t.start_time); return d >= weekStart && d < weekEnd; } catch (e) { return false; } }).length;
    var listVolume = active.filter(function (x) { return x.listing_type === 'For Sale'; }).reduce(function (s, x) { return s + (x.price || 0); }, 0);
    // bar chart: active listings by city
    var byCity = {}; active.forEach(function (x) { var k = x.city || 'Other'; byCity[k] = (byCity[k] || 0) + 1; });
    var chartData = Object.keys(byCity).map(function (k) { return { label: k, value: byCity[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 6);
    return h('div', null,
      h('div', { className: 'hv-stats' },
        h(CStat, { n: active.length, l: 'Active listings', color: 'var(--blue)' }),
        h(CStat, { n: pendingOffers, l: 'Offers to review', color: '#b45309' }),
        h(CStat, { n: toursWeek, l: 'Tours this week', color: '#0e7c5a' }),
        h(CStat, { n: money(listVolume), l: 'Active list volume' })),
      h('div', { className: 'hv-panel', style: { marginTop: '18px', padding: '22px' } },
        h('div', { style: { fontWeight: 700, fontFamily: 'Fraunces,serif', fontSize: '18px', marginBottom: '4px' } }, 'Active listings by city'),
        chartData.length ? h(BarChart, { data: chartData }) : h('div', { className: 'hv-empty' }, 'No active listings.')),
      h('div', { className: 'hv-panel', style: { marginTop: '18px', padding: '22px' } },
        h('div', { className: 'serif', style: { fontWeight: 600, fontSize: '18px', marginBottom: '4px' } }, 'Welcome back, ' + ((client.userInfo || {}).fullName || 'Broker')),
        h('div', { className: 'hv-mut' }, 'Manage listings, run the tour schedule, review offers and your team — all from here.')));
  }

  function ConsoleTours(props) {
    var c = props.ctx; var [tours, setTours] = React.useState(null); var [fState, setFState] = React.useState('all');
    function load() { client.getObjects('tour').then(function (r) { setTours(arr(r).sort(function (a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); })); }).catch(function () { setTours([]); }); }
    React.useEffect(load, []);
    function setState(t, st) { client.updateObject('tour', t.uuid, { tour_state: st }, t).then(function () { showToast('Tour ' + st, 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    var list = (tours || []).filter(function (t) { return fState === 'all' || t.tour_state === fState; });
    return h('div', null,
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' } },
        h('button', { className: cls('hv-btn hv-btn-sm', fState === 'all' ? 'hv-btn-navy' : 'hv-btn-ghost'), onClick: function () { setFState('all'); } }, 'All'),
        TOUR_STATES.map(function (s) { return h('button', { key: s, className: cls('hv-btn hv-btn-sm', fState === s ? 'hv-btn-navy' : 'hv-btn-ghost'), onClick: function () { setFState(s); } }, s); })),
      h('div', { className: 'hv-panel' }, tours === null ? h('div', { className: 'hv-row hv-mut' }, 'Loading…')
        : list.length ? list.map(function (t) {
          return h('div', { key: t.uuid, className: 'hv-row' },
            h('div', { className: 'hv-grow' }, h('div', { style: { fontWeight: 700 } }, t.listing_title), h('div', { className: 'hv-mut' }, (t.customer_name || '') + ' · ' + fmtDT(t.start_time) + (t.agent_name ? ' · ' + t.agent_name : ''))),
            h(Badge, { s: t.tour_state }),
            t.tour_state === 'requested' ? h('button', { className: 'hv-btn hv-btn-blue hv-btn-sm', onClick: function () { setState(t, 'confirmed'); } }, 'Confirm') : null,
            t.tour_state === 'confirmed' ? h('button', { className: 'hv-btn hv-btn-navy hv-btn-sm', onClick: function () { setState(t, 'completed'); } }, 'Complete') : null,
            ['requested', 'confirmed'].indexOf(t.tour_state) >= 0 ? h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { setState(t, 'cancelled'); } }, 'Cancel') : null);
        }) : h('div', { className: 'hv-empty' }, 'No tours.')));
  }

  function ConsoleOffers(props) {
    var c = props.ctx; var [offers, setOffers] = React.useState(null); var [open, setOpen] = React.useState(null);
    function load() { client.getObjects('offer').then(function (r) { setOffers(arr(r).sort(function (a, b) { return (b.submitted_date || '').localeCompare(a.submitted_date || ''); })); }).catch(function () { setOffers([]); }); }
    React.useEffect(load, []);
    function setState(o, st) {
      client.updateObject('offer', o.uuid, { offer_state: st }, o).then(function () { showToast('Offer ' + st, 'success'); load(); setOpen(Object.assign({}, o, { offer_state: st })); }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    function accept(o) {
      // Find the listing to flip to pending, then run the saga (with graceful fallback).
      var listing = (c.listings || []).filter(function (x) { return x.title === o.listing_title; })[0];
      function fallback() {
        // Saga unavailable → do the two CRUD writes directly so the demo always works.
        client.updateObject('offer', o.uuid, { offer_state: 'accepted' }, o)
          .then(function () { if (listing) return client.updateObject('listing', listing.uuid, { listing_state: 'pending' }, listing); })
          .then(function () { showToast('Offer accepted — listing set to pending', 'success'); load(); c.reload(); setOpen(Object.assign({}, o, { offer_state: 'accepted' })); })
          .catch(function (e) { showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); });
      }
      Promise.resolve().then(function () {
        if (!services || !services.workflow || !services.workflow.run) throw 0;
        return services.workflow.run('offer_accepted', {
          offer_uuid: o.uuid, listing_uuid: listing ? listing.uuid : '', customer_email: o.customer_email,
          customer_name: o.customer_name, listing_title: o.listing_title, amount: String(o.amount || '')
        });
      }).then(function () { showToast('Offer accepted — saga triggered', 'success'); setTimeout(function () { load(); c.reload(); }, 600); setOpen(Object.assign({}, o, { offer_state: 'accepted' })); })
        .catch(fallback);
    }
    var list = offers || [];
    return h('div', { className: 'hv-2col' },
      h('div', null,
        h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'All offers'),
        h('div', { className: 'hv-panel' }, offers === null ? h('div', { className: 'hv-row hv-mut' }, 'Loading…')
          : list.length ? list.map(function (o) {
            return h('div', { key: o.uuid, className: 'hv-row', style: { cursor: 'pointer', background: open && open.uuid === o.uuid ? '#eff4ff' : '' }, onClick: function () { setOpen(o); } },
              h('div', { className: 'hv-grow' }, h('div', { style: { fontWeight: 700 } }, o.listing_title), h('div', { className: 'hv-mut' }, (o.customer_name || '') + ' · ' + money(o.amount) + ' · ' + (o.financing || ''))),
              h(Badge, { s: o.offer_state }));
          }) : h('div', { className: 'hv-empty' }, 'No offers yet.'))),
      h('div', { className: 'hv-panel', style: { padding: '22px', position: 'sticky', top: '90px' } },
        open ? h('div', null,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { style: { fontWeight: 800, fontSize: '17px' } }, open.listing_title), h(Badge, { s: open.offer_state })),
          h('div', { className: 'hv-cprice', style: { fontSize: '28px', marginTop: '8px' } }, money(open.amount)),
          h('div', { className: 'hv-mut', style: { marginTop: '4px' } }, (open.customer_name || '') + ' · ' + (open.customer_email || '')),
          h('div', { className: 'hv-mut' }, (open.financing || '') + ' · submitted ' + fmtDate(open.submitted_date) + (open.agent_name ? ' · ' + open.agent_name : '')),
          open.notes ? h('div', { style: { marginTop: '10px', fontSize: '13.5px', lineHeight: 1.5 } }, h('b', null, 'Notes: '), open.notes) : null,
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' } },
            ['accepted', 'rejected', 'withdrawn'].indexOf(open.offer_state) < 0 ? h('button', { className: 'hv-btn hv-btn-blue hv-btn-sm', onClick: function () { setState(open, 'under_review'); } }, 'Review') : null,
            ['accepted', 'rejected', 'withdrawn'].indexOf(open.offer_state) < 0 ? h('button', { className: 'hv-btn hv-btn-gold hv-btn-sm', onClick: function () { accept(open); } }, '✓ Accept') : null,
            ['accepted', 'rejected', 'withdrawn'].indexOf(open.offer_state) < 0 ? h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { setState(open, 'countered'); } }, 'Counter') : null,
            ['accepted', 'rejected', 'withdrawn'].indexOf(open.offer_state) < 0 ? h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { setState(open, 'rejected'); } }, 'Reject') : null),
          open.offer_state === 'accepted' ? h('div', { className: 'hv-banner', style: { marginTop: '14px' } }, '✓ Accepted — the listing has been set to pending.') : null)
          : h('div', { className: 'hv-empty' }, 'Select an offer to review.')));
  }

  // generic CRUD form modal
  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; if (fd.k === 'image_url') v = imgUrl(init.image); if (fd.k === 'photo_url') v = imgUrl(init.photo); f[fd.k] = (v == null) ? '' : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {};
      fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; }
        if (v === '' || v == null) return;
        if (fd.type === 'number') v = Number(v);
        if (fd.k === 'image_url') { data.image = { url: v, thumbnail_url: v }; return; }
        if (fd.k === 'photo_url') { data.photo = { url: v, thumbnail_url: v }; return; }
        data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'hv-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'hv-sheet', style: { padding: '28px' } }, h('button', { className: 'hv-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'hv-h2', style: { fontSize: '22px' } }, init.uuid ? props.editTitle : props.newTitle),
        fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'hv-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'hv-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'hv-mut' }, 'Yes'));
          else input = h('input', { className: 'hv-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h(Field, { key: fd.k, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'hv-btn hv-btn-blue', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'hv-btn hv-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  var LISTING_FIELDS = [
    { k: 'title', label: 'Title', req: true }, { k: 'address', label: 'Address' },
    { k: 'city', label: 'City' }, { k: 'state', label: 'State' }, { k: 'neighborhood', label: 'Neighborhood' },
    { k: 'listing_type', label: 'Listing type', type: 'select', opts: LISTING_TYPES },
    { k: 'property_type', label: 'Property type', type: 'select', opts: PROPERTY_TYPES },
    { k: 'price', label: 'Price ($)', type: 'number' }, { k: 'beds', label: 'Beds', type: 'number' },
    { k: 'baths', label: 'Baths', type: 'number' }, { k: 'sqft', label: 'Sq ft', type: 'number' },
    { k: 'year_built', label: 'Year built', type: 'number' },
    { k: 'listing_state', label: 'Listing state', type: 'select', opts: LISTING_STATES, req: true },
    { k: 'agent_name', label: 'Agent name' }, { k: 'image_url', label: 'Photo URL' },
    { k: 'description', label: 'Description', type: 'textarea' }, { k: 'featured', label: 'Featured on homepage', type: 'check' }
  ];
  var AGENT_FIELDS = [
    { k: 'full_name', label: 'Full name', req: true }, { k: 'title', label: 'Title' },
    { k: 'brokerage', label: 'Brokerage' }, { k: 'email', label: 'Email' }, { k: 'phone', label: 'Phone' },
    { k: 'region', label: 'Region' }, { k: 'rating', label: 'Rating', type: 'number' },
    { k: 'sales_count', label: 'Sales count', type: 'number' }, { k: 'photo_url', label: 'Photo URL' },
    { k: 'bio', label: 'Bio', type: 'textarea' }
  ];

  function ConsoleListings(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null); var [q, setQ] = React.useState('');
    var list = (c.listings || []).slice().sort(bySort).filter(function (p) { return !q || (p.title + ' ' + (p.city || '') + ' ' + (p.neighborhood || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    function del(p) { if (!window.confirm('Delete ' + p.title + '?')) return; client.deleteObject('listing', p.uuid, p).then(function () { showToast('Deleted', 'success'); c.reload(); }).catch(function (e) { showToast('Delete failed: ' + ((e && e.message) || 'error'), 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
        h('input', { className: 'hv-input', style: { maxWidth: '280px' }, placeholder: 'Search listings…', value: q, onChange: function (e) { setQ(e.target.value); } }),
        h('div', { className: 'hv-mut' }, list.length + ' listings'),
        h('button', { className: 'hv-btn hv-btn-blue hv-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New listing')),
      h('div', { className: 'hv-panel' }, list.map(function (p) {
        return h('div', { key: p.uuid, className: 'hv-row' },
          h('div', { style: { width: '64px', height: '46px', borderRadius: '8px', overflow: 'hidden', flex: 'none', background: '#dde5f1' } }, h('img', { src: imgUrl(p.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'hv-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, p.title), h('div', { className: 'hv-mut' }, [p.neighborhood, p.city].filter(Boolean).join(', ') + ' · ' + (p.property_type || ''))),
          h('div', { style: { fontWeight: 700, minWidth: '90px', textAlign: 'right' } }, priceLabel(p)),
          h(Badge, { s: p.listing_state }),
          h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'),
          h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { del(p); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'listing', fields: LISTING_FIELDS, initial: edit, newTitle: 'New listing', editTitle: 'Edit listing',
        beforeSave: function (d) { if (!d.listing_state) d.listing_state = 'active'; d.display_name = d.title || 'Listing'; d.description = d.description || d.title || ''; },
        onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function ConsoleAgents(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.agents || []).slice().sort(bySort);
    function del(a) { if (!window.confirm('Remove ' + a.full_name + '?')) return; client.deleteObject('agent', a.uuid, a).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function (e) { showToast('Delete failed: ' + ((e && e.message) || 'error'), 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' agents'),
        h('button', { className: 'hv-btn hv-btn-blue hv-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add agent')),
      h('div', { className: 'hv-panel' }, list.map(function (a) {
        return h('div', { key: a.uuid, className: 'hv-row' },
          h('div', { style: { width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', flex: 'none', background: '#dde5f1' } }, h('img', { src: imgUrl(a.photo), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'hv-grow' }, h('div', { style: { fontWeight: 600 } }, a.full_name), h('div', { className: 'hv-mut' }, (a.title || 'Agent') + ' · ★ ' + (a.rating || '5.0') + ' · ' + (a.sales_count || 0) + ' sales')),
          h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { setEdit(a); } }, 'Edit'),
          h('button', { className: 'hv-btn hv-btn-ghost hv-btn-sm', onClick: function () { del(a); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'agent', fields: AGENT_FIELDS, initial: edit, newTitle: 'Add agent', editTitle: 'Edit agent',
        beforeSave: function (d) { d.display_name = d.full_name || 'Agent'; d.description = (d.title || '') + ' · ' + (d.region || ''); },
        onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function Console(props) {
    var c = props.ctx; var tab = props.tab || 'home';
    var tabs = [['home', 'Dashboard'], ['listings', 'Listings'], ['tours', 'Tours'], ['offers', 'Offers'], ['agents', 'Agents']];
    return h('div', { className: 'hv' },
      h('div', { style: { background: 'var(--navy)' } }, h('div', { className: 'hv-wrap', style: { display: 'flex', alignItems: 'center', height: '62px', gap: '14px' } },
        h('div', { className: 'hv-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.18)' } }, '⌂'), 'Haven'),
        h('span', { style: { color: '#9fb0d0', fontWeight: 600, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase' } }, 'Broker'),
        h('div', { className: 'hv-tabs', style: { marginLeft: '12px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('hv-tab', tab === t[0] && 'on'), onClick: function () { c.navigate('#/console' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'hv-ibtn', style: { marginLeft: 'auto', color: '#cdd9ef' }, onClick: function () { c.navigate('#/'); } }, 'View site ↗'))),
      h('div', { className: 'hv-wrap', style: { padding: '28px 24px 64px' } },
        tab === 'listings' ? h(ConsoleListings, { ctx: c })
          : tab === 'tours' ? h(ConsoleTours, { ctx: c })
          : tab === 'offers' ? h(ConsoleOffers, { ctx: c })
          : tab === 'agents' ? h(ConsoleAgents, { ctx: c })
          : h(ConsoleHome, { ctx: c })));
  }

  function Footer() {
    return h('footer', { className: 'hv-foot' }, h('div', { className: 'hv-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' } },
      h('div', null, h('b', null, 'Haven'), ' — find your place.'),
      h('div', null, 'Buy · Rent · Agents · Equal Housing Opportunity')));
  }

  // ── Root ──────────────────────────────────────────────────────────────────────
  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [tourFor, setTourFor] = React.useState(null);
    var [offerFor, setOfferFor] = React.useState(null);
    var [listings, setListings] = React.useState(null);
    var [agents, setAgents] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() {
      client.getObjects('listing').then(function (r) { setListings(arr(r)); }).catch(function () { setListings([]); });
      client.getObjects('agent').then(function (r) { setAgents(arr(r)); }).catch(function () { setAgents([]); });
    }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    var ctx = {
      route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, listings: listings, agents: agents, reload: reload,
      openTour: function (p) { if (!authed) { setShowLogin(true); return; } setTourFor(p); },
      openOffer: function (p) { if (!authed) { setShowLogin(true); return; } setOfferFor(p); }
    };

    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var q = qi >= 0 ? hash.slice(qi) : ''; var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';
    var qp = new URLSearchParams(q.replace(/^\?/, ''));

    if (top === 'console' && ctx.isAdmin) return h(ErrorBoundary, null, h(Console, { ctx: ctx, tab: seg[1] || 'home' }),
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'search') page = h(SearchPage, { ctx: ctx, qp: qp, q: q });
    else if (top === 'listing') page = h(ListingPage, { ctx: ctx, uuid: seg[1] });
    else if (top === 'agents') page = h(AgentsPage, { ctx: ctx });
    else if (top === 'agent') page = h(AgentPage, { ctx: ctx, uuid: seg[1] });
    else if (top === 'portal') page = h(Portal, { ctx: ctx, sub: seg[1] || 'tours' });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'hv' },
      h(TopBar, { ctx: ctx }), page, h(Footer, null),
      tourFor ? h(TourModal, { ctx: ctx, listing: tourFor, onClose: function () { setTourFor(null); } }) : null,
      offerFor ? h(OfferModal, { ctx: ctx, listing: offerFor, onClose: function () { setOfferFor(null); } }) : null,
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
