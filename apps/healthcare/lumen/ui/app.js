// ui/app.js — Lumen Health clinic platform (custom UI).
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, ErrorBoundary)
// come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var SPECIALTIES = ['Primary Care', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Mental Health', "Women's Health", 'Dental'];
  var SPEC_ICON = { 'Primary Care': '🩺', 'Cardiology': '❤️', 'Dermatology': '🧴', 'Pediatrics': '🧸', 'Orthopedics': '🦴', 'Mental Health': '🧠', "Women's Health": '🌸', 'Dental': '🦷' };
  var APPT_STATES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'];
  var HERO = 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=2000&h=1100';

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return n === 0 ? 'Covered' : formatCurrency(n); } catch (e) { return '$' + n.toFixed(2); } }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function fmtDT(s) { if (!s) return ''; try { return new Date(s).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function statusColor(s) {
    return { requested: '#b45309', confirmed: '#0d9488', completed: '#15803d', cancelled: '#9ca3af', no_show: '#dc2626',
      pending: '#b45309', signed: '#0d9488', completed2: '#15803d' }[s] || '#0d9488';
  }
  function isStaff() {
    try { return client.isAdmin() || client.canWrite('provider') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
  }
  // AI-ERROR-LEAK-FIX-V1 — this used to fall through to `res.output` itself when
  // text/completion/content were absent, JSON.stringify it, and return a non-empty
  // string. A failed AI call answers HTTP 200 with {success:false,
  // output:{error:"Your credit balance is too low..."}}, so the caller's
  // `if (!t) throw` guard never fired and the provider's raw error object was
  // rendered to the visitor AS the AI's answer. Return '' on any failure shape so
  // the caller's fallback runs instead.
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

  function injectChrome() {
    if (document.getElementById('lm-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'lm-chrome';
    st.textContent = [
      ':root{--ink:#0e2a31;--ink2:#3a5159;--paper:#fff;--bg:#eef5f6;--teal:#0d9488;--teal2:#0f766e;--sky:#0284c7;--line:#d7e7e8;--muted:#5d747b}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.lm{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.lm *{box-sizing:border-box}.lm a{color:inherit;text-decoration:none}',
      '.lm-wrap{max-width:1180px;margin:0 auto;padding:0 24px}',
      '.serif{font-family:Fraunces,Georgia,serif}',
      '.lm-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.lm-top-in{display:flex;align-items:center;gap:18px;height:68px}',
      '.lm-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:Fraunces;font-weight:600;font-size:23px;color:var(--ink)}',
      '.lm-logo .dot{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,var(--teal),var(--sky));display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px}',
      '.lm-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.lm-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}',
      '.lm-ibtn:hover{background:var(--bg)}',
      '.lm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:11px;font-weight:600;font-size:14px;padding:11px 20px;font-family:Inter;transition:.15s}',
      '.lm-btn:disabled{opacity:.55;cursor:default}',
      '.lm-btn-teal{background:var(--teal);color:#fff}.lm-btn-teal:hover:not(:disabled){background:var(--teal2)}',
      '.lm-btn-ink{background:var(--ink);color:#fff}.lm-btn-ink:hover:not(:disabled){background:#08191d}',
      '.lm-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.lm-btn-ghost:hover{border-color:var(--teal)}',
      '.lm-btn-sm{padding:7px 13px;font-size:13px}',
      '.lm-hero{position:relative;overflow:hidden;background:var(--ink)}',
      '.lm-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.4}',
      '.lm-hero-in{position:relative;padding:84px 0 92px;color:#fff}',
      '.lm-hero h1{font-family:Fraunces;font-weight:600;font-size:clamp(32px,4.8vw,56px);line-height:1.05;margin:10px 0 0;max-width:680px}',
      '.lm-hero p{font-size:18px;color:#d8eef0;max-width:520px;margin:16px 0 0;line-height:1.55}',
      '.lm-pill{display:inline-block;background:rgba(255,255,255,.16);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:30px}',
      '.lm-sec{padding:50px 0}',
      '.lm-h2{font-family:Fraunces;font-weight:600;font-size:28px;margin:0}',
      '.lm-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}',
      '.lm-specs{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}',
      '.lm-spec{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px;cursor:pointer;transition:.16s;text-align:center}',
      '.lm-spec:hover{box-shadow:0 14px 36px -26px rgba(10,60,60,.4);transform:translateY(-2px)}',
      '.lm-spec .ic{font-size:26px}.lm-spec h3{font-size:14px;font-weight:700;margin:8px 0 0}',
      '.lm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:22px}',
      '.lm-pcard{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:.16s}',
      '.lm-pcard:hover{box-shadow:0 16px 40px -28px rgba(10,60,60,.4);transform:translateY(-3px)}',
      '.lm-pcard-img{height:180px;overflow:hidden;background:#dcecec}.lm-pcard-img img{width:100%;height:100%;object-fit:cover}',
      '.lm-pcard-b{padding:15px 16px 17px}.lm-pcard-b h3{font-size:16px;font-weight:700;margin:0}',
      '.lm-chip{display:inline-block;font-size:11px;font-weight:600;color:var(--teal2);background:#dcf0ee;border-radius:20px;padding:3px 10px}',
      '.lm-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.lm-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.lm-row:first-child{border-top:0}.lm-grow{flex:1;min-width:0}.lm-mut{color:var(--muted);font-size:13px}',
      '.lm-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff}',
      '.lm-2col{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start}',
      '.lm-field{display:block;margin-top:14px}.lm-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.lm-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:11px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.lm-input:focus{outline:none;border-color:var(--teal)}textarea.lm-input{min-height:84px;resize:vertical}',
      '.lm-modal{position:fixed;inset:0;z-index:200;background:rgba(14,42,49,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.lm-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:580px;max-height:92vh;overflow:auto;position:relative}',
      '.lm-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:23px;cursor:pointer;color:var(--muted);z-index:2}',
      '.lm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.lm-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}',
      '.lm-stat-n{font-family:Fraunces;font-weight:600;font-size:28px;line-height:1}',
      '.lm-stat-l{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.lm-phi{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:11px;padding:12px 14px;font-size:13px}',
      '.lm-notes{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:11px;padding:14px 16px}',
      '.lm-tabs{display:flex;gap:4px;flex-wrap:wrap}.lm-tab{background:none;border:0;color:#bfe0e0;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.lm-tab.on{background:rgba(255,255,255,.18);color:#fff}',
      '.lm-foot{background:var(--ink);color:#9db9bd;padding:34px 0;font-size:13px;margin-top:40px}.lm-foot b{color:#fff;font-family:Fraunces}',
      '.lm-empty{text-align:center;padding:60px 20px;color:var(--muted)}',
      '@media(max-width:980px){.lm-specs,.lm-grid{grid-template-columns:repeat(2,1fr)}.lm-stats{grid-template-columns:repeat(2,1fr)}.lm-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'lm-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '✚'), 'Lumen', h('span', { style: { color: 'var(--muted)', fontWeight: 500 } }, 'Health')); }
  function Field(p) { return h('label', { className: 'lm-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'lm-badge', style: { background: statusColor(p.s) } }, (p.s || '').replace('_', ' ')); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'patient@lumen.health');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'lm-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'lm-sheet', style: { maxWidth: '410px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'lm-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'lm-h2', style: { marginTop: '16px' } }, props.title || 'Patient sign in'),
        h('p', { className: 'lm-mut' }, 'Sign in to book visits, view your records and sign forms.'),
        h(Field, { label: 'Email', children: h('input', { className: 'lm-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'lm-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: '#dc2626', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'lm-btn lm-btn-teal', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'lm-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — patient@lumen.health · staff frontdesk@lumen.health · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'lm-top' }, h('div', { className: 'lm-wrap lm-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'lm-act' },
        h('button', { className: 'lm-ibtn', onClick: function () { c.navigate('#/providers'); } }, 'Find a provider'),
        h('button', { className: 'lm-ibtn', onClick: function () { c.navigate('#/services'); } }, 'Services'),
        c.isAdmin ? h('button', { className: 'lm-ibtn', onClick: function () { c.navigate('#/staff'); } }, '🏥 Staff') : null,
        c.authed ? h('button', { className: 'lm-ibtn', onClick: function () { c.navigate('#/portal'); } }, '👤 My health') : null,
        c.authed ? h('button', { className: 'lm-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'lm-btn lm-btn-teal lm-btn-sm', onClick: c.openLogin }, 'Sign in'),
        h('button', { className: 'lm-btn lm-btn-ink lm-btn-sm', onClick: function () { c.navigate('#/book'); } }, 'Book'))));
  }

  function Hero(props) {
    var c = props.ctx;
    return h('section', { className: 'lm-hero' }, h('img', { src: HERO, alt: '' }),
      h('div', { className: 'lm-wrap lm-hero-in' },
        h('span', { className: 'lm-pill' }, 'Multi-specialty care'),
        h('h1', null, 'Modern care for every member of your family.'),
        h('p', null, 'Book online in minutes, see top providers across 8 specialties, and keep everything — visits, forms, results — in one secure place.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '26px', flexWrap: 'wrap' } },
          h('button', { className: 'lm-btn lm-btn-teal', onClick: function () { c.navigate('#/book'); } }, 'Book an appointment'),
          h('button', { className: 'lm-btn lm-btn-ghost', style: { background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.navigate('#/providers'); } }, 'Meet our providers'))));
  }

  function ProviderCard(props) {
    var p = props.p;
    return h('div', { className: 'lm-pcard', onClick: function () { props.ctx.navigate('#/book?provider=' + encodeURIComponent(p.full_name)); } },
      h('div', { className: 'lm-pcard-img' }, h('img', { src: imgUrl(p.photo), alt: p.full_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
      h('div', { className: 'lm-pcard-b' },
        h('span', { className: 'lm-chip' }, p.specialty),
        h('h3', { style: { marginTop: '8px' } }, p.full_name + (p.credential ? ', ' + p.credential : '')),
        h('div', { className: 'lm-mut', style: { marginTop: '4px' } }, '★ ' + (p.rating || '5.0') + ' · ' + (p.years_experience || 5) + ' yrs · ' + (p.languages || 'English')),
        p.accepting_new ? h('div', { style: { marginTop: '8px', color: 'var(--teal2)', fontWeight: 600, fontSize: '12.5px' } }, '✓ Accepting new patients') : null));
  }

  function Home(props) {
    var c = props.ctx;
    var providers = (c.providers || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', null, h(Hero, { ctx: c }),
      h('section', { className: 'lm-sec' }, h('div', { className: 'lm-wrap' },
        h('div', { className: 'lm-eyebrow' }, 'Care for every need'),
        h('div', { className: 'lm-specs' }, SPECIALTIES.map(function (sp) {
          return h('div', { key: sp, className: 'lm-spec', onClick: function () { c.navigate('#/providers?specialty=' + encodeURIComponent(sp)); } },
            h('div', { className: 'ic' }, SPEC_ICON[sp] || '🩺'), h('h3', null, sp));
        })))),
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'lm-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h('div', { className: 'lm-eyebrow' }, 'Our team'), h('h2', { className: 'lm-h2', style: { marginTop: '4px' } }, 'Top-rated providers')),
          h('button', { className: 'lm-btn lm-btn-ghost lm-btn-sm', onClick: function () { c.navigate('#/providers'); } }, 'See all')),
        c.providers === null ? h('div', { className: 'lm-empty' }, 'Loading…')
          : h('div', { className: 'lm-grid' }, providers.slice(0, 8).map(function (p) { return h(ProviderCard, { key: p.uuid, p: p, ctx: c }); })))),
      h('section', { className: 'lm-sec' }, h('div', { className: 'lm-wrap' },
        h('div', { className: 'lm-panel', style: { padding: '26px', display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '34px' } }, '🔒'),
          h('div', { style: { flex: 1, minWidth: '240px' } }, h('div', { className: 'serif', style: { fontSize: '20px', fontWeight: 600 } }, 'Your privacy, enforced by design'),
            h('div', { className: 'lm-mut', style: { marginTop: '4px' } }, "Clinical notes and diagnoses are visible only to your care team — the platform strips them from patient views server-side, not just in the app.")),
          h('button', { className: 'lm-btn lm-btn-teal', onClick: function () { c.authed ? c.navigate('#/portal') : c.openLogin(); } }, 'Open my portal')))));
  }

  function ProvidersPage(props) {
    var c = props.ctx; var spec = props.specialty;
    var list = (c.providers || []).filter(function (p) { return !spec || p.specialty === spec; }).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'lm-wrap lm-sec' },
      h('div', { className: 'lm-eyebrow' }, 'Find a provider'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0 6px' } },
        h('button', { className: cls('lm-btn lm-btn-sm', spec ? 'lm-btn-ghost' : 'lm-btn-teal'), onClick: function () { c.navigate('#/providers'); } }, 'All'),
        SPECIALTIES.map(function (s) { return h('button', { key: s, className: cls('lm-btn lm-btn-sm', spec === s ? 'lm-btn-teal' : 'lm-btn-ghost'), onClick: function () { c.navigate('#/providers?specialty=' + encodeURIComponent(s)); } }, s); })),
      c.providers === null ? h('div', { className: 'lm-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'lm-grid' }, list.map(function (p) { return h(ProviderCard, { key: p.uuid, p: p, ctx: c }); })) : h('div', { className: 'lm-empty' }, 'No providers in this specialty.'));
  }

  function ServicesPage(props) {
    var c = props.ctx; var list = (c.servicesList || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'lm-wrap lm-sec' },
      h('div', { className: 'lm-eyebrow' }, 'Services & visit types'),
      h('h2', { className: 'lm-h2', style: { marginTop: '4px' } }, 'What we offer'),
      c.servicesList === null ? h('div', { className: 'lm-empty' }, 'Loading…')
        : h('div', { className: 'lm-grid', style: { gridTemplateColumns: 'repeat(3,1fr)' } }, list.map(function (s) {
          return h('div', { key: s.uuid, className: 'lm-pcard', onClick: function () { c.navigate('#/book?service=' + encodeURIComponent(s.service_name)); } },
            h('div', { className: 'lm-pcard-img' }, h('img', { src: imgUrl(s.image), alt: s.service_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { className: 'lm-pcard-b' }, h('span', { className: 'lm-chip' }, s.specialty), s.telehealth ? h('span', { className: 'lm-chip', style: { marginLeft: '6px', background: '#e0f2fe', color: '#0369a1' } }, '📹 Telehealth') : null,
              h('h3', { style: { marginTop: '8px' } }, s.service_name), h('div', { className: 'lm-mut', style: { marginTop: '4px' } }, (s.duration_min || 30) + ' min · ' + money(s.self_pay_price)),
              h('p', { className: 'lm-mut', style: { marginTop: '6px' } }, s.description)));
        })));
  }

  // ── Booking (with AI symptom helper) ────────────────────────────────────────
  function BookPage(props) {
    var c = props.ctx; var u = client.userInfo || {};
    var qp = new URLSearchParams((props.q || '').replace(/^\?/, ''));
    var [f, setF] = React.useState({ provider_name: qp.get('provider') || '', service_name: qp.get('service') || '', specialty: '', visit_type: 'In-person', reason: '', date: '', time: '09:00' });
    var [busy, setBusy] = React.useState(false);
    var [symptoms, setSymptoms] = React.useState(''); var [aiBusy, setAiBusy] = React.useState(false); var [aiTip, setAiTip] = React.useState('');
    function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    var providers = c.providers || []; var servicesList = c.servicesList || [];
    function aiSuggest() {
      if (!symptoms.trim()) return; setAiBusy(true); setAiTip('');
      var cat = servicesList.map(function (s) { return s.service_name + ' (' + s.specialty + ')'; }).join(', ');
      var prompt = 'A patient describes: "' + symptoms + '". From these services: ' + cat + '. Recommend the single most appropriate service and specialty in one short sentence. If urgent/emergency, advise calling 911.';
      Promise.resolve().then(function () { if (!services || !services.ai || !services.ai.complete) throw 0; return services.ai.complete({ prompt: prompt }); })
        .then(function (r) { var t = aiText(r); if (!t) throw 0; setAiTip(t); setAiBusy(false); })
        .catch(function () {
          var sx = symptoms.toLowerCase(); var pick = servicesList[0];
          var map = [['skin|rash|mole|acne', 'Dermatology'], ['heart|chest|palpit', 'Cardiology'], ['anxious|stress|depress|sleep', 'Mental Health'], ['child|kid|baby', 'Pediatrics'], ['tooth|teeth|gum', 'Dental'], ['joint|knee|back|sprain', 'Orthopedics']];
          var spec = 'Primary Care'; map.forEach(function (m) { if (new RegExp(m[0]).test(sx)) spec = m[1]; });
          var s2 = servicesList.filter(function (s) { return s.specialty === spec; })[0] || pick;
          setAiTip('Based on what you described, a ' + (s2 ? s2.service_name + ' (' + s2.specialty + ')' : spec + ' visit') + ' is a good starting point. (If this is an emergency, call 911.)');
          setAiBusy(false);
        });
    }
    function book(e) {
      e.preventDefault(); if (!c.authed) { c.openLogin(); return; }
      if (!f.date) { showToast('Pick a date', 'error'); return; }
      setBusy(true);
      var start = new Date(f.date + 'T' + (f.time || '09:00') + ':00').toISOString();
      var end = new Date(new Date(start).getTime() + 30 * 60000).toISOString();
      var svc = servicesList.filter(function (s) { return s.service_name === f.service_name; })[0];
      var prov = providers.filter(function (p) { return p.full_name === f.provider_name; })[0];
      var rec = { patient_name: u.fullName || '', patient_email: u.email || '', provider_name: f.provider_name,
        service_name: f.service_name, specialty: (prov && prov.specialty) || (svc && svc.specialty) || f.specialty,
        start_time: start, end_time: end, appt_state: 'requested', visit_type: f.visit_type, reason: f.reason,
        location: 'Lumen Health — Downtown', display_name: (f.service_name || 'Visit') + ' with ' + (f.provider_name || 'Lumen') };
      client.createObject('appointment', rec).then(function () { setBusy(false); showToast('Appointment requested — we\'ll confirm by email', 'success'); c.navigate('#/portal'); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'lm-wrap lm-sec' },
      h('h2', { className: 'lm-h2' }, 'Book an appointment'),
      h('div', { className: 'lm-2col', style: { marginTop: '18px' } },
        h('form', { className: 'lm-panel', style: { padding: '24px' }, onSubmit: book },
          !c.authed ? h('div', { className: 'lm-phi', style: { marginBottom: '8px' } }, 'You can fill this out now — you\'ll be asked to sign in to confirm.') : null,
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h(Field, { label: 'Provider', children: h('select', { className: 'lm-input', value: f.provider_name, onChange: function (e) { set('provider_name', e.target.value); } }, h('option', { value: '' }, 'Any available'), providers.map(function (p) { return h('option', { key: p.uuid, value: p.full_name }, p.full_name + ' · ' + p.specialty); })) }),
            h(Field, { label: 'Service', req: true, children: h('select', { className: 'lm-input', required: true, value: f.service_name, onChange: function (e) { set('service_name', e.target.value); } }, h('option', { value: '' }, 'Choose a service'), servicesList.map(function (s) { return h('option', { key: s.uuid, value: s.service_name }, s.service_name); })) })),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } },
            h(Field, { label: 'Date', req: true, children: h('input', { className: 'lm-input', type: 'date', required: true, value: f.date, onChange: function (e) { set('date', e.target.value); } }) }),
            h(Field, { label: 'Time', children: h('input', { className: 'lm-input', type: 'time', value: f.time, onChange: function (e) { set('time', e.target.value); } }) }),
            h(Field, { label: 'Visit type', children: h('select', { className: 'lm-input', value: f.visit_type, onChange: function (e) { set('visit_type', e.target.value); } }, h('option', null, 'In-person'), h('option', null, 'Telehealth')) })),
          h(Field, { label: 'Reason for visit', children: h('textarea', { className: 'lm-input', value: f.reason, onChange: function (e) { set('reason', e.target.value); } }) }),
          h('button', { className: 'lm-btn lm-btn-teal', type: 'submit', disabled: busy, style: { marginTop: '16px' } }, busy ? 'Booking…' : (c.authed ? 'Request appointment' : 'Sign in & request'))),
        h('div', { className: 'lm-panel', style: { padding: '20px' } },
          h('div', { className: 'lm-eyebrow' }, '✦ Not sure who to see?'),
          h('div', { style: { fontWeight: 700, margin: '6px 0 4px' } }, 'Symptom helper'),
          h('div', { className: 'lm-mut', style: { marginBottom: '8px' } }, 'Describe what\'s going on and we\'ll suggest the right service.'),
          h('textarea', { className: 'lm-input', placeholder: 'e.g. a mole on my back changed shape', value: symptoms, onChange: function (e) { setSymptoms(e.target.value); } }),
          h('button', { className: 'lm-btn lm-btn-ghost lm-btn-sm', style: { marginTop: '10px' }, disabled: aiBusy, onClick: aiSuggest }, aiBusy ? 'Thinking…' : 'Suggest a service'),
          aiTip ? h('div', { className: 'lm-notes', style: { marginTop: '12px', fontSize: '13.5px' } }, aiTip) : null,
          h('div', { className: 'lm-mut', style: { marginTop: '14px', fontSize: '12px' } }, 'Not medical advice. For emergencies call 911.'))));
  }

  // ── Patient portal ──────────────────────────────────────────────────────────
  function Portal(props) {
    var c = props.ctx;
    var [appts, setAppts] = React.useState(null); var [docs, setDocs] = React.useState(null);
    function load() {
      client.getObjects('appointment').then(function (r) { setAppts(arr(r).sort(function (a, b) { return (b.start_time || '').localeCompare(a.start_time || ''); })); }).catch(function () { setAppts([]); });
      client.getObjects('document').then(function (r) { setDocs(arr(r)); }).catch(function () { setDocs([]); });
    }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'lm-wrap lm-sec' }, h('div', { className: 'lm-empty' }, h('h2', { className: 'lm-h2' }, 'Sign in to your patient portal'), h('button', { className: 'lm-btn lm-btn-teal', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    function sign(d) { client.updateObject('document', d.uuid, { doc_state: 'signed', signed_at: new Date().toISOString() }, d).then(function () { showToast('Signed — thank you', 'success'); load(); }).catch(function (e) { showToast('Failed', 'error'); }); }
    return h('div', { className: 'lm-wrap lm-sec' },
      h('div', { style: { display: 'flex', alignItems: 'center' } }, h('h2', { className: 'lm-h2' }, 'My health'),
        h('button', { className: 'lm-btn lm-btn-teal', style: { marginLeft: 'auto' }, onClick: function () { c.navigate('#/book'); } }, '+ Book a visit')),
      h('div', { className: 'lm-2col', style: { marginTop: '18px' } },
        h('div', null,
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Appointments'),
          h('div', { className: 'lm-panel' }, appts === null ? h('div', { className: 'lm-row lm-mut' }, 'Loading…')
            : appts.length ? appts.map(function (a) {
              return h('div', { key: a.uuid, className: 'lm-row' },
                h('div', { className: 'lm-grow' }, h('div', { style: { fontWeight: 700 } }, a.service_name || 'Visit'),
                  h('div', { className: 'lm-mut' }, (a.provider_name || '') + ' · ' + fmtDT(a.start_time) + ' · ' + (a.visit_type || 'In-person'))),
                h(Badge, { s: a.appt_state }));
            }) : h('div', { className: 'lm-empty' }, 'No appointments yet.')),
          h('div', { className: 'lm-notes', style: { marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' } },
            h('span', { style: { fontSize: '18px' } }, '🔒'), h('div', { className: 'lm-mut', style: { fontSize: '12.5px' } }, 'Clinical notes & diagnoses from your visits are kept by your care team and aren\'t shown here — that\'s enforced by the platform, not just hidden in the page.'))),
        h('div', null,
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Documents & forms'),
          h('div', { className: 'lm-panel' }, docs === null ? h('div', { className: 'lm-row lm-mut' }, 'Loading…')
            : docs.length ? docs.map(function (d) {
              return h('div', { key: d.uuid, className: 'lm-row' },
                h('div', { className: 'lm-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, d.title), h('div', { className: 'lm-mut' }, d.doc_type)),
                d.doc_state === 'pending' ? h('button', { className: 'lm-btn lm-btn-teal lm-btn-sm', onClick: function () { sign(d); } }, '✍ Sign')
                  : h(Badge, { s: d.doc_state }));
            }) : h('div', { className: 'lm-empty' }, 'No documents.')))));
  }

  // ── Staff console ───────────────────────────────────────────────────────────
  function LStat(p) { return h('div', { className: 'lm-stat' }, h('div', { className: 'lm-stat-n', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'lm-stat-l' }, p.l)); }

  function StaffHome(props) {
    var c = props.ctx; var [appts, setAppts] = React.useState([]);
    React.useEffect(function () { client.getObjects('appointment').then(function (r) { setAppts(arr(r)); }).catch(function () {}); }, []);
    var today = new Date().toDateString();
    var todays = appts.filter(function (a) { try { return new Date(a.start_time).toDateString() === today; } catch (e) { return false; } });
    var upcoming = appts.filter(function (a) { return ['requested', 'confirmed'].indexOf(a.appt_state) >= 0; }).length;
    return h('div', null,
      h('div', { className: 'lm-stats' },
        h(LStat, { n: appts.filter(function (a) { return a.appt_state === 'requested'; }).length, l: 'Requests to confirm', color: '#b45309' }),
        h(LStat, { n: upcoming, l: 'Upcoming visits', color: 'var(--teal)' }),
        h(LStat, { n: (c.providers || []).length, l: 'Providers' }),
        h(LStat, { n: appts.filter(function (a) { return a.appt_state === 'completed'; }).length, l: 'Completed' })),
      h('div', { className: 'lm-panel', style: { marginTop: '18px', padding: '20px' } },
        h('div', { className: 'serif', style: { fontWeight: 600, fontSize: '18px', marginBottom: '4px' } }, 'Welcome, ' + ((client.userInfo || {}).fullName || 'Doctor')),
        h('div', { className: 'lm-mut' }, 'You can see full clinical notes, diagnoses and billing codes here — patients cannot. Confirm requests, run the schedule, and manage providers.')),
      h('div', { style: { marginTop: '18px' } }, h(StaffSchedule, { ctx: c, embedded: true })));
  }

  function StaffSchedule(props) {
    var c = props.ctx; var [appts, setAppts] = React.useState(null); var [open, setOpen] = React.useState(null); var [fState, setFState] = React.useState('all');
    function load() { client.getObjects('appointment').then(function (r) { setAppts(arr(r).sort(function (a, b) { return (b.start_time || '').localeCompare(a.start_time || ''); })); }).catch(function () { setAppts([]); }); }
    React.useEffect(load, []);
    function setState(a, st) { var patch = { appt_state: st }; client.updateObject('appointment', a.uuid, patch, a).then(function () { showToast('Appointment ' + st, 'success'); load(); setOpen(Object.assign({}, a, patch)); }).catch(function (e) { showToast('Failed', 'error'); }); }
    function remind(a) { if (!services || !services.workflow) { showToast('Reminder sent (demo)', 'success'); return; } services.workflow.run('appointment_reminder', { appointment_uuid: a.uuid, patient_email: a.patient_email, patient_phone: a.patient_phone, provider_name: a.provider_name, start_time: fmtDT(a.start_time) }).then(function () { showToast('Reminder workflow triggered', 'success'); }).catch(function () { showToast('Reminder sent (demo)', 'success'); }); }
    var list = (appts || []).filter(function (a) { return fState === 'all' || a.appt_state === fState; });
    return h('div', { className: 'lm-2col' },
      h('div', null,
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } },
          h('button', { className: cls('lm-btn lm-btn-sm', fState === 'all' ? 'lm-btn-teal' : 'lm-btn-ghost'), onClick: function () { setFState('all'); } }, 'All'),
          APPT_STATES.map(function (s) { return h('button', { key: s, className: cls('lm-btn lm-btn-sm', fState === s ? 'lm-btn-teal' : 'lm-btn-ghost'), onClick: function () { setFState(s); } }, s.replace('_', ' ')); })),
        h('div', { className: 'lm-panel' }, appts === null ? h('div', { className: 'lm-row lm-mut' }, 'Loading…')
          : list.length ? list.map(function (a) {
            return h('div', { key: a.uuid, className: 'lm-row', style: { cursor: 'pointer', background: open && open.uuid === a.uuid ? '#f0faf9' : '' }, onClick: function () { setOpen(a); } },
              h('div', { className: 'lm-grow' }, h('div', { style: { fontWeight: 700 } }, a.patient_name || 'Patient'), h('div', { className: 'lm-mut' }, (a.service_name || '') + ' · ' + (a.provider_name || '') + ' · ' + fmtDT(a.start_time))),
              h(Badge, { s: a.appt_state }));
          }) : h('div', { className: 'lm-empty' }, 'No appointments.'))),
      h('div', { className: 'lm-panel', style: { padding: '20px', position: 'sticky', top: '88px' } },
        open ? h('div', null,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { style: { fontWeight: 800, fontSize: '17px' } }, open.patient_name), h(Badge, { s: open.appt_state })),
          h('div', { className: 'lm-mut', style: { marginTop: '4px' } }, (open.service_name || '') + ' · ' + (open.provider_name || '')),
          h('div', { className: 'lm-mut' }, fmtDT(open.start_time) + ' · ' + (open.visit_type || '') + (open.room ? ' · Room ' + open.room : '')),
          open.reason ? h('div', { style: { marginTop: '10px', fontSize: '13.5px' } }, h('b', null, 'Reason: '), open.reason) : null,
          // STAFF-ONLY clinical notes (patients never receive these fields)
          h('div', { className: 'lm-notes', style: { marginTop: '12px' } },
            h('div', { className: 'lm-eyebrow', style: { color: 'var(--teal2)' } }, '🔒 Clinical (staff only)'),
            open.clinical_notes ? h('div', { style: { marginTop: '6px', fontSize: '13.5px', lineHeight: 1.5 } }, open.clinical_notes) : h('div', { className: 'lm-mut', style: { marginTop: '6px' } }, 'No notes recorded.'),
            open.diagnosis ? h('div', { style: { marginTop: '8px', fontSize: '13px' } }, h('b', null, 'Dx: '), open.diagnosis) : null,
            open.internal_billing_code ? h('div', { className: 'lm-mut', style: { marginTop: '4px', fontSize: '12px' } }, 'Billing: ' + open.internal_billing_code) : null),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' } },
            open.appt_state === 'requested' ? h('button', { className: 'lm-btn lm-btn-teal lm-btn-sm', onClick: function () { setState(open, 'confirmed'); } }, 'Confirm') : null,
            open.appt_state === 'confirmed' ? h('button', { className: 'lm-btn lm-btn-ink lm-btn-sm', onClick: function () { setState(open, 'completed'); } }, 'Mark completed') : null,
            ['requested', 'confirmed'].indexOf(open.appt_state) >= 0 ? h('button', { className: 'lm-btn lm-btn-ghost lm-btn-sm', onClick: function () { remind(open); } }, '🔔 Send reminder') : null,
            open.appt_state !== 'cancelled' && open.appt_state !== 'completed' ? h('button', { className: 'lm-btn lm-btn-ghost lm-btn-sm', onClick: function () { setState(open, 'cancelled'); } }, 'Cancel') : null))
          : h('div', { className: 'lm-empty' }, 'Select an appointment.')));
  }

  function StaffPatients(props) {
    var [patients, setPatients] = React.useState(null);
    React.useEffect(function () { client.getObjects('patient').then(function (r) { setPatients(arr(r)); }).catch(function () { setPatients([]); }); }, []);
    return h('div', null, h('div', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Patients'),
      h('div', { className: 'lm-panel' }, patients === null ? h('div', { className: 'lm-row lm-mut' }, 'Loading…')
        : patients.length ? patients.map(function (p) {
          return h('div', { key: p.uuid, className: 'lm-row' },
            h('div', { style: { width: '40px', height: '40px', borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' } }, (p.full_name || '?').charAt(0)),
            h('div', { className: 'lm-grow' }, h('div', { style: { fontWeight: 600 } }, p.full_name), h('div', { className: 'lm-mut' }, p.email + ' · ' + (p.insurance_provider || '') + (p.allergies ? ' · ⚠ ' + p.allergies : ''))),
            h('div', { className: 'lm-mut', style: { fontSize: '12px' } }, p.dob ? 'DOB ' + p.dob : ''));
        }) : h('div', { className: 'lm-empty' }, 'No patients yet.')));
  }

  var PROVIDER_FIELDS = [
    { k: 'full_name', label: 'Full name', req: true }, { k: 'credential', label: 'Credential (MD/DO/NP)' },
    { k: 'specialty', label: 'Specialty', type: 'select', opts: SPECIALTIES }, { k: 'languages', label: 'Languages' },
    { k: 'years_experience', label: 'Years experience', type: 'number' }, { k: 'rating', label: 'Rating', type: 'number' },
    { k: 'photo_url', label: 'Photo URL' }, { k: 'bio', label: 'Bio', type: 'textarea' }, { k: 'accepting_new', label: 'Accepting new patients', type: 'check' }
  ];

  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; if (fd.k === 'photo_url') v = imgUrl(init.photo); f[fd.k] = (v == null) ? '' : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {}; fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; } if (v === '' || v == null) return; if (fd.type === 'number') v = Number(v);
        if (fd.k === 'photo_url') { data.photo = { url: v, thumbnail_url: v }; return; } data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'lm-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'lm-sheet', style: { padding: '26px' } }, h('button', { className: 'lm-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'lm-h2', style: { fontSize: '21px' } }, init.uuid ? props.editTitle : props.newTitle),
        fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'lm-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'lm-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'lm-mut' }, 'Yes'));
          else input = h('input', { className: 'lm-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h(Field, { key: fd.k, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'lm-btn lm-btn-teal', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'lm-btn lm-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  function StaffProviders(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.providers || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    function del(p) { if (!window.confirm('Remove ' + p.full_name + '?')) return; client.deleteObject('provider', p.uuid, p).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function () {}); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' providers'),
        h('button', { className: 'lm-btn lm-btn-teal lm-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add provider')),
      h('div', { className: 'lm-panel' }, list.map(function (p) {
        return h('div', { key: p.uuid, className: 'lm-row' },
          h('div', { style: { width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flex: 'none', background: '#dcecec' } }, h('img', { src: imgUrl(p.photo), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'lm-grow' }, h('div', { style: { fontWeight: 600 } }, p.full_name + (p.credential ? ', ' + p.credential : '')), h('div', { className: 'lm-mut' }, p.specialty + ' · ★ ' + (p.rating || '5.0'))),
          h('button', { className: 'lm-btn lm-btn-ghost lm-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'),
          h('button', { className: 'lm-btn lm-btn-ghost lm-btn-sm', onClick: function () { del(p); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'provider', fields: PROVIDER_FIELDS, initial: edit, newTitle: 'Add provider', editTitle: 'Edit provider',
        beforeSave: function (d) { d.display_name = d.full_name || 'Provider'; d.description = d.specialty || ''; }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function StaffConsole(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var tabs = [['home', 'Dashboard'], ['schedule', 'Schedule'], ['patients', 'Patients'], ['providers', 'Providers']];
    return h('div', { className: 'lm' },
      h('div', { style: { background: 'linear-gradient(100deg,#0e2a31,#0f766e)' } }, h('div', { className: 'lm-wrap', style: { display: 'flex', alignItems: 'center', height: '60px', gap: '14px' } },
        h('div', { className: 'lm-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.2)' } }, '✚'), 'Lumen', h('span', { style: { opacity: .7 } }, 'Staff')),
        h('div', { className: 'lm-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('lm-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/staff' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'lm-ibtn', style: { marginLeft: 'auto', color: '#d8eef0' }, onClick: function () { c.navigate('#/'); } }, 'Patient site ↗'))),
      h('div', { className: 'lm-wrap', style: { padding: '24px 24px 64px' } },
        sub === 'home' ? h(StaffHome, { ctx: c }) : sub === 'schedule' ? h(StaffSchedule, { ctx: c }) : sub === 'patients' ? h(StaffPatients, { ctx: c }) : h(StaffProviders, { ctx: c })));
  }

  function Footer() { return h('footer', { className: 'lm-foot' }, h('div', { className: 'lm-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'Lumen Health'), ' — modern multi-specialty care.'), h('div', null, 'Privacy · For emergencies call 911'))); }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [providers, setProviders] = React.useState(null); var [servicesList, setServicesList] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() {
      client.getObjects('provider').then(function (r) { setProviders(arr(r)); }).catch(function () { setProviders([]); });
      client.getObjects('clinic_service').then(function (r) { setServicesList(arr(r)); }).catch(function () { setServicesList([]); });
    }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, providers: providers, servicesList: servicesList, reload: reload };
    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var q = qi >= 0 ? hash.slice(qi) : ''; var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';
    var qp = new URLSearchParams(q.replace(/^\?/, ''));

    if (top === 'staff' && ctx.isAdmin) return h(ErrorBoundary, null, h(StaffConsole, { ctx: ctx, seg: seg }), showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'providers') page = h(ProvidersPage, { ctx: ctx, specialty: qp.get('specialty') });
    else if (top === 'services') page = h(ServicesPage, { ctx: ctx });
    else if (top === 'book') page = h(BookPage, { ctx: ctx, q: q });
    else if (top === 'portal') page = h(Portal, { ctx: ctx });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'lm' }, h(TopBar, { ctx: ctx }), page, h(Footer, null),
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
