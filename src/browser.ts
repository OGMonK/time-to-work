import * as fs from 'fs';
import * as path from 'path';
import { spawn, execFile, ChildProcess } from 'child_process';

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
 * Close every browser process that uses our profile dir (scroll window, login window,
 * and the case where a new window was handed off to an already-running instance).
 */
export function killProfile(profileDir: string, proc?: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      if (proc?.pid && proc.exitCode === null) {
        execFile('taskkill', ['/PID', String(proc.pid), '/T', '/F'], () => undefined);
      }
      const needle = profileDir.replace(/'/g, "''");
      const script =
        `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains('${needle}') } | ` +
        `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true }, () =>
        resolve()
      );
    } else {
      if (proc?.pid && proc.exitCode === null) {
        try { process.kill(-proc.pid, 'SIGTERM'); } catch { /* already gone */ }
      }
      execFile('pkill', ['-f', '--', `--user-data-dir=${profileDir}`], () => resolve());
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
