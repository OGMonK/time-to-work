/** HTML for the Time to Work settings panel. All state comes in via postMessage. */
export function settingsHtml(nonce: string, cspSource: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="id">
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
  input[type=text], input[type=number], select {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 5px 8px;
    border-radius: 4px;
    font: inherit;
  }
  input[type=text] { flex: 1; min-width: 160px; }
  input[type=number] { width: 80px; }
  input:focus, select:focus { outline: 1px solid var(--vscode-focusBorder); }
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
  input[type=time] {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    padding: 4px 6px; border-radius: 4px; font: inherit;
    color-scheme: light dark;
  }
  .days { display: inline-flex; gap: 6px; flex-wrap: wrap; }
  .day {
    display: inline-flex; align-items: center; gap: 4px;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.3));
    border-radius: 14px; padding: 3px 10px; cursor: pointer;
  }
  .day:has(input:checked) { border-color: var(--vscode-focusBorder); background: rgba(128,128,128,.12); }
  .steps { margin: 0; padding-left: 18px; }
  .steps li { margin: 4px 0; }
</style>
</head>
<body>
  <h1>⏰ Time to Work</h1>
  <p class="sub">Scroll dulu selama Claude Code kerja. Begitu selesai, window ditutup dan kamu balik ke Claude.</p>

  <section>
    <h2>1 · Hubungkan ke Claude Code</h2>
    <p class="hint">Sekali saja. Menambah hooks ke <code>~/.claude/settings.json</code> (backup otomatis).</p>
    <div class="row">
      <span id="hookStatus"></span>
      <span id="serverStatus"></span>
    </div>
    <div class="row">
      <button id="installHooks">Install hooks</button>
      <button id="uninstallHooks" class="secondary">Uninstall hooks</button>
      <button id="test" class="secondary">▶ Test 15 detik</button>
    </div>
  </section>

  <section>
    <h2>2 · Login ke site</h2>
    <p class="hint">Klik <b>Login</b>, masuk ke akunmu di window yang terbuka, lalu tutup window-nya. Login tersimpan, jadi saat Claude kerja feed-nya langsung terbuka.</p>
    <div class="row">
      <label class="switch"><input type="radio" name="active" value="🎲 Random" id="randomRadio"> 🎲 Random tiap kali</label>
    </div>
    <div id="sites"></div>
    <div class="row">
      <button id="addSite" class="secondary">+ Tambah site</button>
    </div>
  </section>

  <section>
    <h2>3 · Perilaku</h2>
    <div class="row">
      <label class="k">Aktif</label>
      <label class="switch"><input type="checkbox" data-key="enabled"> Buka window saat Claude kerja</label>
    </div>
    <div class="row">
      <label class="k">Balik ke Claude Code</label>
      <label class="switch"><input type="checkbox" data-key="returnToClaude"> Fokus ke VS Code + input Claude saat selesai</label>
    </div>
    <div class="row">
      <label class="k">Saat Claude minta approval</label>
      <label class="switch"><input type="checkbox" data-key="reopenAfterApproval"> Tutup dulu, buka lagi setelah kamu approve</label>
    </div>
    <div class="row">
      <label class="k">Tampilkan di</label>
      <select data-key="mode">
        <option value="popup">Window kecil (Chrome/Edge) — semua site</option>
        <option value="panel">Panel VS Code — hanya URL embed</option>
      </select>
    </div>
    <div class="row">
      <label class="k">Tunggu sebelum buka</label>
      <input type="number" min="0" data-key="showDelaySeconds"> <span class="muted">detik (jawaban cepat tidak membuka window)</span>
    </div>
    <div class="row">
      <label class="k">Batas maksimum</label>
      <input type="number" min="1" data-key="maxMinutes"> <span class="muted">menit (kalau kamu tekan Esc di Claude)</span>
    </div>
    <div class="row">
      <label class="k">Teks notifikasi</label>
      <input type="text" data-key="notificationMessage">
    </div>
  </section>

  <section>
    <h2>4 · Jadwal</h2>
    <p class="hint">Atur kapan window scroll boleh muncul. Di luar jadwal, extension diam saja.</p>
    <div class="row">
      <label class="switch"><input type="checkbox" id="schEnabled"> Pakai jadwal</label>
      <span id="schStatus"></span>
    </div>
    <div id="schBody">
      <div class="row">
        <label class="k">Mode</label>
        <select id="schMode">
          <option value="only">Hanya aktif di waktu ini</option>
          <option value="except">Mati di waktu ini (misal jam kerja / meeting)</option>
        </select>
      </div>
      <div class="row">
        <label class="k">Hari</label>
        <span class="days">
          <label class="day"><input type="checkbox" value="1">Sen</label>
          <label class="day"><input type="checkbox" value="2">Sel</label>
          <label class="day"><input type="checkbox" value="3">Rab</label>
          <label class="day"><input type="checkbox" value="4">Kam</label>
          <label class="day"><input type="checkbox" value="5">Jum</label>
          <label class="day"><input type="checkbox" value="6">Sab</label>
          <label class="day"><input type="checkbox" value="0">Min</label>
        </span>
      </div>
      <div class="row">
        <label class="k">Jam</label>
        <input type="time" id="schFrom"> sampai <input type="time" id="schTo">
        <span class="muted">boleh lewat tengah malam, misal 22:00 → 02:00</span>
      </div>
      <div class="row">
        <label class="k">Preset</label>
        <button class="secondary" data-preset="afterwork">🌙 Setelah jam kerja</button>
        <button class="secondary" data-preset="officeoff">💼 Mati di jam kantor</button>
        <button class="secondary" data-preset="weekend">🏖️ Weekend saja</button>
      </div>
    </div>
  </section>

  <section>
    <h2>5 · Window</h2>
    <div class="row">
      <label class="k">Ukuran</label>
      <input type="number" min="200" data-key="popupWidth"> × <input type="number" min="200" data-key="popupHeight"> <span class="muted">px</span>
    </div>
    <div class="row">
      <label class="k">Browser</label>
      <input type="text" data-key="browserPath" placeholder="otomatis">
    </div>
    <div class="row"><label class="k"></label><span class="muted" id="browserDetected"></span></div>
    <div class="row">
      <label class="k">Port hook</label>
      <input type="number" data-key="port"> <span class="muted">install ulang hooks setelah ganti</span>
    </div>
  </section>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  let state = null;
  const $ = (id) => document.getElementById(id);
  const send = (type, extra = {}) => vscode.postMessage({ type, ...extra });

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

  $('installHooks').onclick = () => send('installHooks');
  $('uninstallHooks').onclick = () => send('uninstallHooks');
  $('test').onclick = () => send('test');
  $('randomRadio').onchange = () => send('active', { name: '🎲 Random' });
  $('addSite').onclick = () => {
    state.sites.push({ name: 'Site baru', url: 'https://', loginUrl: '' });
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
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function render() {
    if (!state) return;
    const c = state.config;
    document.querySelectorAll('[data-key]').forEach((el) => {
      const v = c[el.dataset.key];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v ?? '';
    });

    $('hookStatus').innerHTML = {
      ok: '<span class="pill ok">✓ Hooks terpasang</span>',
      outdated: '<span class="pill warn">Hooks versi lama — klik Install hooks lagi</span>',
      none: '<span class="pill warn">Hooks belum terpasang</span>',
    }[state.hooksStatus];

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
      ? '<span class="pill ok">Selalu aktif</span>'
      : state.scheduleActiveNow
        ? '<span class="pill ok">Sekarang: aktif</span>'
        : '<span class="pill warn">Sekarang: 💤 di luar jadwal</span>';
    $('serverStatus').innerHTML = state.serverPort
      ? '<span class="pill ok">Listening 127.0.0.1:' + state.serverPort + '</span>'
      : '<span class="pill warn">' + (state.serverNote || 'Server tidak jalan') + '</span>';
    $('browserDetected').textContent = state.browser
      ? 'Dipakai: ' + state.browser
      : 'Chrome/Edge/Brave tidak ketemu — isi path di atas.';

    $('randomRadio').checked = state.active === '🎲 Random';

    const wrap = $('sites');
    wrap.innerHTML = '';
    state.sites.forEach((site, i) => {
      const isActive = state.active === site.name || (!state.active && i === 0);
      const login = state.logins[site.name];
      const div = document.createElement('div');
      div.className = 'site' + (isActive ? ' active' : '');
      div.innerHTML = \`
        <div class="top">
          <input type="radio" name="active" \${isActive ? 'checked' : ''} title="Pakai site ini">
          <input type="text" data-field="name">
          \${login
            ? '<span class="pill ok">✓ login ' + fmtDate(login) + '</span>'
            : '<span class="pill warn">belum login</span>'}
        </div>
        <div class="grid">
          <span class="muted">Feed URL</span><input type="text" data-field="url">
          <span class="muted">Login URL</span><input type="text" data-field="loginUrl" placeholder="kosong = pakai Feed URL">
        </div>
        <div class="actions">
          <button data-act="login">🔑 Login</button>
          <button data-act="open" class="secondary">Buka sekarang</button>
          <button data-act="logged" class="secondary">Tandai sudah login</button>
          <span style="flex:1"></span>
          <button data-act="remove" class="danger" title="Hapus site">Hapus</button>
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
    }
  });
  send('ready');
</script>
</body>
</html>`;
}
