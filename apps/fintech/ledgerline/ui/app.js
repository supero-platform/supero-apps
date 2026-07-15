// ui/app.js — Ledgerline billing & spend platform (custom UI).
// Globals (React, ReactDOM, client, services, showToast, ErrorBoundary) come from the
// Supero runtime BEFORE this file — never re-declare them.
(function () {
  var h = React.createElement;

  var TIERS = ['Starter', 'Growth', 'Scale', 'Enterprise'];
  var EXP_CATS = ['Software', 'Travel', 'Marketing', 'Office', 'Contractors', 'Other'];

  function arr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function money(n) { n = Number(n) || 0; try { return formatCurrency(n); } catch (e) { return '$' + n.toLocaleString(); } }
  function k(n) { n = Number(n) || 0; return n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n); }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return (s || '').slice(0, 10); } }
  function statusColor(s) {
    return { active: '#059669', trial: '#4f46e5', past_due: '#d97706', churned: '#94a3b8',
      paid: '#059669', sent: '#4f46e5', draft: '#94a3b8', overdue: '#dc2626', void: '#94a3b8',
      submitted: '#4f46e5', approved: '#059669', rejected: '#dc2626', reimbursed: '#0891b2' }[s] || '#64748b';
  }
  function isStaff() { try { return client.isAdmin() || client.canWrite('expense') || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; } }

  function injectChrome() {
    if (document.getElementById('ll-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'll-chrome';
    st.textContent = [
      ':root{--ink:#0b1220;--ink2:#334155;--paper:#fff;--bg:#f3f5fb;--indigo:#4f46e5;--indigo2:#6366f1;--indigo-d:#4338ca;--green:#059669;--amber:#d97706;--red:#dc2626;--cyan:#0891b2;--line:#e4e8f2;--muted:#64748b}',
      '#root,#app,#__next,#supero-preloader{display:none!important}',
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647}',
      '.ll{background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}',
      '.ll *{box-sizing:border-box}.ll a{color:inherit;text-decoration:none}',
      '.ll-wrap{max-width:1180px;margin:0 auto;padding:0 24px}',
      '.jak{font-family:"Plus Jakarta Sans",Inter,sans-serif}',
      '.num{font-variant-numeric:tabular-nums}',
      '.ll-top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}',
      '.ll-top-in{display:flex;align-items:center;gap:18px;height:64px}',
      '.ll-logo{display:flex;align-items:center;gap:9px;cursor:pointer;font-family:"Plus Jakarta Sans";font-weight:800;font-size:20px;color:var(--ink)}',
      '.ll-logo .dot{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--indigo),var(--cyan));display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px}',
      '.ll-act{margin-left:auto;display:flex;align-items:center;gap:4px}',
      '.ll-ibtn{background:none;border:0;cursor:pointer;font-size:14px;color:var(--ink);padding:9px 13px;border-radius:9px;font-weight:600}.ll-ibtn:hover{background:var(--bg)}',
      '.ll-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:0;border-radius:10px;font-weight:600;font-size:14px;padding:10px 18px;font-family:Inter;transition:.15s}',
      '.ll-btn:disabled{opacity:.55;cursor:default}',
      '.ll-btn-ind{background:var(--indigo);color:#fff}.ll-btn-ind:hover:not(:disabled){background:var(--indigo-d)}',
      '.ll-btn-ink{background:var(--ink);color:#fff}.ll-btn-ink:hover:not(:disabled){background:#000}',
      '.ll-btn-ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}.ll-btn-ghost:hover{border-color:var(--indigo)}',
      '.ll-btn-sm{padding:7px 12px;font-size:13px}',
      '.ll-hero{background:linear-gradient(150deg,#0b1220,#312e81 70%,#0891b2);color:#fff;position:relative;overflow:hidden}',
      '.ll-hero-in{position:relative;padding:80px 0 90px}',
      '.ll-hero h1{font-family:"Plus Jakarta Sans";font-weight:800;font-size:clamp(32px,4.8vw,54px);margin:10px 0 0;letter-spacing:-.02em;max-width:680px}',
      '.ll-hero p{font-size:18px;color:#d6dcf5;max-width:520px;margin:16px 0 0}',
      '.ll-pill{display:inline-block;background:rgba(255,255,255,.16);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:30px}',
      '.ll-sec{padding:50px 0}',
      '.ll-h2{font-family:"Plus Jakarta Sans";font-weight:700;font-size:26px;margin:0}',
      '.ll-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--indigo)}',
      '.ll-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px}',
      '.ll-plan{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:24px;display:flex;flex-direction:column}',
      '.ll-plan.pop{border:2px solid var(--indigo);box-shadow:0 18px 44px -28px rgba(79,70,229,.5);position:relative}',
      '.ll-plan h3{font-family:"Plus Jakarta Sans";font-weight:700;font-size:18px;margin:0}',
      '.ll-plan .price{font-family:"Plus Jakarta Sans";font-weight:800;font-size:34px;margin:10px 0 0}',
      '.ll-plan ul{list-style:none;padding:0;margin:14px 0 0;flex:1}.ll-plan li{font-size:13.5px;color:var(--ink2);padding:5px 0;display:flex;gap:8px}',
      '.ll-popbadge{position:absolute;top:-11px;left:24px;background:var(--indigo);color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:20px}',
      '.ll-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}',
      '.ll-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}',
      '.ll-stat-n{font-family:"Plus Jakarta Sans";font-weight:800;font-size:26px;line-height:1}',
      '.ll-stat-l{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:7px}',
      '.ll-stat-d{font-size:12px;font-weight:600;margin-top:4px}',
      '.ll-panel{background:var(--paper);border:1px solid var(--line);border-radius:16px}',
      '.ll-row{display:flex;align-items:center;gap:14px;padding:14px 18px;border-top:1px solid var(--line)}',
      '.ll-row:first-child{border-top:0}.ll-grow{flex:1;min-width:0}.ll-mut{color:var(--muted);font-size:13px}',
      '.ll-badge{display:inline-block;font-size:11px;font-weight:600;text-transform:capitalize;padding:3px 10px;border-radius:20px;color:#fff}',
      '.ll-bars{display:flex;align-items:flex-end;gap:14px;height:170px;padding:10px 4px 0}',
      '.ll-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}',
      '.ll-bar .b{width:100%;max-width:60px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--indigo2),var(--indigo));transition:.3s}',
      '.ll-bar .v{font-weight:700;font-size:13px;margin-bottom:6px}.ll-bar .l{font-size:12px;color:var(--muted);margin-top:8px}',
      '.ll-field{display:block;margin-top:14px}.ll-field span{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}',
      '.ll-input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:11px 13px;font-size:14px;font-family:Inter;color:var(--ink)}',
      '.ll-input:focus{outline:none;border-color:var(--indigo)}textarea.ll-input{min-height:80px;resize:vertical}',
      '.ll-modal{position:fixed;inset:0;z-index:200;background:rgba(11,18,32,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}',
      '.ll-sheet{background:var(--paper);border-radius:18px;width:100%;max-width:520px;max-height:92vh;overflow:auto;position:relative}',
      '.ll-x{position:absolute;top:13px;right:15px;background:none;border:0;font-size:23px;cursor:pointer;color:var(--muted);z-index:2}',
      '.ll-2col{display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start}',
      '.ll-tabs{display:flex;gap:4px;flex-wrap:wrap}.ll-tab{background:none;border:0;color:#c7cbe8;cursor:pointer;font-size:14px;font-weight:600;padding:8px 14px;border-radius:9px}.ll-tab.on{background:rgba(255,255,255,.16);color:#fff}',
      '.ll-foot{background:var(--ink);color:#9aa6bd;padding:34px 0;font-size:13px;margin-top:40px}.ll-foot b{color:#fff;font-family:"Plus Jakarta Sans"}',
      '.ll-empty{text-align:center;padding:60px 20px;color:var(--muted)}',
      '.ll-chip{display:inline-block;font-size:11px;font-weight:600;color:var(--ink2);background:#eef1f8;border-radius:20px;padding:3px 9px}',
      '.ll-meter{height:8px;border-radius:6px;background:#e6eaf3;overflow:hidden;margin-top:6px}.ll-meter i{display:block;height:100%;background:linear-gradient(90deg,var(--indigo),var(--cyan))}',
      '@media(max-width:980px){.ll-plans{grid-template-columns:repeat(2,1fr)}.ll-stats{grid-template-columns:repeat(2,1fr)}.ll-2col{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function Logo(p) { return h('div', { className: 'll-logo', onClick: p.onClick }, h('span', { className: 'dot' }, '▤'), 'Ledgerline'); }
  function Field(p) { return h('label', { className: 'll-field' }, h('span', null, p.label + (p.req ? ' *' : '')), p.children); }
  function Badge(p) { return h('span', { className: 'll-badge', style: { background: statusColor(p.s) } }, (p.s || '').replace('_', ' ')); }

  function LoginScreen(props) {
    var [email, setEmail] = React.useState(props.prefill || 'finance@ledgerline.io');
    var [pw, setPw] = React.useState(''); var [busy, setBusy] = React.useState(false); var [err, setErr] = React.useState('');
    function submit(e) { e.preventDefault(); setBusy(true); setErr(''); var cfg = window.__SUPERO_CONFIG || {};
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant').then(function () { setBusy(false); props.onDone && props.onDone(); }).catch(function (ex) { setBusy(false); setErr((ex && ex.message) || 'Login failed.'); }); }
    return h('div', { className: 'll-modal', onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h('form', { className: 'll-sheet', style: { maxWidth: '410px', padding: '34px' }, onSubmit: submit },
        props.onClose ? h('button', { type: 'button', className: 'll-x', onClick: props.onClose }, '×') : null,
        h(Logo, null), h('h2', { className: 'll-h2', style: { marginTop: '16px' } }, props.title || 'Sign in'),
        h('p', { className: 'll-mut' }, 'Finance team sees the full console; customers see their portal.'),
        h(Field, { label: 'Email', children: h('input', { className: 'll-input', type: 'email', value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }) }),
        h(Field, { label: 'Password', children: h('input', { className: 'll-input', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }) }),
        err ? h('div', { style: { color: 'var(--red)', fontSize: '13px', marginTop: '10px' } }, err) : null,
        h('button', { className: 'll-btn ll-btn-ind', type: 'submit', disabled: busy, style: { width: '100%', marginTop: '18px' } }, busy ? 'Signing in…' : 'Sign in'),
        h('p', { className: 'll-mut', style: { marginTop: '14px', textAlign: 'center', fontSize: '12.5px' } }, 'Demo — finance@ledgerline.io · customer@ledgerline.io · pw Password123!')));
  }

  function TopBar(props) {
    var c = props.ctx;
    return h('div', { className: 'll-top' }, h('div', { className: 'll-wrap ll-top-in' },
      h(Logo, { onClick: function () { c.navigate('#/'); } }),
      h('div', { className: 'll-act' },
        h('button', { className: 'll-ibtn', onClick: function () { c.navigate('#/pricing'); } }, 'Pricing'),
        c.isAdmin ? h('button', { className: 'll-ibtn', onClick: function () { c.navigate('#/console'); } }, '📊 Console') : null,
        c.authed ? h('button', { className: 'll-ibtn', onClick: function () { c.navigate('#/portal'); } }, '👤 My billing') : null,
        c.authed ? h('button', { className: 'll-ibtn', onClick: function () { client.logout(); c.setAuthed(false); c.navigate('#/'); } }, 'Logout')
          : h('button', { className: 'll-btn ll-btn-ind ll-btn-sm', onClick: c.openLogin }, 'Sign in'))));
  }

  function PlanCard(props) {
    var p = props.p;
    return h('div', { className: cls('ll-plan', p.popular && 'pop') },
      p.popular ? h('span', { className: 'll-popbadge' }, 'Most popular') : null,
      h('h3', null, p.plan_name),
      h('div', { className: 'price num' }, money(p.price_monthly), h('span', { style: { fontSize: '14px', fontWeight: 500, color: 'var(--muted)' } }, '/mo')),
      h('div', { className: 'll-mut', style: { marginTop: '2px' } }, p.price_annual ? money(p.price_annual) + '/yr billed annually' : ''),
      h('ul', null, (p.features || '').split('·').map(function (f, i) { return f.trim() ? h('li', { key: i }, h('span', { style: { color: 'var(--green)' } }, '✓'), f.trim()) : null; })),
      h('button', { className: cls('ll-btn', p.popular ? 'll-btn-ind' : 'll-btn-ghost'), style: { marginTop: '16px' }, onClick: function () { props.ctx.authed ? props.ctx.navigate('#/portal') : props.ctx.openLogin(); } }, 'Start free trial'));
  }

  function Pricing(props) {
    var c = props.ctx; var plans = (c.plans || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    return h('div', { className: 'll-wrap ll-sec' },
      h('div', { style: { textAlign: 'center' } }, h('div', { className: 'll-eyebrow' }, 'Pricing'), h('h2', { className: 'll-h2', style: { marginTop: '6px', fontSize: '32px' } }, 'Pay for what you use'),
        h('p', { className: 'll-mut', style: { maxWidth: '520px', margin: '8px auto 0' } }, 'Every plan includes seats and usage; only pay overage when you grow. Switch or cancel anytime.')),
      c.plans === null ? h('div', { className: 'll-empty' }, 'Loading…') : h('div', { className: 'll-plans' }, plans.map(function (p) { return h(PlanCard, { key: p.uuid, p: p, ctx: c }); })));
  }

  function Home(props) {
    var c = props.ctx;
    return h('div', null,
      h('section', { className: 'll-hero' }, h('div', { className: 'll-wrap ll-hero-in' },
        h('span', { className: 'll-pill' }, 'Billing + spend, in one place'),
        h('h1', null, 'Usage-based billing that scales with your revenue.'),
        h('p', null, 'Meter usage, invoice automatically, recover failed payments with smart dunning — and approve team spend, all in one ledger.'),
        h('div', { style: { display: 'flex', gap: '12px', marginTop: '26px', flexWrap: 'wrap' } },
          h('button', { className: 'll-btn ll-btn-ind', onClick: function () { c.navigate('#/pricing'); } }, 'See pricing'),
          h('button', { className: 'll-btn ll-btn-ghost', style: { background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }, onClick: function () { c.isAdmin ? c.navigate('#/console') : c.openLogin(); } }, 'View the dashboard'))) ),
      h('section', { className: 'll-sec' }, h('div', { className: 'll-wrap' },
        h('div', { className: 'll-stats' },
          [['Automated invoicing', 'Metered + recurring, prorated'], ['Smart dunning', 'Recover failed payments as a saga'], ['Spend approvals', 'Multi-step expense workflows'], ['Live MRR analytics', 'ARR, churn and tier mix']].map(function (x, i) {
            return h('div', { key: i, className: 'll-panel', style: { padding: '20px' } }, h('div', { className: 'jak', style: { fontWeight: 700, fontSize: '15px' } }, x[0]), h('div', { className: 'll-mut', style: { marginTop: '4px' } }, x[1]));
          })))),
      h('section', { style: { paddingBottom: '40px' } }, h('div', { className: 'll-wrap', style: { textAlign: 'center' } },
        h('button', { className: 'll-btn ll-btn-ink', onClick: function () { c.navigate('#/pricing'); } }, 'Start your free trial'))));
  }

  // ── Customer portal ─────────────────────────────────────────────────────────
  function Portal(props) {
    var c = props.ctx; var [me, setMe] = React.useState(null); var [invoices, setInvoices] = React.useState(null);
    React.useEffect(function () {
      if (!c.authed) return;
      client.getObjects('customer').then(function (r) { setMe(arr(r)[0] || null); }).catch(function () { setMe(null); });
      client.getObjects('invoice').then(function (r) { setInvoices(arr(r).sort(function (a, b) { return (b.issued_date || '').localeCompare(a.issued_date || ''); })); }).catch(function () { setInvoices([]); });
    }, [c.authed]);
    if (!c.authed) return h('div', { className: 'll-wrap ll-sec' }, h('div', { className: 'll-empty' }, h('h2', { className: 'll-h2' }, 'Sign in to your billing portal'), h('button', { className: 'll-btn ll-btn-ind', style: { marginTop: '14px' }, onClick: c.openLogin }, 'Sign in')));
    var plan = me ? (c.plans || []).filter(function (p) { return p.plan_name === me.plan_name; })[0] : null;
    var usePct = (me && plan && plan.included_units) ? Math.min(100, Math.round((me.usage_units / plan.included_units) * 100)) : 0;
    function pay(inv) {
      if (services && services.stripe && services.stripe.checkout) {
        services.stripe.checkout({ amount: inv.amount, product: 'Ledgerline ' + inv.invoice_number, successUrl: window.location.origin + '/?paid=1' }).then(function (r) { var u = ((r && r.output) || r || {}); u = u.checkout_url || u.url; if (u) { window.location.href = u; return; } markPaid(inv); }).catch(function () { markPaid(inv); });
      } else markPaid(inv);
    }
    function markPaid(inv) { client.updateObject('invoice', inv.uuid, { invoice_state: 'paid', paid_at: new Date().toISOString() }, inv).then(function () { showToast('Invoice paid', 'success'); client.getObjects('invoice').then(function (r) { setInvoices(arr(r)); }); }).catch(function () { showToast('Payment simulated', 'info'); }); }
    return h('div', { className: 'll-wrap ll-sec' },
      h('h2', { className: 'll-h2' }, 'My billing'),
      h('div', { className: 'll-2col', style: { marginTop: '18px' } },
        h('div', null,
          h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Invoices'),
          h('div', { className: 'll-panel' }, invoices === null ? h('div', { className: 'll-row ll-mut' }, 'Loading…')
            : invoices.length ? invoices.map(function (inv) {
              return h('div', { key: inv.uuid, className: 'll-row' },
                h('div', { className: 'll-grow' }, h('div', { style: { fontWeight: 700 } }, inv.invoice_number, h('span', { className: 'll-mut', style: { fontWeight: 400, marginLeft: '8px' } }, inv.period)), h('div', { className: 'll-mut' }, 'Due ' + fmtDate(inv.due_date))),
                h('div', { className: 'num', style: { fontWeight: 700 } }, money(inv.amount)),
                h(Badge, { s: inv.invoice_state }),
                (inv.invoice_state === 'sent' || inv.invoice_state === 'overdue') ? h('button', { className: 'll-btn ll-btn-ind ll-btn-sm', onClick: function () { pay(inv); } }, 'Pay') : null);
            }) : h('div', { className: 'll-empty' }, 'No invoices yet.'))),
        h('div', { className: 'll-panel', style: { padding: '20px' } },
          h('div', { className: 'll-eyebrow' }, 'Subscription'),
          me ? h('div', null,
            h('div', { className: 'jak', style: { fontWeight: 800, fontSize: '22px', marginTop: '6px' } }, (me.plan_name || 'Plan')),
            h('div', { className: 'll-mut' }, money(me.mrr) + '/mo · ' + (me.seats || 0) + ' seats · ' + (me.billing_interval || 'monthly')),
            h('div', { style: { marginTop: '14px' } }, h('div', { className: 'll-mut', style: { display: 'flex', justifyContent: 'space-between' } }, h('span', null, 'Usage this period'), h('span', { className: 'num' }, (me.usage_units || 0).toLocaleString() + (plan ? ' / ' + plan.included_units.toLocaleString() : ''))),
              h('div', { className: 'll-meter' }, h('i', { style: { width: usePct + '%' } }))),
            h('div', { style: { marginTop: '14px' } }, h(Badge, { s: me.account_state }))) : h('div', { className: 'll-mut', style: { marginTop: '8px' } }, 'No subscription found.'))));
  }

  // ── Finance console ─────────────────────────────────────────────────────────
  function Stat(p) { return h('div', { className: 'll-stat' }, h('div', { className: 'll-stat-n num', style: { color: p.color || 'var(--ink)' } }, p.n), h('div', { className: 'll-stat-l' }, p.l), p.d ? h('div', { className: 'll-stat-d', style: { color: p.dc || 'var(--green)' } }, p.d) : null); }

  function ConsoleHome(props) {
    var c = props.ctx; var [customers, setCustomers] = React.useState([]); var [invoices, setInvoices] = React.useState([]);
    React.useEffect(function () { client.getObjects('customer').then(function (r) { setCustomers(arr(r)); }).catch(function () {}); client.getObjects('invoice').then(function (r) { setInvoices(arr(r)); }).catch(function () {}); }, []);
    var active = customers.filter(function (x) { return x.account_state === 'active' || x.account_state === 'past_due'; });
    var mrr = active.reduce(function (s, x) { return s + (x.mrr || 0); }, 0);
    var churned = customers.filter(function (x) { return x.account_state === 'churned'; }).length;
    var churnPct = customers.length ? Math.round((churned / customers.length) * 100) : 0;
    var overdue = invoices.filter(function (i) { return i.invoice_state === 'overdue'; });
    var byTier = TIERS.map(function (t) { return { label: t, value: active.filter(function (x) { return x.tier === t; }).reduce(function (s, x) { return s + (x.mrr || 0); }, 0) }; });
    var maxV = Math.max.apply(null, byTier.map(function (b) { return b.value; }).concat([1]));
    return h('div', null,
      h('div', { className: 'll-stats' },
        h(Stat, { n: money(mrr), l: 'MRR', d: '▲ live', color: 'var(--ink)' }),
        h(Stat, { n: money(mrr * 12), l: 'ARR', color: 'var(--indigo)' }),
        h(Stat, { n: active.length, l: 'Active customers' }),
        h(Stat, { n: churnPct + '%', l: 'Logo churn', d: churned + ' churned', dc: 'var(--red)', color: churnPct > 15 ? 'var(--red)' : 'var(--ink)' })),
      h('div', { className: 'll-2col', style: { marginTop: '18px' } },
        h('div', { className: 'll-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, 'MRR by plan tier'),
          h('div', { className: 'll-bars' }, byTier.map(function (b) {
            return h('div', { key: b.label, className: 'll-bar' }, h('div', { className: 'v num' }, '$' + k(b.value)),
              h('div', { className: 'b', style: { height: Math.max(4, (b.value / maxV) * 130) + 'px' } }), h('div', { className: 'l' }, b.label));
          }))),
        h('div', { className: 'll-panel', style: { padding: '20px' } },
          h('div', { style: { fontWeight: 700, marginBottom: '8px' } }, 'Needs attention'),
          overdue.length ? overdue.map(function (i) {
            return h('div', { key: i.uuid, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '13.5px' } },
              h('span', null, i.invoice_number + ' · ' + (i.customer_name || '')), h('b', { className: 'num', style: { color: 'var(--red)' } }, money(i.amount)));
          }) : h('div', { className: 'll-mut' }, 'No overdue invoices — nice.'),
          h('button', { className: 'll-btn ll-btn-ghost ll-btn-sm', style: { marginTop: '12px' }, onClick: function () { c.navigate('#/console/invoices'); } }, 'Go to invoices →'))));
  }

  function ConsoleCustomers(props) {
    var [customers, setCustomers] = React.useState(null);
    React.useEffect(function () { client.getObjects('customer').then(function (r) { setCustomers(arr(r).sort(function (a, b) { return (b.mrr || 0) - (a.mrr || 0); })); }).catch(function () { setCustomers([]); }); }, []);
    return h('div', null, h('div', { style: { fontWeight: 700, marginBottom: '10px' } }, 'Customers'),
      h('div', { className: 'll-panel' }, customers === null ? h('div', { className: 'll-row ll-mut' }, 'Loading…')
        : customers.map(function (cu) {
          return h('div', { key: cu.uuid, className: 'll-row' },
            h('div', { className: 'll-grow' }, h('div', { style: { fontWeight: 700 } }, cu.business_name), h('div', { className: 'll-mut' }, (cu.plan_name || '') + ' · ' + (cu.seats || 0) + ' seats · ' + (cu.usage_units || 0).toLocaleString() + ' units')),
            h('div', { className: 'num', style: { fontWeight: 700 } }, money(cu.mrr) + '/mo'), h(Badge, { s: cu.account_state }));
        })));
  }

  function ConsoleInvoices(props) {
    var c = props.ctx; var [invoices, setInvoices] = React.useState(null); var [f, setF] = React.useState('all');
    function load() { client.getObjects('invoice').then(function (r) { setInvoices(arr(r).sort(function (a, b) { return (b.issued_date || '').localeCompare(a.issued_date || ''); })); }).catch(function () { setInvoices([]); }); }
    React.useEffect(load, []);
    function markPaid(i) { client.updateObject('invoice', i.uuid, { invoice_state: 'paid', paid_at: new Date().toISOString() }, i).then(function () { showToast('Marked paid', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    function dun(i) {
      var run = (services && services.workflow && services.workflow.run) ? services.workflow.run('invoice_dunning', { invoice_uuid: i.uuid, customer_email: i.customer_email, invoice_number: i.invoice_number, amount: i.amount, dunning_step: (i.dunning_step || 0) + 1 }) : Promise.reject();
      run.then(function () { showToast('Dunning workflow triggered for ' + i.invoice_number, 'success'); client.updateObject('invoice', i.uuid, { dunning_step: (i.dunning_step || 0) + 1 }, i).catch(function () {}); load(); }).catch(function () { showToast('Dunning reminder queued (demo)', 'info'); });
    }
    var list = (invoices || []).filter(function (i) { return f === 'all' || i.invoice_state === f; });
    return h('div', null,
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } }, ['all', 'sent', 'overdue', 'paid', 'draft'].map(function (s) { return h('button', { key: s, className: cls('ll-btn ll-btn-sm', f === s ? 'll-btn-ind' : 'll-btn-ghost'), onClick: function () { setF(s); } }, s); })),
      h('div', { className: 'll-panel' }, invoices === null ? h('div', { className: 'll-row ll-mut' }, 'Loading…')
        : list.length ? list.map(function (i) {
          return h('div', { key: i.uuid, className: 'll-row' },
            h('div', { className: 'll-grow' }, h('div', { style: { fontWeight: 700 } }, i.invoice_number, h('span', { className: 'll-mut', style: { fontWeight: 400, marginLeft: '8px' } }, i.customer_name)), h('div', { className: 'll-mut' }, i.period + ' · due ' + fmtDate(i.due_date) + (i.dunning_step ? ' · dunning ' + i.dunning_step : ''))),
            h('div', { className: 'num', style: { fontWeight: 700 } }, money(i.amount)), h(Badge, { s: i.invoice_state }),
            i.invoice_state === 'overdue' ? h('button', { className: 'll-btn ll-btn-ghost ll-btn-sm', onClick: function () { dun(i); } }, '🔔 Dun') : null,
            (i.invoice_state === 'sent' || i.invoice_state === 'overdue') ? h('button', { className: 'll-btn ll-btn-ink ll-btn-sm', onClick: function () { markPaid(i); } }, 'Mark paid') : null);
        }) : h('div', { className: 'll-empty' }, 'No invoices.')));
  }

  function ConsoleExpenses(props) {
    var c = props.ctx; var [expenses, setExpenses] = React.useState(null); var [f, setF] = React.useState('all');
    function load() { client.getObjects('expense').then(function (r) { setExpenses(arr(r).sort(function (a, b) { return (b.submitted_date || '').localeCompare(a.submitted_date || ''); })); }).catch(function () { setExpenses([]); }); }
    React.useEffect(load, []);
    function approve(x) {
      var run = (services && services.workflow && services.workflow.run) ? services.workflow.run('expense_approval', { expense_uuid: x.uuid, submitter_email: x.submitter_email, title: x.title }) : Promise.reject();
      run.then(function () { showToast('Approval saga ran for ' + x.title, 'success'); load(); }).catch(function () { client.updateObject('expense', x.uuid, { expense_state: 'approved', approver: (client.userInfo || {}).fullName || 'Finance' }, x).then(function () { showToast('Approved', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); });
    }
    function reject(x) { client.updateObject('expense', x.uuid, { expense_state: 'rejected', approver: (client.userInfo || {}).fullName || 'Finance' }, x).then(function () { showToast('Rejected', 'success'); load(); }).catch(function () { showToast('Failed', 'error'); }); }
    var list = (expenses || []).filter(function (x) { return f === 'all' || x.expense_state === f; });
    var pending = (expenses || []).filter(function (x) { return x.expense_state === 'submitted'; }).reduce(function (s, x) { return s + (x.amount || 0); }, 0);
    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' } },
        ['all', 'submitted', 'approved', 'reimbursed', 'rejected'].map(function (s) { return h('button', { key: s, className: cls('ll-btn ll-btn-sm', f === s ? 'll-btn-ind' : 'll-btn-ghost'), onClick: function () { setF(s); } }, s); }),
        h('div', { className: 'll-mut', style: { marginLeft: 'auto' } }, money(pending) + ' awaiting approval')),
      h('div', { className: 'll-panel' }, expenses === null ? h('div', { className: 'll-row ll-mut' }, 'Loading…')
        : list.length ? list.map(function (x) {
          return h('div', { key: x.uuid, className: 'll-row' },
            h('div', { className: 'll-grow' }, h('div', { style: { fontWeight: 700 } }, x.title, h('span', { className: 'll-chip', style: { marginLeft: '8px' } }, x.category)), h('div', { className: 'll-mut' }, (x.vendor || '') + ' · ' + (x.submitter || '') + ' · ' + fmtDate(x.submitted_date))),
            h('div', { className: 'num', style: { fontWeight: 700 } }, money(x.amount)), h(Badge, { s: x.expense_state }),
            x.expense_state === 'submitted' ? h('button', { className: 'll-btn ll-btn-ink ll-btn-sm', onClick: function () { approve(x); } }, 'Approve') : null,
            x.expense_state === 'submitted' ? h('button', { className: 'll-btn ll-btn-ghost ll-btn-sm', onClick: function () { reject(x); } }, 'Reject') : null);
        }) : h('div', { className: 'll-empty' }, 'No expenses.')));
  }

  function Console(props) {
    var c = props.ctx; var sub = props.seg[1] || 'home';
    var tabs = [['home', 'Dashboard'], ['customers', 'Customers'], ['invoices', 'Invoices'], ['expenses', 'Expenses']];
    return h('div', { className: 'll' },
      h('div', { style: { background: 'linear-gradient(100deg,#0b1220,#312e81)' } }, h('div', { className: 'll-wrap', style: { display: 'flex', alignItems: 'center', height: '60px', gap: '14px' } },
        h('div', { className: 'll-logo', style: { color: '#fff' }, onClick: function () { c.navigate('#/'); } }, h('span', { className: 'dot', style: { background: 'rgba(255,255,255,.2)' } }, '▤'), 'Ledgerline'),
        h('div', { className: 'll-tabs', style: { marginLeft: '8px' } }, tabs.map(function (t) { return h('button', { key: t[0], className: cls('ll-tab', sub === t[0] && 'on'), onClick: function () { c.navigate('#/console' + (t[0] === 'home' ? '' : '/' + t[0])); } }, t[1]); })),
        h('button', { className: 'll-ibtn', style: { marginLeft: 'auto', color: '#c7cbe8' }, onClick: function () { c.navigate('#/'); } }, 'Marketing site ↗'))),
      h('div', { className: 'll-wrap', style: { padding: '24px 24px 64px' } },
        sub === 'home' ? h(ConsoleHome, { ctx: c }) : sub === 'customers' ? h(ConsoleCustomers, { ctx: c }) : sub === 'invoices' ? h(ConsoleInvoices, { ctx: c }) : h(ConsoleExpenses, { ctx: c })));
  }

  function Footer() { return h('footer', { className: 'll-foot' }, h('div', { className: 'll-wrap', style: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between' } }, h('div', null, h('b', null, 'Ledgerline'), ' — usage-based billing & spend management.'), h('div', null, 'Pricing · Docs · Status'))); }

  function App() {
    var [route, setRoute] = React.useState(window.location.hash || '#/');
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showLogin, setShowLogin] = React.useState(false); var [plans, setPlans] = React.useState(null);
    function navigate(hash) { if (window.location.hash !== hash) { window.location.hash = hash; } else { setRoute(hash); } window.scrollTo(0, 0); }
    React.useEffect(function () { function oh() { setRoute(window.location.hash || '#/'); } window.addEventListener('hashchange', oh); return function () { window.removeEventListener('hashchange', oh); }; }, []);
    React.useEffect(function () {
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (++n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function reload() { client.getObjects('plan').then(function (r) { setPlans(arr(r)); }).catch(function () { setPlans([]); }); }
    React.useEffect(reload, []);

    var ctx = { route: route, navigate: navigate, authed: authed, setAuthed: setAuthed, isAdmin: authed && isStaff(), openLogin: function () { setShowLogin(true); }, plans: plans };
    var seg = route.replace(/^#\//, '').split('/'); var top = seg[0] || '';

    if (top === 'console' && ctx.isAdmin) return h(ErrorBoundary, null, h(Console, { ctx: ctx, seg: seg }), showLogin ? h(LoginScreen, { onClose: function () { setShowLogin(false); }, onDone: function () { setShowLogin(false); } }) : null);

    var page;
    if (top === 'pricing') page = h(Pricing, { ctx: ctx });
    else if (top === 'portal') page = h(Portal, { ctx: ctx });
    else page = h(Home, { ctx: ctx });
    return h(ErrorBoundary, null, h('div', { className: 'll' }, h(TopBar, { ctx: ctx }), page, h(Footer, null),
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
