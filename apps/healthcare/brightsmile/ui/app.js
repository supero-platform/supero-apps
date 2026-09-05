// ui/app.js — BrightSmile multi-location dental group (custom UI).
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, ErrorBoundary)
// come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var SPECIALTIES = ['General', 'Orthodontics', 'Periodontics', 'Endodontics', 'Pediatric', 'Oral Surgery', 'Cosmetic'];
  var SPEC_ICON = { 'General': '🦷', 'Orthodontics': '😬', 'Periodontics': '🪥', 'Endodontics': '🔬', 'Pediatric': '🧸', 'Oral Surgery': '🩺', 'Cosmetic': '✨' };
  var SERVICE_CATEGORIES = ['Preventive', 'Restorative', 'Cosmetic', 'Orthodontics', 'Surgical', 'Emergency'];
  var APPT_STATES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'];
  var HERO = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=2000&h=1100';

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return n === 0 ? 'No charge' : formatCurrency(n); } catch (e) { return '$' + n.toFixed(2); } }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function fmtDT(s) { if (!s) return ''; try { return new Date(s).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function dayKey(s) { try { return new Date(s).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); } catch (e) { return 'Unscheduled'; } }
  function statusColor(s) {
    return { requested: '#b45309', confirmed: '#0d9488', completed: '#15803d', cancelled: '#94a3b8', no_show: '#dc2626',
      proposed: '#b45309', accepted: '#0d9488', in_progress: '#0284c7', completed2: '#15803d' }[s] || '#0d9488';
  }
  function isStaff() {
    try { return client.isAdmin() || client.canWrite('dentist') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
  }
  // AI-ERROR-LEAK-FIX-V1 — this used to fall through to `res.output` itself when
  // text/completion/content were absent, JSON.stringify it, and return a non-empty
  // string. A failed AI call answers HTTP 200 with {success:false,
  // output:{error:"Your credit balance is too low..."}}, so the caller's
  // `if (!t) throw` guard never fired and the provider's raw error object was
  // rendered to the visitor AS the AI's answer. Return '' on any failure shape so
  // the caller's fallback runs instead.

  // SAGA-GUARD-V1 — one place where a workflow result is judged, so no call site
  // can forget. Rejects when the execute envelope says success:false, and also
  // when the saga itself reports a non-completed status or a failed step — a
  // `compensated` run has UNDONE its own work, so showing "done" would be the
  // opposite of the truth. Resolves unchanged on real success.
  function runSaga(workflowId, input) {
    if (!(services && services.workflow && services.workflow.run)) {
      return Promise.reject(new Error('workflow service unavailable'));
    }
    return Promise.resolve(services.workflow.run(workflowId, input)).then(function (res) {
      var r = res || {};
      var out = (r.output && typeof r.output === 'object') ? r.output : {};
      if (r.success === false || r.error || out.error) {
        throw new Error(String(r.error || out.error || (workflowId + ' failed')));
      }
      var st = out.status || '';
      if (st && st !== 'completed') throw new Error(out.error_message || (workflowId + ' ' + st));
      if (Number(out.steps_failed) > 0) {
        throw new Error(out.error_message || (out.steps_failed + ' step(s) failed in ' + workflowId));
      }
      return res;
    });
  }

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
    if (document.getElementById('bs-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'bs-chrome';
    st.textContent = [
      ':root{--ink:#0b3a3a;--ink2:#3a5a5a;--paper:#fff;--bg:#f1f8f7;--teal:#0d9488;--teal2:#0f766e;--mint:#5eead4;--sky:#0ea5e9;--line:#d6ebe8;--muted:#5f7d7a}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.bs{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.bs *{box-sizing:border-box}.bs a{color:inherit;text-decoration:none}',
      '.bs-wrap{max-width:1180px;margin:0 auto;padding:0 24px}',
      '.serif{font-family:Fraunces,Georgia,serif}',
      '.bs-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.93);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.bs-top-in{display:flex;align-items:center;gap:18px;height:68px}',
      '.bs-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:Fraunces;font-weight:700;font-size:23px;color:var(--ink)}',
      '.bs-logo .dot{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--mint));display:flex;align-items:center;justify-content:center;color:#063b38;font-size:16px}',
      '.bs-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.bs-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}',
      '.bs-ibtn:hover{background:var(--bg)}',
      '.bs-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:11px;font-weight:600;font-size:14px;padding:11px 20px;font-family:Inter;transition:.15s}',
      '.bs-btn:disabled{opacity:.55;cursor:default}',
      '.bs-btn-teal{background:var(--teal);color:#fff}.bs-btn-teal:hover:not(:disabled){background:var(--teal2)}',
      '.bs-btn-ink{background:var(--ink);color:#fff}.bs-btn-ink:hover:not(:disabled){background:#062b2b}',
      '.bs-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.bs-btn-ghost:hover{border-color:var(--teal)}',
      '.bs-btn-sm{padding:7px 13px;font-size:13px}',
      '.bs-hero{position:relative;overflow:hidden;background:#063b38}',
      '.bs-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.32}',
      '.bs-hero-in{position:relative;padding:88px 0 96px;color:#fff}',
      '.bs-hero h1{font-family:Fraunces;font-weight:600;font-size:clamp(34px,5vw,58px);line-height:1.04;margin:12px 0 0;max-width:700px}',
      '.bs-hero p{font-size:18px;color:#cdeeea;max-width:540px;margin:16px 0 0;line-height:1.55}',
      '.bs-pill{display:inline-block;background:rgba(94,234,212,.2);color:#bff5ec;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:30px}',
      '.bs-sec{padding:52px 0}',
      '.bs-h2{font-family:Fraunces;font-weight:600;font-size:29px;margin:0}',
      '.bs-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}',
      '.bs-specs{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}',
      '.bs-spec{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px;cursor:pointer;transition:.16s;text-align:center}',
      '.bs-spec:hover{box-shadow:0 14px 36px -26px rgba(8,80,75,.45);transform:translateY(-2px)}',
      '.bs-spec .ic{font-size:26px}.bs-spec h3{font-size:14px;font-weight:700;margin:8px 0 0}',
      '.bs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:22px}',
      '.bs-pcard{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:.16s}',
      '.bs-pcard:hover{box-shadow:0 16px 40px -28px rgba(8,80,75,.45);transform:translateY(-3px)}',
      '.bs-pcard-img{height:190px;overflow:hidden;background:#d7eeeb}.bs-pcard-img img{width:100%;height:100%;object-fit:cover}',
      '.bs-pcard-b{padding:15px 16px 17px}.bs-pcard-b h3{font-size:16px;font-weight:700;margin:0}',
      '.bs-chip{display:inline-block;font-size:11px;font-weight:600;color:var(--teal2);background:#d4f0ec;border-radius:20px;padding:3px 10px}',
      '.bs-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.bs-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.bs-row:first-child{border-top:0}.bs-grow{flex:1;min-width:0}.bs-mut{color:var(--muted);font-size:13px}',
      '.bs-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff}',
      '.bs-2col{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start}',
      '.bs-field{display:block;margin-top:14px}.bs-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.bs-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:11px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.bs-input:focus{outline:none;border-color:var(--teal)}textarea.bs-input{min-height:84px;resize:vertical}',
      '.bs-modal{position:fixed;inset:0;z-index:200;background:rgba(6,43,43,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.bs-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:580px;max-height:92vh;overflow:auto;position:relative}',
      '.bs-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:23px;cursor:pointer;color:var(--muted);z-index:2}',
      '.bs-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.bs-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}',
      '.bs-stat-n{font-family:Fraunces;font-weight:600;font-size:28px;line-height:1}',
      '.bs-stat-l{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.bs-bars{display:flex;align-items:flex-end;gap:14px;height:160px;padding:10px 4px 0}',
      '.bs-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}',
      '.bs-bar .b{width:100%;max-width:54px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--mint),var(--teal));transition:.3s}',
      '.bs-bar .v{font-weight:700;font-size:13px;margin-bottom:6px}.bs-bar .l{font-size:11px;color:var(--muted);margin-top:8px;text-align:center}',
      '.bs-notes{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:11px;padding:14px 16px}',
      '.bs-lock{background:#f0f9ff;border:1px solid #bae6fd;border-radius:11px;padding:12px 14px;font-size:13px;color:#075985}',
      '.bs-tabs{display:flex;gap:4px;flex-wrap:wrap}.bs-tab{background:none;border:0;color:#bfeae3;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.bs-tab.on{background:rgba(255,255,255,.2);color:#fff}',
      '.bs-foot{background:#063b38;color:#9ec9c4;padding:36px 0;font-size:13px;margin-top:40px}.bs-foot b{color:#fff;font-family:Fraunces}',
      '.bs-empty{text-align:center;padding:60px 20px;color:var(--muted)}',
      '.bs-daygrp{font-family:Fraunces;font-weight:600;font-size:15px;color:var(--ink);margin:18px 0 8px}',
      '.bs-sel{border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:8px 11px;font-size:13px;font-weight:600;color:var(--ink);font-family:Inter}',
      '@media(max-width:980px){.bs-specs,.bs-grid{grid-template-columns:repeat(2,1fr)}.bs-stats{grid-template-columns:repeat(2,1fr)}.bs-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'bs-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '🦷'), 'Bright', h('span', { style: { color: 'var(--teal)', fontWeight: 600 } }, 'Smile')); }
  function Field(p) { return h('label', { className: 'bs-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'bs-badge', style: { background: statusColor(p.s) } }, (p.s || '').replace(/_/g, ' ')); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'patient@brightsmile.dental');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'bs-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'bs-sheet', style: { maxWidth: '410px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'bs-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'bs-h2', style: { marginTop: '16px' } }, props.title || 'Patient sign in'),
        h('p', { className: 'bs-mut' }, 'Sign in to book visits, view appointments and accept treatment plans.'),
        h(Field, { label: 'Email', children: h('input', { className: 'bs-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'bs-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: '#dc2626', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'bs-btn bs-btn-teal', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'bs-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — patient@brightsmile.dental · staff frontdesk@brightsmile.dental · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'bs-top' }, h('div', { className: 'bs-wrap bs-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'bs-act' },
        h('button', { className: 'bs-ibtn', onClick: function () { c.navigate('#/dentists'); } }, 'Find a dentist'),
        h('button', { className: 'bs-ibtn', onClick: function () { c.navigate('#/services'); } }, 'Services'),
        h('button', { className: 'bs-ibtn', onClick: function () { c.navigate('#/locations'); } }, 'Locations'),
        c.isAdmin ? h('button', { className: 'bs-ibtn', onClick: function () { c.navigate('#/staff'); } }, '🏥 Staff') : null,
        c.authed ? h('button', { className: 'bs-ibtn', onClick: function () { c.navigate('#/portal'); } }, '👤 My care') : null,
        c.authed ? h('button', { className: 'bs-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'bs-btn bs-btn-teal bs-btn-sm', onClick: c.openLogin }, 'Sign in'),
        h('button', { className: 'bs-btn bs-btn-ink bs-btn-sm', onClick: function () { c.navigate('#/book'); } }, 'Book'))));
  }

  function Hero(props) {
    var c = props.ctx;
    return h('section', { className: 'bs-hero' }, h('img', { src: HERO, alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }),
      h('div', { className: 'bs-wrap bs-hero-in' },
        h('span', { className: 'bs-pill' }, 'Modern dental care, close to home'),
        h('h1', null, 'A brighter, healthier smile — right in your neighborhood.'),
        h('p', null, 'Book online in minutes across our four clinics, meet dentists across seven specialties, and keep your whole care plan in one secure place.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' } },
          h('button', { className: 'bs-btn bs-btn-teal', onClick: function () { c.navigate('#/book'); } }, 'Book an appointment'),
          h('button', { className: 'bs-btn bs-btn-ghost', style: { background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.navigate('#/dentists'); } }, 'Meet our dentists'))));
  }

  function DentistCard(props) {
    var p = props.p;
    return h('div', { className: 'bs-pcard', onClick: function () { props.ctx.navigate('#/book?dentist=' + encodeURIComponent(p.full_name)); } },
      h('div', { className: 'bs-pcard-img' }, h('img', { src: imgUrl(p.photo), alt: p.full_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
      h('div', { className: 'bs-pcard-b' },
        h('span', { className: 'bs-chip' }, p.specialty),
        h('h3', { style: { marginTop: '8px' } }, p.full_name + (p.credential ? ', ' + p.credential : '')),
        h('div', { className: 'bs-mut', style: { marginTop: '4px' } }, '★ ' + (p.rating || '5.0') + ' · ' + (p.languages || 'English')),
        p.location_name ? h('div', { className: 'bs-mut', style: { marginTop: '2px' } }, '📍 ' + (p.location_name || '').replace('BrightSmile — ', '')) : null,
        p.accepting_new ? h('div', { style: { marginTop: '8px', color: 'var(--teal2)', fontWeight: 600, fontSize: '12.5px' } }, '✓ Accepting new patients') : null));
  }

  function Home(props) {
    var c = props.ctx;
    var dentists = (c.dentists || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', null, h(Hero, { ctx: c }),
      h('section', { className: 'bs-sec' }, h('div', { className: 'bs-wrap' },
        h('div', { className: 'bs-eyebrow' }, 'Care for every smile'),
        h('div', { className: 'bs-specs' }, SPECIALTIES.map(function (sp) {
          return h('div', { key: sp, className: 'bs-spec', onClick: function () { c.navigate('#/dentists?specialty=' + encodeURIComponent(sp)); } },
            h('div', { className: 'ic' }, SPEC_ICON[sp] || '🦷'), h('h3', null, sp));
        })))),
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'bs-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h('div', { className: 'bs-eyebrow' }, 'Our team'), h('h2', { className: 'bs-h2', style: { marginTop: '4px' } }, 'Top-rated dentists')),
          h('button', { className: 'bs-btn bs-btn-ghost bs-btn-sm', onClick: function () { c.navigate('#/dentists'); } }, 'See all')),
        c.dentists === null ? h('div', { className: 'bs-empty' }, 'Loading…')
          : h('div', { className: 'bs-grid' }, dentists.slice(0, 8).map(function (p) { return h(DentistCard, { key: p.uuid, p: p, ctx: c }); })))),
      h('section', { className: 'bs-sec' }, h('div', { className: 'bs-wrap' },
        h('div', { className: 'bs-panel', style: { padding: '26px', display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '34px' } }, '🔒'),
          h('div', { style: { flex: 1, minWidth: '240px' } }, h('div', { className: 'serif', style: { fontSize: '20px', fontWeight: 600 } }, 'Your privacy, enforced by design'),
            h('div', { className: 'bs-mut', style: { marginTop: '4px' } }, "Your dentist's chart notes and diagnoses are visible only to your care team — the platform strips them from patient views server-side, not just in the app.")),
          h('button', { className: 'bs-btn bs-btn-teal', onClick: function () { c.authed ? c.navigate('#/portal') : c.openLogin(); } }, 'Open my portal')))));
  }

  function DentistsPage(props) {
    var c = props.ctx; var spec = props.specialty;
    var list = (c.dentists || []).filter(function (p) { return !spec || p.specialty === spec; }).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'bs-wrap bs-sec' },
      h('div', { className: 'bs-eyebrow' }, 'Find a dentist'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0 6px' } },
        h('button', { className: cls('bs-btn bs-btn-sm', spec ? 'bs-btn-ghost' : 'bs-btn-teal'), onClick: function () { c.navigate('#/dentists'); } }, 'All'),
        SPECIALTIES.map(function (s) { return h('button', { key: s, className: cls('bs-btn bs-btn-sm', spec === s ? 'bs-btn-teal' : 'bs-btn-ghost'), onClick: function () { c.navigate('#/dentists?specialty=' + encodeURIComponent(s)); } }, s); })),
      c.dentists === null ? h('div', { className: 'bs-empty' }, 'Loading…')
        : list.length ? h('div', { className: 'bs-grid' }, list.map(function (p) { return h(DentistCard, { key: p.uuid, p: p, ctx: c }); })) : h('div', { className: 'bs-empty' }, 'No dentists in this specialty.'));
  }

  function ServicesPage(props) {
    var c = props.ctx; var [cat, setCat] = React.useState('all');
    var list = (c.servicesList || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }).filter(function (s) { return cat === 'all' || s.category === cat; });
    return h('div', { className: 'bs-wrap bs-sec' },
      h('div', { className: 'bs-eyebrow' }, 'Services & treatments'),
      h('h2', { className: 'bs-h2', style: { marginTop: '4px' } }, 'What we offer'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '14px 0 4px' } },
        h('button', { className: cls('bs-btn bs-btn-sm', cat === 'all' ? 'bs-btn-teal' : 'bs-btn-ghost'), onClick: function () { setCat('all'); } }, 'All'),
        SERVICE_CATEGORIES.map(function (cc) { return h('button', { key: cc, className: cls('bs-btn bs-btn-sm', cat === cc ? 'bs-btn-teal' : 'bs-btn-ghost'), onClick: function () { setCat(cc); } }, cc); })),
      c.servicesList === null ? h('div', { className: 'bs-empty' }, 'Loading…')
        : h('div', { className: 'bs-grid', style: { gridTemplateColumns: 'repeat(3,1fr)' } }, list.map(function (s) {
          return h('div', { key: s.uuid, className: 'bs-pcard', onClick: function () { c.navigate('#/book?service=' + encodeURIComponent(s.service_name)); } },
            h('div', { className: 'bs-pcard-img' }, h('img', { src: imgUrl(s.image), alt: s.service_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { className: 'bs-pcard-b' }, h('span', { className: 'bs-chip' }, s.category),
              h('h3', { style: { marginTop: '8px' } }, s.service_name), h('div', { className: 'bs-mut', style: { marginTop: '4px' } }, (s.duration_min || 30) + ' min · ' + money(s.price)),
              h('p', { className: 'bs-mut', style: { marginTop: '6px' } }, s.description)));
        })));
  }

  function LocationsPage(props) {
    var c = props.ctx; var list = (c.locations || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'bs-wrap bs-sec' },
      h('div', { className: 'bs-eyebrow' }, 'Our clinics'),
      h('h2', { className: 'bs-h2', style: { marginTop: '4px' } }, 'Find a BrightSmile near you'),
      c.locations === null ? h('div', { className: 'bs-empty' }, 'Loading…')
        : h('div', { className: 'bs-grid', style: { gridTemplateColumns: 'repeat(2,1fr)' } }, list.map(function (lo) {
          return h('div', { key: lo.uuid, className: 'bs-pcard', onClick: function () { c.navigate('#/book?location=' + encodeURIComponent(lo.name)); } },
            h('div', { className: 'bs-pcard-img', style: { height: '210px' } }, h('img', { src: imgUrl(lo.image), alt: lo.name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { className: 'bs-pcard-b' }, h('span', { className: 'bs-chip' }, lo.neighborhood || ''),
              h('h3', { style: { marginTop: '8px' } }, (lo.name || '').replace('BrightSmile — ', '')),
              h('div', { className: 'bs-mut', style: { marginTop: '4px' } }, '📍 ' + (lo.address || '')),
              h('div', { className: 'bs-mut', style: { marginTop: '2px' } }, '📞 ' + (lo.phone || '') + ' · 🕗 ' + (lo.hours || ''))));
        })));
  }

  // ── Booking (with AI symptom helper) ────────────────────────────────────────
  function BookPage(props) {
    var c = props.ctx; var u = client.userInfo || {};
    var qp = new URLSearchParams((props.q || '').replace(/^\?/, ''));
    var [f, setF] = React.useState({ dentist_name: qp.get('dentist') || '', service_name: qp.get('service') || '', location_name: qp.get('location') || '', reason: '', date: '', time: '09:00' });
    var [busy, setBusy] = React.useState(false);
    var [symptoms, setSymptoms] = React.useState(''); var [aiBusy, setAiBusy] = React.useState(false); var [aiTip, setAiTip] = React.useState('');
    function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    var dentists = c.dentists || []; var servicesList = c.servicesList || []; var locations = c.locations || [];
    function aiSuggest() {
      if (!symptoms.trim()) return; setAiBusy(true); setAiTip('');
      var cat = servicesList.map(function (s) { return s.service_name + ' (' + s.category + ')'; }).join(', ');
      var prompt = 'A dental patient describes: "' + symptoms + '". From these services: ' + cat + '. Recommend the single most appropriate service and category in one short sentence. If it sounds like a dental emergency (severe pain, swelling, trauma), advise booking the Emergency Toothache Visit or calling the clinic.';
      Promise.resolve().then(function () { if (!services || !services.ai || !services.ai.complete) throw 0; return services.ai.complete({ prompt: prompt }); })
        .then(function (r) { var t = aiText(r); if (!t) throw 0; setAiTip(t); setAiBusy(false); })
        .catch(function () {
          var sx = symptoms.toLowerCase(); var pick = servicesList[0];
          var map = [['pain|ache|hurt|throb|swell|broke|broken|chipped|knock', 'Emergency'], ['white|whiten|bright|stain|yellow', 'Cosmetic'], ['veneer|smile|gap|shape', 'Cosmetic'], ['crook|crowd|straight|align|braces|invisalign', 'Orthodontics'], ['wisdom|extract|pull|remove', 'Surgical'], ['clean|checkup|check-up|exam|plaque|tartar', 'Preventive'], ['cavity|filling|hole|sensitive|crown|chip', 'Restorative']];
          var category = 'Preventive'; map.forEach(function (m) { if (new RegExp(m[0]).test(sx)) category = m[1]; });
          var s2 = servicesList.filter(function (s) { return s.category === category; })[0] || pick;
          setAiTip('Based on what you described, a ' + (s2 ? s2.service_name + ' (' + s2.category + ')' : category + ' visit') + ' is a good starting point. (For severe pain or swelling, book an Emergency Toothache Visit or call us.)');
          setAiBusy(false);
        });
    }
    function book(e) {
      e.preventDefault(); if (!c.authed) { c.openLogin(); return; }
      if (!f.service_name) { showToast('Choose a service', 'error'); return; }
      if (!f.date) { showToast('Pick a date', 'error'); return; }
      setBusy(true);
      var start = new Date(f.date + 'T' + (f.time || '09:00') + ':00').toISOString();
      var svc = servicesList.filter(function (s) { return s.service_name === f.service_name; })[0];
      var dur = (svc && svc.duration_min) || 45;
      var end = new Date(new Date(start).getTime() + dur * 60000).toISOString();
      var den = dentists.filter(function (p) { return p.full_name === f.dentist_name; })[0];
      var loc = f.location_name || (den && den.location_name) || (locations[0] && locations[0].name) || 'BrightSmile';
      var rec = { patient_name: u.fullName || '', patient_email: u.email || '', patient_phone: '',
        dentist_name: f.dentist_name, service_name: f.service_name, location_name: loc,
        start_time: start, end_time: end, appt_state: 'requested', reason: f.reason,
        owner_username: u.email || '', display_name: (f.service_name || 'Visit') + ' with ' + (f.dentist_name || 'BrightSmile') };
      client.createObject('appointment', rec).then(function () { setBusy(false); showToast('Appointment requested — we\'ll confirm by email', 'success'); c.navigate('#/portal'); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'bs-wrap bs-sec' },
      h('h2', { className: 'bs-h2' }, 'Book an appointment'),
      h('div', { className: 'bs-2col', style: { marginTop: '18px' } },
        h('form', { className: 'bs-panel', style: { padding: '24px' }, onSubmit: book },
          !c.authed ? h('div', { className: 'bs-lock', style: { marginBottom: '8px' } }, 'You can fill this out now — you\'ll be asked to sign in to confirm.') : null,
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h(Field, { label: 'Dentist', children: h('select', { className: 'bs-input', value: f.dentist_name, onChange: function (e) { set('dentist_name', e.target.value); } }, h('option', { value: '' }, 'Any available'), dentists.map(function (p) { return h('option', { key: p.uuid, value: p.full_name }, p.full_name + ' · ' + p.specialty); })) }),
            h(Field, { label: 'Service', req: true, children: h('select', { className: 'bs-input', required: true, value: f.service_name, onChange: function (e) { set('service_name', e.target.value); } }, h('option', { value: '' }, 'Choose a service'), servicesList.map(function (s) { return h('option', { key: s.uuid, value: s.service_name }, s.service_name); })) })),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } },
            h(Field, { label: 'Location', children: h('select', { className: 'bs-input', value: f.location_name, onChange: function (e) { set('location_name', e.target.value); } }, h('option', { value: '' }, 'Nearest clinic'), locations.map(function (lo) { return h('option', { key: lo.uuid, value: lo.name }, (lo.name || '').replace('BrightSmile — ', '')); })) }),
            h(Field, { label: 'Date', req: true, children: h('input', { className: 'bs-input', type: 'date', required: true, value: f.date, onChange: function (e) { set('date', e.target.value); } }) }),
            h(Field, { label: 'Time', children: h('input', { className: 'bs-input', type: 'time', value: f.time, onChange: function (e) { set('time', e.target.value); } }) })),
          h(Field, { label: 'Reason for visit', children: h('textarea', { className: 'bs-input', value: f.reason, onChange: function (e) { set('reason', e.target.value); } }) }),
          h('button', { className: 'bs-btn bs-btn-teal', type: 'submit', disabled: busy, style: { marginTop: '16px' } }, busy ? 'Booking…' : (c.authed ? 'Request appointment' : 'Sign in & request'))),
        h('div', { className: 'bs-panel', style: { padding: '20px' } },
          h('div', { className: 'bs-eyebrow' }, '✦ Not sure what you need?'),
          h('div', { style: { fontWeight: 700, margin: '6px 0 4px' } }, 'Symptom helper'),
          h('div', { className: 'bs-mut', style: { marginBottom: '8px' } }, 'Describe what\'s going on and we\'ll suggest the right service.'),
          h('textarea', { className: 'bs-input', placeholder: 'e.g. my back tooth aches when I drink something cold', value: symptoms, onChange: function (e) { setSymptoms(e.target.value); } }),
          h('button', { className: 'bs-btn bs-btn-ghost bs-btn-sm', style: { marginTop: '10px' }, disabled: aiBusy, onClick: aiSuggest }, aiBusy ? 'Thinking…' : 'Suggest a service'),
          aiTip ? h('div', { className: 'bs-notes', style: { marginTop: '12px', fontSize: '13.5px' } }, aiTip) : null,
          h('div', { className: 'bs-mut', style: { marginTop: '14px', fontSize: '12px' } }, 'Not medical advice. For a dental emergency, call your nearest clinic.'))));
  }

  // ── Patient portal ──────────────────────────────────────────────────────────
  function Portal(props) {
    var c = props.ctx;
    var [appts, setAppts] = React.useState(null); var [treatments, setTreatments] = React.useState(null);
    function load() {
      client.getObjects('appointment').then(function (r) { setAppts(arr(r).sort(function (a, b) { return (b.start_time || '').localeCompare(a.start_time || ''); })); }).catch(function () { setAppts([]); });
      client.getObjects('treatment').then(function (r) { setTreatments(arr(r)); }).catch(function () { setTreatments([]); });
    }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'bs-wrap bs-sec' }, h('div', { className: 'bs-empty' }, h('h2', { className: 'bs-h2' }, 'Sign in to your patient portal'), h('button', { className: 'bs-btn bs-btn-teal', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    function accept(t) {
      client.updateObject('treatment', t.uuid, { treatment_state: 'accepted' }, t).then(function () {
        showToast('Treatment accepted — our team will be in touch', 'success'); load();
        if (services && services.workflow && services.workflow.run) {
          runSaga('treatment_accepted', { patient_email: t.patient_email || (client.userInfo || {}).email, treatment_name: t.name, dentist_name: t.dentist_name, cost: String(t.cost || '') }).catch(function () {});
        }
      }).catch(function () { showToast('Failed', 'error'); });
    }
    return h('div', { className: 'bs-wrap bs-sec' },
      h('div', { style: { display: 'flex', alignItems: 'center' } }, h('h2', { className: 'bs-h2' }, 'My care'),
        h('button', { className: 'bs-btn bs-btn-teal', style: { marginLeft: 'auto' }, onClick: function () { c.navigate('#/book'); } }, '+ Book a visit')),
      h('div', { className: 'bs-2col', style: { marginTop: '18px' } },
        h('div', null,
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'My appointments'),
          h('div', { className: 'bs-panel' }, appts === null ? h('div', { className: 'bs-row bs-mut' }, 'Loading…')
            : appts.length ? appts.map(function (a) {
              return h('div', { key: a.uuid, className: 'bs-row' },
                h('div', { className: 'bs-grow' }, h('div', { style: { fontWeight: 700 } }, a.service_name || 'Visit'),
                  h('div', { className: 'bs-mut' }, (a.dentist_name || 'Any dentist') + ' · ' + fmtDT(a.start_time) + ' · ' + (a.location_name || '').replace('BrightSmile — ', ''))),
                h(Badge, { s: a.appt_state }));
            }) : h('div', { className: 'bs-empty' }, 'No appointments yet.')),
          h('div', { className: 'bs-lock', style: { marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' } },
            h('span', { style: { fontSize: '18px' } }, '🔒'), h('div', { style: { fontSize: '12.5px' } }, 'Clinical notes are kept by your care team and aren\'t shown here — that\'s enforced by the platform, not just hidden in the page.'))),
        h('div', null,
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'My treatment plans'),
          h('div', { className: 'bs-panel' }, treatments === null ? h('div', { className: 'bs-row bs-mut' }, 'Loading…')
            : treatments.length ? treatments.map(function (t) {
              return h('div', { key: t.uuid, className: 'bs-row' },
                h('div', { className: 'bs-grow' }, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, t.name), h('div', { className: 'bs-mut' }, (t.tooth ? t.tooth + ' · ' : '') + money(t.cost) + (t.dentist_name ? ' · ' + t.dentist_name : ''))),
                t.treatment_state === 'proposed' ? h('button', { className: 'bs-btn bs-btn-teal bs-btn-sm', onClick: function () { accept(t); } }, 'Accept')
                  : h(Badge, { s: t.treatment_state }));
            }) : h('div', { className: 'bs-empty' }, 'No treatment plans yet.')),
          h('div', { className: 'bs-mut', style: { marginTop: '10px', fontSize: '12.5px' } }, 'Accepting a plan lets us reach out to schedule it — no payment is taken here.'))));
  }

  // ── Staff console ───────────────────────────────────────────────────────────
  function BStat(p) { return h('div', { className: 'bs-stat' }, h('div', { className: 'bs-stat-n', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'bs-stat-l' }, p.l)); }

  function locShort(s) { return (s || '').replace('BrightSmile — ', '') || 'All locations'; }

  function StaffHome(props) {
    var c = props.ctx; var [appts, setAppts] = React.useState([]);
    React.useEffect(function () { client.getObjects('appointment').then(function (r) { setAppts(arr(r)); }).catch(function () {}); }, []);
    var loc = c.staffLoc;
    var scoped = appts.filter(function (a) { return loc === 'all' || a.location_name === loc; });
    var today = new Date().toDateString();
    var todays = scoped.filter(function (a) { try { return new Date(a.start_time).toDateString() === today && a.appt_state !== 'cancelled'; } catch (e) { return false; } });
    var requests = scoped.filter(function (a) { return a.appt_state === 'requested'; });
    var locs = (c.locations || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var byLoc = locs.map(function (lo) { return { label: locShort(lo.name), value: appts.filter(function (a) { return a.location_name === lo.name && ['requested', 'confirmed'].indexOf(a.appt_state) >= 0; }).length }; });
    var maxV = Math.max.apply(null, byLoc.map(function (b) { return b.value; }).concat([1]));
    return h('div', null,
      h('div', { className: 'bs-stats' },
        h(BStat, { n: requests.length, l: 'Requests to confirm', color: '#b45309' }),
        h(BStat, { n: todays.length, l: 'On today\'s schedule', color: 'var(--teal)' }),
        h(BStat, { n: (c.dentists || []).filter(function (d) { return loc === 'all' || d.location_name === loc; }).length, l: 'Dentists' }),
        h(BStat, { n: scoped.filter(function (a) { return a.appt_state === 'completed'; }).length, l: 'Completed visits' })),
      h('div', { className: 'bs-2col', style: { marginTop: '18px' } },
        h('div', { className: 'bs-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Today at ' + locShort(loc)),
          todays.length ? todays.slice().sort(function (a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); }).map(function (a) {
            return h('div', { key: a.uuid, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: '13.5px' } },
              h('span', null, h('b', null, fmtDT(a.start_time).split(',').pop().trim()), ' · ' + (a.patient_name || 'Patient') + ' · ' + (a.service_name || '')), h(Badge, { s: a.appt_state }));
          }) : h('div', { className: 'bs-mut', style: { marginTop: '6px' } }, 'No visits scheduled today — a quiet day at the clinic.')),
        h('div', { className: 'bs-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Open visits by location'),
          h('div', { className: 'bs-bars' }, byLoc.map(function (b) {
            return h('div', { key: b.label, className: 'bs-bar' }, h('div', { className: 'v' }, b.value),
              h('div', { className: 'b', style: { height: Math.max(4, (b.value / maxV) * 120) + 'px' } }), h('div', { className: 'l' }, b.label));
          })))),
      h('div', { className: 'bs-panel', style: { marginTop: '18px', padding: '20px' } },
        h('div', { className: 'serif', style: { fontWeight: 600, fontSize: '18px', marginBottom: '4px' } }, 'Welcome, ' + ((client.userInfo || {}).fullName || 'Doctor')),
        h('div', { className: 'bs-mut' }, 'You can see full chart notes and diagnoses here — patients cannot. Confirm requests, run the schedule, send reminders, and manage dentists, services and locations.')));
  }

  function StaffSchedule(props) {
    var c = props.ctx; var [appts, setAppts] = React.useState(null); var [open, setOpen] = React.useState(null); var [fState, setFState] = React.useState('all');
    function load() { client.getObjects('appointment').then(function (r) { setAppts(arr(r).sort(function (a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); })); }).catch(function () { setAppts([]); }); }
    React.useEffect(load, []);
    function setState(a, st) { var patch = { appt_state: st }; client.updateObject('appointment', a.uuid, patch, a).then(function () { showToast('Appointment ' + st, 'success'); load(); setOpen(Object.assign({}, a, patch)); }).catch(function () { showToast('Failed', 'error'); }); }
    function remind(a) {
      if (!services || !services.workflow) { showToast('Reminder service unavailable — nothing was sent.', 'error'); return; }
      runSaga('appointment_reminder', { appointment_uuid: a.uuid, patient_email: a.patient_email, patient_phone: a.patient_phone, dentist_name: a.dentist_name, location_name: a.location_name, start_time: fmtDT(a.start_time) })
        .then(function () { showToast('Reminder sent', 'success'); }).catch(function (err) { showToast('Reminder NOT sent — ' + ((err && err.message) || 'workflow error'), 'error'); });
    }
    var loc = c.staffLoc;
    var list = (appts || []).filter(function (a) { return (fState === 'all' || a.appt_state === fState) && (loc === 'all' || a.location_name === loc); });
    // group by day
    var groups = []; var seen = {};
    list.forEach(function (a) { var k = dayKey(a.start_time); if (!seen[k]) { seen[k] = []; groups.push(k); } seen[k].push(a); });
    return h('div', { className: 'bs-2col' },
      h('div', null,
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } },
          h('button', { className: cls('bs-btn bs-btn-sm', fState === 'all' ? 'bs-btn-teal' : 'bs-btn-ghost'), onClick: function () { setFState('all'); } }, 'All'),
          APPT_STATES.map(function (s) { return h('button', { key: s, className: cls('bs-btn bs-btn-sm', fState === s ? 'bs-btn-teal' : 'bs-btn-ghost'), onClick: function () { setFState(s); } }, s.replace('_', ' ')); })),
        appts === null ? h('div', { className: 'bs-panel' }, h('div', { className: 'bs-row bs-mut' }, 'Loading…'))
          : groups.length ? groups.map(function (gk) {
            return h('div', { key: gk }, h('div', { className: 'bs-daygrp' }, gk),
              h('div', { className: 'bs-panel' }, seen[gk].map(function (a) {
                return h('div', { key: a.uuid, className: 'bs-row', style: { cursor: 'pointer', background: open && open.uuid === a.uuid ? '#eafaf8' : '' }, onClick: function () { setOpen(a); } },
                  h('div', { className: 'bs-grow' }, h('div', { style: { fontWeight: 700 } }, a.patient_name || 'Patient'), h('div', { className: 'bs-mut' }, (a.service_name || '') + ' · ' + (a.dentist_name || '') + ' · ' + fmtDT(a.start_time).split(',').pop().trim() + ' · ' + locShort(a.location_name))),
                  h(Badge, { s: a.appt_state }));
              })));
          }) : h('div', { className: 'bs-panel' }, h('div', { className: 'bs-empty' }, 'No appointments match.'))),
      h('div', { className: 'bs-panel', style: { padding: '20px', position: 'sticky', top: '88px' } },
        open ? h('div', null,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { style: { fontWeight: 800, fontSize: '17px' } }, open.patient_name), h(Badge, { s: open.appt_state })),
          h('div', { className: 'bs-mut', style: { marginTop: '4px' } }, (open.service_name || '') + ' · ' + (open.dentist_name || '')),
          h('div', { className: 'bs-mut' }, fmtDT(open.start_time) + ' · ' + locShort(open.location_name)),
          open.patient_email ? h('div', { className: 'bs-mut' }, '✉ ' + open.patient_email + (open.patient_phone ? ' · ☎ ' + open.patient_phone : '')) : null,
          open.reason ? h('div', { style: { marginTop: '10px', fontSize: '13.5px' } }, h('b', null, 'Reason: '), open.reason) : null,
          // STAFF-ONLY chart notes (patients never receive these fields)
          h('div', { className: 'bs-notes', style: { marginTop: '12px' } },
            h('div', { className: 'bs-eyebrow', style: { color: 'var(--teal2)' } }, '🔒 Chart notes (staff only)'),
            open.chart_notes ? h('div', { style: { marginTop: '6px', fontSize: '13.5px', lineHeight: 1.5 } }, open.chart_notes) : h('div', { className: 'bs-mut', style: { marginTop: '6px' } }, 'No chart notes recorded yet.'),
            open.diagnosis ? h('div', { style: { marginTop: '8px', fontSize: '13px' } }, h('b', null, 'Dx: '), open.diagnosis) : null),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' } },
            open.appt_state === 'requested' ? h('button', { className: 'bs-btn bs-btn-teal bs-btn-sm', onClick: function () { setState(open, 'confirmed'); } }, 'Confirm') : null,
            open.appt_state === 'confirmed' ? h('button', { className: 'bs-btn bs-btn-ink bs-btn-sm', onClick: function () { setState(open, 'completed'); } }, 'Mark completed') : null,
            ['requested', 'confirmed'].indexOf(open.appt_state) >= 0 ? h('button', { className: 'bs-btn bs-btn-ghost bs-btn-sm', onClick: function () { remind(open); } }, '🔔 Send reminder') : null,
            open.appt_state !== 'cancelled' && open.appt_state !== 'completed' ? h('button', { className: 'bs-btn bs-btn-ghost bs-btn-sm', onClick: function () { setState(open, 'cancelled'); } }, 'Cancel') : null))
          : h('div', { className: 'bs-empty' }, 'Select an appointment to view chart notes and take action.')));
  }

  function StaffPatients(props) {
    var [patients, setPatients] = React.useState(null);
    React.useEffect(function () { client.getObjects('patient').then(function (r) { setPatients(arr(r)); }).catch(function () { setPatients([]); }); }, []);
    return h('div', null, h('div', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Patients'),
      h('div', { className: 'bs-panel' }, patients === null ? h('div', { className: 'bs-row bs-mut' }, 'Loading…')
        : patients.length ? patients.map(function (p) {
          return h('div', { key: p.uuid, className: 'bs-row' },
            h('div', { style: { width: '40px', height: '40px', borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' } }, (p.full_name || '?').charAt(0)),
            h('div', { className: 'bs-grow' }, h('div', { style: { fontWeight: 600 } }, p.full_name), h('div', { className: 'bs-mut' }, p.email + ' · ' + (p.insurance_provider || 'Self-pay') + (p.location_name ? ' · ' + locShort(p.location_name) : ''))),
            h('div', { className: 'bs-mut', style: { fontSize: '12px' } }, p.dob ? 'DOB ' + p.dob : ''));
        }) : h('div', { className: 'bs-empty' }, 'No patients yet.')));
  }

  // generic edit modal for dentists / services / locations
  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; if (fd.k === 'photo_url') v = imgUrl(init.photo); else if (fd.k === 'image_url') v = imgUrl(init.image); f[fd.k] = (v == null) ? '' : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {}; fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; } if (v === '' || v == null) return; if (fd.type === 'number') v = Number(v);
        if (fd.k === 'photo_url') { data.photo = { url: v, thumbnail_url: v }; return; }
        if (fd.k === 'image_url') { data.image = { url: v, thumbnail_url: v }; return; } data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'bs-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'bs-sheet', style: { padding: '26px' } }, h('button', { className: 'bs-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'bs-h2', style: { fontSize: '21px' } }, init.uuid ? props.editTitle : props.newTitle),
        fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'bs-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'bs-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'bs-mut' }, 'Yes'));
          else input = h('input', { className: 'bs-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h(Field, { key: fd.k, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'bs-btn bs-btn-teal', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'bs-btn bs-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  var DENTIST_FIELDS = [
    { k: 'full_name', label: 'Full name', req: true }, { k: 'credential', label: 'Credential (DDS/DMD)' },
    { k: 'specialty', label: 'Specialty', type: 'select', opts: SPECIALTIES },
    { k: 'location_name', label: 'Location' }, { k: 'languages', label: 'Languages' },
    { k: 'rating', label: 'Rating', type: 'number' }, { k: 'photo_url', label: 'Photo URL' },
    { k: 'bio', label: 'Bio', type: 'textarea' }, { k: 'accepting_new', label: 'Accepting new patients', type: 'check' }
  ];
  var SERVICE_FIELDS = [
    { k: 'service_name', label: 'Service name', req: true }, { k: 'category', label: 'Category', type: 'select', opts: SERVICE_CATEGORIES },
    { k: 'price', label: 'Price (USD)', type: 'number' }, { k: 'duration_min', label: 'Duration (min)', type: 'number' },
    { k: 'image_url', label: 'Image URL' }, { k: 'description', label: 'Description', type: 'textarea' }
  ];
  var LOCATION_FIELDS = [
    { k: 'name', label: 'Clinic name', req: true }, { k: 'neighborhood', label: 'Neighborhood' },
    { k: 'address', label: 'Address' }, { k: 'phone', label: 'Phone' }, { k: 'hours', label: 'Hours' },
    { k: 'image_url', label: 'Image URL' }
  ];

  function CrudList(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (props.items || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    function del(it) { if (!window.confirm('Remove ' + (it.display_name || it.full_name || it.service_name || it.name) + '?')) return; client.deleteObject(props.schema, it.uuid, it).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function () { showToast('Failed', 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' ' + props.noun),
        h('button', { className: 'bs-btn bs-btn-teal bs-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ ' + props.addLabel)),
      h('div', { className: 'bs-panel' }, list.length ? list.map(function (it) {
        return h('div', { key: it.uuid, className: 'bs-row' },
          props.image ? h('div', { style: { width: '46px', height: '46px', borderRadius: props.round ? '50%' : '10px', overflow: 'hidden', flex: 'none', background: '#d7eeeb' } }, h('img', { src: imgUrl(it[props.image]), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })) : null,
          h('div', { className: 'bs-grow' }, h('div', { style: { fontWeight: 600 } }, props.title(it)), h('div', { className: 'bs-mut' }, props.subtitle(it))),
          h('button', { className: 'bs-btn bs-btn-ghost bs-btn-sm', onClick: function () { setEdit(it); } }, 'Edit'),
          h('button', { className: 'bs-btn bs-btn-ghost bs-btn-sm', onClick: function () { del(it); } }, '✕'));
      }) : h('div', { className: 'bs-empty' }, 'Nothing here yet.')),
      edit !== null ? h(EditModal, { schema: props.schema, fields: props.fields, initial: edit, newTitle: props.newTitle, editTitle: props.editTitle,
        beforeSave: props.beforeSave, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function StaffDentists(props) {
    var c = props.ctx;
    return h(CrudList, { ctx: c, schema: 'dentist', items: c.dentists, noun: 'dentists', addLabel: 'Add dentist', newTitle: 'Add dentist', editTitle: 'Edit dentist',
      fields: DENTIST_FIELDS, image: 'photo', round: true,
      title: function (it) { return it.full_name + (it.credential ? ', ' + it.credential : ''); },
      subtitle: function (it) { return it.specialty + ' · ★ ' + (it.rating || '5.0') + ' · ' + locShort(it.location_name); },
      beforeSave: function (d) { d.display_name = (d.full_name || 'Dentist') + (d.credential ? ', ' + d.credential : ''); d.description = d.specialty || ''; } });
  }
  function StaffServices(props) {
    var c = props.ctx;
    return h(CrudList, { ctx: c, schema: 'dental_service', items: c.servicesList, noun: 'services', addLabel: 'Add service', newTitle: 'Add service', editTitle: 'Edit service',
      fields: SERVICE_FIELDS, image: 'image', round: false,
      title: function (it) { return it.service_name; },
      subtitle: function (it) { return it.category + ' · ' + (it.duration_min || 30) + ' min · ' + money(it.price); },
      beforeSave: function (d) { d.display_name = d.service_name || 'Service'; if (!d.description) d.description = d.category || ''; } });
  }
  function StaffLocations(props) {
    var c = props.ctx;
    return h(CrudList, { ctx: c, schema: 'location', items: c.locations, noun: 'locations', addLabel: 'Add location', newTitle: 'Add location', editTitle: 'Edit location',
      fields: LOCATION_FIELDS, image: 'image', round: false,
      title: function (it) { return (it.name || '').replace('BrightSmile — ', ''); },
      subtitle: function (it) { return (it.neighborhood ? it.neighborhood + ' · ' : '') + (it.address || ''); },
      beforeSave: function (d) { d.display_name = d.name || 'Location'; d.description = (d.neighborhood || '') + ' · ' + (d.address || ''); } });
  }

  function StaffConsole(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var tabs = [['home', 'Dashboard'], ['schedule', 'Schedule'], ['patients', 'Patients'], ['services', 'Services'], ['dentists', 'Dentists'], ['locations', 'Locations']];
    var locs = (c.locations || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'bs' },
      h('div', { style: { background: 'linear-gradient(100deg,#063b38,#0f766e)' } }, h('div', { className: 'bs-wrap', style: { display: 'flex', alignItems: 'center', height: '62px', gap: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'bs-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.22)', color: '#fff' } }, '🦷'), 'BrightSmile', h('span', { style: { opacity: .75 } }, 'Staff')),
        h('div', { className: 'bs-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('bs-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/staff' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('select', { className: 'bs-sel', style: { marginLeft: 'auto' }, value: c.staffLoc, onChange: function (e) { c.setStaffLoc(e.target.value); } },
          h('option', { value: 'all' }, '📍 All locations'), locs.map(function (lo) { return h('option', { key: lo.uuid, value: lo.name }, locShort(lo.name)); })),
        h('button', { className: 'bs-ibtn', style: { color: '#d8f0ec' }, onClick: function () { c.navigate('#/'); } }, 'Patient site ↗'))),
      h('div', { className: 'bs-wrap', style: { padding: '24px 24px 64px' } },
        sub === 'schedule' ? h(StaffSchedule, { ctx: c }) : sub === 'patients' ? h(StaffPatients, { ctx: c }) : sub === 'services' ? h(StaffServices, { ctx: c }) : sub === 'dentists' ? h(StaffDentists, { ctx: c }) : sub === 'locations' ? h(StaffLocations, { ctx: c }) : h(StaffHome, { ctx: c })));
  }

  function Footer() { return h('footer', { className: 'bs-foot' }, h('div', { className: 'bs-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'BrightSmile'), ' — modern dental care, close to home.'), h('div', null, 'Tribeca · Park Slope · SoMa · Marina'))); }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [dentists, setDentists] = React.useState(null); var [servicesList, setServicesList] = React.useState(null); var [locations, setLocations] = React.useState(null);
    var [staffLoc, setStaffLoc] = React.useState('all');
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() {
      client.getObjects('dentist').then(function (r) { setDentists(arr(r)); }).catch(function () { setDentists([]); });
      client.getObjects('dental_service').then(function (r) { setServicesList(arr(r)); }).catch(function () { setServicesList([]); });
      client.getObjects('location').then(function (r) { setLocations(arr(r)); }).catch(function () { setLocations([]); });
    }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, dentists: dentists, servicesList: servicesList, locations: locations,
      staffLoc: staffLoc, setStaffLoc: setStaffLoc, reload: reload };
    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var q = qi >= 0 ? hash.slice(qi) : ''; var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';
    var qp = new URLSearchParams(q.replace(/^\?/, ''));

    if (top === 'staff' && ctx.isAdmin) return h(ErrorBoundary, null, h(StaffConsole, { ctx: ctx, seg: seg }), showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'dentists') page = h(DentistsPage, { ctx: ctx, specialty: qp.get('specialty') });
    else if (top === 'services') page = h(ServicesPage, { ctx: ctx });
    else if (top === 'locations') page = h(LocationsPage, { ctx: ctx });
    else if (top === 'book') page = h(BookPage, { ctx: ctx, q: q });
    else if (top === 'portal') page = h(Portal, { ctx: ctx });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'bs' }, h(TopBar, { ctx: ctx }), page, h(Footer, null),
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
