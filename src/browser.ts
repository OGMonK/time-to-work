import * as fs from 'fs';
import * as path from 'path';
import { spawn, execFile, ChildProcess } from 'child_process';

/** Play a WAV file without blocking. Best effort: silently does nothing if no player exists. */
export function playSound(file: string) {
  if (!fs.existsSync(file)) {
    return;
  }
  if (process.platform === 'win32') {
    const f = file.replace(/'/g, "''");
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(New-Object Media.SoundPlayer '${f}').PlaySync()`],
      { windowsHide: true }, () => undefined);
  } else if (process.platform === 'darwin') {
    execFile('afplay', [file], () => undefined);
  } else {
    execFile('paplay', [file], (err) => { if (err) { execFile('aplay', ['-q', file], () => undefined); } });
  }
}

/** Find a Chromium-based browser (needed for --app windows we can close). */
export function findBrowser(custom: string): string | undefined {
  if (custom.trim()) {
    return custom.trim();
  }
  const env = process.env;
  let candidates: string[] = [];
  if (process.platform === 'win32') {
    const roots = [env['LOCALAPPDATA'], env['PROGRAMFILES'], env['PROGRAMFILES(X86)']].filter(Boolean) as string[];
    const apps = [
      ['Google', 'Chrome', 'Application', 'chrome.exe'],
      ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
      ['BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'],
    ];
    for (const app of apps) {
      for (const r of roots) {
        candidates.push(path.join(r, ...app));
      }
    }
  } else if (process.platform === 'darwin') {
    candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  } else {
    candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge',
      '/usr/bin/brave-browser',
    ];
  }
  return candidates.find((c) => fs.existsSync(c));
}

const COMMON_FLAGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-crash-restore-bubble',
  '--disable-session-crashed-bubble',
];

/**
 * Launch the browser with our own profile dir. Same profile for login windows and
 * scroll windows, so logging in once keeps you logged in.
 */
export function launchBrowser(browser: string, profileDir: string, extraArgs: string[]): ChildProcess {
  fs.mkdirSync(profileDir, { recursive: true });
  return spawn(browser, [`--user-data-dir=${profileDir}`, ...COMMON_FLAGS, ...extraArgs], {
    stdio: 'ignore',
    detached: process.platform !== 'win32',
  });
}

/**
 * Close every browser window that uses our profile dir (scroll window, login window,
 * and windows handed off to an already-running instance).
 *
 * Closes gracefully first so Chrome writes its cookies to disk. A force kill loses
 * every cookie set since the last flush, which logs you out of sites. Only processes
 * still alive after the grace period are force-killed.
 */
export function closeProfile(profileDir: string, graceSeconds = 5): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const needle = profileDir.replace(/'/g, "''");
      const script = `
$n = '${needle}'
$all = @(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($n) })
if ($all.Count -eq 0) { exit 0 }
$ids = $all | ForEach-Object { $_.ProcessId }
# Main browser processes have no --type= flag; taskkill without /F sends WM_CLOSE (clean shutdown).
$all | Where-Object { $_.CommandLine -notmatch '--type=' } | ForEach-Object { taskkill /PID $_.ProcessId 2>$null | Out-Null }
for ($i = 0; $i -lt ${graceSeconds * 4}; $i++) {
  Start-Sleep -Milliseconds 250
  if (-not (Get-Process -Id $ids -ErrorAction SilentlyContinue)) { exit 0 }
}
Get-Process -Id $ids -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue`;
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true }, () =>
        resolve()
      );
    } else {
      const pattern = `--user-data-dir=${profileDir}`;
      execFile('pkill', ['-TERM', '-f', '--', pattern], () => {
        setTimeout(() => execFile('pkill', ['-KILL', '-f', '--', pattern], () => resolve()), graceSeconds * 1000);
      });
    }
  });
}

/** Path to the `code` CLI of the running VS Code, falling back to `code` on PATH. */
export function findCodeCli(appRoot: string): string {
  const name = process.platform === 'win32' ? 'code.cmd' : 'code';
  const candidates = [
    path.join(appRoot, 'bin', name), // macOS
    path.join(appRoot, '..', '..', 'bin', name), // classic Windows layout, Linux
    path.join(appRoot, '..', '..', '..', 'bin', name), // Windows versioned-folder layout
  ];
  return candidates.find((c) => fs.existsSync(c)) ?? name;
}
