// ui/app.js — Summit CRM (custom UI). "The CRM that closes."
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, ErrorBoundary,
// formatCurrency) come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  var OPEN_STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];
  var LEAD_STATES = ['new', 'working', 'qualified', 'unqualified', 'converted'];
  var LEAD_SOURCES = ['Web', 'Referral', 'Event', 'Outbound', 'Partner', 'Ad'];
  var ACT_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Task'];
  var ACT_ICON = { Call: '📞', Email: '✉️', Meeting: '🗓️', Note: '📝', Task: '✅' };
  var INDUSTRIES = ['SaaS', 'Fintech', 'Healthcare', 'Retail', 'Manufacturing', 'Media', 'Education', 'Energy'];
  var TIERS = ['SMB', 'Mid-Market', 'Enterprise'];

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n.toLocaleString(); } }
  function k(n) { n = Number(n) || 0; return n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'k' : '$' + n; }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function dayKey(s) { try { return new Date(s).toDateString(); } catch (e) { return ''; } }
  function isOverdue(s) { try { return new Date(s) < new Date(new Date().toDateString()); } catch (e) { return false; } }
  function initials(n) { return (n || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase(); }
  function statusColor(s) {
    return { prospect: '#6366f1', customer: '#059669', churned: '#94a3b8',
      'new': '#6366f1', working: '#d97706', qualified: '#059669', unqualified: '#94a3b8', converted: '#0891b2',
      open: '#6366f1', completed: '#059669',
      Prospecting: '#94a3b8', Qualification: '#6366f1', Proposal: '#0891b2', Negotiation: '#d97706',
      'Closed Won': '#059669', 'Closed Lost': '#dc2626' }[s] || '#64748b';
  }
  function isStaff() { try { return client.isAdmin() || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; } }
  function aiText(res) {
    var t = res && (res.output && (res.output.text || res.output.completion || res.output.content || res.output) || res.text || res.completion || res.content || res);
    if (typeof t !== 'string') { try { t = JSON.stringify(t); } catch (e) { t = ''; } } return t || '';
  }

  function injectChrome() {
    if (document.getElementById('sm-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'sm-chrome';
    st.textContent = [
      ':root{--ink:#0b1220;--ink2:#334155;--paper:#fff;--bg:#f4f5fb;--indigo:#4f46e5;--indigo2:#6366f1;--indigo-d:#4338ca;--green:#059669;--amber:#d97706;--red:#dc2626;--cyan:#0891b2;--line:#e6e9f2;--muted:#64748b}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.sm{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.sm *{box-sizing:border-box}.sm a{color:inherit;text-decoration:none}',
      '.sm-wrap{max-width:1240px;margin:0 auto;padding:0 24px}',
      '.jak{font-family:"Plus Jakarta Sans",Inter,sans-serif}.num{font-variant-numeric:tabular-nums}',
      '.sm-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.93);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.sm-top-in{display:flex;align-items:center;gap:18px;height:64px}',
      '.sm-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:"Plus Jakarta Sans";font-weight:800;font-size:20px;color:var(--ink)}',
      '.sm-logo .dot{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--indigo),var(--cyan));display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px}',
      '.sm-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.sm-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}.sm-ibtn:hover{background:var(--bg)}',
      '.sm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:10px;font-weight:600;font-size:14px;padding:10px 18px;font-family:Inter;transition:.15s}',
      '.sm-btn:disabled{opacity:.55;cursor:default}',
      '.sm-btn-ind{background:var(--indigo);color:#fff}.sm-btn-ind:hover:not(:disabled){background:var(--indigo-d)}',
      '.sm-btn-ink{background:var(--ink);color:#fff}.sm-btn-ink:hover:not(:disabled){background:#000}',
      '.sm-btn-green{background:var(--green);color:#fff}.sm-btn-green:hover:not(:disabled){background:#047857}',
      '.sm-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.sm-btn-ghost:hover{border-color:var(--indigo)}',
      '.sm-btn-sm{padding:7px 12px;font-size:13px}.sm-btn-xs{padding:5px 9px;font-size:12px;border-radius:8px}',
      '.sm-hero{background:linear-gradient(155deg,#0b1220,#312e81 65%,#0891b2);color:#fff;position:relative;overflow:hidden}',
      '.sm-hero:before{content:"";position:absolute;inset:0;background:radial-gradient(700px 360px at 80% -10%,rgba(99,102,241,.5),transparent)}',
      '.sm-hero-in{position:relative;padding:88px 0 96px}',
      '.sm-hero h1{font-family:"Plus Jakarta Sans";font-weight:800;font-size:clamp(34px,5vw,58px);margin:14px 0 0;letter-spacing:-.02em;max-width:720px;line-height:1.04}',
      '.sm-hero p{font-size:19px;color:#d6dcf5;max-width:560px;margin:18px 0 0;line-height:1.55}',
      '.sm-pill{display:inline-block;background:rgba(255,255,255,.16);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:30px}',
      '.sm-sec{padding:54px 0}',
      '.sm-h2{font-family:"Plus Jakarta Sans";font-weight:700;font-size:26px;margin:0}',
      '.sm-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--indigo)}',
      '.sm-feat{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}',
      '.sm-fcard{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:24px}',
      '.sm-fcard .ic{font-size:26px}.sm-fcard h3{font-family:"Plus Jakarta Sans";font-weight:700;font-size:16px;margin:12px 0 4px}',
      '.sm-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}',
      '.sm-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px 18px}',
      '.sm-stat-n{font-family:"Plus Jakarta Sans";font-weight:800;font-size:23px;line-height:1}',
      '.sm-stat-l{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.sm-stat-d{font-size:12px;font-weight:600;margin-top:4px}',
      '.sm-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.sm-ph{padding:16px 20px;border-bottom:1px solid var(--line);font-weight:700;display:flex;align-items:center;gap:10px}',
      '.sm-row{display:flex;align-items:center;gap:14px;padding:13px 18px;border-top:1px solid var(--line)}',
      '.sm-row:first-child{border-top:0}.sm-grow{flex:1;min-width:0}.sm-mut{color:var(--muted);font-size:13px}',
      '.sm-trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sm-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff}',
      '.sm-chip{display:inline-block;font-size:11px;font-weight:600;color:var(--ink2);background:#eef1f8;border-radius:20px;padding:3px 9px}',
      '.sm-av{width:40px;height:40px;border-radius:50%;overflow:hidden;flex:none;background:#dfe3f0;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--indigo);font-size:14px}',
      '.sm-av img{width:100%;height:100%;object-fit:cover}',
      '.sm-logobox{width:44px;height:44px;border-radius:11px;overflow:hidden;flex:none;background:#eef1f8;display:flex;align-items:center;justify-content:center}',
      '.sm-logobox img{width:100%;height:100%;object-fit:cover}',
      '.sm-bars{display:flex;align-items:flex-end;gap:12px;height:180px;padding:10px 4px 0}',
      '.sm-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}',
      '.sm-bar .b{width:100%;max-width:54px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--indigo2),var(--indigo));transition:.3s;min-height:4px}',
      '.sm-bar .v{font-weight:700;font-size:12px;margin-bottom:6px}.sm-bar .l{font-size:11px;color:var(--muted);margin-top:8px;text-align:center}',
      '.sm-kanban{display:flex;gap:14px;overflow-x:auto;padding-bottom:14px;align-items:flex-start}',
      '.sm-col{flex:0 0 268px;background:#eef0f7;border-radius:14px;padding:10px;min-height:120px}',
      '.sm-col-h{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 10px;font-weight:700;font-size:13px}',
      '.sm-col-sum{font-size:11px;color:var(--muted);font-weight:600}',
      '.sm-card{background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:12px;margin-bottom:9px;cursor:pointer;transition:.13s}',
      '.sm-card:hover{box-shadow:0 10px 24px -16px rgba(30,30,80,.4);transform:translateY(-1px);border-color:var(--indigo2)}',
      '.sm-card .nm{font-weight:700;font-size:13.5px;line-height:1.25}.sm-card .am{font-family:"Plus Jakarta Sans";font-weight:800;font-size:15px;margin-top:6px}',
      '.sm-field{display:block;margin-top:14px}.sm-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.sm-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.sm-input:focus{outline:none;border-color:var(--indigo)}textarea.sm-input{min-height:80px;resize:vertical}',
      '.sm-modal{position:fixed;inset:0;z-index:200;background:rgba(11,18,32,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.sm-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:560px;max-height:92vh;overflow:auto;position:relative}',
      '.sm-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:23px;cursor:pointer;color:var(--muted);z-index:2}',
      '.sm-2col{display:grid;grid-template-columns:1fr 360px;gap:22px;align-items:start}',
      '.sm-tabs{display:flex;gap:4px;flex-wrap:wrap}.sm-tab{background:none;border:0;color:#c7cbe8;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.sm-tab.on{background:rgba(255,255,255,.16);color:#fff}',
      '.sm-foot{background:var(--ink);color:#9aa6bd;padding:34px 0;font-size:13px;margin-top:40px}.sm-foot b{color:#fff;font-family:"Plus Jakarta Sans"}',
      '.sm-empty{text-align:center;padding:60px 20px;color:var(--muted)}',
      '.sm-lead{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line)}.sm-lead:first-child{border-top:0}',
      '.sm-score{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:none;color:#fff}',
      '.sm-ai{background:linear-gradient(135deg,#eef0fe,#e0f2fe);border:1px solid #c7d2fe;border-radius:12px;padding:14px 16px}',
      '@media(max-width:980px){.sm-stats{grid-template-columns:repeat(2,1fr)}.sm-feat{grid-template-columns:1fr}.sm-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'sm-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '▲'), 'Summit', p.light ? h('span', { style: { opacity: .65 } }, 'CRM') : h('span', { style: { color: 'var(--muted)', fontWeight: 600 } }, 'CRM')); }
  function Field(p) { return h('label', { className: 'sm-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'sm-badge', style: { background: statusColor(p.s) } }, String(p.s || '').replace('_', ' ')); }
  function Avatar(p) { var u = imgUrl(p.src); return h('div', { className: 'sm-av' }, u ? h('img', { src: u, alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }) : initials(p.name)); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'manager@summit.crm');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'sm-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'sm-sheet', style: { maxWidth: '410px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'sm-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'sm-h2', style: { marginTop: '16px' } }, 'Sign in'),
        h('p', { className: 'sm-mut' }, 'Managers see the whole pipeline; reps see their book of business.'),
        h(Field, { label: 'Email', children: h('input', { className: 'sm-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'sm-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: 'var(--red)', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'sm-btn sm-btn-ind', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'sm-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — manager@summit.crm · rep@summit.crm · pw Password123!')));
  }

  // ── Marketing landing (logged out) ──────────────────────────────────────────
  function Marketing(props) {
    var c = props.ctx;
    var FEATURES = [
      ['📊', 'Pipeline that moves', 'A drag-free Kanban board across every stage. Advance deals and mark Won/Lost in one click.'],
      ['🎯', 'Forecast you can trust', 'Weighted forecasting, win-rate and a live rep leaderboard — no spreadsheets.'],
      ['⚡', 'Leads to revenue', 'Score, qualify and convert leads into accounts, contacts and deals instantly.'],
      ['🤖', 'AI deal insight', 'Get an instant next-best-action and a ready-to-send follow-up email on any deal.'],
      ['🔔', 'Automated wins', 'Close a deal and Summit emails the account, posts to #wins and promotes the account — automatically.'],
      ['🔒', 'Built-in guardrails', 'Reps see their own leads, deals and activities; managers see everything. Enforced server-side.']
    ];
    return h('div', null,
      h('section', { className: 'sm-hero' }, h('div', { className: 'sm-wrap sm-hero-in' },
        h('span', { className: 'sm-pill' }, 'Sales CRM'),
        h('h1', null, 'The CRM that closes.'),
        h('p', null, 'Summit gives your sales team a Salesforce-grade pipeline, forecasting and AI deal insight — without the bloat. See every deal, advance every stage, hit every number.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' } },
          h('button', { className: 'sm-btn sm-btn-ind', onClick: c.openLogin }, 'Sign in'),
          h('button', { className: 'sm-btn sm-btn-ghost', style: { background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { var el = document.getElementById('sm-features'); if (el) el.scrollIntoView({ behavior: 'smooth' }); } }, 'See features')))),
      h('section', { className: 'sm-sec', id: 'sm-features' }, h('div', { className: 'sm-wrap' },
        h('div', { className: 'sm-eyebrow' }, 'Everything sales needs'),
        h('h2', { className: 'sm-h2', style: { marginTop: '6px' } }, 'Close more, in less time'),
        h('div', { className: 'sm-feat' }, FEATURES.map(function (f, i) {
          return h('div', { key: i, className: 'sm-fcard' }, h('div', { className: 'ic' }, f[0]), h('h3', null, f[1]), h('div', { className: 'sm-mut' }, f[2]));
        })))),
      h('section', { style: { paddingBottom: '50px' } }, h('div', { className: 'sm-wrap' },
        h('div', { className: 'sm-panel', style: { padding: '34px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(100deg,#0b1220,#312e81)', border: 0 } },
          h('div', { style: { flex: 1, minWidth: '260px', color: '#fff' } },
            h('div', { className: 'jak', style: { fontWeight: 800, fontSize: '24px' } }, 'Ready to hit your number?'),
            h('div', { style: { color: '#d6dcf5', marginTop: '6px' } }, 'Sign in to your Summit workspace and pick up right where your pipeline left off.')),
          h('button', { className: 'sm-btn sm-btn-ind', onClick: c.openLogin }, 'Sign in to Summit')))));
  }

  function MarketingTop(props) {
    var c = props.ctx;
    return h('div', { className: 'sm-top' }, h('div', { className: 'sm-wrap sm-top-in' },
      h(Logo, { onClick: function () { window.scrollTo(0, 0); } }),
      h('div', { className: 'sm-act' },
        h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', onClick: c.openLogin }, 'Sign in'))));
  }

  function MarketingFooter() { return h('footer', { className: 'sm-foot' }, h('div', { className: 'sm-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'Summit CRM'), ' — the CRM that closes.'), h('div', null, 'Pipeline · Forecast · AI insight'))); }

  // ── Generic edit modal (config-driven fields) ───────────────────────────────
  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; f[fd.k] = (v == null) ? (fd.type === 'check' ? false : '') : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(kk, v) { setForm(function (p) { var n = Object.assign({}, p); n[kk] = v; return n; }); }
    function save() {
      var data = {};
      fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; }
        if (v === '' || v == null) return;
        if (fd.type === 'number') v = Number(v);
        data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) {
        setBusy(false); var mf = []; try { mf = parse422Error(e); } catch (x) {}
        showToast(mf && mf.length ? 'Missing: ' + mf.join(', ') : 'Save failed: ' + ((e && e.message) || 'error'), 'error');
      });
    }
    return h('div', { className: 'sm-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'sm-sheet', style: { padding: '26px' } }, h('button', { className: 'sm-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'sm-h2', style: { fontSize: '21px' } }, init.uuid ? props.editTitle : props.newTitle),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' } }, fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'sm-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'sm-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '8px' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'sm-mut' }, 'Yes'));
          else input = h('input', { className: 'sm-input', type: fd.type === 'number' ? 'number' : (fd.type === 'date' ? 'date' : 'text'), value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h('div', { key: fd.k, style: fd.full ? { gridColumn: '1 / -1' } : null }, h(Field, { label: fd.label, req: fd.req, children: input }));
        })),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '20px' } },
          h('button', { className: 'sm-btn sm-btn-ind', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'sm-btn sm-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  function Stat(p) { return h('div', { className: 'sm-stat' }, h('div', { className: 'sm-stat-n num', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'sm-stat-l' }, p.l), p.d ? h('div', { className: 'sm-stat-d', style: { color: p.dc || 'var(--green)' } }, p.d) : null); }

  function Dashboard(props) {
    var c = props.ctx; var deals = c.deals || []; var leads = c.leads || []; var acts = c.activities || [];
    var open = deals.filter(function (x) { return OPEN_STAGES.indexOf(x.deal_stage) >= 0; });
    var won = deals.filter(function (x) { return x.deal_stage === 'Closed Won'; });
    var lost = deals.filter(function (x) { return x.deal_stage === 'Closed Lost'; });
    var pipeline = open.reduce(function (s, x) { return s + (x.amount || 0); }, 0);
    var forecast = open.reduce(function (s, x) { return s + (x.amount || 0) * ((x.probability || 0) / 100); }, 0);
    var winRate = (won.length + lost.length) ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    var now = new Date(); var thisMonth = deals.filter(function (x) { try { var dd = new Date(x.close_date); return dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear() && OPEN_STAGES.indexOf(x.deal_stage) >= 0; } catch (e) { return false; } });
    var newLeads = leads.filter(function (x) { return x.lead_state === 'new'; }).length;
    // pipeline by stage (open + closed-won)
    var byStage = STAGES.map(function (st) { return { label: st.replace('Closed ', ''), value: deals.filter(function (x) { return x.deal_stage === st; }).reduce(function (s, x) { return s + (x.amount || 0); }, 0) }; });
    var maxStage = Math.max.apply(null, byStage.map(function (b) { return b.value; }).concat([1]));
    // rep leaderboard by closed-won amount
    var owners = {}; won.forEach(function (x) { var o = x.deal_owner || 'Unassigned'; owners[o] = (owners[o] || 0) + (x.amount || 0); });
    var board = Object.keys(owners).map(function (o) { return { name: o, value: owners[o], deals: won.filter(function (x) { return (x.deal_owner || 'Unassigned') === o; }).length }; }).sort(function (a, b) { return b.value - a.value; });
    var maxBoard = Math.max.apply(null, board.map(function (b) { return b.value; }).concat([1]));
    // activities due today
    var today = new Date().toDateString();
    var dueToday = acts.filter(function (a) { return a.activity_state === 'open' && dayKey(a.due_date) === today; });
    var overdue = acts.filter(function (a) { return a.activity_state === 'open' && isOverdue(a.due_date); });

    return h('div', null,
      h('div', { className: 'sm-stats' },
        h(Stat, { n: k(pipeline), l: 'Open pipeline', d: open.length + ' deals', color: 'var(--ink)' }),
        h(Stat, { n: k(forecast), l: 'Weighted forecast', d: '▲ probability-adj', color: 'var(--indigo)' }),
        h(Stat, { n: winRate + '%', l: 'Win rate', d: won.length + 'W · ' + lost.length + 'L', dc: winRate >= 50 ? 'var(--green)' : 'var(--amber)' }),
        h(Stat, { n: thisMonth.length, l: 'Closing this month', d: k(thisMonth.reduce(function (s, x) { return s + (x.amount || 0); }, 0)) }),
        h(Stat, { n: newLeads, l: 'New leads', d: leads.length + ' total', dc: 'var(--cyan)' })),
      h('div', { className: 'sm-2col', style: { marginTop: '18px' } },
        h('div', { className: 'sm-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Pipeline by stage'),
          h('div', { className: 'sm-mut', style: { fontSize: '12px', marginBottom: '4px' } }, 'Total value of deals in each stage'),
          h('div', { className: 'sm-bars' }, byStage.map(function (b) {
            return h('div', { key: b.label, className: 'sm-bar' }, h('div', { className: 'v num' }, k(b.value)),
              h('div', { className: 'b', style: { height: Math.max(4, (b.value / maxStage) * 130) + 'px' } }), h('div', { className: 'l' }, b.label));
          }))),
        h('div', { className: 'sm-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, '🏆 Rep leaderboard'),
          h('div', { className: 'sm-mut', style: { fontSize: '12px', marginTop: '-6px', marginBottom: '10px' } }, 'Closed-won revenue'),
          board.length ? board.map(function (b, i) {
            return h('div', { key: b.name, style: { marginBottom: '12px' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '4px' } },
                h('span', { style: { fontWeight: 600 } }, (i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '') + b.name),
                h('span', { className: 'num', style: { fontWeight: 700 } }, k(b.value) + ' · ' + b.deals + 'w')),
              h('div', { style: { height: '8px', borderRadius: '6px', background: '#e6eaf3', overflow: 'hidden' } },
                h('div', { style: { height: '100%', width: ((b.value / maxBoard) * 100) + '%', background: 'linear-gradient(90deg,var(--indigo),var(--cyan))' } })));
          }) : h('div', { className: 'sm-mut' }, 'No closed-won deals yet.'))),
      h('div', { className: 'sm-2col', style: { marginTop: '18px' } },
        h('div', { className: 'sm-panel' },
          h('div', { className: 'sm-ph' }, '📅 Activities due today', h('span', { className: 'sm-chip', style: { marginLeft: 'auto' } }, dueToday.length + ' due')),
          dueToday.length ? dueToday.map(function (a) {
            return h('div', { key: a.uuid, className: 'sm-row' }, h('span', { style: { fontSize: '18px' } }, ACT_ICON[a.activity_type] || '•'),
              h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 600 } }, a.subject), h('div', { className: 'sm-mut sm-trunc' }, (a.account_name || a.deal_name || '') + ' · ' + (a.activity_owner || ''))),
              h('button', { className: 'sm-btn sm-btn-ghost sm-btn-xs', onClick: function () { c.completeActivity(a); } }, 'Done'));
          }) : h('div', { className: 'sm-empty', style: { padding: '34px' } }, 'Nothing due today — nice and clear.')),
        h('div', { className: 'sm-panel' },
          h('div', { className: 'sm-ph' }, '⏰ Overdue', h('span', { className: 'sm-chip', style: { marginLeft: 'auto', background: overdue.length ? '#fee2e2' : '#eef1f8', color: overdue.length ? 'var(--red)' : 'var(--muted)' } }, overdue.length + ' overdue')),
          overdue.length ? overdue.slice(0, 8).map(function (a) {
            return h('div', { key: a.uuid, className: 'sm-row' }, h('span', { style: { fontSize: '18px' } }, ACT_ICON[a.activity_type] || '•'),
              h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 600 } }, a.subject), h('div', { className: 'sm-mut sm-trunc' }, 'Due ' + fmtDate(a.due_date) + ' · ' + (a.activity_owner || ''))),
              h('button', { className: 'sm-btn sm-btn-ghost sm-btn-xs', onClick: function () { c.completeActivity(a); } }, 'Done'));
          }) : h('div', { className: 'sm-empty', style: { padding: '34px' } }, 'No overdue activities.'))));
  }

  // ── Pipeline (Kanban) ───────────────────────────────────────────────────────
  function DealCard(props) {
    var dx = props.d; return h('div', { className: 'sm-card', onClick: function () { props.onOpen(dx); } },
      h('div', { className: 'nm' }, dx.deal_name),
      h('div', { className: 'am num', style: { color: 'var(--indigo)' } }, money(dx.amount)),
      h('div', { className: 'sm-mut sm-trunc', style: { marginTop: '4px' } }, dx.account_name || ''),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' } },
        h('span', { className: 'sm-chip' }, (dx.probability || 0) + '%'),
        h('span', { className: 'sm-mut', style: { fontSize: '11px', marginLeft: 'auto' } }, dx.deal_owner || '')));
  }

  function Pipeline(props) {
    var c = props.ctx; var deals = c.deals;
    if (deals === null) return h('div', { className: 'sm-empty' }, 'Loading pipeline…');
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '14px' } },
        h('div', null, h('div', { style: { fontWeight: 800, fontSize: '18px' }, className: 'jak' }, 'Pipeline'), h('div', { className: 'sm-mut' }, deals.length + ' deals · ' + k(deals.filter(function (x) { return OPEN_STAGES.indexOf(x.deal_stage) >= 0; }).reduce(function (s, x) { return s + (x.amount || 0); }, 0)) + ' open')),
        c.canWriteDeal ? h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.newDeal(); } }, '+ New deal') : null),
      h('div', { className: 'sm-kanban' }, STAGES.map(function (st) {
        var col = deals.filter(function (x) { return x.deal_stage === st; });
        var sum = col.reduce(function (s, x) { return s + (x.amount || 0); }, 0);
        return h('div', { key: st, className: 'sm-col' },
          h('div', { className: 'sm-col-h' }, h('span', { style: { color: statusColor(st) } }, st),
            h('span', { className: 'sm-col-sum num' }, col.length + ' · ' + k(sum))),
          col.length ? col.map(function (dx) { return h(DealCard, { key: dx.uuid, d: dx, onOpen: c.openDeal }); })
            : h('div', { className: 'sm-mut', style: { textAlign: 'center', padding: '18px 0', fontSize: '12px' } }, '—'));
      })));
  }

  // ── Deal detail drawer (with stage advance + AI insight + follow-up) ─────────
  function DealDrawer(props) {
    var c = props.ctx; var dx = props.deal;
    var [aiBusy, setAiBusy] = React.useState(false); var [ai, setAi] = React.useState(null);
    var stageIdx = OPEN_STAGES.indexOf(dx.deal_stage); var nextStage = stageIdx >= 0 ? OPEN_STAGES[stageIdx + 1] : null;
    var contact = (c.contacts || []).filter(function (x) { return x.full_name === dx.contact_name; })[0];
    function setStage(st) { c.advanceDeal(dx, st); }
    function aiInsight() {
      setAiBusy(true); setAi(null);
      var prompt = 'You are a sales coach. Deal: "' + dx.deal_name + '" at ' + (dx.account_name || 'an account') + ', amount $' + (dx.amount || 0) + ', stage ' + dx.deal_stage + ', probability ' + (dx.probability || 0) + '%, next step: ' + (dx.next_step || 'none') + '. In 2-3 short sentences, give the single best next action to advance this deal, then draft a one-paragraph follow-up email to ' + (dx.contact_name || 'the buyer') + '.';
      Promise.resolve().then(function () { if (!services || !services.ai || !services.ai.complete) throw 0; return services.ai.complete({ prompt: prompt }); })
        .then(function (r) { var t = aiText(r); if (!t) throw 0; setAi(t); setAiBusy(false); })
        .catch(function () {
          var tip = 'Next best action: ' + (dx.deal_stage === 'Negotiation' ? 'lock the close date and send a mutual action plan to ' + (dx.contact_name || 'the buyer') + ' to remove the last blockers.' : dx.deal_stage === 'Proposal' ? 'schedule a proposal review and address pricing objections directly.' : dx.deal_stage === 'Qualification' ? 'confirm budget, authority and timeline before investing more time.' : 'book a discovery call to map pain and a champion.');
          var emailDraft = '\n\nDraft email:\nHi ' + (dx.contact_name || 'there') + ', thanks for the time on ' + dx.deal_name + '. To keep momentum, the next step is "' + (dx.next_step || 'a quick sync') + '". Are you open to a 20-minute call this week to walk through it? Happy to share an ROI summary tailored to ' + (dx.account_name || 'your team') + '.';
          setAi(tip + emailDraft); setAiBusy(false);
        });
    }
    function followup() {
      var to = (contact && contact.email) || '';
      var run = (services && services.workflow && services.workflow.run) ? services.workflow.run('deal_followup', { to_email: to, deal_name: dx.deal_name, next_step: dx.next_step || 'a quick sync', contact_name: dx.contact_name || 'there' }) : Promise.reject();
      run.then(function () { showToast('Follow-up email sent for ' + dx.deal_name, 'success'); }).catch(function () { showToast('Follow-up queued (demo)', 'info'); });
    }
    return h('div', { className: 'sm-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'sm-sheet', style: { padding: '26px' } }, h('button', { className: 'sm-x', onClick: props.onClose }, '×'),
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px' } },
          h('div', { style: { flex: 1 } }, h('h2', { className: 'sm-h2', style: { fontSize: '20px' } }, dx.deal_name),
            h('div', { className: 'sm-mut', style: { marginTop: '2px' } }, (dx.account_name || '') + (dx.contact_name ? ' · ' + dx.contact_name : ''))),
          h(Badge, { s: dx.deal_stage })),
        h('div', { style: { display: 'flex', gap: '18px', marginTop: '16px', flexWrap: 'wrap' } },
          h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Amount'), h('div', { className: 'jak num', style: { fontWeight: 800, fontSize: '22px', color: 'var(--indigo)' } }, money(dx.amount))),
          h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Probability'), h('div', { className: 'jak num', style: { fontWeight: 800, fontSize: '22px' } }, (dx.probability || 0) + '%')),
          h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Close date'), h('div', { className: 'jak', style: { fontWeight: 700, fontSize: '15px', marginTop: '4px' } }, fmtDate(dx.close_date) || '—')),
          h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Owner'), h('div', { style: { fontWeight: 600, fontSize: '14px', marginTop: '5px' } }, dx.deal_owner || '—'))),
        dx.next_step ? h('div', { style: { marginTop: '14px', fontSize: '14px' } }, h('b', null, 'Next step: '), dx.next_step) : null,
        c.canWriteDeal ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px' } },
          nextStage ? h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', onClick: function () { setStage(nextStage); } }, 'Advance → ' + nextStage) : null,
          (dx.deal_stage !== 'Closed Won') ? h('button', { className: 'sm-btn sm-btn-green sm-btn-sm', onClick: function () { setStage('Closed Won'); } }, '✓ Mark Won') : null,
          (dx.deal_stage !== 'Closed Lost') ? h('button', { className: 'sm-btn sm-btn-ghost sm-btn-sm', onClick: function () { setStage('Closed Lost'); } }, '✕ Mark Lost') : null,
          h('button', { className: 'sm-btn sm-btn-ghost sm-btn-sm', onClick: followup }, '✉️ Follow-up'),
          h('button', { className: 'sm-btn sm-btn-ghost sm-btn-sm', onClick: function () { c.editDeal(dx); } }, 'Edit')) : null,
        h('div', { style: { marginTop: '18px' } },
          h('button', { className: 'sm-btn sm-btn-ink sm-btn-sm', disabled: aiBusy, onClick: aiInsight }, aiBusy ? '✦ Thinking…' : '✦ AI deal insight'),
          ai ? h('div', { className: 'sm-ai', style: { marginTop: '12px', whiteSpace: 'pre-wrap', fontSize: '13.5px', lineHeight: 1.5 } }, ai) : null)));
  }

  // ── Accounts ────────────────────────────────────────────────────────────────
  function AccountDetail(props) {
    var c = props.ctx; var a = props.account;
    var contacts = (c.contacts || []).filter(function (x) { return x.account_name === a.name; });
    var deals = (c.deals || []).filter(function (x) { return x.account_name === a.name; });
    return h('div', { className: 'sm-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'sm-sheet', style: { padding: '26px', maxWidth: '620px' } }, h('button', { className: 'sm-x', onClick: props.onClose }, '×'),
        h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } },
          h('div', { className: 'sm-logobox', style: { width: '56px', height: '56px' } }, imgUrl(a.logo) ? h('img', { src: imgUrl(a.logo), alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }) : h('span', { style: { fontWeight: 800, color: 'var(--indigo)' } }, initials(a.name))),
          h('div', { style: { flex: 1 } }, h('h2', { className: 'sm-h2', style: { fontSize: '21px' } }, a.name), h('div', { className: 'sm-mut' }, (a.industry || '') + ' · ' + (a.tier || '') + ' · ' + (a.region || ''))),
          h(Badge, { s: a.account_state })),
        h('div', { style: { display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' } },
          h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase' } }, 'Revenue'), h('div', { className: 'jak num', style: { fontWeight: 800, fontSize: '18px' } }, k(a.annual_revenue))),
          h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase' } }, 'Employees'), h('div', { className: 'jak num', style: { fontWeight: 800, fontSize: '18px' } }, (a.employees || 0).toLocaleString())),
          h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase' } }, 'Owner'), h('div', { style: { fontWeight: 600, marginTop: '4px' } }, a.account_owner || '—')),
          a.website ? h('div', null, h('div', { className: 'sm-mut', style: { fontSize: '11px', textTransform: 'uppercase' } }, 'Website'), h('a', { href: 'https://' + a.website, target: '_blank', style: { fontWeight: 600, marginTop: '4px', display: 'block', color: 'var(--indigo)' } }, a.website)) : null),
        a.description ? h('div', { className: 'sm-mut', style: { marginTop: '14px', fontSize: '13.5px' } }, a.description) : null,
        h('div', { style: { fontWeight: 700, marginTop: '18px', marginBottom: '6px' } }, 'Contacts (' + contacts.length + ')'),
        contacts.length ? contacts.map(function (ct) {
          return h('div', { key: ct.uuid, className: 'sm-lead' }, h(Avatar, { src: ct.photo, name: ct.full_name }),
            h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 600 } }, ct.full_name, ct.is_primary ? h('span', { className: 'sm-chip', style: { marginLeft: '6px' } }, '★ primary') : null), h('div', { className: 'sm-mut' }, (ct.title || '') + ' · ' + (ct.email || ''))));
        }) : h('div', { className: 'sm-mut', style: { fontSize: '13px' } }, 'No contacts.'),
        h('div', { style: { fontWeight: 700, marginTop: '16px', marginBottom: '6px' } }, 'Deals (' + deals.length + ')'),
        deals.length ? deals.map(function (dx) {
          return h('div', { key: dx.uuid, className: 'sm-lead', style: { cursor: 'pointer' }, onClick: function () { props.onClose(); c.openDeal(dx); } },
            h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 600 } }, dx.deal_name), h('div', { className: 'sm-mut' }, money(dx.amount) + ' · ' + (dx.probability || 0) + '%')),
            h(Badge, { s: dx.deal_stage }));
        }) : h('div', { className: 'sm-mut', style: { fontSize: '13px' } }, 'No deals.')));
  }

  function Accounts(props) {
    var c = props.ctx; var [q, setQ] = React.useState(''); var [ind, setInd] = React.useState(''); var [open, setOpen] = React.useState(null);
    var list = (c.accounts || []).filter(function (a) { return (!q || (a.name || '').toLowerCase().indexOf(q.toLowerCase()) >= 0) && (!ind || a.industry === ind); });
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'jak', style: { fontWeight: 800, fontSize: '18px' } }, 'Accounts'),
        h('input', { className: 'sm-input', style: { maxWidth: '220px', padding: '8px 12px' }, placeholder: 'Search…', value: q, onChange: function (e) { setQ(e.target.value); } }),
        h('select', { className: 'sm-input', style: { maxWidth: '170px', padding: '8px 12px' }, value: ind, onChange: function (e) { setInd(e.target.value); } }, h('option', { value: '' }, 'All industries'), INDUSTRIES.map(function (i) { return h('option', { key: i, value: i }, i); })),
        c.isAdmin ? h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.newAccount(); } }, '+ New account') : null),
      h('div', { className: 'sm-panel' }, c.accounts === null ? h('div', { className: 'sm-row sm-mut' }, 'Loading…')
        : list.length ? list.map(function (a) {
          return h('div', { key: a.uuid, className: 'sm-row', style: { cursor: 'pointer' }, onClick: function () { setOpen(a); } },
            h('div', { className: 'sm-logobox' }, imgUrl(a.logo) ? h('img', { src: imgUrl(a.logo), alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }) : h('span', { style: { fontWeight: 700, color: 'var(--indigo)' } }, initials(a.name))),
            h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 700 } }, a.name), h('div', { className: 'sm-mut sm-trunc' }, (a.industry || '') + ' · ' + (a.tier || '') + ' · ' + (a.region || ''))),
            h('div', { className: 'num sm-mut', style: { fontWeight: 600 } }, k(a.annual_revenue)),
            h(Badge, { s: a.account_state }));
        }) : h('div', { className: 'sm-empty' }, 'No accounts.')),
      open ? h(AccountDetail, { ctx: c, account: open, onClose: function () { setOpen(null); } }) : null);
  }

  // ── Contacts ────────────────────────────────────────────────────────────────
  function Contacts(props) {
    var c = props.ctx; var [q, setQ] = React.useState('');
    var list = (c.contacts || []).filter(function (x) { return !q || (x.full_name || '').toLowerCase().indexOf(q.toLowerCase()) >= 0 || (x.account_name || '').toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'jak', style: { fontWeight: 800, fontSize: '18px' } }, 'Contacts'),
        h('input', { className: 'sm-input', style: { maxWidth: '240px', padding: '8px 12px' }, placeholder: 'Search people or accounts…', value: q, onChange: function (e) { setQ(e.target.value); } }),
        c.isAdmin ? h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.newContact(); } }, '+ New contact') : null),
      h('div', { className: 'sm-panel' }, c.contacts === null ? h('div', { className: 'sm-row sm-mut' }, 'Loading…')
        : list.length ? list.map(function (ct) {
          return h('div', { key: ct.uuid, className: 'sm-row' }, h(Avatar, { src: ct.photo, name: ct.full_name }),
            h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 600 } }, ct.full_name, ct.is_primary ? h('span', { className: 'sm-chip', style: { marginLeft: '6px' } }, '★') : null), h('div', { className: 'sm-mut sm-trunc' }, (ct.title || '') + ' · ' + (ct.account_name || ''))),
            h('div', { className: 'sm-mut', style: { fontSize: '12.5px', textAlign: 'right' } }, h('div', null, ct.email || ''), h('div', null, ct.phone || '')));
        }) : h('div', { className: 'sm-empty' }, 'No contacts.')));
  }

  // ── Leads ───────────────────────────────────────────────────────────────────
  function Leads(props) {
    var c = props.ctx; var [f, setF] = React.useState('all');
    var list = (c.leads || []).filter(function (x) { return f === 'all' || x.lead_state === f; }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    function scoreColor(n) { return n >= 80 ? 'var(--green)' : n >= 60 ? 'var(--amber)' : '#94a3b8'; }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'jak', style: { fontWeight: 800, fontSize: '18px' } }, 'Leads'),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, ['all'].concat(LEAD_STATES).map(function (s) { return h('button', { key: s, className: cls('sm-btn sm-btn-xs', f === s ? 'sm-btn-ind' : 'sm-btn-ghost'), onClick: function () { setF(s); } }, s); })),
        c.canWriteLead ? h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.newLead(); } }, '+ New lead') : null),
      h('div', { className: 'sm-panel', style: { padding: '6px 18px' } }, c.leads === null ? h('div', { className: 'sm-row sm-mut' }, 'Loading…')
        : list.length ? list.map(function (ld) {
          return h('div', { key: ld.uuid, className: 'sm-lead' },
            h('div', { className: 'sm-score', style: { background: scoreColor(ld.score) } }, ld.score || 0),
            h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 600 } }, ld.full_name, h('span', { className: 'sm-mut', style: { fontWeight: 400 } }, '  ' + (ld.company || ''))), h('div', { className: 'sm-mut sm-trunc' }, (ld.title || '') + ' · ' + (ld.source || '') + ' · ' + (ld.lead_owner || '') + ' · est ' + k(ld.est_value))),
            h(Badge, { s: ld.lead_state }),
            (c.canWriteLead && ld.lead_state !== 'converted' && ld.lead_state !== 'unqualified') ? h('button', { className: 'sm-btn sm-btn-green sm-btn-xs', onClick: function () { c.convertLead(ld); } }, '⇄ Convert') : null);
        }) : h('div', { className: 'sm-empty' }, 'No leads.')));
  }

  // ── Deals (table) ───────────────────────────────────────────────────────────
  function DealsTable(props) {
    var c = props.ctx; var [f, setF] = React.useState('all');
    var list = (c.deals || []).filter(function (x) { return f === 'all' || x.deal_stage === f; }).sort(function (a, b) { return (b.amount || 0) - (a.amount || 0); });
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'jak', style: { fontWeight: 800, fontSize: '18px' } }, 'Deals'),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, ['all'].concat(STAGES).map(function (s) { return h('button', { key: s, className: cls('sm-btn sm-btn-xs', f === s ? 'sm-btn-ind' : 'sm-btn-ghost'), onClick: function () { setF(s); } }, s.replace('Closed ', '')); })),
        c.canWriteDeal ? h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.newDeal(); } }, '+ New deal') : null),
      h('div', { className: 'sm-panel' }, c.deals === null ? h('div', { className: 'sm-row sm-mut' }, 'Loading…')
        : list.length ? list.map(function (dx) {
          return h('div', { key: dx.uuid, className: 'sm-row', style: { cursor: 'pointer' }, onClick: function () { c.openDeal(dx); } },
            h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 700 } }, dx.deal_name), h('div', { className: 'sm-mut sm-trunc' }, (dx.account_name || '') + ' · ' + (dx.deal_owner || '') + ' · close ' + fmtDate(dx.close_date))),
            h('div', { className: 'sm-chip' }, (dx.probability || 0) + '%'),
            h('div', { className: 'num', style: { fontWeight: 700, minWidth: '92px', textAlign: 'right' } }, money(dx.amount)),
            h(Badge, { s: dx.deal_stage }));
        }) : h('div', { className: 'sm-empty' }, 'No deals.')));
  }

  // ── Activities ──────────────────────────────────────────────────────────────
  function Activities(props) {
    var c = props.ctx; var [f, setF] = React.useState('open');
    var today = new Date().toDateString();
    var all = (c.activities || []).slice().sort(function (a, b) { return (a.due_date || '').localeCompare(b.due_date || ''); });
    var list = all.filter(function (a) { return f === 'all' ? true : f === 'today' ? dayKey(a.due_date) === today : f === 'overdue' ? (a.activity_state === 'open' && isOverdue(a.due_date)) : a.activity_state === f; });
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'jak', style: { fontWeight: 800, fontSize: '18px' } }, 'Activities'),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, [['open', 'Open'], ['today', 'Today'], ['overdue', 'Overdue'], ['completed', 'Completed'], ['all', 'All']].map(function (s) { return h('button', { key: s[0], className: cls('sm-btn sm-btn-xs', f === s[0] ? 'sm-btn-ind' : 'sm-btn-ghost'), onClick: function () { setF(s[0]); } }, s[1]); })),
        c.canWriteActivity ? h('button', { className: 'sm-btn sm-btn-ind sm-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.newActivity(); } }, '+ New activity') : null),
      h('div', { className: 'sm-panel' }, c.activities === null ? h('div', { className: 'sm-row sm-mut' }, 'Loading…')
        : list.length ? list.map(function (a) {
          var od = a.activity_state === 'open' && isOverdue(a.due_date);
          return h('div', { key: a.uuid, className: 'sm-row' }, h('span', { style: { fontSize: '20px' } }, ACT_ICON[a.activity_type] || '•'),
            h('div', { className: 'sm-grow' }, h('div', { style: { fontWeight: 600, textDecoration: a.activity_state === 'completed' ? 'line-through' : 'none', opacity: a.activity_state === 'completed' ? .55 : 1 } }, a.subject),
              h('div', { className: 'sm-mut sm-trunc' }, [a.account_name, a.deal_name, a.activity_owner].filter(Boolean).join(' · '))),
            h('div', { className: 'sm-mut', style: { fontSize: '12.5px', color: od ? 'var(--red)' : 'var(--muted)', fontWeight: od ? 700 : 400 } }, (od ? '⏰ ' : '') + fmtDate(a.due_date)),
            (c.canWriteActivity && a.activity_state === 'open') ? h('button', { className: 'sm-btn sm-btn-ghost sm-btn-xs', onClick: function () { c.completeActivity(a); } }, '✓ Done') : h(Badge, { s: a.activity_state }));
        }) : h('div', { className: 'sm-empty' }, 'No activities.')));
  }

  // ── App shell (logged-in CRM) ───────────────────────────────────────────────
  var ACCOUNT_FIELDS = [
    { k: 'name', label: 'Account name', req: true }, { k: 'industry', label: 'Industry', type: 'select', opts: INDUSTRIES },
    { k: 'website', label: 'Website' }, { k: 'tier', label: 'Tier', type: 'select', opts: TIERS },
    { k: 'region', label: 'Region' }, { k: 'account_owner', label: 'Account owner' },
    { k: 'employees', label: 'Employees', type: 'number' }, { k: 'annual_revenue', label: 'Annual revenue', type: 'number' },
    { k: 'account_state', label: 'State', type: 'select', opts: ['prospect', 'customer', 'churned'], req: true },
    { k: 'description', label: 'Description', type: 'textarea', full: true }
  ];
  var CONTACT_FIELDS = [
    { k: 'full_name', label: 'Full name', req: true }, { k: 'title', label: 'Title' },
    { k: 'email', label: 'Email' }, { k: 'phone', label: 'Phone' },
    { k: 'account_name', label: 'Account' }, { k: 'is_primary', label: 'Primary contact', type: 'check' }
  ];
  var LEAD_FIELDS = [
    { k: 'full_name', label: 'Full name', req: true }, { k: 'company', label: 'Company' },
    { k: 'email', label: 'Email' }, { k: 'phone', label: 'Phone' }, { k: 'title', label: 'Title' },
    { k: 'source', label: 'Source', type: 'select', opts: LEAD_SOURCES },
    { k: 'lead_state', label: 'State', type: 'select', opts: LEAD_STATES, req: true },
    { k: 'score', label: 'Score', type: 'number' }, { k: 'est_value', label: 'Est. value', type: 'number' },
    { k: 'lead_owner', label: 'Lead owner' }
  ];
  var DEAL_FIELDS = [
    { k: 'deal_name', label: 'Deal name', req: true }, { k: 'account_name', label: 'Account' },
    { k: 'contact_name', label: 'Contact' }, { k: 'amount', label: 'Amount', type: 'number', req: true },
    { k: 'deal_stage', label: 'Stage', type: 'select', opts: STAGES, req: true },
    { k: 'probability', label: 'Probability %', type: 'number' }, { k: 'close_date', label: 'Close date', type: 'date' },
    { k: 'deal_owner', label: 'Deal owner' }, { k: 'next_step', label: 'Next step', full: true }
  ];
  var ACTIVITY_FIELDS = [
    { k: 'subject', label: 'Subject', req: true }, { k: 'activity_type', label: 'Type', type: 'select', opts: ACT_TYPES },
    { k: 'account_name', label: 'Account' }, { k: 'contact_name', label: 'Contact' }, { k: 'deal_name', label: 'Deal' },
    { k: 'due_date', label: 'Due date', type: 'date' },
    { k: 'activity_state', label: 'State', type: 'select', opts: ['open', 'completed'], req: true },
    { k: 'activity_owner', label: 'Owner' }, { k: 'notes', label: 'Notes', type: 'textarea', full: true }
  ];

  function CRM(props) {
    var c = props.ctx; var sub = props.sub || 'dashboard';
    var tabs = [['dashboard', '📊 Dashboard'], ['pipeline', '📋 Pipeline'], ['accounts', '🏢 Accounts'], ['contacts', '👥 Contacts'], ['leads', '🎯 Leads'], ['deals', '💰 Deals'], ['activities', '📅 Activities']];
    var me = client.userInfo || {};
    var page;
    if (sub === 'pipeline') page = h(Pipeline, { ctx: c });
    else if (sub === 'accounts') page = h(Accounts, { ctx: c });
    else if (sub === 'contacts') page = h(Contacts, { ctx: c });
    else if (sub === 'leads') page = h(Leads, { ctx: c });
    else if (sub === 'deals') page = h(DealsTable, { ctx: c });
    else if (sub === 'activities') page = h(Activities, { ctx: c });
    else page = h(Dashboard, { ctx: c });
    return h('div', { className: 'sm' },
      h('div', { style: { background: 'linear-gradient(100deg,#0b1220,#312e81)' } }, h('div', { className: 'sm-wrap', style: { display: 'flex', alignItems: 'center', height: '60px', gap: '14px' } },
        h('div', { className: 'sm-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/dashboard'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.2)' } }, '▲'), 'Summit', h('span', { style: { opacity: .65 } }, 'CRM')),
        h('div', { className: 'sm-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('sm-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/' + t[0]); } }, t[1]); })),
        h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' } },
          h('div', { style: { textAlign: 'right', color: '#d6dcf5', fontSize: '12.5px', lineHeight: 1.2 } }, h('div', { style: { fontWeight: 700, color: '#fff' } }, me.fullName || 'User'), h('div', { style: { opacity: .8 } }, c.isAdmin ? 'Sales manager' : 'Sales rep')),
          h('button', { className: 'sm-ibtn', style: { color: '#d6dcf5' }, onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')))),
      h('div', { className: 'sm-wrap', style: { padding: '24px 24px 64px' } }, page));
  }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [accounts, setAccounts] = React.useState(null); var [contacts, setContacts] = React.useState(null);
    var [leads, setLeads] = React.useState(null); var [deals, setDeals] = React.useState(null); var [activities, setActivities] = React.useState(null);
    var [edit, setEdit] = React.useState(null);     // {schema, fields, initial, titles, beforeSave}
    var [dealOpen, setDealOpen] = React.useState(null);

    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);

    function loadAll() {
      client.getObjects('account').then(function (r) { setAccounts(arr(r)); }).catch(function () { setAccounts([]); });
      client.getObjects('contact').then(function (r) { setContacts(arr(r)); }).catch(function () { setContacts([]); });
      client.getObjects('lead').then(function (r) { setLeads(arr(r)); }).catch(function () { setLeads([]); });
      client.getObjects('deal').then(function (r) { setDeals(arr(r)); }).catch(function () { setDeals([]); });
      client.getObjects('activity').then(function (r) { setActivities(arr(r)); }).catch(function () { setActivities([]); });
    }
    React.useEffect(function () { if (authed) loadAll(); }, [authed]);

    function refreshDeals() { client.getObjects('deal').then(function (r) { setDeals(arr(r)); }).catch(function () {}); }
    function refreshAccounts() { client.getObjects('account').then(function (r) { setAccounts(arr(r)); }).catch(function () {}); }

    var me = client.userInfo || {};
    function can(action, ent) { try { return client.can(action, ent); } catch (e) { return isStaff(); } }

    function advanceDeal(dx, st) {
      var patch = { deal_stage: st };
      if (st === 'Closed Won') patch.probability = 100; if (st === 'Closed Lost') patch.probability = 0;
      client.updateObject('deal', dx.uuid, patch, dx).then(function () {
        showToast('Moved to ' + st, 'success'); refreshDeals();
        setDealOpen(function (cur) { return cur && cur.uuid === dx.uuid ? Object.assign({}, cur, patch) : cur; });
        if (st === 'Closed Won') fireDealWon(Object.assign({}, dx, patch));
      }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    function fireDealWon(dx) {
      var acct = (accounts || []).filter(function (a) { return a.name === dx.account_name; })[0];
      var contact = (contacts || []).filter(function (x) { return x.account_name === dx.account_name && x.is_primary; })[0] || (contacts || []).filter(function (x) { return x.account_name === dx.account_name; })[0];
      var input = { deal_name: dx.deal_name, amount: dx.amount, account_uuid: acct ? acct.uuid : '', account_email: (contact && contact.email) || '', deal_owner: dx.deal_owner || '' };
      var run = (services && services.workflow && services.workflow.run && acct) ? services.workflow.run('deal_won', input) : Promise.reject();
      run.then(function () { showToast('🎉 Deal won — account promoted & #wins notified', 'success'); refreshAccounts(); }).catch(function () {
        if (acct) client.updateObject('account', acct.uuid, { account_state: 'customer' }, acct).then(function () { refreshAccounts(); }).catch(function () {});
        showToast('🎉 Deal won!', 'success');
      });
    }
    function completeActivity(a) { client.updateObject('activity', a.uuid, { activity_state: 'completed' }, a).then(function () { showToast('Activity completed', 'success'); client.getObjects('activity').then(function (r) { setActivities(arr(r)); }); }).catch(function () { showToast('Failed', 'error'); }); }

    function convertLead(ld) {
      if (!window.confirm('Convert ' + ld.full_name + ' into an account, contact and deal?')) return;
      var owner = ld.owner_username || me.email; var ownerName = ld.lead_owner || me.fullName || '';
      var acctName = ld.company || (ld.full_name + ' (new)');
      var steps = [];
      // Create account only if not already present (admin can create accounts; reps cannot — fall back gracefully).
      var existing = (accounts || []).filter(function (a) { return a.name === acctName; })[0];
      if (!existing && can('create', 'account')) {
        steps.push(client.createObject('account', { name: acctName, industry: '', account_state: 'prospect', account_owner: ownerName, display_name: acctName, description: 'Converted from lead ' + ld.full_name }).catch(function () {}));
      }
      if (can('create', 'contact')) {
        steps.push(client.createObject('contact', { full_name: ld.full_name, title: ld.title || '', email: ld.email || '', phone: ld.phone || '', account_name: acctName, is_primary: true, owner_username: owner, display_name: ld.full_name, description: (ld.title || '') + ' · ' + acctName }).catch(function () {}));
      }
      steps.push(client.createObject('deal', { deal_name: acctName + ' — New Opportunity', account_name: acctName, contact_name: ld.full_name, amount: ld.est_value || 0, deal_stage: 'Qualification', probability: 40, close_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), deal_owner: ownerName, next_step: 'Qualify converted lead', owner_username: owner, display_name: acctName + ' — New Opportunity', description: acctName + ' · Qualification' }).catch(function () {}));
      steps.push(client.updateObject('lead', ld.uuid, { lead_state: 'converted' }, ld).catch(function () {}));
      Promise.all(steps).then(function () { showToast('Lead converted → account · contact · deal', 'success'); loadAll(); }).catch(function () { showToast('Convert partly failed', 'warning'); loadAll(); });
    }

    function openEdit(schema, fields, initial, titles, beforeSave) { setEdit({ schema: schema, fields: fields, initial: initial || {}, titles: titles, beforeSave: beforeSave }); }

    var ctx = {
      route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); },
      accounts: accounts, contacts: contacts, leads: leads, deals: deals, activities: activities,
      canWriteDeal: can('create', 'deal') || can('update', 'deal') || isStaff(),
      canWriteLead: can('create', 'lead') || can('update', 'lead') || isStaff(),
      canWriteActivity: can('create', 'activity') || can('update', 'activity') || isStaff(),
      openDeal: function (dx) { setDealOpen(dx); }, advanceDeal: advanceDeal, completeActivity: completeActivity, convertLead: convertLead,
      newDeal: function () { openEdit('deal', DEAL_FIELDS, { deal_stage: 'Prospecting', probability: 20, deal_owner: me.fullName || '', owner_username: me.email || '' }, ['New deal', 'New deal'], function (d) { d.display_name = d.deal_name; d.description = (d.account_name || '') + ' · ' + (d.deal_stage || ''); if (!d.owner_username) d.owner_username = me.email; }); },
      editDeal: function (dx) { setDealOpen(null); openEdit('deal', DEAL_FIELDS, dx, ['New deal', 'Edit deal'], function (d) { d.display_name = d.deal_name; d.description = (d.account_name || '') + ' · ' + (d.deal_stage || ''); }); },
      newLead: function () { openEdit('lead', LEAD_FIELDS, { lead_state: 'new', score: 50, source: 'Web', lead_owner: me.fullName || '', owner_username: me.email || '' }, ['New lead', 'New lead'], function (d) { d.display_name = (d.full_name || '') + ' · ' + (d.company || ''); d.description = (d.source || '') + ' lead'; if (!d.owner_username) d.owner_username = me.email; if (!d.lead_owner) d.lead_owner = me.fullName; }); },
      newActivity: function () { openEdit('activity', ACTIVITY_FIELDS, { activity_state: 'open', activity_type: 'Call', due_date: new Date().toISOString().slice(0, 10), activity_owner: me.fullName || '', owner_username: me.email || '' }, ['New activity', 'New activity'], function (d) { d.display_name = d.subject; d.description = (d.activity_type || '') + ' · open'; if (!d.owner_username) d.owner_username = me.email; }); },
      newAccount: function () { openEdit('account', ACCOUNT_FIELDS, { account_state: 'prospect', account_owner: me.fullName || '' }, ['New account', 'New account'], function (d) { d.display_name = d.name; }); },
      newContact: function () { openEdit('contact', CONTACT_FIELDS, { owner_username: me.email || '' }, ['New contact', 'New contact'], function (d) { d.display_name = d.full_name; d.description = (d.title || '') + ' · ' + (d.account_name || ''); if (!d.owner_username) d.owner_username = me.email; }); }
    };

    var hash = route.replace(/^#\//, ''); var top = (hash.split('?')[0].split('/')[0]) || '';
    var CRM_SUBS = ['dashboard', 'pipeline', 'accounts', 'contacts', 'leads', 'deals', 'activities'];

    var overlays = h('span', null,
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); setAuthed(true); navigate('#/dashboard'); } }) : null,
      dealOpen ? h(DealDrawer, { ctx: ctx, deal: dealOpen, onClose: function () { setDealOpen(null); } }) : null,
      edit ? h(EditModal, { schema: edit.schema, fields: edit.fields, initial: edit.initial, newTitle: edit.titles[0], editTitle: edit.titles[1], beforeSave: edit.beforeSave, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); loadAll(); } }) : null);

    if (authed && (CRM_SUBS.indexOf(top) >= 0 || top === '')) {
      var sub = CRM_SUBS.indexOf(top) >= 0 ? top : 'dashboard';
      return h(ErrorBoundary, null, h(CRM, { ctx: ctx, sub: sub }), overlays);
    }
    // logged out → marketing
    return h(ErrorBoundary, null, h('div', { className: 'sm' }, h(MarketingTop, { ctx: ctx }), h(Marketing, { ctx: ctx }), h(MarketingFooter, null)), overlays);
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
