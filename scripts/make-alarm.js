// Generates media/alarm.wav: a short, friendly "ding-ding" alarm (3 pairs of chimes).
// Run: node scripts/make-alarm.js
const fs = require('fs');
const path = require('path');

const rate = 22050;
const notes = [];
for (let r = 0; r < 3; r++) {
  const t0 = r * 0.42;
  notes.push({ start: t0, freq: 1318.5 }); // E6
  notes.push({ start: t0 + 0.14, freq: 1046.5 }); // C6
}
const duration = 3 * 0.42 + 0.5;
const n = Math.floor(rate * duration);
const samples = new Int16Array(n);

for (let i = 0; i < n; i++) {
  const t = i / rate;
  let v = 0;
  for (const note of notes) {
    const dt = t - note.start;
    if (dt < 0 || dt > 0.5) continue;
    const env = Math.min(1, dt / 0.004) * Math.exp(-dt * 9); // fast attack, bell-like decay
    v += env * (Math.sin(2 * Math.PI * note.freq * dt) + 0.35 * Math.sin(2 * Math.PI * note.freq * 2.01 * dt));
  }
  samples[i] = Math.max(-1, Math.min(1, v * 0.38)) * 32767;
}

const data = Buffer.from(samples.buffer);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const out = path.join(__dirname, '..', 'media', 'alarm.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, data]));
console.log('wrote', out, (44 + data.length) + ' bytes');
