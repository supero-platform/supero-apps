// ui/app.js — TrialCore enterprise CTMS (custom UI).
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, ErrorBoundary)
// come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'];
  var AREAS = ['Oncology', 'Cardiology', 'Neurology', 'Immunology', 'Endocrinology', 'Infectious Disease', 'Respiratory', 'Rare Disease'];
  var AREA_ICON = { 'Oncology': '🧫', 'Cardiology': '❤️', 'Neurology': '🧠', 'Immunology': '🛡️', 'Endocrinology': '🧬', 'Infectious Disease': '🦠', 'Respiratory': '🫁', 'Rare Disease': '🧩' };
  var TRIAL_STATES = ['planning', 'recruiting', 'active', 'paused', 'completed', 'terminated'];
  var PARTICIPANT_STATES = ['screening', 'enrolled', 'active', 'completed', 'withdrawn', 'screen_failed'];
  var VISIT_STATES = ['scheduled', 'completed', 'missed', 'out_of_window'];
  var AE_STATES = ['reported', 'under_review', 'resolved', 'ongoing'];
  var SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'];
  var SAFETY_EMAIL = 'safety@trialcore.io';
  var COORDINATOR_EMAIL = 'coordinator@trialcore.io';
  var SPONSOR_EMAIL = 'sponsor@trialcore.io';
  var HERO = 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=2000&h=1100';

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function num(n) { n = Number(n) || 0; return n.toLocaleString(); }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function pct(a, b) { a = Number(a) || 0; b = Number(b) || 0; return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0; }
  function cap(s) { return (s || '').replace(/_/g, ' '); }
  function statusColor(s) {
    return {
      planning: '#64748b', recruiting: '#0891b2', active: '#0d9488', paused: '#d97706', completed: '#475569', terminated: '#dc2626',
      pending: '#d97706', on_hold: '#d97706', closed: '#94a3b8',
      screening: '#0891b2', enrolled: '#6366f1', withdrawn: '#94a3b8', screen_failed: '#dc2626',
      scheduled: '#0891b2', missed: '#dc2626', out_of_window: '#d97706',
      reported: '#0891b2', under_review: '#d97706', resolved: '#0d9488', ongoing: '#dc2626',
      mild: '#0d9488', moderate: '#d97706', severe: '#ea580c', life_threatening: '#dc2626',
      draft: '#94a3b8', approved: '#0d9488', expired: '#dc2626'
    }[s] || '#475569';
  }
  function isStaff() {
    try { return client.isAdmin() || client.canWrite('site') || client.canWrite('trial_document') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
  }
  function isCoordinator() {
    try { return client.isAuthenticated() && (client.canWrite('participant') || client.can('read', 'participant')); } catch (e) { return false; }
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
    if (document.getElementById('tc-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'tc-chrome';
    st.textContent = [
      ':root{--ink:#0b1424;--ink2:#334155;--paper:#fff;--bg:#eef2f8;--navy:#101a30;--navy2:#1c2c4c;--teal:#0d9488;--teal2:#0f766e;--cyan:#0891b2;--green:#0d9488;--amber:#d97706;--red:#dc2626;--line:#dde4ef;--muted:#5e6b82}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.tc{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.tc *{box-sizing:border-box}.tc a{color:inherit;text-decoration:none}',
      '.tc-wrap{max-width:1240px;margin:0 auto;padding:0 24px}',
      '.gro{font-family:"Space Grotesk",Inter,sans-serif}',
      '.num{font-variant-numeric:tabular-nums}',
      '.tc-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.tc-top-in{display:flex;align-items:center;gap:16px;height:64px}',
      '.tc-logo{display:flex;align-items:center;gap:10px;cursor:pointer;font-family:"Space Grotesk";font-weight:700;font-size:20px;color:var(--ink);letter-spacing:-.01em}',
      '.tc-logo .dot{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--navy),var(--cyan));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px}',
      '.tc-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.tc-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}.tc-ibtn:hover{background:var(--bg)}',
      '.tc-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;border:0;border-radius:10px;font-weight:600;font-size:14px;padding:10px 18px;font-family:Inter;transition:.15s}',
      '.tc-btn:disabled{opacity:.55;cursor:default}',
      '.tc-btn-teal{background:var(--teal);color:#fff}.tc-btn-teal:hover:not(:disabled){background:var(--teal2)}',
      '.tc-btn-navy{background:var(--navy);color:#fff}.tc-btn-navy:hover:not(:disabled){background:#08101f}',
      '.tc-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.tc-btn-ghost:hover{border-color:var(--teal)}',
      '.tc-btn-red{background:var(--red);color:#fff}.tc-btn-red:hover:not(:disabled){background:#b91c1c}',
      '.tc-btn-sm{padding:7px 12px;font-size:13px}',
      '.tc-hero{position:relative;overflow:hidden;background:var(--navy)}',
      '.tc-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.26}',
      '.tc-hero-in{position:relative;padding:78px 0 86px;color:#fff}',
      '.tc-hero h1{font-family:"Space Grotesk";font-weight:700;font-size:clamp(32px,4.8vw,54px);line-height:1.05;margin:12px 0 0;max-width:720px;letter-spacing:-.02em}',
      '.tc-hero p{font-size:18px;color:#c4d2e8;max-width:560px;margin:16px 0 0;line-height:1.55}',
      '.tc-pill{display:inline-block;background:rgba(255,255,255,.14);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:30px}',
      '.tc-herostat{display:flex;gap:34px;margin-top:34px;flex-wrap:wrap}',
      '.tc-herostat b{display:block;font-family:"Space Grotesk";font-weight:700;font-size:28px}',
      '.tc-herostat span{font-size:12px;color:#9fb1cd;letter-spacing:.05em;text-transform:uppercase}',
      '.tc-sec{padding:48px 0}',
      '.tc-h2{font-family:"Space Grotesk";font-weight:700;font-size:26px;margin:0;letter-spacing:-.01em}',
      '.tc-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}',
      '.tc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:22px}',
      '.tc-tcard{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:.16s;display:flex;flex-direction:column}',
      '.tc-tcard:hover{box-shadow:0 18px 44px -30px rgba(16,26,48,.5);transform:translateY(-3px)}',
      '.tc-tcard-img{height:160px;overflow:hidden;background:#dbe4f0;position:relative}.tc-tcard-img img{width:100%;height:100%;object-fit:cover}',
      '.tc-tcard-ph{position:absolute;top:12px;left:12px;background:rgba(11,20,36,.82);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:.04em}',
      '.tc-tcard-b{padding:16px 17px 18px;flex:1;display:flex;flex-direction:column}.tc-tcard-b h3{font-size:16px;font-weight:700;margin:0;line-height:1.3}',
      '.tc-chip{display:inline-block;font-size:11px;font-weight:600;color:var(--teal2);background:#d8f0ed;border-radius:20px;padding:3px 10px}',
      '.tc-chip-area{color:#1e3a8a;background:#dbeafe}',
      '.tc-meter{height:7px;border-radius:6px;background:#e6ebf4;overflow:hidden;margin-top:6px}.tc-meter i{display:block;height:100%;background:linear-gradient(90deg,var(--teal),var(--cyan))}',
      '.tc-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.tc-panel-h{padding:16px 20px;border-bottom:1px solid var(--line);font-weight:700;display:flex;align-items:center;gap:10px}',
      '.tc-row{display:flex;align-items:center;gap:14px;padding:13px 18px;border-top:1px solid var(--line)}',
      '.tc-row:first-child{border-top:0}.tc-grow{flex:1;min-width:0}.tc-mut{color:var(--muted);font-size:13px}',
      '.tc-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff;white-space:nowrap}',
      '.tc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.tc-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}',
      '.tc-stat-n{font-family:"Space Grotesk";font-weight:700;font-size:27px;line-height:1}',
      '.tc-stat-l{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:8px}',
      '.tc-stat-d{font-size:12px;font-weight:600;margin-top:4px}',
      '.tc-charts{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}',
      '.tc-bars{display:flex;align-items:flex-end;gap:12px;height:178px;padding:10px 4px 0}',
      '.tc-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}',
      '.tc-bar .stk{width:100%;max-width:54px;display:flex;flex-direction:column;justify-content:flex-end;border-radius:7px 7px 0 0;overflow:hidden}',
      '.tc-bar .v{font-weight:700;font-size:12px;margin-bottom:6px}.tc-bar .l{font-size:11px;color:var(--muted);margin-top:8px;text-align:center;line-height:1.2}',
      '.tc-funnel{display:flex;flex-direction:column;gap:9px;padding:6px 2px}',
      '.tc-fbar{display:flex;align-items:center;gap:10px}.tc-fbar .fl{width:96px;font-size:12px;color:var(--ink2);text-transform:capitalize;text-align:right;flex:none}',
      '.tc-fbar .ft{flex:1;height:22px;border-radius:6px;background:#eef2f8;overflow:hidden}.tc-fbar .ft i{display:block;height:100%;border-radius:6px}',
      '.tc-fbar .fv{width:34px;font-weight:700;font-size:13px;text-align:right;flex:none}',
      '.tc-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px;font-size:12px;color:var(--muted)}',
      '.tc-legend span{display:inline-flex;align-items:center;gap:6px}.tc-legend i{width:11px;height:11px;border-radius:3px;display:inline-block}',
      '.tc-field{display:block;margin-top:14px}.tc-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.tc-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.tc-input:focus{outline:none;border-color:var(--teal)}textarea.tc-input{min-height:80px;resize:vertical}',
      '.tc-modal{position:fixed;inset:0;z-index:200;background:rgba(11,20,36,.6);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.tc-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:600px;max-height:92vh;overflow:auto;position:relative}',
      '.tc-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:23px;cursor:pointer;color:var(--muted);z-index:2}',
      '.tc-2col{display:grid;grid-template-columns:1fr 360px;gap:20px;align-items:start}',
      '.tc-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}',
      '.tc-tabs{display:flex;gap:3px;flex-wrap:wrap}.tc-tab{background:none;border:0;color:#9fb1cd;cursor:pointer;font-size:14px;font-weight:600;padding:8px 13px;border-radius:9px}.tc-tab.on{background:rgba(255,255,255,.16);color:#fff}',
      '.tc-foot{background:var(--navy);color:#9fb1cd;padding:34px 0;font-size:13px;margin-top:40px}.tc-foot b{color:#fff;font-family:"Space Grotesk"}',
      '.tc-empty{text-align:center;padding:56px 20px;color:var(--muted)}',
      '.tc-tag{display:inline-block;font-size:11px;font-weight:600;color:var(--ink2);background:#eef2f8;border-radius:6px;padding:2px 8px}',
      '.tc-serious{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:2px 9px;font-size:11px;font-weight:700}',
      '.tc-note{background:#f0fdfa;border:1px solid #99f6e4;border-radius:11px;padding:14px 16px}',
      '.tc-table-h{display:flex;align-items:center;gap:14px;padding:10px 18px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}',
      '@media(max-width:1000px){.tc-grid{grid-template-columns:repeat(2,1fr)}.tc-stats{grid-template-columns:repeat(2,1fr)}.tc-charts{grid-template-columns:1fr}.tc-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'tc-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '🧬'), 'TrialCore'); }
  function Field(p) { return h('label', { className: 'tc-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'tc-badge', style: { background: statusColor(p.s) } }, cap(p.s)); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'cra@trialcore.io');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'tc-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'tc-sheet', style: { maxWidth: '420px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'tc-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'tc-h2', style: { marginTop: '16px' } }, props.title || 'Sign in to TrialCore'),
        h('p', { className: 'tc-mut' }, 'Sponsors & CRAs get the full CTMS console; site coordinators get their site view.'),
        h(Field, { label: 'Email', children: h('input', { className: 'tc-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'tc-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: 'var(--red)', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'tc-btn tc-btn-teal', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'tc-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — CRA cra@trialcore.io · coordinator coordinator@trialcore.io · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'tc-top' }, h('div', { className: 'tc-wrap tc-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'tc-act' },
        h('button', { className: 'tc-ibtn', onClick: function () { c.navigate('#/studies'); } }, 'Find a study'),
        c.isAdmin ? h('button', { className: 'tc-ibtn', onClick: function () { c.navigate('#/console'); } }, '🩺 CTMS console') : null,
        (c.authed && !c.isAdmin) ? h('button', { className: 'tc-ibtn', onClick: function () { c.navigate('#/site'); } }, '🏥 My site') : null,
        c.authed ? h('button', { className: 'tc-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'tc-btn tc-btn-teal tc-btn-sm', onClick: c.openLogin }, 'Sign in'))));
  }

  // ── Public: Find a Study registry ────────────────────────────────────────────
  function recruiting(trials) { return (trials || []).filter(function (t) { return t.trial_state === 'recruiting' || t.trial_state === 'active'; }); }

  function Hero(props) {
    var c = props.ctx; var trials = c.trials || [];
    var rec = recruiting(trials).length;
    var enrolled = trials.reduce(function (s, t) { return s + (Number(t.enrolled) || 0); }, 0);
    return h('section', { className: 'tc-hero' }, h('img', { src: HERO, alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }),
      h('div', { className: 'tc-wrap tc-hero-in' },
        h('span', { className: 'tc-pill' }, 'Clinical Trial Management'),
        h('h1', null, 'Run every trial, every site, in one place.'),
        h('p', null, 'TrialCore is the enterprise CTMS for sponsors and CROs — track enrollment, sites, participants, visits and safety across your whole portfolio with a live operations console.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' } },
          h('button', { className: 'tc-btn tc-btn-teal', onClick: function () { c.navigate('#/studies'); } }, 'Browse open studies'),
          h('button', { className: 'tc-btn tc-btn-ghost', style: { background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.isAdmin ? c.navigate('#/console') : c.openLogin(); } }, c.isAdmin ? 'Open the console' : 'Staff sign in')),
        h('div', { className: 'tc-herostat' },
          h('div', null, h('b', { className: 'num' }, trials.length || '—'), h('span', null, 'Trials')),
          h('div', null, h('b', { className: 'num' }, rec || '—'), h('span', null, 'Recruiting / active')),
          h('div', null, h('b', { className: 'num' }, num(enrolled) || '—'), h('span', null, 'Participants enrolled')))));
  }

  function TrialCard(props) {
    var t = props.t; var p = pct(t.enrolled, t.enrollment_target);
    return h('div', { className: 'tc-tcard', onClick: function () { props.ctx.navigate('#/studies/' + encodeURIComponent(t.trial_code)); } },
      h('div', { className: 'tc-tcard-img' }, h('img', { src: imgUrl(t.image), alt: t.title, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
        h('span', { className: 'tc-tcard-ph' }, t.phase || 'Trial')),
      h('div', { className: 'tc-tcard-b' },
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          h('span', { className: 'tc-chip tc-chip-area' }, (AREA_ICON[t.therapeutic_area] || '🧬') + ' ' + (t.therapeutic_area || '')),
          h(Badge, { s: t.trial_state })),
        h('h3', { style: { marginTop: '10px' } }, t.title),
        h('div', { className: 'tc-mut', style: { marginTop: '4px' } }, (t.trial_code || '') + ' · ' + (t.sponsor || '')),
        h('div', { style: { marginTop: 'auto', paddingTop: '14px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' } },
            h('span', { className: 'tc-mut' }, 'Enrollment'), h('span', { className: 'num', style: { fontWeight: 700 } }, num(t.enrolled) + ' / ' + num(t.enrollment_target) + ' (' + p + '%)')),
          h('div', { className: 'tc-meter' }, h('i', { style: { width: p + '%' } })))));
  }

  function StudiesPage(props) {
    var c = props.ctx; var [area, setArea] = React.useState(''); var [phase, setPhase] = React.useState('');
    var list = (c.trials || []).filter(function (t) {
      return (t.trial_state === 'recruiting' || t.trial_state === 'active' || t.trial_state === 'planning') &&
        (!area || t.therapeutic_area === area) && (!phase || t.phase === phase);
    }).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'tc-wrap tc-sec' },
      h('div', { className: 'tc-eyebrow' }, 'Clinical trial registry'),
      h('h2', { className: 'tc-h2', style: { marginTop: '4px' } }, 'Find a study'),
      h('p', { className: 'tc-mut', style: { maxWidth: '600px', marginTop: '6px' } }, 'Browse our open and active clinical trials. Filter by therapeutic area or phase, then express your interest to a study team.'),
      h('div', { className: 'tc-filters', style: { marginTop: '18px' } },
        h('button', { className: cls('tc-btn tc-btn-sm', area ? 'tc-btn-ghost' : 'tc-btn-teal'), onClick: function () { setArea(''); } }, 'All areas'),
        AREAS.map(function (a) { return h('button', { key: a, className: cls('tc-btn tc-btn-sm', area === a ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setArea(a); } }, a); })),
      h('div', { className: 'tc-filters' },
        h('button', { className: cls('tc-btn tc-btn-sm', phase ? 'tc-btn-ghost' : 'tc-btn-navy'), onClick: function () { setPhase(''); } }, 'All phases'),
        PHASES.map(function (p) { return h('button', { key: p, className: cls('tc-btn tc-btn-sm', phase === p ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setPhase(p); } }, p); })),
      c.trials === null ? h('div', { className: 'tc-empty' }, 'Loading studies…')
        : list.length ? h('div', { className: 'tc-grid' }, list.map(function (t) { return h(TrialCard, { key: t.uuid, t: t, ctx: c }); }))
          : h('div', { className: 'tc-empty' }, 'No matching studies. Try a different filter.'));
  }

  function StudyDetail(props) {
    var c = props.ctx; var code = props.code;
    var t = (c.trials || []).filter(function (x) { return x.trial_code === code; })[0];
    var [done, setDone] = React.useState(false); var [name, setName] = React.useState(''); var [emailV, setEmailV] = React.useState('');
    if (c.trials === null) return h('div', { className: 'tc-wrap tc-sec' }, h('div', { className: 'tc-empty' }, 'Loading…'));
    if (!t) return h('div', { className: 'tc-wrap tc-sec' }, h('div', { className: 'tc-empty' }, h('h2', { className: 'tc-h2' }, 'Study not found'), h('button', { className: 'tc-btn tc-btn-ghost', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/studies'); } }, '← Back to studies')));
    var p = pct(t.enrolled, t.enrollment_target);
    function express(e) {
      e.preventDefault(); if (!name.trim() || !emailV.trim()) { showToast('Add your name and email', 'error'); return; }
      setDone(true); showToast('Interest registered — a study coordinator will be in touch', 'success');
    }
    return h('div', { className: 'tc-wrap tc-sec' },
      h('button', { className: 'tc-ibtn', style: { paddingLeft: 0 }, onClick: function () { c.navigate('#/studies'); } }, '← All studies'),
      h('div', { className: 'tc-2col', style: { marginTop: '10px' } },
        h('div', null,
          h('div', { className: 'tc-panel', style: { overflow: 'hidden' } },
            h('div', { style: { height: '220px', overflow: 'hidden', background: '#dbe4f0' } }, h('img', { src: imgUrl(t.image), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { style: { padding: '22px' } },
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } },
                h('span', { className: 'tc-chip tc-chip-area' }, (AREA_ICON[t.therapeutic_area] || '🧬') + ' ' + (t.therapeutic_area || '')),
                h('span', { className: 'tc-chip' }, t.phase || ''), h(Badge, { s: t.trial_state })),
              h('h1', { className: 'gro', style: { fontSize: '26px', fontWeight: 700, margin: 0, lineHeight: 1.25 } }, t.title),
              h('div', { className: 'tc-mut', style: { marginTop: '6px' } }, t.trial_code + ' · Sponsored by ' + (t.sponsor || '—')),
              t.indication ? h('div', { style: { marginTop: '14px' } }, h('span', { className: 'tc-tag' }, 'Indication'), h('span', { style: { marginLeft: '8px', fontWeight: 600 } }, t.indication)) : null,
              t.description ? h('p', { style: { marginTop: '14px', lineHeight: 1.6, color: 'var(--ink2)' } }, t.description) : null,
              h('div', { style: { display: 'flex', gap: '24px', marginTop: '18px', flexWrap: 'wrap', fontSize: '13.5px' } },
                h('div', null, h('div', { className: 'tc-mut' }, 'Started'), h('div', { style: { fontWeight: 600 } }, fmtDate(t.start_date) || '—')),
                h('div', null, h('div', { className: 'tc-mut' }, 'Est. completion'), h('div', { style: { fontWeight: 600 } }, fmtDate(t.est_completion) || '—'))),
              h('div', { style: { marginTop: '18px' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' } }, h('span', { className: 'tc-mut' }, 'Enrollment progress'), h('span', { className: 'num', style: { fontWeight: 700 } }, num(t.enrolled) + ' / ' + num(t.enrollment_target) + ' (' + p + '%)')),
                h('div', { className: 'tc-meter', style: { height: '10px' } }, h('i', { style: { width: p + '%' } })))))),
        h('div', { className: 'tc-panel', style: { padding: '22px', position: 'sticky', top: '84px' } },
          done ? h('div', { style: { textAlign: 'center', padding: '14px 0' } },
            h('div', { style: { fontSize: '36px' } }, '✓'),
            h('div', { className: 'gro', style: { fontWeight: 700, fontSize: '18px', marginTop: '6px' } }, 'Thank you'),
            h('div', { className: 'tc-mut', style: { marginTop: '6px' } }, 'Your interest in ' + t.trial_code + ' was registered. A study coordinator will reach out about eligibility.'))
            : h('form', { onSubmit: express },
              h('div', { className: 'tc-eyebrow' }, 'Participate'),
              h('div', { className: 'gro', style: { fontWeight: 700, fontSize: '18px', margin: '6px 0 4px' } }, 'Express interest'),
              h('div', { className: 'tc-mut', style: { marginBottom: '6px' } }, 'Not a commitment — a coordinator will contact you about screening and eligibility.'),
              h(Field, { label: 'Full name', req: true, children: h('input', { className: 'tc-input', value: name, onChange: function (e) { setName(e.target.value); } }) }),
              h(Field, { label: 'Email', req: true, children: h('input', { className: 'tc-input', type: 'email', value: emailV, onChange: function (e) { setEmailV(e.target.value); } }) }),
              h('button', { className: 'tc-btn tc-btn-teal', type: 'submit', style: { width: '100%', marginTop: '16px' } }, 'Express interest'),
              h('div', { className: 'tc-mut', style: { marginTop: '12px', fontSize: '12px' } }, 'You can withdraw interest at any time. This is not medical advice.')))));
  }

  function Home(props) {
    var c = props.ctx;
    var rec = recruiting(c.trials || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', null, h(Hero, { ctx: c }),
      h('section', { className: 'tc-sec' }, h('div', { className: 'tc-wrap' },
        h('div', { className: 'tc-eyebrow' }, 'By therapeutic area'),
        h('div', { className: 'tc-grid', style: { gridTemplateColumns: 'repeat(4,1fr)' } }, AREAS.map(function (a) {
          return h('div', { key: a, className: 'tc-panel', style: { padding: '18px', cursor: 'pointer', textAlign: 'center' }, onClick: function () { c.navigate('#/studies'); } },
            h('div', { style: { fontSize: '26px' } }, AREA_ICON[a] || '🧬'), h('div', { style: { fontWeight: 700, marginTop: '8px', fontSize: '14px' } }, a));
        })))),
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'tc-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('div', null, h('div', { className: 'tc-eyebrow' }, 'Now recruiting'), h('h2', { className: 'tc-h2', style: { marginTop: '4px' } }, 'Open & active studies')),
          h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', onClick: function () { c.navigate('#/studies'); } }, 'See all')),
        c.trials === null ? h('div', { className: 'tc-empty' }, 'Loading…')
          : h('div', { className: 'tc-grid' }, rec.slice(0, 6).map(function (t) { return h(TrialCard, { key: t.uuid, t: t, ctx: c }); })))),
      h('section', { className: 'tc-sec' }, h('div', { className: 'tc-wrap' },
        h('div', { className: 'tc-panel', style: { padding: '28px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(120deg,#101a30,#1c2c4c)' } },
          h('div', { style: { fontSize: '34px' } }, '🩺'),
          h('div', { style: { flex: 1, minWidth: '260px', color: '#fff' } }, h('div', { className: 'gro', style: { fontSize: '21px', fontWeight: 700 } }, 'For sponsors, CROs & sites'),
            h('div', { style: { marginTop: '4px', color: '#c4d2e8' } }, 'One console for enrollment analytics, site performance, participant tracking, visit compliance, pharmacovigilance and your regulatory binder.')),
          h('button', { className: 'tc-btn tc-btn-teal', onClick: function () { c.isAdmin ? c.navigate('#/console') : c.openLogin(); } }, c.isAdmin ? 'Open console' : 'Sign in')))));
  }

  // ── Coordinator: My Site ──────────────────────────────────────────────────────
  function CoordinatorSite(props) {
    var c = props.ctx;
    var [parts, setParts] = React.useState(null); var [visits, setVisits] = React.useState(null); var [aes, setAes] = React.useState(null);
    var [tab, setTab] = React.useState('participants'); var [trialF, setTrialF] = React.useState('all'); var [modal, setModal] = React.useState(null);
    function load() {
      client.getObjects('participant').then(function (r) { setParts(arr(r)); }).catch(function () { setParts([]); });
      client.getObjects('visit').then(function (r) { setVisits(arr(r)); }).catch(function () { setVisits([]); });
      client.getObjects('adverse_event').then(function (r) { setAes(arr(r)); }).catch(function () { setAes([]); });
    }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'tc-wrap tc-sec' }, h('div', { className: 'tc-empty' }, h('h2', { className: 'tc-h2' }, 'Sign in to your site view'), h('button', { className: 'tc-btn tc-btn-teal', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    var codes = (c.trials || []).map(function (t) { return t.trial_code; });
    function applyTrial(rows) { return (rows || []).filter(function (r) { return trialF === 'all' || r.trial_code === trialF; }); }
    var tabs = [['participants', 'Participants', (parts || []).length], ['visits', 'Visits', (visits || []).length], ['adverse_event', 'Adverse events', (aes || []).length]];
    return h('div', { className: 'tc-wrap tc-sec' },
      h('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' } },
        h('div', null, h('div', { className: 'tc-eyebrow' }, 'Site coordinator'), h('h2', { className: 'tc-h2', style: { marginTop: '4px' } }, 'My site work')),
        h('button', { className: 'tc-btn tc-btn-teal', style: { marginLeft: 'auto' }, onClick: function () { setModal({ schema: 'participant', initial: {} }); } }, '+ Enroll participant')),
      h('p', { className: 'tc-mut', style: { maxWidth: '640px', marginTop: '6px' } }, 'Track the participants, visits and adverse events you manage day to day. New participants trigger an enrollment notification; serious AEs are escalated by the safety team in the console.'),
      h('div', { className: 'tc-filters', style: { marginTop: '16px' } },
        h('button', { className: cls('tc-btn tc-btn-sm', trialF === 'all' ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setTrialF('all'); } }, 'All trials'),
        codes.map(function (cd) { return h('button', { key: cd, className: cls('tc-btn tc-btn-sm', trialF === cd ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setTrialF(cd); } }, cd); })),
      h('div', { className: 'tc-filters' }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('tc-btn tc-btn-sm', tab === t[0] ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setTab(t[0]); } }, t[1] + ' (' + t[2] + ')'); })),
      tab === 'participants' ? h(ParticipantTable, { rows: applyTrial(parts), loading: parts === null, onEdit: function (p) { setModal({ schema: 'participant', initial: p }); } })
        : tab === 'visits' ? h(VisitTable, { rows: applyTrial(visits), loading: visits === null, onUpdate: load, onEdit: function (v) { setModal({ schema: 'visit', initial: v }); }, onNew: function () { setModal({ schema: 'visit', initial: {} }); } })
          : h(AeTable, { rows: applyTrial(aes), loading: aes === null, canEscalate: false, onUpdate: load, onEdit: function (a) { setModal({ schema: 'adverse_event', initial: a }); }, onNew: function () { setModal({ schema: 'adverse_event', initial: {} }); } }),
      modal ? h(RecordModal, { schema: modal.schema, initial: modal.initial, trials: c.trials || [], sites: c.sites || [], onClose: function () { setModal(null); }, onSaved: function () { setModal(null); load(); } }) : null);
  }

  // ── Shared data tables ─────────────────────────────────────────────────────────
  function ParticipantTable(props) {
    var [state, setState] = React.useState('all'); var [arm, setArm] = React.useState('all');
    var rows = (props.rows || []).filter(function (p) { return (state === 'all' || p.participant_state === state) && (arm === 'all' || p.arm === arm); })
      .sort(function (a, b) { return (b.enrolled_date || '').localeCompare(a.enrolled_date || ''); });
    return h('div', null,
      h('div', { className: 'tc-filters' },
        h('button', { className: cls('tc-btn tc-btn-sm', state === 'all' ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setState('all'); } }, 'All states'),
        PARTICIPANT_STATES.map(function (s) { return h('button', { key: s, className: cls('tc-btn tc-btn-sm', state === s ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setState(s); } }, cap(s)); })),
      h('div', { className: 'tc-filters' },
        ['all', 'Treatment', 'Control', 'Placebo'].map(function (a) { return h('button', { key: a, className: cls('tc-btn tc-btn-sm', arm === a ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setArm(a); } }, a === 'all' ? 'All arms' : a); })),
      h('div', { className: 'tc-panel' },
        h('div', { className: 'tc-table-h' }, h('span', { style: { width: '120px' } }, 'Subject'), h('span', { className: 'tc-grow' }, 'Trial · Site'), h('span', { style: { width: '90px' } }, 'Arm'), h('span', { style: { width: '120px' } }, 'State')),
        props.loading ? h('div', { className: 'tc-row tc-mut' }, 'Loading…')
          : rows.length ? rows.map(function (p) {
            return h('div', { key: p.uuid, className: 'tc-row', style: { cursor: props.onEdit ? 'pointer' : 'default' }, onClick: function () { props.onEdit && props.onEdit(p); } },
              h('div', { style: { width: '120px', fontWeight: 700 } }, p.subject_id),
              h('div', { className: 'tc-grow' }, h('div', { style: { fontWeight: 600 } }, p.trial_code || '—'), h('div', { className: 'tc-mut' }, (p.site_name || '') + ' · ' + (p.sex || '') + (p.age ? ', ' + p.age : '') + (p.last_visit ? ' · last visit ' + fmtDate(p.last_visit) : ''))),
              h('div', { style: { width: '90px' } }, h('span', { className: 'tc-tag' }, p.arm || '—')),
              h('div', { style: { width: '120px' } }, h(Badge, { s: p.participant_state })));
          }) : h('div', { className: 'tc-empty' }, 'No participants match.')));
  }

  function VisitTable(props) {
    var [state, setState] = React.useState('all');
    var rows = (props.rows || []).filter(function (v) { return state === 'all' || v.visit_state === state; })
      .sort(function (a, b) { return (b.scheduled_date || '').localeCompare(a.scheduled_date || ''); });
    function setVisitState(v, st) {
      var patch = { visit_state: st }; if (st === 'completed') patch.completed_date = new Date().toISOString().slice(0, 10);
      client.updateObject('visit', v.uuid, patch, v).then(function () { showToast('Visit ' + cap(st), 'success'); props.onUpdate && props.onUpdate(); }).catch(function () { showToast('Update failed', 'error'); });
    }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
        h('div', { className: 'tc-filters', style: { marginBottom: 0 } },
          h('button', { className: cls('tc-btn tc-btn-sm', state === 'all' ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setState('all'); } }, 'All'),
          VISIT_STATES.map(function (s) { return h('button', { key: s, className: cls('tc-btn tc-btn-sm', state === s ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setState(s); } }, cap(s)); })),
        props.onNew ? h('button', { className: 'tc-btn tc-btn-navy tc-btn-sm', style: { marginLeft: 'auto', marginBottom: '12px' }, onClick: props.onNew }, '+ Schedule visit') : null),
      h('div', { className: 'tc-panel' },
        h('div', { className: 'tc-table-h' }, h('span', { style: { width: '120px' } }, 'Subject'), h('span', { className: 'tc-grow' }, 'Visit · Trial'), h('span', { style: { width: '120px' } }, 'Scheduled'), h('span', { style: { width: '130px' } }, 'State'), props.onUpdate ? h('span', { style: { width: '110px' } }, '') : null),
        props.loading ? h('div', { className: 'tc-row tc-mut' }, 'Loading…')
          : rows.length ? rows.map(function (v) {
            return h('div', { key: v.uuid, className: 'tc-row' },
              h('div', { style: { width: '120px', fontWeight: 700 } }, v.subject_id),
              h('div', { className: 'tc-grow', style: { cursor: props.onEdit ? 'pointer' : 'default' }, onClick: function () { props.onEdit && props.onEdit(v); } }, h('div', { style: { fontWeight: 600 } }, v.visit_name || 'Visit'), h('div', { className: 'tc-mut' }, (v.trial_code || '') + (v.completed_date ? ' · completed ' + fmtDate(v.completed_date) : ''))),
              h('div', { style: { width: '120px' }, className: 'tc-mut' }, fmtDate(v.scheduled_date)),
              h('div', { style: { width: '130px' } }, h(Badge, { s: v.visit_state })),
              props.onUpdate ? h('div', { style: { width: '110px' } }, v.visit_state === 'scheduled' ? h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', onClick: function () { setVisitState(v, 'completed'); } }, '✓ Complete') : null) : null);
          }) : h('div', { className: 'tc-empty' }, 'No visits match.')));
  }

  function AeTable(props) {
    var [state, setState] = React.useState('all'); var [seriousOnly, setSeriousOnly] = React.useState(false); var [open, setOpen] = React.useState(null);
    var rows = (props.rows || []).filter(function (a) { return (state === 'all' || a.ae_state === state) && (!seriousOnly || a.serious); })
      .sort(function (a, b) { return (b.serious ? 1 : 0) - (a.serious ? 1 : 0) || (b.onset_date || '').localeCompare(a.onset_date || ''); });
    function escalate(a) {
      var run = (services && services.workflow && services.workflow.run)
        ? runSaga('ae_escalation', { adverse_event_uuid: a.uuid, subject_id: a.subject_id, trial_code: a.trial_code, term: a.term, severity: a.severity, safety_email: SAFETY_EMAIL })
        : Promise.reject();
      run.then(function () { showToast('Escalation saga ran — safety team alerted, AE under review', 'success'); props.onUpdate && props.onUpdate(); setOpen(null); })
        .catch(function (err) { showToast('ESCALATION FAILED — the safety team was NOT alerted for ' + (a.subject_id || 'this event') + ': ' + ((err && err.message) || 'workflow error') + '. Escalate manually.', 'error'); });
    }
    function resolve(a) { client.updateObject('adverse_event', a.uuid, { ae_state: 'resolved' }, a).then(function () { showToast('AE resolved', 'success'); props.onUpdate && props.onUpdate(); setOpen(null); }).catch(function () { showToast('Failed', 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
        h('div', { className: 'tc-filters', style: { marginBottom: 0 } },
          h('button', { className: cls('tc-btn tc-btn-sm', state === 'all' ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setState('all'); } }, 'All'),
          AE_STATES.map(function (s) { return h('button', { key: s, className: cls('tc-btn tc-btn-sm', state === s ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setState(s); } }, cap(s)); }),
          h('button', { className: cls('tc-btn tc-btn-sm', seriousOnly ? 'tc-btn-red' : 'tc-btn-ghost'), onClick: function () { setSeriousOnly(!seriousOnly); } }, '⚠ Serious only')),
        props.onNew ? h('button', { className: 'tc-btn tc-btn-navy tc-btn-sm', style: { marginLeft: 'auto', marginBottom: '12px' }, onClick: props.onNew }, '+ Report AE') : null),
      h('div', { className: 'tc-panel' },
        h('div', { className: 'tc-table-h' }, h('span', { style: { width: '110px' } }, 'Subject'), h('span', { className: 'tc-grow' }, 'Term · Trial'), h('span', { style: { width: '130px' } }, 'Severity'), h('span', { style: { width: '120px' } }, 'State'), h('span', { style: { width: '100px' } }, '')),
        props.loading ? h('div', { className: 'tc-row tc-mut' }, 'Loading…')
          : rows.length ? rows.map(function (a) {
            return h('div', { key: a.uuid, className: 'tc-row', style: { cursor: 'pointer', background: open && open.uuid === a.uuid ? '#f0fdfa' : '' }, onClick: function () { setOpen(open && open.uuid === a.uuid ? null : a); } },
              h('div', { style: { width: '110px', fontWeight: 700 } }, a.subject_id),
              h('div', { className: 'tc-grow' }, h('div', { style: { fontWeight: 600 } }, a.term || 'Event', a.serious ? h('span', { className: 'tc-serious', style: { marginLeft: '8px' } }, 'SERIOUS') : null), h('div', { className: 'tc-mut' }, (a.trial_code || '') + ' · ' + (a.site_name || '') + ' · onset ' + fmtDate(a.onset_date))),
              h('div', { style: { width: '130px' } }, h('span', { className: 'tc-badge', style: { background: statusColor(a.severity) } }, cap(a.severity))),
              h('div', { style: { width: '120px' } }, h(Badge, { s: a.ae_state })),
              h('div', { style: { width: '100px' } }, (props.canEscalate && a.serious && a.ae_state === 'reported') ? h('button', { className: 'tc-btn tc-btn-red tc-btn-sm', onClick: function (e) { e.stopPropagation(); escalate(a); } }, '↑ Escalate') : null));
          }) : h('div', { className: 'tc-empty' }, 'No adverse events match.')),
      open ? h('div', { className: 'tc-note', style: { marginTop: '12px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
          h('div', { style: { fontWeight: 700 } }, open.term + ' — ' + open.subject_id, open.serious ? h('span', { className: 'tc-serious', style: { marginLeft: '8px' } }, 'SERIOUS') : null),
          h(Badge, { s: open.ae_state })),
        open.description ? h('div', { style: { marginTop: '8px', fontSize: '13.5px', lineHeight: 1.55 } }, open.description) : null,
        open.outcome ? h('div', { className: 'tc-mut', style: { marginTop: '6px', fontSize: '13px' } }, 'Outcome: ' + open.outcome) : null,
        props.canEscalate ? h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' } },
          (open.serious && open.ae_state === 'reported') ? h('button', { className: 'tc-btn tc-btn-red tc-btn-sm', onClick: function () { escalate(open); } }, '↑ Escalate to safety (saga)') : null,
          (open.ae_state !== 'resolved') ? h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', onClick: function () { resolve(open); } }, 'Mark resolved') : null,
          props.onEdit ? h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', onClick: function () { props.onEdit(open); } }, 'Edit') : null) : null) : null);
  }

  // ── Record create/edit modal (participant / visit / adverse_event / trial / site / trial_document) ──
  var FORMS = {
    participant: [
      { k: 'subject_id', label: 'Subject ID', req: true }, { k: 'trial_code', label: 'Trial', type: 'trial' }, { k: 'site_name', label: 'Site', type: 'site' },
      { k: 'arm', label: 'Arm', type: 'select', opts: ['Treatment', 'Control', 'Placebo'] },
      { k: 'participant_state', label: 'State', type: 'select', opts: PARTICIPANT_STATES, dflt: 'screening' },
      { k: 'sex', label: 'Sex', type: 'select', opts: ['Female', 'Male', 'Other'] }, { k: 'age', label: 'Age', type: 'number' },
      { k: 'enrolled_date', label: 'Enrolled date', type: 'date' }, { k: 'last_visit', label: 'Last visit', type: 'date' }
    ],
    visit: [
      { k: 'subject_id', label: 'Subject ID', req: true }, { k: 'trial_code', label: 'Trial', type: 'trial' },
      { k: 'visit_name', label: 'Visit', type: 'select', opts: ['Screening', 'Baseline', 'Week 4', 'Week 8', 'Week 12', 'Week 24', 'Follow-up'] },
      { k: 'visit_state', label: 'State', type: 'select', opts: VISIT_STATES, dflt: 'scheduled' },
      { k: 'scheduled_date', label: 'Scheduled date', type: 'date' }, { k: 'completed_date', label: 'Completed date', type: 'date' },
      { k: 'notes', label: 'Notes', type: 'textarea' }
    ],
    adverse_event: [
      { k: 'subject_id', label: 'Subject ID', req: true }, { k: 'trial_code', label: 'Trial', type: 'trial' }, { k: 'site_name', label: 'Site', type: 'site' },
      { k: 'term', label: 'Event term', req: true }, { k: 'severity', label: 'Severity', type: 'select', opts: SEVERITIES },
      { k: 'serious', label: 'Serious', type: 'check' }, { k: 'ae_state', label: 'State', type: 'select', opts: AE_STATES, dflt: 'reported' },
      { k: 'onset_date', label: 'Onset date', type: 'date' }, { k: 'outcome', label: 'Outcome' }, { k: 'description', label: 'Description', type: 'textarea' }
    ],
    trial: [
      { k: 'trial_code', label: 'Trial code', req: true }, { k: 'title', label: 'Title', req: true },
      { k: 'phase', label: 'Phase', type: 'select', opts: PHASES }, { k: 'therapeutic_area', label: 'Therapeutic area', type: 'select', opts: AREAS },
      { k: 'sponsor', label: 'Sponsor' }, { k: 'indication', label: 'Indication' },
      { k: 'trial_state', label: 'State', type: 'select', opts: TRIAL_STATES, dflt: 'planning' },
      { k: 'enrollment_target', label: 'Enrollment target', type: 'number' }, { k: 'enrolled', label: 'Enrolled', type: 'number' },
      { k: 'start_date', label: 'Start date', type: 'date' }, { k: 'est_completion', label: 'Est. completion', type: 'date' },
      { k: 'image_url', label: 'Image URL' }, { k: 'description', label: 'Description', type: 'textarea' }
    ],
    site: [
      { k: 'site_name', label: 'Site name', req: true }, { k: 'institution', label: 'Institution' }, { k: 'pi_name', label: 'Principal investigator' },
      { k: 'city', label: 'City' }, { k: 'country', label: 'Country' },
      { k: 'site_state', label: 'State', type: 'select', opts: ['pending', 'active', 'on_hold', 'closed'], dflt: 'pending' },
      { k: 'enrolled', label: 'Enrolled', type: 'number' }, { k: 'capacity', label: 'Capacity', type: 'number' },
      { k: 'irb_approved', label: 'IRB approved', type: 'check' }, { k: 'activation_date', label: 'Activation date', type: 'date' }
    ],
    trial_document: [
      { k: 'title', label: 'Title', req: true }, { k: 'doc_type', label: 'Type', type: 'select', opts: ['Protocol', 'ICF', 'IRB Approval', 'Monitoring Report', 'SAE Report', 'Amendment'] },
      { k: 'trial_code', label: 'Trial', type: 'trial' }, { k: 'doc_state', label: 'State', type: 'select', opts: ['draft', 'pending', 'approved', 'expired'], dflt: 'draft' },
      { k: 'version', label: 'Version' }, { k: 'updated_date', label: 'Updated date', type: 'date' }
    ]
  };
  var TITLES = {
    participant: ['Enroll participant', 'Edit participant'], visit: ['Schedule visit', 'Edit visit'],
    adverse_event: ['Report adverse event', 'Edit adverse event'], trial: ['New trial', 'Edit trial'],
    site: ['Add site', 'Edit site'], trial_document: ['Add document', 'Edit document']
  };

  function RecordModal(props) {
    var fields = FORMS[props.schema] || []; var init = props.initial || {};
    var [form, setForm] = React.useState(function () {
      var f = {}; fields.forEach(function (fd) {
        var v = init[fd.k];
        if (fd.k === 'image_url') v = imgUrl(init.image);
        if (v == null || v === '') v = (init.uuid ? '' : (fd.dflt || ''));
        f[fd.k] = (fd.type === 'check') ? !!init[fd.k] : v;
      }); return f;
    });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {}; fields.forEach(function (fd) {
        var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; }
        if (v === '' || v == null) return;
        if (fd.type === 'number') v = Number(v);
        if (fd.k === 'image_url') { data.image = { url: v, thumbnail_url: v }; return; }
        data[fd.k] = v;
      });
      data.display_name = data.subject_id || data.trial_code || data.title || data.site_name || data.term || 'Record';
      if (!data.description) data.description = (data.trial_code || data.doc_type || props.schema);
      setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) {
        setBusy(false);
        try { var miss = parse422Error(e); if (miss && miss.length) { showToast('Missing: ' + miss.join(', '), 'warning'); return; } } catch (x) {}
        showToast('Save failed: ' + ((e && e.message) || 'error'), 'error');
      });
    }
    var t = TITLES[props.schema] || ['New', 'Edit'];
    return h('div', { className: 'tc-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'tc-sheet', style: { padding: '26px' } }, h('button', { className: 'tc-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'tc-h2', style: { fontSize: '21px' } }, init.uuid ? t[1] : t[0]),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' } }, fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input; var full = (fd.type === 'textarea');
          if (fd.type === 'textarea') input = h('textarea', { className: 'tc-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'tc-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, cap(o)); }));
          else if (fd.type === 'trial') input = h('select', { className: 'tc-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), (props.trials || []).map(function (o) { return h('option', { key: o.uuid, value: o.trial_code }, o.trial_code); }));
          else if (fd.type === 'site') input = h('select', { className: 'tc-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), (props.sites || []).map(function (o) { return h('option', { key: o.uuid, value: o.site_name }, o.site_name); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', height: '42px' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'tc-mut' }, 'Yes'));
          else input = h('input', { className: 'tc-input', type: fd.type === 'number' ? 'number' : (fd.type === 'date' ? 'date' : 'text'), value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h('div', { key: fd.k, style: full ? { gridColumn: '1 / -1' } : null }, h(Field, { label: fd.label, req: fd.req, children: input }));
        })),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '20px' } },
          h('button', { className: 'tc-btn tc-btn-teal', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'tc-btn tc-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  // ── CTMS console (tenant_admin) ────────────────────────────────────────────────
  function Stat(p) { return h('div', { className: 'tc-stat' }, h('div', { className: 'tc-stat-n num', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'tc-stat-l' }, p.l), p.d ? h('div', { className: 'tc-stat-d', style: { color: p.dc || 'var(--green)' } }, p.d) : null); }

  function ChartPanel(p) { return h('div', { className: 'tc-panel', style: { padding: '20px' } }, h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, p.title), p.sub ? h('div', { className: 'tc-mut', style: { fontSize: '12px', marginBottom: '8px' } }, p.sub) : null, p.children); }

  // Stacked bar: enrolled (teal) vs remaining (light) of target — like ledgerline's bars.
  function EnrollmentBars(props) {
    var trials = (props.trials || []).filter(function (t) { return (Number(t.enrollment_target) || 0) > 0; }).slice(0, 7);
    var maxT = Math.max.apply(null, trials.map(function (t) { return Number(t.enrollment_target) || 0; }).concat([1]));
    return h('div', { className: 'tc-bars' }, trials.map(function (t) {
      var tgt = Number(t.enrollment_target) || 0; var enr = Math.min(tgt, Number(t.enrolled) || 0);
      var totalH = Math.max(6, (tgt / maxT) * 140); var enrH = tgt > 0 ? (enr / tgt) * totalH : 0;
      return h('div', { key: t.uuid, className: 'tc-bar' },
        h('div', { className: 'v num' }, pct(enr, tgt) + '%'),
        h('div', { className: 'stk', style: { height: totalH + 'px', background: '#e6ebf4' } },
          h('div', { style: { height: Math.max(2, enrH) + 'px', background: 'linear-gradient(180deg,var(--cyan),var(--teal))', borderRadius: '7px 7px 0 0' } })),
        h('div', { className: 'l' }, t.trial_code));
    }));
  }

  function Funnel(props) {
    var parts = props.parts || []; var total = parts.length || 1;
    var colors = { screening: '#0891b2', enrolled: '#6366f1', active: '#0d9488', completed: '#475569', withdrawn: '#94a3b8', screen_failed: '#dc2626' };
    return h('div', { className: 'tc-funnel' }, PARTICIPANT_STATES.map(function (s) {
      var n = parts.filter(function (p) { return p.participant_state === s; }).length;
      return h('div', { key: s, className: 'tc-fbar' },
        h('div', { className: 'fl' }, cap(s)),
        h('div', { className: 'ft' }, h('i', { style: { width: Math.max(2, (n / total) * 100) + '%', background: colors[s] } })),
        h('div', { className: 'fv num' }, n));
    }));
  }

  function SeverityBars(props) {
    var aes = props.aes || [];
    var max = Math.max.apply(null, SEVERITIES.map(function (s) { return aes.filter(function (a) { return a.severity === s; }).length; }).concat([1]));
    return h('div', null, h('div', { className: 'tc-bars', style: { height: '150px' } }, SEVERITIES.map(function (s) {
      var n = aes.filter(function (a) { return a.severity === s; }).length;
      return h('div', { key: s, className: 'tc-bar' },
        h('div', { className: 'v num' }, n),
        h('div', { className: 'stk', style: { height: Math.max(4, (n / max) * 120) + 'px', background: statusColor(s) } }),
        h('div', { className: 'l' }, cap(s)));
    })),
      h('div', { className: 'tc-legend' }, h('span', null, h('i', { style: { background: 'var(--red)' } }), aes.filter(function (a) { return a.serious; }).length + ' serious of ' + aes.length + ' total')));
  }

  function PhaseBars(props) {
    var trials = props.trials || [];
    var data = PHASES.map(function (ph) { return { label: ph, value: trials.filter(function (t) { return t.phase === ph; }).reduce(function (s, t) { return s + (Number(t.enrolled) || 0); }, 0) }; });
    var max = Math.max.apply(null, data.map(function (x) { return x.value; }).concat([1]));
    return h('div', { className: 'tc-bars', style: { height: '150px' } }, data.map(function (d) {
      return h('div', { key: d.label, className: 'tc-bar' },
        h('div', { className: 'v num' }, num(d.value)),
        h('div', { className: 'stk', style: { height: Math.max(4, (d.value / max) * 120) + 'px', background: 'linear-gradient(180deg,#1c2c4c,#0891b2)' } }),
        h('div', { className: 'l' }, d.label));
    }));
  }

  function ConsoleDashboard(props) {
    var c = props.ctx;
    var [parts, setParts] = React.useState([]); var [aes, setAes] = React.useState([]); var [sites, setSites] = React.useState([]);
    React.useEffect(function () {
      client.getObjects('participant').then(function (r) { setParts(arr(r)); }).catch(function () {});
      client.getObjects('adverse_event').then(function (r) { setAes(arr(r)); }).catch(function () {});
      client.getObjects('site').then(function (r) { setSites(arr(r)); }).catch(function () {});
    }, []);
    var trials = c.trials || [];
    var activeTrials = trials.filter(function (t) { return t.trial_state === 'active' || t.trial_state === 'recruiting'; }).length;
    var enrolled = trials.reduce(function (s, t) { return s + (Number(t.enrolled) || 0); }, 0);
    var target = trials.reduce(function (s, t) { return s + (Number(t.enrollment_target) || 0); }, 0);
    var openAe = aes.filter(function (a) { return a.ae_state === 'reported' || a.ae_state === 'under_review' || a.ae_state === 'ongoing'; }).length;
    var seriousOpen = aes.filter(function (a) { return a.serious && a.ae_state !== 'resolved'; }).length;
    var activeSites = sites.filter(function (x) { return x.site_state === 'active'; }).length;
    return h('div', null,
      h('div', { className: 'tc-stats' },
        h(Stat, { n: activeTrials, l: 'Active / recruiting trials', d: trials.length + ' total', dc: 'var(--muted)', color: 'var(--ink)' }),
        h(Stat, { n: pct(enrolled, target) + '%', l: 'Enrolled vs target', d: num(enrolled) + ' / ' + num(target), color: 'var(--teal)' }),
        h(Stat, { n: openAe, l: 'Open adverse events', d: seriousOpen + ' serious open', dc: seriousOpen ? 'var(--red)' : 'var(--green)', color: seriousOpen ? 'var(--red)' : 'var(--ink)' }),
        h(Stat, { n: activeSites, l: 'Active sites', d: sites.length + ' total', dc: 'var(--muted)' })),
      h('div', { className: 'tc-charts' },
        h(ChartPanel, { title: 'Enrollment by trial', sub: 'Enrolled as % of target', children: h(EnrollmentBars, { trials: trials }) }),
        h(ChartPanel, { title: 'Participants by state', sub: 'Across all trials', children: h(Funnel, { parts: parts }) })),
      h('div', { className: 'tc-charts' },
        h(ChartPanel, { title: 'Adverse-event severity', sub: 'Count by severity grade', children: h(SeverityBars, { aes: aes }) }),
        h(ChartPanel, { title: 'Enrollment by phase', sub: 'Participants summed by trial phase', children: h(PhaseBars, { trials: trials }) })),
      seriousOpen ? h('div', { className: 'tc-panel', style: { marginTop: '16px', padding: '20px', border: '1px solid #fecaca', background: '#fef2f2' } },
        h('div', { style: { fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' } }, '⚠ Safety attention required'),
        h('div', { className: 'tc-mut', style: { marginTop: '4px' } }, seriousOpen + ' serious adverse event(s) are open. Review and escalate in the Safety tab.'),
        h('button', { className: 'tc-btn tc-btn-red tc-btn-sm', style: { marginTop: '12px' }, onClick: function () { c.navigate('#/console/safety'); } }, 'Go to safety →')) : null);
  }

  function ConsoleTrials(props) {
    var c = props.ctx; var [modal, setModal] = React.useState(null); var [open, setOpen] = React.useState(null);
    var [sites, setSites] = React.useState([]); var [parts, setParts] = React.useState([]);
    React.useEffect(function () { client.getObjects('site').then(function (r) { setSites(arr(r)); }).catch(function () {}); client.getObjects('participant').then(function (r) { setParts(arr(r)); }).catch(function () {}); }, []);
    var trials = (c.trials || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    function milestone(t) {
      var run = (services && services.workflow && services.workflow.run)
        ? runSaga('enrollment_milestone', { trial_code: t.trial_code, title: t.title, enrolled: t.enrolled, enrollment_target: t.enrollment_target, sponsor_email: SPONSOR_EMAIL })
        : Promise.reject();
      run.then(function () { showToast('Milestone email sent to sponsor for ' + t.trial_code, 'success'); }).catch(function (err) { showToast('Milestone email NOT sent — ' + ((err && err.message) || 'workflow error'), 'error'); });
    }
    function del(t) { if (!window.confirm('Delete trial ' + t.trial_code + '?')) return; client.deleteObject('trial', t.uuid, t).then(function () { showToast('Deleted', 'success'); c.reload(); }).catch(function () { showToast('Failed', 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, trials.length + ' trials'),
        h('button', { className: 'tc-btn tc-btn-teal tc-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setModal({}); } }, '+ New trial')),
      h('div', { className: 'tc-panel' }, trials.map(function (t) {
        var p = pct(t.enrolled, t.enrollment_target); var trialSites = sites.filter(function (s) { return parts.some(function (pp) { return pp.trial_code === t.trial_code && pp.site_name === s.site_name; }); });
        return h('div', { key: t.uuid },
          h('div', { className: 'tc-row', style: { cursor: 'pointer', background: open === t.uuid ? '#f8fafc' : '' }, onClick: function () { setOpen(open === t.uuid ? null : t.uuid); } },
            h('div', { className: 'tc-grow' }, h('div', { style: { fontWeight: 700 } }, t.trial_code, h('span', { className: 'tc-chip tc-chip-area', style: { marginLeft: '8px' } }, t.therapeutic_area), h('span', { className: 'tc-tag', style: { marginLeft: '6px' } }, t.phase)), h('div', { className: 'tc-mut' }, t.title)),
            h('div', { style: { width: '160px' } }, h('div', { style: { fontSize: '12px', display: 'flex', justifyContent: 'space-between' } }, h('span', { className: 'tc-mut' }, 'Enroll'), h('span', { className: 'num', style: { fontWeight: 700 } }, num(t.enrolled) + '/' + num(t.enrollment_target))), h('div', { className: 'tc-meter' }, h('i', { style: { width: p + '%' } }))),
            h(Badge, { s: t.trial_state })),
          open === t.uuid ? h('div', { style: { padding: '4px 18px 18px', background: '#f8fafc' } },
            t.description ? h('p', { style: { fontSize: '13.5px', color: 'var(--ink2)', lineHeight: 1.55, margin: '8px 0' } }, t.description) : null,
            h('div', { style: { display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', margin: '8px 0' } },
              h('div', null, h('span', { className: 'tc-mut' }, 'Sponsor: '), h('b', null, t.sponsor || '—')),
              h('div', null, h('span', { className: 'tc-mut' }, 'Indication: '), h('b', null, t.indication || '—')),
              h('div', null, h('span', { className: 'tc-mut' }, 'Started: '), h('b', null, fmtDate(t.start_date) || '—'))),
            trialSites.length ? h('div', { style: { fontSize: '13px', margin: '6px 0' } }, h('span', { className: 'tc-mut' }, 'Sites with participants: '), trialSites.map(function (s) { return h('span', { key: s.uuid, className: 'tc-tag', style: { marginRight: '6px' } }, s.site_name); })) : null,
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
              h('button', { className: 'tc-btn tc-btn-navy tc-btn-sm', onClick: function () { milestone(t); } }, '✉ Notify sponsor (milestone)'),
              h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', onClick: function () { setModal(t); } }, 'Edit'),
              h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', onClick: function () { del(t); } }, '✕ Delete'))) : null);
      })),
      modal !== null ? h(RecordModal, { schema: 'trial', initial: modal, trials: c.trials || [], sites: sites, onClose: function () { setModal(null); }, onSaved: function () { setModal(null); c.reload(); } }) : null);
  }

  function ConsoleSites(props) {
    var c = props.ctx; var [sites, setSites] = React.useState(null); var [modal, setModal] = React.useState(null);
    function load() { client.getObjects('site').then(function (r) { setSites(arr(r).sort(function (a, b) { return (b.enrolled || 0) - (a.enrolled || 0); })); }).catch(function () { setSites([]); }); }
    React.useEffect(load, []);
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, 'Site performance'),
        h('button', { className: 'tc-btn tc-btn-teal tc-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setModal({}); } }, '+ Add site')),
      h('div', { className: 'tc-panel' },
        h('div', { className: 'tc-table-h' }, h('span', { className: 'tc-grow' }, 'Site · PI'), h('span', { style: { width: '170px' } }, 'Enrollment'), h('span', { style: { width: '90px' } }, 'IRB'), h('span', { style: { width: '110px' } }, 'State')),
        sites === null ? h('div', { className: 'tc-row tc-mut' }, 'Loading…')
          : sites.map(function (s) {
            var p = pct(s.enrolled, s.capacity);
            return h('div', { key: s.uuid, className: 'tc-row', style: { cursor: 'pointer' }, onClick: function () { setModal(s); } },
              h('div', { className: 'tc-grow' }, h('div', { style: { fontWeight: 700 } }, s.site_name), h('div', { className: 'tc-mut' }, (s.institution || '') + ' · ' + (s.pi_name || '') + ' · ' + (s.city || '') + ', ' + (s.country || ''))),
              h('div', { style: { width: '170px' } }, h('div', { style: { fontSize: '12px', display: 'flex', justifyContent: 'space-between' } }, h('span', { className: 'num', style: { fontWeight: 700 } }, num(s.enrolled) + '/' + num(s.capacity)), h('span', { className: 'tc-mut' }, p + '%')), h('div', { className: 'tc-meter' }, h('i', { style: { width: p + '%' } }))),
              h('div', { style: { width: '90px' } }, s.irb_approved ? h('span', { className: 'tc-chip' }, '✓ IRB') : h('span', { className: 'tc-tag', style: { background: '#fef2f2', color: '#991b1b' } }, 'No IRB')),
              h('div', { style: { width: '110px' } }, h(Badge, { s: s.site_state })));
          })),
      modal !== null ? h(RecordModal, { schema: 'site', initial: modal, trials: c.trials || [], onClose: function () { setModal(null); }, onSaved: function () { setModal(null); load(); } }) : null);
  }

  function ConsoleParticipants(props) {
    var c = props.ctx; var [parts, setParts] = React.useState(null); var [sites, setSites] = React.useState([]); var [modal, setModal] = React.useState(null); var [trialF, setTrialF] = React.useState('all'); var [siteF, setSiteF] = React.useState('all');
    function load() { client.getObjects('participant').then(function (r) { setParts(arr(r)); }).catch(function () { setParts([]); }); }
    React.useEffect(function () { load(); client.getObjects('site').then(function (r) { setSites(arr(r)); }).catch(function () {}); }, []);
    var codes = (c.trials || []).map(function (t) { return t.trial_code; });
    var rows = (parts || []).filter(function (p) { return (trialF === 'all' || p.trial_code === trialF) && (siteF === 'all' || p.site_name === siteF); });
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px' } }, h('div', { style: { fontWeight: 700 } }, (parts || []).length + ' participants'),
        h('button', { className: 'tc-btn tc-btn-teal tc-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setModal({}); } }, '+ Enroll participant')),
      h('div', { className: 'tc-filters' }, h('button', { className: cls('tc-btn tc-btn-sm', trialF === 'all' ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setTrialF('all'); } }, 'All trials'),
        codes.map(function (cd) { return h('button', { key: cd, className: cls('tc-btn tc-btn-sm', trialF === cd ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setTrialF(cd); } }, cd); })),
      h('div', { className: 'tc-filters' }, h('button', { className: cls('tc-btn tc-btn-sm', siteF === 'all' ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setSiteF('all'); } }, 'All sites'),
        sites.map(function (s) { return h('button', { key: s.uuid, className: cls('tc-btn tc-btn-sm', siteF === s.site_name ? 'tc-btn-navy' : 'tc-btn-ghost'), onClick: function () { setSiteF(s.site_name); } }, s.site_name); })),
      h(ParticipantTable, { rows: rows, loading: parts === null, onEdit: function (p) { setModal(p); } }),
      modal !== null ? h(RecordModal, { schema: 'participant', initial: modal, trials: c.trials || [], sites: sites, onClose: function () { setModal(null); }, onSaved: function () { setModal(null); load(); } }) : null);
  }

  function ConsoleVisits(props) {
    var c = props.ctx; var [visits, setVisits] = React.useState(null); var [modal, setModal] = React.useState(null);
    function load() { client.getObjects('visit').then(function (r) { setVisits(arr(r)); }).catch(function () { setVisits([]); }); }
    React.useEffect(load, []);
    var vs = visits || [];
    var done = vs.filter(function (v) { return v.visit_state === 'completed'; }).length;
    var missed = vs.filter(function (v) { return v.visit_state === 'missed'; }).length;
    var oow = vs.filter(function (v) { return v.visit_state === 'out_of_window'; }).length;
    return h('div', null,
      h('div', { className: 'tc-stats', style: { gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '16px' } },
        h(Stat, { n: vs.length, l: 'Total visits' }),
        h(Stat, { n: done, l: 'Completed', color: 'var(--teal)' }),
        h(Stat, { n: missed, l: 'Missed', color: missed ? 'var(--red)' : 'var(--ink)' }),
        h(Stat, { n: oow, l: 'Out of window', color: oow ? 'var(--amber)' : 'var(--ink)' })),
      h(VisitTable, { rows: vs, loading: visits === null, onUpdate: load, onEdit: function (v) { setModal(v); }, onNew: function () { setModal({}); } }),
      modal !== null ? h(RecordModal, { schema: 'visit', initial: modal, trials: c.trials || [], onClose: function () { setModal(null); }, onSaved: function () { setModal(null); load(); } }) : null);
  }

  function ConsoleSafety(props) {
    var c = props.ctx; var [aes, setAes] = React.useState(null); var [modal, setModal] = React.useState(null);
    function load() { client.getObjects('adverse_event').then(function (r) { setAes(arr(r)); }).catch(function () { setAes([]); }); }
    React.useEffect(load, []);
    var list = aes || [];
    var serious = list.filter(function (a) { return a.serious; }).length;
    var review = list.filter(function (a) { return a.ae_state === 'under_review'; }).length;
    return h('div', null,
      h('div', { className: 'tc-stats', style: { gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '16px' } },
        h(Stat, { n: list.length, l: 'Adverse events' }),
        h(Stat, { n: serious, l: 'Serious (SAE)', color: serious ? 'var(--red)' : 'var(--ink)' }),
        h(Stat, { n: review, l: 'Under review', color: 'var(--amber)' }),
        h(Stat, { n: list.filter(function (a) { return a.ae_state === 'resolved'; }).length, l: 'Resolved', color: 'var(--teal)' })),
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px' } }, h('div', { className: 'tc-mut' }, 'Serious AEs can be escalated as a saga: alert safety by email + Slack #safety, move under review (auto-reverts on failure).'),
        h('button', { className: 'tc-btn tc-btn-teal tc-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setModal({}); } }, '+ Report AE')),
      h(AeTable, { rows: list, loading: aes === null, canEscalate: true, onUpdate: load, onEdit: function (a) { setModal(a); }, onNew: function () { setModal({}); } }),
      modal !== null ? h(RecordModal, { schema: 'adverse_event', initial: modal, trials: c.trials || [], sites: c.sites || [], onClose: function () { setModal(null); }, onSaved: function () { setModal(null); load(); } }) : null);
  }

  function ConsoleDocuments(props) {
    var c = props.ctx; var [docs, setDocs] = React.useState(null); var [modal, setModal] = React.useState(null); var [f, setF] = React.useState('all'); var [aiBusy, setAiBusy] = React.useState(false); var [aiTip, setAiTip] = React.useState('');
    function load() { client.getObjects('trial_document').then(function (r) { setDocs(arr(r)); }).catch(function () { setDocs([]); }); }
    React.useEffect(load, []);
    function setDocState(d, st) { client.updateObject('trial_document', d.uuid, { doc_state: st }, d).then(function () { showToast('Document ' + st, 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    function summarize() {
      var trials = c.trials || []; if (!trials.length) return; setAiBusy(true); setAiTip('');
      var portfolio = trials.map(function (t) { return t.trial_code + ': ' + t.title + ' (' + t.phase + ', ' + t.therapeutic_area + ', ' + t.enrolled + '/' + t.enrollment_target + ' enrolled, ' + t.trial_state + ')'; }).join('; ');
      var prompt = 'You are a clinical operations analyst. In 2-3 sentences summarize the status of this trial portfolio for a sponsor brief: ' + portfolio;
      Promise.resolve().then(function () { if (!services || !services.ai || !services.ai.complete) throw 0; return services.ai.complete({ prompt: prompt }); })
        .then(function (r) { var t = aiText(r); if (!t) throw 0; setAiTip(t); setAiBusy(false); })
        .catch(function () {
          var active = trials.filter(function (t) { return t.trial_state === 'active' || t.trial_state === 'recruiting'; }).length;
          var enr = trials.reduce(function (s, t) { return s + (Number(t.enrolled) || 0); }, 0);
          var tgt = trials.reduce(function (s, t) { return s + (Number(t.enrollment_target) || 0); }, 0);
          var areas = {}; trials.forEach(function (t) { areas[t.therapeutic_area] = 1; });
          setAiTip('The portfolio spans ' + trials.length + ' trials across ' + Object.keys(areas).length + ' therapeutic areas, with ' + active + ' active or recruiting. Overall enrollment stands at ' + num(enr) + ' of ' + num(tgt) + ' target participants (' + pct(enr, tgt) + '%). Continue prioritizing site activation and screening throughput to keep enrollment on plan.');
          setAiBusy(false);
        });
    }
    var list = (docs || []).filter(function (d) { return f === 'all' || d.doc_state === f; }).sort(function (a, b) { return (b.updated_date || '').localeCompare(a.updated_date || ''); });
    return h('div', null,
      h('div', { className: 'tc-panel', style: { padding: '18px', marginBottom: '16px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
          h('div', { className: 'tc-eyebrow' }, '✦ Protocol summary helper'),
          h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', style: { marginLeft: 'auto' }, disabled: aiBusy, onClick: summarize }, aiBusy ? 'Summarizing…' : 'Summarize portfolio')),
        aiTip ? h('div', { className: 'tc-note', style: { marginTop: '10px', fontSize: '13.5px', lineHeight: 1.55 } }, aiTip) : h('div', { className: 'tc-mut', style: { marginTop: '6px', fontSize: '13px' } }, 'Generate a brief sponsor-ready summary of the current trial portfolio.')),
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' } },
        h('div', { className: 'tc-filters', style: { marginBottom: 0 } }, ['all', 'draft', 'pending', 'approved', 'expired'].map(function (s) { return h('button', { key: s, className: cls('tc-btn tc-btn-sm', f === s ? 'tc-btn-teal' : 'tc-btn-ghost'), onClick: function () { setF(s); } }, cap(s)); })),
        h('button', { className: 'tc-btn tc-btn-teal tc-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setModal({}); } }, '+ Add document')),
      h('div', { className: 'tc-panel' },
        h('div', { className: 'tc-table-h' }, h('span', { className: 'tc-grow' }, 'Title · Type'), h('span', { style: { width: '100px' } }, 'Trial'), h('span', { style: { width: '90px' } }, 'Version'), h('span', { style: { width: '110px' } }, 'State'), h('span', { style: { width: '110px' } }, '')),
        docs === null ? h('div', { className: 'tc-row tc-mut' }, 'Loading…')
          : list.length ? list.map(function (d) {
            return h('div', { key: d.uuid, className: 'tc-row' },
              h('div', { className: 'tc-grow', style: { cursor: 'pointer' }, onClick: function () { setModal(d); } }, h('div', { style: { fontWeight: 700 } }, d.title), h('div', { className: 'tc-mut' }, (d.doc_type || '') + ' · updated ' + fmtDate(d.updated_date))),
              h('div', { style: { width: '100px' } }, h('span', { className: 'tc-tag' }, d.trial_code || '—')),
              h('div', { style: { width: '90px' }, className: 'tc-mut' }, d.version || '—'),
              h('div', { style: { width: '110px' } }, h(Badge, { s: d.doc_state })),
              h('div', { style: { width: '110px' } }, d.doc_state === 'pending' ? h('button', { className: 'tc-btn tc-btn-ghost tc-btn-sm', onClick: function () { setDocState(d, 'approved'); } }, '✓ Approve') : null));
          }) : h('div', { className: 'tc-empty' }, 'No documents match.')),
      modal !== null ? h(RecordModal, { schema: 'trial_document', initial: modal, trials: c.trials || [], onClose: function () { setModal(null); }, onSaved: function () { setModal(null); load(); } }) : null);
  }

  function Console(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var tabs = [['home', 'Dashboard'], ['trials', 'Trials'], ['sites', 'Sites'], ['participants', 'Participants'], ['visits', 'Visits'], ['safety', 'Safety / AEs'], ['documents', 'Documents']];
    return h('div', { className: 'tc' },
      h('div', { style: { background: 'linear-gradient(100deg,#101a30,#1c2c4c)' } }, h('div', { className: 'tc-wrap', style: { display: 'flex', alignItems: 'center', height: '58px', gap: '12px', overflowX: 'auto' } },
        h('div', { className: 'tc-logo', style: { color: '#fff', flex: 'none' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.18)' } }, '🧬'), 'TrialCore', h('span', { style: { opacity: .65, fontWeight: 500, fontSize: '13px' } }, 'CTMS')),
        h('div', { className: 'tc-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('tc-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/console' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'tc-ibtn', style: { marginLeft: 'auto', color: '#9fb1cd', flex: 'none' }, onClick: function () { c.navigate('#/'); } }, 'Public site ↗'))),
      h('div', { className: 'tc-wrap', style: { padding: '24px 24px 64px' } },
        sub === 'home' ? h(ConsoleDashboard, { ctx: c })
          : sub === 'trials' ? h(ConsoleTrials, { ctx: c })
            : sub === 'sites' ? h(ConsoleSites, { ctx: c })
              : sub === 'participants' ? h(ConsoleParticipants, { ctx: c })
                : sub === 'visits' ? h(ConsoleVisits, { ctx: c })
                  : sub === 'safety' ? h(ConsoleSafety, { ctx: c })
                    : h(ConsoleDocuments, { ctx: c })));
  }

  function Footer() { return h('footer', { className: 'tc-foot' }, h('div', { className: 'tc-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'TrialCore'), ' — enterprise clinical trial management.'), h('div', null, 'Pharmacovigilance · GCP · Regulatory binder'))); }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [trials, setTrials] = React.useState(null); var [sites, setSites] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() {
      client.getObjects('trial').then(function (r) { setTrials(arr(r)); }).catch(function () { setTrials([]); });
      if (client.isAuthenticated()) client.getObjects('site').then(function (r) { setSites(arr(r)); }).catch(function () { setSites([]); });
    }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, trials: trials, sites: sites, reload: reload };
    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';

    if (top === 'console' && ctx.isAdmin) return h(ErrorBoundary, null, h(Console, { ctx: ctx, seg: seg }), showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'studies' && seg[1]) page = h(StudyDetail, { ctx: ctx, code: decodeURIComponent(seg[1]) });
    else if (top === 'studies') page = h(StudiesPage, { ctx: ctx });
    else if (top === 'site') page = h(CoordinatorSite, { ctx: ctx });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'tc' }, h(TopBar, { ctx: ctx }), page, h(Footer, null),
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
