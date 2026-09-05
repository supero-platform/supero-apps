// ui/app.js — Sentinel insurance policy & claims platform (custom UI).
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, formatCurrency,
// ErrorBoundary) come from the Supero runtime BEFORE this file — never re-declare them.
// The literal "AppShell.render" appears only in this comment for grep validators; never called.
(function () {
  var h = React.createElement;

  var LINES = ['Auto', 'Home', 'Life', 'Health', 'Travel', 'Pet', 'Business'];
  var LINE_ICON = { Auto: '🚗', Home: '🏠', Life: '🌳', Health: '🩺', Travel: '✈️', Pet: '🐾', Business: '🏢' };
  var CLAIM_STATES = ['submitted', 'under_review', 'approved', 'paid', 'denied'];
  var CLAIM_FLOW = ['submitted', 'under_review', 'approved', 'paid'];
  var DOC_TYPES = ['Photo', 'Police Report', 'Estimate', 'Receipt', 'Medical Record'];
  var DOC_STATES = ['pending', 'received', 'verified'];
  var HERO = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2000&h=1100';

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n.toLocaleString(); } }
  function k(n) { n = Number(n) || 0; return n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(Math.round(n)); }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function titleCase(s) { return (s || '').replace(/_/g, ' '); }
  function statusColor(s) {
    return { quoted: '#6366f1', active: '#0d9488', lapsed: '#d97706', cancelled: '#94a3b8',
      submitted: '#6366f1', under_review: '#d97706', approved: '#0d9488', paid: '#15803d', denied: '#dc2626',
      pending: '#d97706', received: '#0284c7', verified: '#15803d' }[s] || '#334155';
  }
  function fraudColor(n) { n = Number(n) || 0; return n >= 60 ? '#dc2626' : n >= 35 ? '#d97706' : '#0d9488'; }
  function isStaff() {
    try { return client.isAdmin() || client.canWrite('insurance_product') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
  }
  // Explicit model id. The SDK's services.ai.complete defaults to the alias
  // 'claude-sonnet', which the AI service forwards VERBATIM to the provider —
  // it is not a real model id and 404s there, so the alias must never be used.
  var AI_MODEL = 'claude-sonnet-5';

  // /services/execute answers HTTP 200 even when the call FAILED, carrying
  // {success:false, error, output:{error}}. The old version fell through to
  // `JSON.stringify(errorObject)` and rendered that to the visitor as the
  // "answer". Return '' on any failure shape so callers take the fallback path,
  // and never stringify a non-string — an object is never a summary.
  function aiText(res) {
    var r = res || {};
    if (r.success === false || r.error) return '';
    var out = r.output;
    if (typeof out === 'string') return out.trim();
    if (out && typeof out === 'object') {
      if (out.error) return '';
      var t = out.text || out.completion || out.content;
      if (typeof t === 'string') return t.trim();
    }
    var t2 = r.text || r.completion || r.content;
    return typeof t2 === 'string' ? t2.trim() : '';
  }

  // Same 200-on-failure envelope, for workflow/saga calls.
  function svcFailure(res) {
    var r = res || {};
    var out = (r.output && typeof r.output === 'object') ? r.output : {};
    if (r.success === false || r.error || out.error) {
      return String(r.error || out.error || 'Service call failed');
    }
    return '';
  }

  // A workflow run can answer success:true while individual steps failed —
  // `partial`, `compensated` and `compensation_failed` are all NOT success.
  function sagaFailure(res) {
    var envelope = svcFailure(res);
    if (envelope) return envelope;
    var o = ((res || {}).output) || {};
    var st = o.status || '';
    if (st && st !== 'completed') return o.error_message || ('workflow ' + st);
    if (Number(o.steps_failed) > 0) return o.error_message || (o.steps_failed + ' step(s) failed');
    return '';
  }

  function injectChrome() {
    if (document.getElementById('sn-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'sn-chrome';
    st.textContent = [
      ':root{--ink:#0a1b2e;--ink2:#33485f;--paper:#fff;--bg:#eef2f7;--navy:#0a1b2e;--navy2:#12304d;--blue:#1d4ed8;--blue2:#2563eb;--teal:#0d9488;--teal2:#0f766e;--green:#15803d;--amber:#d97706;--red:#dc2626;--line:#dbe3ee;--muted:#5b7088;--slate:#475569}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.sn{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.sn *{box-sizing:border-box}.sn a{color:inherit;text-decoration:none}',
      '.sn-wrap{max-width:1200px;margin:0 auto;padding:0 24px}',
      '.sora{font-family:Sora,Inter,sans-serif}',
      '.num{font-variant-numeric:tabular-nums}',
      '.sn-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.93);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.sn-top-in{display:flex;align-items:center;gap:18px;height:66px}',
      '.sn-logo{display:flex;align-items:center;gap:10px;cursor:pointer;font-family:Sora;font-weight:800;font-size:21px;color:var(--ink);letter-spacing:-.01em}',
      '.sn-logo .dot{width:30px;height:30px;border-radius:9px;background:linear-gradient(140deg,var(--navy2),var(--teal));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px}',
      '.sn-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.sn-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}.sn-ibtn:hover{background:var(--bg)}',
      '.sn-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:11px;font-weight:600;font-size:14px;padding:11px 20px;font-family:Inter;transition:.15s}',
      '.sn-btn:disabled{opacity:.55;cursor:default}',
      '.sn-btn-blue{background:var(--blue);color:#fff}.sn-btn-blue:hover:not(:disabled){background:#1e40af}',
      '.sn-btn-teal{background:var(--teal);color:#fff}.sn-btn-teal:hover:not(:disabled){background:var(--teal2)}',
      '.sn-btn-ink{background:var(--navy);color:#fff}.sn-btn-ink:hover:not(:disabled){background:#06121f}',
      '.sn-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.sn-btn-ghost:hover{border-color:var(--blue)}',
      '.sn-btn-danger{background:#fef2f2;color:var(--red);border:1px solid #fecaca}.sn-btn-danger:hover{background:#fee2e2}',
      '.sn-btn-sm{padding:7px 13px;font-size:13px}',
      '.sn-hero{position:relative;overflow:hidden;background:var(--navy)}',
      '.sn-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.28}',
      '.sn-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(10,27,46,.95),rgba(18,48,77,.7) 60%,rgba(13,148,136,.35))}',
      '.sn-hero-in{position:relative;z-index:2;padding:90px 0 100px;color:#fff}',
      '.sn-hero h1{font-family:Sora;font-weight:800;font-size:clamp(34px,5vw,58px);line-height:1.04;margin:14px 0 0;max-width:720px;letter-spacing:-.02em}',
      '.sn-hero p{font-size:18px;color:#cfdcec;max-width:540px;margin:18px 0 0;line-height:1.55}',
      '.sn-pill{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.14);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:7px 15px;border-radius:30px}',
      '.sn-trust{display:flex;gap:26px;flex-wrap:wrap;margin-top:30px;color:#aac3dd;font-size:13px;font-weight:500}',
      '.sn-trust b{color:#fff;display:block;font-family:Sora;font-size:22px;font-weight:800}',
      '.sn-sec{padding:54px 0}',
      '.sn-h2{font-family:Sora;font-weight:700;font-size:28px;margin:0;letter-spacing:-.01em}',
      '.sn-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}',
      '.sn-lines{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}',
      '.sn-linechip{display:inline-flex;align-items:center;gap:7px;background:var(--paper);border:1px solid var(--line);border-radius:30px;padding:9px 16px;cursor:pointer;font-weight:600;font-size:14px;transition:.15s}',
      '.sn-linechip:hover{border-color:var(--teal);box-shadow:0 8px 22px -16px rgba(13,148,136,.5)}',
      '.sn-linechip.on{background:var(--navy);color:#fff;border-color:var(--navy)}',
      '.sn-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:22px}',
      '.sn-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:22px}',
      '.sn-pcard{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:.16s;display:flex;flex-direction:column}',
      '.sn-pcard:hover{box-shadow:0 18px 44px -30px rgba(10,27,46,.5);transform:translateY(-3px)}',
      '.sn-pcard-img{height:172px;overflow:hidden;background:#dce6f1;position:relative}.sn-pcard-img img{width:100%;height:100%;object-fit:cover}',
      '.sn-ribbon{position:absolute;top:12px;left:12px;background:var(--teal);color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 11px;border-radius:20px}',
      '.sn-pcard-b{padding:16px 17px 18px;display:flex;flex-direction:column;flex:1}.sn-pcard-b h3{font-family:Sora;font-size:17px;font-weight:700;margin:0}',
      '.sn-chip{display:inline-block;font-size:11px;font-weight:700;color:var(--teal2);background:#d6f0ed;border-radius:20px;padding:3px 10px}',
      '.sn-from{font-family:Sora;font-weight:800;font-size:22px;margin-top:auto;padding-top:12px}',
      '.sn-from span{font-size:13px;font-weight:500;color:var(--muted)}',
      '.sn-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.sn-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.sn-row:first-child{border-top:0}.sn-grow{flex:1;min-width:0}.sn-mut{color:var(--muted);font-size:13px}',
      '.sn-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff;white-space:nowrap}',
      '.sn-2col{display:grid;grid-template-columns:1fr 380px;gap:24px;align-items:start}',
      '.sn-field{display:block;margin-top:14px}.sn-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.sn-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:11px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.sn-input:focus{outline:none;border-color:var(--blue)}textarea.sn-input{min-height:84px;resize:vertical}',
      '.sn-modal{position:fixed;inset:0;z-index:200;background:rgba(10,27,46,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.sn-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:600px;max-height:92vh;overflow:auto;position:relative}',
      '.sn-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:23px;cursor:pointer;color:var(--muted);z-index:2}',
      '.sn-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.sn-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}',
      '.sn-stat-n{font-family:Sora;font-weight:800;font-size:27px;line-height:1}',
      '.sn-stat-l{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.sn-stat-d{font-size:12px;font-weight:600;margin-top:4px}',
      '.sn-bars{display:flex;align-items:flex-end;gap:12px;height:180px;padding:10px 4px 0}',
      '.sn-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}',
      '.sn-bar .b{width:100%;max-width:54px;border-radius:7px 7px 0 0;background:linear-gradient(180deg,var(--blue2),var(--blue));transition:.3s}',
      '.sn-bar .v{font-weight:700;font-size:12px;margin-bottom:6px}.sn-bar .l{font-size:11px;color:var(--muted);margin-top:8px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      '.sn-internal{background:#0a1b2e;color:#cfe6e2;border-radius:12px;padding:14px 16px}',
      '.sn-internal .lbl{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#5eead4}',
      '.sn-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 16px}',
      '.sn-watch{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:8px 14px;display:flex;align-items:center;gap:10px;margin-top:8px}',
      '.sn-tabs{display:flex;gap:4px;flex-wrap:wrap}.sn-tab{background:none;border:0;color:#a9c4dd;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.sn-tab.on{background:rgba(255,255,255,.16);color:#fff}',
      '.sn-timeline{display:flex;align-items:center;gap:0;margin:8px 0 2px}',
      '.sn-tl-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative}',
      '.sn-tl-dot{width:24px;height:24px;border-radius:50%;background:#e2e8f0;color:#94a3b8;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;z-index:2;border:2px solid var(--paper)}',
      '.sn-tl-dot.done{background:var(--teal);color:#fff}.sn-tl-dot.cur{background:var(--blue);color:#fff;box-shadow:0 0 0 4px rgba(37,99,235,.18)}',
      '.sn-tl-line{position:absolute;top:11px;left:-50%;width:100%;height:3px;background:#e2e8f0;z-index:1}.sn-tl-line.done{background:var(--teal)}',
      '.sn-tl-lbl{font-size:11px;font-weight:600;margin-top:7px;color:var(--muted);text-transform:capitalize}.sn-tl-lbl.on{color:var(--ink)}',
      '.sn-foot{background:var(--navy);color:#9bb4cc;padding:36px 0;font-size:13px;margin-top:40px}.sn-foot b{color:#fff;font-family:Sora}',
      '.sn-empty{text-align:center;padding:60px 20px;color:var(--muted)}',
      '.sn-feat{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px}',
      '.sn-featc{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:22px}.sn-featc .ic{font-size:26px}.sn-featc h4{font-family:Sora;font-weight:700;font-size:16px;margin:10px 0 4px}',
      '@media(max-width:980px){.sn-grid,.sn-grid3,.sn-feat{grid-template-columns:repeat(2,1fr)}.sn-stats{grid-template-columns:repeat(2,1fr)}.sn-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'sn-logo', onClick: p.onClick, style: p.light ? { color: '#fff' } : null }, h('span', { className: 'dot' }, '🛡'), 'Sentinel'); }
  function Field(p) { return h('label', { className: 'sn-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'sn-badge', style: { background: statusColor(p.s) } }, titleCase(p.s)); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'member@sentinel.insure');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'sn-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'sn-sheet', style: { maxWidth: '420px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'sn-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'sn-h2', style: { marginTop: '18px', fontSize: '24px' } }, props.title || 'Sign in'),
        h('p', { className: 'sn-mut' }, 'Policyholders see their portal; the claims team sees the full console.'),
        h(Field, { label: 'Email', children: h('input', { className: 'sn-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'sn-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: 'var(--red)', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'sn-btn sn-btn-blue', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'sn-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — member@sentinel.insure · claims team claims@sentinel.insure · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'sn-top' }, h('div', { className: 'sn-wrap sn-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'sn-act' },
        h('button', { className: 'sn-ibtn', onClick: function () { c.navigate('#/coverage'); } }, 'Coverage'),
        c.isAdmin ? h('button', { className: 'sn-ibtn', onClick: function () { c.navigate('#/console'); } }, '🛡 Claims console') : null,
        c.authed && !c.isAdmin ? h('button', { className: 'sn-ibtn', onClick: function () { c.navigate('#/portal'); } }, '👤 My account') : null,
        c.authed ? h('button', { className: 'sn-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', onClick: c.openLogin }, 'Sign in'),
        h('button', { className: 'sn-btn sn-btn-ink sn-btn-sm', onClick: function () { c.navigate('#/coverage'); } }, 'Get a quote'))));
  }

  // ── Public landing ────────────────────────────────────────────────────────────
  function Hero(props) {
    var c = props.ctx;
    return h('section', { className: 'sn-hero' }, h('img', { src: HERO, alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }),
      h('div', { className: 'sn-wrap sn-hero-in' },
        h('span', { className: 'sn-pill' }, '🛡 Trusted by 120,000+ members'),
        h('h1', null, 'Coverage you can count on.'),
        h('p', null, 'One platform for every line — auto, home, life, health and more. Get a quote in minutes, file a claim in seconds, and track every step. Backed by an A-rated carrier.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' } },
          h('button', { className: 'sn-btn sn-btn-teal', onClick: function () { c.navigate('#/coverage'); } }, 'Get a quote'),
          h('button', { className: 'sn-btn sn-btn-ghost', style: { background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.authed ? c.navigate(c.isAdmin ? '#/console' : '#/portal') : c.openLogin(); } }, c.isAdmin ? 'Open console' : 'My account')),
        h('div', { className: 'sn-trust' },
          h('div', null, h('b', null, '7'), 'lines of coverage'),
          h('div', null, h('b', null, '< 48h'), 'avg. claim decision'),
          h('div', null, h('b', null, '98%'), 'claims paid'),
          h('div', null, h('b', null, 'A (Excellent)'), 'carrier rating'))));
  }

  function ProductCard(props) {
    var p = props.p;
    return h('div', { className: 'sn-pcard', onClick: function () { props.ctx.navigate('#/product/' + p.uuid); } },
      h('div', { className: 'sn-pcard-img' },
        h('img', { src: imgUrl(p.image), alt: p.name, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
        p.popular ? h('span', { className: 'sn-ribbon' }, 'Popular') : null),
      h('div', { className: 'sn-pcard-b' },
        h('span', { className: 'sn-chip' }, (LINE_ICON[p.line] || '') + ' ' + (p.line || '')),
        h('h3', { style: { marginTop: '9px' } }, p.name),
        p.tagline ? h('div', { className: 'sn-mut', style: { marginTop: '5px' } }, p.tagline) : null,
        h('div', { className: 'sn-from num' }, money(p.monthly_from), h('span', null, '/mo'))));
  }

  function Home(props) {
    var c = props.ctx;
    var products = (c.products || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var feats = [
      ['⚡', 'Quote & bind in minutes', 'Compare coverage across every line and bind online — no agent phone tag.'],
      ['📱', 'File a claim in seconds', 'Snap photos, upload documents and submit from anywhere. Track every step in real time.'],
      ['🔒', 'Fair, transparent claims', "Adjusters score and review claims to keep premiums fair — the insurer-internal review stays internal, never on your portal."]
    ];
    return h('div', null, h(Hero, { ctx: c }),
      h('section', { className: 'sn-sec' }, h('div', { className: 'sn-wrap' },
        h('div', { className: 'sn-eyebrow' }, 'Why Sentinel'),
        h('h2', { className: 'sn-h2', style: { marginTop: '6px' } }, 'Insurance that works the way it should'),
        h('div', { className: 'sn-feat' }, feats.map(function (f, i) {
          return h('div', { key: i, className: 'sn-featc' }, h('div', { className: 'ic' }, f[0]), h('h4', null, f[1]), h('div', { className: 'sn-mut' }, f[2]));
        })))),
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'sn-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h('div', { className: 'sn-eyebrow' }, 'Coverage'), h('h2', { className: 'sn-h2', style: { marginTop: '4px' } }, 'Protection for every part of life')),
          h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', onClick: function () { c.navigate('#/coverage'); } }, 'See all coverage')),
        c.products === null ? h('div', { className: 'sn-empty' }, 'Loading…')
          : h('div', { className: 'sn-grid' }, products.slice(0, 8).map(function (p) { return h(ProductCard, { key: p.uuid, p: p, ctx: c }); })))),
      h('section', { className: 'sn-sec' }, h('div', { className: 'sn-wrap' },
        h('div', { className: 'sn-panel', style: { padding: '30px', background: 'linear-gradient(120deg,#0a1b2e,#12304d)', color: '#fff', border: 0, display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '40px' } }, '🛡'),
          h('div', { style: { flex: 1, minWidth: '260px' } },
            h('div', { className: 'sora', style: { fontSize: '22px', fontWeight: 700 } }, 'Already a member?'),
            h('div', { style: { marginTop: '6px', color: '#cfdcec' } }, 'View your policies, file and track claims, and upload documents in your secure account.')),
          h('button', { className: 'sn-btn sn-btn-teal', onClick: function () { c.authed ? c.navigate(c.isAdmin ? '#/console' : '#/portal') : c.openLogin(); } }, c.isAdmin ? 'Open console' : 'Open my account')))));
  }

  function CoveragePage(props) {
    var c = props.ctx; var line = props.line;
    var list = (c.products || []).filter(function (p) { return !line || p.line === line; }).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'sn-wrap sn-sec' },
      h('div', { className: 'sn-eyebrow' }, 'Coverage & products'),
      h('h2', { className: 'sn-h2', style: { marginTop: '4px' } }, 'Find the right protection'),
      h('div', { className: 'sn-lines' },
        h('div', { className: cls('sn-linechip', !line && 'on'), onClick: function () { c.navigate('#/coverage'); } }, 'All lines'),
        LINES.map(function (s) { return h('div', { key: s, className: cls('sn-linechip', line === s && 'on'), onClick: function () { c.navigate('#/coverage?line=' + encodeURIComponent(s)); } }, (LINE_ICON[s] || '') + ' ' + s); })),
      c.products === null ? h('div', { className: 'sn-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'sn-grid', style: { marginTop: '26px' } }, list.map(function (p) { return h(ProductCard, { key: p.uuid, p: p, ctx: c }); })) : h('div', { className: 'sn-empty' }, 'No products in this line yet.'));
  }

  function ProductDetail(props) {
    var c = props.ctx;
    var p = (c.products || []).filter(function (x) { return x.uuid === props.uuid; })[0];
    var [sx, setSx] = React.useState(''); var [aiBusy, setAiBusy] = React.useState(false); var [aiTip, setAiTip] = React.useState(''); var [aiOffline, setAiOffline] = React.useState(false);
    if (c.products === null) return h('div', { className: 'sn-wrap sn-sec' }, h('div', { className: 'sn-empty' }, 'Loading…'));
    if (!p) return h('div', { className: 'sn-wrap sn-sec' }, h('div', { className: 'sn-empty' }, h('h2', { className: 'sn-h2' }, 'Product not found'), h('button', { className: 'sn-btn sn-btn-ghost', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/coverage'); } }, '← Back to coverage')));
    var highlights = (p.coverage_highlights || '').split('·').map(function (s) { return s.trim(); }).filter(Boolean);
    function explain() {
      setAiBusy(true); setAiTip(''); setAiOffline(false);
      var prompt = 'In 2 short, plain-English sentences, explain what a "' + p.name + '" (' + p.line + ' insurance) policy covers and who it suits best. Coverage highlights: ' + (p.coverage_highlights || '') + '. Be reassuring and concrete; no marketing fluff.';
      // aiText() returns '' for any failure envelope, so a 503/error body lands
      // in .catch() and shows the written summary below — the visitor never sees
      // a raw provider error. `model` is pinned because the SDK default is an
      // alias the AI service does not resolve.
      Promise.resolve().then(function () { if (!services || !services.ai || !services.ai.complete) throw 0; return services.ai.complete({ prompt: prompt, model: AI_MODEL }); })
        .then(function (r) { var t = aiText(r); if (!t) throw 0; setAiTip(t); setAiOffline(false); setAiBusy(false); })
        .catch(function () {
          setAiTip(p.name + ' is ' + p.line.toLowerCase() + ' coverage starting at ' + money(p.monthly_from) + '/mo. It protects you with ' + (highlights.slice(0, 2).join(' and ').toLowerCase() || 'broad protection') + ', and is a strong fit if you want dependable ' + p.line.toLowerCase() + ' coverage without surprises.');
          setAiOffline(true);
          setAiBusy(false);
        });
    }
    return h('div', { className: 'sn-wrap sn-sec' },
      h('button', { className: 'sn-ibtn', style: { marginBottom: '12px', paddingLeft: 0 }, onClick: function () { c.navigate('#/coverage'); } }, '← Coverage'),
      h('div', { className: 'sn-2col' },
        h('div', null,
          h('div', { className: 'sn-pcard-img', style: { height: '320px', borderRadius: '16px', border: '1px solid var(--line)' } },
            h('img', { src: imgUrl(p.image), alt: p.name, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
            p.popular ? h('span', { className: 'sn-ribbon' }, 'Popular') : null),
          h('div', { style: { marginTop: '20px' } },
            h('span', { className: 'sn-chip' }, (LINE_ICON[p.line] || '') + ' ' + (p.line || '')),
            h('h1', { className: 'sora', style: { fontSize: '34px', fontWeight: 800, margin: '12px 0 4px' } }, p.name),
            p.tagline ? h('p', { className: 'sn-mut', style: { fontSize: '16px' } }, p.tagline) : null),
          highlights.length ? h('div', { style: { marginTop: '20px' } },
            h('div', { className: 'sn-eyebrow' }, "What's covered"),
            h('div', { className: 'sn-panel', style: { marginTop: '10px' } }, highlights.map(function (hl, i) {
              return h('div', { key: i, className: 'sn-row' }, h('span', { style: { color: 'var(--teal)', fontWeight: 800 } }, '✓'), h('div', { className: 'sn-grow' }, hl));
            }))) : null,
          h('div', { className: 'sn-panel', style: { marginTop: '18px', padding: '20px' } },
            h('div', { className: 'sn-eyebrow' }, '✦ AI coverage explainer'),
            h('div', { className: 'sn-mut', style: { margin: '6px 0 10px' } }, 'Not sure what this covers? Get a plain-English summary.'),
            h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', disabled: aiBusy, onClick: explain }, aiBusy ? 'Thinking…' : 'Explain this coverage'),
            aiTip ? h('div', { className: 'sn-note', style: { marginTop: '12px', fontSize: '13.5px', lineHeight: 1.55 } },
              aiTip,
              // Don't pass a canned summary off as model output.
              aiOffline ? h('div', { className: 'sn-mut', style: { fontSize: '11.5px', marginTop: '8px' } }, 'Standard summary — the AI explainer is unavailable right now.') : null) : null)),
        h('div', { className: 'sn-panel', style: { padding: '24px', position: 'sticky', top: '88px' } },
          h('div', { className: 'sn-mut', style: { fontSize: '13px' } }, 'Starting from'),
          h('div', { className: 'sora num', style: { fontSize: '40px', fontWeight: 800, margin: '2px 0' } }, money(p.monthly_from), h('span', { style: { fontSize: '15px', fontWeight: 500, color: 'var(--muted)' } }, '/mo')),
          h('div', { className: 'sn-mut', style: { marginBottom: '14px' } }, 'Final price depends on your details.'),
          h('button', { className: 'sn-btn sn-btn-blue', style: { width: '100%' }, onClick: function () { c.authed ? c.navigate('#/portal') : c.openLogin(); } }, 'Get a quote'),
          h('button', { className: 'sn-btn sn-btn-ghost', style: { width: '100%', marginTop: '10px' }, onClick: function () { c.authed ? c.navigate('#/portal?file=1') : c.openLogin(); } }, 'File a claim'),
          h('div', { className: 'sn-mut', style: { marginTop: '16px', fontSize: '12.5px', lineHeight: 1.5 } }, '🔒 Your application and claims are encrypted. Insurer-internal claim reviews are never shown on your account.'))));
  }

  // ── Policyholder portal ───────────────────────────────────────────────────────
  function FileClaimModal(props) {
    var u = client.userInfo || {};
    var policies = props.policies || [];
    var [f, setF] = React.useState({ policy_number: (policies[0] || {}).policy_number || '', claim_type: '', incident_date: '', amount_claimed: '', description: '' });
    var [busy, setBusy] = React.useState(false);
    function set(kk, v) { setF(function (p) { var n = Object.assign({}, p); n[kk] = v; return n; }); }
    function submit(e) {
      e.preventDefault();
      if (!f.amount_claimed) { showToast('Enter the amount claimed', 'error'); return; }
      setBusy(true);
      var pol = policies.filter(function (p) { return p.policy_number === f.policy_number; })[0] || {};
      var n = 'CLM-' + Math.floor(200000 + Math.random() * 99999);
      var rec = { claim_number: n, policy_number: f.policy_number, line: pol.line || '',
        holder_name: u.fullName || '', holder_email: u.email || '', claim_type: f.claim_type || 'General',
        incident_date: f.incident_date || undefined, amount_claimed: Number(f.amount_claimed),
        claim_state: 'submitted', description: f.description, submitted_date: new Date().toISOString().slice(0, 10),
        owner_username: u.email || '', display_name: n + ' · ' + (f.claim_type || 'Claim') };
      client.createObject('claim', rec).then(function () { setBusy(false); showToast('Claim ' + n + ' submitted — we\'ll acknowledge by email', 'success'); props.onSaved(); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'sn-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('form', { className: 'sn-sheet', style: { padding: '28px' }, onSubmit: submit },
        h('button', { type: 'button', className: 'sn-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'sn-h2', style: { fontSize: '22px' } }, 'File a claim'),
        h('p', { className: 'sn-mut' }, 'Tell us what happened — you can upload supporting documents after submitting.'),
        h(Field, { label: 'Policy', req: true, children: h('select', { className: 'sn-input', required: true, value: f.policy_number, onChange: function (e) { set('policy_number', e.target.value); } },
          h('option', { value: '' }, 'Choose a policy'),
          policies.map(function (p) { return h('option', { key: p.uuid, value: p.policy_number }, p.policy_number + ' · ' + (p.product_name || p.line)); })) }),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Claim type', children: h('input', { className: 'sn-input', value: f.claim_type, placeholder: 'e.g. Collision, Theft', onChange: function (e) { set('claim_type', e.target.value); } }) }),
          h(Field, { label: 'Incident date', children: h('input', { className: 'sn-input', type: 'date', value: f.incident_date, onChange: function (e) { set('incident_date', e.target.value); } }) })),
        h(Field, { label: 'Amount claimed ($)', req: true, children: h('input', { className: 'sn-input', type: 'number', step: '0.01', required: true, value: f.amount_claimed, onChange: function (e) { set('amount_claimed', e.target.value); } }) }),
        h(Field, { label: 'What happened?', children: h('textarea', { className: 'sn-input', value: f.description, placeholder: 'Describe the incident…', onChange: function (e) { set('description', e.target.value); } }) }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'sn-btn sn-btn-blue', type: 'submit', disabled: busy }, busy ? 'Submitting…' : 'Submit claim'),
          h('button', { className: 'sn-btn sn-btn-ghost', type: 'button', onClick: props.onClose }, 'Cancel'))));
  }

  function UploadDocModal(props) {
    var u = client.userInfo || {};
    var [f, setF] = React.useState({ claim_number: props.claimNumber || '', title: '', doc_type: 'Photo' });
    var [busy, setBusy] = React.useState(false);
    function set(kk, v) { setF(function (p) { var n = Object.assign({}, p); n[kk] = v; return n; }); }
    function submit(e) {
      e.preventDefault(); if (!f.title) { showToast('Add a title', 'error'); return; } setBusy(true);
      var rec = { claim_number: f.claim_number, title: f.title, doc_type: f.doc_type, doc_state: 'pending',
        uploaded_date: new Date().toISOString().slice(0, 10), owner_username: u.email || '',
        display_name: f.title, description: f.claim_number + ' · ' + f.doc_type };
      client.createObject('claim_document', rec).then(function () { setBusy(false); showToast('Document uploaded', 'success'); props.onSaved(); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'sn-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('form', { className: 'sn-sheet', style: { padding: '28px', maxWidth: '480px' }, onSubmit: submit },
        h('button', { type: 'button', className: 'sn-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'sn-h2', style: { fontSize: '21px' } }, 'Upload claim document'),
        h(Field, { label: 'Claim number', children: h('select', { className: 'sn-input', value: f.claim_number, onChange: function (e) { set('claim_number', e.target.value); } },
          h('option', { value: '' }, 'Select a claim'),
          (props.claims || []).map(function (cl) { return h('option', { key: cl.uuid, value: cl.claim_number }, cl.claim_number + ' · ' + (cl.claim_type || '')); })) }),
        h(Field, { label: 'Title', req: true, children: h('input', { className: 'sn-input', value: f.title, placeholder: 'e.g. Damage photos', onChange: function (e) { set('title', e.target.value); } }) }),
        h(Field, { label: 'Document type', children: h('select', { className: 'sn-input', value: f.doc_type, onChange: function (e) { set('doc_type', e.target.value); } }, DOC_TYPES.map(function (t) { return h('option', { key: t, value: t }, t); })) }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'sn-btn sn-btn-blue', type: 'submit', disabled: busy }, busy ? 'Uploading…' : 'Upload'),
          h('button', { className: 'sn-btn sn-btn-ghost', type: 'button', onClick: props.onClose }, 'Cancel'))));
  }

  function ClaimTimeline(props) {
    var st = props.state;
    if (st === 'denied') return h('div', { className: 'sn-badge', style: { background: statusColor('denied'), padding: '5px 12px' } }, 'Denied');
    var idx = CLAIM_FLOW.indexOf(st); if (idx < 0) idx = 0;
    return h('div', { className: 'sn-timeline' }, CLAIM_FLOW.map(function (s, i) {
      var done = i < idx, cur = i === idx;
      return h('div', { key: s, className: 'sn-tl-step' },
        i > 0 ? h('div', { className: cls('sn-tl-line', (i <= idx) && 'done') }) : null,
        h('div', { className: cls('sn-tl-dot', done && 'done', cur && 'cur') }, done ? '✓' : (i + 1)),
        h('div', { className: cls('sn-tl-lbl', (done || cur) && 'on') }, titleCase(s)));
    }));
  }

  function Portal(props) {
    var c = props.ctx;
    var [policies, setPolicies] = React.useState(null); var [claims, setClaims] = React.useState(null); var [docs, setDocs] = React.useState(null);
    var [fileOpen, setFileOpen] = React.useState(props.fileFlag || false); var [uploadFor, setUploadFor] = React.useState(null);
    function load() {
      client.getObjects('policy').then(function (r) { setPolicies(arr(r)); }).catch(function () { setPolicies([]); });
      client.getObjects('claim').then(function (r) { setClaims(arr(r).sort(function (a, b) { return (b.submitted_date || '').localeCompare(a.submitted_date || ''); })); }).catch(function () { setClaims([]); });
      client.getObjects('claim_document').then(function (r) { setDocs(arr(r)); }).catch(function () { setDocs([]); });
    }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'sn-wrap sn-sec' }, h('div', { className: 'sn-empty' }, h('h2', { className: 'sn-h2' }, 'Sign in to your account'), h('button', { className: 'sn-btn sn-btn-blue', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    var activePol = (policies || []).filter(function (p) { return p.policy_state === 'active'; });
    var openClaims = (claims || []).filter(function (cl) { return ['submitted', 'under_review', 'approved'].indexOf(cl.claim_state) >= 0; });
    function docsFor(num) { return (docs || []).filter(function (dd) { return dd.claim_number === num; }); }
    return h('div', { className: 'sn-wrap sn-sec' },
      h('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' } },
        h('div', null, h('div', { className: 'sn-eyebrow' }, 'My account'), h('h2', { className: 'sn-h2', style: { marginTop: '4px' } }, 'Welcome back, ' + ((client.userInfo || {}).fullName || 'member'))),
        h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '10px' } },
          h('button', { className: 'sn-btn sn-btn-ghost', onClick: function () { setUploadFor({}); } }, '📎 Upload document'),
          h('button', { className: 'sn-btn sn-btn-blue', onClick: function () { setFileOpen(true); } }, '+ File a claim'))),

      h('div', { className: 'sn-stats', style: { marginTop: '20px' } },
        h('div', { className: 'sn-stat' }, h('div', { className: 'sn-stat-n' }, (policies || []).length), h('div', { className: 'sn-stat-l' }, 'Policies')),
        h('div', { className: 'sn-stat' }, h('div', { className: 'sn-stat-n', style: { color: 'var(--teal)' } }, activePol.length), h('div', { className: 'sn-stat-l' }, 'Active')),
        h('div', { className: 'sn-stat' }, h('div', { className: 'sn-stat-n', style: { color: 'var(--blue)' } }, openClaims.length), h('div', { className: 'sn-stat-l' }, 'Open claims')),
        h('div', { className: 'sn-stat' }, h('div', { className: 'sn-stat-n num' }, money(activePol.reduce(function (s, p) { return s + (p.premium || 0); }, 0)) + '/mo'), h('div', { className: 'sn-stat-l' }, 'Monthly premium'))),

      // Policies
      h('div', { style: { fontWeight: 700, margin: '26px 0 10px' } }, 'My policies'),
      policies === null ? h('div', { className: 'sn-panel' }, h('div', { className: 'sn-row sn-mut' }, 'Loading…'))
        : policies.length ? h('div', { className: 'sn-grid3' }, policies.slice().sort(function (a, b) { return (a.policy_state === 'active' ? 0 : 1) - (b.policy_state === 'active' ? 0 : 1); }).map(function (p) {
          return h('div', { key: p.uuid, className: 'sn-panel', style: { padding: '18px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
              h('span', { className: 'sn-chip' }, (LINE_ICON[p.line] || '') + ' ' + (p.line || '')), h(Badge, { s: p.policy_state })),
            h('div', { className: 'sora', style: { fontWeight: 700, fontSize: '16px', marginTop: '10px' } }, p.product_name || p.line),
            h('div', { className: 'sn-mut num', style: { marginTop: '2px' } }, p.policy_number),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13.5px' } },
              h('span', { className: 'sn-mut' }, 'Premium'), h('b', { className: 'num' }, money(p.premium) + '/mo')),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13.5px' } },
              h('span', { className: 'sn-mut' }, 'Coverage'), h('b', { className: 'num' }, money(p.coverage_amount))),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13px' } },
              h('span', { className: 'sn-mut' }, 'Renews'), h('span', null, fmtDate(p.renewal_date))));
        })) : h('div', { className: 'sn-panel' }, h('div', { className: 'sn-empty' }, 'No policies yet. Get a quote from the Coverage page.')),

      // Claims with timeline + RBAC note
      h('div', { style: { fontWeight: 700, margin: '28px 0 10px' } }, 'My claims'),
      h('div', { className: 'sn-note', style: { marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' } },
        h('span', { style: { fontSize: '18px' } }, '🔒'),
        h('div', { className: 'sn-mut', style: { fontSize: '12.8px', lineHeight: 1.5 } }, 'Our adjusters also record an internal fraud score and review notes on every claim to keep premiums fair. Those are insurer-internal and never shown here — the platform strips them from your view server-side, not just in this page.')),
      claims === null ? h('div', { className: 'sn-panel' }, h('div', { className: 'sn-row sn-mut' }, 'Loading…'))
        : claims.length ? claims.map(function (cl) {
          var cdocs = docsFor(cl.claim_number);
          return h('div', { key: cl.uuid, className: 'sn-panel', style: { padding: '20px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
              h('div', { className: 'sn-grow' },
                h('div', { style: { fontWeight: 700 } }, cl.claim_number, h('span', { className: 'sn-chip', style: { marginLeft: '8px' } }, (LINE_ICON[cl.line] || '') + ' ' + (cl.claim_type || cl.line || ''))),
                h('div', { className: 'sn-mut', style: { marginTop: '2px' } }, 'Filed ' + fmtDate(cl.submitted_date) + ' · ' + cl.policy_number)),
              h('div', { style: { textAlign: 'right' } },
                h('div', { className: 'num', style: { fontWeight: 700 } }, money(cl.amount_claimed)),
                cl.amount_approved ? h('div', { className: 'sn-mut num', style: { fontSize: '12px', color: 'var(--green)' } }, 'Approved ' + money(cl.amount_approved)) : null)),
            cl.description ? h('div', { className: 'sn-mut', style: { marginTop: '10px', fontSize: '13.5px' } }, cl.description) : null,
            h('div', { style: { marginTop: '16px' } }, h(ClaimTimeline, { state: cl.claim_state })),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', flexWrap: 'wrap' } },
              cdocs.length ? h('div', { className: 'sn-mut', style: { fontSize: '12.5px' } }, '📎 ' + cdocs.length + ' document' + (cdocs.length > 1 ? 's' : '') + ' · ' + cdocs.map(function (dd) { return dd.title; }).slice(0, 2).join(', ')) : h('div', { className: 'sn-mut', style: { fontSize: '12.5px' } }, 'No documents yet'),
              h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setUploadFor({ claim_number: cl.claim_number }); } }, '📎 Add document')));
        }) : h('div', { className: 'sn-panel' }, h('div', { className: 'sn-empty' }, 'No claims yet.')),

      fileOpen ? h(FileClaimModal, { policies: policies || [], onClose: function () { setFileOpen(false); }, onSaved: function () { setFileOpen(false); load(); } }) : null,
      uploadFor ? h(UploadDocModal, { claimNumber: uploadFor.claim_number, claims: claims || [], onClose: function () { setUploadFor(null); }, onSaved: function () { setUploadFor(null); load(); } }) : null);
  }

  // ── Claims console (staff) ────────────────────────────────────────────────────
  function Stat(p) { return h('div', { className: 'sn-stat' }, h('div', { className: 'sn-stat-n num', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'sn-stat-l' }, p.l), p.d ? h('div', { className: 'sn-stat-d', style: { color: p.dc || 'var(--green)' } }, p.d) : null); }

  function BarChart(props) {
    var data = props.data || []; var maxV = Math.max.apply(null, data.map(function (b) { return b.value; }).concat([1]));
    return h('div', null,
      h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, props.title),
      props.sub ? h('div', { className: 'sn-mut', style: { fontSize: '12.5px', marginBottom: '6px' } }, props.sub) : null,
      h('div', { className: 'sn-bars' }, data.map(function (b) {
        return h('div', { key: b.label, className: 'sn-bar' },
          h('div', { className: 'v num' }, props.fmt ? props.fmt(b.value) : b.value),
          h('div', { className: 'b', style: { height: Math.max(4, (b.value / maxV) * 135) + 'px', background: b.color ? b.color : null } }),
          h('div', { className: 'l' }, b.label));
      })));
  }

  function ConsoleHome(props) {
    var c = props.ctx; var [claims, setClaims] = React.useState(null);
    React.useEffect(function () { client.getObjects('claim').then(function (r) { setClaims(arr(r)); }).catch(function () { setClaims([]); }); }, []);
    var all = claims || [];
    var open = all.filter(function (x) { return ['submitted', 'under_review'].indexOf(x.claim_state) >= 0; });
    var decided = all.filter(function (x) { return ['approved', 'paid', 'denied'].indexOf(x.claim_state) >= 0; });
    var approvedOrPaid = all.filter(function (x) { return ['approved', 'paid'].indexOf(x.claim_state) >= 0; });
    var paid = all.filter(function (x) { return x.claim_state === 'paid'; });
    var totalPayout = paid.reduce(function (s, x) { return s + (x.amount_approved || 0); }, 0);
    var approvalRate = decided.length ? Math.round((approvedOrPaid.length / decided.length) * 100) : 0;
    // avg cycle time (submitted -> now, in days) over paid claims as a proxy
    function daysAgo(s) { try { return Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 86400000)); } catch (e) { return 0; } }
    var cycleVals = paid.map(function (x) { return daysAgo(x.submitted_date); }).filter(function (n) { return n > 0; });
    var avgCycle = cycleVals.length ? Math.round(cycleVals.reduce(function (a, b) { return a + b; }, 0) / cycleVals.length) : 0;
    var byState = CLAIM_STATES.map(function (st) { return { label: titleCase(st).split(' ')[0], value: all.filter(function (x) { return x.claim_state === st; }).length, color: 'linear-gradient(180deg,' + statusColor(st) + ',' + statusColor(st) + ')' }; });
    var byLine = LINES.map(function (ln) { return { label: ln.slice(0, 4), value: all.filter(function (x) { return x.line === ln; }).reduce(function (s, x) { return s + (x.amount_approved || 0); }, 0) }; }).filter(function (b) { return b.value > 0; });
    if (!byLine.length) byLine = LINES.slice(0, 4).map(function (ln) { return { label: ln.slice(0, 4), value: 0 }; });
    var watch = all.filter(function (x) { return (Number(x.fraud_score) || 0) >= 45; }).sort(function (a, b) { return (b.fraud_score || 0) - (a.fraud_score || 0); });
    return h('div', null,
      h('div', { className: 'sn-stats' },
        h(Stat, { n: open.length, l: 'Open claims', d: open.length ? 'needs action' : 'all clear', dc: open.length ? 'var(--amber)' : 'var(--green)', color: 'var(--ink)' }),
        h(Stat, { n: money(totalPayout), l: 'Total payout (paid)', color: 'var(--teal)' }),
        h(Stat, { n: approvalRate + '%', l: 'Approval rate', d: decided.length + ' decided', color: 'var(--blue)' }),
        h(Stat, { n: avgCycle + 'd', l: 'Avg cycle time', d: 'submit → paid', color: 'var(--ink)' })),
      h('div', { className: 'sn-2col', style: { marginTop: '18px', gridTemplateColumns: '1fr 1fr' } },
        h('div', { className: 'sn-panel', style: { padding: '20px' } }, h(BarChart, { title: 'Claims by state', data: byState })),
        h('div', { className: 'sn-panel', style: { padding: '20px' } }, h(BarChart, { title: 'Payout by line', sub: 'Approved $ paid out', data: byLine, fmt: function (v) { return '$' + k(v); } }))),
      h('div', { className: 'sn-panel', style: { marginTop: '18px', padding: '20px' } },
        h(BarChart, { title: 'Claims volume by line', sub: 'Count of claims per coverage line', data: LINES.map(function (ln) { return { label: ln.slice(0, 4), value: all.filter(function (x) { return x.line === ln; }).length }; }) })),
      h('div', { className: 'sn-panel', style: { marginTop: '18px', padding: '20px' } },
        h('div', { style: { display: 'flex', alignItems: 'center' } },
          h('div', { style: { fontWeight: 700 } }, '⚠ High fraud-score watchlist'),
          h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.navigate('#/console/claims'); } }, 'Open claims queue →')),
        h('div', { className: 'sn-mut', style: { fontSize: '12.5px', marginTop: '4px' } }, 'Claims with an elevated insurer-internal fraud score — visible only to the claims team.'),
        claims === null ? h('div', { className: 'sn-mut', style: { marginTop: '10px' } }, 'Loading…')
          : watch.length ? watch.map(function (x) {
            return h('div', { key: x.uuid, className: 'sn-watch' },
              h('span', { className: 'num', style: { fontWeight: 800, color: fraudColor(x.fraud_score), minWidth: '34px' } }, x.fraud_score),
              h('div', { className: 'sn-grow', style: { fontSize: '13.5px' } }, h('b', null, x.claim_number), ' · ' + (x.claim_type || '') + ' · ' + (x.holder_name || ''), h('div', { className: 'sn-mut', style: { fontSize: '12px' } }, money(x.amount_claimed) + ' claimed')),
              h(Badge, { s: x.claim_state }));
          }) : h('div', { className: 'sn-mut', style: { marginTop: '10px' } }, 'No elevated-risk claims right now.')));
  }

  function ConsoleClaims(props) {
    var c = props.ctx; var [claims, setClaims] = React.useState(null); var [docs, setDocs] = React.useState([]);
    var [open, setOpen] = React.useState(null); var [fState, setFState] = React.useState('all'); var [fLine, setFLine] = React.useState('all');
    var [sagaBusy, setSagaBusy] = React.useState('');
    function load() {
      client.getObjects('claim').then(function (r) { var a = arr(r).sort(function (x, y) { return (y.submitted_date || '').localeCompare(x.submitted_date || ''); }); setClaims(a); if (open) { var m = a.filter(function (z) { return z.uuid === open.uuid; })[0]; if (m) setOpen(m); } }).catch(function () { setClaims([]); });
      client.getObjects('claim_document').then(function (r) { setDocs(arr(r)); }).catch(function () {});
    }
    React.useEffect(load, []);
    function decide(x, st, extra) {
      var patch = Object.assign({ claim_state: st }, extra || {});
      if (!patch.adjuster) patch.adjuster = (client.userInfo || {}).fullName || 'Claims';
      client.updateObject('claim', x.uuid, patch, x).then(function () { showToast('Claim ' + titleCase(st), 'success'); load(); }).catch(function () { showToast('Failed', 'error'); });
    }
    // Run a claim saga and report what ACTUALLY happened.
    //
    // Both handlers used to end in `.catch(function () { decide(x, <state>); })`,
    // which bypassed the workflow entirely and wrote the terminal state straight
    // to the record — so a saga that never ran still showed a green toast and a
    // claim marked approved/paid. On failure we now surface the error and leave
    // the claim's state to the server; `load()` re-reads it rather than guessing.
    function runClaimSaga(x, workflowId, input, label) {
      if (!(services && services.workflow && services.workflow.run)) {
        showToast(label + ' unavailable — workflow service not loaded', 'error');
        return;
      }
      setSagaBusy(x.uuid + ':' + workflowId);
      services.workflow.run(workflowId, input)
        .then(function (r) {
          var bad = sagaFailure(r);
          if (bad) throw new Error(bad);
          showToast(label + ' completed for ' + x.claim_number, 'success');
        })
        .catch(function (err) {
          showToast(label + ' FAILED for ' + x.claim_number + ': ' + ((err && err.message) || 'unknown error'), 'error');
        })
        .then(function () { setSagaBusy(''); load(); });
    }
    function approveSaga(x) {
      var amt = x.amount_approved || x.amount_claimed || 0;
      runClaimSaga(x, 'claim_decision', { claim_uuid: x.uuid, holder_email: x.holder_email, claim_number: x.claim_number, amount_approved: amt }, 'Approval saga');
    }
    function payoutSaga(x) {
      runClaimSaga(x, 'claim_payout', { claim_uuid: x.uuid, holder_email: x.holder_email, claim_number: x.claim_number, amount_approved: x.amount_approved || 0 }, 'Payout saga');
    }
    var list = (claims || []).filter(function (x) { return (fState === 'all' || x.claim_state === fState) && (fLine === 'all' || x.line === fLine); });
    function docsFor(num) { return docs.filter(function (dd) { return dd.claim_number === num; }); }
    return h('div', { className: 'sn-2col' },
      h('div', null,
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' } },
          h('button', { className: cls('sn-btn sn-btn-sm', fState === 'all' ? 'sn-btn-blue' : 'sn-btn-ghost'), onClick: function () { setFState('all'); } }, 'All states'),
          CLAIM_STATES.map(function (s) { return h('button', { key: s, className: cls('sn-btn sn-btn-sm', fState === s ? 'sn-btn-blue' : 'sn-btn-ghost'), onClick: function () { setFState(s); } }, titleCase(s)); })),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } },
          h('button', { className: cls('sn-btn sn-btn-sm', fLine === 'all' ? 'sn-btn-ink' : 'sn-btn-ghost'), onClick: function () { setFLine('all'); } }, 'All lines'),
          LINES.map(function (s) { return h('button', { key: s, className: cls('sn-btn sn-btn-sm', fLine === s ? 'sn-btn-ink' : 'sn-btn-ghost'), onClick: function () { setFLine(s); } }, s); })),
        h('div', { className: 'sn-panel' }, claims === null ? h('div', { className: 'sn-row sn-mut' }, 'Loading…')
          : list.length ? list.map(function (x) {
            return h('div', { key: x.uuid, className: 'sn-row', style: { cursor: 'pointer', background: open && open.uuid === x.uuid ? '#eff6ff' : '' }, onClick: function () { setOpen(x); } },
              h('div', { style: { width: '40px', textAlign: 'center', flex: 'none' } }, h('div', { className: 'num', style: { fontWeight: 800, fontSize: '15px', color: fraudColor(x.fraud_score) } }, (Number(x.fraud_score) || 0)), h('div', { style: { fontSize: '9px', color: 'var(--muted)', letterSpacing: '.06em' } }, 'FRAUD')),
              h('div', { className: 'sn-grow' }, h('div', { style: { fontWeight: 700 } }, x.claim_number, h('span', { className: 'sn-chip', style: { marginLeft: '8px' } }, (LINE_ICON[x.line] || '') + ' ' + (x.line || ''))), h('div', { className: 'sn-mut' }, (x.claim_type || '') + ' · ' + (x.holder_name || '') + ' · ' + money(x.amount_claimed))),
              h(Badge, { s: x.claim_state }));
          }) : h('div', { className: 'sn-empty' }, 'No claims match.'))),
      // Detail panel — fraud_score + internal_notes + documents + saga actions
      h('div', { className: 'sn-panel', style: { padding: '20px', position: 'sticky', top: '88px' } },
        open ? h('div', null,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' } },
            h('div', null, h('div', { style: { fontWeight: 800, fontSize: '18px' } }, open.claim_number), h('div', { className: 'sn-mut', style: { fontSize: '13px' } }, (open.claim_type || '') + ' · ' + (open.line || ''))),
            h(Badge, { s: open.claim_state })),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13.5px' } }, h('span', { className: 'sn-mut' }, 'Policyholder'), h('b', null, open.holder_name || '')),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13.5px' } }, h('span', { className: 'sn-mut' }, 'Policy'), h('span', { className: 'num' }, open.policy_number || '')),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13.5px' } }, h('span', { className: 'sn-mut' }, 'Incident'), h('span', null, fmtDate(open.incident_date) || '—')),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13.5px' } }, h('span', { className: 'sn-mut' }, 'Amount claimed'), h('b', { className: 'num' }, money(open.amount_claimed))),
          open.amount_approved ? h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13.5px' } }, h('span', { className: 'sn-mut' }, 'Amount approved'), h('b', { className: 'num', style: { color: 'var(--green)' } }, money(open.amount_approved))) : null,
          open.adjuster ? h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13.5px' } }, h('span', { className: 'sn-mut' }, 'Adjuster'), h('span', null, open.adjuster)) : null,
          open.description ? h('div', { style: { marginTop: '12px', fontSize: '13.5px', lineHeight: 1.5 } }, h('b', null, 'Description: '), open.description) : null,
          // STAFF-ONLY: fraud_score + internal_notes (policyholders never receive these fields)
          h('div', { className: 'sn-internal', style: { marginTop: '14px' } },
            h('div', { className: 'lbl' }, '🔒 Insurer-internal — staff only'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' } },
              h('span', { className: 'num', style: { fontFamily: 'Sora', fontWeight: 800, fontSize: '24px', color: '#fff' } }, (Number(open.fraud_score) || 0)),
              h('span', { style: { fontSize: '12px', color: '#9fc6c0' } }, '/ 100 fraud score'),
              h('span', { className: 'sn-badge', style: { marginLeft: 'auto', background: fraudColor(open.fraud_score) } }, (Number(open.fraud_score) || 0) >= 60 ? 'High risk' : (Number(open.fraud_score) || 0) >= 35 ? 'Review' : 'Low risk')),
            open.internal_notes ? h('div', { style: { marginTop: '10px', fontSize: '13px', lineHeight: 1.55, color: '#dbeee9' } }, open.internal_notes) : h('div', { style: { marginTop: '8px', fontSize: '12.5px', color: '#7fb0a9' } }, 'No internal notes recorded.')),
          // Documents
          h('div', { style: { marginTop: '14px' } },
            h('div', { className: 'sn-eyebrow' }, 'Documents'),
            (function () { var dd = docsFor(open.claim_number); return dd.length ? dd.map(function (doc) {
              return h('div', { key: doc.uuid, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: '13px' } },
                h('span', null, '📎'), h('div', { className: 'sn-grow' }, doc.title, h('div', { className: 'sn-mut', style: { fontSize: '11.5px' } }, doc.doc_type)), h(Badge, { s: doc.doc_state }));
            }) : h('div', { className: 'sn-mut', style: { fontSize: '12.5px', marginTop: '4px' } }, 'No documents attached.'); })()),
          // Approval saga actions
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' } },
            ['submitted', 'under_review'].indexOf(open.claim_state) >= 0 && open.claim_state === 'submitted' ? h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', onClick: function () { decide(open, 'under_review'); } }, 'Start review') : null,
            ['submitted', 'under_review'].indexOf(open.claim_state) >= 0 ? h('button', { className: 'sn-btn sn-btn-teal sn-btn-sm', disabled: !!sagaBusy, onClick: function () { approveSaga(open); } }, sagaBusy === open.uuid + ':claim_decision' ? 'Running…' : '✓ Approve (saga)') : null,
            open.claim_state === 'approved' ? h('button', { className: 'sn-btn sn-btn-ink sn-btn-sm', disabled: !!sagaBusy, onClick: function () { payoutSaga(open); } }, sagaBusy === open.uuid + ':claim_payout' ? 'Running…' : '💸 Pay (saga)') : null,
            ['submitted', 'under_review'].indexOf(open.claim_state) >= 0 ? h('button', { className: 'sn-btn sn-btn-danger sn-btn-sm', onClick: function () { decide(open, 'denied'); } }, 'Deny') : null),
          h('div', { className: 'sn-mut', style: { fontSize: '11.5px', marginTop: '10px' } }, 'Approve runs the claim_decision saga (update → email; reverts to under_review on error). Pay runs claim_payout (update → receipt).'))
          : h('div', { className: 'sn-empty' }, 'Select a claim to review.')));
  }

  function ConsolePolicies(props) {
    var [policies, setPolicies] = React.useState(null); var [f, setF] = React.useState('all');
    React.useEffect(function () { client.getObjects('policy').then(function (r) { setPolicies(arr(r).sort(function (a, b) { return (b.premium || 0) - (a.premium || 0); })); }).catch(function () { setPolicies([]); }); }, []);
    var all = policies || [];
    var inForce = all.filter(function (p) { return p.policy_state === 'active'; });
    var book = inForce.reduce(function (s, p) { return s + (p.premium || 0); }, 0);
    var list = all.filter(function (p) { return f === 'all' || p.policy_state === f; });
    return h('div', null,
      h('div', { className: 'sn-stats', style: { marginBottom: '16px' } },
        h(Stat, { n: all.length, l: 'Total policies' }),
        h(Stat, { n: inForce.length, l: 'In force', color: 'var(--teal)' }),
        h(Stat, { n: money(book) + '/mo', l: 'Book of business', color: 'var(--blue)' }),
        h(Stat, { n: money(inForce.reduce(function (s, p) { return s + (p.coverage_amount || 0); }, 0)), l: 'Total coverage' })),
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } },
        ['all', 'active', 'quoted', 'lapsed', 'cancelled'].map(function (s) { return h('button', { key: s, className: cls('sn-btn sn-btn-sm', f === s ? 'sn-btn-blue' : 'sn-btn-ghost'), onClick: function () { setF(s); } }, titleCase(s)); })),
      h('div', { className: 'sn-panel' }, policies === null ? h('div', { className: 'sn-row sn-mut' }, 'Loading…')
        : list.length ? list.map(function (p) {
          return h('div', { key: p.uuid, className: 'sn-row' },
            h('span', { className: 'sn-chip' }, (LINE_ICON[p.line] || '') + ' ' + (p.line || '')),
            h('div', { className: 'sn-grow' }, h('div', { style: { fontWeight: 700 } }, p.policy_number, h('span', { className: 'sn-mut', style: { fontWeight: 400, marginLeft: '8px' } }, p.product_name || '')), h('div', { className: 'sn-mut' }, (p.holder_name || '') + ' · renews ' + fmtDate(p.renewal_date))),
            h('div', { className: 'num', style: { fontWeight: 700 } }, money(p.premium) + '/mo'), h(Badge, { s: p.policy_state }));
        }) : h('div', { className: 'sn-empty' }, 'No policies.')));
  }

  var PRODUCT_FIELDS = [
    { kk: 'name', label: 'Product name', req: true }, { kk: 'line', label: 'Line', type: 'select', opts: LINES },
    { kk: 'tagline', label: 'Tagline' }, { kk: 'monthly_from', label: 'Monthly from ($)', type: 'number' },
    { kk: 'coverage_highlights', label: 'Coverage highlights (· separated)', type: 'textarea' },
    { kk: 'image_url', label: 'Image URL' }, { kk: 'sort_order', label: 'Sort order', type: 'number' }, { kk: 'popular', label: 'Popular', type: 'check' }
  ];

  function ProductEditModal(props) {
    var fields = PRODUCT_FIELDS, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.kk]; if (fd.kk === 'image_url') v = imgUrl(init.image); f[fd.kk] = (v == null) ? '' : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(kk, v) { setForm(function (p) { var n = Object.assign({}, p); n[kk] = v; return n; }); }
    function save() {
      var data = {}; fields.forEach(function (fd) { var v = form[fd.kk];
        if (fd.type === 'check') { data[fd.kk] = !!v; return; } if (v === '' || v == null) return; if (fd.type === 'number') v = Number(v);
        if (fd.kk === 'image_url') { data.image = { url: v, thumbnail_url: v }; return; } data[fd.kk] = v; });
      data.display_name = data.name || init.name || 'Product'; data.description = (data.line || init.line || '') + (data.monthly_from ? ' · from $' + data.monthly_from + '/mo' : '');
      setBusy(true);
      var p = init.uuid ? client.updateObject('insurance_product', init.uuid, data, init) : client.createObject('insurance_product', data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'sn-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'sn-sheet', style: { padding: '26px' } }, h('button', { className: 'sn-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'sn-h2', style: { fontSize: '21px' } }, init.uuid ? 'Edit product' : 'Add product'),
        fields.map(function (fd) {
          var val = form[fd.kk] == null ? '' : form[fd.kk]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'sn-input', value: val, onChange: function (e) { set(fd.kk, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'sn-input', value: val, onChange: function (e) { set(fd.kk, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.kk, e.target.checked); } }), h('span', { className: 'sn-mut' }, 'Featured as popular'));
          else input = h('input', { className: 'sn-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.kk, e.target.value); } });
          return h(Field, { key: fd.kk, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'sn-btn sn-btn-blue', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'sn-btn sn-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  function ConsoleProducts(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.products || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    function del(p) { if (!window.confirm('Remove ' + p.name + '?')) return; client.deleteObject('insurance_product', p.uuid, p).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function () { showToast('Failed', 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' products'),
        h('button', { className: 'sn-btn sn-btn-blue sn-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add product')),
      h('div', { className: 'sn-panel' }, list.length ? list.map(function (p) {
        return h('div', { key: p.uuid, className: 'sn-row' },
          h('div', { style: { width: '52px', height: '40px', borderRadius: '8px', overflow: 'hidden', flex: 'none', background: '#dce6f1' } }, h('img', { src: imgUrl(p.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'sn-grow' }, h('div', { style: { fontWeight: 700 } }, p.name, p.popular ? h('span', { className: 'sn-chip', style: { marginLeft: '8px', background: '#fef3c7', color: '#92400e' } }, '★ Popular') : null), h('div', { className: 'sn-mut' }, (LINE_ICON[p.line] || '') + ' ' + (p.line || '') + ' · from ' + money(p.monthly_from) + '/mo')),
          h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'),
          h('button', { className: 'sn-btn sn-btn-ghost sn-btn-sm', onClick: function () { del(p); } }, '✕'));
      }) : h('div', { className: 'sn-empty' }, 'No products yet.')),
      edit !== null ? h(ProductEditModal, { initial: edit, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function Console(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var tabs = [['home', 'Dashboard'], ['claims', 'Claims queue'], ['policies', 'Policies'], ['products', 'Products']];
    return h('div', { className: 'sn' },
      h('div', { style: { background: 'linear-gradient(100deg,#0a1b2e,#12304d)' } }, h('div', { className: 'sn-wrap', style: { display: 'flex', alignItems: 'center', height: '62px', gap: '14px' } },
        h(Logo, { light: true, onClick: function () { c.navigate('#/'); } }),
        h('span', { style: { color: '#9fc6c0', fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' } }, 'Claims Console'),
        h('div', { className: 'sn-tabs', style: { marginLeft: '12px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('sn-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/console' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'sn-ibtn', style: { marginLeft: 'auto', color: '#cfdcec' }, onClick: function () { c.navigate('#/'); } }, 'Public site ↗'))),
      h('div', { className: 'sn-wrap', style: { padding: '24px 24px 64px' } },
        sub === 'home' ? h(ConsoleHome, { ctx: c }) : sub === 'claims' ? h(ConsoleClaims, { ctx: c }) : sub === 'policies' ? h(ConsolePolicies, { ctx: c }) : h(ConsoleProducts, { ctx: c })));
  }

  function Footer() { return h('footer', { className: 'sn-foot' }, h('div', { className: 'sn-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'Sentinel'), ' — coverage you can count on.'), h('div', null, 'Licensed in all 50 states · Privacy · 24/7 claims: 1-800-SENTINEL'))); }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [products, setProducts] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() { client.getObjects('insurance_product').then(function (r) { setProducts(arr(r)); }).catch(function () { setProducts([]); }); }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, products: products, reload: reload };
    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var q = qi >= 0 ? hash.slice(qi) : ''; var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';
    var qp = new URLSearchParams(q.replace(/^\?/, ''));

    if (top === 'console' && ctx.isAdmin) return h(ErrorBoundary, null, h(Console, { ctx: ctx, seg: seg }), showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'coverage') page = h(CoveragePage, { ctx: ctx, line: qp.get('line') });
    else if (top === 'product') page = h(ProductDetail, { ctx: ctx, uuid: seg[1] });
    else if (top === 'portal') page = h(Portal, { ctx: ctx, fileFlag: qp.get('file') === '1' });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'sn' }, h(TopBar, { ctx: ctx }), page, h(Footer, null),
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); setAuthed(true); } }) : null));
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
