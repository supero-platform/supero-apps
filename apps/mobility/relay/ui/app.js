/* Relay — full custom front end.
 * One login, three personas: Clinician · Facility · Admin.
 * Note: Verification AND Timesheet both extend the `approval` service. registerExtensions
 * maps one schema per service, so approval ops here pass `extending_schema` explicitly
 * (verified against the runtime _txnExecute auto-inject rule). All I/O via locked client.*. */
(function () {
  var h = React.createElement;
  var cfg = window.__SUPERO_CONFIG || {};

  /* ============================ brand / theme ============================ */
  var NAVY = '#14283c', TEAL = '#0e7c7b', CORAL = '#ef6f53', GREEN = '#1f8b53', AMBER = '#e0a43a', RED = '#c0392b';
  var PAPER = '#f2f5f6', INK = '#16222e', MUTED = '#5f6c78', LINE = '#e0e6e8', MINT = '#e7f3f2';
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
    if (document.getElementById('rl-chrome')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.id = 'rl-chrome';
    st.textContent =
      '*{box-sizing:border-box}#myapp-root{font-family:' + BODY + ';color:' + INK + ';background:' + PAPER + '}' +
      '.rl-display{font-family:' + DISPLAY + '}' +
      '.rl-card{background:#fff;border:1px solid ' + LINE + ';border-radius:16px;transition:transform .15s ease,box-shadow .15s ease}' +
      '.rl-card:hover{transform:translateY(-2px);box-shadow:0 14px 32px -20px rgba(20,40,60,.45)}' +
      '.rl-fade{animation:rlfade .4s ease both}@keyframes rlfade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}' +
      '.rl-rise{animation:rlrise .3s cubic-bezier(.2,.8,.2,1) both}@keyframes rlrise{from{opacity:0;transform:translateY(12px)}to{opacity:1}}' +
      '.rl-scroll::-webkit-scrollbar{height:8px;width:8px}.rl-scroll::-webkit-scrollbar-thumb{background:' + LINE + ';border-radius:8px}' +
      '.rl-link{cursor:pointer}.rl-link:hover{opacity:.85}';
    document.head.appendChild(st);
  }

  /* ============================== helpers =============================== */
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function usd(n) { try { return formatCurrency(Number(n) || 0); } catch (e) { return '$' + (Number(n) || 0).toFixed(2); } }
  function num(n) { try { return formatNumber(Number(n) || 0); } catch (e) { return String(Math.round(Number(n) || 0)); } }
  function fmtDate(s) { try { return formatDate(s); } catch (e) { return s ? String(s).slice(0, 10) : ''; } }
  function timeStr(s) { try { return new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }
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
    try { return client.isAdmin() || ['tenant_admin', 'domain_admin', 'platform_admin', 'developer'].indexOf((client.userInfo || {}).role) >= 0; } catch (e) { return false; }
  }
  function aiText(r) { r = (r && r.output) || r || {}; return r.generated_text || r.text || r.completion || r.content || r.message || ''; }

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
      // HONEST-FALLBACK-V1 — this substituted a raw status write for a FAILED
        // transactional call and returned {success:true}, indistinguishable from the
        // real thing. In a credentialing app that meant an admin's "Verify" click
        // reported "Credential verified" while none of the verification logic ran.
        // The fallback is kept so a demo still moves, but it now says what it did.
        return client.updateObject(schema, record.uuid, { status: nextStatus }, record)
          .then(function () {
            try { showToast('The ' + (typeof serviceId !== 'undefined' ? serviceId : wireOp) + ' service did not respond — the status was set directly, WITHOUT running its checks (' + ((e && e.message) || 'service error') + ')', 'warning'); } catch (t) {}
            return { success: true, fallback: true };
          }).catch(function () { throw e; });
    });
  }
  // Approval helper — passes extending_schema EXPLICITLY (two schemas extend `approval`,
  // so we can't rely on the single registered mapping). wireOp = submit_approval | approve_step | reject_step.
  function approvalOp(wireOp, record, schema, stepSchema, nextStatus, notes) {
    var input = { approval_uuid: record.uuid, extending_schema: schema, step_extending_schema: stepSchema };
    if (notes) input.decision_notes = notes;
    var p;
    try { var t = client.transactional || {}; p = (t && typeof t.execute === 'function') ? Promise.resolve(t.execute('approval', wireOp, input)) : Promise.reject(new Error('no execute')); }
    catch (e) { p = Promise.reject(e); }
    return p.then(function (res) { if (res && res.success === false) throw Object.assign(new Error(res.error || 'failed'), { envelope: res }); return res; })
      .catch(function (e) { if (e && e.isStateTransitionError) throw e; // HONEST-FALLBACK-V1 — this substituted a raw status write for a FAILED
        // transactional call and returned {success:true}, indistinguishable from the
        // real thing. In a credentialing app that meant an admin's "Verify" click
        // reported "Credential verified" while none of the verification logic ran.
        // The fallback is kept so a demo still moves, but it now says what it did.
        return client.updateObject(schema, record.uuid, { status: nextStatus }, record)
          .then(function () {
            try { showToast('The ' + (typeof serviceId !== 'undefined' ? serviceId : wireOp) + ' service did not respond — the status was set directly, WITHOUT running its checks (' + ((e && e.message) || 'service error') + ')', 'warning'); } catch (t) {}
            return { success: true, fallback: true };
          }).catch(function () { throw e; }); });
  }
  function txnErr(e) {
    if (e && e.isStateTransitionError) showToast('Not allowed from current state' + (e.currentState ? ' (' + e.currentState + ')' : ''), 'error');
    else if (e && (e.isNotImported || e.isNotConfigured)) showToast('That service is not enabled for this project', 'error');
    else showToast('Could not update: ' + ((e && e.message) || e), 'error');
  }

  var PILL = {
    requested: ['#8a6d1f', '#fbf1d2'], pending: ['#8a6d1f', '#fbf1d2'], draft: ['#8a6d1f', '#fbf1d2'], pending_upload: ['#8a6d1f', '#fbf1d2'], inactive: ['#5f6c78', '#e6eaec'],
    confirmed: ['#0e6a6a', '#dcefee'], uploaded: ['#1f5f8a', '#dcebf7'], authorized: ['#1f5f8a', '#dcebf7'],
    completed: ['#1f7a4d', '#d8efdf'], approved: ['#1f7a4d', '#d8efdf'], scanned: ['#1f7a4d', '#d8efdf'], captured: ['#1f7a4d', '#d8efdf'], active: ['#1f7a4d', '#d8efdf'], paid: ['#1f7a4d', '#d8efdf'],
    cancelled: ['#8a3b2c', '#f6ded6'], rejected: ['#8a3b2c', '#f6ded6'], voided: ['#8a3b2c', '#f6ded6'], failed: ['#8a3b2c', '#f6ded6'], no_show: ['#8a3b2c', '#f6ded6'],
  };
  function pillStyle(st) { var c = PILL[String(st).toLowerCase()] || ['#5f6c78', '#e6eaec']; return { color: c[0], background: c[1] }; }

  /* ============================== UI atoms ============================== */
  function Img(props) {
    var s = React.useState(false), bad = s[0], setBad = s[1];
    var src = bad ? null : (function () { try { return resolveImageUrl(props.src); } catch (e) { return null; } })();
    if (!src) return h('div', { className: props.className, style: Object.assign({ background: 'linear-gradient(135deg,' + TEAL + ',' + NAVY + ')' }, props.style) }, props.fallback || null);
    return h('img', { src: src, alt: props.alt || '', className: props.className, style: props.style, loading: 'lazy', onError: function () { setBad(true); } });
  }
  function Btn(props) {
    var v = props.variant || 'solid';
    var base = { borderRadius: 10, fontWeight: 600, fontSize: props.sm ? 13 : 14, padding: props.sm ? '7px 13px' : '11px 18px', cursor: props.disabled ? 'not-allowed' : 'pointer', border: '1px solid transparent', transition: 'all .15s', opacity: props.disabled ? .55 : 1, whiteSpace: 'nowrap' };
    var skin = v === 'solid' ? { background: NAVY, color: '#fff' }
      : v === 'teal' ? { background: TEAL, color: '#fff' }
      : v === 'coral' ? { background: CORAL, color: '#fff' }
      : v === 'ghost' ? { background: '#fff', color: NAVY, border: '1px solid ' + LINE }
      : v === 'danger' ? { background: '#fff', color: RED, border: '1px solid #e7c6bd' }
      : v === 'green' ? { background: GREEN, color: '#fff' }
      : { background: '#fff', color: INK, border: '1px solid ' + LINE };
    return h('button', { onClick: props.onClick, disabled: props.disabled, style: Object.assign(base, skin, props.style) }, props.children);
  }
  function Pill(props) { return h('span', { style: Object.assign({ padding: '3px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }, pillStyle(props.status)) }, (props.label || props.status || '').toString().replace(/_/g, ' ')); }
  function Eyebrow(props) { return h('div', { style: { color: props.color || TEAL, letterSpacing: '.18em', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 } }, props.children); }
  function Spinner(props) { return h('div', { style: { padding: 48, textAlign: 'center', color: MUTED } }, h('div', { className: 'rl-display', style: { fontSize: 22 } }, '🩺'), h('div', { style: { marginTop: 8 } }, props.label || 'Loading…')); }
  function Empty(props) {
    return h('div', { className: 'rl-card', style: { padding: 38, textAlign: 'center', color: MUTED, borderStyle: 'dashed' } },
      h('div', { style: { fontSize: 32, marginBottom: 8 } }, props.icon || '🗂️'),
      h('div', { className: 'rl-display', style: { fontSize: 19, color: INK, marginBottom: 6 } }, props.title || 'Nothing here yet'),
      h('div', { style: { fontSize: 14, maxWidth: 340, margin: '0 auto' } }, props.body || ''),
      props.action ? h('div', { style: { marginTop: 16 } }, props.action) : null);
  }
  function Modal(props) {
    if (!props.open) return null;
    return h('div', { onClick: props.onClose, style: { position: 'fixed', inset: 0, background: 'rgba(20,40,60,.5)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflow: 'auto' } },
      h('div', { onClick: function (e) { e.stopPropagation(); }, className: 'rl-rise', style: { background: '#fff', borderRadius: 18, width: '100%', maxWidth: props.wide ? 640 : 460, padding: 24, boxShadow: '0 30px 80px -30px rgba(0,0,0,.5)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 } },
          h('div', { className: 'rl-display', style: { fontSize: 20, fontWeight: 700 } }, props.title),
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
    return h('div', { className: 'rl-card rl-fade', style: { padding: 18 } },
      h('div', { style: { fontSize: 12, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' } }, props.label),
      h('div', { className: 'rl-display', style: { fontSize: 28, fontWeight: 700, marginTop: 6, color: props.color || INK } }, props.value),
      props.sub ? h('div', { style: { fontSize: 12.5, color: MUTED, marginTop: 4 } }, props.sub) : null);
  }
  function Bars(props) {
    var rows = props.data || [], max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    return h('div', null, rows.length === 0 ? h('div', { style: { color: MUTED, fontSize: 13 } }, 'No data yet') :
      rows.map(function (r, i) {
        return h('div', { key: i, style: { marginBottom: 12 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 } }, h('span', { style: { fontWeight: 600 } }, r.label), h('span', { style: { color: MUTED } }, props.money ? usd(r.value) : (props.pct ? r.value + '%' : num(r.value)))),
          h('div', { style: { height: 9, background: '#e3e9ea', borderRadius: 9 } }, h('div', { style: { width: Math.max(3, (props.pct ? r.value : (r.value / max) * 100)) + '%', height: '100%', borderRadius: 9, background: props.color || TEAL } })));
      }));
  }
  function row(a, b) { return h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14 } }, h('span', { style: { color: MUTED } }, a), h('span', null, b)); }
  function ShiftCard(props) {
    var s = props.s;
    return h('div', { className: 'rl-card rl-fade', style: { padding: 16 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } }, h('span', { style: { padding: '2px 9px', borderRadius: 7, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700 } }, s.role), h('span', { className: 'rl-display', style: { fontSize: 16, fontWeight: 700 } }, s.specialty)),
          h('div', { style: { fontSize: 12.5, color: MUTED, marginTop: 4 } }, fmtDate(s.start_time) + ' · ' + timeStr(s.start_time) + '–' + timeStr(s.end_time) + ' · ' + s.hours + 'h')),
        h(Pill, { status: s.status, label: s.status === 'requested' ? 'Open' : s.status })),
      h('div', { style: { fontSize: 13, color: MUTED, margin: '8px 0' } }, '📍 ' + (s.location || s.facility_name)),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', null, h('span', { className: 'rl-display', style: { fontSize: 20, fontWeight: 700, color: TEAL } }, usd(s.rate_hourly)), h('span', { style: { color: MUTED, fontSize: 12 } }, '/hr · ' + usd(s.pay_total) + ' total')),
        props.action || (s.clinician_name ? h('span', { style: { fontSize: 12, color: MUTED } }, '👤 ' + s.clinician_name) : null)));
  }

  /* ============================ auth screen ============================ */
  function AuthScreen(props) {
    var s = React.useState('login'), tab = s[0], setTab = s[1];
    var e1 = React.useState('clinician@relay.app'), email = e1[0], setEmail = e1[1];
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
        .then(function () { return client.createObject('profile', { display_name: full || email.split('@')[0], persona: 'clinician', email: email, credentialed: false }); })
        .then(function () { showToast('Welcome to Relay!', 'success'); props.onDone(); })
        .catch(function (err) { showToast('Sign up failed: ' + (err && err.message || err), 'error'); }).finally(function () { setBusy(false); });
    }
    var chips = [['Clinician', 'clinician@relay.app'], ['Facility', 'facility@relay.app'], ['Admin', 'admin@relay.app']];
    return h('div', { style: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(1100px 560px at 75% -10%, ' + TEAL + ' 0%, ' + NAVY + ' 55%, #0a1622 100%)' } },
      h('div', { className: 'rl-rise', style: { width: '100%', maxWidth: 410 } },
        h('div', { style: { textAlign: 'center', marginBottom: 18, color: '#fff' } },
          h('div', { className: 'rl-display', style: { fontSize: 38, fontWeight: 800 } }, '🩺 Relay'),
          h('div', { style: { opacity: .8, marginTop: 4 } }, 'Per-diem shifts, filled fast.')),
        h('div', { style: { background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 30px 70px -30px rgba(0,0,0,.6)' } },
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 16 } }, ['login', 'signup'].map(function (t) {
            return h('button', { key: t, onClick: function () { setTab(t); }, style: { flex: 1, padding: '8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, background: tab === t ? NAVY : '#e9eef0', color: tab === t ? '#fff' : MUTED } }, t === 'login' ? 'Sign in' : 'Sign up');
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
        h('div', { style: { textAlign: 'center', marginTop: 14 } }, h('button', { onClick: props.onBrowse, style: { background: 'none', border: 'none', color: 'rgba(255,255,255,.85)', cursor: 'pointer', fontSize: 13, fontWeight: 600 } }, '← Browse open shifts'))));
  }

  /* ============================ public site ============================ */
  var DEMO_SHIFTS = [['RN','ICU',68,12,1],['RN','ER',72,12,2],['LPN','Med-Surg',42,8,3],['CNA','LTC',26,8,4],['RN','OR',78,10,5],['NP','ICU',95,10,6]].map(function(x,i){var st=new Date(Date.now()+x[4]*86400000);st.setHours(7,0,0,0);var en=new Date(st.getTime()+x[3]*3600000);return {uuid:'demo-'+i,role:x[0],specialty:x[1],rate_hourly:x[2],hours:x[3],pay_total:x[2]*x[3],status:'requested',facility_name:'Maple Ridge Medical',location:'Maple Ridge Medical, Portland, OR',start_time:st.toISOString(),end_time:en.toISOString()};});
  function Marketing(props) {
    function card(emoji, title, body) {
      return h('div', { className: 'rl-card', style: { padding: 24 } },
        h('div', { style: { fontSize: 30, marginBottom: 10 } }, emoji),
        h('div', { className: 'rl-display', style: { fontSize: 20, fontWeight: 700, marginBottom: 6 } }, title),
        h('div', { style: { color: MUTED, fontSize: 14, lineHeight: 1.55 } }, body));
    }
    return h('div', null,
      h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '58px 20px 6px' } },
        h(Eyebrow, { color: CORAL }, 'How it works'),
        h('div', { className: 'rl-display', style: { fontSize: 32, fontWeight: 700, marginBottom: 24 } }, "Work when you want. Get paid fast."),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 } },
          card("\ud83d\udd0e", "Browse open shifts", "Filter by role, specialty, date and pay rate."),
        card("\ud83e\ude7a", "Claim & work", "Lock in the shift, check in on site, do what you do best."),
        card("\ud83d\udcb8", "Submit & get paid", "Send your timesheet \u2014 payout lands without an agency cut."))),
      h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '44px 20px' } },
        h('div', { className: 'rl-card', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 0, overflow: 'hidden', padding: 0 } },
          h(Img, { src: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=1200&h=900", style: { width: '100%', height: 340, objectFit: 'cover' } }),
          h('div', { style: { padding: '32px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
            h(Eyebrow, { color: CORAL }, "For facilities"),
            h('div', { className: 'rl-display', style: { fontSize: 30, fontWeight: 700, marginBottom: 10 } }, "Fill open shifts in minutes"),
            h('div', { style: { color: MUTED, fontSize: 15.5, lineHeight: 1.6, marginBottom: 20 } }, "Post shifts, approve timesheets, and pay credentialed clinicians directly \u2014 no agency markup, no phone tag."),
            h('div', null, h(Btn, { variant: 'coral', onClick: props.onSignIn }, "For facilities"))))),
      h('div', { style: { background: "#e7f3f2", borderTop: '1px solid ' + LINE, borderBottom: '1px solid ' + LINE } },
        h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '22px 20px', display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center' } },
          ["Credentialed clinicians", "No agency middleman", "Timesheets paid fast"].map(function (t, i) { return h('div', { key: i, style: { fontWeight: 600, fontSize: 14.5, color: INK } }, '✓ ' + t); }))));
  }
  function PublicSite(props) {
    var s1 = React.useState([]), shifts = s1[0], setS = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState('All'), rf = s3[0], setRf = s3[1];
    React.useEffect(function () { Promise.resolve(pub('shift')).then(function (v) { var rq = v.filter(function (x) { return x.status === 'requested'; }); setS(rq.length ? rq : DEMO_SHIFTS); setL(false); }); }, []);
    var roles = ['All'].concat(Object.keys(groupBy(shifts, function (v) { return v.role; })));
    var shown = rf === 'All' ? shifts : shifts.filter(function (v) { return v.role === rf; });
    return h('div', { style: { minHeight: '100vh' } },
      h('div', { style: { position: 'sticky', top: 0, zIndex: 30, background: 'rgba(242,245,246,.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid ' + LINE } },
        h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', { className: 'rl-display', style: { fontSize: 22, fontWeight: 800, color: NAVY } }, '🩺 Relay'), h(Btn, { onClick: props.onSignIn }, 'Sign in'))),
      h('div', { style: { background: 'linear-gradient(135deg,' + NAVY + ',' + TEAL + ')', color: '#fff' } },
        h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '60px 20px 68px' } },
          h(Eyebrow, { color: AMBER }, 'Credentialed · Flexible · Paid fast'),
          h('div', { className: 'rl-display', style: { fontSize: 50, fontWeight: 800, lineHeight: 1.05, maxWidth: 720 } }, 'Per-diem shifts that fit your life.'),
          h('div', { style: { opacity: .85, marginTop: 16, fontSize: 17, maxWidth: 560 } }, 'Claim open clinical shifts near you, submit your timesheet, and get paid — no agency middleman.'),
          h('div', { style: { marginTop: 24 } }, h(Btn, { variant: 'coral', onClick: props.onSignIn }, 'Find shifts')))),
      h(Marketing, { onSignIn: props.onSignIn }),
      h('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '40px 20px 70px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 } },
          h('div', { className: 'rl-display', style: { fontSize: 28, fontWeight: 700 } }, 'Open shifts'),
          h('div', { className: 'rl-scroll', style: { display: 'flex', gap: 8, overflowX: 'auto' } }, roles.map(function (c) { return h('button', { key: c, onClick: function () { setRf(c); }, style: { padding: '7px 14px', borderRadius: 999, border: '1px solid ' + LINE, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', background: rf === c ? NAVY : '#fff', color: rf === c ? '#fff' : INK } }, c); }))),
        loading ? h(Spinner, null) : shown.length === 0 ? h(Empty, { title: 'No open shifts right now', body: 'Check back soon — new shifts post daily.' }) :
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 } }, shown.map(function (sv) { return h('div', { key: sv.uuid, className: 'rl-link', onClick: props.onSignIn }, h(ShiftCard, { s: sv })); }))),
      h('div', { style: { borderTop: '1px solid ' + LINE, padding: '26px 20px', textAlign: 'center', color: MUTED, fontSize: 13 } }, 'Relay — built on Supero. Sign in to claim shifts, post shifts, or credential clinicians.'));
  }

  /* ============================== layout =============================== */
  function TopBar(props) {
    return h('div', { style: { position: 'sticky', top: 0, zIndex: 40, background: 'rgba(242,245,246,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid ' + LINE } },
      h('div', { style: { maxWidth: 1160, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 } },
        h('div', { className: 'rl-display rl-link', onClick: function () { props.go(props.home); }, style: { fontSize: 20, fontWeight: 800, color: NAVY } }, '🩺 Relay'),
        h('div', { className: 'rl-scroll', style: { display: 'flex', gap: 4, marginLeft: 8, overflowX: 'auto', flex: 1 } }, props.nav.map(function (n) {
          var active = props.route.indexOf(n.route) === 0;
          return h('button', { key: n.route, onClick: function () { props.go(n.route); }, style: { padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', background: active ? NAVY : 'transparent', color: active ? '#fff' : INK } }, n.label);
        })),
        props.modes.length > 1 ? h('select', { value: props.mode, onChange: function (e) { props.setMode(e.target.value); }, style: { padding: '7px 10px', borderRadius: 9, border: '1px solid ' + LINE, fontWeight: 600, fontSize: 13, background: '#fff', cursor: 'pointer' } }, props.modes.map(function (m) { return h('option', { key: m, value: m }, m.charAt(0).toUpperCase() + m.slice(1)); })) : null,
        h('button', { onClick: props.onLogout, title: 'Sign out', style: { padding: '7px 12px', borderRadius: 9, border: '1px solid ' + LINE, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 } }, '⎋')));
  }
  function Page(props) { return h('div', { className: 'rl-fade', style: { maxWidth: 1160, margin: '0 auto', padding: '26px 20px 80px' } }, props.children); }
  function H1(props) { return h('div', { style: { marginBottom: 20 } }, props.eyebrow ? h(Eyebrow, null, props.eyebrow) : null, h('div', { className: 'rl-display', style: { fontSize: 30, fontWeight: 700 } }, props.children), props.sub ? h('div', { style: { color: MUTED, marginTop: 6 } }, props.sub) : null); }

  /* ============================== CLINICIAN ========================== */
  function ClinicianApp(props) {
    var route = props.route, go = props.go, seg = route.replace(/^#\//, '').split('/');
    var nav = [{ route: '#/shifts', label: 'Find shifts' }, { route: '#/mine', label: 'My shifts' }, { route: '#/wallet', label: 'Credentials' }, { route: '#/earnings', label: 'Earnings' }];
    var inner;
    if (seg[0] === 'mine') inner = h(MyShifts, { go: go });
    else if (seg[0] === 'wallet') inner = h(Wallet, null);
    else if (seg[0] === 'earnings') inner = h(Earnings, null);
    else inner = h(FindShifts, { go: go });
    return h('div', null, h(TopBar, { route: route, go: go, nav: nav, home: '#/shifts', modes: props.modes, mode: props.mode, setMode: props.setMode, onLogout: props.onLogout }), h(Page, null, inner));
  }
  function FindShifts(props) {
    var s1 = React.useState([]), shifts = s1[0], setS = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState('All'), rf = s3[0], setRf = s3[1];
    var s4 = React.useState(''), busy = s4[0], setBusy = s4[1];
    function load() { getAll('shift').then(function (v) { setS(v.filter(function (x) { return x.status === 'requested'; })); setL(false); }); }
    React.useEffect(load, []);
    function claim(sv) {
      setBusy(sv.uuid);
      // booking.book (requested→confirmed) + stamp the claiming clinician.
      transition('booking', 'book', sv, 'shift', 'confirmed')
        .then(function () { return client.updateObject('shift', sv.uuid, { clinician_username: uname(), clinician_name: (client.userInfo || {}).fullName || uname() }, sv); })
        .then(function () { showToast('Shift claimed! See "My shifts".', 'success'); load(); }).catch(txnErr).finally(function () { setBusy(''); });
    }
    if (loading) return h(Spinner, null);
    var roles = ['All'].concat(Object.keys(groupBy(shifts, function (v) { return v.role; })));
    var shown = rf === 'All' ? shifts : shifts.filter(function (v) { return v.role === rf; });
    return h('div', null, h(H1, { eyebrow: 'Clinician', sub: 'Claim an open shift to add it to your schedule' }, 'Find shifts'),
      h('div', { className: 'rl-scroll', style: { display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18 } }, roles.map(function (c) { return h('button', { key: c, onClick: function () { setRf(c); }, style: { padding: '7px 14px', borderRadius: 999, border: '1px solid ' + LINE, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', background: rf === c ? NAVY : '#fff', color: rf === c ? '#fff' : INK } }, c); })),
      shown.length === 0 ? h(Empty, { icon: '🗓️', title: 'No open shifts', body: 'New shifts post daily — check back soon.' }) :
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 } }, shown.map(function (sv) {
          return h(ShiftCard, { key: sv.uuid, s: sv, action: h(Btn, { sm: true, variant: 'coral', disabled: busy === sv.uuid, onClick: function () { claim(sv); } }, 'Claim') });
        })));
  }
  function MyShifts(props) {
    var s1 = React.useState([]), shifts = s1[0], setS = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(''), busy = s3[0], setBusy = s3[1];
    function load() { getAll('shift').then(function (v) { setS(v.filter(function (x) { return x.clinician_username === uname(); }).sort(function (p, q) { return (q.start_time || '').localeCompare(p.start_time || ''); })); setL(false); }); }
    React.useEffect(load, []);
    function checkIn(sv) { setBusy(sv.uuid); client.updateObject('shift', sv.uuid, { checked_in_at: nowIso() }, sv).then(function () { showToast('Checked in', 'success'); load(); }).catch(function (e) { showToast('Failed: ' + (e && e.message || e), 'error'); }).finally(function () { setBusy(''); }); }
    function checkOut(sv) {
      setBusy(sv.uuid);
      // check out → complete the booking → create a timesheet (approval) + submit.
      client.updateObject('shift', sv.uuid, { checked_out_at: nowIso() }, sv)
        .then(function () { return transition('booking', 'complete', sv, 'shift', 'completed'); })
        .then(function () { return client.createObject('timesheet', { display_name: 'Timesheet ' + sv.display_name, status: 'draft', subject: 'Timesheet ' + sv.display_name, shift_uuid: sv.uuid, facility_username: sv.facility_username, facility_name: sv.facility_name, clinician_name: (client.userInfo || {}).fullName || uname(), hours: sv.hours, rate_hourly: sv.rate_hourly, amount: sv.pay_total, shift_date: (sv.shift_date || '') }); })
        .then(function (ts) { return client.createObject('timesheet_step', { display_name: 'Facility approval', status: 'pending', parent_type: 'timesheet', parent_uuid: ts.uuid, approval_uuid: ts.uuid, step_index: 0 }).then(function () { return approvalOp('submit_approval', ts, 'timesheet', 'timesheet_step', 'pending'); }).catch(function () { return null; }); })
        .then(function () { showToast('Checked out — timesheet submitted for approval', 'success'); load(); })
        .catch(function (e) { showToast('Failed: ' + (e && e.message || e), 'error'); }).finally(function () { setBusy(''); });
    }
    if (loading) return h(Spinner, null);
    var upcoming = shifts.filter(function (s) { return s.status === 'confirmed'; }), done = shifts.filter(function (s) { return s.status === 'completed'; });
    return h('div', null, h(H1, { eyebrow: 'Clinician' }, 'My shifts'),
      upcoming.length === 0 && done.length === 0 ? h(Empty, { icon: '🩺', title: 'No claimed shifts', body: 'Claim a shift to see it here.', action: h(Btn, { onClick: function () { props.go('#/shifts'); } }, 'Find shifts') }) : null,
      upcoming.length ? h('div', { style: { marginBottom: 24 } }, h('div', { className: 'rl-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 10 } }, 'Upcoming'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 } }, upcoming.map(function (sv) {
          var action = !sv.checked_in_at ? h(Btn, { sm: true, variant: 'teal', disabled: busy === sv.uuid, onClick: function () { checkIn(sv); } }, 'Check in')
            : h(Btn, { sm: true, variant: 'green', disabled: busy === sv.uuid, onClick: function () { checkOut(sv); } }, 'Check out');
          return h(ShiftCard, { key: sv.uuid, s: sv, action: action });
        }))) : null,
      done.length ? h('div', null, h('div', { className: 'rl-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 10 } }, 'Completed'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 } }, done.map(function (sv) { return h(ShiftCard, { key: sv.uuid, s: sv, action: h(Pill, { status: 'completed' }) }); }))) : null);
  }
  function Wallet() {
    var s1 = React.useState([]), creds = s1[0], setC = s1[1];
    var s2 = React.useState([]), vers = s2[0], setV = s2[1];
    var s3 = React.useState(true), loading = s3[0], setL = s3[1];
    var s4 = React.useState(false), adding = s4[0], setAdding = s4[1];
    function load() { Promise.all([getAll('credential'), getAll('verification')]).then(function (r) { setC(r[0].filter(function (x) { return x.owner_username === uname(); })); setV(r[1].filter(function (x) { return x.owner_username === uname(); })); setL(false); }); }
    React.useEffect(load, []);
    if (loading) return h(Spinner, null);
    function verFor(c) { return vers.filter(function (v) { return v.credential_uuid === c.uuid; })[0]; }
    return h('div', null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' } }, h(H1, { eyebrow: 'Clinician', sub: 'Keep your licenses and certs verified to claim shifts' }, 'Credential wallet'), h(Btn, { variant: 'teal', onClick: function () { setAdding(true); } }, '+ Add credential')),
      creds.length === 0 ? h(Empty, { icon: '📋', title: 'No credentials yet', body: 'Upload your license and certs to get verified.' }) :
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 } }, creds.map(function (c) {
          var v = verFor(c);
          return h('div', { key: c.uuid, className: 'rl-card', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { className: 'rl-display', style: { fontSize: 16, fontWeight: 700 } }, c.kind), h(Pill, { status: c.verified ? 'approved' : (v ? v.status : c.status), label: c.verified ? 'Verified' : (v ? v.status : c.status) })),
            h('div', { style: { fontSize: 12.5, color: MUTED, marginTop: 6 } }, 'Expires ' + (c.expires_on || '—')),
            c.verified ? h('div', { style: { fontSize: 12.5, color: GREEN, fontWeight: 600, marginTop: 8 } }, '✓ Verified credential') : h('div', { style: { fontSize: 12.5, color: AMBER, fontWeight: 600, marginTop: 8 } }, '⏳ Awaiting verification'));
        })),
      adding ? h(CredModal, { onClose: function () { setAdding(false); }, onDone: function () { setAdding(false); load(); } }) : null);
  }
  function CredModal(props) {
    var f1 = React.useState('RN License'), kind = f1[0], setKind = f1[1];
    var f2 = React.useState(''), exp = f2[0], setExp = f2[1];
    var f3 = React.useState(null), file = f3[0], setFile = f3[1];
    var f4 = React.useState(false), busy = f4[0], setBusy = f4[1];
    function upload(e) { var fl = e.target.files && e.target.files[0]; if (!fl) return; fileService.upload(fl).then(function (ref) { setFile(ref); showToast('Uploaded', 'success'); }).catch(function () { showToast('Upload failed', 'error'); }); }
    function save() {
      setBusy(true);
      // create credential (pending_upload) → markUploaded → create verification + submit.
      var cu;
      client.createObject('credential', { display_name: (client.userInfo || {}).fullName + ' — ' + kind, status: 'pending_upload', clinician_name: (client.userInfo || {}).fullName || uname(), kind: kind, expires_on: exp, verified: false, file: file || undefined })
        .then(function (c) { cu = c; return transition('attachment', 'markUploaded', c, 'credential', 'uploaded').catch(function () { return null; }); })
        .then(function () { return client.createObject('verification', { display_name: 'Verify ' + kind, status: 'draft', subject: 'Verify ' + kind, credential_uuid: cu.uuid, credential_kind: kind, clinician_name: (client.userInfo || {}).fullName || uname() }); })
        .then(function (v) { return client.createObject('verification_step', { display_name: 'Admin review', status: 'pending', parent_type: 'verification', parent_uuid: v.uuid, approval_uuid: v.uuid, step_index: 0 }).then(function () { return approvalOp('submit_approval', v, 'verification', 'verification_step', 'pending'); }).catch(function () { return null; }); })
        .then(function () { showToast('Submitted for verification', 'success'); props.onDone(); })
        .catch(function (e) { showToast('Failed: ' + (e && e.message || e), 'error'); }).finally(function () { setBusy(false); });
    }
    return h(Modal, { open: true, onClose: props.onClose, title: 'Add credential' },
      h(Field, { label: 'Type', value: kind, onChange: function (e) { setKind(e.target.value); }, options: ['RN License', 'LPN License', 'CNA Cert', 'BLS', 'ACLS', 'PALS', 'TB Test', 'COVID Vax'] }),
      h(Field, { label: 'Expires on', type: 'date', value: exp, onChange: function (e) { setExp(e.target.value); } }),
      h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', margin: '4px 0 14px' } }, file ? h('span', { style: { fontSize: 13, color: GREEN } }, '✓ file attached') : null, h('label', { style: { cursor: 'pointer', color: TEAL, fontWeight: 600, fontSize: 13 } }, '⬆ Upload document', h('input', { type: 'file', onChange: upload, style: { display: 'none' } }))),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } }, h(Btn, { variant: 'ghost', onClick: props.onClose }, 'Cancel'), h(Btn, { onClick: save, disabled: busy }, busy ? 'Submitting…' : 'Submit for verification')));
  }
  function Earnings() {
    var s1 = React.useState([]), payouts = s1[0], setP = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    React.useEffect(function () { getAll('payout').then(function (p) { setP(p.filter(function (x) { return x.owner_username === uname(); })); setL(false); }); }, []);
    if (loading) return h(Spinner, null);
    var paid = sumBy(payouts.filter(function (p) { return p.status === 'captured'; }), function (p) { return p.amount; });
    var pending = sumBy(payouts.filter(function (p) { return p.status !== 'captured'; }), function (p) { return p.amount; });
    return h('div', null, h(H1, { eyebrow: 'Clinician', sub: 'Your pay across completed shifts' }, 'Earnings'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 } },
        h(Tile, { label: 'Paid', value: usd(paid), color: GREEN }), h(Tile, { label: 'Pending', value: usd(pending), color: AMBER }), h(Tile, { label: 'Shifts paid', value: payouts.filter(function (p) { return p.status === 'captured'; }).length })),
      payouts.length === 0 ? h(Empty, { icon: '💰', title: 'No earnings yet', body: 'Complete a shift and submit your timesheet to get paid.' }) :
        h('div', { className: 'rl-card', style: { padding: 8 } }, payouts.map(function (p) {
          return h('div', { key: p.uuid, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid ' + LINE } },
            h('div', null, h('div', { style: { fontWeight: 600 } }, p.facility_name + ' · ' + p.display_name), h('div', { style: { fontSize: 12.5, color: MUTED } }, (p.invoice_id || ''))),
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } }, h(Pill, { status: p.status }), h('span', { className: 'rl-display', style: { fontSize: 18, fontWeight: 700 } }, usd(p.amount))));
        })));
  }

  /* ============================== FACILITY ============================ */
  function FacilityApp(props) {
    var route = props.route, go = props.go, seg = route.replace(/^#\//, '').split('/');
    var nav = [{ route: '#/f/shifts', label: 'My shifts' }, { route: '#/f/timesheets', label: 'Timesheets' }, { route: '#/f/contracts', label: 'Contracts' }];
    var inner = seg[1] === 'timesheets' ? h(FacilityTimesheets, null) : seg[1] === 'contracts' ? h(FacilityContracts, null) : h(FacilityShifts, null);
    return h('div', null, h(TopBar, { route: route, go: go, nav: nav, home: '#/f/shifts', modes: props.modes, mode: props.mode, setMode: props.setMode, onLogout: props.onLogout }), h(Page, null, inner));
  }
  function FacilityShifts() {
    var s1 = React.useState([]), shifts = s1[0], setS = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(false), posting = s3[0], setPosting = s3[1];
    function load() { getAll('shift').then(function (v) { setS(v.sort(function (p, q) { return (q.start_time || '').localeCompare(p.start_time || ''); })); setL(false); }); }
    React.useEffect(load, []);
    if (loading) return h(Spinner, null);
    var open = shifts.filter(function (s) { return s.status === 'requested'; }), filled = shifts.filter(function (s) { return ['confirmed', 'completed'].indexOf(s.status) >= 0; });
    return h('div', null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' } }, h(H1, { eyebrow: 'Facility', sub: 'Post open shifts and track who claims them' }, 'My shifts'), h(Btn, { variant: 'coral', onClick: function () { setPosting(true); } }, '+ Post a shift')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 20 } },
        h(Tile, { label: 'Open', value: open.length, color: AMBER }), h(Tile, { label: 'Filled', value: filled.length, color: TEAL }), h(Tile, { label: 'Fill rate', value: (shifts.length ? Math.round(filled.length / shifts.length * 100) : 0) + '%', color: GREEN })),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 } }, shifts.map(function (sv) { return h(ShiftCard, { key: sv.uuid, s: sv }); })),
      posting ? h(PostModal, { onClose: function () { setPosting(false); }, onDone: function () { setPosting(false); load(); } }) : null);
  }
  function PostModal(props) {
    var f1 = React.useState('RN'), role = f1[0], setRole = f1[1];
    var f2 = React.useState('ICU'), spec = f2[0], setSpec = f2[1];
    var f3 = React.useState('68'), rate = f3[0], setRate = f3[1];
    var f4 = React.useState('12'), hours = f4[0], setHours = f4[1];
    var f5 = React.useState(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)), date = f5[0], setDate = f5[1];
    var f6 = React.useState('07:00'), time = f6[0], setTime = f6[1];
    var f7 = React.useState(false), busy = f7[0], setBusy = f7[1];
    function save() {
      setBusy(true);
      var start = new Date(date + 'T' + time + ':00').toISOString();
      var end = new Date(new Date(start).getTime() + (parseFloat(hours) || 8) * 3600000).toISOString();
      var n = 'SHF-' + String(Date.now()).slice(-4);
      client.createObject('shift', { display_name: role + ' · ' + spec, status: 'requested', start_time: start, end_time: end,
        facility_username: uname(), facility_name: (client.userInfo || {}).fullName || 'Facility', role: role, specialty: spec,
        rate_hourly: parseFloat(rate) || 0, hours: parseFloat(hours) || 0, pay_total: (parseFloat(rate) || 0) * (parseFloat(hours) || 0),
        shift_date: date, location: (client.userInfo || {}).fullName || 'Facility' })
        .then(function () { showToast('Shift posted', 'success'); props.onDone(); }).catch(function (e) { showToast('Failed: ' + (e && e.message || e), 'error'); }).finally(function () { setBusy(false); });
    }
    return h(Modal, { open: true, onClose: props.onClose, title: 'Post a shift' },
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        h(Field, { label: 'Role', value: role, onChange: function (e) { setRole(e.target.value); }, options: ['RN', 'LPN', 'CNA', 'NP', 'PT', 'RT'] }),
        h(Field, { label: 'Specialty', value: spec, onChange: function (e) { setSpec(e.target.value); } })),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        h(Field, { label: 'Hourly rate', type: 'number', value: rate, onChange: function (e) { setRate(e.target.value); } }),
        h(Field, { label: 'Hours', type: 'number', value: hours, onChange: function (e) { setHours(e.target.value); } })),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        h(Field, { label: 'Date', type: 'date', value: date, onChange: function (e) { setDate(e.target.value); } }),
        h(Field, { label: 'Start time', type: 'time', value: time, onChange: function (e) { setTime(e.target.value); } })),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } }, h(Btn, { variant: 'ghost', onClick: props.onClose }, 'Cancel'), h(Btn, { onClick: save, disabled: busy }, busy ? 'Posting…' : 'Post shift')));
  }
  function FacilityTimesheets() {
    var s1 = React.useState([]), sheets = s1[0], setT = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(''), busy = s3[0], setBusy = s3[1];
    function load() { getAll('timesheet').then(function (t) { setT(t.filter(function (x) { return x.facility_username === uname(); })); setL(false); }); }
    React.useEffect(load, []);
    function decide(t, ok) {
      setBusy(t.uuid);
      var op = ok ? 'approve_step' : 'reject_step', next = ok ? 'approved' : 'rejected';
      approvalOp(op, t, 'timesheet', 'timesheet_step', next, 'Facility ' + (ok ? 'approved' : 'disputed'))
        .then(function () { showToast(ok ? 'Timesheet approved' : 'Timesheet disputed', ok ? 'success' : 'info'); load(); }).catch(txnErr).finally(function () { setBusy(''); });
    }
    if (loading) return h(Spinner, null);
    return h('div', null, h(H1, { eyebrow: 'Facility', sub: 'Approve worked hours to release clinician pay' }, 'Timesheets'),
      sheets.length === 0 ? h(Empty, { icon: '🧾', title: 'No timesheets', body: 'Submitted timesheets from clinicians appear here.' }) :
        h('div', { style: { display: 'grid', gap: 14 } }, sheets.map(function (t) {
          return h('div', { key: t.uuid, className: 'rl-card', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', null, h('div', { style: { fontWeight: 700 } }, t.clinician_name + ' · ' + t.hours + 'h @ ' + usd(t.rate_hourly)), h('div', { style: { fontSize: 13, color: MUTED } }, t.display_name + ' · ' + usd(t.amount) + ' · ' + (t.shift_date || ''))), h(Pill, { status: t.status })),
            t.status === 'pending' ? h('div', { style: { display: 'flex', gap: 8, marginTop: 12 } }, h(Btn, { sm: true, variant: 'green', disabled: busy === t.uuid, onClick: function () { decide(t, true); } }, 'Approve & pay'), h(Btn, { sm: true, variant: 'danger', disabled: busy === t.uuid, onClick: function () { decide(t, false); } }, 'Dispute')) : null);
        })));
  }
  function FacilityContracts() {
    var s1 = React.useState([]), contracts = s1[0], setC = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(''), busy = s3[0], setBusy = s3[1];
    function load() { getAll('contract').then(function (c) { setC(c); setL(false); }); }
    React.useEffect(load, []);
    function activate(c) { setBusy(c.uuid); transition('recurring_plan', 'start', c, 'contract', 'active').then(function () { showToast('Agreement activated', 'success'); load(); }).catch(txnErr).finally(function () { setBusy(''); }); }
    if (loading) return h(Spinner, null);
    return h('div', null, h(H1, { eyebrow: 'Facility', sub: 'Recurring block-booking agreements' }, 'Staffing contracts'),
      contracts.length === 0 ? h(Empty, { icon: '📑', title: 'No contracts', body: 'Set up a recurring agreement to guarantee coverage.' }) :
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 } }, contracts.map(function (c) {
          return h('div', { key: c.uuid, className: 'rl-card', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('div', { className: 'rl-display', style: { fontSize: 17, fontWeight: 700 } }, c.plan_name), h(Pill, { status: c.status })),
            h('div', { style: { color: MUTED, fontSize: 13.5, margin: '6px 0' } }, usd(c.billing_amount) + ' / ' + (c.billing_interval || 'month') + ' · ' + (c.shifts_per_period || 0) + ' shifts'),
            c.status === 'inactive' ? h(Btn, { sm: true, variant: 'green', disabled: busy === c.uuid, onClick: function () { activate(c); } }, 'Activate') : h('span', { style: { fontSize: 12.5, color: GREEN, fontWeight: 600 } }, '✓ Active'));
        })));
  }

  /* ============================== ADMIN ============================== */
  function AdminApp(props) {
    var route = props.route, go = props.go, seg = route.replace(/^#\//, '').split('/');
    var nav = [{ route: '#/a/queue', label: 'Credentialing' }, { route: '#/a/dash', label: 'Dashboard' }, { route: '#/a/saga', label: 'Settlement saga' }];
    var inner = seg[1] === 'dash' ? h(AdminDash, null) : seg[1] === 'saga' ? h(SettlementSaga, null) : h(CredQueue, null);
    return h('div', null, h(TopBar, { route: route, go: go, nav: nav, home: '#/a/queue', modes: props.modes, mode: props.mode, setMode: props.setMode, onLogout: props.onLogout }), h(Page, null, inner));
  }
  function CredQueue() {
    var s1 = React.useState([]), vers = s1[0], setV = s1[1];
    var s2 = React.useState(true), loading = s2[0], setL = s2[1];
    var s3 = React.useState(''), busy = s3[0], setBusy = s3[1];
    var s4 = React.useState(null), active = s4[0], setActive = s4[1];
    var s5 = React.useState(''), tri = s5[0], setTri = s5[1];
    function load() { getAll('verification').then(function (v) { setV(v); setL(false); }); }
    React.useEffect(load, []);
    function decide(v, ok) {
      setBusy(v.uuid);
      var op = ok ? 'approve_step' : 'reject_step', next = ok ? 'approved' : 'rejected';
      approvalOp(op, v, 'verification', 'verification_step', next, 'Admin ' + (ok ? 'verified' : 'rejected'))
        .then(function () { if (v.credential_uuid && ok) return client.updateObject('credential', v.credential_uuid, { verified: true, status: 'scanned' }, { uuid: v.credential_uuid }).catch(function () {}); })
        .then(function () { if (ok) return runSaga('credential_verified', { verification_uuid: v.uuid, clinician_email: v.owner_username, credential_kind: v.credential_kind }).catch(function () {}); })
        .then(function () { showToast(ok ? 'Credential verified' : 'Verification rejected', ok ? 'success' : 'info'); load(); }).catch(txnErr).finally(function () { setBusy(''); });
    }
    function triage(v) { setActive(v); setTri(''); Promise.resolve(services.ai.complete({ prompt: 'A clinician submitted a ' + v.credential_kind + ' credential for ' + v.clinician_name + '. List the 3 key things a credentialing specialist should verify, in one short line each.' })).then(function (r) { setTri(aiText(r) || 'Confirm license number, expiry date, and primary-source verification with the issuing board.'); }).catch(function () { setTri('Confirm license number, expiry date, and primary-source verification with the issuing board.'); }); }
    if (loading) return h(Spinner, null);
    var queue = vers.filter(function (v) { return ['pending', 'draft'].indexOf(v.status) >= 0; }), done = vers.filter(function (v) { return ['approved', 'rejected'].indexOf(v.status) >= 0; });
    return h('div', null, h(H1, { eyebrow: 'Admin', sub: 'Verify clinician credentials before they claim shifts' }, 'Credentialing queue'),
      queue.length === 0 ? h(Empty, { icon: '✅', title: 'Queue is clear', body: 'No pending verifications.' }) :
        h('div', { style: { display: 'grid', gap: 14, marginBottom: 24 } }, queue.map(function (v) {
          return h('div', { key: v.uuid, className: 'rl-card', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 } },
              h('div', null, h('div', { style: { fontWeight: 700 } }, v.clinician_name + ' · ' + v.credential_kind), h('div', { style: { fontSize: 13, color: MUTED, marginTop: 2 } }, v.display_name)),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, h(Btn, { sm: true, variant: 'ghost', onClick: function () { triage(v); } }, '✨ AI checklist'), h('div', { style: { display: 'flex', gap: 6 } }, h(Btn, { sm: true, variant: 'green', disabled: busy === v.uuid, onClick: function () { decide(v, true); } }, 'Verify'), h(Btn, { sm: true, variant: 'danger', disabled: busy === v.uuid, onClick: function () { decide(v, false); } }, 'Reject')))),
            active && active.uuid === v.uuid && tri ? h('div', { style: { marginTop: 12, padding: 12, background: MINT, borderRadius: 12, fontSize: 13.5, whiteSpace: 'pre-wrap' } }, h('b', { style: { color: TEAL } }, 'AI · '), tri) : null);
        })),
      done.length ? h('div', null, h('div', { className: 'rl-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 10 } }, 'Reviewed'), h('div', { style: { display: 'grid', gap: 10 } }, done.map(function (v) {
        return h('div', { key: v.uuid, className: 'rl-card', style: { padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('span', null, v.clinician_name + ' · ' + v.credential_kind), h(Pill, { status: v.status }));
      }))) : null);
  }
  function AdminDash() {
    var s1 = React.useState(null), data = s1[0], setData = s1[1];
    React.useEffect(function () { Promise.all([getAll('shift'), getAll('payout'), getAll('verification'), getAll('timesheet')]).then(function (r) { setData({ shifts: r[0], payouts: r[1], vers: r[2], sheets: r[3] }); }); }, []);
    if (!data) return h(Spinner, null);
    var filled = data.shifts.filter(function (s) { return ['confirmed', 'completed'].indexOf(s.status) >= 0; }).length;
    var fillRate = data.shifts.length ? Math.round(filled / data.shifts.length * 100) : 0;
    var spend = sumBy(data.payouts.filter(function (p) { return p.status === 'captured'; }), function (p) { return p.amount; });
    var byRole = Object.keys(groupBy(data.shifts, function (s) { return s.role; })).map(function (r) { var g = groupBy(data.shifts, function (s) { return s.role; })[r]; var f = g.filter(function (s) { return s.status !== 'requested'; }).length; return { label: r, value: g.length ? Math.round(f / g.length * 100) : 0 }; });
    var spendByRole = Object.keys(groupBy(data.payouts, function (p) { return (data.shifts.filter(function (s) { return s.uuid === p.shift_uuid; })[0] || {}).role || 'Other'; })).map(function (r) { var g = groupBy(data.payouts, function (p) { return (data.shifts.filter(function (s) { return s.uuid === p.shift_uuid; })[0] || {}).role || 'Other'; })[r]; return { label: r, value: sumBy(g, function (p) { return p.amount; }) }; }).sort(function (a, b) { return b.value - a.value; });
    return h('div', null, h(H1, { eyebrow: 'Admin', sub: 'Marketplace health' }, 'Dashboard'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 22 } },
        h(Tile, { label: 'Fill rate', value: fillRate + '%', color: GREEN, sub: filled + ' / ' + data.shifts.length + ' shifts' }),
        h(Tile, { label: 'Spend', value: usd(spend), color: TEAL }),
        h(Tile, { label: 'Pending creds', value: data.vers.filter(function (v) { return ['pending', 'draft'].indexOf(v.status) >= 0; }).length, color: AMBER }),
        h(Tile, { label: 'Open shifts', value: data.shifts.filter(function (s) { return s.status === 'requested'; }).length })),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 } },
        h('div', { className: 'rl-card', style: { padding: 20 } }, h('div', { className: 'rl-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 14 } }, 'Fill rate by role'), h(Bars, { data: byRole, color: TEAL, pct: true })),
        h('div', { className: 'rl-card', style: { padding: 20 } }, h('div', { className: 'rl-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 14 } }, 'Spend by role'), h(Bars, { data: spendByRole, color: CORAL, money: true }))));
  }
  function SettlementSaga() {
    var s1 = React.useState([]), shifts = s1[0], setS = s1[1];
    var s2 = React.useState(''), pick = s2[0], setPick = s2[1];
    var s3 = React.useState(null), result = s3[0], setResult = s3[1];
    var s4 = React.useState(''), running = s4[0], setRunning = s4[1];
    React.useEffect(function () { getAll('shift').then(function (a) { var c = a.filter(function (x) { return x.status === 'completed' || x.clinician_username; }); setS(c); if (c[0]) setPick(c[0].uuid); }); }, []);
    function run(failMode) {
      var j = shifts.filter(function (x) { return x.uuid === pick; })[0];
      if (!j) { showToast('Pick a shift first', 'error'); return; }
      setRunning(failMode ? 'fail' : 'ok'); setResult(null);
      var input = { shift_uuid: j.uuid, clinician_email: j.clinician_username, facility_email: j.facility_username, amount: j.pay_total, currency: 'USD' };
      var wf = 'shift_settlement';
      if (failMode) { wf = 'shift_settlement_failtest'; input.bogus_uuid = '00000000-0000-0000-0000-000000000000'; }
      Promise.resolve(services.workflow.run(wf, input))
        .then(function (res) {
          // SAGA-PANEL-UNWRAP-V1 — the run's own status lives in the execute
          // envelope at res.output.status, not on res. Reading res.status gave
          // undefined for EVERY run, so this panel always fell to the generic
          // 'Saga finished: ' branch and the per-step tracker never lit up —
          // the showpiece for the compensating-saga story was silently inert.
          if (res && res.success === false) throw new Error(res.error || 'saga call failed');
          var out = (res && res.output && typeof res.output === 'object') ? res.output : (res || {});
          setResult(out); var st = out.status || ''; if (st === 'compensated') showToast('Saga compensated — the payout was reversed', 'success'); else if (st === 'completed') showToast('Shift settled & clinician paid', 'success'); else showToast('Saga finished: ' + st, 'warning'); })
        .catch(function (e) { setResult({ status: 'error', error: (e && e.message) || String(e) }); showToast('Could not run saga: ' + (e && e.message || e), 'error'); })
        .finally(function () { setRunning(''); });
    }
    var plan = [['payout', 'Pay the clinician (Stripe)', 'compensates → refund'], ['invoice', 'Invoice the facility', 'on_error: continue'], ['notify', 'Notify the clinician', 'on_error: continue'], ['dispute', 'Settlement ledger', 'forced to fail in the drill'], ['finalize', 'Stamp shift settled', '']];
    return h('div', null, h(H1, { eyebrow: 'Admin · showpiece', sub: 'Settling a shift is a compensating saga: a disputed timesheet reverses the clinician payout automatically — zero hand-written rollback.' }, 'Shift settlement saga'),
      h('div', { className: 'rl-card', style: { padding: 18, marginBottom: 18, background: MINT, borderColor: '#cfe7e5' } }, h('div', { style: { fontSize: 13.5 } }, h('b', null, 'PLATFORM-GAP: '), 'clinician payout + facility invoice settlement is not a platform primitive — modelled on a Payment-backed Payout entity, so authorize/capture/refund still drive it and the compensation path is real.')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 22, alignItems: 'start' } },
        h('div', { className: 'rl-card', style: { padding: 20 } }, h('div', { className: 'rl-display', style: { fontSize: 18, fontWeight: 700, marginBottom: 14 } }, 'Saga plan'),
          plan.map(function (p, i) {
            var stepRes = result && result.output_data && (result.output_data[p[0]] || (result.output_data.steps && result.output_data.steps[p[0]]));
            var stat = stepRes && (stepRes.status || (stepRes.success ? 'completed' : 'failed'));
            return h('div', { key: p[0], style: { display: 'flex', gap: 14, alignItems: 'flex-start' } },
              h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } }, h('div', { style: { width: 26, height: 26, borderRadius: 999, background: stat === 'completed' ? GREEN : stat === 'failed' || stat === 'compensated' ? RED : '#dce3e4', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 } }, stat === 'completed' ? '✓' : stat === 'failed' ? '!' : stat === 'compensated' ? '↩' : (i + 1)), i < plan.length - 1 ? h('div', { style: { width: 2, height: 28, background: '#dce3e4' } }) : null),
              h('div', { style: { paddingBottom: 14 } }, h('div', { style: { fontWeight: 600 } }, p[1]), h('div', { style: { fontSize: 12, color: MUTED } }, p[2]), stat ? h('div', { style: { fontSize: 12, fontWeight: 700, color: stat === 'completed' ? GREEN : RED, textTransform: 'capitalize', marginTop: 2 } }, stat) : null));
          })),
        h('div', null,
          h('div', { className: 'rl-card', style: { padding: 18, marginBottom: 16 } }, h('div', { style: { fontWeight: 700, marginBottom: 8 } }, 'Run against a shift'),
            shifts.length === 0 ? h('div', { style: { color: MUTED, fontSize: 13 } }, 'No completed shifts to settle.') : h(Field, { label: 'Shift', value: pick, onChange: function (e) { setPick(e.target.value); }, options: shifts.map(function (j) { return { value: j.uuid, label: j.display_name + ' · ' + usd(j.pay_total) }; }) }),
            h(Btn, { onClick: function () { run(false); }, disabled: !!running || !pick, style: { width: '100%', marginBottom: 8 } }, running === 'ok' ? 'Running…' : '▶ Settle & pay'),
            h(Btn, { variant: 'danger', onClick: function () { run(true); }, disabled: !!running || !pick, style: { width: '100%' } }, running === 'fail' ? 'Running…' : '⚠ Simulate dispute & reverse')),
          result ? h('div', { className: 'rl-card rl-rise', style: { padding: 18 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } }, h('span', { style: { fontWeight: 700 } }, 'Engine result'), h(Pill, { status: result.status === 'completed' ? 'completed' : result.status === 'compensated' ? 'voided' : 'failed', label: result.status })),
            result.error ? h('div', { style: { fontSize: 13, color: RED } }, result.error) : null,
            typeof result.steps_completed !== 'undefined' ? h('div', { style: { fontSize: 13, color: MUTED } }, (result.steps_completed || 0) + ' / ' + (result.steps_total || 0) + ' steps · ' + (result.steps_failed || 0) + ' failed') : null,
            h('pre', { className: 'rl-scroll', style: { fontSize: 11, background: '#f5f8f8', borderRadius: 10, padding: 10, marginTop: 10, overflow: 'auto', maxHeight: 220 } }, JSON.stringify(result.output_data || result, null, 2))) : null)));
  }

  /* ============================== Shell ================================ */
  function Shell(props) {
    var route = props.route, navigate = props.navigate;
    var s1 = React.useState(null), profile = s1[0], setProfile = s1[1];
    var s2 = React.useState(isStaff() ? 'admin' : null), mode = s2[0], setMode = s2[1];
    var s3 = React.useState(false), ready = s3[0], setReady = s3[1];
    React.useEffect(function () {
      try {
        client.registerTransactionalExtensions({
          booking: 'shift', attachment: 'credential', payment: 'payout', recurring_plan: 'contract',
          approval: ['verification', 'verification_step'],
        });
      } catch (e) {}
      getAll('profile').then(function (ps) {
        var mine = ps.filter(function (p) { return p.owner_username === uname() || p.email === uname(); })[0] || null;
        setProfile(mine);
        if (!isStaff()) setMode((mine && mine.persona) || 'clinician');
        setReady(true);
      });
    }, []);
    function go(hash) { navigate(hash); }
    function logout() { try { client.logout(); } catch (e) {} window.location.hash = ''; props.onLogout(); }
    var modes = isStaff() ? ['admin', 'clinician', 'facility'] : [mode || 'clinician'];
    if (!ready) return h(Spinner, { label: 'Setting things up…' });
    var common = { route: route, go: go, modes: modes, mode: mode, setMode: function (m) { setMode(m); navigate(homeFor(m)); }, onLogout: logout };
    if (mode === 'facility') return h(FacilityApp, Object.assign({}, common, { route: route.indexOf('#/f') === 0 ? route : '#/f/shifts' }));
    if (mode === 'admin') return h(AdminApp, Object.assign({}, common, { route: route.indexOf('#/a') === 0 ? route : '#/a/queue' }));
    return h(ClinicianApp, Object.assign({}, common, { route: (route.indexOf('#/f') === 0 || route.indexOf('#/a') === 0) ? '#/shifts' : route }));
  }
  function homeFor(m) { return m === 'facility' ? '#/f/shifts' : m === 'admin' ? '#/a/queue' : '#/shifts'; }

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
