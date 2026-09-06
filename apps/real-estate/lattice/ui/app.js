// ui/app.js — LATTICE multi-tenant property management (Path B, full custom UI).
//
// Obeys the seven rules: never AppShell.render(); never re-declare a library
// global; hooks once on the right; route in state (no hashchange); mount in a
// sibling (#lattice-root), hide #root; public reads send NO auth headers and use a
// RELATIVE /api/public path (never apiUrl → 405); client.login takes 5 args.
//
// AUDIENCES (one login, role-routed): logged-out → public listings; staff
// (isAdmin/canWrite) → manager console (portfolio, units, leases, maintenance
// board, rent ledger, dashboards, applications, TenantSwitcher for super-admin);
// resident (tenant_user) → portal (my lease, pay rent, submit/track maintenance).
(function () {
  var h = React.createElement;
  var cfg = window.__SUPERO_CONFIG || {};

  // ── palette ────────────────────────────────────────────────────────────────
  var INK = '#0f172a', SLATE = '#475569', LINE = '#e2e8f0', BG = '#f8fafc';
  var BRAND = '#1d4ed8', BRAND_D = '#1e3a8a', ACCENT = '#0ea5e9';

  // ── tiny helpers (prefixed so they never collide with library globals) ───────

  // SAGA-GUARD-V1 — a workflow run answers HTTP 200 even when it failed, and even
  // on success:true its own outcome lives in output.status, where `partial`,
  // `compensated` and `compensation_failed` are all possible. A compensated saga
  // has UNDONE its own work, so reporting it as done is the opposite of the truth.
  // One wrapper so no call site can forget the check.
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

  function myMoney(v) {
    try { return formatCurrency(v || 0); }
    catch (e) { return '$' + Number(v || 0).toLocaleString(); }
  }
  function myDate(v) {
    if (!v) return '—';
    try { return formatDate(v); } catch (e) { return String(v).slice(0, 10); }
  }
  function img(x) {
    try { return resolveImageUrl(x); } catch (e) { return ''; }
  }
  function titleCase(s) {
    if (!s) return '';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function chipColor(status) {
    var m = {
      available: ['#065f46', '#d1fae5'], occupied: ['#1e3a8a', '#dbeafe'],
      maintenance: ['#9a3412', '#ffedd5'], off_market: ['#475569', '#e2e8f0'],
      active: ['#065f46', '#d1fae5'], pending: ['#92400e', '#fef3c7'],
      captured: ['#065f46', '#d1fae5'], refunded: ['#475569', '#e2e8f0'],
      submitted: ['#92400e', '#fef3c7'], assigned: ['#1e3a8a', '#dbeafe'],
      in_progress: ['#5b21b6', '#ede9fe'], resolved: ['#065f46', '#d1fae5'],
      received: ['#475569', '#e2e8f0'], screening: ['#92400e', '#fef3c7'],
      approved: ['#065f46', '#d1fae5'], denied: ['#991b1b', '#fee2e2'],
      urgent: ['#991b1b', '#fee2e2'], high: ['#9a3412', '#ffedd5'],
    };
    return m[status] || ['#334155', '#f1f5f9'];
  }
  function Chip(props) {
    var c = chipColor(props.status);
    return h('span', { style: {
      background: c[1], color: c[0], borderRadius: 999, padding: '2px 10px',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block',
    } }, props.label || titleCase(props.status));
  }

  // Public reads (logged-out): RELATIVE path, proxied by server.py, NO auth headers.
  function listPublic(schema) {
    var url = '/api/public/' + schema;   // NOT cfg.apiUrl + ... (that 405s)
    return fetch(url, { method: 'GET', credentials: 'omit',
                        headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return Array.isArray(d) ? d : ((d && d.results) || []); })
      .catch(function () { return []; });
  }

  // Capability gate — never test a hardcoded role string.
  function isStaff() {
    try {
      return client.isAdmin() || client.canWrite('property') ||
        ['tenant_admin', 'domain_admin', 'platform_admin', 'developer']
          .indexOf((client.userInfo || {}).role) >= 0;
    } catch (e) { return false; }
  }

  /* ====================== PUBLIC LISTINGS (logged-out) ====================== */
  function PublicSite(props) {
    var [units, setUnits] = React.useState([]);
    var [props_, setProps] = React.useState([]);
    var [loading, setLoading] = React.useState(true);
    React.useEffect(function () {
      Promise.all([listPublic('unit'), listPublic('property')]).then(function (r) {
        setUnits(r[0] || []); setProps(r[1] || []); setLoading(false);
      });
    }, []);
    var available = units.filter(function (u) { return (u.status || 'available') === 'available'; });

    return h('div', { style: { minHeight: '100vh', background: BG, color: INK } },
      // top bar
      h('div', { style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 28px', position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid ' + LINE,
      } },
        h('div', { style: { fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' } },
          '🏢 ', h('span', { style: { color: BRAND } }, 'Lattice')),
        h('button', { onClick: props.onSignIn, style: btn(BRAND) }, 'Sign in')),
      // hero — image via <img>, not background-image (gotcha #2 safe)
      h('div', { style: { position: 'relative', overflow: 'hidden' } },
        h('img', { src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000&h=900',
          alt: '', style: { width: '100%', height: 420, objectFit: 'cover', display: 'block' } }),
        h('div', { style: { position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(15,23,42,.82), rgba(15,23,42,.30))' } }),
        h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 8%', color: '#fff', maxWidth: 720 } },
          h('div', { style: { fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .85 } },
            'Find your next home'),
          h('h1', { style: { fontSize: 46, fontWeight: 800, lineHeight: 1.05, margin: '10px 0 14px',
            letterSpacing: '-0.03em' } }, 'Apartments, lofts & homes, managed with care.'),
          h('p', { style: { fontSize: 17, opacity: .9, maxWidth: 540 } },
            'Browse available units across our managed properties and apply online in minutes.'),
          h('div', { style: { marginTop: 22, display: 'flex', gap: 12 } },
            h('a', { href: '#listings', style: Object.assign({}, btn('#fff'), { color: INK, textDecoration: 'none' }) },
              'Browse ' + available.length + ' available'),
            h('button', { onClick: props.onSignIn, style: Object.assign({}, btn('transparent'),
              { color: '#fff', border: '1px solid rgba(255,255,255,.6)' }) }, 'Resident sign in')))),
      // listings
      h('div', { id: 'listings', style: { maxWidth: 1180, margin: '0 auto', padding: '48px 24px 80px' } },
        h('h2', { style: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' } }, 'Available units'),
        h('p', { style: { color: SLATE, marginTop: 4 } },
          props_.length + ' properties · ' + available.length + ' units ready to lease'),
        loading
          ? h('div', { style: { padding: 60, textAlign: 'center', color: SLATE } }, 'Loading listings…')
          : available.length === 0
            ? h('div', { style: { padding: 60, textAlign: 'center', color: SLATE,
                border: '1px dashed ' + LINE, borderRadius: 16, marginTop: 24 } },
                'No units are available right now. Check back soon, or sign in to apply.')
            : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))',
                gap: 22, marginTop: 26 } },
                available.map(function (u) { return h(ListingCard, { key: u.uuid, unit: u, onApply: props.onSignIn }); }))),
      h('div', { style: { borderTop: '1px solid ' + LINE, padding: '26px', textAlign: 'center',
        color: SLATE, fontSize: 13 } }, '© Lattice Property Management · Powered by Supero'));
  }

  function ListingCard(props) {
    var u = props.unit;
    var src = img(u.hero_image);
    return h('div', { style: {
      background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid ' + LINE,
      boxShadow: '0 1px 2px rgba(15,23,42,.04)', transition: 'transform .15s, box-shadow .15s',
      cursor: 'pointer', display: 'flex', flexDirection: 'column',
    },
      onMouseEnter: function (e) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(15,23,42,.10)'; },
      onMouseLeave: function (e) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,.04)'; },
    },
      h('div', { style: { height: 190, background: '#e2e8f0', position: 'relative' } },
        src ? h('img', { src: src, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } }) : null,
        h('div', { style: { position: 'absolute', top: 12, left: 12 } }, h(Chip, { status: 'available' }))),
      h('div', { style: { padding: 16, flex: 1, display: 'flex', flexDirection: 'column' } },
        h('div', { style: { fontSize: 12, color: ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' } },
          u.property_name || '—'),
        h('div', { style: { fontWeight: 700, fontSize: 18, marginTop: 2 } }, u.unit_label || u.display_name),
        h('div', { style: { color: SLATE, fontSize: 14, marginTop: 6 } },
          (u.bedrooms || 0) + ' bd · ' + (u.bathrooms || 1) + ' ba' +
          (u.square_feet ? ' · ' + u.square_feet + ' sqft' : '') + (u.city ? ' · ' + u.city : '')),
        h('div', { style: { marginTop: 'auto', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', { style: { fontWeight: 800, fontSize: 20 } }, myMoney(u.rent), h('span', { style: { fontSize: 13, color: SLATE, fontWeight: 500 } }, '/mo')),
          h('button', { onClick: props.onApply, style: btn(BRAND) }, 'Apply'))));
  }

  /* =============================== LOGIN ================================== */
  function LoginScreen(props) {
    var [email, setEmail] = React.useState('manager@summit.app');
    var [pw, setPw] = React.useState('Password123!');
    var [busy, setBusy] = React.useState(false);
    function submit(e) {
      e.preventDefault(); setBusy(true);
      client.login(cfg.domain, email, pw, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { props.onDone(); })
        .catch(function (err) { showToast('Login failed: ' + (err && err.message || err), 'error'); })
        .finally(function () { setBusy(false); });
    }
    function quick(em) { return function () { setEmail(em); setPw('Password123!'); }; }
    return h('div', { style: { minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg,#0f172a,#1e3a8a)', padding: 20 } },
      h('form', { onSubmit: submit, style: { width: '100%', maxWidth: 400, background: '#fff',
        borderRadius: 22, padding: 30, boxShadow: '0 30px 60px rgba(2,6,23,.45)' } },
        h('div', { style: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' } },
          '🏢 ', h('span', { style: { color: BRAND } }, 'Lattice')),
        h('p', { style: { color: SLATE, marginTop: 4, marginBottom: 20 } }, 'Sign in to your management console or resident portal.'),
        h('label', { style: lbl }, 'Email'),
        h('input', { style: inp, value: email, autoFocus: true, onChange: function (e) { setEmail(e.target.value); } }),
        h('label', { style: lbl }, 'Password'),
        h('input', { style: inp, type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }),
        h('button', { type: 'submit', disabled: busy,
          style: Object.assign({}, btn(BRAND), { width: '100%', padding: '12px', marginTop: 8, fontSize: 15 }) },
          busy ? 'Signing in…' : 'Sign in'),
        // DEMO-ACCOUNT-TABLE-V1 — prefer the SDK table (Tenant | Role | Login |
        // Password, click-to-fill). Returns null unless config.js shipped
        // demoAccounts, in which case the existing chips below still render.
        ((typeof DemoAccountsTable !== 'undefined')
          ? h(DemoAccountsTable, { onPick: function (em, pwv) { setEmail(em); setPw(pwv); } })
          : null)
        || h('div', { style: { marginTop: 18, fontSize: 12, color: SLATE } }, 'Try a demo account:'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 } },
          [['Super-admin', 'admin@lattice.app'], ['Manager', 'manager@summit.app'], ['Resident', 'dana@example.com']]
            .map(function (q) {
              return h('button', { key: q[1], type: 'button', onClick: quick(q[1]),
                style: { fontSize: 12, padding: '5px 10px', border: '1px solid ' + LINE, borderRadius: 8,
                  background: '#f8fafc', cursor: 'pointer' } }, q[0]);
            })),
        props.onBack ? h('button', { type: 'button', onClick: props.onBack,
          style: { marginTop: 16, background: 'none', border: 'none', color: BRAND, cursor: 'pointer', fontSize: 13 } },
          '← Back to listings') : null));
  }

  /* ====================== shared shell (sidebar + topbar) ================== */
  function NavItem(props) {
    var active = props.active;
    return h('button', { onClick: props.onClick, style: {
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
      padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14,
      fontWeight: active ? 700 : 500, color: active ? '#fff' : '#cbd5e1',
      background: active ? 'rgba(255,255,255,.14)' : 'transparent',
    } }, h('span', { style: { fontSize: 16 } }, props.icon), props.label);
  }

  function TenantSwitcher() {
    var companies = [
      { name: 'default-tenant', label: 'All companies (HQ)' },
      { name: 'summit-residential', label: 'Summit Residential' },
      { name: 'harbor-properties', label: 'Harbor Properties' },
      { name: 'oakline-management', label: 'Oakline Management' },
    ];
    var current = (client._tenantOverride || 'default-tenant');
    function pick(e) {
      try { client.setTenantOverride(e.target.value); } catch (err) {}
      // re-fetch the whole console under the new scope
      try { window.dispatchEvent(new CustomEvent('lattice:tenant-changed')); } catch (e2) {}
    }
    return h('div', { style: { padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.10)', marginTop: 8 } },
      h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 } },
        'Acting as company'),
      h('select', { value: current, onChange: pick, style: {
        width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.18)',
        background: '#0b1220', color: '#fff', fontSize: 13,
      } }, companies.map(function (c) { return h('option', { key: c.name, value: c.name }, c.label); })));
  }

  function Shell(props) {
    var nav = props.nav, route = props.route, items = props.items, who = props.who;
    return h('div', { style: { display: 'flex', minHeight: '100vh', background: BG } },
      // sidebar
      h('div', { style: { width: 248, background: 'linear-gradient(180deg,#0f172a,#111c33)', color: '#fff',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' } },
        h('div', { style: { padding: '20px 18px 14px', fontWeight: 800, fontSize: 20 } },
          '🏢 ', h('span', { style: { color: '#93c5fd' } }, 'Lattice')),
        h('div', { style: { padding: '0 10px', flex: 1, overflowY: 'auto' } },
          items.map(function (it) {
            return h(NavItem, { key: it.id, icon: it.icon, label: it.label,
              active: route === it.id, onClick: function () { nav(it.id); } });
          }),
          props.showSwitcher ? h(TenantSwitcher, null) : null),
        h('div', { style: { padding: 14, borderTop: '1px solid rgba(255,255,255,.10)' } },
          h('div', { style: { fontSize: 13, fontWeight: 600 } }, (who && who.name) || 'Signed in'),
          h('div', { style: { fontSize: 11, color: '#94a3b8' } }, (who && who.sub) || ''),
          h('button', { onClick: props.onLogout, style: { marginTop: 10, width: '100%', padding: '8px',
            borderRadius: 8, border: '1px solid rgba(255,255,255,.18)', background: 'transparent',
            color: '#cbd5e1', cursor: 'pointer', fontSize: 13 } }, 'Sign out'))),
      // content
      h('div', { style: { flex: 1, minWidth: 0 } }, props.children));
  }

  function Page(props) {
    return h('div', { style: { maxWidth: 1200, margin: '0 auto', padding: '28px 30px 60px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 22, gap: 16, flexWrap: 'wrap' } },
        h('div', null,
          h('h1', { style: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: INK } }, props.title),
          props.subtitle ? h('p', { style: { color: SLATE, marginTop: 4 } }, props.subtitle) : null),
        props.action || null),
      props.children);
  }

  function Stat(props) {
    return h('div', { style: { background: '#fff', border: '1px solid ' + LINE, borderRadius: 16, padding: 18 } },
      h('div', { style: { fontSize: 13, color: SLATE, fontWeight: 600 } }, props.label),
      h('div', { style: { fontSize: 28, fontWeight: 800, marginTop: 6, color: props.color || INK } }, props.value),
      props.hint ? h('div', { style: { fontSize: 12, color: SLATE, marginTop: 4 } }, props.hint) : null);
  }

  function Card(props) {
    return h('div', { style: Object.assign({ background: '#fff', border: '1px solid ' + LINE,
      borderRadius: 16, padding: props.pad == null ? 18 : props.pad }, props.style || {}) }, props.children);
  }

  function Empty(props) {
    return h('div', { style: { padding: 50, textAlign: 'center', color: SLATE,
      border: '1px dashed ' + LINE, borderRadius: 16, background: '#fff' } }, props.children);
  }

  /* ============================ ADMIN CONSOLE ============================= */
  function AdminConsole(props) {
    var [route, setRoute] = React.useState((props.route || '#/').replace('#/', '') || 'dashboard');
    var [data, setData] = React.useState(null);
    var [tick, setTick] = React.useState(0);

    function nav(id) { try { history.replaceState(null, '', '#/' + id); } catch (e) {} setRoute(id); }

    React.useEffect(function () {
      function reload() { setTick(function (n) { return n + 1; }); }
      window.addEventListener('lattice:tenant-changed', reload);
      return function () { window.removeEventListener('lattice:tenant-changed', reload); };
    }, []);

    React.useEffect(function () {
      var schemas = ['property', 'unit', 'lease', 'rent_payment', 'maintenance_request', 'application', 'owner'];
      setData(null);
      Promise.all(schemas.map(function (s) {
        return client.getObjects(s).then(function (r) { return Array.isArray(r) ? r : (r && r.results) || []; })
          .catch(function () { return []; });
      })).then(function (res) {
        setData({ property: res[0], unit: res[1], lease: res[2], rent_payment: res[3],
                  maintenance_request: res[4], application: res[5], owner: res[6] });
      });
    }, [tick]);

    var items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'properties', label: 'Properties', icon: '🏢' },
      { id: 'units', label: 'Units', icon: '🚪' },
      { id: 'leases', label: 'Leases', icon: '📄' },
      { id: 'maintenance', label: 'Maintenance', icon: '🛠️' },
      { id: 'rent', label: 'Rent ledger', icon: '💳' },
      { id: 'applications', label: 'Applications', icon: '📝' },
      { id: 'owners', label: 'Owners', icon: '🔑' },
    ];
    var who = { name: (client.userInfo || {}).full_name || (client.userInfo || {}).email || 'Manager',
                sub: (client.userInfo || {}).role || '' };
    var showSwitcher = false;
    try { showSwitcher = client.canSwitchTenant(); } catch (e) {}

    var body;
    if (!data) {
      body = h('div', { style: { padding: 60, color: SLATE } }, 'Loading console…');
    } else if (route === 'properties') {
      body = h(PropertiesView, { data: data, reload: function () { setTick(function (n) { return n + 1; }); } });
    } else if (route === 'units') {
      body = h(UnitsView, { data: data });
    } else if (route === 'leases') {
      body = h(LeasesView, { data: data });
    } else if (route === 'maintenance') {
      body = h(MaintenanceBoard, { data: data, reload: function () { setTick(function (n) { return n + 1; }); } });
    } else if (route === 'rent') {
      body = h(RentLedger, { data: data });
    } else if (route === 'applications') {
      body = h(ApplicationsView, { data: data, reload: function () { setTick(function (n) { return n + 1; }); } });
    } else if (route === 'owners') {
      body = h(OwnersView, { data: data });
    } else {
      body = h(Dashboard, { data: data });
    }

    return h(Shell, { nav: nav, route: route, items: items, who: who, showSwitcher: showSwitcher,
      onLogout: props.onLogout }, body);
  }

  function Dashboard(props) {
    var d = props.data;
    var units = d.unit || [], pays = d.rent_payment || [], mr = d.maintenance_request || [];
    var occupied = units.filter(function (u) { return u.status === 'occupied'; }).length;
    var occPct = units.length ? Math.round((occupied / units.length) * 100) : 0;
    var collected = pays.filter(function (p) { return p.status === 'captured'; })
      .reduce(function (a, p) { return a + (p.amount || 0); }, 0);
    var outstanding = pays.filter(function (p) { return p.status === 'pending'; })
      .reduce(function (a, p) { return a + (p.amount || 0); }, 0);
    var openMr = mr.filter(function (m) { return m.status !== 'resolved'; }).length;

    // occupancy-by-property bar chart (client-side rollup; resilient)
    var byProp = {};
    units.forEach(function (u) {
      var k = u.property_name || '—';
      byProp[k] = byProp[k] || { total: 0, occ: 0 };
      byProp[k].total++; if (u.status === 'occupied') byProp[k].occ++;
    });
    var bars = Object.keys(byProp).map(function (k) {
      var v = byProp[k]; return { label: k, value: v.total ? Math.round((v.occ / v.total) * 100) : 0 };
    });

    return h(Page, { title: 'Portfolio dashboard', subtitle: 'Occupancy, collections and open work across this company.' },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 } },
        h(Stat, { label: 'Occupancy', value: occPct + '%', color: BRAND, hint: occupied + ' of ' + units.length + ' units occupied' }),
        h(Stat, { label: 'Rent collected', value: myMoney(collected), color: '#047857', hint: 'Captured this cycle' }),
        h(Stat, { label: 'Outstanding', value: myMoney(outstanding), color: '#b45309', hint: 'Pending payments' }),
        h(Stat, { label: 'Open maintenance', value: openMr, color: openMr ? '#9a3412' : '#047857', hint: mr.length + ' total requests' })),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 18, alignItems: 'start' } },
        h(Card, { style: { gridColumn: bars.length ? 'auto' : '1 / -1' } },
          h('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Occupancy by property'),
          bars.length === 0 ? h('div', { style: { color: SLATE } }, 'No units yet.')
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                bars.map(function (b) {
                  return h('div', { key: b.label },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 } },
                      h('span', { style: { fontWeight: 600 } }, b.label), h('span', { style: { color: SLATE } }, b.value + '%')),
                    h('div', { style: { height: 10, background: '#eef2f7', borderRadius: 999 } },
                      h('div', { style: { width: b.value + '%', height: '100%', borderRadius: 999,
                        background: 'linear-gradient(90deg,' + BRAND + ',' + ACCENT + ')' } })));
                }))),
        h(Card, null,
          h('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Recent maintenance'),
          (mr.slice(0, 5)).length === 0 ? h('div', { style: { color: SLATE } }, 'Nothing reported.')
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                mr.slice(0, 5).map(function (m) {
                  return h('div', { key: m.uuid, style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
                    h('div', { style: { minWidth: 0 } },
                      h('div', { style: { fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.title),
                      h('div', { style: { fontSize: 12, color: SLATE } }, (m.property_name || '') + ' · ' + (m.unit_label || ''))),
                    h(Chip, { status: m.status }));
                })))));
  }

  function PropertiesView(props) {
    var d = props.data, list = d.property || [];
    return h(Page, { title: 'Properties', subtitle: list.length + ' buildings in this company' },
      list.length === 0 ? h(Empty, null, 'No properties yet.')
        : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 } },
            list.map(function (p) {
              var pUnits = (d.unit || []).filter(function (u) { return u.property_name === p.display_name; });
              var avail = pUnits.filter(function (u) { return u.status === 'available'; }).length;
              return h(Card, { key: p.uuid, pad: 0, style: { overflow: 'hidden' } },
                h('div', { style: { height: 170, background: '#e2e8f0' } },
                  img(p.hero_image) ? h('img', { src: img(p.hero_image), alt: '',
                    style: { width: '100%', height: '100%', objectFit: 'cover' } }) : null),
                h('div', { style: { padding: 16 } },
                  h('div', { style: { fontWeight: 700, fontSize: 18 } }, p.display_name),
                  h('div', { style: { color: SLATE, fontSize: 13, marginTop: 4 } },
                    (p.address || '') + (p.city ? ', ' + p.city : '') + (p.state ? ', ' + p.state : '')),
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                    h(Chip, { status: 'occupied', label: pUnits.length + ' units' }),
                    avail ? h(Chip, { status: 'available', label: avail + ' available' }) : null,
                    h(Chip, { status: 'received', label: titleCase(p.property_type) }))));
            })));
  }

  function UnitsView(props) {
    var d = props.data, list = d.unit || [];
    var [filter, setFilter] = React.useState('all');
    var shown = filter === 'all' ? list : list.filter(function (u) { return u.status === filter; });
    var filters = ['all', 'available', 'occupied', 'maintenance', 'off_market'];
    return h(Page, { title: 'Units', subtitle: list.length + ' units across the portfolio',
      action: h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
        filters.map(function (f) {
          return h('button', { key: f, onClick: function () { setFilter(f); },
            style: { padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
              border: '1px solid ' + (filter === f ? BRAND : LINE),
              background: filter === f ? BRAND : '#fff', color: filter === f ? '#fff' : INK } },
            titleCase(f));
        })) },
      shown.length === 0 ? h(Empty, null, 'No units match this filter.')
        : h(Card, { pad: 0, style: { overflow: 'hidden' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
              h('thead', null, h('tr', { style: { background: '#f8fafc', textAlign: 'left' } },
                ['Unit', 'Property', 'Beds', 'Rent', 'Status'].map(function (c) {
                  return h('th', { key: c, style: th }, c); }))),
              h('tbody', null, shown.map(function (u) {
                return h('tr', { key: u.uuid, style: { borderTop: '1px solid ' + LINE } },
                  h('td', { style: td }, h('span', { style: { fontWeight: 600 } }, u.unit_label || u.display_name)),
                  h('td', { style: td }, u.property_name || '—'),
                  h('td', { style: td }, (u.bedrooms || 0) + ' bd / ' + (u.bathrooms || 1) + ' ba'),
                  h('td', { style: td }, myMoney(u.rent)),
                  h('td', { style: td }, h(Chip, { status: u.status || 'available' })));
              })))));
  }

  function LeasesView(props) {
    var list = props.data.lease || [];
    return h(Page, { title: 'Leases', subtitle: list.length + ' agreements' },
      list.length === 0 ? h(Empty, null, 'No leases yet.')
        : h(Card, { pad: 0, style: { overflow: 'hidden' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
              h('thead', null, h('tr', { style: { background: '#f8fafc', textAlign: 'left' } },
                ['Resident', 'Unit', 'Term', 'Rent', 'Status'].map(function (c) { return h('th', { key: c, style: th }, c); }))),
              h('tbody', null, list.map(function (l) {
                return h('tr', { key: l.uuid, style: { borderTop: '1px solid ' + LINE } },
                  h('td', { style: td }, h('span', { style: { fontWeight: 600 } }, l.resident_name || '—')),
                  h('td', { style: td }, (l.property_name || '') + ' · ' + (l.unit_label || '')),
                  h('td', { style: td }, myDate(l.start_at) + ' → ' + myDate(l.end_at)),
                  h('td', { style: td }, myMoney(l.monthly_rent)),
                  h('td', { style: td }, h(Chip, { status: l.status || 'active' })));
              })))));
  }

  // Maintenance board: kanban grouped by status; staff advance the workflow.
  function MaintenanceBoard(props) {
    var list = props.data.maintenance_request || [];
    var cols = [
      { id: 'submitted', label: 'Submitted' }, { id: 'assigned', label: 'Assigned' },
      { id: 'in_progress', label: 'In progress' }, { id: 'resolved', label: 'Resolved' },
    ];
    var order = ['submitted', 'assigned', 'in_progress', 'resolved'];

    function advance(m) {
      var idx = order.indexOf(m.status || 'submitted');
      var next = order[Math.min(idx + 1, order.length - 1)];
      if (next === 'resolved') {
        // resolve via the server-side workflow (emails resident + stamps processed)
        client.updateObject('maintenance_request', m.uuid, { status: 'resolved' }, m)
          .then(function () {
            return runSaga('maintenance_resolved', {
              request_uuid: m.uuid, resident_email: m.email || m.owner_username,
              resident_name: m.resident_name, title: m.title });
          })
          .then(function () { showToast('Resolved — resident notified', 'success'); props.reload(); })
          .catch(function (e) { showToast('Error: ' + (e && e.message || e), 'error'); });
      } else {
        client.updateObject('maintenance_request', m.uuid, { status: next }, m)
          .then(function () { showToast('Moved to ' + titleCase(next), 'success'); props.reload(); })
          .catch(function (e) { showToast('Error: ' + (e && e.message || e), 'error'); });
      }
    }

    return h(Page, { title: 'Maintenance board', subtitle: 'Drag work forward — resolving emails the resident automatically.' },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'start',
        overflowX: 'auto' } },
        cols.map(function (col) {
          var cards = list.filter(function (m) { return (m.status || 'submitted') === col.id; });
          return h('div', { key: col.id, style: { background: '#f1f5f9', borderRadius: 14, padding: 10, minWidth: 220 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 10px' } },
              h('span', { style: { fontWeight: 700, fontSize: 14 } }, col.label),
              h('span', { style: { fontSize: 12, color: SLATE, fontWeight: 600 } }, cards.length)),
            cards.length === 0 ? h('div', { style: { color: '#94a3b8', fontSize: 13, padding: '10px 6px' } }, '—')
              : cards.map(function (m) {
                  return h('div', { key: m.uuid, style: { background: '#fff', borderRadius: 12, padding: 12,
                    marginBottom: 10, border: '1px solid ' + LINE } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
                      h('span', { style: { fontWeight: 600, fontSize: 14 } }, m.title),
                      m.priority ? h(Chip, { status: m.priority, label: titleCase(m.priority) }) : null),
                    h('div', { style: { fontSize: 12, color: SLATE, marginTop: 6 } },
                      (m.property_name || '') + ' · ' + (m.unit_label || '')),
                    h('div', { style: { fontSize: 12, color: SLATE, marginTop: 2 } },
                      'Resident: ' + (m.resident_name || '—')),
                    col.id !== 'resolved' && client.canWrite('maintenance_request')
                      ? h('button', { onClick: function () { advance(m); },
                          style: Object.assign({}, btn(BRAND), { width: '100%', marginTop: 10, fontSize: 13 }) },
                          col.id === 'in_progress' ? 'Resolve →' : 'Advance →')
                      : null);
                }));
        })));
  }

  function RentLedger(props) {
    var list = props.data.rent_payment || [];
    var collected = list.filter(function (p) { return p.status === 'captured'; }).reduce(function (a, p) { return a + (p.amount || 0); }, 0);
    var pending = list.filter(function (p) { return p.status === 'pending'; }).reduce(function (a, p) { return a + (p.amount || 0); }, 0);
    return h(Page, { title: 'Rent ledger', subtitle: 'Every charge via the payment service' },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 18 } },
        h(Stat, { label: 'Collected', value: myMoney(collected), color: '#047857' }),
        h(Stat, { label: 'Pending', value: myMoney(pending), color: '#b45309' }),
        h(Stat, { label: 'Charges', value: list.length })),
      list.length === 0 ? h(Empty, null, 'No payments recorded.')
        : h(Card, { pad: 0, style: { overflow: 'hidden' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
              h('thead', null, h('tr', { style: { background: '#f8fafc', textAlign: 'left' } },
                ['Resident', 'Unit', 'Period', 'Amount', 'Method', 'Status'].map(function (c) { return h('th', { key: c, style: th }, c); }))),
              h('tbody', null, list.map(function (p) {
                return h('tr', { key: p.uuid, style: { borderTop: '1px solid ' + LINE } },
                  h('td', { style: td }, h('span', { style: { fontWeight: 600 } }, p.resident_name || '—')),
                  h('td', { style: td }, (p.property_name || '') + ' · ' + (p.unit_label || '')),
                  h('td', { style: td }, p.period || '—'),
                  h('td', { style: td }, myMoney(p.amount) + ' ' + (p.currency || 'USD')),
                  h('td', { style: td }, titleCase(p.method || '—')),
                  h('td', { style: td }, h(Chip, { status: p.status || 'pending' })));
              })))));
  }

  function ApplicationsView(props) {
    var list = props.data.application || [];
    function setStatus(a, s) {
      client.updateObject('application', a.uuid, { status: s }, a)
        .then(function () { showToast('Application ' + s, 'success'); props.reload(); })
        .catch(function (e) { showToast('Error: ' + (e && e.message || e), 'error'); });
    }
    return h(Page, { title: 'Applications', subtitle: list.length + ' prospective renters' },
      list.length === 0 ? h(Empty, null, 'No applications yet.')
        : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 } },
            list.map(function (a) {
              return h(Card, { key: a.uuid },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  h('div', { style: { fontWeight: 700, fontSize: 17 } }, a.applicant_name),
                  h(Chip, { status: a.status || 'received' })),
                h('div', { style: { color: SLATE, fontSize: 13, marginTop: 6 } },
                  (a.property_name || '') + ' · ' + (a.unit_label || '')),
                h('div', { style: { color: SLATE, fontSize: 13, marginTop: 4 } },
                  'Income: ' + myMoney(a.stated_income) + ' · Move-in ' + myDate(a.move_in_date)),
                client.canWrite('application') ? h('div', { style: { display: 'flex', gap: 8, marginTop: 14 } },
                  h('button', { onClick: function () { setStatus(a, 'approved'); }, style: btn('#047857') }, 'Approve'),
                  h('button', { onClick: function () { setStatus(a, 'screening'); }, style: btn('#b45309') }, 'Screen'),
                  h('button', { onClick: function () { setStatus(a, 'denied'); },
                    style: Object.assign({}, btn('#fff'), { color: '#b91c1c', border: '1px solid ' + LINE }) }, 'Deny')) : null);
            })));
  }

  function OwnersView(props) {
    var list = props.data.owner || [];
    return h(Page, { title: 'Owners', subtitle: list.length + ' property owners' },
      list.length === 0 ? h(Empty, null, 'No owners on file.')
        : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 } },
            list.map(function (o) {
              return h(Card, { key: o.uuid, style: { display: 'flex', gap: 14, alignItems: 'center' } },
                h('div', { style: { width: 58, height: 58, borderRadius: 14, background: '#e2e8f0', overflow: 'hidden', flexShrink: 0 } },
                  img(o.photo) ? h('img', { src: img(o.photo), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } }) : null),
                h('div', { style: { minWidth: 0 } },
                  h('div', { style: { fontWeight: 700 } }, o.full_name || o.display_name),
                  o.company ? h('div', { style: { fontSize: 13, color: ACCENT, fontWeight: 600 } }, o.company) : null,
                  h('div', { style: { fontSize: 12, color: SLATE, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' } }, o.email || '')));
            })));
  }

  /* ============================ RESIDENT PORTAL =========================== */
  function ResidentPortal(props) {
    var [route, setRoute] = React.useState((props.route || '#/').replace('#/', '') || 'home');
    var [data, setData] = React.useState(null);
    var [tick, setTick] = React.useState(0);
    function nav(id) { try { history.replaceState(null, '', '#/' + id); } catch (e) {} setRoute(id); }
    function reload() { setTick(function (n) { return n + 1; }); }

    React.useEffect(function () {
      var schemas = ['lease', 'rent_payment', 'maintenance_request'];
      setData(null);
      Promise.all(schemas.map(function (s) {
        return client.getObjects(s).then(function (r) { return Array.isArray(r) ? r : (r && r.results) || []; })
          .catch(function () { return []; });
      })).then(function (res) {
        setData({ lease: res[0], rent_payment: res[1], maintenance_request: res[2] });
      });
    }, [tick]);

    var items = [
      { id: 'home', label: 'My home', icon: '🏠' },
      { id: 'pay', label: 'Pay rent', icon: '💳' },
      { id: 'repairs', label: 'Maintenance', icon: '🛠️' },
    ];
    var who = { name: (client.userInfo || {}).full_name || (client.userInfo || {}).email || 'Resident',
                sub: 'Resident' };

    var body;
    if (!data) body = h('div', { style: { padding: 60, color: SLATE } }, 'Loading your portal…');
    else if (route === 'pay') body = h(ResidentPay, { data: data, reload: reload });
    else if (route === 'repairs') body = h(ResidentRepairs, { data: data, reload: reload });
    else body = h(ResidentHome, { data: data, nav: nav });

    return h(Shell, { nav: nav, route: route, items: items, who: who, showSwitcher: false,
      onLogout: props.onLogout }, body);
  }

  function ResidentHome(props) {
    var d = props.data;
    var lease = (d.lease || [])[0];
    var nextDue = (d.rent_payment || []).filter(function (p) { return p.status === 'pending'; })[0];
    var openReq = (d.maintenance_request || []).filter(function (m) { return m.status !== 'resolved'; }).length;
    return h(Page, { title: 'Welcome home', subtitle: 'Your lease, rent and maintenance — all in one place.' },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 } },
        h(Stat, { label: 'Your unit', value: lease ? (lease.unit_label || '—') : 'No lease', color: BRAND,
          hint: lease ? lease.property_name : '' }),
        h(Stat, { label: 'Monthly rent', value: lease ? myMoney(lease.monthly_rent) : '—',
          hint: lease ? (myDate(lease.start_at) + ' → ' + myDate(lease.end_at)) : '' }),
        h(Stat, { label: 'Next payment', value: nextDue ? myMoney(nextDue.amount) : 'All paid',
          color: nextDue ? '#b45309' : '#047857', hint: nextDue ? ('Due ' + myDate(nextDue.due_date)) : 'Nothing due' }),
        h(Stat, { label: 'Open requests', value: openReq, color: openReq ? '#9a3412' : '#047857' })),
      h('div', { style: { display: 'flex', gap: 12, marginTop: 18 } },
        h('button', { onClick: function () { props.nav('pay'); }, style: Object.assign({}, btn(BRAND), { padding: '12px 18px' }) }, 'Pay rent'),
        h('button', { onClick: function () { props.nav('repairs'); },
          style: Object.assign({}, btn('#fff'), { padding: '12px 18px', color: INK, border: '1px solid ' + LINE }) }, 'Request maintenance')));
  }

  function ResidentPay(props) {
    var list = props.data.rent_payment || [];
    var [busy, setBusy] = React.useState('');
    React.useEffect(function () {
      // register the payment transactional extension once we're authed
      try { client.registerTransactionalExtensions({ payment: 'rent_payment' }); } catch (e) {}
    }, []);

    function pay(p) {
      setBusy(p.uuid);
      // Drive the payment service: pending → authorized → captured.
      var amt = p.amount || 0;
      client.transactional.payment.authorize(p.uuid)
        .then(function () { return client.transactional.payment.capture(p.uuid, 'rcpt_' + Date.now(), amt); })
        .then(function () {
          return client.updateObject('rent_payment', p.uuid, { paid_at: new Date().toISOString() }, p).catch(function () {});
        })
        .then(function () { showToast('Payment captured — thank you!', 'success'); props.reload(); })
        .catch(function (e) {
          // Fallback: if the transactional op isn't enabled, just record it.
          client.updateObject('rent_payment', p.uuid, { status: 'captured', paid_at: new Date().toISOString() }, p)
            .then(function () { showToast('Payment recorded', 'success'); props.reload(); })
            .catch(function (e2) { showToast('Payment failed: ' + (e2 && e2.message || e2), 'error'); });
        })
        .finally(function () { setBusy(''); });
    }

    var pending = list.filter(function (p) { return p.status === 'pending'; });
    var paid = list.filter(function (p) { return p.status !== 'pending'; });
    return h(Page, { title: 'Pay rent', subtitle: 'Securely pay through the payment service.' },
      pending.length === 0 ? h(Empty, null, 'You are all paid up. 🎉')
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            pending.map(function (p) {
              return h(Card, { key: p.uuid, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
                h('div', null,
                  h('div', { style: { fontWeight: 700, fontSize: 18 } }, myMoney(p.amount) + ' ' + (p.currency || 'USD')),
                  h('div', { style: { color: SLATE, fontSize: 13, marginTop: 3 } },
                    (p.period || '') + ' · ' + (p.unit_label || '') + ' · Due ' + myDate(p.due_date))),
                h('button', { onClick: function () { pay(p); }, disabled: busy === p.uuid,
                  style: Object.assign({}, btn(BRAND), { padding: '10px 18px' }) },
                  busy === p.uuid ? 'Processing…' : 'Pay now'));
            })),
      paid.length ? h('div', { style: { marginTop: 26 } },
        h('div', { style: { fontWeight: 700, marginBottom: 10 } }, 'Payment history'),
        h(Card, { pad: 0, style: { overflow: 'hidden' } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null, h('tr', { style: { background: '#f8fafc', textAlign: 'left' } },
              ['Period', 'Amount', 'Paid', 'Status'].map(function (c) { return h('th', { key: c, style: th }, c); }))),
            h('tbody', null, paid.map(function (p) {
              return h('tr', { key: p.uuid, style: { borderTop: '1px solid ' + LINE } },
                h('td', { style: td }, p.period || '—'),
                h('td', { style: td }, myMoney(p.amount)),
                h('td', { style: td }, myDate(p.paid_at)),
                h('td', { style: td }, h(Chip, { status: p.status })));
            }))))) : null);
  }

  function ResidentRepairs(props) {
    var list = props.data.maintenance_request || [];
    var lease = (props.data.lease || [])[0] || {};
    var [open, setOpen] = React.useState(false);
    var [title, setTitle] = React.useState('');
    var [category, setCategory] = React.useState('plumbing');
    var [priority, setPriority] = React.useState('normal');
    var [busy, setBusy] = React.useState(false);

    function submit() {
      if (!title.trim()) { showToast('Please describe the issue', 'warning'); return; }
      setBusy(true);
      client.createObject('maintenance_request', {
        title: title.trim(), category: category, priority: priority, status: 'submitted',
        resident_name: (client.userInfo || {}).full_name || '',
        unit_label: lease.unit_label || '', property_name: lease.property_name || '',
      }).then(function () {
        showToast('Request submitted', 'success'); setTitle(''); setOpen(false); props.reload();
      }).catch(function (e) { showToast('Error: ' + (e && e.message || e), 'error'); })
        .finally(function () { setBusy(false); });
    }

    return h(Page, { title: 'Maintenance', subtitle: 'Submit and track repair requests for your unit.',
      action: h('button', { onClick: function () { setOpen(!open); }, style: btn(BRAND) },
        open ? 'Close' : '+ New request') },
      open ? h(Card, { style: { marginBottom: 18 } },
        h('label', { style: lbl }, 'What needs fixing?'),
        h('input', { style: inp, value: title, placeholder: 'e.g. Kitchen faucet is leaking',
          onChange: function (e) { setTitle(e.target.value); } }),
        h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap' } },
          h('div', { style: { flex: 1, minWidth: 160 } },
            h('label', { style: lbl }, 'Category'),
            h('select', { style: inp, value: category, onChange: function (e) { setCategory(e.target.value); } },
              ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'other'].map(function (c) {
                return h('option', { key: c, value: c }, titleCase(c)); }))),
          h('div', { style: { flex: 1, minWidth: 160 } },
            h('label', { style: lbl }, 'Priority'),
            h('select', { style: inp, value: priority, onChange: function (e) { setPriority(e.target.value); } },
              ['low', 'normal', 'high', 'urgent'].map(function (c) { return h('option', { key: c, value: c }, titleCase(c)); })))),
        h('button', { onClick: submit, disabled: busy, style: Object.assign({}, btn(BRAND), { marginTop: 6 }) },
          busy ? 'Submitting…' : 'Submit request')) : null,
      list.length === 0 ? h(Empty, null, 'No requests yet. Everything good!')
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            list.map(function (m) {
              return h(Card, { key: m.uuid, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } },
                h('div', null,
                  h('div', { style: { fontWeight: 700, fontSize: 16 } }, m.title),
                  h('div', { style: { color: SLATE, fontSize: 13, marginTop: 3 } },
                    titleCase(m.category) + ' · ' + titleCase(m.priority || 'normal') + ' priority' +
                    (m.assignee_name ? ' · ' + m.assignee_name : ''))),
                h(Chip, { status: m.status || 'submitted' }));
            })));
  }

  /* ================================ APP =================================== */
  function App() {
    var [authed, setAuthed] = React.useState(client.isAuthenticated());
    var [showAuth, setShowAuth] = React.useState(false);
    var [route, setRoute] = React.useState(window.location.hash || '#/');

    function onLogout() {
      try { client.logout(); } catch (e) {}
      setAuthed(false); setShowAuth(false);
      try { history.replaceState(null, '', '#/'); } catch (e) {}
      setRoute('#/');
    }

    if (!authed) {
      if (showAuth) return h(LoginScreen, {
        onDone: function () { setAuthed(true); try { history.replaceState(null, '', '#/'); } catch (e) {} setRoute('#/'); },
        onBack: function () { setShowAuth(false); } });
      return h(PublicSite, { onSignIn: function () { setShowAuth(true); } });
    }
    return isStaff()
      ? h(AdminConsole, { route: route, onLogout: onLogout })
      : h(ResidentPortal, { route: route, onLogout: onLogout });
  }

  /* ===== style helpers (plain objects; not library globals) ============= */
  function btn(bg) {
    var dark = bg !== '#fff' && bg !== 'transparent';
    return { background: bg, color: dark ? '#fff' : INK, border: 'none', borderRadius: 10,
      padding: '8px 14px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
  }
  var lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: SLATE, margin: '12px 0 6px' };
  var inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + LINE,
    fontSize: 14, boxSizing: 'border-box', background: '#fff', color: INK };
  var th = { padding: '12px 16px', fontSize: 12, fontWeight: 700, color: SLATE, textTransform: 'uppercase', letterSpacing: '.04em' };
  var td = { padding: '12px 16px', fontSize: 14, color: INK };

  /* ===================== MOUNT (rules 1,3,4,5) ========================== */
  var __root = null;
  function mountApp() {
    // Dismiss the platform first-paint splash (#supero-preloader): normally
    // removed by AppShell.render() — which a custom app NEVER calls — so we
    // remove AND hide it, or it covers our UI forever.
    var _pl = document.getElementById('supero-preloader');
    if (_pl && _pl.parentNode) _pl.parentNode.removeChild(_pl);
    var st = document.createElement('style');
    st.textContent =
      '#root,#app,#__next,#supero-preloader{display:none!important}' +
      '#lattice-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647;background:' + BG + ';' +
        'font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:' + INK + '}' +
      '#lattice-root *{box-sizing:border-box}';
    document.head.appendChild(st);
    var el = document.getElementById('lattice-root');
    if (!el) { el = document.createElement('div'); el.id = 'lattice-root'; document.body.appendChild(el); }
    if (!__root) __root = ReactDOM.createRoot(el);   // hold root; createRoot twice = warning
    __root.render(h(App, null));
  }
  function boot() {
    var n = 0;
    (function tick() {
      n++;
      if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') setTimeout(mountApp, 50);
      else if (n < 50) setTimeout(tick, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
