// ui/app.js — PulseFit boutique fitness brand (custom UI).
// Globals (React, ReactDOM, client, services, showToast, formatCurrency, resolveImageUrl,
// ErrorBoundary) come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  // ── Brand / constants ───────────────────────────────────────────────────────
  var BRAND = { name: 'PulseFit', tagline: "Your city's boldest workouts." };
  var HERO = 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&q=80&w=2000&h=1200';
  var CATEGORIES = ['Strength', 'HIIT', 'Yoga', 'Pilates', 'Spin', 'Boxing', 'Mobility', 'Nutrition'];
  var CAT_ICON = { 'Strength': '🏋️', 'HIIT': '🔥', 'Yoga': '🧘', 'Pilates': '🤸', 'Spin': '🚴', 'Boxing': '🥊', 'Mobility': '🤾', 'Nutrition': '🥗' };
  var INTENSITIES = ['Low', 'Medium', 'High'];
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var BOOKING_STATES = ['booked', 'attended', 'cancelled', 'waitlist'];
  var MEMBER_STATES = ['active', 'frozen', 'cancelled'];

  // Pricing tiers — rendered from a constant (no entity needed).
  var PLANS = [
    { name: 'Day Pass', price: 29, period: '/day', tag: 'Try us', feats: ['One day, any club', 'Any class with open spots', 'Towel & water'] },
    { name: 'Basic', price: 89, period: '/mo', tag: 'Get started', feats: ['Home club access', '8 classes / month', 'Member app & booking'] },
    { name: 'Premium', price: 149, period: '/mo', tag: 'Most popular', feats: ['All clubs, all access', 'Unlimited classes', 'Guest passes & recovery lounge'], hot: true },
    { name: 'Elite', price: 219, period: '/mo', tag: 'Go all in', feats: ['Everything in Premium', '2 PT sessions / month', 'Nutrition coaching & priority booking'] },
  ];

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n; } }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function bySort(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }
  function dayOf(dt) { var d = (dt || '').split('·')[0].trim(); return d.slice(0, 3); }
  function statusColor(s) {
    return { booked: '#84cc16', attended: '#22c55e', waitlist: '#f59e0b', cancelled: '#71717a',
      active: '#84cc16', frozen: '#38bdf8', High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }[s] || '#84cc16';
  }
  function isStaff() {
    try {
      return client.isAdmin() || client.canWrite('club') ||
        ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0;
    } catch (e) { return false; }
  }

  // ── Design system (bold / energetic: near-black + electric lime) ─────────────
  function injectChrome() {
    if (document.getElementById('pf-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'pf-chrome';
    st.textContent = [
      ':root{--ink:#0a0a0b;--ink2:#16181d;--card:#16181d;--card2:#1f2229;--paper:#0e0f12;--lime:#c6ff2e;--lime-d:#a9e000;--line:#2a2e36;--muted:#9aa0aa;--muted2:#6b7280;--white:#f5f7fa}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.pf{background:var(--paper);color:var(--white);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.pf *{box-sizing:border-box}.pf a{color:inherit;text-decoration:none}',
      '.pf-wrap{max-width:1220px;margin:0 auto;padding:0 24px}',
      '.cond{font-family:Archivo,Inter,sans-serif;text-transform:uppercase;letter-spacing:-.01em}',
      // top bar
      '.pf-top{position:sticky;top:0;z-index:50;background:rgba(10,10,11,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}',
      '.pf-top-in{display:flex;align-items:center;gap:18px;height:70px}',
      '.pf-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:Archivo;font-weight:900;font-size:25px;letter-spacing:-.02em;text-transform:uppercase;color:var(--white)}',
      '.pf-logo .dot{width:30px;height:30px;border-radius:9px;background:var(--lime);display:flex;align-items:center;justify-content:center;color:#0a0a0b;font-size:17px;font-weight:900}',
      '.pf-logo b{color:var(--lime)}',
      '.pf-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.pf-ibtn{background:none;border:0;cursor:pointer;font-size:13.5px;color:var(--white);padding:9px 13px;border-radius:9px;font-weight:600}',
      '.pf-ibtn:hover{background:var(--card2)}',
      '.pf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:11px;font-weight:700;font-size:14px;padding:12px 22px;font-family:Inter;transition:.15s}',
      '.pf-btn:disabled{opacity:.5;cursor:default}',
      '.pf-btn-lime{background:var(--lime);color:#0a0a0b}.pf-btn-lime:hover:not(:disabled){background:var(--lime-d)}',
      '.pf-btn-white{background:var(--white);color:#0a0a0b}.pf-btn-white:hover:not(:disabled){background:#fff}',
      '.pf-btn-ghost{background:transparent;color:var(--white);border:1px solid var(--line)}.pf-btn-ghost:hover{border-color:var(--lime);color:var(--lime)}',
      '.pf-btn-dark{background:var(--card2);color:var(--white)}.pf-btn-dark:hover:not(:disabled){background:#2a2e36}',
      '.pf-btn-sm{padding:8px 14px;font-size:13px;border-radius:9px}',
      // hero
      '.pf-hero{position:relative;overflow:hidden;background:var(--ink)}',
      '.pf-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42}',
      '.pf-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,11,.2),rgba(10,10,11,.92))}',
      '.pf-hero-in{position:relative;z-index:2;padding:104px 0 116px}',
      '.pf-hero h1{font-family:Archivo;font-weight:900;text-transform:uppercase;letter-spacing:-.025em;font-size:clamp(44px,7vw,92px);line-height:.94;margin:14px 0 0;max-width:920px}',
      '.pf-hero h1 em{font-style:normal;color:var(--lime)}',
      '.pf-hero p{font-size:19px;color:#d4d8de;max-width:540px;margin:20px 0 0;line-height:1.5}',
      '.pf-pill{display:inline-block;background:var(--lime);color:#0a0a0b;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;padding:7px 15px;border-radius:30px}',
      // sections
      '.pf-sec{padding:62px 0}',
      '.pf-h2{font-family:Archivo;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-size:clamp(26px,3.4vw,40px);margin:0;line-height:1}',
      '.pf-eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--lime)}',
      '.pf-sub{color:var(--muted);font-size:15px;margin:8px 0 0}',
      // category chips
      '.pf-cats{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}',
      '.pf-catchip{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:30px;padding:10px 16px;cursor:pointer;font-weight:700;font-size:13.5px;transition:.15s}',
      '.pf-catchip:hover{border-color:var(--lime);color:var(--lime)}',
      '.pf-catchip.on{background:var(--lime);color:#0a0a0b;border-color:var(--lime)}',
      // grids + cards
      '.pf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px}',
      '.pf-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:24px}',
      '.pf-card{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:.16s;display:flex;flex-direction:column}',
      '.pf-card:hover{border-color:#3a4150;transform:translateY(-3px);box-shadow:0 20px 50px -30px rgba(0,0,0,.9)}',
      '.pf-card-img{height:200px;overflow:hidden;background:var(--card2);position:relative}',
      '.pf-card-img img{width:100%;height:100%;object-fit:cover;transition:.35s}.pf-card:hover .pf-card-img img{transform:scale(1.06)}',
      '.pf-ribbon{position:absolute;top:12px;left:12px;z-index:2;background:#0a0a0b;color:var(--lime);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:5px 11px;border-radius:8px}',
      '.pf-spots{position:absolute;top:12px;right:12px;z-index:2;font-size:11px;font-weight:800;text-transform:uppercase;padding:5px 10px;border-radius:8px}',
      '.pf-card-b{padding:16px 17px 18px;display:flex;flex-direction:column;flex:1}',
      '.pf-card-b h3{font-family:Archivo;font-weight:800;text-transform:uppercase;letter-spacing:-.01em;font-size:18px;margin:0;line-height:1.05}',
      '.pf-meta{color:var(--muted);font-size:13px;margin-top:6px}',
      '.pf-chip{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--lime);background:rgba(198,255,46,.12);border-radius:7px;padding:4px 9px}',
      // trainer card
      '.pf-tcard{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;text-align:center;padding-bottom:18px}',
      '.pf-tcard-img{height:230px;overflow:hidden;background:var(--card2)}.pf-tcard-img img{width:100%;height:100%;object-fit:cover}',
      // panel / rows
      '.pf-panel{background:var(--card);border:1px solid var(--line);border-radius:16px}',
      '.pf-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.pf-row:first-child{border-top:0}.pf-grow{flex:1;min-width:0}.pf-mut{color:var(--muted);font-size:13px}',
      '.pf-badge{display:inline-block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:4px 11px;border-radius:8px;color:#0a0a0b}',
      '.pf-2col{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start}',
      // pricing
      '.pf-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:26px}',
      '.pf-plan{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px 22px;display:flex;flex-direction:column}',
      '.pf-plan.hot{border-color:var(--lime);box-shadow:0 0 0 1px var(--lime),0 24px 60px -36px rgba(198,255,46,.4)}',
      '.pf-plan h3{font-family:Archivo;font-weight:900;text-transform:uppercase;font-size:22px;margin:10px 0 0}',
      '.pf-plan .price{font-family:Archivo;font-weight:900;font-size:40px;line-height:1;margin-top:12px}',
      '.pf-plan .price span{font-size:15px;font-weight:600;color:var(--muted);font-family:Inter}',
      '.pf-feat{display:flex;gap:9px;align-items:flex-start;color:#cfd3da;font-size:13.5px;margin-top:11px}',
      '.pf-feat b{color:var(--lime);font-weight:900}',
      // forms
      '.pf-field{display:block;margin-top:14px}.pf-field span{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}',
      '.pf-input{width:100%;border:1px solid var(--line);background:var(--ink2);border-radius:11px;padding:12px 13px;font-size:14px;font-family:Inter;color:var(--white)}',
      '.pf-input:focus{outline:none;border-color:var(--lime)}textarea.pf-input{min-height:84px;resize:vertical}',
      '.pf-input option{background:var(--ink2);color:var(--white)}',
      // modal
      '.pf-modal{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)}',
      '.pf-sheet{background:var(--card);border:1px solid var(--line);border-radius:18px;width:100%;max-width:560px;max-height:92vh;overflow:auto;position:relative}',
      '.pf-x{position:absolute;top:14px;right:16px;background:none;border:0;font-size:24px;cursor:pointer;color:var(--muted);z-index:2}',
      // stats
      '.pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.pf-stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px}',
      '.pf-stat-n{font-family:Archivo;font-weight:900;font-size:34px;line-height:1}',
      '.pf-stat-l{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:8px;font-weight:700}',
      // chart
      '.pf-bars{display:flex;align-items:flex-end;gap:14px;height:170px;padding:8px 4px 0}',
      '.pf-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end}',
      '.pf-bar{width:100%;max-width:54px;background:linear-gradient(180deg,var(--lime),var(--lime-d));border-radius:8px 8px 0 0;min-height:4px;transition:.3s}',
      '.pf-bar-l{font-size:11px;font-weight:700;color:var(--muted)}',
      '.pf-bar-v{font-family:Archivo;font-weight:800;font-size:14px}',
      // console tabs
      '.pf-tabs{display:flex;gap:4px;flex-wrap:wrap}',
      '.pf-tab{background:none;border:0;color:var(--muted);cursor:pointer;font-size:13.5px;font-weight:700;padding:9px 15px;border-radius:9px}',
      '.pf-tab.on{background:var(--lime);color:#0a0a0b}',
      // footer
      '.pf-foot{background:var(--ink);border-top:1px solid var(--line);color:var(--muted);padding:40px 0;font-size:13px;margin-top:40px}',
      '.pf-foot b{color:var(--white);font-family:Archivo;text-transform:uppercase}',
      '.pf-empty{text-align:center;padding:64px 20px;color:var(--muted)}',
      '@media(max-width:980px){.pf-grid,.pf-grid4{grid-template-columns:repeat(2,1fr)}.pf-plans{grid-template-columns:repeat(2,1fr)}.pf-stats{grid-template-columns:repeat(2,1fr)}.pf-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'pf-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '⚡'), 'Pulse', h('b', null, 'Fit')); }
  function Field(p) { return h('label', { className: 'pf-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { var s = p.s || ''; return h('span', { className: 'pf-badge', style: { background: statusColor(s) } }, s); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'member@pulsefit.app');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'pf-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'pf-sheet', style: { maxWidth: '410px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'pf-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'pf-h2', style: { marginTop: '18px', fontSize: '26px' } }, props.title || 'Member sign in'),
        h('p', { className: 'pf-mut', style: { marginTop: '6px' } }, 'Sign in to book classes and manage your membership.'),
        h(Field, { label: 'Email', children: h('input', { className: 'pf-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'pf-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: '#f87171', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'pf-btn pf-btn-lime', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'pf-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12px' } }, 'Demo — member@pulsefit.app · staff staff@pulsefit.app · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'pf-top' }, h('div', { className: 'pf-wrap pf-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'pf-act' },
        h('button', { className: 'pf-ibtn', onClick: function () { c.navigate('#/clubs'); } }, 'Clubs'),
        h('button', { className: 'pf-ibtn', onClick: function () { c.navigate('#/classes'); } }, 'Classes'),
        h('button', { className: 'pf-ibtn', onClick: function () { c.navigate('#/trainers'); } }, 'Trainers'),
        h('button', { className: 'pf-ibtn', onClick: function () { c.navigate('#/pricing'); } }, 'Membership'),
        c.isAdmin ? h('button', { className: 'pf-ibtn', onClick: function () { c.navigate('#/console'); } }, '⚙ Console') : null,
        c.authed && !c.isAdmin ? h('button', { className: 'pf-ibtn', onClick: function () { c.navigate('#/me'); } }, '👤 My PulseFit') : null,
        c.authed ? h('button', { className: 'pf-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'pf-ibtn', onClick: c.openLogin }, 'Sign in'),
        h('button', { className: 'pf-btn pf-btn-lime pf-btn-sm', onClick: function () { c.navigate('#/pricing'); } }, 'Join now'))));
  }

  function Hero(props) {
    var c = props.ctx;
    return h('section', { className: 'pf-hero' }, h('img', { src: HERO, alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }),
      h('div', { className: 'pf-wrap pf-hero-in' },
        h('span', { className: 'pf-pill' }, (c.clubs ? c.clubs.length : 4) + ' clubs · 1 city'),
        h('h1', { className: 'cond' }, 'Your city\'s ', h('em', null, 'boldest'), ' workouts.'),
        h('p', null, 'Strength, HIIT, boxing, spin, yoga and more — across the city, led by coaches who push you. Find your gym, book a class, and go.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '30px', flexWrap: 'wrap' } },
          h('button', { className: 'pf-btn pf-btn-lime', onClick: function () { c.navigate('#/clubs'); } }, 'Find your gym'),
          h('button', { className: 'pf-btn pf-btn-ghost', style: { color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.navigate('#/pricing'); } }, 'Join now'))));
  }

  // ── Cards ─────────────────────────────────────────────────────────────────────
  function ClubCard(props) {
    var club = props.club, c = props.ctx;
    return h('div', { className: 'pf-card', onClick: function () { c.navigate('#/classes?club=' + encodeURIComponent(club.name)); } },
      h('div', { className: 'pf-card-img' },
        club.neighborhood ? h('div', { className: 'pf-ribbon' }, club.neighborhood) : null,
        h('img', { src: imgUrl(club.image), alt: club.name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
      h('div', { className: 'pf-card-b' },
        h('h3', null, club.name),
        h('div', { className: 'pf-meta' }, '📍 ' + (club.address || '')),
        club.hours ? h('div', { className: 'pf-meta' }, '🕑 ' + club.hours) : null,
        h('div', { style: { marginTop: 'auto', paddingTop: '12px' } },
          h('button', { className: 'pf-btn pf-btn-dark pf-btn-sm', onClick: function (e) { e.stopPropagation(); c.navigate('#/classes?club=' + encodeURIComponent(club.name)); } }, 'See schedule →'))));
  }

  function ClassCard(props) {
    var cl = props.cl, c = props.ctx;
    var full = (cl.spots_left || 0) <= 0;
    return h('div', { className: 'pf-card', onClick: function () { c.openClass(cl); } },
      h('div', { className: 'pf-card-img' },
        h('div', { className: 'pf-spots', style: { background: full ? '#3f1d1d' : 'rgba(10,10,11,.8)', color: full ? '#fca5a5' : 'var(--lime)' } }, full ? 'Waitlist' : (cl.spots_left + ' spots')),
        h('img', { src: imgUrl(cl.image), alt: cl.class_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
      h('div', { className: 'pf-card-b' },
        h('div', { style: { display: 'flex', gap: '7px', marginBottom: '8px', flexWrap: 'wrap' } },
          h('span', { className: 'pf-chip' }, (CAT_ICON[cl.category] || '') + ' ' + cl.category),
          h('span', { className: 'pf-badge', style: { background: statusColor(cl.intensity), fontSize: '10px' } }, cl.intensity)),
        h('h3', null, cl.class_name),
        h('div', { className: 'pf-meta' }, cl.day_time + ' · ' + (cl.duration_min || 45) + ' min'),
        h('div', { className: 'pf-meta' }, '👟 ' + (cl.trainer_name || 'PulseFit') + ' · ' + (cl.club_name || '')),
        h('div', { style: { marginTop: 'auto', paddingTop: '12px' } },
          h('button', { className: cls('pf-btn pf-btn-sm', full ? 'pf-btn-ghost' : 'pf-btn-lime'), onClick: function (e) { e.stopPropagation(); c.openClass(cl); } }, full ? 'Join waitlist' : 'Book now'))));
  }

  function TrainerCard(props) {
    var t = props.t, c = props.ctx;
    return h('div', { className: 'pf-tcard', onClick: function () { c.navigate('#/classes?category=' + encodeURIComponent(t.specialty)); } },
      h('div', { className: 'pf-tcard-img' }, h('img', { src: imgUrl(t.photo), alt: t.full_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
      h('div', { style: { padding: '16px 16px 0' } },
        h('span', { className: 'pf-chip' }, (CAT_ICON[t.specialty] || '') + ' ' + t.specialty),
        h('h3', { className: 'cond', style: { fontFamily: 'Archivo', fontWeight: 800, fontSize: '19px', margin: '10px 0 0' } }, t.full_name),
        h('div', { className: 'pf-meta', style: { marginTop: '4px' } }, '★ ' + (t.rating || '5.0') + ' · ' + (t.club_name || '')),
        t.certifications ? h('div', { className: 'pf-mut', style: { fontSize: '12px', marginTop: '4px' } }, t.certifications) : null,
        t.bio ? h('p', { className: 'pf-mut', style: { fontSize: '13px', marginTop: '8px', lineHeight: 1.5, padding: '0 4px' } }, t.bio) : null));
  }

  // ── Home ────────────────────────────────────────────────────────────────────
  function Home(props) {
    var c = props.ctx;
    var classes = (c.classes || []).slice().sort(bySort);
    var trainers = (c.trainers || []).slice().sort(bySort);
    return h('div', null, h(Hero, { ctx: c }),
      h('section', { className: 'pf-sec', style: { paddingBottom: '20px' } }, h('div', { className: 'pf-wrap' },
        h('div', { className: 'pf-eyebrow' }, 'Train your way'),
        h('h2', { className: 'pf-h2', style: { marginTop: '6px' } }, 'Every discipline. One pass.'),
        h('div', { className: 'pf-cats' }, CATEGORIES.map(function (cat) {
          return h('div', { key: cat, className: 'pf-catchip', onClick: function () { c.navigate('#/classes?category=' + encodeURIComponent(cat)); } }, h('span', null, CAT_ICON[cat]), cat);
        })))),
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'pf-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
          h('div', null, h('div', { className: 'pf-eyebrow' }, 'This week'), h('h2', { className: 'pf-h2', style: { marginTop: '6px' } }, 'Featured classes')),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { c.navigate('#/classes'); } }, 'All classes →')),
        c.classes === null ? h('div', { className: 'pf-empty' }, 'Loading…')
          : h('div', { className: 'pf-grid' }, classes.slice(0, 6).map(function (cl) { return h(ClassCard, { key: cl.uuid, cl: cl, ctx: c }); })))),
      h('section', { className: 'pf-sec' }, h('div', { className: 'pf-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
          h('div', null, h('div', { className: 'pf-eyebrow' }, 'Your coaches'), h('h2', { className: 'pf-h2', style: { marginTop: '6px' } }, 'Meet the team')),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { c.navigate('#/trainers'); } }, 'All trainers →')),
        c.trainers === null ? h('div', { className: 'pf-empty' }, 'Loading…')
          : h('div', { className: 'pf-grid4' }, trainers.slice(0, 4).map(function (t) { return h(TrainerCard, { key: t.uuid, t: t, ctx: c }); })))),
      h(PricingSection, { ctx: c, compact: true }),
      h('section', { className: 'pf-sec' }, h('div', { className: 'pf-wrap' },
        h('div', { className: 'pf-panel', style: { padding: '40px', textAlign: 'center', background: 'linear-gradient(120deg,#16181d,#0e0f12)' } },
          h('h2', { className: 'pf-h2', style: { fontSize: 'clamp(28px,4vw,46px)' } }, 'Stop scrolling. Start sweating.'),
          h('p', { className: 'pf-sub', style: { maxWidth: '460px', margin: '12px auto 0' } }, 'First class is on us. Join today and find your people.'),
          h('button', { className: 'pf-btn pf-btn-lime', style: { marginTop: '22px' }, onClick: function () { c.navigate('#/pricing'); } }, 'Join PulseFit')))));
  }

  // ── Clubs page ──────────────────────────────────────────────────────────────
  function ClubsPage(props) {
    var c = props.ctx; var list = (c.clubs || []).slice().sort(bySort);
    return h('div', { className: 'pf-wrap pf-sec' },
      h('div', { className: 'pf-eyebrow' }, 'Locations'),
      h('h2', { className: 'pf-h2', style: { marginTop: '6px' } }, 'Find your gym'),
      h('p', { className: 'pf-sub' }, 'Train at one or train at all — your membership travels with you.'),
      c.clubs === null ? h('div', { className: 'pf-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'pf-grid' }, list.map(function (cb) { return h(ClubCard, { key: cb.uuid, club: cb, ctx: c }); })) : h('div', { className: 'pf-empty' }, 'No clubs yet.'));
  }

  // ── Classes page (filterable) ───────────────────────────────────────────────
  function ClassesPage(props) {
    var c = props.ctx;
    var qp = new URLSearchParams((props.q || '').replace(/^\?/, ''));
    var [club, setClub] = React.useState(qp.get('club') || '');
    var [cat, setCat] = React.useState(qp.get('category') || '');
    var [day, setDay] = React.useState('');
    React.useEffect(function () { setClub(qp.get('club') || ''); setCat(qp.get('category') || ''); }, [props.q]);
    var clubs = (c.clubs || []).slice().sort(bySort);
    var list = (c.classes || []).slice().sort(bySort).filter(function (cl) {
      return (!club || cl.club_name === club) && (!cat || cl.category === cat) && (!day || dayOf(cl.day_time) === day);
    });
    return h('div', { className: 'pf-wrap pf-sec' },
      h('div', { className: 'pf-eyebrow' }, 'Schedule'),
      h('h2', { className: 'pf-h2', style: { marginTop: '6px' } }, 'Book a class'),
      h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '18px 0' } },
        h('select', { className: 'pf-input', style: { width: 'auto' }, value: club, onChange: function (e) { setClub(e.target.value); } }, h('option', { value: '' }, 'All clubs'), clubs.map(function (cb) { return h('option', { key: cb.uuid, value: cb.name }, cb.name); })),
        h('select', { className: 'pf-input', style: { width: 'auto' }, value: cat, onChange: function (e) { setCat(e.target.value); } }, h('option', { value: '' }, 'All categories'), CATEGORIES.map(function (x) { return h('option', { key: x, value: x }, x); })),
        h('select', { className: 'pf-input', style: { width: 'auto' }, value: day, onChange: function (e) { setDay(e.target.value); } }, h('option', { value: '' }, 'Any day'), DAYS.map(function (d) { return h('option', { key: d, value: d }, d); })),
        (club || cat || day) ? h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { setClub(''); setCat(''); setDay(''); } }, 'Clear') : null),
      c.classes === null ? h('div', { className: 'pf-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'pf-grid' }, list.map(function (cl) { return h(ClassCard, { key: cl.uuid, cl: cl, ctx: c }); })) : h('div', { className: 'pf-empty' }, 'No classes match — try clearing filters.'));
  }

  // ── Trainers page ───────────────────────────────────────────────────────────
  function TrainersPage(props) {
    var c = props.ctx;
    var qp = new URLSearchParams((props.q || '').replace(/^\?/, ''));
    var [cat, setCat] = React.useState(qp.get('category') || '');
    var list = (c.trainers || []).slice().sort(bySort).filter(function (t) { return !cat || t.specialty === cat; });
    return h('div', { className: 'pf-wrap pf-sec' },
      h('div', { className: 'pf-eyebrow' }, 'The team'),
      h('h2', { className: 'pf-h2', style: { marginTop: '6px' } }, 'Our coaches'),
      h('div', { className: 'pf-cats' },
        h('div', { className: cls('pf-catchip', !cat && 'on'), onClick: function () { setCat(''); } }, 'All'),
        CATEGORIES.map(function (x) { return h('div', { key: x, className: cls('pf-catchip', cat === x && 'on'), onClick: function () { setCat(x); } }, h('span', null, CAT_ICON[x]), x); })),
      c.trainers === null ? h('div', { className: 'pf-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'pf-grid4' }, list.map(function (t) { return h(TrainerCard, { key: t.uuid, t: t, ctx: c }); })) : h('div', { className: 'pf-empty' }, 'No coaches in this specialty.'));
  }

  // ── Pricing ─────────────────────────────────────────────────────────────────
  function PricingSection(props) {
    var c = props.ctx;
    function join(plan) {
      if (services && services.stripe && services.stripe.checkout) {
        services.stripe.checkout({ amount: plan.price, product: 'PulseFit ' + plan.name, successUrl: window.location.href })
          .then(function (r) { if (r && r.url) { window.location.href = r.url; return; } throw 0; })
          .catch(function () { c.startJoin(plan); });
      } else { c.startJoin(plan); }
    }
    return h('section', { className: 'pf-sec', id: 'pricing' }, h('div', { className: 'pf-wrap' },
      h('div', { style: { textAlign: 'center' } },
        h('div', { className: 'pf-eyebrow' }, 'Membership'),
        h('h2', { className: 'pf-h2', style: { marginTop: '6px' } }, 'Pick your pace'),
        h('p', { className: 'pf-sub', style: { maxWidth: '480px', margin: '8px auto 0' } }, 'No contracts. Freeze anytime. Every plan unlocks the bold.')),
      h('div', { className: 'pf-plans' }, PLANS.map(function (p) {
        return h('div', { key: p.name, className: cls('pf-plan', p.hot && 'hot') },
          h('span', { className: 'pf-chip', style: p.hot ? { background: 'var(--lime)', color: '#0a0a0b' } : null }, p.tag),
          h('h3', { className: 'cond' }, p.name),
          h('div', { className: 'price' }, money(p.price), h('span', null, ' ' + p.period)),
          h('div', { style: { margin: '14px 0', flex: 1 } }, p.feats.map(function (f, i) { return h('div', { key: i, className: 'pf-feat' }, h('b', null, '✓'), f); })),
          h('button', { className: cls('pf-btn', p.hot ? 'pf-btn-lime' : 'pf-btn-dark'), style: { width: '100%' }, onClick: function () { join(p); } }, 'Choose ' + p.name));
      }))));
  }

  function JoinModal(props) {
    var c = props.ctx; var plan = props.plan;
    var u = client.userInfo || {};
    var [f, setF] = React.useState({ full_name: u.fullName || '', email: u.email || '', phone: '', home_club: (c.clubs && c.clubs[0] && c.clubs[0].name) || '' });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function submit(e) {
      e.preventDefault(); if (!c.authed) { showToast('Sign in to complete your membership', 'info'); c.openLogin(); return; }
      setBusy(true);
      var rec = { full_name: f.full_name, email: f.email, phone: f.phone, home_club: f.home_club, plan: plan.name,
        member_state: 'active', join_date: new Date().toISOString().slice(0, 10), owner_username: u.email || f.email,
        display_name: f.full_name || 'Member', description: plan.name + ' · ' + f.home_club };
      client.createObject('member', rec).then(function () { setBusy(false); showToast('Welcome to PulseFit! 💪 Your ' + plan.name + ' membership is live.', 'success'); props.onClose(); c.navigate('#/me'); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'pf-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('form', { className: 'pf-sheet', style: { padding: '30px' }, onSubmit: submit }, h('button', { type: 'button', className: 'pf-x', onClick: props.onClose }, '×'),
        h('div', { className: 'pf-eyebrow' }, 'Join PulseFit'),
        h('h2', { className: 'pf-h2', style: { fontSize: '26px', marginTop: '6px' } }, plan.name + ' — ' + money(plan.price) + ' ' + plan.period),
        !c.authed ? h('div', { className: 'pf-mut', style: { marginTop: '8px' } }, 'Fill this in — you\'ll sign in to finish.') : null,
        h(Field, { label: 'Full name', req: true, children: h('input', { className: 'pf-input', required: true, value: f.full_name, onChange: function (e) { set('full_name', e.target.value); } }) }),
        h(Field, { label: 'Email', req: true, children: h('input', { className: 'pf-input', type: 'email', required: true, value: f.email, onChange: function (e) { set('email', e.target.value); } }) }),
        h(Field, { label: 'Phone', children: h('input', { className: 'pf-input', value: f.phone, onChange: function (e) { set('phone', e.target.value); } }) }),
        h(Field, { label: 'Home club', children: h('select', { className: 'pf-input', value: f.home_club, onChange: function (e) { set('home_club', e.target.value); } }, (c.clubs || []).map(function (cb) { return h('option', { key: cb.uuid, value: cb.name }, cb.name); })) }),
        h('button', { className: 'pf-btn pf-btn-lime', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Joining…' : (c.authed ? 'Activate membership' : 'Sign in & join')),
        h('p', { className: 'pf-mut', style: { marginTop: '10px', textAlign: 'center', fontSize: '12px' } }, 'Secure checkout · cancel anytime')));
  }

  // ── Book class modal ────────────────────────────────────────────────────────
  function BookModal(props) {
    var c = props.ctx; var cl = props.cl; var u = client.userInfo || {};
    var [busy, setBusy] = React.useState(false);
    var full = (cl.spots_left || 0) <= 0;
    function book() {
      if (!c.authed) { showToast('Sign in to book', 'info'); c.openLogin(); return; }
      setBusy(true);
      var rec = { class_name: cl.class_name, member_name: u.fullName || 'Member', member_email: u.email || '',
        club_name: cl.club_name, day_time: cl.day_time, booking_state: full ? 'waitlist' : 'booked',
        owner_username: u.email || '', display_name: cl.class_name + ' — ' + cl.day_time, description: cl.club_name + ' · ' + (full ? 'waitlist' : 'booked') };
      client.createObject('class_booking', rec).then(function () {
        if (!full && cl.uuid) { client.updateObject('class_offering', cl.uuid, { spots_left: Math.max(0, (cl.spots_left || 1) - 1) }, cl).then(function () { c.reload(); }).catch(function () {}); }
        setBusy(false); showToast(full ? 'Added to the waitlist — we\'ll text you if a spot opens.' : 'Booked! See you at ' + cl.club_name + ' 🔥', 'success'); props.onClose(); c.navigate('#/me');
      }).catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'pf-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'pf-sheet', style: { maxWidth: '480px' } }, h('button', { className: 'pf-x', onClick: props.onClose }, '×'),
        h('div', { className: 'pf-card-img', style: { height: '180px' } }, h('img', { src: imgUrl(cl.image), alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } })),
        h('div', { style: { padding: '24px' } },
          h('span', { className: 'pf-chip' }, (CAT_ICON[cl.category] || '') + ' ' + cl.category),
          h('h2', { className: 'pf-h2', style: { fontSize: '28px', marginTop: '10px' } }, cl.class_name),
          h('div', { className: 'pf-mut', style: { marginTop: '8px', lineHeight: 1.7 } },
            h('div', null, '📅 ' + cl.day_time + ' · ' + (cl.duration_min || 45) + ' min'),
            h('div', null, '👟 ' + (cl.trainer_name || 'PulseFit') + ' · ' + (cl.club_name || '')),
            h('div', null, '⚡ Intensity: ' + (cl.intensity || 'Medium') + ' · ' + (full ? 'Class full — waitlist open' : cl.spots_left + ' spots left'))),
          h('button', { className: cls('pf-btn', full ? 'pf-btn-ghost' : 'pf-btn-lime'), disabled: busy, style: { width: '100%', marginTop: '20px' }, onClick: book }, busy ? 'Working…' : (full ? 'Join waitlist' : 'Confirm booking')))));
  }

  // ── Member portal ───────────────────────────────────────────────────────────
  function MemberPortal(props) {
    var c = props.ctx; var sub = props.seg[1] || 'classes';
    var [bookings, setBookings] = React.useState(null); var [me, setMe] = React.useState(null);
    function load() {
      client.getObjects('class_booking').then(function (r) { setBookings(arr(r)); }).catch(function () { setBookings([]); });
      client.getObjects('member').then(function (r) { setMe(arr(r)[0] || null); }).catch(function () { setMe(null); });
    }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'pf-wrap pf-sec' }, h('div', { className: 'pf-empty' }, h('h2', { className: 'pf-h2' }, 'Sign in to your portal'), h('button', { className: 'pf-btn pf-btn-lime', style: { marginTop: '16px' }, onClick: c.openLogin }, 'Sign in')));
    var tabs = [['classes', 'Book classes'], ['bookings', 'My bookings'], ['membership', 'My membership']];
    function cancel(b) { client.updateObject('class_booking', b.uuid, { booking_state: 'cancelled' }, b).then(function () { showToast('Booking cancelled', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    return h('div', { className: 'pf-wrap pf-sec' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
        h('h2', { className: 'pf-h2' }, 'My PulseFit'),
        h('div', { className: 'pf-tabs', style: { marginLeft: 'auto' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('pf-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/me/' + t[0]); } }, t[1]); }))),
      sub === 'classes' ? h('div', { style: { marginTop: '20px' } },
        (c.classes || []).length ? h('div', { className: 'pf-grid' }, (c.classes || []).slice().sort(bySort).map(function (cl) { return h(ClassCard, { key: cl.uuid, cl: cl, ctx: c }); })) : h('div', { className: 'pf-empty' }, 'No classes available.')) : null,
      sub === 'bookings' ? h('div', { style: { marginTop: '20px' } },
        h('div', { className: 'pf-panel' }, bookings === null ? h('div', { className: 'pf-row pf-mut' }, 'Loading…')
          : bookings.length ? bookings.slice().sort(function (a, b) { return (a.day_time || '').localeCompare(b.day_time || ''); }).map(function (b) {
            return h('div', { key: b.uuid, className: 'pf-row' },
              h('div', { className: 'pf-grow' }, h('div', { style: { fontWeight: 700 } }, b.class_name), h('div', { className: 'pf-mut' }, b.day_time + ' · ' + (b.club_name || ''))),
              h(Badge, { s: b.booking_state }),
              ['booked', 'waitlist'].indexOf(b.booking_state) >= 0 ? h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { cancel(b); } }, 'Cancel') : null);
          }) : h('div', { className: 'pf-empty' }, h('p', null, 'No bookings yet.'), h('button', { className: 'pf-btn pf-btn-lime', style: { marginTop: '12px' }, onClick: function () { c.navigate('#/me/classes'); } }, 'Book a class')))) : null,
      sub === 'membership' ? h('div', { style: { marginTop: '20px' } },
        me ? h('div', { className: 'pf-panel', style: { padding: '26px', maxWidth: '520px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
            h('div', { style: { width: '56px', height: '56px', borderRadius: '14px', background: 'var(--lime)', color: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Archivo', fontWeight: 900, fontSize: '24px' } }, (me.full_name || '?').charAt(0)),
            h('div', null, h('div', { className: 'cond', style: { fontFamily: 'Archivo', fontWeight: 800, fontSize: '22px' } }, me.full_name), h('div', { className: 'pf-mut' }, me.email))),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '20px' } },
            h('div', null, h('div', { className: 'pf-stat-l' }, 'Plan'), h('div', { style: { fontFamily: 'Archivo', fontWeight: 800, fontSize: '20px', marginTop: '4px' } }, me.plan || '—')),
            h('div', null, h('div', { className: 'pf-stat-l' }, 'Home club'), h('div', { style: { fontWeight: 700, marginTop: '4px' } }, me.home_club || '—')),
            h('div', null, h('div', { className: 'pf-stat-l' }, 'Status'), h('div', { style: { marginTop: '6px' } }, h(Badge, { s: me.member_state }))),
            h('div', null, h('div', { className: 'pf-stat-l' }, 'Member since'), h('div', { style: { fontWeight: 700, marginTop: '4px' } }, me.join_date || '—'))),
          h('button', { className: 'pf-btn pf-btn-ghost', style: { marginTop: '20px' }, onClick: function () { c.navigate('#/pricing'); } }, 'Upgrade plan'))
          : h('div', { className: 'pf-empty' }, h('p', null, 'No membership on file yet.'), h('button', { className: 'pf-btn pf-btn-lime', style: { marginTop: '12px' }, onClick: function () { c.navigate('#/pricing'); } }, 'Join PulseFit'))) : null);
  }

  // ── Club console (admin) ────────────────────────────────────────────────────
  function CStat(p) { return h('div', { className: 'pf-stat' }, h('div', { className: 'pf-stat-n', style: { color: p.color || 'var(--lime)' } }, p.n), h('div', { className: 'pf-stat-l' }, p.l)); }

  function AttendanceChart(props) {
    var data = props.data || [];
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    return h('div', { className: 'pf-panel', style: { padding: '22px' } },
      h('div', { className: 'pf-eyebrow' }, props.title || 'By club'),
      h('div', { className: 'pf-bars' }, data.map(function (d) {
        return h('div', { key: d.label, className: 'pf-bar-col' },
          h('div', { className: 'pf-bar-v' }, d.value),
          h('div', { className: 'pf-bar', style: { height: (8 + (d.value / max) * 130) + 'px' } }),
          h('div', { className: 'pf-bar-l' }, d.label));
      })));
  }

  function ConsoleDash(props) {
    var c = props.ctx;
    var [bookings, setBookings] = React.useState([]); var [members, setMembers] = React.useState([]);
    React.useEffect(function () {
      client.getObjects('class_booking').then(function (r) { setBookings(arr(r)); }).catch(function () {});
      client.getObjects('member').then(function (r) { setMembers(arr(r)); }).catch(function () {});
    }, []);
    var classes = c.classes || []; var clubs = (c.clubs || []).slice().sort(bySort);
    var activeMembers = members.filter(function (m) { return m.member_state === 'active'; }).length;
    var todayBookings = bookings.filter(function (b) { return b.booking_state === 'booked'; }).length;
    var clubFilter = c.clubFilter;
    var shownClasses = classes.filter(function (cl) { return !clubFilter || cl.club_name === clubFilter; }).sort(bySort);
    // attendance chart: bookings per club
    var chartData = clubs.map(function (cb) {
      return { label: (cb.name || '').replace('PulseFit ', ''), value: bookings.filter(function (b) { return b.club_name === cb.name; }).length };
    });
    return h('div', null,
      h('div', { className: 'pf-stats' },
        h(CStat, { n: shownClasses.length, l: clubFilter ? 'Classes · ' + clubFilter.replace('PulseFit ', '') : "Today's classes" }),
        h(CStat, { n: todayBookings, l: 'Active bookings', color: '#84cc16' }),
        h(CStat, { n: activeMembers, l: 'Active members', color: '#38bdf8' }),
        h(CStat, { n: (c.trainers || []).length, l: 'Coaches', color: '#f59e0b' })),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '18px' } },
        h(AttendanceChart, { title: 'Bookings by club', data: chartData }),
        h('div', { className: 'pf-panel', style: { padding: '22px' } },
          h('div', { className: 'pf-eyebrow' }, 'Upcoming classes'),
          h('div', { style: { marginTop: '12px' } }, shownClasses.slice(0, 6).map(function (cl) {
            return h('div', { key: cl.uuid, className: 'pf-row', style: { padding: '11px 0' } },
              h('div', { className: 'pf-grow' }, h('div', { style: { fontWeight: 700, fontSize: '14px' } }, cl.class_name), h('div', { className: 'pf-mut' }, cl.day_time + ' · ' + (cl.trainer_name || ''))),
              h('span', { className: 'pf-badge', style: { background: statusColor(cl.intensity) } }, cl.intensity));
          })))));
  }

  // generic admin CRUD list + edit modal
  function AdminEditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; if (fd.k === 'image_url') v = imgUrl(init.image || init.photo); f[fd.k] = (v == null) ? (fd.def != null ? fd.def : '') : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {}; fields.forEach(function (fd) { var v = form[fd.k];
        if (v === '' || v == null) { if (fd.req) {} return; } if (fd.type === 'number') v = Number(v);
        if (fd.k === 'image_url') { data[props.imageField || 'image'] = { url: v, thumbnail_url: v }; return; } data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'pf-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'pf-sheet', style: { padding: '28px' } }, h('button', { className: 'pf-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'pf-h2', style: { fontSize: '24px' } }, init.uuid ? props.editTitle : props.newTitle),
        fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'pf-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'pf-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else input = h('input', { className: 'pf-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h(Field, { key: fd.k, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'pf-btn pf-btn-lime', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'pf-btn pf-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  var CLASS_FIELDS = [
    { k: 'class_name', label: 'Class name', req: true }, { k: 'category', label: 'Category', type: 'select', opts: CATEGORIES },
    { k: 'trainer_name', label: 'Trainer' }, { k: 'club_name', label: 'Club' }, { k: 'day_time', label: 'Day & time (e.g. Mon · 6:00 AM)' },
    { k: 'duration_min', label: 'Duration (min)', type: 'number' }, { k: 'capacity', label: 'Capacity', type: 'number' },
    { k: 'spots_left', label: 'Spots left', type: 'number' }, { k: 'intensity', label: 'Intensity', type: 'select', opts: INTENSITIES }, { k: 'image_url', label: 'Image URL' }
  ];
  var TRAINER_FIELDS = [
    { k: 'full_name', label: 'Full name', req: true }, { k: 'specialty', label: 'Specialty', type: 'select', opts: CATEGORIES },
    { k: 'club_name', label: 'Club' }, { k: 'certifications', label: 'Certifications' }, { k: 'rating', label: 'Rating', type: 'number' },
    { k: 'image_url', label: 'Photo URL' }, { k: 'bio', label: 'Bio', type: 'textarea' }
  ];
  var CLUB_FIELDS = [
    { k: 'name', label: 'Club name', req: true }, { k: 'neighborhood', label: 'Neighborhood' }, { k: 'address', label: 'Address' },
    { k: 'phone', label: 'Phone' }, { k: 'hours', label: 'Hours' }, { k: 'amenities', label: 'Amenities', type: 'textarea' }, { k: 'image_url', label: 'Image URL' }
  ];

  function ConsoleSchedule(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.classes || []).slice().sort(bySort).filter(function (cl) { return !c.clubFilter || cl.club_name === c.clubFilter; });
    function del(cl) { if (!window.confirm('Remove ' + cl.class_name + '?')) return; client.deleteObject('class_offering', cl.uuid, cl).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function () {}); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '14px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' classes'),
        h('button', { className: 'pf-btn pf-btn-lime pf-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({ club_name: c.clubFilter || '', intensity: 'Medium', booking_state: '' }); } }, '+ New class')),
      h('div', { className: 'pf-panel' }, list.map(function (cl) {
        return h('div', { key: cl.uuid, className: 'pf-row' },
          h('div', { style: { width: '46px', height: '46px', borderRadius: '10px', overflow: 'hidden', flex: 'none', background: 'var(--card2)' } }, h('img', { src: imgUrl(cl.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'pf-grow' }, h('div', { style: { fontWeight: 700 } }, cl.class_name), h('div', { className: 'pf-mut' }, cl.category + ' · ' + cl.day_time + ' · ' + (cl.club_name || '') + ' · ' + (cl.spots_left || 0) + '/' + (cl.capacity || 0) + ' open')),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { setEdit(cl); } }, 'Edit'),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { del(cl); } }, '✕'));
      })),
      edit !== null ? h(AdminEditModal, { schema: 'class_offering', fields: CLASS_FIELDS, initial: edit, imageField: 'image', newTitle: 'New class', editTitle: 'Edit class',
        beforeSave: function (d) { d.display_name = d.class_name || 'Class'; d.description = (d.category || '') + ' · ' + (d.club_name || ''); }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function ConsoleTrainers(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.trainers || []).slice().sort(bySort).filter(function (t) { return !c.clubFilter || t.club_name === c.clubFilter; });
    function del(t) { if (!window.confirm('Remove ' + t.full_name + '?')) return; client.deleteObject('trainer', t.uuid, t).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function () {}); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '14px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' coaches'),
        h('button', { className: 'pf-btn pf-btn-lime pf-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({ club_name: c.clubFilter || '' }); } }, '+ Add coach')),
      h('div', { className: 'pf-panel' }, list.map(function (t) {
        return h('div', { key: t.uuid, className: 'pf-row' },
          h('div', { style: { width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', flex: 'none', background: 'var(--card2)' } }, h('img', { src: imgUrl(t.photo), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'pf-grow' }, h('div', { style: { fontWeight: 700 } }, t.full_name), h('div', { className: 'pf-mut' }, t.specialty + ' · ★ ' + (t.rating || '5.0') + ' · ' + (t.club_name || ''))),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { setEdit(t); } }, 'Edit'),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { del(t); } }, '✕'));
      })),
      edit !== null ? h(AdminEditModal, { schema: 'trainer', fields: TRAINER_FIELDS, initial: edit, imageField: 'photo', newTitle: 'Add coach', editTitle: 'Edit coach',
        beforeSave: function (d) { d.display_name = d.full_name || 'Coach'; d.description = (d.specialty || '') + ' · ' + (d.club_name || ''); }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function ConsoleClubs(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.clubs || []).slice().sort(bySort);
    function del(cb) { if (!window.confirm('Remove ' + cb.name + '?')) return; client.deleteObject('club', cb.uuid, cb).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function () {}); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '14px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' clubs'),
        h('button', { className: 'pf-btn pf-btn-lime pf-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add club')),
      h('div', { className: 'pf-panel' }, list.map(function (cb) {
        return h('div', { key: cb.uuid, className: 'pf-row' },
          h('div', { style: { width: '46px', height: '46px', borderRadius: '10px', overflow: 'hidden', flex: 'none', background: 'var(--card2)' } }, h('img', { src: imgUrl(cb.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'pf-grow' }, h('div', { style: { fontWeight: 700 } }, cb.name), h('div', { className: 'pf-mut' }, (cb.neighborhood || '') + ' · ' + (cb.address || ''))),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { setEdit(cb); } }, 'Edit'),
          h('button', { className: 'pf-btn pf-btn-ghost pf-btn-sm', onClick: function () { del(cb); } }, '✕'));
      })),
      edit !== null ? h(AdminEditModal, { schema: 'club', fields: CLUB_FIELDS, initial: edit, imageField: 'image', newTitle: 'Add club', editTitle: 'Edit club',
        beforeSave: function (d) { d.display_name = d.name || 'Club'; d.description = (d.neighborhood || '') + ' · ' + (d.address || ''); }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function ConsoleMembers(props) {
    var c = props.ctx; var [members, setMembers] = React.useState(null); var [fState, setFState] = React.useState('all');
    function load() { client.getObjects('member').then(function (r) { setMembers(arr(r)); }).catch(function () { setMembers([]); }); }
    React.useEffect(load, []);
    var list = (members || []).filter(function (m) { return (fState === 'all' || m.member_state === fState) && (!c.clubFilter || m.home_club === c.clubFilter); });
    return h('div', null,
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' } },
        h('button', { className: cls('pf-btn pf-btn-sm', fState === 'all' ? 'pf-btn-lime' : 'pf-btn-ghost'), onClick: function () { setFState('all'); } }, 'All'),
        MEMBER_STATES.map(function (s) { return h('button', { key: s, className: cls('pf-btn pf-btn-sm', fState === s ? 'pf-btn-lime' : 'pf-btn-ghost'), onClick: function () { setFState(s); } }, s); })),
      h('div', { className: 'pf-panel' }, members === null ? h('div', { className: 'pf-row pf-mut' }, 'Loading…')
        : list.length ? list.map(function (m) {
          return h('div', { key: m.uuid, className: 'pf-row' },
            h('div', { style: { width: '42px', height: '42px', borderRadius: '50%', background: 'var(--lime)', color: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flex: 'none' } }, (m.full_name || '?').charAt(0)),
            h('div', { className: 'pf-grow' }, h('div', { style: { fontWeight: 700 } }, m.full_name), h('div', { className: 'pf-mut' }, m.email + ' · ' + (m.home_club || ''))),
            h('span', { className: 'pf-chip' }, m.plan || '—'),
            h(Badge, { s: m.member_state }));
        }) : h('div', { className: 'pf-empty' }, 'No members match.')));
  }

  function ClubConsole(props) {
    var c = props.ctx; var sub = props.seg[1] || 'dash';
    var clubs = (c.clubs || []).slice().sort(bySort);
    var tabs = [['dash', 'Dashboard'], ['schedule', 'Schedule'], ['members', 'Members'], ['trainers', 'Trainers'], ['clubs', 'Clubs']];
    return h('div', { className: 'pf' },
      h('div', { style: { background: 'var(--ink)', borderBottom: '1px solid var(--line)' } }, h('div', { className: 'pf-wrap', style: { display: 'flex', alignItems: 'center', height: '64px', gap: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'pf-logo', onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot' }, '⚡'), 'Pulse', h('b', null, 'Fit'), h('span', { style: { color: 'var(--muted)', fontWeight: 600, fontSize: '13px', marginLeft: '6px' } }, 'Console')),
        h('div', { className: 'pf-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('pf-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/console' + (t[0] === 'dash' ? '' : '/' + t[0])); } }, t[1]); })),
        // CLUB SWITCHER (multi-location)
        h('select', { className: 'pf-input', style: { width: 'auto', marginLeft: 'auto', padding: '9px 12px' }, value: c.clubFilter || '', onChange: function (e) { c.setClubFilter(e.target.value); } },
          h('option', { value: '' }, 'All clubs'), clubs.map(function (cb) { return h('option', { key: cb.uuid, value: cb.name }, cb.name); })),
        h('button', { className: 'pf-ibtn', onClick: function () { c.navigate('#/'); } }, 'Public site ↗'))),
      h('div', { className: 'pf-wrap', style: { padding: '26px 24px 70px' } },
        sub === 'dash' ? h(ConsoleDash, { ctx: c }) : sub === 'schedule' ? h(ConsoleSchedule, { ctx: c })
          : sub === 'members' ? h(ConsoleMembers, { ctx: c }) : sub === 'trainers' ? h(ConsoleTrainers, { ctx: c }) : h(ConsoleClubs, { ctx: c })));
  }

  function Footer() { return h('footer', { className: 'pf-foot' }, h('div', { className: 'pf-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center' } }, h('div', null, h('b', null, 'PulseFit'), ' — ' + BRAND.tagline), h('div', null, 'Clubs · Classes · Trainers · Membership'))); }

  // ── App ─────────────────────────────────────────────────────────────────────
  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [joinPlan, setJoinPlan] = React.useState(null);
    var [openCl, setOpenCl] = React.useState(null);
    var [clubFilter, setClubFilter] = React.useState('');
    var [clubs, setClubs] = React.useState(null); var [classes, setClasses] = React.useState(null); var [trainers, setTrainers] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() {
      client.getObjects('club').then(function (r) { setClubs(arr(r)); }).catch(function () { setClubs([]); });
      client.getObjects('class_offering').then(function (r) { setClasses(arr(r)); }).catch(function () { setClasses([]); });
      client.getObjects('trainer').then(function (r) { setTrainers(arr(r)); }).catch(function () { setTrainers([]); });
    }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, clubs: clubs, classes: classes, trainers: trainers, reload: reload,
      clubFilter: clubFilter, setClubFilter: setClubFilter,
      startJoin: function (plan) { setJoinPlan(plan); }, openClass: function (cl) { setOpenCl(cl); } };

    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var q = qi >= 0 ? hash.slice(qi) : ''; var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';

    var overlays = [
      showLogin ? h(LoginScreen, { key: 'login', onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); setAuthed(true); } }) : null,
      joinPlan ? h(JoinModal, { key: 'join', ctx: ctx, plan: joinPlan, onClose: function () { setJoinPlan(null); } }) : null,
      openCl ? h(BookModal, { key: 'book', ctx: ctx, cl: openCl, onClose: function () { setOpenCl(null); } }) : null
    ];

    if (top === 'console' && ctx.isAdmin) return h(ErrorBoundary, null, h(ClubConsole, { ctx: ctx, seg: seg }), overlays);

    var page;
    if (top === 'clubs') page = h(ClubsPage, { ctx: ctx });
    else if (top === 'classes') page = h(ClassesPage, { ctx: ctx, q: q });
    else if (top === 'trainers') page = h(TrainersPage, { ctx: ctx, q: q });
    else if (top === 'pricing') page = h('div', null, h(PricingSection, { ctx: ctx }));
    else if (top === 'me') page = h(MemberPortal, { ctx: ctx, seg: seg });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'pf' }, h(TopBar, { ctx: ctx }), page, h(Footer, null), overlays));
  }

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
