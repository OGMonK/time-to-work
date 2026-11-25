import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { findBrowser, launchBrowser, killProfile, findCodeCli } from './browser';
import { settingsHtml } from './settingsHtml';

interface Site {
  name: string;
  url: string;
  loginUrl?: string;
}

type StopReason = 'done' | 'attention' | 'timeout' | 'manual';

const HOOK_TAG = '/ttw/';
const RANDOM = '🎲 Random';
const EXT_ID = 'ogmonk.time-to-work';

let ctx: vscode.ExtensionContext;
let server: http.Server | undefined;
let serverPort: number | undefined;
let serverNote: string | undefined;
let statusItem: vscode.StatusBarItem;
let showTimer: NodeJS.Timeout | undefined;
let maxTimer: NodeJS.Timeout | undefined;
let browserProc: ChildProcess | undefined;
let panel: vscode.WebviewPanel | undefined;
let settingsPanel: vscode.WebviewPanel | undefined;
let startedAt: number | undefined;
let shown = false;

const cfg = () => vscode.workspace.getConfiguration('timeToWork');
const profileDir = () => path.join(ctx.globalStorageUri.fsPath, 'browser-profile');

export function activate(context: vscode.ExtensionContext) {
  ctx = context;

  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.command = 'timeToWork.openSettings';
  context.subscriptions.push(statusItem);
  updateStatus();
  statusItem.show();

  context.subscriptions.push(
    vscode.commands.registerCommand('timeToWork.openSettings', openSettings),
    vscode.commands.registerCommand('timeToWork.installHooks', () => installHooks(true)),
    vscode.commands.registerCommand('timeToWork.uninstallHooks', uninstallHooks),
    vscode.commands.registerCommand('timeToWork.pickSite', pickSite),
    vscode.commands.registerCommand('timeToWork.backToWork', () => onStop('manual')),
    vscode.commands.registerCommand('timeToWork.toggle', async () => {
      const next = !cfg().get<boolean>('enabled', true);
      await cfg().update('enabled', next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Time to Work ${next ? 'aktif' : 'mati'}.`);
    }),
    vscode.commands.registerCommand('timeToWork.test', runTest),
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri) {
        if (uri.path === '/focus') {
          focusClaude();
        }
      },
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('timeToWork.port')) {
        startServer();
      }
      if (e.affectsConfiguration('timeToWork')) {
        updateStatus();
        pushSettingsState();
      }
    }),
    { dispose: () => { stopServer(); closeDistraction(); } }
  );

  startServer();
}

export function deactivate() {
  stopServer();
  closeDistraction();
}

function runTest() {
  onStart(true);
  setTimeout(() => onStop('done'), 15000);
}

// ---------------------------------------------------------------- server

function startServer() {
  stopServer();
  const port = cfg().get<number>('port', 47821);
  const s = http.createServer((req, res) => {
    req.resume(); // hook payload (JSON from Claude Code) is not needed
    req.on('end', () => {
      const url = req.url ?? '';
      if (url.startsWith('/ttw/start')) {
        onStart();
      } else if (url.startsWith('/ttw/stop')) {
        onStop('done');
      } else if (url.startsWith('/ttw/attention')) {
        onStop('attention');
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  });
  s.on('error', (err: NodeJS.ErrnoException) => {
    serverPort = undefined;
    serverNote = err.code === 'EADDRINUSE'
      ? `Port ${port} dipakai window VS Code lain (popup tetap jalan dari sana)`
      : `Server error: ${err.message}`;
    updateStatus();
    pushSettingsState();
  });
  s.listen(port, '127.0.0.1', () => {
    serverPort = port;
    serverNote = undefined;
    updateStatus();
    pushSettingsState();
  });
  server = s;
}

function stopServer() {
  server?.close();
  server = undefined;
  serverPort = undefined;
}

// ---------------------------------------------------------------- state machine

function onStart(force = false) {
  if (!force && !cfg().get<boolean>('enabled', true)) {
    return;
  }
  if (startedAt === undefined) {
    startedAt = Date.now();
  }
  clearTimers();
  if (!shown) {
    const delay = Math.max(0, cfg().get<number>('showDelaySeconds', 5)) * 1000;
    showTimer = setTimeout(openDistraction, delay);
  }
  const maxMs = Math.max(1, cfg().get<number>('maxMinutes', 30)) * 60_000;
  maxTimer = setTimeout(() => onStop('timeout'), maxMs);
  updateStatus();
}

function onStop(reason: StopReason) {
  clearTimers();
  const wasShown = shown;
  const elapsed = startedAt ? Date.now() - startedAt : 0;
  startedAt = undefined;
  closeDistraction();
  updateStatus();

  if (!wasShown && reason !== 'manual') {
    return; // Claude finished before the window opened; nothing to interrupt.
  }
  if (cfg().get<boolean>('returnToClaude', true)) {
    bringBackToClaude();
  }
  const took = formatDuration(elapsed);
  switch (reason) {
    case 'done':
      vscode.window.showInformationMessage(`${cfg().get<string>('notificationMessage')} (${took})`);
      break;
    case 'attention':
      vscode.window.showWarningMessage(`⏰ Time to work! Claude butuh approval/input kamu (${took}).`);
      break;
    case 'timeout':
      vscode.window.showWarningMessage(`⏰ Udah ${took} scroll. Time to work! Cek Claude.`);
      break;
    case 'manual':
      break;
  }
}

function clearTimers() {
  if (showTimer) { clearTimeout(showTimer); showTimer = undefined; }
  if (maxTimer) { clearTimeout(maxTimer); maxTimer = undefined; }
}

// ---------------------------------------------------------------- back to Claude

/** Raise this VS Code window, then put the cursor in Claude Code's input. */
function bringBackToClaude() {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (folder) {
    // `code -r <open folder>` focuses the window that already has that folder.
    const cli = findCodeCli(vscode.env.appRoot);
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    try {
      spawn(cli, ['-r', folder], {
        stdio: 'ignore',
        shell: process.platform === 'win32',
        windowsHide: true,
        env,
      }).on('error', () => undefined);
    } catch { /* fall through to focusClaude */ }
  } else {
    vscode.env.openExternal(vscode.Uri.parse(`${vscode.env.uriScheme}://${EXT_ID}/focus`));
  }
  // Give the window a moment to come forward, then focus Claude's input.
  setTimeout(focusClaude, 700);
}

async function focusClaude() {
  try {
    await vscode.commands.executeCommand('claude-vscode.focus');
  } catch {
    // Claude Code extension not installed or command renamed; nothing else to do.
  }
}

// ---------------------------------------------------------------- distraction window

function getSites(): Site[] {
  return cfg().get<Site[]>('sites', []).filter((s) => s && s.url);
}

function activeName(): string | undefined {
  return ctx.globalState.get<string>('site') ?? getSites()[0]?.name;
}

function currentSite(): Site | undefined {
  const sites = getSites();
  if (sites.length === 0) {
    return undefined;
  }
  const chosen = ctx.globalState.get<string>('site');
  if (chosen === RANDOM) {
    return sites[Math.floor(Math.random() * sites.length)];
  }
  return sites.find((s) => s.name === chosen) ?? sites[0];
}

function openDistraction() {
  showTimer = undefined;
  const site = currentSite();
  if (!site) {
    vscode.window.showWarningMessage('Time to Work: belum ada site. Buka Time to Work: Settings.');
    return;
  }
  shown = true;
  updateStatus();
  if (cfg().get<string>('mode', 'popup') === 'panel') {
    openPanel(site);
  } else {
    openPopup(site);
  }
}

function closeDistraction() {
  shown = false;
  if (panel) {
    const p = panel;
    panel = undefined;
    p.dispose();
  }
  if (browserProc) {
    killProfile(profileDir(), browserProc);
    browserProc = undefined;
  }
}

function getBrowserOrWarn(): string | undefined {
  const browser = findBrowser(cfg().get<string>('browserPath', ''));
  if (!browser) {
    vscode.window.showWarningMessage(
      'Time to Work: Chrome/Edge/Brave tidak ketemu. Isi path browser di Time to Work: Settings.'
    );
  }
  return browser;
}

function openPopup(site: Site) {
  const browser = getBrowserOrWarn();
  if (!browser) {
    return;
  }
  const w = cfg().get<number>('popupWidth', 420);
  const h = cfg().get<number>('popupHeight', 820);
  try {
    const proc = launchBrowser(browser, profileDir(), [`--app=${site.url}`, `--window-size=${w},${h}`]);
    proc.on('error', (e) => vscode.window.showErrorMessage(`Time to Work: gagal buka browser: ${e.message}`));
    browserProc = proc;
  } catch (e) {
    vscode.window.showErrorMessage(`Time to Work: gagal buka browser: ${(e as Error).message}`);
  }
}

/** Normal browser window (address bar, popups allowed) on the shared profile, for logging in. */
function openLogin(site: Site) {
  const browser = getBrowserOrWarn();
  if (!browser) {
    return;
  }
  const url = site.loginUrl?.trim() || site.url;
  const opened = Date.now();
  try {
    const proc = launchBrowser(browser, profileDir(), ['--new-window', url, '--window-size=1100,850']);
    proc.on('error', (e) => vscode.window.showErrorMessage(`Time to Work: gagal buka browser: ${e.message}`));
    proc.on('exit', async () => {
      // A short-lived process means the window was handed to an already-running instance;
      // in that case the user can press "Tandai sudah login" in settings.
      if (Date.now() - opened > 5000) {
        await markLoggedIn(site.name);
      }
    });
    vscode.window.showInformationMessage(`Login ke ${site.name} di window browser, lalu tutup window-nya.`);
  } catch (e) {
    vscode.window.showErrorMessage(`Time to Work: gagal buka browser: ${(e as Error).message}`);
  }
}

async function markLoggedIn(name: string) {
  const logins = ctx.globalState.get<Record<string, number>>('logins', {});
  logins[name] = Date.now();
  await ctx.globalState.update('logins', logins);
  pushSettingsState();
}

function openPanel(site: Site) {
  panel = vscode.window.createWebviewPanel(
    'timeToWork',
    `📱 ${site.name}`,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true }
  );
  panel.onDidDispose(() => { panel = undefined; });
  const url = site.url.replace(/"/g, '&quot;');
  panel.webview.html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src https:; style-src 'unsafe-inline';">
<style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#000}
iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${url}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe></body></html>`;
}

// ---------------------------------------------------------------- settings panel

function openSettings() {
  if (settingsPanel) {
    settingsPanel.reveal();
    return;
  }
  settingsPanel = vscode.window.createWebviewPanel(
    'timeToWorkSettings',
    '⏰ Time to Work',
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  const nonce = crypto.randomBytes(16).toString('base64');
  settingsPanel.webview.html = settingsHtml(nonce, settingsPanel.webview.cspSource);
  settingsPanel.onDidDispose(() => { settingsPanel = undefined; });
  settingsPanel.webview.onDidReceiveMessage(async (msg) => {
    const sites = getSites();
    switch (msg?.type) {
      case 'ready':
        break;
      case 'set':
        await cfg().update(String(msg.key), msg.value, vscode.ConfigurationTarget.Global);
        return; // config change listener pushes state
      case 'sites':
        await cfg().update('sites', sanitizeSites(msg.sites), vscode.ConfigurationTarget.Global);
        return;
      case 'active':
        await ctx.globalState.update('site', String(msg.name));
        updateStatus();
        break;
      case 'login':
        if (sites[msg.index]) {
          openLogin(sites[msg.index]);
        }
        break;
      case 'open':
        if (sites[msg.index]) {
          // Preview only: tracked so the next stop closes it, but no notification.
          closeDistraction();
          openPopup(sites[msg.index]);
        }
        break;
      case 'markLogged':
        await markLoggedIn(String(msg.name));
        return;
      case 'test':
        runTest();
        break;
      case 'installHooks':
        await installHooks(false);
        break;
      case 'uninstallHooks':
        await uninstallHooks();
        break;
    }
    pushSettingsState();
  });
}

function sanitizeSites(raw: unknown): Site[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((s) => s && typeof s.url === 'string')
    .map((s) => {
      const site: Site = { name: String(s.name || 'Site'), url: String(s.url) };
      if (s.loginUrl) {
        site.loginUrl = String(s.loginUrl);
      }
      return site;
    });
}

function pushSettingsState() {
  if (!settingsPanel) {
    return;
  }
  const c = cfg();
  settingsPanel.webview.postMessage({
    type: 'state',
    state: {
      config: {
        enabled: c.get('enabled'),
        returnToClaude: c.get('returnToClaude'),
        mode: c.get('mode'),
        showDelaySeconds: c.get('showDelaySeconds'),
        maxMinutes: c.get('maxMinutes'),
        notificationMessage: c.get('notificationMessage'),
        popupWidth: c.get('popupWidth'),
        popupHeight: c.get('popupHeight'),
        browserPath: c.get('browserPath'),
        port: c.get('port'),
      },
      sites: c.get<Site[]>('sites', []),
      active: ctx.globalState.get<string>('site') ?? null,
      logins: ctx.globalState.get<Record<string, number>>('logins', {}),
      hooksInstalled: hooksInstalled(),
      serverPort: serverPort ?? null,
      serverNote: serverNote ?? null,
      browser: findBrowser(c.get<string>('browserPath', '')) ?? null,
    },
  });
}

async function pickSite() {
  const sites = getSites();
  const chosen = activeName();
  const items: vscode.QuickPickItem[] = [
    ...sites.map((s) => ({ label: s.name, description: s.url })),
    { label: RANDOM, description: 'Pilih acak tiap kali' },
  ];
  const pick = await vscode.window.showQuickPick(items, { placeHolder: `Sekarang: ${chosen ?? '-'}` });
  if (pick) {
    await ctx.globalState.update('site', pick.label);
    updateStatus();
    pushSettingsState();
  }
}

function updateStatus() {
  if (!statusItem) {
    return;
  }
  const enabled = cfg().get<boolean>('enabled', true);
  if (!enabled) {
    statusItem.text = '$(device-mobile) TTW: off';
  } else if (shown) {
    statusItem.text = '$(device-mobile) Scroll time…';
  } else if (startedAt !== undefined) {
    statusItem.text = '$(sync~spin) Claude kerja…';
  } else {
    statusItem.text = `$(device-mobile) TTW: ${activeName() ?? '-'}`;
  }
  statusItem.tooltip = [
    'Time to Work — klik untuk settings',
    serverPort ? `Listening on 127.0.0.1:${serverPort}` : (serverNote ?? 'Server tidak jalan'),
  ].join('\n');
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// ---------------------------------------------------------------- Claude Code hooks

function claudeSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function hookCommand(port: number, action: string) {
  // Works in both bash and cmd. "|| exit 0" keeps Claude quiet when VS Code is closed.
  return `curl -s -m 2 -X POST --data-binary @- http://127.0.0.1:${port}${HOOK_TAG}${action} || exit 0`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function readClaudeSettings(quiet = false): Json | undefined {
  const file = claudeSettingsPath();
  if (!fs.existsSync(file)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (!quiet) {
      vscode.window.showErrorMessage(`Time to Work: ${file} bukan JSON valid, tidak diubah. (${(e as Error).message})`);
    }
    return undefined;
  }
}

function hooksInstalled(): boolean {
  const s = readClaudeSettings(true);
  return !!s && JSON.stringify(s.hooks ?? {}).includes(HOOK_TAG);
}

function stripOurHooks(settings: Json) {
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== 'object') {
    return;
  }
  for (const event of Object.keys(hooks)) {
    if (!Array.isArray(hooks[event])) {
      continue;
    }
    hooks[event] = hooks[event]
      .map((group: Json) => ({
        ...group,
        hooks: Array.isArray(group?.hooks)
          ? group.hooks.filter((h: Json) => !(typeof h?.command === 'string' && h.command.includes(HOOK_TAG)))
          : group?.hooks,
      }))
      .filter((group: Json) => !Array.isArray(group.hooks) || group.hooks.length > 0);
    if (hooks[event].length === 0) {
      delete hooks[event];
    }
  }
  if (Object.keys(hooks).length === 0) {
    delete settings.hooks;
  }
}

function writeClaudeSettings(settings: Json) {
  const file = claudeSettingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, file + '.ttw-backup');
  }
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

async function installHooks(confirm: boolean) {
  const file = claudeSettingsPath();
  if (confirm) {
    const ok = await vscode.window.showInformationMessage(
      `Tambah hooks Time to Work ke ${file}? (Backup disimpan sebagai settings.json.ttw-backup)`,
      { modal: true },
      'Install'
    );
    if (ok !== 'Install') {
      return;
    }
  }
  const settings = readClaudeSettings();
  if (!settings) {
    return;
  }
  stripOurHooks(settings);
  const port = cfg().get<number>('port', 47821);
  settings.hooks = settings.hooks ?? {};
  const add = (event: string, action: string, matcher?: string) => {
    const group: Json = { hooks: [{ type: 'command', command: hookCommand(port, action), timeout: 5 }] };
    if (matcher) {
      group.matcher = matcher;
    }
    settings.hooks[event] = [...(settings.hooks[event] ?? []), group];
  };
  add('UserPromptSubmit', 'start');
  add('Stop', 'stop');
  add('Notification', 'attention', 'permission_prompt');
  writeClaudeSettings(settings);
  vscode.window.showInformationMessage(
    'Hooks terpasang. Mulai sesi Claude Code baru (atau reload window) supaya hooks dibaca.'
  );
}

async function uninstallHooks() {
  const settings = readClaudeSettings();
  if (!settings) {
    return;
  }
  stripOurHooks(settings);
  writeClaudeSettings(settings);
  vscode.window.showInformationMessage('Hooks Time to Work dihapus dari ~/.claude/settings.json.');
}
