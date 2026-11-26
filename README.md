<p align="center">
  <img src="images/icon.png" width="128" alt="Time to Work icon">
</p>

<h1 align="center">⏰ Time to Work</h1>

<p align="center">
  <b>Scroll YouTube Shorts / TikTok / Webtoon selama Claude Code lagi kerja.<br>
  Begitu Claude selesai, window-nya ditutup paksa dan kamu disuruh balik kerja.</b>
</p>

---

Extension VS Code yang (agak bodoh tapi) berguna buat kamu yang pakai **Claude Code**.
Daripada bengong nunggu Claude ngoding, mending scroll. Tapi jangan kebablasan: begitu Claude selesai, extension ini **otomatis menutup window scroll**, kasih notifikasi **"⏰ Time to work!"**, dan **langsung naruh kursor di input Claude Code**.

## Cara kerja

```
Kamu kirim prompt ke Claude Code
        │
        ▼
Hook "UserPromptSubmit" ──► extension: "Claude mulai kerja"
        │
        ▼  (Claude masih kerja setelah 5 detik?)
📱 Window kecil seukuran HP terbuka: YouTube Shorts / TikTok / Webtoon / site kamu sendiri
        │
        ▼
Hook "Stop" ──► window ditutup ──► 🔔 "Time to work!" ──► fokus balik ke input Claude Code
```

Kalau Claude minta **approval** di tengah jalan, window ditutup dulu supaya Claude tidak nunggu kamu. Setelah kamu approve dan Claude lanjut kerja, window scroll **dibuka lagi** (hook `PostToolUse`).

## Fitur

- 📱 **Window scroll otomatis**: muncul seukuran HP waktu Claude kerja, tertutup sendiri waktu Claude selesai.
- 🔑 **Login sekali, langsung masuk**: login ke YouTube/TikTok/site apa pun dari panel setting. Login tersimpan di profil browser khusus extension ini.
- 🌐 **Site custom**: tambah site apa saja (Instagram Reels, Reddit, X, manga, dll.), atau pakai mode 🎲 **Random**.
- 🎯 **Balik ke Claude**: begitu selesai, VS Code dibawa ke depan dan kursor langsung ada di input Claude Code.
- ✋ **Pause saat approval**: window ditutup waktu Claude minta izin, lalu dibuka lagi setelah kamu approve.
- 🗓️ **Jadwal**: pilih hari dan jam. Mode "hanya aktif di jam ini" (misalnya setelah jam kerja) atau "mati di jam ini" (misalnya jam kantor atau meeting). Ada preset 🌙 / 💼 / 🏖️.
- ⚡ **Tidak ganggu jawaban cepat**: window hanya muncul kalau Claude masih kerja setelah N detik (default 5).
- 🛑 **Batas aman**: window tertutup sendiri setelah 30 menit, untuk jaga-jaga kalau kamu menekan Esc di Claude.
- 😈 **Pesan galak & random**: tiap kali beda, misalnya *"Claude kerja keras 3m 12s, kamu ngapain? Scroll doang. Ayo kerja!"*. Bisa ganti ke gaya kalem, atau tulis pesanmu sendiri.
- 🔊 **Suara alarm** (opsional): "ding-ding" bawaan, atau file `.wav` milikmu.
- 🌐 **2 bahasa**: Bahasa Indonesia & English, untuk pesan dan panel setting.
- ⚙️ **Panel setting visual**: semua diatur dari UI, tidak perlu edit JSON.

## Kebutuhan

- **VS Code** 1.85 atau lebih baru (atau Cursor / Windsurf / VSCodium).
- **Claude Code**: extension VS Code-nya atau CLI. Keduanya membaca hooks yang sama.
- **Chrome, Edge, atau Brave** terpasang. Dipakai untuk window scroll.
- `curl` (sudah ada bawaan di Windows 10/11, macOS, dan kebanyakan Linux).

## Install

### 1. Download

Buka halaman [**Releases**](https://github.com/OGMonK/time-to-work/releases/latest), lalu download file `time-to-work-x.y.z.vsix`.

### 2. Install ke VS Code

**Cara A, lewat UI:**
1. Buka panel **Extensions** (`Ctrl+Shift+X`).
2. Klik menu **`···`** di pojok kanan atas panel.
3. Pilih **Install from VSIX...**, lalu pilih file yang tadi di-download.

**Cara B, lewat terminal:**

```bash
code --install-extension time-to-work-0.3.0.vsix
```

Pakai Cursor? Ganti `code` dengan `cursor`.

Lalu **reload window**: `Ctrl+Shift+P` → `Developer: Reload Window`.

## Setup (sekitar 3 menit)

1. Klik **`📱 TTW: ...`** di status bar kanan bawah. Panel **Time to Work** akan terbuka.
2. **Install hooks**: klik tombol **Install hooks**. Ini menambahkan 4 hooks ke `~/.claude/settings.json`. File lama di-backup ke `settings.json.ttw-backup`.
3. **Login ke site**: klik **🔑 Login** di tiap site, login seperti biasa, lalu **tutup window-nya**. Statusnya akan berubah jadi `✓ login`.
4. **Test**: klik **▶ Test 15 detik**. Window scroll muncul sekitar 5 detik, lalu tertutup di detik ke-15 dengan notifikasi.
5. Mulai **sesi Claude Code baru**, kirim prompt, lalu selamat scroll 🎉

## Pengaturan

Semua bisa diatur dari panel (klik status bar `TTW`), atau lewat `Settings` dengan mencari `timeToWork`.

| Setting | Default | Fungsi |
|---|---|---|
| Aktif | ✅ | Matikan sementara tanpa uninstall |
| Balik ke Claude Code | ✅ | Bawa VS Code ke depan + fokus ke input Claude saat selesai |
| Saat Claude minta approval | ✅ | Tutup dulu, buka lagi setelah kamu approve |
| Jadwal | mati | Hari + jam, mode "hanya aktif" atau "mati di waktu ini". Bisa lewat tengah malam (22:00 → 02:00) |
| Tampilkan di | Window kecil | `popup` (Chrome/Edge) atau `panel` di dalam VS Code (hanya URL embed) |
| Tunggu sebelum buka | 5 detik | Jawaban cepat tidak membuka window |
| Batas maksimum | 30 menit | Window ditutup paksa setelah ini |
| Bahasa | Auto | `auto` (ikut bahasa VS Code), `id`, atau `en` |
| Gaya pesan | 😈 Galak | `savage` (random galak + pesanmu), `simple` (kalem), `custom` (hanya pesanmu) |
| Pesan sendiri | – | Satu per baris, `{time}` = lama Claude kerja |
| Suara alarm | mati | Bunyi alarm saat waktunya kerja. File `.wav` sendiri juga bisa |
| Ukuran window | 420 × 820 | Ukuran window scroll |
| Browser | otomatis | Path ke Chrome/Edge/Brave kalau tidak terdeteksi |
| Port hook | 47821 | Ganti kalau bentrok, lalu install ulang hooks |

### Site bawaan

| Site | Feed | Login |
|---|---|---|
| YouTube Shorts | `youtube.com/shorts` | sama dengan feed |
| TikTok | `tiktok.com/foryou` | `tiktok.com/login` |
| Webtoon | `webtoons.com/en/` | sama dengan feed |

Tambah site sendiri dengan **+ Tambah site** di panel: isi nama, Feed URL, dan (opsional) Login URL.

## Command

| Command | Fungsi |
|---|---|
| `Time to Work: Settings` | Buka panel setting |
| `Time to Work: Test (simulate Claude working 15s)` | Coba tanpa Claude |
| `Time to Work: Close Scroll Window Now` | Tutup window scroll sekarang |
| `Time to Work: Pick Scroll Site` | Ganti site cepat |
| `Time to Work: Enable/Disable` | Nyalakan / matikan |
| `Time to Work: Install / Uninstall Claude Code Hooks` | Pasang / lepas hooks |

## Apa yang diubah di komputermu?

Biar transparan:

- **`~/.claude/settings.json`**: ditambah 4 hooks (`UserPromptSubmit`, `Stop`, `Notification`, `PostToolUse`) yang memanggil `curl` ke `http://127.0.0.1:47821`. Hanya dilakukan setelah kamu klik **Install hooks**, dan file lama di-backup dulu. **Uninstall hooks** menghapus hanya hooks milik extension ini.
- **Server lokal** di `127.0.0.1:47821`. Hanya menerima koneksi dari komputermu sendiri, dan hanya menerima sinyal start/stop.
- **Profil browser terpisah** di folder storage VS Code. Login site disimpan di sini, terpisah dari browser utamamu.

Extension ini tidak mengirim data ke mana pun.

## Batasan

- **YouTube, TikTok, dan Webtoon menolak ditampilkan di dalam VS Code** (iframe diblokir oleh site-nya). Karena itu default-nya window Chrome/Edge kecil. Mode `panel` hanya untuk URL embed seperti `youtube.com/embed/<id>`.
- **Tekan Esc di Claude** = hook `Stop` tidak terkirim. Tutup lewat `Time to Work: Close Scroll Window Now`, atau tunggu batas maksimum.
- **Windows kadang tidak mengizinkan app lain membawa window ke depan**, jadi ikon VS Code di taskbar hanya berkedip. Notifikasi tetap muncul.
- Kalau window **login** masih terbuka saat Claude selesai, window itu ikut ditutup. Selesaikan login dulu.
- Waktu login, **centang "Ingat saya / Remember me"** kalau ada. Site yang memakai *session cookie* (tanpa "ingat saya") akan logout setiap kali browser ditutup. Ini perilaku normal Chrome.
- Kalau beberapa window VS Code terbuka, hanya satu yang memegang port. Window scroll tetap jalan normal.

## Update dari versi lama

Setelah install versi baru, buka panel Time to Work. Kalau muncul **"Hooks versi lama"**, klik **Install hooks** sekali lagi, lalu mulai sesi Claude Code baru.

## Uninstall

1. Buka panel Time to Work, lalu klik **Uninstall hooks**.
2. Uninstall extension dari panel Extensions.

## Build sendiri

```bash
git clone https://github.com/OGMonK/time-to-work.git
cd time-to-work
npm install
npm run package          # menghasilkan time-to-work-x.y.z.vsix
```

Untuk development, buka folder ini di VS Code lalu tekan **F5**.

## Lisensi

[MIT](LICENSE)
