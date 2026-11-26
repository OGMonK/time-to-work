import { Lang, Strings } from './i18n';

/** HTML for the Time to Work settings panel. Static text comes from `t`; state comes in via postMessage. */
export function settingsHtml(nonce: string, cspSource: string, t: Strings, lang: Lang): string {
  const days = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<label class="day"><input type="checkbox" value="${d}">${t.p_dayNames[d]}</label>`)
    .join('\n          ');
  // JSON for the script; escape "<" so a string can never close the <script> tag.
  const T = JSON.stringify(t).replace(/</g, '\\u003c');
  return /* html */ `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Time to Work</title>
<style>
  :root { --gap: 12px; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 20px 28px 48px;
    max-width: 860px;
  }
  header { display: flex; align-items: flex-start; gap: 16px; }
  header .grow { flex: 1; }
  h1 { font-size: 1.6em; margin: 0 0 4px; }
  .sub { color: var(--vscode-descriptionForeground); margin: 0 0 20px; }
  section {
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.3));
    border-radius: 8px;
    padding: 16px 18px;
    margin-bottom: 18px;
  }
  h2 { font-size: 1.1em; margin: 0 0 4px; }
  .hint { color: var(--vscode-descriptionForeground); font-size: .92em; margin: 0 0 12px; }
  .row { display: flex; align-items: center; gap: var(--gap); margin: 10px 0; flex-wrap: wrap; }
  .row label.k { width: 210px; flex: none; }
  .row.top { align-items: flex-start; }
  input[type=text], input[type=number], input[type=time], select, textarea {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 5px 8px;
    border-radius: 4px;
    font: inherit;
  }
  input[type=time] { color-scheme: light dark; }
  input[type=text] { flex: 1; min-width: 160px; }
  input[type=number] { width: 80px; }
  textarea { flex: 1; min-width: 260px; min-height: 90px; resize: vertical; }
  input:focus, select:focus, textarea:focus { outline: 1px solid var(--vscode-focusBorder); }
  button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none; border-radius: 4px;
    padding: 6px 12px; cursor: pointer; font: inherit;
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.danger { background: transparent; color: var(--vscode-errorForeground); padding: 6px 8px; }
  .pill { padding: 2px 8px; border-radius: 10px; font-size: .85em; }
  .ok { background: rgba(40,167,69,.18); color: var(--vscode-testing-iconPassed, #3fb950); }
  .warn { background: rgba(210,153,34,.18); color: var(--vscode-editorWarning-foreground, #d29922); }
  .site {
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.3));
    border-radius: 6px; padding: 10px 12px; margin: 10px 0;
  }
  .site.active { border-color: var(--vscode-focusBorder); }
  .site .top { display: flex; align-items: center; gap: 10px; }
  .site .top input[type=text] { font-weight: 600; }
  .site .grid { display: grid; grid-template-columns: 80px 1fr; gap: 6px 10px; align-items: center; margin-top: 8px; }
  .site .actions { display: flex; gap: 8px; margin-top: 10px; align-items: center; flex-wrap: wrap; }
  .muted { color: var(--vscode-descriptionForeground); }
  .switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
  .days { display: inline-flex; gap: 6px; flex-wrap: wrap; }
  .day {
    display: inline-flex; align-items: center; gap: 4px;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.3));
    border-radius: 14px; padding: 3px 10px; cursor: pointer;
  }
  .day:has(input:checked) { border-color: var(--vscode-focusBorder); background: rgba(128,128,128,.12); }
  .preview {
    margin-top: 8px; padding: 8px 12px; border-radius: 6px;
    background: rgba(128,128,128,.12); display: none;
  }
</style>
</head>
<body>
  <header>
    <div class="grow">
      <h1>⏰ Time to Work</h1>
      <p class="sub">${t.p_sub}</p>
    </div>
    <label class="switch">🌐 ${t.p_lang}
      <select data-key="language">
        <option value="auto">Auto</option>
        <option value="id">Bahasa Indonesia</option>
        <option value="en">English</option>
      </select>
    </label>
  </header>

  <section>
    <h2>${t.p_s1}</h2>
    <p class="hint">${t.p_s1hint}</p>
    <div class="row">
      <span id="hookStatus"></span>
      <span id="serverStatus"></span>
    </div>
    <div class="row">
      <button id="installHooks">${t.p_install}</button>
      <button id="uninstallHooks" class="secondary">${t.p_uninstall}</button>
      <button id="test" class="secondary">${t.p_test}</button>
    </div>
  </section>

  <section>
    <h2>${t.p_s2}</h2>
    <p class="hint">${t.p_s2hint}</p>
    <div class="row">
      <label class="switch"><input type="radio" name="active" id="randomRadio"> ${t.p_random}</label>
    </div>
    <div id="sites"></div>
    <div class="row">
      <button id="addSite" class="secondary">${t.p_addSite}</button>
    </div>
  </section>

  <section>
    <h2>${t.p_s3}</h2>
    <div class="row">
      <label class="k">${t.p_enabled}</label>
      <label class="switch"><input type="checkbox" data-key="enabled"> ${t.p_enabledDesc}</label>
    </div>
    <div class="row">
      <label class="k">${t.p_return}</label>
      <label class="switch"><input type="checkbox" data-key="returnToClaude"> ${t.p_returnDesc}</label>
    </div>
    <div class="row">
      <label class="k">${t.p_reopen}</label>
      <label class="switch"><input type="checkbox" data-key="reopenAfterApproval"> ${t.p_reopenDesc}</label>
    </div>
    <div class="row">
      <label class="k">${t.p_mode}</label>
      <select data-key="mode">
        <option value="popup">${t.p_modePopup}</option>
        <option value="panel">${t.p_modePanel}</option>
      </select>
    </div>
    <div class="row">
      <label class="k">${t.p_delay}</label>
      <input type="number" min="0" data-key="showDelaySeconds"> <span class="muted">${t.p_delayUnit}</span>
    </div>
    <div class="row">
      <label class="k">${t.p_max}</label>
      <input type="number" min="1" data-key="maxMinutes"> <span class="muted">${t.p_maxUnit}</span>
    </div>
  </section>

  <section>
    <h2>${t.p_s4}</h2>
    <div class="row">
      <label class="k">${t.p_msgMode}</label>
      <select data-key="messageStyle">
        <option value="savage">${t.p_msgSavage}</option>
        <option value="simple">${t.p_msgSimple}</option>
        <option value="custom">${t.p_msgCustom}</option>
      </select>
      <button id="tryMsg" class="secondary">${t.p_tryMsg}</button>
    </div>
    <div class="row top">
      <label class="k">${t.p_custom}</label>
      <textarea id="customMessages" placeholder="Claude done in {time}. Your move."></textarea>
    </div>
    <div class="row"><label class="k"></label><span class="muted">${t.p_customHint}</span></div>
    <div class="row"><label class="k"></label><div class="preview" id="preview"></div></div>
    <div class="row">
      <label class="k">${t.p_sound}</label>
      <label class="switch"><input type="checkbox" data-key="sound"> ${t.p_soundDesc}</label>
      <button id="trySound" class="secondary">${t.p_trySound}</button>
    </div>
    <div class="row">
      <label class="k">${t.p_soundFile}</label>
      <input type="text" data-key="soundFile" placeholder="${t.p_soundFilePh}">
    </div>
  </section>

  <section>
    <h2>${t.p_s5}</h2>
    <p class="hint">${t.p_s5hint}</p>
    <div class="row">
      <label class="switch"><input type="checkbox" id="schEnabled"> ${t.p_useSchedule}</label>
      <span id="schStatus"></span>
    </div>
    <div id="schBody">
      <div class="row">
        <label class="k">${t.p_schMode}</label>
        <select id="schMode">
          <option value="only">${t.p_schOnly}</option>
          <option value="except">${t.p_schExcept}</option>
        </select>
      </div>
      <div class="row">
        <label class="k">${t.p_days}</label>
        <span class="days">
          ${days}
        </span>
      </div>
      <div class="row">
        <label class="k">${t.p_hours}</label>
        <input type="time" id="schFrom"> ${t.p_to} <input type="time" id="schTo">
        <span class="muted">${t.p_midnight}</span>
      </div>
      <div class="row">
        <label class="k">${t.p_preset}</label>
        <button class="secondary" data-preset="afterwork">${t.p_presetAfter}</button>
        <button class="secondary" data-preset="officeoff">${t.p_presetOffice}</button>
        <button class="secondary" data-preset="weekend">${t.p_presetWeekend}</button>
      </div>
    </div>
  </section>

  <section>
    <h2>${t.p_s6}</h2>
    <div class="row">
      <label class="k">${t.p_size}</label>
      <input type="number" min="200" data-key="popupWidth"> × <input type="number" min="200" data-key="popupHeight"> <span class="muted">px</span>
    </div>
    <div class="row">
      <label class="k">${t.p_browser}</label>
      <input type="text" data-key="browserPath" placeholder="${t.p_auto}">
    </div>
    <div class="row"><label class="k"></label><span class="muted" id="browserDetected"></span></div>
    <div class="row">
      <label class="k">${t.p_port}</label>
      <input type="number" data-key="port"> <span class="muted">${t.p_portHint}</span>
    </div>
  </section>

<script nonce="${nonce}">
  const T = ${T};
  const RANDOM = '🎲 Random';
  const vscode = acquireVsCodeApi();
  let state = null;
  const $ = (id) => document.getElementById(id);
  const send = (type, extra = {}) => vscode.postMessage({ type, ...extra });
  const fill = (s, v) => s.replace(/\\{(\\w+)\\}/g, (m, k) => (k in v ? v[k] : m));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- general settings: bind every [data-key] input
  document.querySelectorAll('[data-key]').forEach((el) => {
    const key = el.dataset.key;
    el.addEventListener('change', () => {
      let value;
      if (el.type === 'checkbox') value = el.checked;
      else if (el.type === 'number') value = Number(el.value);
      else value = el.value;
      send('set', { key, value });
    });
  });

  $('customMessages').addEventListener('change', () => {
    const lines = $('customMessages').value.split('\\n').map((l) => l.trim()).filter(Boolean);
    send('set', { key: 'customMessages', value: lines });
  });
  $('tryMsg').onclick = () => send('tryMessage');
  $('trySound').onclick = () => send('trySound');
  $('installHooks').onclick = () => send('installHooks');
  $('uninstallHooks').onclick = () => send('uninstallHooks');
  $('test').onclick = () => send('test');
  $('randomRadio').onchange = () => send('active', { name: RANDOM });
  $('addSite').onclick = () => {
    state.sites.push({ name: T.p_newSite, url: 'https://', loginUrl: '' });
    saveSites();
    render();
    const inputs = document.querySelectorAll('.site input[data-field=url]');
    inputs[inputs.length - 1]?.focus();
  };

  function saveSites() { send('sites', { sites: state.sites }); }

  // ---- schedule: one object setting
  function saveSchedule() {
    const days = [...document.querySelectorAll('.day input')].filter((cb) => cb.checked).map((cb) => Number(cb.value));
    const value = {
      enabled: $('schEnabled').checked,
      mode: $('schMode').value,
      days,
      from: $('schFrom').value || '09:00',
      to: $('schTo').value || '17:00',
    };
    state.config.schedule = value;
    send('set', { key: 'schedule', value });
  }
  ['schEnabled', 'schMode', 'schFrom', 'schTo'].forEach((id) => $(id).addEventListener('change', saveSchedule));
  document.querySelectorAll('.day input').forEach((cb) => cb.addEventListener('change', saveSchedule));
  document.querySelectorAll('[data-preset]').forEach((btn) => btn.addEventListener('click', () => {
    const p = btn.dataset.preset;
    const set = (mode, days, from, to) => {
      $('schEnabled').checked = true; $('schMode').value = mode; $('schFrom').value = from; $('schTo').value = to;
      document.querySelectorAll('.day input').forEach((cb) => { cb.checked = days.includes(Number(cb.value)); });
    };
    if (p === 'afterwork') set('only', [1, 2, 3, 4, 5], '17:00', '23:59');
    if (p === 'officeoff') set('except', [1, 2, 3, 4, 5], '09:00', '17:00');
    if (p === 'weekend') set('only', [0, 6], '00:00', '23:59');
    saveSchedule();
  }));

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(document.documentElement.lang, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function render() {
    if (!state) return;
    const c = state.config;
    document.querySelectorAll('[data-key]').forEach((el) => {
      const v = c[el.dataset.key];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v ?? '';
    });
    $('customMessages').value = (c.customMessages || []).join('\\n');

    $('hookStatus').innerHTML = {
      ok: '<span class="pill ok">' + esc(T.p_hooksOk) + '</span>',
      outdated: '<span class="pill warn">' + esc(T.p_hooksOld) + '</span>',
      none: '<span class="pill warn">' + esc(T.p_hooksNone) + '</span>',
    }[state.hooksStatus];
    $('serverStatus').innerHTML = state.serverPort
      ? '<span class="pill ok">' + esc(fill(T.p_listening, { port: state.serverPort })) + '</span>'
      : '<span class="pill warn">' + esc(state.serverNote || '') + '</span>';
    $('browserDetected').textContent = state.browser ? fill(T.p_using, { path: state.browser }) : T.p_noBrowser;

    const s = c.schedule || {};
    $('schEnabled').checked = !!s.enabled;
    $('schMode').value = s.mode || 'only';
    $('schFrom').value = s.from || '09:00';
    $('schTo').value = s.to || '17:00';
    document.querySelectorAll('.day input').forEach((cb) => {
      cb.checked = (s.days || []).includes(Number(cb.value));
    });
    $('schBody').style.opacity = s.enabled ? '1' : '.45';
    $('schStatus').innerHTML = !s.enabled
      ? '<span class="pill ok">' + esc(T.p_always) + '</span>'
      : state.scheduleActiveNow
        ? '<span class="pill ok">' + esc(T.p_nowActive) + '</span>'
        : '<span class="pill warn">' + esc(T.p_nowInactive) + '</span>';

    $('randomRadio').checked = state.active === RANDOM;

    const wrap = $('sites');
    wrap.innerHTML = '';
    state.sites.forEach((site, i) => {
      const isActive = state.active === site.name || (!state.active && i === 0);
      const login = state.logins[site.name];
      const div = document.createElement('div');
      div.className = 'site' + (isActive ? ' active' : '');
      div.innerHTML = \`
        <div class="top">
          <input type="radio" name="active" \${isActive ? 'checked' : ''} title="\${esc(T.p_useSite)}">
          <input type="text" data-field="name">
          \${login
            ? '<span class="pill ok">' + esc(fill(T.p_loggedIn, { date: fmtDate(login) })) + '</span>'
            : '<span class="pill warn">' + esc(T.p_notLogged) + '</span>'}
        </div>
        <div class="grid">
          <span class="muted">\${esc(T.p_feedUrl)}</span><input type="text" data-field="url">
          <span class="muted">\${esc(T.p_loginUrl)}</span><input type="text" data-field="loginUrl" placeholder="\${esc(T.p_loginUrlPh)}">
        </div>
        <div class="actions">
          <button data-act="login">\${esc(T.p_login)}</button>
          <button data-act="open" class="secondary">\${esc(T.p_openNow)}</button>
          <button data-act="logged" class="secondary">\${esc(T.p_markLogged)}</button>
          <span style="flex:1"></span>
          <button data-act="remove" class="danger">\${esc(T.p_remove)}</button>
        </div>\`;
      div.querySelectorAll('input[data-field]').forEach((inp) => {
        const field = inp.dataset.field;
        inp.value = site[field] || '';
        inp.addEventListener('change', () => {
          const oldName = site.name;
          site[field] = inp.value.trim();
          saveSites();
          if (field === 'name' && isActive && oldName !== site.name) send('active', { name: site.name });
        });
      });
      div.querySelector('input[type=radio]').onchange = () => { state.active = site.name; send('active', { name: site.name }); render(); };
      div.querySelector('[data-act=login]').onclick = () => send('login', { index: i });
      div.querySelector('[data-act=open]').onclick = () => send('open', { index: i });
      div.querySelector('[data-act=logged]').onclick = () => send('markLogged', { name: site.name });
      div.querySelector('[data-act=remove]').onclick = () => {
        state.sites.splice(i, 1);
        saveSites();
        render();
      };
      wrap.appendChild(div);
    });
  }

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'state') {
      state = e.data.state;
      render();
    } else if (e.data?.type === 'preview') {
      $('preview').textContent = e.data.text;
      $('preview').style.display = 'block';
    }
  });
  send('ready');
</script>
</body>
</html>`;
}
