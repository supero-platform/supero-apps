// ui/app.js — Amplify social media campaign platform (custom UI).
// Globals (React, ReactDOM, client, services, showToast, resolveImageUrl, ErrorBoundary,
// formatCurrency) come from the Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var PLATFORMS = ['Instagram', 'LinkedIn', 'X', 'Facebook', 'TikTok', 'YouTube', 'WhatsApp', 'Google Ads'];
  // Channels Amplify can PUBLISH to for real (wired to live Supero integrations): Instagram/LinkedIn/X
  // post text+media; YouTube uploads a video file (youtube.upload_video). The rest are scheduled &
  // tracked only — Facebook/TikTok have no Supero integration yet; WhatsApp/Google Ads aren't feed-post.
  var REAL_CHANNELS = ['Instagram', 'LinkedIn', 'X', 'YouTube'];
  var PLAT_ICON = { Instagram: '📸', LinkedIn: '💼', X: '𝕏', Facebook: '👍', TikTok: '🎵', YouTube: '▶️', WhatsApp: '💬', 'Google Ads': '🔍' };
  var PLAT_COLOR = { Instagram: '#e1306c', LinkedIn: '#0a66c2', X: '#111827', Facebook: '#1877f2', TikTok: '#000000', YouTube: '#ff0000', WhatsApp: '#25d366', 'Google Ads': '#4285f4' };
  var OBJECTIVES = ['Awareness', 'Engagement', 'Traffic', 'Leads', 'Sales', 'App Installs'];
  var CAMPAIGN_STATES = ['draft', 'scheduled', 'active', 'paused', 'completed'];
  var POST_STATES = ['draft', 'scheduled', 'published', 'failed'];
  var HERO = 'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=2000&h=1200';

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return n === 0 ? 'Free' : formatCurrency(n); } catch (e) { return '$' + n.toLocaleString(); } }
  function dollars(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n.toLocaleString(); } }
  function k(n) { n = Number(n) || 0; return n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(Math.round(n)); }
  function imgUrl(x) { try { return resolveImageUrl(x) || ''; } catch (e) { return ''; } }
  function fmtDT(s) { if (!s) return ''; try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function statusColor(s) {
    return { trial: '#7c3aed', active: '#16a34a', past_due: '#d97706', churned: '#94a3b8',
      connected: '#16a34a', disconnected: '#94a3b8', error: '#dc2626',
      draft: '#94a3b8', scheduled: '#7c3aed', paused: '#d97706', completed: '#0891b2',
      published: '#16a34a', failed: '#dc2626' }[s] || '#7c3aed';
  }
  function isStaff() { try { return client.isAdmin() || client.canWrite('workspace') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; } }
  function aiText(res) {
    var t = res && (res.output && (res.output.text || res.output.completion || res.output.content || res.output) || res.text || res.completion || res.content || res);
    if (typeof t !== 'string') { try { t = JSON.stringify(t); } catch (e) { t = ''; } } return t || '';
  }

  function injectChrome() {
    if (document.getElementById('ap-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'ap-chrome';
    st.textContent = [
      ':root{--ink:#160a2e;--ink2:#4b3a66;--paper:#fff;--bg:#f6f3fc;--purple:#7c3aed;--purple2:#9333ea;--purple-d:#6d28d9;--pink:#ec4899;--orange:#f97316;--green:#16a34a;--red:#dc2626;--cyan:#0891b2;--line:#e9e2f5;--muted:#6b647e}',
      '.ap-grad{background:linear-gradient(120deg,#7c3aed 0%,#c026d3 48%,#f97316 100%)}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.ap{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.ap *{box-sizing:border-box}.ap a{color:inherit;text-decoration:none}',
      '.ap-wrap{max-width:1200px;margin:0 auto;padding:0 24px}',
      '.sora{font-family:Sora,Inter,sans-serif}',
      '.num{font-variant-numeric:tabular-nums}',
      '.ap-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}',
      '.ap-top-in{display:flex;align-items:center;gap:18px;height:66px}',
      '.ap-logo{display:flex;align-items:center;gap:10px;cursor:pointer;font-family:Sora;font-weight:800;font-size:21px;color:var(--ink);letter-spacing:-.02em}',
      '.ap-logo .dot{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--purple),var(--pink),var(--orange));display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;box-shadow:0 6px 18px -6px rgba(124,58,237,.6)}',
      '.ap-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.ap-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}.ap-ibtn:hover{background:var(--bg)}',
      '.ap-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:11px;font-weight:600;font-size:14px;padding:11px 20px;font-family:Inter;transition:.15s}',
      '.ap-btn:disabled{opacity:.55;cursor:default}',
      '.ap-btn-grad{color:#fff;background:linear-gradient(120deg,var(--purple),var(--pink) 70%,var(--orange))}.ap-btn-grad:hover:not(:disabled){filter:brightness(1.07)}',
      '.ap-btn-purple{background:var(--purple);color:#fff}.ap-btn-purple:hover:not(:disabled){background:var(--purple-d)}',
      '.ap-btn-ink{background:var(--ink);color:#fff}.ap-btn-ink:hover:not(:disabled){background:#0c0419}',
      '.ap-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.ap-btn-ghost:hover{border-color:var(--purple)}',
      '.ap-btn-sm{padding:7px 13px;font-size:13px}',
      '.ap-hero{position:relative;overflow:hidden;color:#fff;background:linear-gradient(125deg,#2a0d52,#7c3aed 45%,#c026d3 78%,#f97316)}',
      '.ap-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.18;mix-blend-mode:luminosity}',
      '.ap-hero-in{position:relative;padding:90px 0 100px}',
      '.ap-hero h1{font-family:Sora;font-weight:800;font-size:clamp(34px,5.2vw,62px);line-height:1.03;margin:14px 0 0;max-width:760px;letter-spacing:-.02em}',
      '.ap-hero p{font-size:19px;color:#f3e8ff;max-width:560px;margin:18px 0 0;line-height:1.55}',
      '.ap-pill{display:inline-block;background:rgba(255,255,255,.18);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:30px}',
      '.ap-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:30px}',
      '.ap-chip-h{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:30px;padding:8px 14px;font-size:13px;font-weight:600}',
      '.ap-sec{padding:56px 0}',
      '.ap-h2{font-family:Sora;font-weight:700;font-size:28px;margin:0;letter-spacing:-.01em}',
      '.ap-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--purple)}',
      '.ap-feat{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}',
      '.ap-fcard{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:24px;transition:.16s}',
      '.ap-fcard:hover{box-shadow:0 18px 44px -30px rgba(124,58,237,.5);transform:translateY(-3px)}',
      '.ap-fcard .ic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:linear-gradient(135deg,#f3e8ff,#fce7f3)}',
      '.ap-fcard h3{font-family:Sora;font-weight:700;font-size:17px;margin:14px 0 0}',
      '.ap-fcard p{color:var(--ink2);font-size:14px;margin:6px 0 0;line-height:1.55}',
      '.ap-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:26px}',
      '.ap-plan{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:24px;display:flex;flex-direction:column}',
      '.ap-plan.pop{border:2px solid var(--purple);box-shadow:0 20px 48px -28px rgba(124,58,237,.55);position:relative}',
      '.ap-plan h3{font-family:Sora;font-weight:700;font-size:18px;margin:0}',
      '.ap-plan .price{font-family:Sora;font-weight:800;font-size:36px;margin:10px 0 0}',
      '.ap-plan ul{list-style:none;padding:0;margin:14px 0 0;flex:1}.ap-plan li{font-size:13.5px;color:var(--ink2);padding:5px 0;display:flex;gap:8px}',
      '.ap-popbadge{position:absolute;top:-11px;left:24px;background:linear-gradient(120deg,var(--purple),var(--pink));color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 11px;border-radius:20px}',
      '.ap-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.ap-stat{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:18px;position:relative;overflow:hidden}',
      '.ap-stat:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--purple),var(--pink))}',
      '.ap-stat-n{font-family:Sora;font-weight:800;font-size:27px;line-height:1}',
      '.ap-stat-l{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.ap-panel{background:var(--paper);border:1px solid var(--line);border-radius:18px}',
      '.ap-row{display:flex;align-items:center;gap:14px;padding:14px 18px;border-top:1px solid var(--line)}',
      '.ap-row:first-child{border-top:0}.ap-grow{flex:1;min-width:0}.ap-mut{color:var(--muted);font-size:13px}',
      '.ap-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff;white-space:nowrap}',
      '.ap-bars{display:flex;align-items:flex-end;gap:12px;height:180px;padding:10px 4px 0}',
      '.ap-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}',
      '.ap-bar .b{width:100%;max-width:54px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--pink),var(--purple));transition:.3s}',
      '.ap-bar .v{font-weight:700;font-size:12px;margin-bottom:6px}.ap-bar .l{font-size:11px;color:var(--muted);margin-top:8px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      '.ap-field{display:block;margin-top:14px}.ap-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.ap-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:11px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.ap-input:focus{outline:none;border-color:var(--purple)}textarea.ap-input{min-height:90px;resize:vertical;line-height:1.5}',
      '.ap-modal{position:fixed;inset:0;z-index:200;background:rgba(22,10,46,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.ap-sheet{background:var(--paper);border-radius:20px;width:100%;max-width:600px;max-height:92vh;overflow:auto;position:relative}',
      '.ap-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:24px;cursor:pointer;color:var(--muted);z-index:2}',
      '.ap-2col{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start}',
      '.ap-3col{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}',
      '.ap-chip{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:#fff;border-radius:20px;padding:3px 10px}',
      '.ap-tag{display:inline-block;font-size:11px;font-weight:600;color:var(--purple-d);background:#f3e8ff;border-radius:20px;padding:3px 10px}',
      '.ap-tabs{display:flex;gap:4px;flex-wrap:wrap}.ap-tab{background:none;border:0;color:#e9d5ff;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.ap-tab.on{background:rgba(255,255,255,.2);color:#fff}',
      '.ap-foot{background:var(--ink);color:#b7a9d4;padding:36px 0;font-size:13px;margin-top:50px}.ap-foot b{color:#fff;font-family:Sora}',
      '.ap-empty{text-align:center;padding:60px 20px;color:var(--muted)}',
      '.ap-pcard{background:var(--paper);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.16s;display:flex;flex-direction:column}',
      '.ap-pcard:hover{box-shadow:0 18px 44px -30px rgba(124,58,237,.5);transform:translateY(-2px)}',
      '.ap-pcard-img{height:180px;overflow:hidden;background:#f0e9fb;position:relative}.ap-pcard-img img{width:100%;height:100%;object-fit:cover}',
      '.ap-pcard-plat{position:absolute;top:10px;left:10px}',
      '.ap-pcard-b{padding:14px 16px 16px;flex:1;display:flex;flex-direction:column}',
      '.ap-metrics{display:flex;gap:14px;margin-top:10px;flex-wrap:wrap}',
      '.ap-metric .mn{font-family:Sora;font-weight:700;font-size:15px}.ap-metric .ml{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}',
      '.ap-chcard{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px}',
      '.ap-chav{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex:none}',
      '.ap-chat{display:flex;flex-direction:column;gap:12px;max-height:300px;overflow:auto;padding:6px 2px}',
      '.ap-msg{max-width:88%;padding:11px 14px;border-radius:14px;font-size:13.5px;line-height:1.55;white-space:pre-wrap}',
      '.ap-msg.user{align-self:flex-end;background:var(--purple);color:#fff;border-bottom-right-radius:4px}',
      '.ap-msg.ai{align-self:flex-start;background:#f3e8ff;color:var(--ink);border-bottom-left-radius:4px}',
      '.ap-msg-from{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.7;margin-bottom:3px;color:var(--purple-d)}',
      '.ap-typing{display:inline-flex;gap:4px}.ap-typing i{width:7px;height:7px;border-radius:50%;background:var(--purple);opacity:.5;animation:apb 1s infinite}',
      '.ap-typing i:nth-child(2){animation-delay:.2s}.ap-typing i:nth-child(3){animation-delay:.4s}',
      '@keyframes apb{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}',
      '.ap-draft{background:linear-gradient(135deg,#faf5ff,#fdf2f8);border:1px solid #f0d9ff;border-radius:12px;padding:13px 15px;margin-top:10px;cursor:pointer;transition:.14s}',
      '.ap-draft:hover{border-color:var(--purple)}',
      '@media(max-width:980px){.ap-feat,.ap-3col{grid-template-columns:1fr}.ap-plans{grid-template-columns:repeat(2,1fr)}.ap-stats{grid-template-columns:repeat(2,1fr)}.ap-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'ap-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '⚡'), 'Amplify'); }
  function Field(p) { return h('label', { className: 'ap-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'ap-badge', style: { background: statusColor(p.s) } }, (p.s || '').replace('_', ' ')); }
  function PlatChip(p) { return h('span', { className: 'ap-chip', style: { background: PLAT_COLOR[p.plat] || '#7c3aed' } }, h('span', null, PLAT_ICON[p.plat] || '🌐'), p.plat); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'marketer@amplify.app');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) {
      e.preventDefault(); setBusy(true); setErr('');
      var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { setBusy(false); props.onDone && props.onDone(); })
        .catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); });
    }
    return h('div', { className: 'ap-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'ap-sheet', style: { maxWidth: '420px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'ap-x', onClick: props.onClose }, '×') : null,
        h(Logo, null),
        h('h2', { className: 'ap-h2', style: { marginTop: '16px' } }, props.title || 'Sign in'),
        h('p', { className: 'ap-mut' }, 'Customers get the campaign workspace; operators get the Amplify console.'),
        h(Field, { label: 'Email', children: h('input', { className: 'ap-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'ap-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: 'var(--red)', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'ap-btn ap-btn-grad', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'ap-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — marketer@amplify.app · operator@amplify.app · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'ap-top' }, h('div', { className: 'ap-wrap ap-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'ap-act' },
        h('button', { className: 'ap-ibtn', onClick: function () { c.navigate('#/pricing'); } }, 'Pricing'),
        c.isAdmin ? h('button', { className: 'ap-ibtn', onClick: function () { c.navigate('#/console'); } }, '🛠 Operator') : null,
        (c.authed && !c.isAdmin) ? h('button', { className: 'ap-ibtn', onClick: function () { c.navigate('#/app'); } }, '📊 My workspace') : null,
        c.authed ? h('button', { className: 'ap-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'ap-ibtn', onClick: c.openLogin }, 'Sign in'),
        h('button', { className: 'ap-btn ap-btn-grad ap-btn-sm', onClick: function () { c.authed ? c.navigate(c.isAdmin ? '#/console' : '#/app') : c.openLogin(); } }, 'Start free'))));
  }

  // ── Public marketing landing ─────────────────────────────────────────────────
  function Home(props) {
    var c = props.ctx;
    return h('div', null,
      h('section', { className: 'ap-hero' }, h('img', { src: HERO, alt: '' }),
        h('div', { className: 'ap-wrap ap-hero-in' },
          h('span', { className: 'ap-pill' }, 'One platform · every channel'),
          h('h1', null, 'Launch campaigns everywhere, from one place.'),
          h('p', null, 'Compose with AI, schedule, and track performance across every channel — with live publishing to Instagram, LinkedIn and X, and scheduling + analytics for the rest.'),
          h('div', { style: { display: 'flex', gap: '12px', marginTop: '30px', flexWrap: 'wrap' } },
            h('button', { className: 'ap-btn ap-btn-grad', onClick: function () { c.authed ? c.navigate(c.isAdmin ? '#/console' : '#/app') : c.openLogin(); } }, 'Start free →'),
            h('button', { className: 'ap-btn ap-btn-ghost', style: { background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.navigate('#/pricing'); } }, 'See pricing')),
          h('div', { className: 'ap-chips' }, PLATFORMS.map(function (p) { return h('span', { key: p, className: 'ap-chip-h' }, h('span', null, PLAT_ICON[p]), p); })))),
      h('section', { className: 'ap-sec' }, h('div', { className: 'ap-wrap' },
        h('div', { style: { textAlign: 'center' } }, h('div', { className: 'ap-eyebrow' }, 'Your whole content engine'),
          h('h2', { className: 'ap-h2', style: { marginTop: '6px', fontSize: '32px' } }, 'Everything to run social, in one workspace')),
        h('div', { className: 'ap-feat' },
          [['🎨', 'AI content studio', 'Describe your product and let AI draft platform-specific captions — tuned for each network, ready to schedule.'],
           ['📅', 'Schedule & publish', 'Plan a campaign calendar, go live on Instagram, LinkedIn and X, and schedule & track every other channel. Posts move draft → scheduled → published.'],
           ['📈', 'Unified analytics', 'Reach, clicks, engagement and spend across every channel and campaign — in one live dashboard.'],
           ['🔗', 'Connect your channels', 'Live posting on Instagram, LinkedIn and X today — Facebook, TikTok, YouTube, WhatsApp and Google Ads are scheduled & tracked as more channels go live.'],
           ['🚀', 'Campaign workflows', 'Launch a campaign and the team is notified by email and Slack — publishing runs as a reliable saga.'],
           ['👥', 'Built for teams & agencies', 'Multiple workspaces, approvals and white-label reports — from solo creator to full agency.']].map(function (f, i) {
            return h('div', { key: i, className: 'ap-fcard' }, h('div', { className: 'ic' }, f[0]), h('h3', null, f[1]), h('p', null, f[2]));
          })))),
      h('section', { style: { paddingBottom: '20px' } }, h('div', { className: 'ap-wrap' },
        h('div', { className: 'ap-panel ap-grad', style: { padding: '40px', color: '#fff', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', borderRadius: '22px' } },
          h('div', { style: { flex: 1, minWidth: '260px' } },
            h('div', { className: 'sora', style: { fontWeight: 800, fontSize: '26px' } }, 'Used by Supero to market Supero.'),
            h('div', { style: { marginTop: '8px', color: '#fbeafe', maxWidth: '540px' } }, 'Our own team runs the “Launch: AI App Builder” campaign across LinkedIn, X and YouTube on Amplify — same product you get.')),
          h('button', { className: 'ap-btn', style: { background: '#fff', color: 'var(--purple-d)' }, onClick: function () { c.authed ? c.navigate(c.isAdmin ? '#/console' : '#/app') : c.openLogin(); } }, 'Try the workspace')))));
  }

  function PlanCard(props) {
    var p = props.p;
    return h('div', { className: cls('ap-plan', p.popular && 'pop') },
      p.popular ? h('span', { className: 'ap-popbadge' }, 'Most popular') : null,
      h('h3', null, p.name),
      h('div', { className: 'price num' }, money(p.price_monthly), Number(p.price_monthly) > 0 ? h('span', { style: { fontSize: '14px', fontWeight: 500, color: 'var(--muted)' } }, '/mo') : null),
      h('div', { className: 'ap-mut', style: { marginTop: '2px' } }, (p.included_channels || 0) + ' channels · ' + (p.included_posts ? (p.included_posts >= 5000 ? 'unlimited' : p.included_posts) + ' posts/mo' : '')),
      h('ul', null, (p.features || '').split('·').map(function (f, i) { return f.trim() ? h('li', { key: i }, h('span', { style: { color: 'var(--green)' } }, '✓'), f.trim()) : null; })),
      h('button', { className: cls('ap-btn', p.popular ? 'ap-btn-grad' : 'ap-btn-ghost'), style: { marginTop: '16px' }, onClick: function () { props.ctx.authed ? props.ctx.navigate(props.ctx.isAdmin ? '#/console' : '#/app') : props.ctx.openLogin(); } }, Number(p.price_monthly) > 0 ? 'Start free trial' : 'Get started'));
  }

  function Pricing(props) {
    var c = props.ctx; var plans = (c.plans || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'ap-wrap ap-sec' },
      h('div', { style: { textAlign: 'center' } }, h('div', { className: 'ap-eyebrow' }, 'Pricing'), h('h2', { className: 'ap-h2', style: { marginTop: '6px', fontSize: '34px' } }, 'Start free. Scale when you grow.'),
        h('p', { className: 'ap-mut', style: { maxWidth: '520px', margin: '8px auto 0' } }, 'Every plan includes the content studio and scheduling. Add channels, posts and seats as your reach grows.')),
      c.plans === null ? h('div', { className: 'ap-empty' }, 'Loading…') : h('div', { className: 'ap-plans' }, plans.map(function (p) { return h(PlanCard, { key: p.uuid, p: p, ctx: c }); })));
  }

  // ── AI caption generator ──────────────────────────────────────────────────────
  function platformGuide(plat) {
    return {
      Instagram: 'Instagram: visual, warm, emoji-rich, 1-2 short lines + 3-5 hashtags.',
      LinkedIn: 'LinkedIn: professional, value-first, a hook line + a short insight, minimal emoji, 1 CTA.',
      X: 'X/Twitter: punchy, under 280 chars, a strong hook, 1-2 hashtags.',
      Facebook: 'Facebook: friendly and conversational, a clear offer and CTA.',
      TikTok: 'TikTok: trend-aware, playful, a hook + 2-3 trending hashtags.',
      YouTube: 'YouTube: a click-worthy title-style line + a one-sentence description.',
      WhatsApp: 'WhatsApp: short, direct, personal broadcast message with a clear next step.',
      'Google Ads': 'Google Ads: concise headline + description, benefit-led, a strong CTA.'
    }[plat] || 'Clear, on-brand social caption with a CTA.';
  }
  function fallbackCaption(brief, plat) {
    var b = (brief || 'your product').trim().replace(/\.$/, '');
    var t = {
      Instagram: '✨ ' + b + ' — and we can\'t stop talking about it. Tap to see why. 👀\n\n#launch #newdrop #musttry',
      LinkedIn: b + '.\n\nWe built this because teams kept asking for it. Here\'s what changes for you — and why it matters. Try it today 👇',
      X: '🚀 ' + b + '. Built for people who move fast. Try it now 👉 #ship #launch',
      Facebook: 'Big news: ' + b + '! 🎉 We\'d love for you to be among the first. Tap to learn more and get started today.',
      TikTok: 'POV: you just found ' + b + ' 🤯 wait for it… #fyp #viral #musthave',
      YouTube: b + ' — full walkthrough\n\nIn this video we show exactly how it works, step by step. Watch to the end for a surprise.',
      WhatsApp: 'Hi! 👋 Quick one — ' + b + ' is here. Reply YES and we\'ll send you the details.',
      'Google Ads': b + ' | Get Started Today\nFast, simple and built for results. Start free — no credit card required.'
    };
    return t[plat] || b + ' — learn more today.';
  }
  function generateCaption(brief, plat) {
    var prompt = 'You are a senior social media copywriter. Write ONE ready-to-post caption for ' + plat +
      ' promoting: "' + brief + '". ' + platformGuide(plat) +
      ' Return ONLY the caption text, no preamble, no quotes.';
    return Promise.resolve().then(function () {
      if (!services || !services.ai || !services.ai.complete) throw new Error('no-ai');
      return services.ai.complete({ prompt: prompt });
    }).then(function (res) { var t = aiText(res); if (!t) throw new Error('empty'); return { text: t.trim(), ai: true }; })
      .catch(function () { return { text: fallbackCaption(brief, plat), ai: false }; });
  }

  function AIComposer(props) {
    var c = props.ctx;
    var [brief, setBrief] = React.useState('');
    var [plats, setPlats] = React.useState(['Instagram', 'LinkedIn', 'X']);
    var [busy, setBusy] = React.useState(false);
    var [drafts, setDrafts] = React.useState([]);
    function togglePlat(p) { setPlats(function (cur) { return cur.indexOf(p) >= 0 ? cur.filter(function (x) { return x !== p; }) : cur.concat([p]); }); }
    function gen() {
      if (!brief.trim()) { showToast('Describe your campaign or product first', 'warning'); return; }
      if (!plats.length) { showToast('Pick at least one platform', 'warning'); return; }
      setBusy(true); setDrafts([]);
      Promise.all(plats.map(function (p) { return generateCaption(brief, p).then(function (r) { return { platform: p, text: r.text, ai: r.ai }; }); }))
        .then(function (res) { setDrafts(res); setBusy(false); var anyAi = res.some(function (r) { return r.ai; }); showToast(anyAi ? 'Drafts generated' : 'Drafts generated (offline templates)', 'success'); })
        .catch(function () { setBusy(false); showToast('Could not generate', 'error'); });
    }
    return h('div', { className: 'ap-panel', style: { padding: '20px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        h('span', { className: 'ap-eyebrow' }, '✦ AI content studio'),
        h('span', { className: 'ap-mut', style: { marginLeft: 'auto', fontSize: '12px' } }, 'Platform-specific captions')),
      h('div', { className: 'ap-mut', style: { margin: '6px 0 4px' } }, 'Describe your campaign or product and pick channels — AI drafts a caption for each.'),
      h('textarea', { className: 'ap-input', placeholder: 'e.g. our new AI app builder that turns a prompt into a deployed full-stack app', value: brief, onChange: function (e) { setBrief(e.target.value); } }),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' } },
        PLATFORMS.map(function (p) { var live = REAL_CHANNELS.indexOf(p) >= 0; return h('button', { key: p, type: 'button', title: live ? 'Live posting — publishes for real once this channel is connected' : 'Tracked only — scheduled & measured, not auto-posted', className: cls('ap-btn ap-btn-sm', plats.indexOf(p) >= 0 ? 'ap-btn-purple' : 'ap-btn-ghost'), onClick: function () { togglePlat(p); } }, PLAT_ICON[p] + ' ' + p, h('span', { style: { marginLeft: '5px', fontSize: '8px', verticalAlign: 'middle', color: live ? '#16a34a' : '#9ca3af' } }, '●')); })),
      h('div', { className: 'ap-mut', style: { marginTop: '6px', fontSize: '11px' } }, h('span', { style: { color: '#16a34a', fontWeight: 600 } }, '● Live posting'), ' Instagram · LinkedIn · X  ·  ', h('span', { style: { color: '#9ca3af', fontWeight: 600 } }, '● tracked only'), ' for the rest (scheduled & measured — more live channels coming).'),
      h('button', { className: 'ap-btn ap-btn-grad', style: { marginTop: '12px' }, disabled: busy, onClick: gen }, busy ? 'Generating…' : '✨ Generate captions'),
      busy ? h('div', { style: { marginTop: '14px' } }, h('span', { className: 'ap-typing' }, h('i'), h('i'), h('i'))) : null,
      drafts.map(function (d, i) {
        return h('div', { key: i, className: 'ap-draft', onClick: function () { props.onUse && props.onUse(d); }, title: 'Click to use in a new post' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } }, h(PlatChip, { plat: d.platform }), h('span', { className: 'ap-mut', style: { fontSize: '11px', marginLeft: 'auto' } }, d.ai ? 'AI' : 'template'), h('span', { className: 'ap-tag' }, 'Use →')),
          h('div', { style: { fontSize: '13.5px', lineHeight: 1.5, whiteSpace: 'pre-wrap' } }, d.text));
      }));
  }

  // ── Customer workspace ─────────────────────────────────────────────────────────
  function CStat(p) { return h('div', { className: 'ap-stat' }, h('div', { className: 'ap-stat-n num', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'ap-stat-l' }, p.l)); }

  function Bars(props) {
    var data = props.data || []; var maxV = Math.max.apply(null, data.map(function (b) { return b.value; }).concat([1]));
    return h('div', { className: 'ap-bars' }, data.map(function (b) {
      return h('div', { key: b.label, className: 'ap-bar' }, h('div', { className: 'v num' }, props.fmt ? props.fmt(b.value) : k(b.value)),
        h('div', { className: 'b', style: { height: Math.max(4, (b.value / maxV) * 130) + 'px', background: b.color || '' } }), h('div', { className: 'l', title: b.label }, b.label));
    }));
  }

  function WorkspaceDash(props) {
    var c = props.ctx;
    var posts = c.posts || []; var channels = c.channels || []; var campaigns = c.campaigns || [];
    var pub = posts.filter(function (p) { return p.post_state === 'published'; });
    var reach = pub.reduce(function (s, p) { return s + (p.reach || 0); }, 0);
    var clicks = pub.reduce(function (s, p) { return s + (p.clicks || 0); }, 0);
    var eng = pub.reduce(function (s, p) { return s + (p.engagement || 0); }, 0);
    var spend = campaigns.reduce(function (s, p) { return s + (p.spend || 0); }, 0);
    var reachByPlat = PLATFORMS.map(function (pl) { return { label: pl, value: pub.filter(function (p) { return p.platform === pl; }).reduce(function (s, p) { return s + (p.reach || 0); }, 0), color: 'linear-gradient(180deg,' + (PLAT_COLOR[pl] || '#7c3aed') + ',#7c3aed)' }; }).filter(function (b) { return b.value > 0; });
    var topPosts = pub.slice().sort(function (a, b) { return (b.reach || 0) - (a.reach || 0); }).slice(0, 4);
    var engByCamp = campaigns.map(function (cm) { return { label: (cm.name || '').slice(0, 12), value: pub.filter(function (p) { return p.campaign_name === cm.name; }).reduce(function (s, p) { return s + (p.engagement || 0); }, 0) }; }).filter(function (b) { return b.value > 0; }).slice(0, 6);
    return h('div', null,
      h('div', { className: 'ap-stats' },
        h(CStat, { n: k(reach), l: 'Total reach' }),
        h(CStat, { n: k(clicks), l: 'Clicks', color: 'var(--pink)' }),
        h(CStat, { n: k(eng), l: 'Engagement', color: 'var(--purple)' }),
        h(CStat, { n: dollars(spend), l: 'Campaign spend', color: 'var(--orange)' })),
      h('div', { style: { fontWeight: 700, margin: '20px 0 10px' } }, 'Connected channels'),
      h('div', { className: 'ap-3col' }, channels.length ? channels.slice(0, 6).map(function (ch) {
        return h('div', { key: ch.uuid, className: 'ap-chcard' },
          h('div', { className: 'ap-chav', style: { background: PLAT_COLOR[ch.platform] || '#7c3aed' } }, PLAT_ICON[ch.platform] || '🌐'),
          h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, ch.handle || ch.platform), h('div', { className: 'ap-mut' }, k(ch.followers) + ' followers')),
          h(Badge, { s: ch.channel_state }));
      }) : h('div', { className: 'ap-mut' }, 'No channels connected yet.')),
      h('div', { className: 'ap-2col', style: { marginTop: '20px' } },
        h('div', { className: 'ap-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Reach by channel'),
          reachByPlat.length ? h(Bars, { data: reachByPlat }) : h('div', { className: 'ap-empty' }, 'Publish posts to see reach.')),
        h('div', { className: 'ap-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '8px' } }, 'Top posts'),
          topPosts.length ? topPosts.map(function (p) {
            return h('div', { key: p.uuid, style: { display: 'flex', gap: '10px', padding: '8px 0', borderTop: '1px solid var(--line)', alignItems: 'center' } },
              h('span', null, PLAT_ICON[p.platform] || '🌐'),
              h('div', { className: 'ap-grow', style: { minWidth: 0 } }, h('div', { style: { fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.caption || p.display_name)),
              h('b', { className: 'num', style: { color: 'var(--purple)' } }, k(p.reach)));
          }) : h('div', { className: 'ap-mut' }, 'No published posts yet.'))),
      engByCamp.length ? h('div', { className: 'ap-panel', style: { padding: '20px', marginTop: '20px' } },
        h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Engagement by campaign'),
        h(Bars, { data: engByCamp })) : null);
  }

  function Channels(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var channels = c.channels || [];
    function connect() { setEdit({}); }
    function toggle(ch) {
      var ns = ch.channel_state === 'connected' ? 'disconnected' : 'connected';
      client.updateObject('channel', ch.uuid, { channel_state: ns }, ch).then(function () { showToast(ns === 'connected' ? 'Channel reconnected' : 'Channel disconnected', 'success'); c.reload(); }).catch(function () { showToast('Failed', 'error'); });
    }
    function save(form) {
      var rec = { platform: form.platform, handle: form.handle, workspace_name: c.myWorkspaceName, channel_state: 'connected', followers: Number(form.followers) || 0, owner_username: (client.userInfo || {}).email, display_name: form.platform + ' · ' + form.handle, description: c.myWorkspaceName };
      client.createObject('channel', rec).then(function () { showToast('Channel connected (simulated)', 'success'); setEdit(null); c.reload(); }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || ''), 'error'); });
    }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '12px' } }, h('div', { style: { fontWeight: 700 } }, channels.length + ' channels'),
        h('button', { className: 'ap-btn ap-btn-grad ap-btn-sm', style: { marginLeft: 'auto' }, onClick: connect }, '+ Connect channel')),
      h('div', { className: 'ap-3col' }, channels.length ? channels.map(function (ch) {
        return h('div', { key: ch.uuid, className: 'ap-chcard' },
          h('div', { className: 'ap-chav', style: { background: PLAT_COLOR[ch.platform] || '#7c3aed' } }, PLAT_ICON[ch.platform] || '🌐'),
          h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, ch.handle || ch.platform), h('div', { className: 'ap-mut' }, ch.platform + ' · ' + k(ch.followers) + ' followers'), h('div', { style: { marginTop: '4px' } }, h(Badge, { s: ch.channel_state }))),
          h('button', { className: 'ap-btn ap-btn-ghost ap-btn-sm', onClick: function () { toggle(ch); } }, ch.channel_state === 'connected' ? 'Disconnect' : 'Connect'));
      }) : h('div', { className: 'ap-empty' }, 'No channels yet — connect your first.')),
      edit !== null ? h(ConnectModal, { onClose: function () { setEdit(null); }, onSave: save }) : null);
  }

  function ConnectModal(props) {
    var [form, setForm] = React.useState({ platform: 'Instagram', handle: '', followers: '' });
    function set(k2, v) { setForm(function (p) { var n = Object.assign({}, p); n[k2] = v; return n; }); }
    return h('div', { className: 'ap-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'ap-sheet', style: { padding: '26px', maxWidth: '440px' } }, h('button', { className: 'ap-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'ap-h2', style: { fontSize: '21px' } }, 'Connect a channel'),
        h('p', { className: 'ap-mut', style: { marginTop: '2px' } }, 'Authorization is simulated in this demo.'),
        h(Field, { label: 'Platform', children: h('select', { className: 'ap-input', value: form.platform, onChange: function (e) { set('platform', e.target.value); } }, PLATFORMS.map(function (p) { return h('option', { key: p, value: p }, p); })) }),
        h(Field, { label: 'Handle / account', req: true, children: h('input', { className: 'ap-input', placeholder: '@yourbrand', value: form.handle, onChange: function (e) { set('handle', e.target.value); } }) }),
        h(Field, { label: 'Followers', children: h('input', { className: 'ap-input', type: 'number', value: form.followers, onChange: function (e) { set('followers', e.target.value); } }) }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'ap-btn ap-btn-grad', onClick: function () { if (!form.handle.trim()) { showToast('Enter a handle', 'warning'); return; } props.onSave(form); } }, 'Connect'),
          h('button', { className: 'ap-btn ap-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  function Campaigns(props) {
    var c = props.ctx; var [open, setOpen] = React.useState(null); var [edit, setEdit] = React.useState(null); var [f, setF] = React.useState('all');
    var campaigns = (c.campaigns || []).slice().sort(function (a, b) { return (b.start_date || '').localeCompare(a.start_date || ''); });
    var list = campaigns.filter(function (x) { return f === 'all' || x.campaign_state === f; });
    function advance(cm) {
      var order = ['draft', 'scheduled', 'active', 'paused', 'completed'];
      var next = { draft: 'scheduled', scheduled: 'active', active: 'paused', paused: 'active', completed: 'completed' }[cm.campaign_state] || 'active';
      if (cm.campaign_state === 'completed') { showToast('Campaign already completed', 'info'); return; }
      client.updateObject('campaign', cm.uuid, { campaign_state: next }, cm).then(function () { showToast('Campaign → ' + next, 'success'); c.reload(); setOpen(Object.assign({}, cm, { campaign_state: next })); }).catch(function () { showToast('Failed', 'error'); });
    }
    function complete(cm) { client.updateObject('campaign', cm.uuid, { campaign_state: 'completed' }, cm).then(function () { showToast('Campaign completed', 'success'); c.reload(); setOpen(Object.assign({}, cm, { campaign_state: 'completed' })); }).catch(function () { showToast('Failed', 'error'); }); }
    var campPosts = open ? (c.posts || []).filter(function (p) { return p.campaign_name === open.name; }) : [];
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' } },
        h('button', { className: cls('ap-btn ap-btn-sm', f === 'all' ? 'ap-btn-purple' : 'ap-btn-ghost'), onClick: function () { setF('all'); } }, 'All'),
        CAMPAIGN_STATES.map(function (s) { return h('button', { key: s, className: cls('ap-btn ap-btn-sm', f === s ? 'ap-btn-purple' : 'ap-btn-ghost'), onClick: function () { setF(s); } }, s); }),
        h('button', { className: 'ap-btn ap-btn-grad ap-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ New campaign')),
      h('div', { className: 'ap-2col' },
        h('div', { className: 'ap-panel' }, list.length ? list.map(function (cm) {
          return h('div', { key: cm.uuid, className: 'ap-row', style: { cursor: 'pointer', background: open && open.uuid === cm.uuid ? '#faf5ff' : '' }, onClick: function () { setOpen(cm); } },
            h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, cm.name), h('div', { className: 'ap-mut' }, cm.objective + ' · ' + dollars(cm.spend) + ' / ' + dollars(cm.budget))),
            h(Badge, { s: cm.campaign_state }));
        }) : h('div', { className: 'ap-empty' }, 'No campaigns.')),
        h('div', { className: 'ap-panel', style: { padding: '20px', position: 'sticky', top: '84px' } },
          open ? h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { className: 'sora', style: { fontWeight: 700, fontSize: '17px' } }, open.name), h(Badge, { s: open.campaign_state })),
            h('div', { className: 'ap-mut', style: { marginTop: '4px' } }, open.objective + ' · ' + fmtDate(open.start_date) + ' → ' + fmtDate(open.end_date)),
            h('div', { style: { display: 'flex', gap: '18px', marginTop: '12px' } },
              h('div', null, h('div', { className: 'sora', style: { fontWeight: 700, fontSize: '16px' } }, dollars(open.budget)), h('div', { className: 'ap-mut', style: { fontSize: '11px' } }, 'Budget')),
              h('div', null, h('div', { className: 'sora', style: { fontWeight: 700, fontSize: '16px', color: 'var(--orange)' } }, dollars(open.spend)), h('div', { className: 'ap-mut', style: { fontSize: '11px' } }, 'Spend'))),
            open.channels ? h('div', { style: { marginTop: '10px' } }, (open.channels || '').split(',').map(function (ch, i) { var t = ch.trim(); return t ? h('span', { key: i, className: 'ap-tag', style: { marginRight: '5px' } }, t) : null; })) : null,
            h('div', { style: { fontWeight: 700, margin: '14px 0 8px' } }, 'Posts (' + campPosts.length + ')'),
            campPosts.length ? campPosts.map(function (p) {
              return h('div', { key: p.uuid, style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line)' } },
                h('span', null, PLAT_ICON[p.platform] || '🌐'),
                h('div', { className: 'ap-grow', style: { minWidth: 0 } }, h('div', { style: { fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.caption || p.display_name)),
                h(Badge, { s: p.post_state }));
            }) : h('div', { className: 'ap-mut', style: { fontSize: '13px' } }, 'No posts yet — add one in the Composer.'),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' } },
              open.campaign_state !== 'completed' ? h('button', { className: 'ap-btn ap-btn-purple ap-btn-sm', onClick: function () { advance(open); } }, open.campaign_state === 'paused' ? 'Resume' : 'Advance state') : null,
              open.campaign_state !== 'completed' ? h('button', { className: 'ap-btn ap-btn-ghost ap-btn-sm', onClick: function () { complete(open); } }, 'Mark completed') : null))
            : h('div', { className: 'ap-empty' }, 'Select a campaign.'))),
      edit !== null ? h(CampaignModal, { ctx: c, onClose: function () { setEdit(null); }, onSaved: function () { setEdit(null); c.reload(); } }) : null);
  }

  function CampaignModal(props) {
    var c = props.ctx;
    var [form, setForm] = React.useState({ name: '', objective: 'Awareness', budget: '', start_date: '', end_date: '', channels: '' });
    var [busy, setBusy] = React.useState(false);
    function set(k2, v) { setForm(function (p) { var n = Object.assign({}, p); n[k2] = v; return n; }); }
    function save() {
      if (!form.name.trim()) { showToast('Name your campaign', 'warning'); return; }
      setBusy(true);
      var rec = { name: form.name, workspace_name: c.myWorkspaceName, objective: form.objective, campaign_state: 'draft', budget: Number(form.budget) || 0, spend: 0, start_date: form.start_date || undefined, end_date: form.end_date || undefined, channels: form.channels, owner_username: (client.userInfo || {}).email, display_name: form.name, description: c.myWorkspaceName + ' · ' + form.objective };
      Object.keys(rec).forEach(function (kk) { if (rec[kk] === undefined) delete rec[kk]; });
      client.createObject('campaign', rec).then(function () { setBusy(false); showToast('Campaign created — team notified', 'success'); props.onSaved(); }).catch(function (e) { setBusy(false); showToast('Failed: ' + ((e && e.message) || ''), 'error'); });
    }
    return h('div', { className: 'ap-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'ap-sheet', style: { padding: '26px' } }, h('button', { className: 'ap-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'ap-h2', style: { fontSize: '21px' } }, 'New campaign'),
        h(Field, { label: 'Campaign name', req: true, children: h('input', { className: 'ap-input', value: form.name, onChange: function (e) { set('name', e.target.value); } }) }),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Objective', children: h('select', { className: 'ap-input', value: form.objective, onChange: function (e) { set('objective', e.target.value); } }, OBJECTIVES.map(function (o) { return h('option', { key: o, value: o }, o); })) }),
          h(Field, { label: 'Budget ($)', children: h('input', { className: 'ap-input', type: 'number', value: form.budget, onChange: function (e) { set('budget', e.target.value); } }) })),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Start date', children: h('input', { className: 'ap-input', type: 'date', value: form.start_date, onChange: function (e) { set('start_date', e.target.value); } }) }),
          h(Field, { label: 'End date', children: h('input', { className: 'ap-input', type: 'date', value: form.end_date, onChange: function (e) { set('end_date', e.target.value); } }) })),
        h(Field, { label: 'Channels', children: h('input', { className: 'ap-input', placeholder: 'LinkedIn, X, Instagram', value: form.channels, onChange: function (e) { set('channels', e.target.value); } }) }),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'ap-btn ap-btn-grad', disabled: busy, onClick: save }, busy ? 'Creating…' : 'Create campaign'),
          h('button', { className: 'ap-btn ap-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  function Composer(props) {
    var c = props.ctx;
    var prefill = props.prefill || null;
    var [form, setForm] = React.useState({ caption: (prefill && prefill.text) || '', platform: (prefill && prefill.platform) || 'Instagram', campaign_name: '', schedule: '', video_url: '' });
    var [busy, setBusy] = React.useState(false);
    function set(k2, v) { setForm(function (p) { var n = Object.assign({}, p); n[k2] = v; return n; }); }
    var campaigns = c.campaigns || [];
    function create(state) {
      if (!form.caption.trim()) { showToast('Write a caption first', 'warning'); return; }
      if (form.platform === 'YouTube' && !form.video_url.trim()) { showToast('YouTube posts need a public video URL — add one below', 'warning'); return; }
      setBusy(true);
      var rec = { caption: form.caption, platform: form.platform, campaign_name: form.campaign_name, post_state: state, reach: 0, clicks: 0, engagement: 0, likes: 0, owner_username: (client.userInfo || {}).email, display_name: form.caption.slice(0, 48), description: form.platform + ' · ' + (form.campaign_name || 'Unassigned') };
      if (form.video_url.trim()) rec.video_url = form.video_url.trim();
      if (form.schedule) rec.scheduled_at = new Date(form.schedule).toISOString();
      else if (state === 'scheduled') rec.scheduled_at = new Date(Date.now() + 86400000).toISOString();
      client.createObject('post', rec).then(function () { setBusy(false); showToast(state === 'scheduled' ? 'Post scheduled' : 'Draft saved', 'success'); setForm({ caption: '', platform: form.platform, campaign_name: form.campaign_name, schedule: '', video_url: '' }); c.reload(); }).catch(function (e) { setBusy(false); showToast('Failed: ' + ((e && e.message) || ''), 'error'); });
    }
    function useDraft(d) { set('caption', d.text); set('platform', d.platform); window.scrollTo(0, 0); showToast('Draft loaded into composer', 'info'); }
    return h('div', { className: 'ap-2col' },
      h('div', { className: 'ap-panel', style: { padding: '22px' } },
        h('div', { className: 'sora', style: { fontWeight: 700, fontSize: '18px', marginBottom: '4px' } }, 'Compose a post'),
        h('div', { className: 'ap-mut', style: { marginBottom: '6px' } }, 'Write or paste a caption, choose a channel + campaign, then schedule.'),
        h(Field, { label: 'Caption', req: true, children: h('textarea', { className: 'ap-input', style: { minHeight: '130px' }, placeholder: 'What do you want to say?', value: form.caption, onChange: function (e) { set('caption', e.target.value); } }) }),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Platform', children: h('select', { className: 'ap-input', value: form.platform, onChange: function (e) { set('platform', e.target.value); } }, PLATFORMS.map(function (p) { return h('option', { key: p, value: p }, p); })) }),
          h(Field, { label: 'Campaign', children: h('select', { className: 'ap-input', value: form.campaign_name, onChange: function (e) { set('campaign_name', e.target.value); } }, h('option', { value: '' }, 'Unassigned'), campaigns.map(function (cm) { return h('option', { key: cm.uuid, value: cm.name }, cm.name); })) })),
        h(Field, { label: 'Schedule for (optional)', children: h('input', { className: 'ap-input', type: 'datetime-local', value: form.schedule, onChange: function (e) { set('schedule', e.target.value); } }) }),
        form.platform === 'YouTube' ? h(Field, { label: 'Public video URL (published to YouTube)', req: true, children: h('div', null,
          h('input', { className: 'ap-input', type: 'url', placeholder: 'https://…/your-video.mp4', value: form.video_url, onChange: function (e) { set('video_url', e.target.value); } }),
          h('div', { className: 'ap-mut', style: { fontSize: '11.5px', marginTop: '4px' } }, 'A publicly-reachable video URL — YouTube fetches it via youtube.upload_video. (Direct in-app upload needs video support in the file service — coming soon.)')) }) : null,
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '16px' } },
          h('button', { className: 'ap-btn ap-btn-grad', disabled: busy, onClick: function () { create('scheduled'); } }, busy ? 'Saving…' : '📅 Schedule post'),
          h('button', { className: 'ap-btn ap-btn-ghost', disabled: busy, onClick: function () { create('draft'); } }, 'Save as draft'))),
      h(AIComposer, { ctx: c, onUse: useDraft }));
  }

  function Posts(props) {
    var c = props.ctx; var [f, setF] = React.useState('all');
    var posts = (c.posts || []).slice().sort(function (a, b) { return (b.scheduled_at || b.published_at || '').localeCompare(a.scheduled_at || a.published_at || ''); });
    var list = posts.filter(function (p) { return f === 'all' || p.post_state === f; });
    // Map a post's platform to its REAL integration call. Returns a Promise (the live post)
    // or null when this channel has no feed-post integration (Facebook/TikTok/… → simulated).
    function realPost(p) {
      var cap = p.caption || p.display_name || '';
      var img = imgUrl(p.image);
      if (p.platform === 'Instagram' && services && services.instagram && services.instagram.publish) {
        if (!img) throw new Error('Instagram needs an image');
        return services.instagram.publish({ mediaType: 'IMAGE', mediaUrl: img, caption: cap });
      }
      if (p.platform === 'X' && services && services.twitter && services.twitter.tweet) {
        return services.twitter.tweet({ text: cap });
      }
      if (p.platform === 'YouTube') {
        var vurl = (p.video_url || '').trim() || (p.video && (p.video.url || (typeof p.video === 'string' ? p.video : ''))) || '';
        if (!vurl) throw new Error('YouTube needs a public video URL — add one in the composer');
        // No services.youtube.uploadVideo wrapper in the published SDK yet → call the integration op
        // directly (same shape _svc builds), so this works without an SDK rebuild.
        var pu = (client && client.projectUuid) || '';
        try { if (!pu) pu = (window.__SUPERO_CONFIG && window.__SUPERO_CONFIG.project_uuid) || ''; } catch (e2) {}
        try { if (!pu) pu = localStorage.getItem('supero_project_uuid') || ''; } catch (e3) {}
        return client.request('POST', '/api/v1/services/execute', { service_id: 'youtube', operation: 'upload_video', domain: client.domain, project_uuid: pu, input: { source_url: vurl, title: (cap || 'Untitled').slice(0, 100), description: cap, privacy_status: 'public' } });
      }
      if (p.platform === 'LinkedIn' && services && services.linkedin && services.linkedin.post) {
        return services.linkedin.post({ text: cap });
      }
      return null;
    }
    function publish(p) {
      var reach = 8000 + Math.floor(Math.random() * 60000), clicks = Math.floor(reach * (0.02 + Math.random() * 0.04)), eng = Math.floor(reach * (0.04 + Math.random() * 0.08)), likes = Math.floor(eng * (0.6 + Math.random() * 0.3));
      // Mark published + record whether it REALLY posted, then best-effort run the notify saga.
      function done(delivery, providerId, err) {
        var data = { post_state: 'published', published_at: new Date().toISOString(), reach: reach, clicks: clicks, engagement: eng, likes: likes, delivery: delivery, provider_post_id: providerId || '', publish_error: err || '' };
        client.updateObject('post', p.uuid, data, p).then(function () {
          if (services && services.workflow && services.workflow.run) { services.workflow.run('post_publish', { post_uuid: p.uuid, owner_email: (client.userInfo || {}).email, platform: p.platform, campaign_name: p.campaign_name, reach: reach, clicks: clicks, engagement: eng, likes: likes }).catch(function () {}); }
          showToast(delivery === 'live' ? ('Posted to ' + p.platform + ' for real ✓') : ('Published (simulated — connect ' + p.platform + ' to post live) 🚀'), delivery === 'live' ? 'success' : 'info');
          c.reload();
        }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || ''), 'error'); });
      }
      // 1) Attempt the real post; ANY error / missing integration → graceful simulated fallback.
      var attempt;
      try { attempt = realPost(p); } catch (e) { done('simulated', '', (e && e.message) || 'could not post'); return; }
      if (!attempt) { done('simulated', '', ''); return; }
      Promise.resolve(attempt).then(function (res) {
        var id = res && (res.id || res.provider_post_id || res.post_id || (res.data && res.data.id));
        var ok = res && (id || res.ok === true || res.success === true || res.status === 'published' || res.status === 'success' || res.status === 'ok');
        if (ok) done('live', id || '', '');
        else done('simulated', '', (res && (res.error || res.message)) || 'no confirmation from provider');
      }).catch(function (e) { done('simulated', '', (e && e.message) || 'channel not connected'); });
    }
    function schedule(p) { client.updateObject('post', p.uuid, { post_state: 'scheduled', scheduled_at: p.scheduled_at || new Date(Date.now() + 86400000).toISOString() }, p).then(function () { showToast('Scheduled', 'success'); c.reload(); }).catch(function () { showToast('Failed', 'error'); }); }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' } },
        h('button', { className: cls('ap-btn ap-btn-sm', f === 'all' ? 'ap-btn-purple' : 'ap-btn-ghost'), onClick: function () { setF('all'); } }, 'All'),
        POST_STATES.map(function (s) { return h('button', { key: s, className: cls('ap-btn ap-btn-sm', f === s ? 'ap-btn-purple' : 'ap-btn-ghost'), onClick: function () { setF(s); } }, s); }),
        h('button', { className: 'ap-btn ap-btn-grad ap-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { c.navigate('#/app/composer'); } }, '+ New post')),
      list.length ? h('div', { className: 'ap-3col' }, list.map(function (p) {
        return h('div', { key: p.uuid, className: 'ap-pcard' },
          h('div', { className: 'ap-pcard-img' }, h('img', { src: imgUrl(p.image), alt: '', onError: function (e) { e.target.style.visibility = 'hidden'; } }),
            h('div', { className: 'ap-pcard-plat' }, h(PlatChip, { plat: p.platform }))),
          h('div', { className: 'ap-pcard-b' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } }, h(Badge, { s: p.post_state }), p.campaign_name ? h('span', { className: 'ap-mut', style: { fontSize: '11.5px' } }, p.campaign_name) : null, (p.post_state === 'published' && p.delivery) ? h('span', { style: { marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: p.delivery === 'live' ? '#16a34a' : '#9ca3af' }, title: p.publish_error || '' }, p.delivery === 'live' ? '● Live' : '● Simulated') : null),
            h('div', { style: { fontSize: '13.5px', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, p.caption || p.display_name),
            p.post_state === 'published' ? h('div', { className: 'ap-metrics' },
              h('div', { className: 'ap-metric' }, h('div', { className: 'mn num' }, k(p.reach)), h('div', { className: 'ml' }, 'reach')),
              h('div', { className: 'ap-metric' }, h('div', { className: 'mn num' }, k(p.clicks)), h('div', { className: 'ml' }, 'clicks')),
              h('div', { className: 'ap-metric' }, h('div', { className: 'mn num' }, k(p.engagement)), h('div', { className: 'ml' }, 'eng')),
              h('div', { className: 'ap-metric' }, h('div', { className: 'mn num' }, k(p.likes)), h('div', { className: 'ml' }, 'likes')))
              : h('div', { className: 'ap-mut', style: { marginTop: '10px', fontSize: '12px' } }, p.scheduled_at ? '📅 ' + fmtDT(p.scheduled_at) : 'Not scheduled'),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } },
              p.post_state === 'scheduled' ? h('button', { className: 'ap-btn ap-btn-grad ap-btn-sm', onClick: function () { publish(p); } }, '🚀 Publish now') : null,
              p.post_state === 'draft' ? h('button', { className: 'ap-btn ap-btn-purple ap-btn-sm', onClick: function () { schedule(p); } }, 'Schedule') : null,
              p.post_state === 'draft' ? h('button', { className: 'ap-btn ap-btn-ghost ap-btn-sm', onClick: function () { publish(p); } }, 'Publish') : null,
              p.post_state === 'failed' ? h('button', { className: 'ap-btn ap-btn-ghost ap-btn-sm', onClick: function () { publish(p); } }, 'Retry') : null)));
      })) : h('div', { className: 'ap-empty' }, 'No posts yet. Open the Composer to create one.'));
  }

  function Analytics(props) {
    var c = props.ctx;
    var posts = (c.posts || []).filter(function (p) { return p.post_state === 'published'; });
    var campaigns = c.campaigns || []; var channels = c.channels || [];
    var byCampaign = campaigns.map(function (cm) {
      var cp = posts.filter(function (p) { return p.campaign_name === cm.name; });
      return { cm: cm, reach: cp.reduce(function (s, p) { return s + (p.reach || 0); }, 0), clicks: cp.reduce(function (s, p) { return s + (p.clicks || 0); }, 0), eng: cp.reduce(function (s, p) { return s + (p.engagement || 0); }, 0), posts: cp.length };
    }).sort(function (a, b) { return b.reach - a.reach; });
    var byChannel = PLATFORMS.map(function (pl) {
      var cp = posts.filter(function (p) { return p.platform === pl; });
      return { plat: pl, reach: cp.reduce(function (s, p) { return s + (p.reach || 0); }, 0), eng: cp.reduce(function (s, p) { return s + (p.engagement || 0); }, 0), posts: cp.length, followers: channels.filter(function (ch) { return ch.platform === pl; }).reduce(function (s, ch) { return s + (ch.followers || 0); }, 0) };
    }).filter(function (x) { return x.posts > 0 || x.followers > 0; }).sort(function (a, b) { return b.reach - a.reach; });
    return h('div', null,
      h('div', { className: 'ap-panel', style: { padding: '20px' } },
        h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Reach by campaign'),
        h(Bars, { data: byCampaign.filter(function (x) { return x.reach > 0; }).slice(0, 6).map(function (x) { return { label: (x.cm.name || '').slice(0, 12), value: x.reach }; }) })),
      h('div', { className: 'ap-2col', style: { marginTop: '20px' } },
        h('div', null, h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Campaign performance'),
          h('div', { className: 'ap-panel' }, byCampaign.length ? byCampaign.map(function (x) {
            return h('div', { key: x.cm.uuid, className: 'ap-row' },
              h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, x.cm.name), h('div', { className: 'ap-mut' }, x.cm.objective + ' · ' + x.posts + ' posts · ' + dollars(x.cm.spend) + ' spend')),
              h('div', { style: { textAlign: 'right' } }, h('div', { className: 'num', style: { fontWeight: 700, color: 'var(--purple)' } }, k(x.reach)), h('div', { className: 'ap-mut', style: { fontSize: '11px' } }, k(x.eng) + ' eng')));
          }) : h('div', { className: 'ap-empty' }, 'No data yet.'))),
        h('div', null, h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Channel performance'),
          h('div', { className: 'ap-panel' }, byChannel.length ? byChannel.map(function (x) {
            return h('div', { key: x.plat, className: 'ap-row' },
              h('div', { className: 'ap-chav', style: { width: '34px', height: '34px', fontSize: '16px', background: PLAT_COLOR[x.plat] } }, PLAT_ICON[x.plat]),
              h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, x.plat), h('div', { className: 'ap-mut' }, k(x.followers) + ' followers · ' + x.posts + ' posts')),
              h('div', { className: 'num', style: { fontWeight: 700, color: 'var(--pink)' } }, k(x.reach)));
          }) : h('div', { className: 'ap-empty' }, 'No data yet.')))));
  }

  function CustomerApp(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var tabs = [['home', '📊 Dashboard'], ['campaigns', '🎯 Campaigns'], ['composer', '✍️ Composer'], ['posts', '🗂 Posts'], ['channels', '🔗 Channels'], ['analytics', '📈 Analytics']];
    var loading = c.posts === null || c.campaigns === null || c.channels === null;
    return h('div', { className: 'ap' },
      h('div', { className: 'ap-grad' }, h('div', { className: 'ap-wrap', style: { display: 'flex', alignItems: 'center', minHeight: '58px', gap: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'ap-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.22)', boxShadow: 'none' } }, '⚡'), 'Amplify'),
        h('div', { className: 'ap-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('ap-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/app' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'ap-ibtn', style: { marginLeft: 'auto', color: '#f3e8ff' }, onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout'))),
      h('div', { className: 'ap-wrap', style: { padding: '24px 24px 64px' } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' } },
          h('h2', { className: 'ap-h2' }, c.myWorkspaceName || 'My workspace'),
          h('span', { className: 'ap-mut' }, 'Welcome back, ' + ((client.userInfo || {}).fullName || 'marketer'))),
        loading ? h('div', { className: 'ap-empty' }, 'Loading your workspace…')
          : sub === 'campaigns' ? h(Campaigns, { ctx: c })
            : sub === 'composer' ? h(Composer, { ctx: c })
              : sub === 'posts' ? h(Posts, { ctx: c })
                : sub === 'channels' ? h(Channels, { ctx: c })
                  : sub === 'analytics' ? h(Analytics, { ctx: c })
                    : h(WorkspaceDash, { ctx: c })));
  }

  // ── Operator console (tenant_admin) ─────────────────────────────────────────
  function OStat(p) { return h('div', { className: 'ap-stat' }, h('div', { className: 'ap-stat-n num', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'ap-stat-l' }, p.l)); }

  function OpBilling(props) {
    var [ws, setWs] = React.useState(null);
    React.useEffect(function () { client.getObjects('workspace').then(function (r) { setWs(arr(r)); }).catch(function () { setWs([]); }); }, []);
    var list = ws || [];
    var active = list.filter(function (x) { return x.workspace_state === 'active' || x.workspace_state === 'past_due'; });
    var mrr = active.reduce(function (s, x) { return s + (x.mrr || 0); }, 0);
    var churned = list.filter(function (x) { return x.workspace_state === 'churned'; }).length;
    var churnPct = list.length ? Math.round((churned / list.length) * 100) : 0;
    var byTier = ['Free', 'Starter', 'Growth', 'Agency'].map(function (t) { return { label: t, value: active.filter(function (x) { return x.plan_name === t; }).reduce(function (s, x) { return s + (x.mrr || 0); }, 0) }; });
    return h('div', null,
      h('div', { className: 'ap-stats' },
        h(OStat, { n: dollars(mrr), l: 'MRR' }),
        h(OStat, { n: dollars(mrr * 12), l: 'ARR', color: 'var(--purple)' }),
        h(OStat, { n: active.length, l: 'Active workspaces', color: 'var(--pink)' }),
        h(OStat, { n: churnPct + '%', l: 'Logo churn', color: churnPct > 15 ? 'var(--red)' : 'var(--ink)' })),
      h('div', { className: 'ap-panel', style: { padding: '20px', marginTop: '18px' } },
        h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'MRR by plan'),
        h(Bars, { data: byTier, fmt: function (v) { return '$' + k(v); } })));
  }

  function OpWorkspaces(props) {
    var [ws, setWs] = React.useState(null);
    React.useEffect(function () { client.getObjects('workspace').then(function (r) { setWs(arr(r).sort(function (a, b) { return (b.mrr || 0) - (a.mrr || 0); })); }).catch(function () { setWs([]); }); }, []);
    return h('div', null, h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'All workspaces'),
      h('div', { className: 'ap-panel' }, ws === null ? h('div', { className: 'ap-row ap-mut' }, 'Loading…')
        : ws.length ? ws.map(function (w) {
          return h('div', { key: w.uuid, className: 'ap-row' },
            h('div', { className: 'ap-chav', style: { background: 'linear-gradient(135deg,var(--purple),var(--pink))' } }, (w.name || '?').charAt(0)),
            h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, w.name, w.name === 'Supero' ? h('span', { className: 'ap-tag', style: { marginLeft: '8px' } }, '★ our own') : null), h('div', { className: 'ap-mut' }, (w.industry || '') + ' · ' + (w.plan_name || '') + ' · ' + (w.channels_connected || 0) + ' channels')),
            h('div', { className: 'num', style: { fontWeight: 700 } }, dollars(w.mrr) + '/mo'), h(Badge, { s: w.workspace_state }));
        }) : h('div', { className: 'ap-empty' }, 'No workspaces.')));
  }

  function OpPlans(props) {
    var c = props.ctx; var [edit, setEdit] = React.useState(null);
    var plans = (c.plans || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    function save(form) {
      var rec = { name: form.name, tier: form.tier, price_monthly: Number(form.price_monthly) || 0, included_channels: Number(form.included_channels) || 0, included_posts: Number(form.included_posts) || 0, features: form.features, popular: !!form.popular, display_name: form.name, description: form.tier };
      var p = form.uuid ? client.updateObject('plan', form.uuid, rec, edit) : client.createObject('plan', rec);
      p.then(function () { showToast('Saved', 'success'); setEdit(null); c.reload(); }).catch(function (e) { showToast('Failed: ' + ((e && e.message) || ''), 'error'); });
    }
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px' } }, h('div', { style: { fontWeight: 700 } }, 'Plans & pricing'),
        h('button', { className: 'ap-btn ap-btn-grad ap-btn-sm', style: { marginLeft: 'auto' }, onClick: function () { setEdit({}); } }, '+ Add plan')),
      h('div', { className: 'ap-panel' }, plans.map(function (p) {
        return h('div', { key: p.uuid, className: 'ap-row' },
          h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, p.name, p.popular ? h('span', { className: 'ap-tag', style: { marginLeft: '8px' } }, 'Popular') : null), h('div', { className: 'ap-mut' }, (p.included_channels || 0) + ' channels · ' + (p.included_posts || 0) + ' posts/mo')),
          h('div', { className: 'num', style: { fontWeight: 700 } }, money(p.price_monthly) + (Number(p.price_monthly) > 0 ? '/mo' : '')),
          h('button', { className: 'ap-btn ap-btn-ghost ap-btn-sm', onClick: function () { setEdit(p); } }, 'Edit'));
      })),
      edit !== null ? h(PlanModal, { initial: edit, onClose: function () { setEdit(null); }, onSave: save }) : null);
  }

  function PlanModal(props) {
    var init = props.initial || {};
    var [form, setForm] = React.useState({ uuid: init.uuid, name: init.name || '', tier: init.tier || 'Starter', price_monthly: init.price_monthly == null ? '' : init.price_monthly, included_channels: init.included_channels == null ? '' : init.included_channels, included_posts: init.included_posts == null ? '' : init.included_posts, features: init.features || '', popular: !!init.popular });
    function set(k2, v) { setForm(function (p) { var n = Object.assign({}, p); n[k2] = v; return n; }); }
    return h('div', { className: 'ap-modal', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h('div', { className: 'ap-sheet', style: { padding: '26px' } }, h('button', { className: 'ap-x', onClick: props.onClose }, '×'),
        h('h2', { className: 'ap-h2', style: { fontSize: '21px' } }, init.uuid ? 'Edit plan' : 'Add plan'),
        h(Field, { label: 'Name', req: true, children: h('input', { className: 'ap-input', value: form.name, onChange: function (e) { set('name', e.target.value); } }) }),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Tier', children: h('select', { className: 'ap-input', value: form.tier, onChange: function (e) { set('tier', e.target.value); } }, ['Free', 'Starter', 'Growth', 'Agency'].map(function (t) { return h('option', { key: t, value: t }, t); })) }),
          h(Field, { label: 'Price / mo', children: h('input', { className: 'ap-input', type: 'number', value: form.price_monthly, onChange: function (e) { set('price_monthly', e.target.value); } }) })),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          h(Field, { label: 'Channels', children: h('input', { className: 'ap-input', type: 'number', value: form.included_channels, onChange: function (e) { set('included_channels', e.target.value); } }) }),
          h(Field, { label: 'Posts / mo', children: h('input', { className: 'ap-input', type: 'number', value: form.included_posts, onChange: function (e) { set('included_posts', e.target.value); } }) })),
        h(Field, { label: 'Features (· separated)', children: h('textarea', { className: 'ap-input', value: form.features, onChange: function (e) { set('features', e.target.value); } }) }),
        h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' } }, h('input', { type: 'checkbox', checked: !!form.popular, onChange: function (e) { set('popular', e.target.checked); } }), h('span', { className: 'ap-mut' }, 'Mark as most popular')),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '18px' } },
          h('button', { className: 'ap-btn ap-btn-grad', onClick: function () { if (!form.name.trim()) { showToast('Name required', 'warning'); return; } props.onSave(form); } }, 'Save'),
          h('button', { className: 'ap-btn ap-btn-ghost', onClick: props.onClose }, 'Cancel'))));
  }

  function OpCampaigns(props) {
    var [cs, setCs] = React.useState(null);
    React.useEffect(function () { client.getObjects('campaign').then(function (r) { setCs(arr(r).sort(function (a, b) { return (b.start_date || '').localeCompare(a.start_date || ''); })); }).catch(function () { setCs([]); }); }, []);
    var totalSpend = (cs || []).reduce(function (s, x) { return s + (x.spend || 0); }, 0);
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px' } }, h('div', { style: { fontWeight: 700 } }, 'All campaigns'), h('div', { className: 'ap-mut', style: { marginLeft: 'auto' } }, dollars(totalSpend) + ' total spend')),
      h('div', { className: 'ap-panel' }, cs === null ? h('div', { className: 'ap-row ap-mut' }, 'Loading…')
        : cs.length ? cs.map(function (cm) {
          return h('div', { key: cm.uuid, className: 'ap-row' },
            h('div', { className: 'ap-grow' }, h('div', { style: { fontWeight: 700 } }, cm.name), h('div', { className: 'ap-mut' }, (cm.workspace_name || '') + ' · ' + cm.objective)),
            h('div', { className: 'num', style: { fontWeight: 700 } }, dollars(cm.spend) + ' / ' + dollars(cm.budget)), h(Badge, { s: cm.campaign_state }));
        }) : h('div', { className: 'ap-empty' }, 'No campaigns.')));
  }

  function OpConsole(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var tabs = [['home', '💳 Billing'], ['workspaces', '🏢 Workspaces'], ['plans', '🏷 Plans'], ['campaigns', '🎯 Campaigns']];
    return h('div', { className: 'ap' },
      h('div', { style: { background: 'linear-gradient(100deg,#2a0d52,#7c3aed 70%,#c026d3)' } }, h('div', { className: 'ap-wrap', style: { display: 'flex', alignItems: 'center', minHeight: '58px', gap: '14px', flexWrap: 'wrap' } },
        h('div', { className: 'ap-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.22)', boxShadow: 'none' } }, '⚡'), 'Amplify', h('span', { style: { opacity: .7, fontWeight: 600, fontSize: '14px' } }, 'Operator')),
        h('div', { className: 'ap-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('ap-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/console' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'ap-ibtn', style: { marginLeft: 'auto', color: '#f3e8ff' }, onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout'))),
      h('div', { className: 'ap-wrap', style: { padding: '24px 24px 64px' } },
        h('h2', { className: 'ap-h2', style: { marginBottom: '16px' } }, 'Amplify operator console'),
        sub === 'workspaces' ? h(OpWorkspaces, { ctx: c }) : sub === 'plans' ? h(OpPlans, { ctx: c }) : sub === 'campaigns' ? h(OpCampaigns, { ctx: c }) : h(OpBilling, { ctx: c })));
  }

  function Footer() { return h('footer', { className: 'ap-foot' }, h('div', { className: 'ap-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'Amplify'), ' — launch campaigns everywhere, from one place.'), h('div', null, 'Pricing · Channels · Status'))); }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false);
    var [plans, setPlans] = React.useState(null);
    var [channels, setChannels] = React.useState(null); var [campaigns, setCampaigns] = React.useState(null); var [posts, setPosts] = React.useState(null); var [workspaces, setWorkspaces] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reloadPublic() { client.getObjects('plan').then(function (r) { setPlans(arr(r)); }).catch(function () { setPlans([]); }); }
    function reloadMine() {
      if (!client.isAuthenticated() || isStaff()) return;
      client.getObjects('channel').then(function (r) { setChannels(arr(r)); }).catch(function () { setChannels([]); });
      client.getObjects('campaign').then(function (r) { setCampaigns(arr(r)); }).catch(function () { setCampaigns([]); });
      client.getObjects('post').then(function (r) { setPosts(arr(r)); }).catch(function () { setPosts([]); });
      client.getObjects('workspace').then(function (r) { setWorkspaces(arr(r)); }).catch(function () { setWorkspaces([]); });
    }
    React.useEffect(reloadPublic, []);
    React.useEffect(function () { if (authed) reloadMine(); }, [authed]);

    var myWs = (workspaces || [])[0];
    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(),
      openLogin: function () { setShowLogin(true); }, plans: plans, channels: channels, campaigns: campaigns, posts: posts,
      workspaces: workspaces, myWorkspaceName: (myWs && myWs.name) || ((client.userInfo || {}).fullName) || 'My workspace',
      reload: reloadMine };
    var seg = route.replace(/^#\//, '').split('/'); var top = seg[0] || '';

    var loginModal = showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); setAuthed(true); } }) : null;

    if (top === 'console' && ctx.isAdmin) return h(ErrorBoundary, null, h(OpConsole, { ctx: ctx, seg: seg }), loginModal);
    if (top === 'app' && authed && !ctx.isAdmin) return h(ErrorBoundary, null, h(CustomerApp, { ctx: ctx, seg: seg }), loginModal);
    if (top === 'app' && ctx.isAdmin) { navigate('#/console'); }

    var page;
    if (top === 'pricing') page = h(Pricing, { ctx: ctx });
    else page = h(Home, { ctx: ctx });
    return h(ErrorBoundary, null, h('div', { className: 'ap' }, h(TopBar, { ctx: ctx }), page, h(Footer, null), loginModal));
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
