// ui/app.js — Backlot: film & TV production studio management (custom UI).
// "Where stories get made." CINEMATIC theme — dark charcoal/near-black + gold.
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, ErrorBoundary)
// come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var GENRES = ['Drama', 'Comedy', 'Action', 'Thriller', 'Sci-Fi', 'Documentary', 'Horror', 'Romance'];
  var FORMATS = ['Feature', 'Series', 'Short', 'Commercial'];
  var PROD_STATES = ['development', 'pre_production', 'production', 'post_production', 'released', 'on_hold'];
  var ROLE_TYPES = ['Director', 'Actor', 'Producer', 'Writer', 'Cinematographer', 'Editor', 'Crew'];
  var SCENE_STATES = ['not_scheduled', 'scheduled', 'shot', 'needs_reshoot'];
  var LOCATION_STATES = ['scouting', 'secured', 'released'];
  var ASSIGNMENT_STATES = ['offered', 'confirmed', 'declined', 'wrapped'];
  var GENRE_ICON = { Drama: '🎭', Comedy: '😂', Action: '💥', Thriller: '🔪', 'Sci-Fi': '🛸', Documentary: '🎥', Horror: '👁', Romance: '🌹' };
  var STATE_LABEL = { development: 'In Development', pre_production: 'Pre-Production', production: 'In Production', post_production: 'Post-Production', released: 'Released', on_hold: 'On Hold' };
  var HERO = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=2200&h=1240';

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; if (!n) return '—'; if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'; try { return formatCurrency(n); } catch (e) { return '$' + n; } }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function fmtDT(s) { if (!s) return ''; try { return new Date(s).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function dayKey(s) { if (!s) return 'Unscheduled'; try { return new Date(s).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }); } catch (e) { return s; } }
  function statusColor(s) {
    return {
      development: '#8b7355', pre_production: '#b08d57', production: '#c9a227', post_production: '#6d28d9', released: '#15803d', on_hold: '#9ca3af',
      not_scheduled: '#9ca3af', scheduled: '#b08d57', shot: '#15803d', needs_reshoot: '#dc2626',
      scouting: '#b08d57', secured: '#15803d', released2: '#9ca3af',
      offered: '#b08d57', confirmed: '#15803d', declined: '#9ca3af', wrapped: '#6d28d9'
    }[s] || '#c9a227';
  }
  function isStaff() {
    try { return client.isAdmin() || client.canWrite('person') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
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
    if (document.getElementById('bl-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'bl-chrome';
    st.textContent = [
      ':root{--ink:#0b0b0d;--panel:#141416;--panel2:#1c1c20;--paper:#18181b;--bg:#0b0b0d;--gold:#c9a227;--gold2:#e3c45a;--cream:#f4efe3;--line:#2a2a2f;--line2:#33333a;--text:#ece9e2;--mut:#9a958a;--mut2:#6f6b62}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.bl{background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.bl *{box-sizing:border-box}.bl a{color:inherit;text-decoration:none}',
      '.bl-wrap{max-width:1200px;margin:0 auto;padding:0 24px}',
      '.disp{font-family:"Playfair Display",Georgia,serif}',
      '.cond{font-family:Oswald,"Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.04em}',
      '.bl-top{position:sticky;top:0;z-index:50;background:rgba(11,11,13,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}',
      '.bl-top-in{display:flex;align-items:center;gap:18px;height:70px}',
      '.bl-logo{display:flex;align-items:center;gap:11px;cursor:pointer}',
      '.bl-logo .mk{width:34px;height:34px;border-radius:7px;background:linear-gradient(135deg,var(--gold),#8a6d1c);display:flex;align-items:center;justify-content:center;color:#0b0b0d;font-size:18px;box-shadow:0 4px 14px -4px rgba(201,162,39,.6)}',
      '.bl-logo .wm{font-family:Oswald;font-weight:700;letter-spacing:.16em;font-size:21px;text-transform:uppercase;color:var(--text)}',
      '.bl-logo .wm i{color:var(--gold);font-style:normal}',
      '.bl-act{margin-left:auto;display:flex;align-items:center;gap:3px}',
      '.bl-ibtn{background:none;border:0;cursor:pointer;font-size:13.5px;color:var(--text);padding:9px 13px;border-radius:8px;font-weight:600}',
      '.bl-ibtn:hover{background:var(--panel2);color:var(--gold2)}',
      '.bl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:9px;font-weight:600;font-size:13.5px;padding:11px 20px;font-family:Inter;transition:.15s}',
      '.bl-btn:disabled{opacity:.5;cursor:default}',
      '.bl-btn-gold{background:linear-gradient(135deg,var(--gold2),var(--gold));color:#0b0b0d}.bl-btn-gold:hover:not(:disabled){filter:brightness(1.08)}',
      '.bl-btn-dark{background:var(--panel2);color:var(--text);border:1px solid var(--line2)}.bl-btn-dark:hover:not(:disabled){border-color:var(--gold);color:var(--gold2)}',
      '.bl-btn-ghost{background:transparent;color:var(--text);border:1px solid var(--line2)}.bl-btn-ghost:hover{border-color:var(--gold);color:var(--gold2)}',
      '.bl-btn-sm{padding:7px 13px;font-size:12.5px}',
      '.bl-hero{position:relative;overflow:hidden;background:#000}',
      '.bl-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42;filter:contrast(1.05) saturate(.85)}',
      '.bl-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,11,13,.2),rgba(11,11,13,.55) 60%,var(--bg))}',
      '.bl-hero-in{position:relative;z-index:2;padding:108px 0 116px}',
      '.bl-hero h1{font-family:"Playfair Display",serif;font-weight:700;font-size:clamp(40px,6.4vw,82px);line-height:.98;margin:14px 0 0;max-width:880px;color:#fff;text-shadow:0 2px 40px rgba(0,0,0,.6)}',
      '.bl-hero p{font-size:18px;color:#d9d4c8;max-width:560px;margin:20px 0 0;line-height:1.55}',
      '.bl-kicker{display:inline-flex;align-items:center;gap:10px;font-family:Oswald;font-size:12px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:var(--gold2)}',
      '.bl-kicker:before,.bl-kicker:after{content:"";width:34px;height:1px;background:var(--gold)}',
      '.bl-sec{padding:60px 0}',
      '.bl-eyebrow{font-family:Oswald;font-size:12px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:var(--gold)}',
      '.bl-h2{font-family:"Playfair Display",serif;font-weight:700;font-size:32px;margin:6px 0 0;color:var(--text)}',
      '.bl-filters{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0}',
      '.bl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:22px}',
      '.bl-poster{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;background:#000;aspect-ratio:2/3;box-shadow:0 18px 44px -22px rgba(0,0,0,.9);transition:.22s}',
      '.bl-poster:hover{transform:translateY(-5px);box-shadow:0 28px 60px -22px rgba(201,162,39,.35)}',
      '.bl-poster img{width:100%;height:100%;object-fit:cover;filter:contrast(1.04) saturate(.92);transition:.4s}',
      '.bl-poster:hover img{transform:scale(1.05);filter:contrast(1.06) saturate(1)}',
      '.bl-poster-ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,transparent 32%,transparent 50%,rgba(0,0,0,.92));display:flex;flex-direction:column;justify-content:flex-end;padding:18px}',
      '.bl-poster h3{font-family:"Playfair Display",serif;font-weight:700;font-size:21px;color:#fff;margin:0;line-height:1.08}',
      '.bl-poster .meta{font-family:Oswald;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#cbb873;margin-top:7px}',
      '.bl-poster .top{position:absolute;top:14px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start}',
      '.bl-stamp{font-family:Oswald;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:5px 9px;border-radius:4px;color:#0b0b0d;background:var(--gold2)}',
      '.bl-gtag{font-size:20px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7))}',
      '.bl-chip{display:inline-block;font-family:Oswald;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--gold2);background:rgba(201,162,39,.12);border:1px solid rgba(201,162,39,.3);border-radius:4px;padding:4px 10px}',
      '.bl-panel{background:var(--panel);border:1px solid var(--line);border-radius:12px}',
      '.bl-panel2{background:var(--panel2);border:1px solid var(--line2);border-radius:10px}',
      '.bl-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.bl-row:first-child{border-top:0}.bl-grow{flex:1;min-width:0}.bl-mut{color:var(--mut);font-size:13px}',
      '.bl-badge{display:inline-block;font-family:Oswald;font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:4px;color:#0b0b0d;white-space:nowrap}',
      '.bl-2col{display:grid;grid-template-columns:1fr 380px;gap:24px;align-items:start}',
      '.bl-field{display:block;margin-top:14px}.bl-field span{display:block;font-family:Oswald;font-size:11px;font-weight:500;letter-spacing:.1em;color:var(--mut);text-transform:uppercase;margin-bottom:6px}',
      '.bl-input{width:100%;border:1px solid var(--line2);background:var(--ink);border-radius:8px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--text)}',
      '.bl-input:focus{outline:none;border-color:var(--gold)}textarea.bl-input{min-height:86px;resize:vertical}',
      '.bl-input::placeholder{color:var(--mut2)}',
      '.bl-modal{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)}',
      '.bl-sheet{background:var(--panel);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:600px;max-height:92vh;overflow:auto;position:relative}',
      '.bl-x{position:absolute;top:14px;right:16px;background:none;border:0;font-size:24px;cursor:pointer;color:var(--mut);z-index:2}.bl-x:hover{color:var(--gold2)}',
      '.bl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.bl-stat{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:18px;position:relative;overflow:hidden}',
      '.bl-stat:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--gold)}',
      '.bl-stat-n{font-family:Oswald;font-weight:700;font-size:30px;line-height:1;color:var(--text)}',
      '.bl-stat-l{font-family:Oswald;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-top:8px}',
      '.bl-bars{display:flex;align-items:flex-end;gap:12px;height:180px;padding:14px 4px 0}',
      '.bl-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:7px}',
      '.bl-bar .v{font-family:Oswald;font-size:13px;font-weight:600;color:var(--gold2)}',
      '.bl-bar .b{width:100%;max-width:46px;border-radius:5px 5px 0 0;background:linear-gradient(180deg,var(--gold2),var(--gold))}',
      '.bl-bar .l{font-family:Oswald;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);text-align:center;line-height:1.2}',
      '.bl-tabs{display:flex;gap:2px;flex-wrap:wrap}.bl-tab{background:none;border:0;color:var(--mut);cursor:pointer;font-family:Oswald;font-size:13px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:9px 15px;border-radius:7px}.bl-tab:hover{color:var(--text)}.bl-tab.on{background:rgba(201,162,39,.14);color:var(--gold2)}',
      '.bl-strip{border-left:3px solid var(--gold);background:var(--panel2);border-radius:0 9px 9px 0;padding:14px 16px;margin-bottom:10px}',
      '.bl-daybar{font-family:Oswald;font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold2);margin:22px 0 12px;display:flex;align-items:center;gap:12px}',
      '.bl-daybar:after{content:"";flex:1;height:1px;background:var(--line2)}',
      '.bl-avatar{width:44px;height:44px;border-radius:50%;overflow:hidden;flex:none;background:var(--panel2);border:1px solid var(--line2)}.bl-avatar img{width:100%;height:100%;object-fit:cover}',
      '.bl-chat{background:var(--ink);border:1px solid var(--line2);border-radius:10px;padding:16px;max-height:440px;overflow:auto;display:flex;flex-direction:column;gap:12px}',
      '.bl-msg{max-width:84%;padding:11px 14px;border-radius:12px;font-size:14px;line-height:1.55;white-space:pre-wrap}',
      '.bl-msg.user{align-self:flex-end;background:linear-gradient(135deg,var(--gold2),var(--gold));color:#0b0b0d;font-weight:500}',
      '.bl-msg.ai{align-self:flex-start;background:var(--panel2);border:1px solid var(--line2);color:var(--text)}',
      '.bl-msg-from{font-family:Oswald;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:5px}',
      '.bl-typing i{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--gold);margin:0 2px;animation:blink 1.2s infinite both}',
      '.bl-typing i:nth-child(2){animation-delay:.2s}.bl-typing i:nth-child(3){animation-delay:.4s}',
      '@keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}',
      '.bl-foot{background:#000;color:var(--mut);padding:40px 0;font-size:13px;margin-top:50px;border-top:1px solid var(--line)}',
      '.bl-empty{text-align:center;padding:66px 20px;color:var(--mut)}',
      '.bl-pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:20px}',
      '.bl-pcard{background:var(--panel);border:1px solid var(--line);border-radius:11px;overflow:hidden;text-align:center;padding-bottom:16px;transition:.18s}',
      '.bl-pcard:hover{border-color:var(--line2);transform:translateY(-3px)}',
      '.bl-pcard-img{height:170px;overflow:hidden;background:#000}.bl-pcard-img img{width:100%;height:100%;object-fit:cover;filter:grayscale(.25) contrast(1.05)}',
      '.bl-console-bar{background:linear-gradient(100deg,#0b0b0d,#1a1206);border-bottom:1px solid var(--line2)}',
      '@media(max-width:980px){.bl-grid{grid-template-columns:repeat(2,1fr)}.bl-stats{grid-template-columns:repeat(2,1fr)}.bl-2col{grid-template-columns:1fr}.bl-pgrid{grid-template-columns:repeat(2,1fr)}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'bl-logo', onClick: p.onClick }, h('span', { className: 'mk' }, '🎬'), h('span', { className: 'wm' }, 'BACK', h('i', null, 'LOT'))); }
  function Field(p) { return h('label', { className: 'bl-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'bl-badge', style: { background: statusColor(p.s) } }, (STATE_LABEL[p.s] || (p.s || '')).replace(/_/g, ' ')); }

  // ── AI grounding — Script & Production Assistant ────────────────────────────────
  function prodContext(prods) {
    return (prods || []).slice(0, 30).map(function (p) {
      return '• ' + p.title + ' — ' + (p.genre || '') + ' ' + (p.format || '') + ', ' + (STATE_LABEL[p.prod_state] || p.prod_state) +
        ', dir. ' + (p.director_name || 'TBD') + (p.budget ? ', budget ' + money(p.budget) : '') + '. Logline: ' + (p.logline || '—');
    }).join('\n');
  }
  function askAssistant(question, prods) {
    var prompt = 'You are the Script & Production Assistant for a film & TV studio called Backlot. ' +
      'Answer the production team clearly and concisely (2-5 sentences). You can answer questions about the slate below, ' +
      'draft loglines, break a scene down into a shot list, or suggest scheduling. Use the slate as ground truth when the question is about a specific project.\n\n' +
      'CURRENT SLATE:\n' + prodContext(prods) + '\n\nQUESTION: ' + question + '\n\nAnswer:';
    return Promise.resolve().then(function () {
      if (!services || !services.ai || !services.ai.complete) throw new Error('no-ai');
      return services.ai.complete({ prompt: prompt });
    }).then(function (res) {
      var t = aiText(res); if (!t) throw new Error('empty');
      return { text: t, ai: true };
    }).catch(function () {
      return { text: deterministicAnswer(question, prods), ai: false };
    });
  }
  function deterministicAnswer(q, prods) {
    var ql = (q || '').toLowerCase();
    var named = (prods || []).filter(function (p) { return ql.indexOf((p.title || '').toLowerCase()) >= 0; })[0];
    if (/logline|pitch|one.?liner/.test(ql)) {
      if (named) return 'Logline — ' + named.title + ':\n"' + (named.logline || 'A story still finding its shape.') + '"\n\nAlt angle: lead with the irreversible choice your protagonist makes by the end of Act One, then state the cost.';
      return 'A strong logline names (1) the protagonist, (2) the inciting want, (3) the antagonistic force, and (4) the stakes — in one sentence. Try: "When [event], a [flawed hero] must [goal] before [ticking clock] — or [cost]."';
    }
    if (/scene|shot list|break ?down|coverage/.test(ql)) {
      return 'Scene breakdown framework:\n1. Slug it — INT/EXT, location, DAY/NIGHT.\n2. Beats — list the 3-4 dramatic beats; one camera setup per beat.\n3. Coverage — master, then singles on the active character each beat, then inserts (hands, objects, eyelines).\n4. Page count drives the day: ~1 page ≈ 1 setup hour. Flag stunts, VFX plates and minors for the AD.';
    }
    if (/schedule|shoot day|call sheet|strip/.test(ql)) {
      return 'Schedule by location, not by script order — group every scene at one location into the fewest days, then sort INT before EXT to protect for weather, and shoot NIGHT scenes back-to-back to limit turnaround penalties. Lock company moves to once per day.';
    }
    if (/budget|cost|spend/.test(ql)) {
      var tot = (prods || []).reduce(function (s, p) { return s + (p.budget || 0); }, 0);
      return 'The slate carries roughly ' + money(tot) + ' in committed budget across ' + (prods || []).length + ' projects. Above-the-line (cast, director, producers, rights) typically runs 25-40%; the rest is production, post and a 10% contingency you should never spend before principal photography wraps.';
    }
    if (named) {
      return named.title + ' is a ' + (named.genre || '') + ' ' + (named.format || '').toLowerCase() + ' currently ' + (STATE_LABEL[named.prod_state] || named.prod_state).toLowerCase() + ', directed by ' + (named.director_name || 'a director still to be attached') + '. ' + (named.logline || '');
    }
    var inProd = (prods || []).filter(function (p) { return p.prod_state === 'production'; });
    return 'I can help with loglines, scene breakdowns, scheduling and budget questions across the slate. Right now you have ' + (prods || []).length + ' projects on the books' + (inProd.length ? ', ' + inProd.length + ' actively shooting (' + inProd.map(function (p) { return p.title; }).join(', ') + ')' : '') + '. Ask me to break down a scene or draft a logline for any of them.';
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'office@backlot.studio');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'bl-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'bl-sheet', style: { maxWidth: '420px', padding: '36px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'bl-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'disp', style: { fontSize: '26px', fontWeight: 700, marginTop: '18px' } }, props.title || 'Sign in to the studio'),
        h('p', { className: 'bl-mut' }, 'Production office, or cast & crew for your call sheet.'),
        h(Field, { label: 'Email', children: h('input', { className: 'bl-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'bl-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: '#f87171', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'bl-btn bl-btn-gold', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '20px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'bl-mut', style: { marginTop: '16px', textAlign: 'center', fontSize: '12px' } }, 'Demo — office@backlot.studio · crew@backlot.studio · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'bl-top' }, h('div', { className: 'bl-wrap bl-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'bl-act' },
        h('button', { className: 'bl-ibtn', onClick: function () { c.navigate('#/slate'); } }, 'The Slate'),
        h('button', { className: 'bl-ibtn', onClick: function () { c.navigate('#/casting'); } }, 'Casting'),
        c.isAdmin ? h('button', { className: 'bl-ibtn', onClick: function () { c.navigate('#/studio'); } }, '🎬 Studio') : null,
        c.authed && !c.isAdmin ? h('button', { className: 'bl-ibtn', onClick: function () { c.navigate('#/callsheet'); } }, '🎟 My call sheet') : null,
        c.authed ? h('button', { className: 'bl-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', onClick: c.openLogin }, 'Sign in'))));
  }

  // ── Public: The Slate (poster showcase) ─────────────────────────────────────
  function PosterCard(props) {
    var p = props.p;
    return h('div', { className: 'bl-poster', onClick: function () { props.ctx.navigate('#/title/' + p.uuid); } },
      h('img', { src: imgUrl(p.poster), alt: p.title, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
      h('div', { className: 'bl-poster-ov' },
        h('div', { className: 'top' },
          h('span', { className: 'bl-gtag' }, GENRE_ICON[p.genre] || '🎬'),
          h('span', { className: 'bl-stamp', style: { background: statusColor(p.prod_state), color: p.prod_state === 'on_hold' ? '#0b0b0d' : '#0b0b0d' } }, (STATE_LABEL[p.prod_state] || p.prod_state).replace(/_/g, ' '))),
        h('div', null,
          h('h3', null, p.title),
          h('div', { className: 'meta' }, (p.genre || '') + ' · ' + (p.format || '') + (p.director_name ? ' · ' + p.director_name : '')))));
  }

  function Home(props) {
    var c = props.ctx;
    var prods = (c.productions || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var featured = prods.slice(0, 6);
    return h('div', null,
      h('section', { className: 'bl-hero' }, h('img', { src: HERO, alt: '' }),
        h('div', { className: 'bl-wrap bl-hero-in' },
          h('span', { className: 'bl-kicker' }, 'Backlot Studios'),
          h('h1', { className: 'disp' }, 'Where stories', h('br'), 'get made.'),
          h('p', null, 'From the first logline to final cut — a production studio running its slate, its schedule and its crew in one place.'),
          h('div', { style: { display: 'flex', gap: '12px', marginTop: '30px', flexWrap: 'wrap' } },
            h('button', { className: 'bl-btn bl-btn-gold', onClick: function () { c.navigate('#/slate'); } }, 'Explore the slate'),
            h('button', { className: 'bl-btn bl-btn-ghost', style: { color: '#fff' }, onClick: function () { c.navigate('#/casting'); } }, 'Casting & careers')))),
      h('section', { className: 'bl-sec' }, h('div', { className: 'bl-wrap' },
        h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' } },
          h('div', null, h('div', { className: 'bl-eyebrow' }, 'Now on the slate'), h('h2', { className: 'bl-h2' }, 'Currently in production')),
          h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { c.navigate('#/slate'); } }, 'View all titles')),
        c.productions === null ? h('div', { className: 'bl-empty' }, 'Loading the slate…')
          : h('div', { className: 'bl-grid' }, featured.map(function (p) { return h(PosterCard, { key: p.uuid, p: p, ctx: c }); })))),
      h('section', { style: { paddingBottom: '40px' } }, h('div', { className: 'bl-wrap' },
        h('div', { className: 'bl-panel', style: { padding: '34px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(120deg,var(--panel),#1a1206)' } },
          h('div', { style: { fontSize: '44px' } }, '🎞'),
          h('div', { style: { flex: 1, minWidth: '260px' } },
            h('div', { className: 'disp', style: { fontSize: '24px', fontWeight: 600, color: 'var(--gold2)' } }, 'One studio. The whole production.'),
            h('div', { className: 'bl-mut', style: { marginTop: '8px', lineHeight: 1.6 } }, 'Run the slate, build the day-out-of-days schedule on the strip board, offer roles and fire call sheets to cast & crew — all from the production office.')),
          h('button', { className: 'bl-btn bl-btn-gold', onClick: function () { c.isAdmin ? c.navigate('#/studio') : c.openLogin(); } }, 'Open the studio console')))));
  }

  function SlatePage(props) {
    var c = props.ctx;
    var [genre, setGenre] = React.useState('all'); var [st, setSt] = React.useState('all');
    var prods = (c.productions || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
      .filter(function (p) { return (genre === 'all' || p.genre === genre) && (st === 'all' || p.prod_state === st); });
    return h('div', { className: 'bl-wrap bl-sec' },
      h('div', { className: 'bl-eyebrow' }, 'The complete slate'),
      h('h2', { className: 'bl-h2' }, 'Every story, every stage'),
      h('div', { className: 'bl-filters' },
        h('button', { className: cls('bl-btn bl-btn-sm', genre === 'all' ? 'bl-btn-gold' : 'bl-btn-ghost'), onClick: function () { setGenre('all'); } }, 'All genres'),
        GENRES.map(function (g) { return h('button', { key: g, className: cls('bl-btn bl-btn-sm', genre === g ? 'bl-btn-gold' : 'bl-btn-ghost'), onClick: function () { setGenre(g); } }, (GENRE_ICON[g] || '') + ' ' + g); })),
      h('div', { className: 'bl-filters', style: { marginTop: '0' } },
        h('button', { className: cls('bl-btn bl-btn-sm', st === 'all' ? 'bl-btn-dark' : 'bl-btn-ghost'), onClick: function () { setSt('all'); } }, 'Any stage'),
        PROD_STATES.map(function (s) { return h('button', { key: s, className: cls('bl-btn bl-btn-sm', st === s ? 'bl-btn-dark' : 'bl-btn-ghost'), onClick: function () { setSt(s); } }, STATE_LABEL[s] || s); })),
      c.productions === null ? h('div', { className: 'bl-empty' }, 'Loading…')
        : prods.length ? h('div', { className: 'bl-grid' }, prods.map(function (p) { return h(PosterCard, { key: p.uuid, p: p, ctx: c }); }))
          : h('div', { className: 'bl-empty' }, 'No titles match those filters.'));
  }

  function TitlePage(props) {
    var c = props.ctx;
    var p = (c.productions || []).filter(function (x) { return x.uuid === props.uuid; })[0];
    var [scenes, setScenes] = React.useState(null);
    React.useEffect(function () {
      if (!p) return;
      if (c.authed) client.getObjects('scene').then(function (r) { setScenes(arr(r).filter(function (s) { return s.production_title === p.title; })); }).catch(function () { setScenes([]); });
      else setScenes([]);
    }, [props.uuid, c.authed, p && p.uuid]);
    if (!p) return h('div', { className: 'bl-wrap bl-sec' }, h('div', { className: 'bl-empty' }, 'Title not found.'));
    return h('div', null,
      h('section', { style: { position: 'relative', overflow: 'hidden', background: '#000' } },
        h('img', { src: imgUrl(p.poster), alt: '', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .3, filter: 'blur(2px)' }, onError: function (e) { e.target.style.visibility = 'hidden'; } }),
        h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,11,13,.5),var(--bg))' } }),
        h('div', { className: 'bl-wrap', style: { position: 'relative', padding: '40px 24px 48px' } },
          h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', style: { color: '#fff' }, onClick: function () { c.navigate('#/slate'); } }, '← The Slate'),
          h('div', { style: { display: 'flex', gap: '28px', marginTop: '24px', flexWrap: 'wrap' } },
            h('div', { style: { width: '220px', flex: 'none', aspectRatio: '2/3', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 24px 50px -18px rgba(0,0,0,.9)' } },
              h('img', { src: imgUrl(p.poster), alt: p.title, style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { style: { flex: 1, minWidth: '280px' } },
              h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, h(Badge, { s: p.prod_state }), h('span', { className: 'bl-chip' }, p.genre), h('span', { className: 'bl-chip' }, p.format)),
              h('h1', { className: 'disp', style: { fontSize: '46px', fontWeight: 700, margin: '12px 0 0', color: '#fff' } }, p.title),
              p.director_name ? h('div', { className: 'cond', style: { color: 'var(--gold2)', fontSize: '14px', marginTop: '8px' } }, 'Directed by ' + p.director_name) : null,
              h('p', { style: { fontSize: '16.5px', lineHeight: 1.65, color: 'var(--text)', maxWidth: '620px', marginTop: '16px', fontStyle: 'italic' } }, '"' + (p.logline || '') + '"'),
              h('div', { style: { display: 'flex', gap: '28px', marginTop: '22px', flexWrap: 'wrap' } },
                p.budget ? h('div', null, h('div', { className: 'bl-eyebrow' }, 'Budget'), h('div', { className: 'cond', style: { fontSize: '22px', color: 'var(--text)', marginTop: '4px' } }, money(p.budget))) : null,
                p.start_date ? h('div', null, h('div', { className: 'bl-eyebrow' }, 'Principal photography'), h('div', { className: 'cond', style: { fontSize: '15px', color: 'var(--text)', marginTop: '8px' } }, fmtDate(p.start_date) + (p.wrap_date ? ' → ' + fmtDate(p.wrap_date) : ''))) : null))))),
      h('section', { className: 'bl-wrap', style: { padding: '8px 24px 40px' } },
        c.authed ? h('div', null,
          h('div', { className: 'bl-eyebrow', style: { marginTop: '20px' } }, 'Scenes'),
          scenes === null ? h('div', { className: 'bl-mut', style: { marginTop: '10px' } }, 'Loading scenes…')
            : scenes.length ? h('div', { className: 'bl-panel', style: { marginTop: '12px' } }, scenes.map(function (sc) {
              return h('div', { key: sc.uuid, className: 'bl-row' },
                h('div', { className: 'cond', style: { width: '54px', flex: 'none', fontSize: '17px', color: 'var(--gold2)' } }, sc.scene_number),
                h('div', { className: 'bl-grow' }, h('div', { style: { fontWeight: 600 } }, (sc.int_ext || '') + '. ' + (sc.location_name || '') + ' — ' + (sc.time_of_day || '')), h('div', { className: 'bl-mut' }, sc.description)),
                h(Badge, { s: sc.scene_state }));
            })) : h('div', { className: 'bl-mut', style: { marginTop: '10px' } }, 'No scenes logged yet.'))
          : h('div', { className: 'bl-panel', style: { marginTop: '20px', padding: '22px', textAlign: 'center' } },
            h('div', { className: 'bl-mut' }, 'Sign in to the production office to see this title\'s scenes and schedule.'),
            h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', style: { marginTop: '12px' }, onClick: c.openLogin }, 'Sign in'))));
  }

  function CastingPage(props) {
    var c = props.ctx;
    return h('div', { className: 'bl-wrap bl-sec' },
      h('div', { className: 'bl-eyebrow' }, 'Casting & careers'),
      h('h2', { className: 'bl-h2' }, 'Get on a Backlot set'),
      h('div', { className: 'bl-2col', style: { marginTop: '24px' } },
        h('div', { className: 'bl-panel', style: { padding: '28px' } },
          h('div', { className: 'disp', style: { fontSize: '22px', color: 'var(--gold2)', fontWeight: 600 } }, 'We\'re always reading.'),
          h('p', { style: { lineHeight: 1.7, color: 'var(--text)', marginTop: '12px' } }, 'Backlot casts cast and crew across eight genres and four formats — features, episodics, shorts and commercials. Whether you\'re an A-list lead or a first-day grip, every role on every production runs through one call sheet: yours.'),
          h('p', { style: { lineHeight: 1.7, color: 'var(--mut)', marginTop: '14px' } }, 'Already attached to a project? Sign in to your portal to confirm offers, see your call times and locations, and know exactly where to be when the camera rolls.'),
          h('button', { className: 'bl-btn bl-btn-gold', style: { marginTop: '18px' }, onClick: function () { c.authed ? c.navigate('#/callsheet') : c.openLogin(); } }, c.authed ? 'Open my call sheet' : 'Sign in to your call sheet')),
        h('div', null,
          ['Actors', 'Directors & DPs', 'Writers', 'Grip · Electric · Art'].map(function (dept, i) {
            return h('div', { key: dept, className: 'bl-panel2', style: { padding: '18px', marginBottom: '12px' } },
              h('div', { className: 'cond', style: { color: 'var(--gold2)', fontSize: '15px' } }, dept),
              h('div', { className: 'bl-mut', style: { marginTop: '4px' } }, ['On-camera talent, all ages and ranges.', 'Vision-led department heads.', 'Features, episodics and the room.', 'Below-the-line crew, IATSE and non-union.'][i]));
          }),
          h('div', { className: 'bl-mut', style: { fontSize: '12px', textAlign: 'center', marginTop: '10px' } }, 'Submissions through your representation.'))));
  }

  // ── Crew/cast portal: My call sheet (owner-scoped assignments) ──────────────
  function CallSheet(props) {
    var c = props.ctx;
    var [items, setItems] = React.useState(null);
    function load() { client.getObjects('assignment').then(function (r) { setItems(arr(r).sort(function (a, b) { return (a.call_time || '').localeCompare(b.call_time || ''); })); }).catch(function () { setItems([]); }); }
    React.useEffect(function () { if (c.authed) load(); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'bl-wrap bl-sec' }, h('div', { className: 'bl-empty' }, h('h2', { className: 'bl-h2' }, 'Sign in to your call sheet'), h('button', { className: 'bl-btn bl-btn-gold', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    function setState(a, stt) { client.updateObject('assignment', a.uuid, { assignment_state: stt }, a).then(function () { showToast(stt === 'confirmed' ? 'Role confirmed — see you on set' : 'Role declined', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    var items2 = items || [];
    var offered = items2.filter(function (a) { return a.assignment_state === 'offered'; });
    var confirmed = items2.filter(function (a) { return a.assignment_state === 'confirmed'; });
    var past = items2.filter(function (a) { return a.assignment_state === 'wrapped' || a.assignment_state === 'declined'; });
    function row(a, withActions) {
      return h('div', { key: a.uuid, className: 'bl-row' },
        h('div', { className: 'cond', style: { width: '64px', flex: 'none', textAlign: 'center' } },
          h('div', { style: { fontSize: '20px', color: 'var(--gold2)' } }, a.call_time ? new Date(a.call_time).getDate() : '—'),
          h('div', { style: { fontSize: '10px', color: 'var(--mut)' } }, a.call_time ? new Date(a.call_time).toLocaleDateString(undefined, { month: 'short' }).toUpperCase() : '')),
        h('div', { className: 'bl-grow' },
          h('div', { style: { fontWeight: 700 } }, a.production_title + (a.character_name ? ' — ' + a.character_name : '')),
          h('div', { className: 'bl-mut' }, (a.role_type || '') + ' · 📍 ' + (a.location_name || 'TBD') + ' · 🕐 ' + fmtDT(a.call_time))),
        withActions ? h('div', { style: { display: 'flex', gap: '6px' } },
          h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', onClick: function () { setState(a, 'confirmed'); } }, 'Confirm'),
          h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { setState(a, 'declined'); } }, 'Decline'))
          : h(Badge, { s: a.assignment_state }));
    }
    return h('div', { className: 'bl-wrap bl-sec' },
      h('div', { className: 'bl-eyebrow' }, 'Cast & crew portal'),
      h('h2', { className: 'bl-h2' }, 'My call sheet'),
      h('p', { className: 'bl-mut', style: { marginTop: '6px' } }, 'Only your roles — confirm offers and find your call time and set.'),
      items === null ? h('div', { className: 'bl-empty' }, 'Loading…') : h('div', { style: { marginTop: '20px' } },
        offered.length ? h('div', null, h('div', { className: 'bl-daybar' }, '⭐ Pending offers'),
          h('div', { className: 'bl-panel' }, offered.map(function (a) { return row(a, true); }))) : null,
        h('div', { className: 'bl-daybar' }, '🎟 Confirmed — upcoming'),
        confirmed.length ? h('div', { className: 'bl-panel' }, confirmed.map(function (a) { return row(a, false); }))
          : h('div', { className: 'bl-panel' }, h('div', { className: 'bl-empty', style: { padding: '34px' } }, 'No confirmed calls yet.')),
        past.length ? h('div', null, h('div', { className: 'bl-daybar' }, '🎬 History'),
          h('div', { className: 'bl-panel' }, past.map(function (a) { return row(a, false); }))) : null));
  }

  // ── Studio console (production office) ──────────────────────────────────────
  function CStat(p) { return h('div', { className: 'bl-stat' }, h('div', { className: 'bl-stat-n' }, p.n), h('div', { className: 'bl-stat-l' }, p.l)); }

  function StudioDash(props) {
    var c = props.ctx;
    var [scenes, setScenes] = React.useState([]); var [assigns, setAssigns] = React.useState([]);
    React.useEffect(function () {
      client.getObjects('scene').then(function (r) { setScenes(arr(r)); }).catch(function () {});
      client.getObjects('assignment').then(function (r) { setAssigns(arr(r)); }).catch(function () {});
    }, []);
    var prods = c.productions || [];
    var totalBudget = prods.reduce(function (s, p) { return s + (p.budget || 0); }, 0);
    var shot = scenes.filter(function (s) { return s.scene_state === 'shot'; }).length;
    var remaining = scenes.length - shot;
    var byStage = PROD_STATES.map(function (st) { return { label: STATE_LABEL[st].split('-')[0], value: prods.filter(function (p) { return p.prod_state === st; }).length }; });
    var maxV = Math.max.apply(null, byStage.map(function (b) { return b.value; }).concat([1]));
    var upcoming = scenes.filter(function (s) { return s.shoot_date && new Date(s.shoot_date) >= new Date() && s.scene_state !== 'shot'; })
      .sort(function (a, b) { return (a.shoot_date || '').localeCompare(b.shoot_date || ''); }).slice(0, 6);
    return h('div', null,
      h('div', { className: 'bl-stats' },
        h(CStat, { n: prods.filter(function (p) { return p.prod_state === 'production'; }).length, l: 'In production' }),
        h(CStat, { n: money(totalBudget), l: 'Slate budget' }),
        h(CStat, { n: shot + ' / ' + scenes.length, l: 'Scenes shot' }),
        h(CStat, { n: assigns.filter(function (a) { return a.assignment_state === 'offered'; }).length, l: 'Open offers' })),
      h('div', { className: 'bl-2col', style: { marginTop: '20px' } },
        h('div', { className: 'bl-panel', style: { padding: '22px' } },
          h('div', { className: 'cond', style: { fontSize: '15px', color: 'var(--gold2)', marginBottom: '2px' } }, 'Productions by stage'),
          h('div', { className: 'bl-bars' }, byStage.map(function (b) {
            return h('div', { key: b.label, className: 'bl-bar' }, h('div', { className: 'v' }, b.value),
              h('div', { className: 'b', style: { height: Math.max(4, (b.value / maxV) * 130) + 'px', opacity: b.value ? 1 : .3 } }), h('div', { className: 'l' }, b.label));
          })),
          h('div', { style: { display: 'flex', gap: '18px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' } },
            h('div', null, h('div', { className: 'bl-eyebrow' }, 'Scenes remaining'), h('div', { className: 'cond', style: { fontSize: '24px', color: remaining ? 'var(--gold2)' : 'var(--text)' } }, remaining)),
            h('div', null, h('div', { className: 'bl-eyebrow' }, 'Reshoots flagged'), h('div', { className: 'cond', style: { fontSize: '24px', color: '#f87171' } }, scenes.filter(function (s) { return s.scene_state === 'needs_reshoot'; }).length)))),
        h('div', { className: 'bl-panel', style: { padding: '22px' } },
          h('div', { className: 'cond', style: { fontSize: '15px', color: 'var(--gold2)', marginBottom: '10px' } }, 'Upcoming shoot days'),
          upcoming.length ? upcoming.map(function (s) {
            return h('div', { key: s.uuid, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: '13.5px' } },
              h('span', null, h('b', { className: 'cond', style: { color: 'var(--gold2)' } }, 'Sc.' + s.scene_number), ' ' + (s.production_title || '')),
              h('span', { className: 'bl-mut' }, fmtDT(s.shoot_date)));
          }) : h('div', { className: 'bl-mut' }, 'Nothing scheduled ahead — open the Schedule to plan days.'),
          h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', style: { marginTop: '14px' }, onClick: function () { c.navigate('#/studio/schedule'); } }, 'Open the strip board →'))));
  }

  // Generic edit modal driven by a field spec
  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; if (fd.img) v = imgUrl(init[fd.img]); f[fd.k] = (v == null) ? '' : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {}; fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; } if (v === '' || v == null) return; if (fd.type === 'number') v = Number(v);
        if (fd.img) { data[fd.img] = { url: v, thumbnail_url: v }; return; } data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); var mf = []; try { mf = parse422Error(e); } catch (x) {} showToast(mf.length ? 'Missing: ' + mf.join(', ') : 'Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'bl-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'bl-sheet', style: { padding: '28px' } }, h('button', { className: 'bl-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'disp', style: { fontSize: '23px', fontWeight: 700 } }, init.uuid ? props.editTitle : props.newTitle),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' } }, fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'bl-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'bl-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, (STATE_LABEL[o] || o).replace(/_/g, ' ')); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 0' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'bl-mut' }, fd.checkLabel || 'Yes'));
          else input = h('input', { className: 'bl-input', type: fd.type === 'number' ? 'number' : (fd.type === 'date' ? 'date' : (fd.type === 'datetime' ? 'datetime-local' : 'text')), value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h('div', { key: fd.k, style: { gridColumn: fd.full ? '1 / -1' : 'auto' } }, h(Field, { label: fd.label, req: fd.req, children: input }));
        })),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '20px' } },
          h('button', { className: 'bl-btn bl-btn-gold', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'bl-btn bl-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  var PROD_FIELDS = [
    { k: 'title', label: 'Title', req: true, full: true }, { k: 'genre', label: 'Genre', type: 'select', opts: GENRES },
    { k: 'format', label: 'Format', type: 'select', opts: FORMATS }, { k: 'prod_state', label: 'Stage', type: 'select', opts: PROD_STATES, req: true },
    { k: 'director_name', label: 'Director' }, { k: 'budget', label: 'Budget ($)', type: 'number' },
    { k: 'start_date', label: 'Start date', type: 'date' }, { k: 'wrap_date', label: 'Wrap date', type: 'date' },
    { k: 'poster_url', img: 'poster', label: 'Poster URL', full: true }, { k: 'logline', label: 'Logline', type: 'textarea', full: true }
  ];
  var PERSON_FIELDS = [
    { k: 'full_name', label: 'Full name', req: true, full: true }, { k: 'role_type', label: 'Role', type: 'select', opts: ROLE_TYPES },
    { k: 'department', label: 'Department' }, { k: 'email', label: 'Email' }, { k: 'phone', label: 'Phone' },
    { k: 'day_rate', label: 'Day rate ($)', type: 'number' }, { k: 'agency', label: 'Agency / union' }, { k: 'photo_url', img: 'photo', label: 'Photo URL', full: true }
  ];
  var LOC_FIELDS = [
    { k: 'name', label: 'Name', req: true, full: true }, { k: 'address', label: 'Address', full: true },
    { k: 'location_type', label: 'Type' }, { k: 'day_rate', label: 'Day rate ($)', type: 'number' },
    { k: 'location_state', label: 'Status', type: 'select', opts: LOCATION_STATES, req: true }, { k: 'permits', label: 'Permits secured', type: 'check', checkLabel: 'Permits in hand' },
    { k: 'image_url', img: 'image', label: 'Image URL', full: true }
  ];
  var ASSIGN_FIELDS = [
    { k: 'production_title', label: 'Production' }, { k: 'person_name', label: 'Person' },
    { k: 'person_email', label: 'Email' }, { k: 'role_type', label: 'Role', type: 'select', opts: ROLE_TYPES },
    { k: 'character_name', label: 'Character' }, { k: 'assignment_state', label: 'Status', type: 'select', opts: ASSIGNMENT_STATES, req: true },
    { k: 'call_time', label: 'Call time', type: 'datetime' }, { k: 'location_name', label: 'Location' }, { k: 'rate', label: 'Rate ($)', type: 'number' }
  ];

  function StudioSlate(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.productions || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    function del(p) { if (!window.confirm('Remove ' + p.title + '?')) return; client.deleteObject('production', p.uuid, p).then(function () { showToast('Removed', 'success'); c.reload(); }).catch(function () {}); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '14px' } }, h('div', { className: 'cond', style: { fontSize: '17px', color: 'var(--gold2)' } }, list.length + ' productions'),
        h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New production')),
      h('div', { className: 'bl-panel' }, list.map(function (p) {
        return h('div', { key: p.uuid, className: 'bl-row' },
          h('div', { style: { width: '46px', height: '64px', borderRadius: '4px', overflow: 'hidden', flex: 'none', background: '#000' } }, h('img', { src: imgUrl(p.poster), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
          h('div', { className: 'bl-grow' }, h('div', { style: { fontWeight: 700 } }, p.title), h('div', { className: 'bl-mut' }, (p.genre || '') + ' · ' + (p.format || '') + ' · ' + (p.director_name || 'No director') + (p.budget ? ' · ' + money(p.budget) : ''))),
          h(Badge, { s: p.prod_state }),
          h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { c.navigate('#/title/' + p.uuid); } }, 'View'),
          h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'),
          h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { del(p); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'production', fields: PROD_FIELDS, initial: edit, newTitle: 'New production', editTitle: 'Edit production',
        beforeSave: function (d) { d.display_name = d.title || 'Untitled'; d.description = (d.genre || '') + ' · ' + (d.format || ''); if (!d.prod_state) d.prod_state = 'development'; }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function StudioPeople(props) {
    var c = props.ctx; var [people, setPeople] = React.useState(null); var [edit, setEdit] = React.useState(null); var [role, setRole] = React.useState('all');
    function load() { client.getObjects('person').then(function (r) { setPeople(arr(r).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })); }).catch(function () { setPeople([]); }); }
    React.useEffect(load, []);
    function del(p) { if (!window.confirm('Remove ' + p.full_name + '?')) return; client.deleteObject('person', p.uuid, p).then(function () { showToast('Removed', 'success'); load(); }).catch(function () {}); }
    var list = (people || []).filter(function (p) { return role === 'all' || p.role_type === role; });
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' } },
        h('div', { className: 'cond', style: { fontSize: '17px', color: 'var(--gold2)' } }, 'Cast & crew'),
        h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add person')),
      h('div', { className: 'bl-filters', style: { margin: '0 0 14px' } },
        h('button', { className: cls('bl-btn bl-btn-sm', role === 'all' ? 'bl-btn-dark' : 'bl-btn-ghost'), onClick: function () { setRole('all'); } }, 'Everyone'),
        ROLE_TYPES.map(function (r) { return h('button', { key: r, className: cls('bl-btn bl-btn-sm', role === r ? 'bl-btn-dark' : 'bl-btn-ghost'), onClick: function () { setRole(r); } }, r); })),
      people === null ? h('div', { className: 'bl-empty' }, 'Loading…')
        : h('div', { className: 'bl-pgrid' }, list.map(function (p) {
          return h('div', { key: p.uuid, className: 'bl-pcard' },
            h('div', { className: 'bl-pcard-img' }, h('img', { src: imgUrl(p.photo), alt: p.full_name, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { style: { padding: '12px 12px 0' } },
              h('div', { style: { fontWeight: 700, fontSize: '15px' } }, p.full_name),
              h('div', { className: 'cond', style: { color: 'var(--gold2)', fontSize: '12px', marginTop: '3px' } }, p.role_type || ''),
              h('div', { className: 'bl-mut', style: { fontSize: '12px', marginTop: '4px' } }, (p.department || '') + (p.day_rate ? ' · ' + money(p.day_rate) + '/day' : '')),
              h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '12px' } },
                h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'),
                h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { del(p); } }, '✕'))));
        })),
      edit !== null ? h(EditModal, { schema: 'person', fields: PERSON_FIELDS, initial: edit, newTitle: 'Add person', editTitle: 'Edit person',
        beforeSave: function (d) { d.display_name = d.full_name || 'Person'; d.description = (d.role_type || '') + ' · ' + (d.department || ''); }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); load(); } }) : null);
  }

  function StudioSchedule(props) {
    var c = props.ctx; var [scenes, setScenes] = React.useState(null); var [edit, setEdit] = React.useState(null);
    function load() { client.getObjects('scene').then(function (r) { setScenes(arr(r)); }).catch(function () { setScenes([]); }); }
    React.useEffect(load, []);
    function advance(s, stt) { client.updateObject('scene', s.uuid, { scene_state: stt }, s).then(function () { showToast('Scene marked ' + stt.replace('_', ' '), 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    var SCENE_FIELDS = [
      { k: 'scene_number', label: 'Scene #' }, { k: 'production_title', label: 'Production', type: 'select', opts: (c.productions || []).map(function (p) { return p.title; }) },
      { k: 'location_name', label: 'Location' }, { k: 'scene_state', label: 'Status', type: 'select', opts: SCENE_STATES, req: true },
      { k: 'shoot_date', label: 'Shoot date/time', type: 'datetime' }, { k: 'int_ext', label: 'INT / EXT', type: 'select', opts: ['INT', 'EXT'] },
      { k: 'time_of_day', label: 'Time of day', type: 'select', opts: ['DAY', 'NIGHT', 'DUSK', 'DAWN'] }, { k: 'pages', label: 'Pages', type: 'number' },
      { k: 'cast_list', label: 'Cast in scene', full: true }, { k: 'description', label: 'Scene description', type: 'textarea', full: true }
    ];
    // group by day
    var groups = {}; var order = [];
    (scenes || []).slice().sort(function (a, b) { return (a.shoot_date || 'zzzz').localeCompare(b.shoot_date || 'zzzz'); }).forEach(function (s) {
      var k = s.shoot_date ? dayKey(s.shoot_date) : 'Unscheduled';
      if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(s);
    });
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } },
        h('div', null, h('div', { className: 'cond', style: { fontSize: '17px', color: 'var(--gold2)' } }, 'Strip board'),
          h('div', { className: 'bl-mut', style: { fontSize: '12.5px' } }, 'The shooting schedule, day by day. Advance scenes scheduled → shot.')),
        h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add scene')),
      scenes === null ? h('div', { className: 'bl-empty' }, 'Loading…')
        : order.length ? order.map(function (day) {
          return h('div', { key: day },
            h('div', { className: 'bl-daybar' }, '📅 ' + day, h('span', { className: 'bl-mut', style: { fontFamily: 'Inter', letterSpacing: 0, textTransform: 'none', marginLeft: '-6px' } }, '(' + groups[day].length + ' ' + (groups[day].length === 1 ? 'scene' : 'scenes') + ')')),
            groups[day].map(function (s) {
              return h('div', { key: s.uuid, className: 'bl-strip', style: { borderLeftColor: statusColor(s.scene_state) } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
                  h('span', { className: 'cond', style: { fontSize: '18px', color: 'var(--gold2)', minWidth: '46px' } }, s.scene_number || '—'),
                  h('div', { className: 'bl-grow' },
                    h('div', { style: { fontWeight: 600 } }, (s.int_ext || '') + '. ' + (s.location_name || 'TBD') + ' — ' + (s.time_of_day || '') + (s.pages ? '  ·  ' + s.pages + ' pp' : '')),
                    h('div', { className: 'bl-mut' }, (s.production_title || '') + (s.cast_list ? '  ·  ' + s.cast_list : ''))),
                  h(Badge, { s: s.scene_state }),
                  s.scene_state === 'scheduled' || s.scene_state === 'not_scheduled' ? h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', onClick: function () { advance(s, 'shot'); } }, '✓ Mark shot') : null,
                  s.scene_state === 'not_scheduled' ? h('button', { className: 'bl-btn bl-btn-dark bl-btn-sm', onClick: function () { advance(s, 'scheduled'); } }, 'Schedule') : null,
                  s.scene_state === 'shot' ? h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { advance(s, 'needs_reshoot'); } }, 'Flag reshoot') : null,
                  h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { setEdit(s); } }, 'Edit')),
                s.description ? h('div', { className: 'bl-mut', style: { marginTop: '8px', fontSize: '13px', fontStyle: 'italic' } }, s.description) : null);
            }));
        }) : h('div', { className: 'bl-empty' }, 'No scenes yet — add the first scene to start the strip board.'),
      edit !== null ? h(EditModal, { schema: 'scene', fields: SCENE_FIELDS, initial: edit, newTitle: 'Add scene', editTitle: 'Edit scene',
        beforeSave: function (d) { d.display_name = 'Sc. ' + (d.scene_number || '?') + ' — ' + (d.production_title || ''); d.description = d.description || ((d.int_ext || '') + '/' + (d.time_of_day || '')); if (!d.scene_state) d.scene_state = 'not_scheduled'; }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); load(); } }) : null);
  }

  function StudioLocations(props) {
    var [locs, setLocs] = React.useState(null); var [edit, setEdit] = React.useState(null);
    function load() { client.getObjects('shoot_location').then(function (r) { setLocs(arr(r)); }).catch(function () { setLocs([]); }); }
    React.useEffect(load, []);
    function del(p) { if (!window.confirm('Remove ' + p.name + '?')) return; client.deleteObject('shoot_location', p.uuid, p).then(function () { showToast('Removed', 'success'); load(); }).catch(function () {}); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '14px' } }, h('div', { className: 'cond', style: { fontSize: '17px', color: 'var(--gold2)' } }, 'Locations'),
        h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add location')),
      locs === null ? h('div', { className: 'bl-empty' }, 'Loading…')
        : h('div', { className: 'bl-grid', style: { gridTemplateColumns: 'repeat(3,1fr)', marginTop: 0 } }, locs.map(function (p) {
          return h('div', { key: p.uuid, className: 'bl-panel', style: { overflow: 'hidden' } },
            h('div', { style: { height: '150px', background: '#000', overflow: 'hidden' } }, h('img', { src: imgUrl(p.image), alt: p.name, style: { width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05) saturate(.9)' }, onError: function (e) { e.target.style.visibility = 'hidden'; } })),
            h('div', { style: { padding: '14px 16px' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' } }, h('div', { style: { fontWeight: 700 } }, p.name), h(Badge, { s: p.location_state })),
              h('div', { className: 'bl-mut', style: { marginTop: '4px' } }, (p.location_type || '') + (p.day_rate ? ' · ' + money(p.day_rate) + '/day' : '')),
              h('div', { className: 'bl-mut', style: { fontSize: '12px', marginTop: '4px' } }, '📍 ' + (p.address || '') + (p.permits ? '  ·  ✓ permits' : '  ·  ⚠ no permits')),
              h('div', { style: { display: 'flex', gap: '6px', marginTop: '12px' } },
                h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'),
                h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { del(p); } }, '✕'))));
        })),
      edit !== null ? h(EditModal, { schema: 'shoot_location', fields: LOC_FIELDS, initial: edit, newTitle: 'Add location', editTitle: 'Edit location',
        beforeSave: function (d) { d.display_name = d.name || 'Location'; d.description = (d.location_type || '') + ' · ' + (d.location_state || ''); if (!d.location_state) d.location_state = 'scouting'; }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); load(); } }) : null);
  }

  function StudioAssignments(props) {
    var c = props.ctx; var [assigns, setAssigns] = React.useState(null); var [edit, setEdit] = React.useState(null); var [people, setPeople] = React.useState([]);
    function load() { client.getObjects('assignment').then(function (r) { setAssigns(arr(r).sort(function (a, b) { return (a.call_time || '').localeCompare(b.call_time || ''); })); }).catch(function () { setAssigns([]); }); }
    React.useEffect(function () { load(); client.getObjects('person').then(function (r) { setPeople(arr(r)); }).catch(function () {}); }, []);
    function sendCallSheet(a) {
      var prior = a.assignment_state;
      var person = people.filter(function (p) { return p.email === a.person_email; })[0] || {};
      var input = { assignment_uuid: a.uuid, person_email: a.person_email, person_phone: person.phone || '', person_name: a.person_name,
        production_title: a.production_title, call_time: fmtDT(a.call_time), location_name: a.location_name, prior_state: prior };
      Promise.resolve().then(function () { if (!services || !services.workflow) throw 0; return services.workflow.run('call_sheet', input); })
        .then(function () { showToast('Call sheet sent — role confirmed', 'success'); load(); })
        .catch(function () { client.updateObject('assignment', a.uuid, { assignment_state: 'confirmed' }, a).then(function () { showToast('Call sheet sent (demo) — confirmed', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); });
    }
    function wrap(a) {
      var input = { assignment_uuid: a.uuid, person_email: a.person_email, person_name: a.person_name, production_title: a.production_title };
      Promise.resolve().then(function () { if (!services || !services.workflow) throw 0; return services.workflow.run('wrap_notify', input); })
        .then(function () { showToast('Wrapped — thank-you sent', 'success'); load(); })
        .catch(function () { client.updateObject('assignment', a.uuid, { assignment_state: 'wrapped' }, a).then(function () { showToast('Wrapped (demo)', 'success'); load(); }).catch(function () {}); });
    }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } },
        h('div', null, h('div', { className: 'cond', style: { fontSize: '17px', color: 'var(--gold2)' } }, 'Assignments'),
          h('div', { className: 'bl-mut', style: { fontSize: '12.5px' } }, 'Offer roles, set call times, and fire call sheets to cast & crew.')),
        h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Offer a role')),
      assigns === null ? h('div', { className: 'bl-empty' }, 'Loading…')
        : h('div', { className: 'bl-panel', style: { marginTop: '12px' } }, assigns.map(function (a) {
          return h('div', { key: a.uuid, className: 'bl-row' },
            h('div', { className: 'bl-grow' },
              h('div', { style: { fontWeight: 700 } }, a.person_name + ' → ' + a.production_title),
              h('div', { className: 'bl-mut' }, (a.role_type || '') + (a.character_name ? ' as ' + a.character_name : '') + ' · 🕐 ' + fmtDT(a.call_time) + ' · 📍 ' + (a.location_name || 'TBD') + (a.rate ? ' · ' + money(a.rate) : ''))),
            h(Badge, { s: a.assignment_state }),
            a.assignment_state === 'offered' || a.assignment_state === 'confirmed' ? h('button', { className: 'bl-btn bl-btn-gold bl-btn-sm', onClick: function () { sendCallSheet(a); } }, '📨 Call sheet') : null,
            a.assignment_state === 'confirmed' ? h('button', { className: 'bl-btn bl-btn-dark bl-btn-sm', onClick: function () { wrap(a); } }, 'Wrap') : null,
            h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { setEdit(a); } }, 'Edit'));
        })),
      edit !== null ? h(EditModal, { schema: 'assignment', fields: ASSIGN_FIELDS, initial: edit, newTitle: 'Offer a role', editTitle: 'Edit assignment',
        beforeSave: function (d) { d.display_name = (d.person_name || 'Talent') + ' — ' + (d.production_title || ''); d.description = (d.role_type || '') + ' · ' + (d.assignment_state || 'offered'); if (!d.assignment_state) d.assignment_state = 'offered'; if (d.person_email) d.owner_username = d.person_email; }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); load(); } }) : null);
  }

  // ── AI assistant chat ───────────────────────────────────────────────────────
  function AssistantPanel(props) {
    var c = props.ctx;
    var [msgs, setMsgs] = React.useState([{ from: 'ai', text: "I'm your Script & Production Assistant. Ask me to draft a logline, break down a scene into a shot list, plan a shoot day, or answer questions about anything on the slate." }]);
    var [q, setQ] = React.useState(''); var [busy, setBusy] = React.useState(false);
    var endRef = React.useRef(null);
    React.useEffect(function () { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
    function send(e) {
      e && e.preventDefault();
      var text = q.trim(); if (!text || busy) return;
      setMsgs(function (m) { return m.concat([{ from: 'user', text: text }]); }); setQ(''); setBusy(true);
      askAssistant(text, c.productions || []).then(function (r) {
        setMsgs(function (m) { return m.concat([{ from: 'ai', text: r.text, ai: r.ai }]); }); setBusy(false);
      });
    }
    var chips = ['Draft a logline for a heist thriller', 'Break down a 2-page night exterior', 'What\'s shooting this week?', 'How should I schedule a flooded soundstage?'];
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
        h('div', null, h('div', { className: 'cond', style: { fontSize: '17px', color: 'var(--gold2)' } }, '✦ Script & Production Assistant'),
          h('div', { className: 'bl-mut', style: { fontSize: '12.5px' } }, 'Grounded in your current slate')),
        h('button', { className: 'bl-btn bl-btn-ghost bl-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setMsgs([{ from: 'ai', text: 'Cleared. What are we working on?' }]); } }, 'New chat')),
      h('div', { className: 'bl-chat' },
        msgs.map(function (m, i) {
          return h('div', { key: i, className: 'bl-msg ' + (m.from === 'user' ? 'user' : 'ai') },
            m.from === 'ai' ? h('div', { className: 'bl-msg-from' }, m.ai === false ? 'Assistant' : 'Assistant · AI') : null, m.text);
        }),
        busy ? h('div', { className: 'bl-msg ai' }, h('span', { className: 'bl-typing' }, h('i'), h('i'), h('i'))) : null,
        h('div', { ref: endRef })),
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '12px 0' } }, chips.map(function (cp) {
        return h('button', { key: cp, className: 'bl-btn bl-btn-ghost bl-btn-sm', onClick: function () { setQ(cp); } }, cp);
      })),
      h('form', { onSubmit: send, style: { display: 'flex', gap: '8px' } },
        h('input', { className: 'bl-input', placeholder: 'Ask the assistant…', value: q, onChange: function (e) { setQ(e.target.value); } }),
        h('button', { className: 'bl-btn bl-btn-gold', type: 'submit', disabled: busy }, 'Send')));
  }

  function StudioConsole(props) {
    var c = props.ctx; var sub = props.seg[1] || 'dash';
    var tabs = [['dash', 'Dashboard'], ['slate', 'Productions'], ['people', 'Cast & Crew'], ['schedule', 'Schedule'], ['locations', 'Locations'], ['assignments', 'Assignments'], ['assistant', 'AI Assistant']];
    var body = sub === 'slate' ? h(StudioSlate, { ctx: c }) : sub === 'people' ? h(StudioPeople, { ctx: c }) : sub === 'schedule' ? h(StudioSchedule, { ctx: c })
      : sub === 'locations' ? h(StudioLocations, { ctx: c }) : sub === 'assignments' ? h(StudioAssignments, { ctx: c }) : sub === 'assistant' ? h(AssistantPanel, { ctx: c }) : h(StudioDash, { ctx: c });
    return h('div', { className: 'bl' },
      h('div', { className: 'bl-console-bar' }, h('div', { className: 'bl-wrap', style: { display: 'flex', alignItems: 'center', height: '66px', gap: '16px', flexWrap: 'wrap' } },
        h('div', { className: 'bl-logo', onClick: function () { c.navigate('#/'); } }, h('span', { className: 'mk' }, '🎬'), h('span', { className: 'wm' }, 'BACK', h('i', null, 'LOT'), h('span', { style: { color: 'var(--mut)', marginLeft: '8px', fontSize: '13px', letterSpacing: '.12em' } }, 'STUDIO'))),
        h('div', { className: 'bl-tabs', style: { marginLeft: '6px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('bl-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/studio' + (t[0] === 'dash' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'bl-ibtn', style: { marginLeft: 'auto', color: 'var(--mut)' }, onClick: function () { c.navigate('#/'); } }, 'Public site ↗'))),
      h('div', { className: 'bl-wrap', style: { padding: '26px 24px 70px' } },
        h('div', { style: { marginBottom: '20px' } }, h('div', { className: 'bl-eyebrow' }, 'Production office'),
          h('h1', { className: 'disp', style: { fontSize: '30px', fontWeight: 700 } }, tabs.filter(function (t) { return t[0] === sub; }).map(function (t) { return t[1]; })[0] || 'Dashboard')),
        body));
  }

  function Footer() {
    return h('footer', { className: 'bl-foot' }, h('div', { className: 'bl-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center' } },
      h('div', { className: 'bl-logo' }, h('span', { className: 'mk' }, '🎬'), h('span', { className: 'wm', style: { fontSize: '17px' } }, 'BACK', h('i', null, 'LOT'))),
      h('div', null, 'Where stories get made.'),
      h('div', { className: 'bl-mut' }, '© Backlot Studios')));
  }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [productions, setProductions] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() { client.getObjects('production').then(function (r) { setProductions(arr(r)); }).catch(function () { setProductions([]); }); }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) reload(); }, [authed]);

    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, productions: productions, reload: reload };
    var hash = route.replace(/^#\//, ''); var qi = hash.indexOf('?'); var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var seg = path.split('/'); var top = seg[0] || '';

    if (top === 'studio' && ctx.isAdmin) return h(ErrorBoundary, null, h(StudioConsole, { ctx: ctx, seg: seg }),
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'slate') page = h(SlatePage, { ctx: ctx });
    else if (top === 'title') page = h(TitlePage, { ctx: ctx, uuid: seg[1] });
    else if (top === 'casting') page = h(CastingPage, { ctx: ctx });
    else if (top === 'callsheet') page = h(CallSheet, { ctx: ctx });
    else page = h(Home, { ctx: ctx });

    return h(ErrorBoundary, null, h('div', { className: 'bl' }, h(TopBar, { ctx: ctx }), page, h(Footer, null),
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
