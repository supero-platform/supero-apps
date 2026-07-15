// ui/app.js — Concierge AI support platform (custom UI).
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, ErrorBoundary)
// come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var BRAND = { name: 'Concierge', tag: 'AI support', tagline: 'Answers in seconds, humans when it matters' };
  var KB_CATEGORIES = ['Getting Started', 'Billing & Plans', 'Account & Security', 'Integrations', 'Troubleshooting', 'API & Developers'];
  var CAT_ICON = { 'Getting Started': '🚀', 'Billing & Plans': '💳', 'Account & Security': '🔒', 'Integrations': '🧩', 'Troubleshooting': '🛠️', 'API & Developers': '⚡' };
  var CHANNELS = ['chat', 'email', 'whatsapp', 'slack'];
  var PRIORITIES = ['low', 'normal', 'high', 'urgent'];
  var TICKET_STATES = ['open', 'pending', 'resolved', 'closed'];

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function fmtTime(s) { if (!s) return ''; try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
  function statusColor(s) {
    return { open: '#2563eb', pending: '#b45309', resolved: '#15803d', closed: '#6b7280',
      low: '#6b7280', normal: '#2563eb', high: '#d97706', urgent: '#dc2626' }[s] || '#6d28d9';
  }
  function isStaff() {
    try { return client.isAdmin() || client.canWrite('macro') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
  }
  function aiText(res) {
    var t = res && (res.output && (res.output.text || res.output.completion || res.output.content || res.output) || res.text || res.completion || res.content || res.message || res);
    if (typeof t !== 'string') { try { t = JSON.stringify(t); } catch (e) { t = ''; } }
    return t || '';
  }

  function injectChrome() {
    if (document.getElementById('cc-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'cc-chrome';
    st.textContent = [
      ':root{--ink:#16131f;--ink2:#433d57;--paper:#fff;--bg:#f5f4fb;--brand:#6d28d9;--brand2:#7c3aed;--brand-d:#5b21b6;--sky:#0ea5e9;--line:#e8e5f2;--muted:#726c85;--ai:#7c3aed}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.cc{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.cc *{box-sizing:border-box}.cc a{color:inherit;text-decoration:none}',
      '.cc-wrap{max-width:1180px;margin:0 auto;padding:0 24px}',
      '.jak{font-family:"Plus Jakarta Sans",Inter,sans-serif}',
      '.cc-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.cc-top-in{display:flex;align-items:center;gap:18px;height:66px}',
      '.cc-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:"Plus Jakarta Sans";font-weight:800;font-size:20px;color:var(--ink)}',
      '.cc-logo .dot{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--brand),var(--sky));display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px}',
      '.cc-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.cc-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600;position:relative}',
      '.cc-ibtn:hover{background:var(--bg)}',
      '.cc-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:11px;font-weight:600;font-size:14px;padding:11px 19px;font-family:Inter;transition:.15s}',
      '.cc-btn:disabled{opacity:.55;cursor:default}',
      '.cc-btn-brand{background:var(--brand);color:#fff}.cc-btn-brand:hover:not(:disabled){background:var(--brand-d)}',
      '.cc-btn-ink{background:var(--ink);color:#fff}.cc-btn-ink:hover:not(:disabled){background:#000}',
      '.cc-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.cc-btn-ghost:hover{border-color:var(--brand)}',
      '.cc-btn-sm{padding:7px 13px;font-size:13px;border-radius:9px}',
      '.cc-hero{background:linear-gradient(160deg,#2b1769,#6d28d9 60%,#0ea5e9);color:#fff;position:relative;overflow:hidden}',
      '.cc-hero-in{position:relative;padding:72px 0 84px;text-align:center}',
      '.cc-hero h1{font-family:"Plus Jakarta Sans";font-weight:800;font-size:clamp(30px,4.6vw,50px);margin:8px 0 0;letter-spacing:-.02em}',
      '.cc-hero p{font-size:18px;color:#e9defc;max-width:560px;margin:14px auto 0}',
      '.cc-pill{display:inline-block;background:rgba(255,255,255,.16);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:30px}',
      '.cc-hsearch{max-width:620px;margin:26px auto 0;position:relative}',
      '.cc-hsearch input{width:100%;border:0;border-radius:14px;padding:16px 18px 16px 50px;font-size:16px;font-family:Inter;box-shadow:0 20px 50px -20px rgba(0,0,0,.5)}',
      '.cc-hsearch svg{position:absolute;left:18px;top:17px;opacity:.45}',
      '.cc-sec{padding:48px 0}',
      '.cc-h2{font-family:"Plus Jakarta Sans";font-weight:700;font-size:26px;margin:0;letter-spacing:-.01em}',
      '.cc-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)}',
      '.cc-cats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:22px}',
      '.cc-cat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px;cursor:pointer;transition:.16s;display:flex;gap:14px;align-items:flex-start}',
      '.cc-cat:hover{box-shadow:0 16px 40px -28px rgba(40,20,80,.4);transform:translateY(-2px);border-color:#d9d2ee}',
      '.cc-cat .ic{width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,#f3eefe,#e9f6fe);display:flex;align-items:center;justify-content:center;font-size:21px;flex:none}',
      '.cc-cat h3{font-size:15px;font-weight:700;margin:0}',
      '.cc-cat p{font-size:13px;color:var(--muted);margin:3px 0 0}',
      '.cc-alist{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:20px}',
      '.cc-acard{background:var(--paper);border:1px solid var(--line);border-radius:13px;padding:18px 20px;cursor:pointer;transition:.16s}',
      '.cc-acard:hover{box-shadow:0 14px 36px -26px rgba(40,20,80,.4);transform:translateY(-2px)}',
      '.cc-acard h3{font-size:16px;font-weight:700;margin:6px 0 0}',
      '.cc-acard p{font-size:13.5px;color:var(--muted);margin:5px 0 0;line-height:1.5}',
      '.cc-tag{display:inline-block;font-size:11px;font-weight:700;color:var(--brand);background:#f3eefe;border-radius:20px;padding:3px 10px}',
      '.cc-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.cc-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-top:1px solid var(--line)}',
      '.cc-row:first-child{border-top:0}.cc-grow{flex:1;min-width:0}.cc-mut{color:var(--muted);font-size:13px}',
      '.cc-badge{display:inline-block;font-size:11px;font-weight:700;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff}',
      '.cc-2col{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start}',
      '.cc-field{display:block;margin-top:14px}.cc-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.cc-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:11px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.cc-input:focus{outline:none;border-color:var(--brand)}textarea.cc-input{min-height:90px;resize:vertical}',
      '.cc-modal{position:fixed;inset:0;z-index:200;background:rgba(22,19,31,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.cc-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:560px;max-height:92vh;overflow:auto;position:relative}',
      '.cc-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:23px;cursor:pointer;color:var(--muted);z-index:2}',
      '.cc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.cc-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}',
      '.cc-stat-n{font-family:"Plus Jakarta Sans";font-weight:800;font-size:28px;line-height:1}',
      '.cc-stat-l{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      // chat
      '.cc-chat{display:flex;flex-direction:column;gap:12px;max-height:420px;overflow:auto;padding:6px 2px}',
      '.cc-msg{max-width:82%;padding:11px 14px;border-radius:14px;font-size:14px;line-height:1.55;white-space:pre-wrap}',
      '.cc-msg.user{align-self:flex-end;background:var(--brand);color:#fff;border-bottom-right-radius:4px}',
      '.cc-msg.ai{align-self:flex-start;background:#f3eefe;color:var(--ink);border-bottom-left-radius:4px}',
      '.cc-msg.agent{align-self:flex-start;background:#eef4ff;color:var(--ink);border-bottom-left-radius:4px}',
      '.cc-msg-from{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.7;margin-bottom:3px}',
      '.cc-typing{display:inline-flex;gap:4px}.cc-typing i{width:7px;height:7px;border-radius:50%;background:var(--brand);opacity:.5;animation:ccb 1s infinite}',
      '.cc-typing i:nth-child(2){animation-delay:.2s}.cc-typing i:nth-child(3){animation-delay:.4s}',
      '@keyframes ccb{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}',
      '.cc-tabs{display:flex;gap:4px;flex-wrap:wrap}.cc-tab{background:none;border:0;color:#d8cff0;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.cc-tab.on{background:rgba(255,255,255,.16);color:#fff}',
      '.cc-foot{background:var(--ink);color:#a59cc0;padding:34px 0;font-size:13px;margin-top:40px}.cc-foot b{color:#fff;font-family:"Plus Jakarta Sans"}',
      '.cc-empty{text-align:center;padding:60px 20px;color:var(--muted)}',
      '.cc-chip{display:inline-block;font-size:11px;font-weight:600;color:var(--ink2);background:#eee9f8;border-radius:20px;padding:3px 9px}',
      '.cc-banner{background:#f3eefe;border:1px solid #d9cdf5;color:#5b21b6;border-radius:11px;padding:11px 14px;font-size:13px}',
      '.cc-fab{position:fixed;right:22px;bottom:22px;z-index:120;background:linear-gradient(135deg,var(--brand),var(--sky));color:#fff;border:0;border-radius:30px;padding:13px 20px;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 16px 40px -14px rgba(80,40,160,.6);display:flex;gap:8px;align-items:center}',
      '@media(max-width:980px){.cc-cats,.cc-alist{grid-template-columns:1fr}.cc-stats{grid-template-columns:repeat(2,1fr)}.cc-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'cc-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '◆'), 'Concierge', h('span', { style: { color: 'var(--muted)', fontWeight: 600 } }, 'AI')); }
  function Field(p) { return h('label', { className: 'cc-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'cc-badge', style: { background: statusColor(p.s) } }, p.s); }

  // ── AI grounding ──────────────────────────────────────────────────────────────
  function kbContext(articles) {
    return (articles || []).slice(0, 24).map(function (a) { return '### ' + a.title + ' [' + a.category + ']\n' + (a.summary || '') + '\n' + (a.body || '').slice(0, 400); }).join('\n\n');
  }
  function kbSearch(articles, q) {
    q = (q || '').toLowerCase();
    return (articles || []).map(function (a) {
      var hay = (a.title + ' ' + (a.summary || '') + ' ' + (a.tags || '') + ' ' + (a.category || '')).toLowerCase();
      var score = 0; q.split(/\s+/).forEach(function (w) { if (w && hay.indexOf(w) >= 0) score++; });
      return { a: a, score: score };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).map(function (x) { return x.a; });
  }
  function askConcierge(question, articles) {
    var prompt = 'You are the AI concierge for a SaaS product. Answer the user clearly and concisely (2-4 sentences) using ONLY the knowledge base below. ' +
      'If the answer is in the KB, give it and name the article. If it is not covered, say you are not sure and suggest creating a ticket.\n\n' +
      'KNOWLEDGE BASE:\n' + kbContext(articles) + '\n\nUSER QUESTION: ' + question + '\n\nAnswer:';
    return Promise.resolve().then(function () {
      if (!services || !services.ai || !services.ai.complete) throw new Error('no-ai');
      return services.ai.complete({ prompt: prompt });
    }).then(function (res) {
      var t = aiText(res); if (!t) throw new Error('empty');
      return { text: t, ai: true };
    }).catch(function () {
      var hits = kbSearch(articles, question).slice(0, 3);
      if (hits.length) return { text: 'Here are the most relevant help articles:\n\n' + hits.map(function (a) { return '• ' + a.title + ' — ' + (a.summary || ''); }).join('\n') + '\n\nStill stuck? Create a ticket and a human will help.', ai: false, hits: hits };
      return { text: "I couldn't find an exact answer in our help center. Create a ticket and our team will get back to you quickly.", ai: false };
    });
  }
  function suggestReply(ticket, thread, articles) {
    var convo = (thread || []).map(function (m) { return (m.sender || 'customer') + ': ' + m.body; }).join('\n');
    var prompt = 'You are a senior support agent. Draft a friendly, helpful reply (3-5 sentences) to the customer\'s latest message, ' +
      'using the knowledge base where relevant. Be specific and actionable.\n\nKNOWLEDGE BASE:\n' + kbContext(articles) +
      '\n\nTICKET: ' + (ticket.subject || '') + ' [' + (ticket.category || '') + ']\nCONVERSATION:\n' + convo + '\n\nDraft reply:';
    return Promise.resolve().then(function () {
      if (!services || !services.ai || !services.ai.complete) throw new Error('no-ai');
      return services.ai.complete({ prompt: prompt });
    }).then(function (res) { var t = aiText(res); if (!t) throw new Error('empty'); return t; })
      .catch(function () {
        var hits = kbSearch(articles, ticket.subject + ' ' + (ticket.category || ''));
        var ref = hits[0];
        return 'Hi ' + (ticket.customer_name || 'there') + ' — thanks for reaching out!' + (ref ? ' This article should help: "' + ref.title + '". ' + (ref.summary || '') : ' Let me look into this and get you sorted.') + ' Let me know if that does the trick.';
      });
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'customer@concierge.support');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'cc-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'cc-sheet', style: { maxWidth: '410px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'cc-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'cc-h2', style: { marginTop: '16px' } }, props.title || 'Sign in'),
        h('p', { className: 'cc-mut' }, 'Sign in to track your tickets — or as an agent to work the queue.'),
        h(Field, { label: 'Email', children: h('input', { className: 'cc-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'cc-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: '#dc2626', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'cc-btn cc-btn-brand', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'cc-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — customer@concierge.support · agent@concierge.support · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'cc-top' }, h('div', { className: 'cc-wrap cc-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'cc-act' },
        h('button', { className: 'cc-ibtn', onClick: function () { c.navigate('#/'); } }, 'Help center'),
        c.isAdmin ? h('button', { className: 'cc-ibtn', onClick: function () { c.navigate('#/agent'); } }, '🎧 Agent console') : null,
        c.authed ? h('button', { className: 'cc-ibtn', onClick: function () { c.navigate('#/tickets'); } }, '🎫 My tickets') : null,
        c.authed
          ? h('button', { className: 'cc-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'cc-btn cc-btn-brand cc-btn-sm', onClick: c.openLogin }, 'Sign in'))));
  }

  // ── AI concierge chat panel ─────────────────────────────────────────────────
  function ChatPanel(props) {
    var c = props.ctx;
    var [msgs, setMsgs] = React.useState([{ from: 'ai', text: "Hi! I'm your AI concierge. Ask me anything about getting started, billing, integrations or your account." }]);
    var [q, setQ] = React.useState(''); var [busy, setBusy] = React.useState(false);
    var endRef = React.useRef(null);
    React.useEffect(function () { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
    function send(e) {
      e && e.preventDefault();
      var text = q.trim(); if (!text || busy) return;
      setMsgs(function (m) { return m.concat([{ from: 'user', text: text }]); }); setQ(''); setBusy(true);
      askConcierge(text, c.articles || []).then(function (r) {
        setMsgs(function (m) { return m.concat([{ from: 'ai', text: r.text, ai: r.ai }]); }); setBusy(false);
      });
    }
    return h('div', { className: 'cc-panel', style: { padding: '18px', maxWidth: props.wide ? '760px' : '100%', margin: props.wide ? '0 auto' : '0' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
        h('span', { className: 'cc-eyebrow' }, '✦ Ask the AI concierge'),
        h('span', { className: 'cc-mut', style: { marginLeft: 'auto', fontSize: '12px' } }, 'Grounded in our help center')),
      h('div', { className: 'cc-chat' },
        msgs.map(function (m, i) {
          return h('div', { key: i, className: 'cc-msg ' + (m.from === 'user' ? 'user' : 'ai') },
            m.from === 'ai' ? h('div', { className: 'cc-msg-from' }, m.ai === false ? 'Concierge · KB' : 'Concierge AI') : null, m.text);
        }),
        busy ? h('div', { className: 'cc-msg ai' }, h('span', { className: 'cc-typing' }, h('i'), h('i'), h('i'))) : null,
        h('div', { ref: endRef })),
      h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } },
        h('input', { className: 'cc-input', placeholder: 'Type your question…', value: q, onChange: function (e) { setQ(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } } }),
        h('button', { className: 'cc-btn cc-btn-brand', type: 'button', disabled: busy, onClick: function () { send(); } }, 'Ask')),
      h('div', { style: { marginTop: '10px', textAlign: 'center' } },
        h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { c.authed ? c.navigate('#/tickets/new') : c.openLogin(); } }, 'Still need help? Create a ticket')));
  }

  // ── Help center ─────────────────────────────────────────────────────────────
  function HelpCenter(props) {
    var c = props.ctx; var q = props.query || '';
    var articles = (c.articles || []);
    var featured = articles.filter(function (a) { return a.featured; }).slice(0, 6);
    var results = q ? kbSearch(articles, q) : [];
    return h('div', null,
      h('section', { className: 'cc-hero' }, h('div', { className: 'cc-wrap cc-hero-in' },
        h('span', { className: 'cc-pill' }, 'AI-first support'),
        h('h1', null, 'How can we help?'),
        h('p', null, 'Search our help center or ask the AI concierge — answers in seconds, a human the moment you need one.'),
        h('div', { className: 'cc-hsearch' },
          h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('circle', { cx: 11, cy: 11, r: 8 }), h('path', { d: 'M21 21l-4.3-4.3' })),
          h('input', { placeholder: 'Search for answers…', value: q, autoFocus: false, onChange: function (e) { props.onSearch(e.target.value); } })))),
      q ? h('section', { className: 'cc-sec' }, h('div', { className: 'cc-wrap' },
        h('h2', { className: 'cc-h2' }, results.length + ' result' + (results.length === 1 ? '' : 's') + ' for "' + q + '"'),
        results.length ? h('div', { className: 'cc-alist' }, results.map(function (a) { return h(ArticleCard, { key: a.uuid, a: a, ctx: c }); }))
          : h('div', { className: 'cc-empty' }, h('div', { style: { fontSize: '40px' } }, '🤔'), h('div', { style: { marginTop: '8px', fontWeight: 600 } }, 'No articles found — try the AI concierge below.')))) : null,
      !q ? h('section', { className: 'cc-sec' }, h('div', { className: 'cc-wrap' },
        h(props.Eyebrow || 'div', { className: 'cc-eyebrow' }, 'Browse by topic'),
        h('div', { className: 'cc-cats' }, KB_CATEGORIES.map(function (cat) {
          var n = articles.filter(function (a) { return a.category === cat; }).length;
          return h('div', { key: cat, className: 'cc-cat', onClick: function () { c.navigate('#/category/' + encodeURIComponent(cat)); } },
            h('div', { className: 'ic' }, CAT_ICON[cat] || '📄'),
            h('div', null, h('h3', null, cat), h('p', null, n + ' article' + (n === 1 ? '' : 's'))));
        })))) : null,
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'cc-wrap' }, h(ChatPanel, { ctx: c, wide: true }))),
      !q && featured.length ? h('section', { className: 'cc-sec' }, h('div', { className: 'cc-wrap' },
        h('div', { className: 'cc-eyebrow' }, 'Popular articles'),
        h('div', { className: 'cc-alist' }, featured.map(function (a) { return h(ArticleCard, { key: a.uuid, a: a, ctx: c }); })))) : null);
  }

  function ArticleCard(props) {
    var a = props.a;
    return h('div', { className: 'cc-acard', onClick: function () { props.ctx.navigate('#/article/' + a.uuid); } },
      h('span', { className: 'cc-tag' }, a.category),
      h('h3', null, a.title),
      h('p', null, a.summary || (a.body || '').slice(0, 110) + '…'),
      h('div', { className: 'cc-mut', style: { marginTop: '10px', fontSize: '12px' } }, (a.read_minutes || 3) + ' min read · ' + (a.helpful_count || 0) + ' found this helpful'));
  }

  function CategoryPage(props) {
    var c = props.ctx; var cat = decodeURIComponent(props.cat || '');
    var list = (c.articles || []).filter(function (a) { return a.category === cat; }).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'cc-wrap cc-sec' },
      h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { c.navigate('#/'); } }, '← Help center'),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' } }, h('span', { style: { fontSize: '26px' } }, CAT_ICON[cat] || '📄'), h('h2', { className: 'cc-h2' }, cat)),
      list.length ? h('div', { className: 'cc-alist' }, list.map(function (a) { return h(ArticleCard, { key: a.uuid, a: a, ctx: c }); })) : h('div', { className: 'cc-empty' }, 'No articles yet.'));
  }

  function ArticlePage(props) {
    var c = props.ctx;
    var a = (c.articles || []).filter(function (x) { return x.uuid === props.uuid; })[0];
    if (!a) return h('div', { className: 'cc-wrap cc-sec' }, h('div', { className: 'cc-empty' }, 'Article not found.'));
    return h('div', { className: 'cc-wrap cc-sec', style: { maxWidth: '760px' } },
      h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { c.navigate('#/category/' + encodeURIComponent(a.category)); } }, '← ' + a.category),
      h('h1', { className: 'cc-h2 jak', style: { fontSize: '32px', margin: '16px 0 6px' } }, a.title),
      h('div', { className: 'cc-mut' }, (a.read_minutes || 3) + ' min read'),
      h('div', { className: 'cc-panel', style: { padding: '26px', marginTop: '18px', fontSize: '15.5px', lineHeight: 1.75, color: 'var(--ink2)', whiteSpace: 'pre-wrap' } }, a.body),
      h('div', { className: 'cc-banner', style: { marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' } },
        h('span', null, 'Was this helpful?'),
        h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { showToast('Thanks for the feedback!', 'success'); } }, '👍 Yes'),
        h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { c.authed ? c.navigate('#/tickets/new') : c.openLogin(); } }, '👎 I still need help')));
  }

  // ── Customer tickets ────────────────────────────────────────────────────────
  function MyTickets(props) {
    var c = props.ctx; var [tickets, setTickets] = React.useState(null);
    React.useEffect(function () { if (!c.authed) return; client.getObjects('ticket').then(function (r) { setTickets(arr(r).sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); })); }).catch(function () { setTickets([]); }); }, [c.authed]);
    if (!c.authed) return h('div', { className: 'cc-wrap cc-sec' }, h('div', { className: 'cc-empty' }, h('h2', { className: 'cc-h2' }, 'Sign in to see your tickets'), h('button', { className: 'cc-btn cc-btn-brand', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    return h('div', { className: 'cc-wrap cc-sec' },
      h('div', { style: { display: 'flex', alignItems: 'center' } }, h('h2', { className: 'cc-h2' }, 'My tickets'),
        h('button', { className: 'cc-btn cc-btn-brand', style: { marginLeft: 'auto' }, onClick: function () { c.navigate('#/tickets/new'); } }, '+ New ticket')),
      h('div', { className: 'cc-panel', style: { marginTop: '16px' } },
        tickets === null ? h('div', { className: 'cc-row cc-mut' }, 'Loading…')
          : tickets.length ? tickets.map(function (t) {
            return h('div', { key: t.uuid, className: 'cc-row', style: { cursor: 'pointer' }, onClick: function () { c.navigate('#/ticket/' + t.uuid); } },
              h('div', { className: 'cc-grow' }, h('div', { style: { fontWeight: 700 } }, t.subject), h('div', { className: 'cc-mut' }, (t.category || '') + ' · ' + (t.channel || 'chat') + ' · ' + fmtDate(t.created_at))),
              t.ai_handled ? h('span', { className: 'cc-chip' }, '✦ AI') : null,
              h(Badge, { s: t.priority || 'normal' }), h(Badge, { s: t.ticket_state }));
          }) : h('div', { className: 'cc-empty' }, 'No tickets yet — ask the AI concierge or open one.')));
  }

  function NewTicket(props) {
    var c = props.ctx; var u = client.userInfo || {};
    var [f, setF] = React.useState({ subject: '', category: 'Getting Started', priority: 'normal', body: '' });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function submit(e) {
      e.preventDefault(); if (!c.authed) { c.openLogin(); return; } setBusy(true);
      var rec = { subject: f.subject, category: f.category, priority: f.priority, channel: 'chat', ticket_state: 'open',
        customer_name: u.fullName || '', customer_email: u.email || '', ai_handled: false, last_message: f.body, display_name: f.subject };
      client.createObject('ticket', rec).then(function (t) {
        return client.createObject('message', { body: f.body, sender: 'customer', sender_name: u.fullName || 'You', display_name: 'You', parent_type: 'ticket', parent_uuid: t.uuid }).catch(function () {}).then(function () { return t; });
      }).then(function (t) { setBusy(false); showToast('Ticket created', 'success'); c.navigate('#/ticket/' + t.uuid); })
        .catch(function (err) { setBusy(false); showToast('Failed: ' + ((err && err.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'cc-wrap cc-sec', style: { maxWidth: '640px' } },
      h('h2', { className: 'cc-h2' }, 'New ticket'),
      h('p', { className: 'cc-mut' }, 'Tip: the AI concierge on the help center may answer instantly — but we\'re happy to take it from here.'),
      h('form', { className: 'cc-panel', style: { padding: '24px', marginTop: '16px' }, onSubmit: submit },
        h(Field, { label: 'Subject', req: true, children: h('input', { className: 'cc-input', required: true, value: f.subject, onChange: function (e) { set('subject', e.target.value); } }) }),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Topic', children: h('select', { className: 'cc-input', value: f.category, onChange: function (e) { set('category', e.target.value); } }, KB_CATEGORIES.map(function (x) { return h('option', { key: x, value: x }, x); })) }),
          h(Field, { label: 'Priority', children: h('select', { className: 'cc-input', value: f.priority, onChange: function (e) { set('priority', e.target.value); } }, PRIORITIES.map(function (x) { return h('option', { key: x, value: x }, x); })) })),
        h(Field, { label: 'How can we help?', req: true, children: h('textarea', { className: 'cc-input', required: true, value: f.body, onChange: function (e) { set('body', e.target.value); } }) }),
        h('button', { className: 'cc-btn cc-btn-brand', type: 'submit', disabled: busy, style: { marginTop: '16px' } }, busy ? 'Creating…' : 'Create ticket')));
  }

  function TicketThread(props) {
    var c = props.ctx; var agent = props.agent;
    var [ticket, setTicket] = React.useState(null);
    var [msgs, setMsgs] = React.useState([]);
    var [reply, setReply] = React.useState(''); var [busy, setBusy] = React.useState(false); var [suggesting, setSuggesting] = React.useState(false);
    function load() {
      client.getObjects('ticket').then(function (rows) {
        var t = arr(rows).filter(function (x) { return x.uuid === props.uuid; })[0]; setTicket(t || null);
        if (t) client.getScopedList('ticket', t.uuid, 'message').then(function (m) { setMsgs(arr(m).sort(function (a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); })); }).catch(function () {});
      }).catch(function () {});
    }
    React.useEffect(load, [props.uuid]);
    var u = client.userInfo || {};
    function sendReply() {
      var body = reply.trim(); if (!body || !ticket) return; setBusy(true);
      var sender = agent ? 'agent' : 'customer';
      client.createObject('message', { body: body, sender: sender, sender_name: u.fullName || (agent ? 'Agent' : 'You'),
        owner_username: ticket.owner_username, display_name: (u.fullName || sender) + ': ' + body, parent_type: 'ticket', parent_uuid: ticket.uuid })
        .then(function () {
          var patch = { last_message: body }; if (agent && ticket.ticket_state === 'open') patch.ticket_state = 'pending';
          return client.updateObject('ticket', ticket.uuid, patch, ticket).catch(function () {});
        }).then(function () { setReply(''); setBusy(false); load(); }).catch(function (e) { setBusy(false); showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    function doSuggest() {
      if (!ticket) return; setSuggesting(true);
      suggestReply(ticket, msgs, c.articles || []).then(function (t) { setReply(t); setSuggesting(false); showToast('AI drafted a reply — edit and send', 'info'); });
    }
    function setState(st) { client.updateObject('ticket', ticket.uuid, st === 'resolved' ? { ticket_state: 'resolved', resolved_at: new Date().toISOString() } : { ticket_state: st }, ticket).then(function () { showToast('Ticket ' + st, 'success'); load(); }).catch(function () {}); }
    if (!ticket) return h('div', { className: 'cc-wrap cc-sec' }, h('div', { className: 'cc-empty' }, 'Loading…'));
    return h('div', { className: 'cc-wrap cc-sec' },
      h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { c.navigate(agent ? '#/agent/queue' : '#/tickets'); } }, '← Back'),
      h('div', { className: 'cc-2col', style: { marginTop: '16px' } },
        h('div', null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, h('h2', { className: 'cc-h2' }, ticket.subject), h(Badge, { s: ticket.ticket_state }), h(Badge, { s: ticket.priority || 'normal' })),
          h('div', { className: 'cc-mut', style: { marginTop: '4px' } }, (ticket.category || '') + ' · ' + (ticket.channel || 'chat') + (ticket.customer_name ? ' · ' + ticket.customer_name : '')),
          h('div', { className: 'cc-panel', style: { padding: '18px', marginTop: '16px' } },
            h('div', { className: 'cc-chat', style: { maxHeight: 'none' } }, msgs.length ? msgs.map(function (m) {
              return h('div', { key: m.uuid, className: 'cc-msg ' + (m.sender === 'customer' ? 'user' : (m.sender === 'agent' ? 'agent' : 'ai')) },
                h('div', { className: 'cc-msg-from' }, (m.sender_name || m.sender) + ' · ' + fmtTime(m.created_at)), m.body);
            }) : h('div', { className: 'cc-mut' }, 'No messages yet.'))),
          h('div', { className: 'cc-panel', style: { padding: '16px', marginTop: '14px' } },
            agent ? h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', gap: '8px' } },
              h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', disabled: suggesting, onClick: doSuggest }, suggesting ? 'Drafting…' : '✦ Suggest reply'),
              (c.macros || []).length ? h('select', { className: 'cc-input', style: { maxWidth: '200px', padding: '7px 10px' }, value: '', onChange: function (e) { if (e.target.value) setReply(e.target.value); } },
                h('option', { value: '' }, 'Insert macro…'), (c.macros || []).map(function (m) { return h('option', { key: m.uuid, value: m.body }, m.title); })) : null) : null,
            h('textarea', { className: 'cc-input', placeholder: agent ? 'Write a reply to the customer…' : 'Add a reply…', value: reply, onChange: function (e) { setReply(e.target.value); } }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
              h('button', { className: 'cc-btn cc-btn-brand cc-btn-sm', disabled: busy, onClick: sendReply }, busy ? 'Sending…' : 'Send reply')))),
        h('div', { className: 'cc-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Details'),
          [['Status', ticket.ticket_state], ['Priority', ticket.priority || 'normal'], ['Channel', ticket.channel || 'chat'], ['Topic', ticket.category || '—'], ['Assignee', ticket.assignee || 'Unassigned'], ['Opened', fmtDate(ticket.created_at)], ['CSAT', ticket.csat ? ('★ ' + ticket.csat + '/5') : '—']].map(function (r, i) {
            return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: i ? '1px solid var(--line)' : 0, fontSize: '13.5px' } }, h('span', { className: 'cc-mut' }, r[0]), h('b', { style: { textTransform: 'capitalize' } }, String(r[1])));
          }),
          agent ? h('div', { style: { marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' } },
            ticket.ticket_state !== 'resolved' && ticket.ticket_state !== 'closed' ? h('button', { className: 'cc-btn cc-btn-ink cc-btn-sm', onClick: function () { setState('resolved'); } }, 'Resolve') : null,
            ticket.ticket_state !== 'closed' ? h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { setState('closed'); } }, 'Close') : h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { setState('open'); } }, 'Reopen'))
            : (ticket.ticket_state === 'resolved' ? h('div', { style: { marginTop: '14px' } }, h('div', { className: 'cc-mut', style: { marginBottom: '6px' } }, 'Rate this resolution:'),
              h('div', null, [1, 2, 3, 4, 5].map(function (n) { return h('button', { key: n, className: 'cc-btn cc-btn-ghost cc-btn-sm', style: { padding: '6px 9px' }, onClick: function () { client.updateObject('ticket', ticket.uuid, { csat: n, ticket_state: 'closed' }, ticket).then(function () { showToast('Thanks for rating!', 'success'); load(); }); } }, '★' + n); }))) : null))));
  }

  // ── Agent console ───────────────────────────────────────────────────────────
  function CStat(p) { return h('div', { className: 'cc-stat' }, h('div', { className: 'cc-stat-n', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'cc-stat-l' }, p.l)); }

  function AgentHome(props) {
    var c = props.ctx; var [tickets, setTickets] = React.useState([]);
    React.useEffect(function () { client.getObjects('ticket').then(function (r) { setTickets(arr(r)); }).catch(function () {}); }, []);
    var open = tickets.filter(function (t) { return t.ticket_state === 'open'; }).length;
    var urgent = tickets.filter(function (t) { return ['high', 'urgent'].indexOf(t.priority) >= 0 && ['open', 'pending'].indexOf(t.ticket_state) >= 0; }).length;
    var aiHandled = tickets.filter(function (t) { return t.ai_handled; }).length;
    var rated = tickets.filter(function (t) { return t.csat; });
    var avgCsat = rated.length ? (rated.reduce(function (s, t) { return s + t.csat; }, 0) / rated.length) : 0;
    var deflect = tickets.length ? Math.round((aiHandled / tickets.length) * 100) : 0;
    return h('div', null,
      h('div', { className: 'cc-stats' },
        h(CStat, { n: open, l: 'Open tickets', color: '#2563eb' }),
        h(CStat, { n: urgent, l: 'Need attention', color: '#dc2626' }),
        h(CStat, { n: deflect + '%', l: 'AI deflection', color: 'var(--brand)' }),
        h(CStat, { n: avgCsat ? ('★ ' + avgCsat.toFixed(1)) : '—', l: 'Avg CSAT', color: '#15803d' })),
      h('div', { className: 'cc-panel', style: { marginTop: '18px', padding: '20px' } },
        h('div', { className: 'jak', style: { fontWeight: 700, fontSize: '17px', marginBottom: '6px' } }, 'Welcome back, ' + ((client.userInfo || {}).fullName || 'Agent').split(' ')[0]),
        h('div', { className: 'cc-mut' }, 'The AI concierge deflected ' + deflect + '% of conversations. Work the queue, use ✦ Suggest reply for a head-start, and keep CSAT high.')),
      h('div', { style: { marginTop: '18px' } }, h(AgentQueue, { ctx: c, embedded: true })));
  }

  function AgentQueue(props) {
    var c = props.ctx; var [tickets, setTickets] = React.useState(null);
    var [fState, setFState] = React.useState('open'); var [fPrio, setFPrio] = React.useState('all');
    React.useEffect(function () { client.getObjects('ticket').then(function (r) { setTickets(arr(r).sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); })); }).catch(function () { setTickets([]); }); }, []);
    var list = (tickets || []).filter(function (t) { return (fState === 'all' || t.ticket_state === fState) && (fPrio === 'all' || t.priority === fPrio); });
    return h('div', null,
      !props.embedded ? h('h2', { className: 'cc-h2', style: { marginBottom: '12px' } }, 'Ticket queue') : h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Queue'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' } },
        h('select', { className: 'cc-input', style: { maxWidth: '160px', padding: '8px 10px' }, value: fState, onChange: function (e) { setFState(e.target.value); } }, h('option', { value: 'all' }, 'All states'), TICKET_STATES.map(function (s) { return h('option', { key: s, value: s }, s); })),
        h('select', { className: 'cc-input', style: { maxWidth: '160px', padding: '8px 10px' }, value: fPrio, onChange: function (e) { setFPrio(e.target.value); } }, h('option', { value: 'all' }, 'All priorities'), PRIORITIES.map(function (s) { return h('option', { key: s, value: s }, s); }))),
      h('div', { className: 'cc-panel' },
        tickets === null ? h('div', { className: 'cc-row cc-mut' }, 'Loading…')
          : list.length ? list.map(function (t) {
            return h('div', { key: t.uuid, className: 'cc-row', style: { cursor: 'pointer' }, onClick: function () { c.navigate('#/agent/ticket/' + t.uuid); } },
              h('div', { className: 'cc-grow' }, h('div', { style: { fontWeight: 700 } }, t.subject, t.ai_handled ? h('span', { className: 'cc-chip', style: { marginLeft: '8px' } }, '✦ AI') : null), h('div', { className: 'cc-mut' }, (t.customer_name || '') + ' · ' + (t.category || '') + ' · ' + (t.channel || 'chat') + ' · ' + fmtDate(t.created_at))),
              h(Badge, { s: t.priority || 'normal' }), h(Badge, { s: t.ticket_state }));
          }) : h('div', { className: 'cc-empty' }, 'No tickets match.')));
  }

  var ARTICLE_FIELDS = [
    { k: 'title', label: 'Title', req: true }, { k: 'category', label: 'Category', type: 'select', opts: KB_CATEGORIES },
    { k: 'summary', label: 'Summary', type: 'textarea' }, { k: 'body', label: 'Body', type: 'textarea', req: true },
    { k: 'tags', label: 'Tags (comma-separated)' }, { k: 'read_minutes', label: 'Read minutes', type: 'number' },
    { k: 'featured', label: 'Featured', type: 'check' }
  ];
  var MACRO_FIELDS = [
    { k: 'title', label: 'Title', req: true }, { k: 'category', label: 'Category', type: 'select', opts: KB_CATEGORIES },
    { k: 'body', label: 'Body', type: 'textarea', req: true }
  ];

  function EditModal(props) {
    var fields = props.fields, init = props.initial || {};
    var [form, setForm] = React.useState(function () { var f = {}; fields.forEach(function (fd) { var v = init[fd.k]; f[fd.k] = (v == null) ? '' : v; }); return f; });
    var [busy, setBusy] = React.useState(false);
    function set(k, v) { setForm(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var data = {}; fields.forEach(function (fd) { var v = form[fd.k];
        if (fd.type === 'check') { data[fd.k] = !!v; return; } if (v === '' || v == null) return; if (fd.type === 'number') v = Number(v); data[fd.k] = v; });
      props.beforeSave && props.beforeSave(data); setBusy(true);
      var p = init.uuid ? client.updateObject(props.schema, init.uuid, data, init) : client.createObject(props.schema, data);
      p.then(function () { showToast('Saved', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Save failed: ' + ((e && e.message) || 'error'), 'error'); });
    }
    return h('div', { className: 'cc-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'cc-sheet', style: { padding: '26px' } },
        h('button', { className: 'cc-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'cc-h2', style: { fontSize: '21px' } }, init.uuid ? props.editTitle : props.newTitle),
        fields.map(function (fd) {
          var val = form[fd.k] == null ? '' : form[fd.k]; var input;
          if (fd.type === 'textarea') input = h('textarea', { className: 'cc-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          else if (fd.type === 'select') input = h('select', { className: 'cc-input', value: val, onChange: function (e) { set(fd.k, e.target.value); } }, h('option', { value: '' }, '—'), fd.opts.map(function (o) { return h('option', { key: o, value: o }, o); }));
          else if (fd.type === 'check') input = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: !!val, onChange: function (e) { set(fd.k, e.target.checked); } }), h('span', { className: 'cc-mut' }, 'Yes'));
          else input = h('input', { className: 'cc-input', type: fd.type === 'number' ? 'number' : 'text', value: val, onChange: function (e) { set(fd.k, e.target.value); } });
          return h(Field, { key: fd.k, label: fd.label, req: fd.req, children: input });
        }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'cc-btn cc-btn-brand', disabled: busy, onClick: save }, busy ? 'Saving…' : 'Save'),
          h('button', { className: 'cc-btn cc-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  function AgentKB(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var list = (c.articles || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    function del(a) { if (!window.confirm('Delete "' + a.title + '"?')) return; client.deleteObject('article', a.uuid, a).then(function () { showToast('Deleted', 'success'); c.reload(); }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || 'error'), 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' articles'),
        h('button', { className: 'cc-btn cc-btn-brand cc-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New article')),
      h('div', { className: 'cc-panel' }, list.map(function (a) {
        return h('div', { key: a.uuid, className: 'cc-row' },
          h('div', { className: 'cc-grow' }, h('div', { style: { fontWeight: 600 } }, a.title, a.featured ? h('span', { className: 'cc-chip', style: { marginLeft: '8px' } }, 'Featured') : null), h('div', { className: 'cc-mut' }, a.category + ' · ' + (a.helpful_count || 0) + ' helpful')),
          h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { setEdit(a); } }, 'Edit'),
          h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { del(a); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'article', fields: ARTICLE_FIELDS, initial: edit, newTitle: 'New article', editTitle: 'Edit article',
        beforeSave: function (d) { d.display_name = d.title || 'Article'; d.description = d.summary || d.title || ''; if (d.read_minutes == null) d.read_minutes = 3; }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function AgentMacros(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    function del(m) { if (!window.confirm('Delete "' + m.title + '"?')) return; client.deleteObject('macro', m.uuid, m).then(function () { showToast('Deleted', 'success'); c.reloadMacros(); }).catch(function () {}); }
    var list = (c.macros || []);
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, list.length + ' macros'),
        h('button', { className: 'cc-btn cc-btn-brand cc-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New macro')),
      h('div', { className: 'cc-panel' }, list.map(function (m) {
        return h('div', { key: m.uuid, className: 'cc-row' }, h('div', { className: 'cc-grow' }, h('div', { style: { fontWeight: 600 } }, m.title, h('span', { className: 'cc-chip', style: { marginLeft: '8px' } }, m.category || '')), h('div', { className: 'cc-mut', style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '520px' } }, m.body)),
          h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { setEdit(m); } }, 'Edit'),
          h('button', { className: 'cc-btn cc-btn-ghost cc-btn-sm', onClick: function () { del(m); } }, '✕'));
      })),
      edit !== null ? h(EditModal, { schema: 'macro', fields: MACRO_FIELDS, initial: edit, newTitle: 'New macro', editTitle: 'Edit macro',
        beforeSave: function (d) { d.display_name = d.title || 'Macro'; d.description = d.category || ''; }, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reloadMacros(); } }) : null);
  }

  function AgentConsole(props) {
    var c = props.ctx; var seg = props.seg;
    var sub = seg[1] || 'home';
    if (sub === 'ticket') return h('div', { className: 'cc' }, h(AgentBar, { ctx: c, tab: 'queue' }), h('div', { className: 'cc-wrap', style: { padding: '20px 24px 60px' } }, h(TicketThread, { ctx: c, uuid: seg[2], agent: true })));
    var tabs = [['home', 'Dashboard'], ['queue', 'Queue'], ['kb', 'Knowledge base'], ['macros', 'Macros']];
    return h('div', { className: 'cc' }, h(AgentBar, { ctx: c, tab: sub, tabs: tabs }),
      h('div', { className: 'cc-wrap', style: { padding: '24px 24px 64px' } },
        sub === 'home' ? h(AgentHome, { ctx: c }) : sub === 'queue' ? h(AgentQueue, { ctx: c }) : sub === 'kb' ? h(AgentKB, { ctx: c }) : h(AgentMacros, { ctx: c })));
  }
  function AgentBar(props) {
    var c = props.ctx; var tabs = props.tabs || [['home', 'Dashboard'], ['queue', 'Queue'], ['kb', 'Knowledge base'], ['macros', 'Macros']];
    return h('div', { style: { background: 'linear-gradient(100deg,#2b1769,#6d28d9)' } }, h('div', { className: 'cc-wrap', style: { display: 'flex', alignItems: 'center', height: '60px', gap: '14px' } },
      h('div', { className: 'cc-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.2)' } }, '◆'), 'Concierge', h('span', { style: { opacity: .7 } }, 'Agent')),
      h('div', { className: 'cc-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('cc-tab', props.tab === t[0] && 'on'), onClick: function () { c.navigate('#/agent' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
      h('button', { className: 'cc-ibtn', style: { marginLeft: 'auto', color: '#e9defc' }, onClick: function () { c.navigate('#/'); } }, 'Help center ↗')));
  }

  function Footer() { return h('footer', { className: 'cc-foot' }, h('div', { className: 'cc-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'Concierge AI'), ' — AI-first customer support.'), h('div', null, 'Help center · Status · API'))); }

  // ── Root ──────────────────────────────────────────────────────────────────────
  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [articles, setArticles] = React.useState(null);
    var [macros, setMacros] = React.useState([]);
    var [query, setQuery] = React.useState('');
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() { client.getObjects('article').then(function (r) { setArticles(arr(r)); }).catch(function () { setArticles([]); }); }
    function reloadMacros() { client.getObjects('macro').then(function (r) { setMacros(arr(r)); }).catch(function () { setMacros([]); }); }
    React.useEffect(reload, []);
    React.useEffect(function () { if (authed) { reload(); reloadMacros(); } }, [authed]);

    var ctx = {
      route: route, navigate: navigate, authed: authed, setAuthed: setAuthed,
      isAdmin: authed && isStaff(), openLogin: function () { setShowLogin(true); },
      articles: articles, macros: macros, reload: reload, reloadMacros: reloadMacros
    };
    var seg = route.replace(/^#\//, '').split('/');
    var top = seg[0] || '';

    if (top === 'agent' && ctx.isAdmin) return h(ErrorBoundary, null, h(AgentConsole, { ctx: ctx, seg: seg }),
      showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'category') page = h(CategoryPage, { ctx: ctx, cat: seg[1] });
    else if (top === 'article') page = h(ArticlePage, { ctx: ctx, uuid: seg[1] });
    else if (top === 'tickets' && seg[1] === 'new') page = h(NewTicket, { ctx: ctx });
    else if (top === 'tickets') page = h(MyTickets, { ctx: ctx });
    else if (top === 'ticket') page = h(TicketThread, { ctx: ctx, uuid: seg[1], agent: false });
    else page = h(HelpCenter, { ctx: ctx, query: query, onSearch: setQuery });

    return h(ErrorBoundary, null, h('div', { className: 'cc' },
      h(TopBar, { ctx: ctx }), page, h(Footer, null),
      (top !== 'tickets' && top !== 'ticket') ? h('button', { className: 'cc-fab', onClick: function () { navigate('#/'); setTimeout(function () { window.scrollTo(0, 600); }, 60); } }, '✦ Ask AI') : null,
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
