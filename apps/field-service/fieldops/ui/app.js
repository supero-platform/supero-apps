/* FieldOps — full custom front end.
 * One login, three personas: Customer · Technician · Dispatcher.
 * Verified transactional ops/states (appointment, approval, document_signature,
 * payment, inventory, recurring_plan). All I/O via locked client.* / services.*. */
(function () {
  var h = React.createElement;
  var cfg = window.__SUPERO_CONFIG || {};

  /* ============================ brand / theme ============================ */
  var NAVY = '#14253d', STEEL = '#2c6fb0', AMBER = '#f5a623', GREEN = '#1f9d57', RED = '#c0392b';
  var PAPER = '#f4f6f9', INK = '#1a2230', MUTED = '#5b6675', LINE = '#e2e7ee', SKY = '#eaf2fb';
  var DISPLAY = "'Sora', system-ui, sans-serif", BODY = "'Inter', system-ui, sans-serif";

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

  function injectChrome() {
    if (document.getElementById('fo-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'fo-chrome';
    st.textContent =
      '*{box-sizing:border-box}#myapp-root{font-family:' + BODY + ';color:' + INK + ';background:' + PAPER + '}' +
      '.fo-display{font-family:' + DISPLAY + '}' +
      '.fo-card{background:#fff;border:1px solid ' + LINE + ';border-radius:16px;transition:transform .15s ease,box-shadow .15s ease}' +
      '.fo-card:hover{transform:translateY(-2px);box-shadow:0 14px 32px -20px rgba(20,37,61,.5)}' +
      '.fo-fade{animation:fofade .4s ease both}@keyframes fofade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}' +
      '.fo-rise{animation:forise .3s cubic-bezier(.2,.8,.2,1) both}@keyframes forise{from{opacity:0;transform:translateY(12px)}to{opacity:1}}' +
      '.fo-scroll::-webkit-scrollbar{height:8px;width:8px}.fo-scroll::-webkit-scrollbar-thumb{background:' + LINE + ';border-radius:8px}' +
      '.fo-link{cursor:pointer}.fo-link:hover{opacity:.85}';
    document.head.appendChild(st);
  }

  /* ============================== helpers =============================== */
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function usd(n) { try { return formatCurrency(Number(n) || 0); } catch (e) { return '$' + (Number(n) || 0).toFixed(2); } }
  function num(n) { try { return formatNumber(Number(n) || 0); } catch (e) { return String(Math.round(Number(n) || 0)); } }
  function fmtDate(s) { try { return formatDate(s); } catch (e) { return s ? String(s).slice(0, 10) : ''; } }
  function dayStr(s) { return s ? String(s).slice(0, 10) : ''; }
  function timeStr(s) { try { return new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }
  function sumBy(arr, f) { return (arr || []).reduce(function (a, x) { return a + (Number(f(x)) || 0); }, 0); }
  function groupBy(arr, f) { var m = {}; (arr || []).forEach(function (x) { var k = f(x) || '—'; (m[k] = m[k] || []).push(x); }); return m; }
  function asArr(d) { return Array.isArray(d) ? d : ((d && d.results) || []); }
  function uname() { try { return (client.userInfo || {}).email || ''; } catch (e) { return ''; } }
  function pub(schema) {
    return fetch('/api/public/' + schema, { method: 'GET', credentials: 'omit', headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { return asArr(d); })
      .catch(function () { try { return Promise.resolve(client.getObjects(schema)).then(asArr); } catch (e) { return []; } });
  }
  function getAll(schema) { try { return Promise.resolve(client.getObjects(schema)).then(asArr); } catch (e) { return Promise.resolve([]); } }
  function isStaff() {
    try { return client.isAdmin() || client.canWrite('appointment') && (client.userInfo || {}).role !== 'tenant_user' ||
      ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
  }
  function aiText(r) { r = (r && r.output) || r || {}; return r.generated_text || r.text || r.completion || r.content || r.message || ''; }

  // transactional driver — typed accessor → execute (with <svc>_uuid input) → CRUD fallback.
  var ACCESSOR = { loyalty_points: 'loyaltyPoints', recurring_plan: 'recurringPlan', document_signature: 'documentSignature' };
  function doTxn(serviceId, op, uuid, rest) {
    rest = rest || [];
    try {
      var t = client.transactional || {};
      var acc = t[ACCESSOR[serviceId] || serviceId];
      if (acc && typeof acc[op] === 'function') return Promise.resolve(acc[op].apply(acc, [uuid].concat(rest)));
      if (typeof t.execute === 'function') {
        var input = {}; input[serviceId + '_uuid'] = uuid; input.record_uuid = uuid;
        if (rest[0] != null) input.amount = rest[0];
        return Promise.resolve(t.execute(serviceId, op, input));
      }
      return Promise.reject(new Error('transactional unavailable'));
    } catch (e) { return Promise.reject(e); }
  }
  function transition(serviceId, op, record, schema, nextStatus, rest) {
    return Promise.resolve(doTxn(serviceId, op, record.uuid, rest)).then(function (res) {
      if (res && res.success === false) throw Object.assign(new Error(res.error || 'failed'), { envelope: res });
      return res;
    }).catch(function (e) {
      if (e && e.isStateTransitionError) throw e;
      // HONEST-FALLBACK-V1 — a raw status write standing in for a FAILED
      // transactional call used to return {success:true}, indistinguishable from
      // the real thing, so a payment/approval/signature step could be reported as
      // done when its service never ran. The fallback stays so a demo keeps
      // moving; it now says what it actually did.
      return client.updateObject(schema, record.uuid, { status: nextStatus }, record)
        .then(function () {
          try { showToast('The ' + serviceId + ' service did not respond — the status was set directly, WITHOUT running its checks (' + ((e && e.message) || 'service error') + ')', 'warning'); } catch (t) {}
          return { success: true, fallback: true };
        }).catch(function () { throw e; });
    });
  }
  function txnErr(e) {
    if (e && e.isStateTransitionError) showToast('Not allowed from current state' + (e.currentState ? ' (' + e.currentState + ')' : ''), 'error');
    else if (e && (e.isNotImported || e.isNotConfigured)) showToast('That service is not enabled for this project', 'error');
    else showToast('Could not update: ' + ((e && e.message) || e), 'error');
  }

  // Documented next-actions (verified manifests). Drives action buttons.
  var STEPS = {
    appointment: { requested: [['schedule', 'Confirm & dispatch', 'confirmed']], confirmed: [['complete', 'Mark complete', 'completed'], ['cancel', 'Cancel', 'cancelled']] },
    approval:    { draft: [['submit', 'Send to customer', 'pending']], pending: [['approveStep', 'Approve', 'approved'], ['rejectStep', 'Decline', 'rejected']] },
    payment:     { pending: [['authorize', 'Authorize', 'authorized']], authorized: [['capture', 'Capture', 'captured']] },
  };

  var PILL = {
    requested: ['#8a6d1f', '#fbf1d2'], pending: ['#8a6d1f', '#fbf1d2'], draft: ['#8a6d1f', '#fbf1d2'], inactive: ['#5b6675', '#e6eaf0'],
    confirmed: ['#1f5f8a', '#dcebf7'], authorized: ['#1f5f8a', '#dcebf7'], awaiting_signatures: ['#1f5f8a', '#dcebf7'], held: ['#1f5f8a', '#dcebf7'], active: ['#1f6b3f', '#d8efdf'],
    completed: ['#1f6b3f', '#d8efdf'], captured: ['#1f6b3f', '#d8efdf'], approved: ['#1f6b3f', '#d8efdf'], signed: ['#1f6b3f', '#d8efdf'], committed: ['#1f6b3f', '#d8efdf'], paid: ['#1f6b3f', '#d8efdf'],
    cancelled: ['#8a3b2c', '#f6ded6'], voided: ['#8a3b2c', '#f6ded6'], rejected: ['#8a3b2c', '#f6ded6'], declined: ['#8a3b2c', '#f6ded6'], no_show: ['#8a3b2c', '#f6ded6'],
  };
  function pillStyle(st) { var c = PILL[String(st).toLowerCase()] || ['#5b6675', '#e6eaf0']; return { color: c[0], background: c[1] }; }

  /* ============================== UI atoms ============================== */
  function Img(props) {
    var s = React.useState(false), bad = s[0], setBad = s[1];
    var src = bad ? null : (function () { try { return resolveImageUrl(props.src); } catch (e) { return null; } })();
    if (!src) return h('div', { className: props.className, style: Object.assign({ background: 'linear-gradient(135deg,' + STEEL + ',' + NAVY + ')' }, props.style) }, props.fallback || null);
    return h('img', { src: src, alt: props.alt || '', className: props.className, style: props.style, loading: 'lazy', onError: function () { setBad(true); } });
  }
  function Btn(props) {
    var v = props.variant || 'solid';
    var base = { borderRadius: 10, fontWeight: 600, fontSize: props.sm ? 13 : 14, padding: props.sm ? '7px 13px' : '11px 18px', cursor: props.disabled ? 'not-allowed' : 'pointer', border: '1px solid transparent', transition: 'all .15s', opacity: props.disabled ? .55 : 1, whiteSpace: 'nowrap' };
    var skin = v === 'solid' ? { background: NAVY, color: '#fff' }
      : v === 'steel' ? { background: STEEL, color: '#fff' }
      : v === 'amber' ? { background: AMBER, color: '#3a2a06' }
      : v === 'ghost' ? { background: '#fff', color: NAVY, border: '1px solid ' + LINE }
      : v === 'danger' ? { background: '#fff', color: RED, border: '1px solid #e7c6bd' }
      : v === 'green' ? { background: GREEN, color: '#fff' }
      : { background: '#fff', color: INK, border: '1px solid ' + LINE };
    return h('button', { onClick: props.onClick, disabled: props.disabled, style: Object.assign(base, skin, props.style) }, props.children);
  }
  function Pill(props) { return h('span', { style: Object.assign({ padding: '3px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }, pillStyle(props.status)) }, (props.label || props.status || '').toString().replace(/_/g, ' ')); }
  function Eyebrow(props) { return h('div', { style: { color: props.color || STEEL, letterSpacing: '.18em', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 } }, props.children); }
  function Spinner(props) { return h('div', { style: { padding: 48, textAlign: 'center', color: MUTED } }, h('div', { className: 'fo-display', style: { fontSize: 22 } }, '🔧'), h('div', { style: { marginTop: 8 } }, props.label || 'Loading…')); }
  function Empty(props) {
    return h('div', { className: 'fo-card', style: { padding: 38, textAlign: 'center', color: MUTED, borderStyle: 'dashed' } },
      h('div', { style: { fontSize: 32, marginBottom: 8 } }, props.icon || '🗂️'),
      h('div', { className: 'fo-display', style: { fontSize: 19, color: INK, marginBottom: 6 } }, props.title || 'Nothing here yet'),
      h('div', { style: { fontSize: 14, maxWidth: 340, margin: '0 auto' } }, props.body || ''),
      props.action ? h('div', { style: { marginTop: 16 } }, props.action) : null);
  }
  function Modal(props) {
    if (!props.open) return null;
    return h('div', { onClick: props.onClose, style: { position: 'fixed', inset: 0, background: 'rgba(20,34,48,.55)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflow: 'auto' } },
      h('div', { onClick: function (e) { e.stopPropagation(); }, className: 'fo-rise', style: { background: '#fff', borderRadius: 18, width: '100%', maxWidth: props.wide ? 640 : 460, padding: 24, boxShadow: '0 30px 80px -30px rgba(0,0,0,.5)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 } },
          h('div', { className: 'fo-display', style: { fontSize: 20, fontWeight: 700 } }, props.title),
          h('button', { onClick: props.onClose, style: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED } }, '×')),
        props.children));
  }
  function Field(props) {
    var common = { width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid ' + LINE, fontSize: 14, fontFamily: BODY, background: '#fff', outline: 'none' };
    return h('label', { style: { display: 'block', marginBottom: 12 } },
      h('div', { style: { fontSize: 12.5, fontWeight: 600, color: MUTED, marginBottom: 5 } }, props.label),
      props.options
        ? h('select', { value: props.value, onChange: props.onChange, style: common }, props.options.map(function (o) { return h('option', { key: o.value != null ? o.value : o, value: o.value != null ? o.value : o }, o.label != null ? o.label : o); }))
        : props.textarea
          ? h('textarea', { value: props.value, onChange: props.onChange, rows: props.rows || 3, placeholder: props.placeholder, style: Object.assign({ resize: 'vertical' }, common) })
          : h('input', { type: props.type || 'text', value: props.value, onChange: props.onChange, placeholder: props.placeholder, style: common }));
  }
  function Tile(props) {
    return h('div', { className: 'fo-card fo-fade', style: { padding: 18 } },
      h('div', { style: { fontSize: 12, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' } }, props.label),
      h('div', { className: 'fo-display', style: { fontSize: 28, fontWeight: 700, marginTop: 6, color: props.color || INK } }, props.value),
      props.sub ? h('div', { style: { fontSize: 12.5, color: MUTED, marginTop: 4 } }, props.sub) : null);
  }
  function Bars(props) {
    var rows = props.data || [], max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    return h('div', null, rows.length === 0 ? h('div', { style: { color: MUTED, fontSize: 13 } }, 'No data yet') :
      rows.map(function (r, i) {
        return h('div', { key: i, style: { marginBottom: 12 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 } }, h('span', { style: { fontWeight: 600 } }, r.label), h('span', { style: { color: MUTED } }, props.money ? usd(r.value) : num(r.value))),
          h('div', { style: { height: 9, background: '#e6eaf0', borderRadius: 9 } }, h('div', { style: { width: Math.max(3, (r.value / max) * 100) + '%', height: '100%', borderRadius: 9, background: props.color || STEEL } })));
      }));
  }
  function row(a, b) { return h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14 } }, h('span', { style: { color: MUTED } }, a), h('span', null, b)); }

  /* ============================ auth screen ============================ */
  function AuthScreen(props) {
    var s = React.useState('login'), tab = s[0], setTab = s[1];
    var e1 = React.useState('customer@fieldops.app'), email = e1[0], setEmail = e1[1];
    var e2 = React.useState('Password123!'), pw = e2[0], setPw = e2[1];
    var e3 = React.useState(''), full = e3[0], setFull = e3[1];
    var e4 = React.useState(false), busy = e4[0], setBusy = e4[1];
    function login(em, pwd) {
      setBusy(true);
      client.login(cfg.domain, em, pwd, cfg.project, cfg.tenant || 'default-tenant')
        .then(function () { props.onDone(); }).catch(function (err) { showToast('Login failed: ' + (err && err.message || err), 'error'); }).finally(function () { setBusy(false); });
    }
    function signup() {
      if (!email || !pw) { showToast('Email and password required', 'error'); return; }
      setBusy(true);
      client.signup(email, pw, full || email.split('@')[0])
        .then(function () { return client.createObject('customer_profile', { display_name: full || email.split('@')[0], persona: 'customer', email: email }); })
        .then(function () { showToast('Welcome to FieldOps!', 'success'); props.onDone(); })
        .catch(function (err) { showToast('Sign up failed: ' + (err && err.message || err), 'error'); }).finally(function () { setBusy(false); });
    }
    var chips = [['Customer', 'customer@fieldops.app'], ['Technician', 'tech@fieldops.app'], ['Dispatcher', 'dispatch@fieldops.app']];
    return h('div', { style: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(1100px 560px at 75% -10%, ' + STEEL + ' 0%, ' + NAVY + ' 55%, #0c1626 100%)' } },
      h('div', { className: 'fo-rise', style: { width: '100%', maxWidth: 410 } },
        h('div', { style: { textAlign: 'center', marginBottom: 18, color: '#fff' } },
          h('div', { className: 'fo-display', style: { fontSize: 36, fontWeight: 800 } }, '🔧 FieldOps'),
          h('div', { style: { opacity: .8, marginTop: 4 } }, 'Book it. Dispatch it. Done.')),
        h('div', { style: { background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 30px 70px -30px rgba(0,0,0,.6)' } },
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 16 } }, ['login', 'signup'].map(function (t) {
            return h('button', { key: t, onClick: function () { setTab(t); }, style: { flex: 1, padding: '8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, background: tab === t ? NAVY : '#eef1f5', color: tab === t ? '#fff' : MUTED } }, t === 'login' ? 'Sign in' : 'Sign up');
          })),
          tab === 'signup' ? h(Field, { label: 'Full name', value: full, onChange: function (e) { setFull(e.target.value); } }) : null,
          h(Field, { label: 'Email', value: email, onChange: function (e) { setEmail(e.target.value); } }),
          h(Field, { label: 'Password', type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); } }),
          h(Btn, { onClick: function () { tab === 'login' ? login(email, pw) : signup(); }, disabled: busy, style: { width: '100%', marginTop: 4 } }, busy ? '…' : (tab === 'login' ? 'Sign in' : 'Create account')),
          tab === 'login' ? h('div', { style: { marginTop: 16 } },
            h('div', { style: { fontSize: 11.5, color: MUTED, textAlign: 'center', marginBottom: 8 } }, 'Demo personas · Password123!'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' } }, chips.map(function (c) {
              return h('button', { key: c[1], onClick: function () { setEmail(c[1]); setPw('Password123!'); login(c[1], 'Password123!'); }, style: { padding: '6px 12px', borderRadius: 999, border: '1px solid ' + LINE, background: PAPER, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: NAVY } }, c[0]);
            }))) : null),
        h('div', { style: { textAlign: 'center', marginTop: 14 } }, h('button', { onClick: props.onBrowse, style: { background: 'none', border: 'none', color: 'rgba(255,255,255,.85)', cursor: 'pointer', fontSize: 13, fontWeight: 600 } }, '← Browse services'))));
  }

  /* ============================ public site ============================ */
  function ServiceCard(props) {
    var sv = props.s;
    return h('div', { className: 'fo-card fo-link fo-fade', onClick: props.onClick, style: { overflow: 'hidden' } },
      h(Img, { src: sv.image, style: { width: '100%', height: 150, objectFit: 'cover' } }),
      h('div', { style: { padding: 15 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } }, h('div', { className: 'fo-display', style: { fontSize: 17, fontWeight: 700 } }, sv.display_name), h(Pill, { status: 'active', label: sv.category })),
        h('div', { style: { color: MUTED, fontSize: 13, margin: '5px 0 10px', minHeight: 36 } }, sv.description),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', null, h('span', { className: 'fo-display', style: { fontSize: 19, fontWeight: 700 } }, usd(sv.base_price)), h('span', { style: { color: MUTED, fontSize: 12 } }, ' from')),
          h('span', { style: { fontSize: 12, color: MUTED } }, (sv.duration_minutes || 60) + ' min'))));
  }
  var DEMO_SERVICES = [{uuid:"demo-drain",display_name:"Drain Cleaning",category:"Plumbing",base_price:149,duration_minutes:90,callout_fee:49,description:"Clear stubborn clogs in sinks, tubs and main lines.",image:"https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&q=80&w=1200&h=900"},{uuid:"demo-panel",display_name:"Panel Upgrade",category:"Electrical",base_price:480,duration_minutes:240,callout_fee:79,description:"Upgrade your electrical panel to modern safety standards.",image:"https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1200&h=900"},{uuid:"demo-ac",display_name:"AC Tune-Up",category:"HVAC",base_price:129,duration_minutes:75,callout_fee:39,description:"Seasonal air-conditioning maintenance and inspection.",image:"https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&q=80&w=1200&h=900"},{uuid:"demo-appliance",display_name:"Appliance Repair",category:"Appliance",base_price:110,duration_minutes:60,callout_fee:49,description:"Fix washers, dryers, dishwashers and refrigerators.",image:"https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80&w=1200&h=900"}];
  function Marketing(props) {
    function card(emoji, title, body) {
      return h('div', { className: 'fo-card', style: { padding: 24 } },
        h('div', { style: { fontSize: 30, marginBottom: 10 } }, emoji),
        h('div', { className: 'fo-display', style: { fontSize: 20, fontWeight: 700, marginBottom: 6 } }, title),
        h('div', { style: { color: MUTED, fontSize: 14, lineHeight: 1.55 } }, body));
    }
    return h('div', null,
      h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '58px 20px 6px' } },
        h(Eyebrow, { color: AMBER }, 'How it works'),
        h('div', { className: 'fo-display', style: { fontSize: 32, fontWeight: 700, marginBottom: 24 } }, "From \u201cit\u2019s broken\u201d to \u201cit\u2019s done\u201d"),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 } },
          card("\ud83d\udee0\ufe0f", "Pick a service", "Plumbing, electrical, HVAC, appliances and more."),
        card("\ud83d\udcdd", "Approve your quote", "Transparent, upfront pricing before any work begins."),
        card("\u2705", "Done & signed off", "Pay and sign on completion \u2014 no surprises, ever."))),
      h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '44px 20px' } },
        h('div', { className: 'fo-card', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 0, overflow: 'hidden', padding: 0 } },
          h(Img, { src: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&q=80&w=1200&h=900", style: { width: '100%', height: 340, objectFit: 'cover' } }),
          h('div', { style: { padding: '32px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
            h(Eyebrow, { color: AMBER }, "For the trades"),
            h('div', { className: 'fo-display', style: { fontSize: 30, fontWeight: 700, marginBottom: 10 } }, "Run your whole shop on one board"),
            h('div', { style: { color: MUTED, fontSize: 15.5, lineHeight: 1.6, marginBottom: 20 } }, "Scheduling, dispatch, work-orders, parts and invoicing \u2014 the calm command center your crew actually wants to use."),
            h('div', null, h(Btn, { variant: 'amber', onClick: props.onSignIn }, "For pros"))))),
      h('div', { style: { background: "#eaf2fb", borderTop: '1px solid ' + LINE, borderBottom: '1px solid ' + LINE } },
        h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '22px 20px', display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center' } },
          ["Licensed & insured pros", "Upfront quotes", "Same-week scheduling"].map(function (t, i) { return h('div', { key: i, style: { fontWeight: 600, fontSize: 14.5, color: INK } }, '✓ ' + t); }))));
  }
  function PublicSite(props) {
    var s1 = React.useState([]), services = s1[0], setS = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState('All'), cat = s3[0], setCat = s3[1];
    React.useEffect(function () { Promise.resolve(pub('service')).then(function (v) { setS(v && v.length ? v : DEMO_SERVICES); setL(false); }); }, []);
    var cats = ['All'].concat(Object.keys(groupBy(services, function (v) { return v.category; })));
    var shown = cat === 'All' ? services : services.filter(function (v) { return v.category === cat; });
    return h('div', { style: { minHeight: '100vh' } },
      h('div', { style: { position: 'sticky', top: 0, zIndex: 30, background: 'rgba(244,246,249,.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid ' + LINE } },
        h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', { className: 'fo-display', style: { fontSize: 22, fontWeight: 800, color: NAVY } }, '🔧 FieldOps'), h(Btn, { onClick: props.onSignIn }, 'Sign in'))),
      h('div', { style: { background: 'linear-gradient(135deg,' + NAVY + ',' + STEEL + ')', color: '#fff' } },
        h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '60px 20px 68px' } },
          h(Eyebrow, { color: AMBER }, 'Licensed · Insured · On time'),
          h('div', { className: 'fo-display', style: { fontSize: 50, fontWeight: 800, lineHeight: 1.05, maxWidth: 720 } }, 'Trusted trades, booked in minutes.'),
          h('div', { style: { opacity: .85, marginTop: 16, fontSize: 17, maxWidth: 560 } }, 'Plumbing, electrical, HVAC and more — transparent quotes, scheduled fast, signed off on completion.'),
          h('div', { style: { marginTop: 24 } }, h(Btn, { variant: 'amber', onClick: props.onSignIn }, 'Book a service')))),
      h(Marketing, { onSignIn: props.onSignIn }),
      h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '40px 20px 70px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 } },
          h('div', { className: 'fo-display', style: { fontSize: 28, fontWeight: 700 } }, 'Our services'),
          h('div', { className: 'fo-scroll', style: { display: 'flex', gap: 8, overflowX: 'auto' } }, cats.map(function (c) { return h('button', { key: c, onClick: function () { setCat(c); }, style: { padding: '7px 14px', borderRadius: 999, border: '1px solid ' + LINE, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', background: cat === c ? NAVY : '#fff', color: cat === c ? '#fff' : INK } }, c); }))),
        loading ? h(Spinner, null) : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 18 } }, shown.map(function (sv) { return h(ServiceCard, { key: sv.uuid, s: sv, onClick: props.onSignIn }); }))),
      h('div', { style: { borderTop: '1px solid ' + LINE, padding: '26px 20px', textAlign: 'center', color: MUTED, fontSize: 13 } }, 'FieldOps — built on Supero. Sign in to book, work jobs, or dispatch.'));
  }

  /* ============================== layout =============================== */
  function TopBar(props) {
    return h('div', { style: { position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,246,249,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid ' + LINE } },
      h('div', { style: { maxWidth: 1160, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 } },
        h('div', { className: 'fo-display fo-link', onClick: function () { props.go(props.home); }, style: { fontSize: 20, fontWeight: 800, color: NAVY } }, '🔧 FieldOps'),
        h('div', { className: 'fo-scroll', style: { display: 'flex', gap: 4, marginLeft: 8, overflowX: 'auto', flex: 1 } }, props.nav.map(function (n) {
          var active = props.route.indexOf(n.route) === 0;
          return h('button', { key: n.route, onClick: function () { props.go(n.route); }, style: { padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', background: active ? NAVY : 'transparent', color: active ? '#fff' : INK } }, n.label);
        })),
        props.modes.length > 1 ? h('select', { value: props.mode, onChange: function (e) { props.setMode(e.target.value); }, style: { padding: '7px 10px', borderRadius: 9, border: '1px solid ' + LINE, fontWeight: 600, fontSize: 13, background: '#fff', cursor: 'pointer' } }, props.modes.map(function (m) { return h('option', { key: m, value: m }, m.charAt(0).toUpperCase() + m.slice(1)); })) : null,
        h('button', { onClick: props.onLogout, title: 'Sign out', style: { padding: '7px 12px', borderRadius: 9, border: '1px solid ' + LINE, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 } }, '⎋')));
  }
  function Page(props) { return h('div', { className: 'fo-fade', style: { maxWidth: 1160, margin: '0 auto', padding: '26px 20px 80px' } }, props.children); }
  function H1(props) { return h('div', { style: { marginBottom: 20 } }, props.eyebrow ? h(Eyebrow, null, props.eyebrow) : null, h('div', { className: 'fo-display', style: { fontSize: 30, fontWeight: 700 } }, props.children), props.sub ? h('div', { style: { color: MUTED, marginTop: 6 } }, props.sub) : null); }

  /* ============================== CUSTOMER ============================ */
  function CustomerApp(props) {
    var route = props.route, go = props.go, seg = route.replace(/^#\//, '').split('/');
    var nav = [{ route: '#/book', label: 'Book' }, { route: '#/jobs', label: 'My jobs' }, { route: '#/quotes', label: 'Quotes' }, { route: '#/plan', label: 'Maintenance' }];
    var inner;
    if (seg[0] === 'jobs') inner = h(MyJobs, { go: go });
    else if (seg[0] === 'job') inner = h(JobDetail, { uuid: seg[1], go: go, role: 'customer' });
    else if (seg[0] === 'quotes') inner = h(MyQuotes, null);
    else if (seg[0] === 'plan') inner = h(MyPlan, null);
    else inner = h(BookService, { go: go });
    return h('div', null, h(TopBar, { route: route, go: go, nav: nav, home: '#/book', modes: props.modes, mode: props.mode, setMode: props.setMode, onLogout: props.onLogout }), h(Page, null, inner));
  }
  function BookService(props) {
    var s1 = React.useState([]), services = s1[0], setS = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(null), pick = s3[0], setPick = s3[1];
    React.useEffect(function () { getAll('service').then(function (v) { setS(v); setL(false); }); }, []);
    if (loading) return h(Spinner, null);
    return h('div', null, h(H1, { eyebrow: 'Customer', sub: 'Choose a service and request a visit' }, 'Book a service'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 18 } }, services.map(function (sv) { return h(ServiceCard, { key: sv.uuid, s: sv, onClick: function () { setPick(sv); } }); })),
      pick ? h(BookModal, { service: pick, onClose: function () { setPick(null); }, onDone: function () { setPick(null); props.go('#/jobs'); } }) : null);
  }
  function BookModal(props) {
    var sv = props.service;
    var f1 = React.useState(dayStr(new Date(Date.now() + 2 * 86400000).toISOString())), date = f1[0], setDate = f1[1];
    var f2 = React.useState('09:00'), time = f2[0], setTime = f2[1];
    var f3 = React.useState(''), addr = f3[0], setAddr = f3[1];
    var f4 = React.useState(''), notes = f4[0], setNotes = f4[1];
    var f5 = React.useState(false), busy = f5[0], setBusy = f5[1];
    function book() {
      if (!addr) { showToast('Please add a service address', 'error'); return; }
      setBusy(true);
      var start = new Date(date + 'T' + time + ':00').toISOString();
      var end = new Date(new Date(start).getTime() + (sv.duration_minutes || 60) * 60000).toISOString();
      var num = 'JOB-' + String(Date.now()).slice(-4);
      // appointment initial state 'requested' (verified). Pay record created pending.
      client.createObject('appointment', { display_name: num, status: 'requested', start_time: start, end_time: end,
        customer_name: (client.userInfo || {}).fullName || uname(), customer_phone: '', address: addr, service_name: sv.display_name, service_uuid: sv.uuid, amount: sv.base_price, job_notes: notes, saga_state: 'open' })
        .then(function (a) { return client.createObject('payment', { display_name: 'Payment ' + num, status: 'pending', amount: sv.base_price, currency: 'USD', appointment_uuid: a.uuid, method: 'card' }); })
        .then(function () { showToast('Requested! Dispatch will confirm a time.', 'success'); props.onDone(); })
        .catch(function (e) { showToast('Booking failed: ' + (e && e.message || e), 'error'); })
        .finally(function () { setBusy(false); });
    }
    return h(Modal, { open: true, onClose: props.onClose, title: 'Book · ' + sv.display_name },
      h('div', { style: { fontSize: 13.5, color: MUTED, marginBottom: 12 } }, sv.description + ' — from ' + usd(sv.base_price) + (sv.callout_fee ? ' + ' + usd(sv.callout_fee) + ' call-out' : '')),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        h(Field, { label: 'Preferred date', type: 'date', value: date, onChange: function (e) { setDate(e.target.value); } }),
        h(Field, { label: 'Time', type: 'time', value: time, onChange: function (e) { setTime(e.target.value); } })),
      h(Field, { label: 'Service address', value: addr, onChange: function (e) { setAddr(e.target.value); }, placeholder: 'Where is the job?' }),
      h(Field, { label: 'Describe the issue', textarea: true, value: notes, onChange: function (e) { setNotes(e.target.value); } }),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } }, h(Btn, { variant: 'ghost', onClick: props.onClose }, 'Cancel'), h(Btn, { variant: 'amber', onClick: book, disabled: busy }, busy ? 'Requesting…' : 'Request visit')));
  }
  function MyJobs(props) {
    var s1 = React.useState([]), jobs = s1[0], setJ = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    React.useEffect(function () { getAll('appointment').then(function (a) { setJ(a.filter(function (x) { return x.owner_username === uname(); }).sort(function (p, q) { return (q.start_time || '').localeCompare(p.start_time || ''); })); setL(false); }); }, []);
    if (loading) return h(Spinner, null);
    return h('div', null, h(H1, { eyebrow: 'Customer' }, 'My jobs'),
      jobs.length === 0 ? h(Empty, { icon: '🛠️', title: 'No jobs yet', body: 'Book a service to see it here.', action: h(Btn, { onClick: function () { props.go('#/book'); } }, 'Book a service') }) :
        h('div', { style: { display: 'grid', gap: 14 } }, jobs.map(function (j) {
          return h('div', { key: j.uuid, className: 'fo-card fo-link', onClick: function () { props.go('#/job/' + j.uuid); }, style: { padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } },
            h('div', null, h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } }, h('span', { className: 'fo-display', style: { fontSize: 16, fontWeight: 700 } }, j.service_name), h(Pill, { status: j.status })),
              h('div', { style: { fontSize: 13, color: MUTED, marginTop: 3 } }, fmtDate(j.start_time) + ' · ' + timeStr(j.start_time) + (j.technician_name ? ' · ' + j.technician_name : ''))),
            h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700 } }, usd(j.amount)));
        })));
  }
  function JobDetail(props) {
    var s1 = React.useState(null), job = s1[0], setJob = s1[1];
    var s2 = React.useState(null), payment = s2[0], setPay = s2[1];
    var s3 = React.useState(null), wo = s3[0], setWo = s3[1];
    var s4 = React.useState(true), loading = s4[0], setL = s4[1];
    var s5 = React.useState(false), busy = s5[0], setBusy = s5[1];
    function load() {
      Promise.all([getAll('appointment'), getAll('payment'), getAll('work_order')]).then(function (r) {
        var a = r[0].filter(function (x) { return x.uuid === props.uuid; })[0]; setJob(a);
        setPay(r[1].filter(function (x) { return x.appointment_uuid === props.uuid; })[0]);
        setWo(r[2].filter(function (x) { return x.appointment_uuid === props.uuid; })[0]); setL(false);
      });
    }
    React.useEffect(load, [props.uuid]);
    if (loading) return h(Spinner, null);
    if (!job) return h(Empty, { title: 'Job not found', action: h(Btn, { onClick: function () { props.go('#/jobs'); } }, 'Back') });
    var stages = [
      { label: 'Requested', done: true },
      { label: 'Scheduled', done: ['confirmed', 'completed'].indexOf(job.status) >= 0 },
      { label: 'Technician on site', done: job.status === 'completed' },
      { label: 'Work order signed', done: wo && wo.status === 'completed' },
      { label: 'Paid', done: payment && payment.status === 'captured' },
    ];
    function pay() {
      if (!payment) return; setBusy(true);
      transition('payment', 'authorize', payment, 'payment', 'authorized', ['pi_demo'])
        .then(function () { return transition('payment', 'capture', { uuid: payment.uuid, status: 'authorized' }, 'payment', 'captured', ['ch_demo']); })
        .then(function () { showToast('Payment captured — thank you!', 'success'); load(); }).catch(txnErr).finally(function () { setBusy(false); });
    }
    function sign() {
      if (!wo) return; setBusy(true);
      getAll('work_order_signature').then(function (sigs) {
        var sig = sigs.filter(function (x) { return x.document_uuid === wo.uuid || x.parent_uuid === wo.uuid; })[0];
        var p = sig ? transition('document_signature', 'sign', { uuid: sig.uuid }, 'work_order_signature', 'signed', [{ name: job.customer_name }, '0.0.0.0']) : Promise.resolve();
        return p.then(function () { return client.updateObject('work_order', wo.uuid, { status: 'completed' }, wo); });
      }).then(function () { showToast('Signed off — thank you!', 'success'); load(); }).catch(txnErr).finally(function () { setBusy(false); });
    }
    return h('div', null,
      h('button', { onClick: function () { props.go(props.role === 'tech' ? '#/day' : '#/jobs'); }, style: { background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontWeight: 600, marginBottom: 12 } }, '← Back'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' } },
        h('div', null,
          h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 } }, h('div', { className: 'fo-display', style: { fontSize: 26, fontWeight: 700 } }, job.service_name), h(Pill, { status: job.status })),
          h('div', { style: { color: MUTED, marginBottom: 18 } }, job.display_name + ' · ' + fmtDate(job.start_time) + ' ' + timeStr(job.start_time) + ' · ' + job.address),
          h('div', { className: 'fo-card', style: { padding: 22 } },
            h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 16 } }, 'Job progress'),
            stages.map(function (st, i) {
              return h('div', { key: i, style: { display: 'flex', gap: 14, alignItems: 'flex-start' } },
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } }, h('div', { style: { width: 22, height: 22, borderRadius: 999, background: st.done ? GREEN : '#dfe4ec', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 } }, st.done ? '✓' : ''), i < stages.length - 1 ? h('div', { style: { width: 2, height: 26, background: st.done ? GREEN : '#dfe4ec' } }) : null),
                h('div', { style: { paddingBottom: 16 } }, h('div', { style: { fontWeight: 600, color: st.done ? INK : MUTED } }, st.label)));
            })),
          wo && wo.parts_used && wo.parts_used.length ? h('div', { className: 'fo-card', style: { padding: 18, marginTop: 16 } }, h('div', { className: 'fo-display', style: { fontSize: 16, fontWeight: 700, marginBottom: 8 } }, 'Work performed'), h('div', { style: { fontSize: 13.5, color: MUTED } }, wo.labor_notes), h('div', { style: { fontSize: 13, marginTop: 6 } }, 'Parts: ' + wo.parts_used.map(function (p) { return p.qty + '× ' + p.name; }).join(', '))) : null),
        h('div', { className: 'fo-card', style: { padding: 18, position: 'sticky', top: 80 } },
          h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 10 } }, 'Summary'),
          row('Service', usd(job.amount)), payment ? row('Payment', h(Pill, { status: payment.status })) : null,
          job.technician_name ? row('Technician', job.technician_name) : null,
          props.role === 'customer' && wo && wo.status !== 'completed' ? h(Btn, { variant: 'steel', style: { width: '100%', marginTop: 12 }, onClick: sign, disabled: busy }, busy ? '…' : '✍ Sign off work order') : null,
          props.role === 'customer' && payment && payment.status !== 'captured' && job.status === 'completed' ? h(Btn, { variant: 'green', style: { width: '100%', marginTop: 8 }, onClick: pay, disabled: busy }, busy ? '…' : 'Pay ' + usd(job.amount)) : null,
          payment && payment.status === 'captured' ? h('div', { style: { marginTop: 12, textAlign: 'center', color: GREEN, fontWeight: 600, fontSize: 13 } }, '✓ Paid in full') : null)));
  }
  function MyQuotes() {
    var s1 = React.useState([]), quotes = s1[0], setQ = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(''), busy = s3[0], setBusy = s3[1];
    function load() { getAll('quote').then(function (q) { setQ(q.filter(function (x) { return x.owner_username === uname(); })); setL(false); }); }
    React.useEffect(load, []);
    function decide(q, ok) {
      setBusy(q.uuid);
      var op = ok ? 'approveStep' : 'rejectStep', next = ok ? 'approved' : 'rejected';
      transition('approval', op, q, 'quote', next, ['Customer ' + (ok ? 'approved' : 'declined')])
        .then(function () { showToast(ok ? 'Quote approved!' : 'Quote declined', ok ? 'success' : 'info'); load(); }).catch(txnErr).finally(function () { setBusy(''); });
    }
    if (loading) return h(Spinner, null);
    return h('div', null, h(H1, { eyebrow: 'Customer', sub: 'Approve an estimate to schedule the work' }, 'Your quotes'),
      quotes.length === 0 ? h(Empty, { icon: '📝', title: 'No quotes', body: 'Estimates from the team appear here for your approval.' }) :
        h('div', { style: { display: 'grid', gap: 14 } }, quotes.map(function (q) {
          return h('div', { key: q.uuid, className: 'fo-card', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', null, h('div', { style: { fontWeight: 700 } }, q.service_name + ' · ' + usd(q.amount)), h('div', { style: { fontSize: 13, color: MUTED } }, q.display_name + ' · ' + (q.notes || ''))), h(Pill, { status: q.status })),
            q.status === 'pending' ? h('div', { style: { display: 'flex', gap: 8, marginTop: 12 } }, h(Btn, { sm: true, variant: 'green', disabled: busy === q.uuid, onClick: function () { decide(q, true); } }, 'Approve'), h(Btn, { sm: true, variant: 'danger', disabled: busy === q.uuid, onClick: function () { decide(q, false); } }, 'Decline')) : null);
        })));
  }
  function MyPlan() {
    var s1 = React.useState([]), contracts = s1[0], setC = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(''), busy = s3[0], setBusy = s3[1];
    function load() { getAll('contract').then(function (c) { setC(c.filter(function (x) { return x.owner_username === uname(); })); setL(false); }); }
    React.useEffect(load, []);
    function activate(c) { setBusy(c.uuid); transition('recurring_plan', 'start', c, 'contract', 'active').then(function () { showToast('Plan activated', 'success'); load(); }).catch(txnErr).finally(function () { setBusy(''); }); }
    if (loading) return h(Spinner, null);
    return h('div', null, h(H1, { eyebrow: 'Customer', sub: 'Recurring maintenance keeps your home in shape' }, 'Maintenance plans'),
      contracts.length === 0 ? h(Empty, { icon: '🗓️', title: 'No plans yet', body: 'Ask your dispatcher about a maintenance plan.' }) :
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 } }, contracts.map(function (c) {
          return h('div', { key: c.uuid, className: 'fo-card', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700 } }, c.plan_name), h(Pill, { status: c.status })),
            h('div', { style: { color: MUTED, fontSize: 13.5, margin: '6px 0' } }, usd(c.billing_amount) + ' / ' + (c.billing_interval || 'month') + ' · next ' + (c.next_service_date || '')),
            c.status === 'inactive' ? h(Btn, { sm: true, variant: 'green', disabled: busy === c.uuid, onClick: function () { activate(c); } }, 'Activate plan') : h('span', { style: { fontSize: 12.5, color: GREEN, fontWeight: 600 } }, '✓ Active'));
        })));
  }

  /* ============================== TECHNICIAN ========================== */
  function TechApp(props) {
    var route = props.route, go = props.go, seg = route.replace(/^#\//, '').split('/');
    var nav = [{ route: '#/day', label: 'My day' }];
    var inner = seg[0] === 'job' ? h(JobWork, { uuid: seg[1], go: go }) : h(TechDay, { go: go });
    return h('div', null, h(TopBar, { route: route, go: go, nav: nav, home: '#/day', modes: props.modes, mode: props.mode, setMode: props.setMode, onLogout: props.onLogout }), h(Page, null, inner));
  }
  function TechDay(props) {
    var s1 = React.useState([]), jobs = s1[0], setJ = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    function load() { getAll('appointment').then(function (a) { setJ(a.filter(function (x) { return x.technician_username === uname() && ['confirmed', 'completed'].indexOf(x.status) >= 0; }).sort(function (p, q) { return (p.start_time || '').localeCompare(q.start_time || ''); })); setL(false); }); }
    React.useEffect(load, []);
    if (loading) return h(Spinner, null);
    var today = jobs.filter(function (j) { return j.status === 'confirmed'; }), done = jobs.filter(function (j) { return j.status === 'completed'; });
    return h('div', null, h(H1, { eyebrow: 'Technician', sub: 'Your assigned jobs, in order' }, 'My day'),
      today.length === 0 ? h(Empty, { icon: '🚐', title: 'No jobs scheduled', body: 'Dispatch will assign jobs to your queue.' }) :
        h('div', { style: { display: 'grid', gap: 12, marginBottom: 24 } }, today.map(function (j) {
          return h('div', { key: j.uuid, className: 'fo-card fo-link', onClick: function () { props.go('#/job/' + j.uuid); }, style: { padding: 16, display: 'flex', gap: 14, alignItems: 'center' } },
            h('div', { style: { textAlign: 'center', minWidth: 64 } }, h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, color: STEEL } }, timeStr(j.start_time)), h('div', { style: { fontSize: 11, color: MUTED } }, fmtDate(j.start_time))),
            h('div', { style: { flex: 1, borderLeft: '2px solid ' + LINE, paddingLeft: 14 } }, h('div', { style: { fontWeight: 700 } }, j.service_name), h('div', { style: { fontSize: 13, color: MUTED } }, j.customer_name + ' · ' + j.address)),
            h(Btn, { sm: true, variant: 'steel' }, 'Open'));
        })),
      done.length ? h('div', null, h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 10 } }, 'Completed'), h('div', { style: { display: 'grid', gap: 10 } }, done.map(function (j) {
        return h('div', { key: j.uuid, className: 'fo-card', style: { padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('span', null, j.service_name + ' · ' + j.customer_name), h(Pill, { status: 'completed' }));
      }))) : null);
  }
  function JobWork(props) {
    var s1 = React.useState(null), job = s1[0], setJob = s1[1];
    var s2 = React.useState([]), parts = s2[0], setParts = s2[1];
    var s3 = React.useState(true), loading = s3[0], setL = s3[1];
    var s4 = React.useState(false), busy = s4[0], setBusy = s4[1];
    var s5 = React.useState(''), notes = s5[0], setNotes = s5[1];
    var s6 = React.useState([]), used = s6[0], setUsed = s6[1];
    function load() { Promise.all([getAll('appointment'), getAll('part_item')]).then(function (r) { setJob(r[0].filter(function (x) { return x.uuid === props.uuid; })[0]); setParts(r[1]); setL(false); }); }
    React.useEffect(load, [props.uuid]);
    if (loading) return h(Spinner, null);
    if (!job) return h(Empty, { title: 'Job not found', action: h(Btn, { onClick: function () { props.go('#/day'); } }, 'Back') });
    function toggle(p) { setUsed(used.indexOf(p.display_name) >= 0 ? used.filter(function (x) { return x !== p.display_name; }) : used.concat([p.display_name])); }
    function complete() {
      setBusy(true);
      // 1) complete the appointment (confirmed→completed). 2) create WorkOrder (draft)
      // + request signatures (draft→awaiting_signatures) with a signature child.
      transition('appointment', 'complete', job, 'appointment', 'completed', ['Job complete'])
        .then(function () {
          return client.createObject('work_order', { display_name: 'Work order ' + job.display_name, status: 'draft', title: 'Work order ' + job.display_name,
            appointment_uuid: job.uuid, customer_name: job.customer_name, technician_username: uname(), technician_name: (client.userInfo || {}).fullName || '',
            parts_used: used.map(function (n) { return { name: n, qty: 1 }; }), labor_hours: 2, labor_notes: notes || 'Job completed and tested.', total: job.amount });
        })
        .then(function (wo) {
          return client.createObject('work_order_signature', { display_name: 'Signature ' + job.display_name, status: 'pending', parent_type: 'work_order', parent_uuid: wo.uuid, document_uuid: wo.uuid, signer_name: job.customer_name, signer_role: 'customer' })
            .then(function () { return transition('document_signature', 'request', wo, 'work_order', 'awaiting_signatures').catch(function () { return null; }); });
        })
        .then(function () { showToast('Job completed — sent for customer sign-off', 'success'); props.go('#/day'); })
        .catch(function (e) { showToast('Could not complete: ' + (e && e.message || e), 'error'); })
        .finally(function () { setBusy(false); });
    }
    return h('div', null,
      h('button', { onClick: function () { props.go('#/day'); }, style: { background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontWeight: 600, marginBottom: 12 } }, '← My day'),
      h('div', { className: 'fo-display', style: { fontSize: 24, fontWeight: 700 } }, job.service_name),
      h('div', { style: { color: MUTED, marginBottom: 18 } }, job.customer_name + ' · ' + job.address + ' · ' + timeStr(job.start_time)),
      h('div', { className: 'fo-card', style: { padding: 18, marginBottom: 16 } }, h('div', { style: { fontWeight: 700, marginBottom: 6 } }, 'Issue reported'), h('div', { style: { color: MUTED, fontSize: 14 } }, job.job_notes || 'No details provided.')),
      h('div', { className: 'fo-card', style: { padding: 18, marginBottom: 16 } },
        h('div', { className: 'fo-display', style: { fontSize: 17, fontWeight: 700, marginBottom: 10 } }, 'Parts used'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, parts.map(function (p) {
          var on = used.indexOf(p.display_name) >= 0;
          return h('button', { key: p.uuid, onClick: function () { toggle(p); }, style: { padding: '8px 12px', borderRadius: 999, border: '1px solid ' + (on ? STEEL : LINE), background: on ? SKY : '#fff', color: on ? STEEL : INK, cursor: 'pointer', fontWeight: 600, fontSize: 13 } }, (on ? '✓ ' : '+ ') + p.display_name);
        }))),
      h('div', { className: 'fo-card', style: { padding: 18, marginBottom: 16 } }, h(Field, { label: 'Work notes', textarea: true, value: notes, onChange: function (e) { setNotes(e.target.value); }, placeholder: 'What did you do? Any follow-up?' })),
      h(Btn, { variant: 'green', onClick: complete, disabled: busy, style: { width: '100%' } }, busy ? 'Completing…' : '✓ Complete job & request sign-off'));
  }

  /* ============================== DISPATCHER ========================== */
  function DispatchApp(props) {
    var route = props.route, go = props.go, seg = route.replace(/^#\//, '').split('/');
    var nav = [{ route: '#/d/board', label: 'Dispatch' }, { route: '#/d/dash', label: 'Dashboard' }, { route: '#/d/saga', label: 'Settlement saga' }];
    var inner;
    if (seg[0] === 'job') inner = h(JobDetail, { uuid: seg[1], go: go, role: 'dispatch' });
    else if (seg[1] === 'dash') inner = h(DispatchDash, null);
    else if (seg[1] === 'saga') inner = h(SettlementSaga, null);
    else inner = h(DispatchBoard, { go: go });
    return h('div', null, h(TopBar, { route: route, go: go, nav: nav, home: '#/d/board', modes: props.modes, mode: props.mode, setMode: props.setMode, onLogout: props.onLogout }), h(Page, null, inner));
  }
  function DispatchBoard(props) {
    var s1 = React.useState([]), jobs = s1[0], setJ = s1[1];
    var s2 = React.useState([]), techs = s2[0], setT = s2[1];
    var s3 = React.useState(true), loading = s3[0], setL = s3[1];
    var s4 = React.useState(''), busy = s4[0], setBusy = s4[1];
    var s5 = React.useState(null), assign = s5[0], setAssign = s5[1];
    function load() { Promise.all([getAll('appointment'), getAll('technician')]).then(function (r) { setJ(r[0]); setT(r[1]); setL(false); }); }
    React.useEffect(load, []);
    function act(j, op, next) {
      setBusy(j.uuid + op);
      transition('appointment', op, j, 'appointment', next).then(function () {
        if (op === 'schedule') return runSaga('appointment_dispatch', { appointment_uuid: j.uuid, tech_phone: '', summary: j.service_name + ' for ' + j.customer_name }).catch(function () {});
      }).then(function () { showToast('Updated', 'success'); load(); }).catch(txnErr).finally(function () { setBusy(''); });
    }
    function doAssign(j, techName, techUser) { client.updateObject('appointment', j.uuid, { technician_name: techName, technician_username: techUser }, j).then(function () { showToast('Assigned ' + techName, 'success'); setAssign(null); load(); }).catch(function (e) { showToast('Failed: ' + (e && e.message || e), 'error'); }); }
    if (loading) return h(Spinner, null);
    var cols = [['requested', 'New requests'], ['confirmed', 'Scheduled'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
    var by = groupBy(jobs, function (j) { return j.status; });
    return h('div', null, h(H1, { eyebrow: 'Dispatcher', sub: 'Assign technicians and move jobs through the day' }, 'Dispatch board'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'start' } }, cols.map(function (c) {
        var list = (by[c[0]] || []).sort(function (p, q) { return (p.start_time || '').localeCompare(q.start_time || ''); });
        return h('div', { key: c[0], style: { background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: 12, minHeight: 120 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontWeight: 700, fontSize: 13 } }, h('span', null, c[1]), h('span', { style: { color: MUTED } }, list.length)),
          list.map(function (j) {
            var steps = STEPS.appointment[j.status] || [];
            return h('div', { key: j.uuid, className: 'fo-card', style: { padding: 12, marginBottom: 10 } },
              h('div', { className: 'fo-link', onClick: function () { props.go('#/job/' + j.uuid); }, style: { fontWeight: 600, fontSize: 13.5 } }, j.service_name),
              h('div', { style: { fontSize: 12, color: MUTED } }, j.customer_name + ' · ' + timeStr(j.start_time)),
              h('div', { style: { fontSize: 12, color: j.technician_name ? STEEL : RED, fontWeight: 600, margin: '4px 0' } }, j.technician_name ? '👷 ' + j.technician_name : 'Unassigned'),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 } },
                j.status === 'requested' ? h(Btn, { sm: true, variant: 'ghost', onClick: function () { setAssign(j); } }, 'Assign') : null,
                steps.map(function (st) { return h(Btn, { key: st[0], sm: true, variant: st[0] === 'cancel' ? 'danger' : 'solid', disabled: busy === j.uuid + st[0] || (st[0] === 'schedule' && !j.technician_name), onClick: function () { act(j, st[0], st[2]); } }, st[1]); })));
          }), list.length === 0 ? h('div', { style: { color: MUTED, fontSize: 12.5, padding: 8 } }, '—') : null);
      })),
      assign ? h(Modal, { open: true, onClose: function () { setAssign(null); }, title: 'Assign technician' },
        h('div', { style: { display: 'grid', gap: 8 } }, techs.filter(function (t) { return t.active !== false; }).map(function (t) {
          return h('button', { key: t.uuid, onClick: function () { doAssign(assign, t.display_name, t.tech_username); }, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, border: '1px solid ' + LINE, background: '#fff', cursor: 'pointer', textAlign: 'left' } },
            h('div', null, h('div', { style: { fontWeight: 600 } }, t.display_name), h('div', { style: { fontSize: 12, color: MUTED } }, t.skills)), h('span', { style: { fontSize: 13, color: AMBER } }, '★ ' + (t.rating || '')));
        }))) : null);
  }
  function DispatchDash() {
    var s1 = React.useState(null), data = s1[0], setData = s1[1];
    React.useEffect(function () { Promise.all([getAll('appointment'), getAll('payment'), getAll('technician'), getAll('service')]).then(function (r) { setData({ jobs: r[0], payments: r[1], techs: r[2], services: r[3] }); }); }, []);
    if (!data) return h(Spinner, null);
    var revenue = sumBy(data.payments.filter(function (p) { return p.status === 'captured'; }), function (p) { return p.amount; });
    var byStatus = ['requested', 'confirmed', 'completed', 'cancelled'].map(function (st) { return { label: st, value: data.jobs.filter(function (j) { return j.status === st; }).length }; });
    var byTech = Object.keys(groupBy(data.jobs.filter(function (j) { return j.technician_name; }), function (j) { return j.technician_name; })).map(function (t) { return { label: t, value: groupBy(data.jobs, function (j) { return j.technician_name; })[t].length }; });
    var revByCat = Object.keys(groupBy(data.jobs, function (j) { return (data.services.filter(function (s) { return s.uuid === j.service_uuid; })[0] || {}).category || 'Other'; })).map(function (c) { var g = groupBy(data.jobs, function (j) { return (data.services.filter(function (s) { return s.uuid === j.service_uuid; })[0] || {}).category || 'Other'; })[c]; return { label: c, value: sumBy(g, function (j) { return j.amount; }) }; }).sort(function (a, b) { return b.value - a.value; });
    return h('div', null, h(H1, { eyebrow: 'Dispatcher', sub: 'Operations at a glance' }, 'Dashboard'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 22 } },
        h(Tile, { label: 'Revenue', value: usd(revenue), color: GREEN, sub: data.jobs.length + ' jobs' }),
        h(Tile, { label: 'Scheduled', value: data.jobs.filter(function (j) { return j.status === 'confirmed'; }).length, color: STEEL }),
        h(Tile, { label: 'New requests', value: data.jobs.filter(function (j) { return j.status === 'requested'; }).length, color: AMBER }),
        h(Tile, { label: 'Technicians', value: data.techs.length })),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 } },
        h('div', { className: 'fo-card', style: { padding: 20 } }, h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 14 } }, 'Jobs by status'), h(Bars, { data: byStatus, color: STEEL })),
        h('div', { className: 'fo-card', style: { padding: 20 } }, h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 14 } }, 'Revenue by category'), h(Bars, { data: revByCat, color: AMBER, money: true })),
        h('div', { className: 'fo-card', style: { padding: 20 } }, h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 14 } }, 'Jobs per technician'), h(Bars, { data: byTech, color: NAVY }))));
  }
  function SettlementSaga() {
    var s1 = React.useState([]), jobs = s1[0], setJ = s1[1];
    var s2 = React.useState(''), pick = s2[0], setPick = s2[1];
    var s3 = React.useState(null), result = s3[0], setResult = s3[1];
    var s4 = React.useState(''), running = s4[0], setRunning = s4[1];
    React.useEffect(function () { getAll('appointment').then(function (a) { var c = a.filter(function (x) { return ['completed', 'confirmed'].indexOf(x.status) >= 0; }); setJ(c); if (c[0]) setPick(c[0].uuid); }); }, []);
    function run(failMode) {
      var j = jobs.filter(function (x) { return x.uuid === pick; })[0];
      if (!j) { showToast('Pick a job first', 'error'); return; }
      setRunning(failMode ? 'fail' : 'ok'); setResult(null);
      var input = { appointment_uuid: j.uuid, customer_email: j.owner_username, amount: j.amount, currency: 'USD' };
      var wf = 'job_settlement';
      if (failMode) { wf = 'job_settlement_failtest'; input.bogus_uuid = '00000000-0000-0000-0000-000000000000'; }
      Promise.resolve(services.workflow.run(wf, input))
        .then(function (res) {
          // SAGA-PANEL-UNWRAP-V1 — the run's own status lives in the execute
          // envelope at res.output.status, not on res. Reading res.status gave
          // undefined for EVERY run, so this panel always fell to the generic
          // 'Saga finished: ' branch and the per-step tracker never lit up —
          // the showpiece for the compensating-saga story was silently inert.
          if (res && res.success === false) throw new Error(res.error || 'saga call failed');
          var out = (res && res.output && typeof res.output === 'object') ? res.output : (res || {});
          setResult(out); var st = out.status || ''; if (st === 'compensated') showToast('Saga compensated — the captured payment was refunded back', 'success'); else if (st === 'completed') showToast('Job settled', 'success'); else showToast('Saga finished: ' + st, 'warning'); })
        .catch(function (e) { setResult({ status: 'error', error: (e && e.message) || String(e) }); showToast('Could not run saga: ' + (e && e.message || e), 'error'); })
        .finally(function () { setRunning(''); });
    }
    var plan = [['capture', 'Capture payment (Stripe)', 'compensates → refund'], ['invoice', 'Sync QuickBooks invoice', 'on_error: continue'], ['ledger', 'Write the settlement ledger', 'forced to fail in the drill'], ['finalize', 'Stamp job settled', '']];
    return h('div', null, h(H1, { eyebrow: 'Dispatcher · showpiece', sub: 'Settling a job is a compensating saga: if a later leg fails, the engine refunds the capture automatically — zero hand-written rollback.' }, 'Job settlement saga'),
      h('div', { className: 'fo-card', style: { padding: 18, marginBottom: 18, background: SKY, borderColor: '#cfe0f3' } }, h('div', { style: { fontSize: 13.5 } }, h('b', null, 'The flow: '), 'capture payment → QuickBooks invoice → notify → close. Money + accounting carry compensate blocks; notifications opt out via ', h('code', null, 'skip_acknowledged'), ' so a later failure ends ', h('b', null, 'compensated'), ', not compensation_failed.')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 22, alignItems: 'start' } },
        h('div', { className: 'fo-card', style: { padding: 20 } }, h('div', { className: 'fo-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 14 } }, 'Saga plan'),
          plan.map(function (p, i) {
            var stepRes = result && result.output_data && (result.output_data[p[0]] || (result.output_data.steps && result.output_data.steps[p[0]]));
            var stat = stepRes && (stepRes.status || (stepRes.success ? 'completed' : 'failed'));
            return h('div', { key: p[0], style: { display: 'flex', gap: 14, alignItems: 'flex-start' } },
              h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } }, h('div', { style: { width: 26, height: 26, borderRadius: 999, background: stat === 'completed' ? GREEN : stat === 'failed' || stat === 'compensated' ? RED : '#dfe4ec', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 } }, stat === 'completed' ? '✓' : stat === 'failed' ? '!' : stat === 'compensated' ? '↩' : (i + 1)), i < plan.length - 1 ? h('div', { style: { width: 2, height: 30, background: '#dfe4ec' } }) : null),
              h('div', { style: { paddingBottom: 16 } }, h('div', { style: { fontWeight: 600 } }, p[1]), h('div', { style: { fontSize: 12, color: MUTED } }, p[2]), stat ? h('div', { style: { fontSize: 12, fontWeight: 700, color: stat === 'completed' ? GREEN : RED, textTransform: 'capitalize', marginTop: 2 } }, stat) : null));
          })),
        h('div', null,
          h('div', { className: 'fo-card', style: { padding: 18, marginBottom: 16 } }, h('div', { style: { fontWeight: 700, marginBottom: 8 } }, 'Run against a job'),
            jobs.length === 0 ? h('div', { style: { color: MUTED, fontSize: 13 } }, 'No completed jobs to settle.') : h(Field, { label: 'Job', value: pick, onChange: function (e) { setPick(e.target.value); }, options: jobs.map(function (j) { return { value: j.uuid, label: j.display_name + ' · ' + usd(j.amount) }; }) }),
            h(Btn, { onClick: function () { run(false); }, disabled: !!running || !pick, style: { width: '100%', marginBottom: 8 } }, running === 'ok' ? 'Running…' : '▶ Settle job'),
            h(Btn, { variant: 'danger', onClick: function () { run(true); }, disabled: !!running || !pick, style: { width: '100%' } }, running === 'fail' ? 'Running…' : '⚠ Simulate failure & refund')),
          result ? h('div', { className: 'fo-card fo-rise', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } }, h('span', { style: { fontWeight: 700 } }, 'Engine result'), h(Pill, { status: result.status === 'completed' ? 'completed' : result.status === 'compensated' ? 'voided' : 'cancelled', label: result.status })),
            result.error ? h('div', { style: { fontSize: 13, color: RED } }, result.error) : null,
            typeof result.steps_completed !== 'undefined' ? h('div', { style: { fontSize: 13, color: MUTED } }, (result.steps_completed || 0) + ' / ' + (result.steps_total || 0) + ' steps · ' + (result.steps_failed || 0) + ' failed') : null,
            h('pre', { className: 'fo-scroll', style: { fontSize: 11, background: '#f6f8fb', borderRadius: 10, padding: 10, marginTop: 10, overflow: 'auto', maxHeight: 220 } }, JSON.stringify(result.output_data || result, null, 2))) : null)));
  }

  /* ============================== Shell ================================ */
  function Shell(props) {
    var route = props.route, navigate = props.navigate;
    var s1 = React.useState(null), profile = s1[0], setProfile = s1[1];
    var s2 = React.useState(isStaff() ? 'dispatcher' : null), mode = s2[0], setMode = s2[1];
    var s3 = React.useState(false), ready = s3[0], setReady = s3[1];
    React.useEffect(function () {
      try {
        client.registerTransactionalExtensions({
          service: 'service', approval: ['quote', 'quote_step'], appointment: 'appointment',
          document_signature: ['work_order', 'work_order_signature'], payment: 'payment',
          inventory: ['part_item', 'part_hold'], recurring_plan: 'contract',
        });
      } catch (e) {}
      getAll('customer_profile').then(function (ps) {
        var mine = ps.filter(function (p) { return p.owner_username === uname() || p.email === uname(); })[0] || null;
        setProfile(mine);
        if (!isStaff()) setMode((mine && mine.persona) || 'customer');
        setReady(true);
      });
    }, []);
    function go(hash) { navigate(hash); }
    function logout() { try { client.logout(); } catch (e) {} window.location.hash = ''; props.onLogout(); }
    var modes = isStaff() ? ['dispatcher', 'customer', 'technician'] : [mode || 'customer'];
    if (!ready) return h(Spinner, { label: 'Setting things up…' });
    var common = { route: route, go: go, modes: modes, mode: mode, setMode: function (m) { setMode(m); navigate(homeFor(m)); }, onLogout: logout };
    if (mode === 'technician') return h(TechApp, Object.assign({}, common, { route: (route.indexOf('#/day') === 0 || route.indexOf('#/job') === 0) ? route : '#/day' }));
    if (mode === 'dispatcher') return h(DispatchApp, Object.assign({}, common, { route: (route.indexOf('#/d') === 0 || route.indexOf('#/job') === 0) ? route : '#/d/board' }));
    return h(CustomerApp, Object.assign({}, common, { route: (route.indexOf('#/d/') === 0 || route.indexOf('#/day') === 0) ? '#/book' : route }));
  }
  function homeFor(m) { return m === 'technician' ? '#/day' : m === 'dispatcher' ? '#/d/board' : '#/book'; }

  /* =============================== App ================================= */
  function App() {
    var s1 = React.useState(window.location.hash || '#/'), route = s1[0], setRoute = s1[1];
    var s2 = React.useState(client.isAuthenticated()), authed = s2[0], setAuthed = s2[1];
    var s3 = React.useState(false), forceAuth = s3[0], setForceAuth = s3[1];
    React.useEffect(function () {  // client rehydrates session from localStorage async — re-check after mount
      if (client.isAuthenticated()) { setAuthed(true); return; }
      var n = 0, t = setInterval(function () { n++; if (client.isAuthenticated()) { setAuthed(true); clearInterval(t); } else if (n > 25) clearInterval(t); }, 150);
      return function () { clearInterval(t); };
    }, []);
    function navigate(hash) { try { history.replaceState(null, '', hash); } catch (e) {} setRoute(hash); }
    if (!authed) {
      if (forceAuth || route.indexOf('#/auth') === 0) return h(AuthScreen, { onDone: function () { setAuthed(true); navigate('#/'); }, onBrowse: function () { setForceAuth(false); navigate('#/'); } });
      return h(PublicSite, { onSignIn: function () { setForceAuth(true); navigate('#/auth'); } });
    }
    return h(Shell, { route: route, navigate: navigate, onLogout: function () { setAuthed(false); setForceAuth(false); navigate('#/'); } });
  }

  /* ============================== mount =============================== */
  var __root = null;
  function mountApp() {
    injectChrome();
    var _pl = document.getElementById('supero-preloader');
    if (_pl && _pl.parentNode) _pl.parentNode.removeChild(_pl);
    var st = document.createElement('style');
    st.textContent = '#root,#app,#__next,#supero-preloader{display:none!important}' +
      '#myapp-root{position:fixed;inset:0;min-height:100vh;overflow:auto;z-index:2147483647;background:' + PAPER + '}';
    document.head.appendChild(st);
    var el = document.getElementById('myapp-root');
    if (!el) { el = document.createElement('div'); el.id = 'myapp-root'; document.body.appendChild(el); }
    if (!__root) __root = ReactDOM.createRoot(el);
    __root.render(h(App, null));
  }
  function boot() { var n = 0; (function tick() { n++; if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') setTimeout(mountApp, 50); else if (n < 50) setTimeout(tick, 100); })(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
