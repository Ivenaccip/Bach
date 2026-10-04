#!/usr/bin/env node
// Renderiza codigo Strudel a audio con el motor de audio real de strudel.cc (superdough) en
// Chromium headless, sin abrir strudel.cc y sin tiempo real. Suena el codigo, no un MIDI.
//
//   node tools/render_strudel.mjs bwv846/bach.strudel.js bwv846/audio/bwv846_strudel.mp3 --cycles 16
//
//   --cycles N   ciclos a renderizar (1 ciclo = 1 compas en bach.strudel.js; el codigo se repite
//                en bucle, como en el REPL). Por defecto 4.
//   --tail S     segundos extra al final para que se apague la ultima nota. Por defecto 3.
//
// La salida es .wav, o .mp3 si la ruta termina en .mp3 (necesita ffmpeg con libmp3lame).
// Solo carga el sonido `piano`: las muestras (Salamander, las mismas de strudel.cc) se bajan con
// curl a tools/.cache/piano la primera vez. Chromium: variable CHROMIUM o /opt/pw-browsers/chromium.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [codeFile, outFile, ...rest] = process.argv.slice(2);
if (!codeFile || !outFile) {
  console.error('uso: render_strudel.mjs codigo.strudel.js salida.(wav|mp3) [--cycles N] [--tail S]');
  process.exit(2);
}
const opt = (name, dflt) => (rest.includes(name) ? Number(rest[rest.indexOf(name) + 1]) : dflt);
const cycles = opt('--cycles', 4);
const tail = opt('--tail', 3);

// --- muestras del piano (cache local) ---
const SAMPLES = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';
const cache = path.join(here, '.cache', 'piano');
fs.mkdirSync(cache, { recursive: true });
const curl = (url, dest) => execFileSync('curl', ['-sSfL', '--max-time', '120', '-o', dest, url]);
const mapFile = path.join(cache, 'piano.json');
if (!fs.existsSync(mapFile)) curl(`${SAMPLES}/piano.json`, mapFile);
const pianoMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
for (const f of Object.values(pianoMap.piano)) {
  const dest = path.join(cache, f);
  if (!fs.existsSync(dest)) curl(`${pianoMap._base}${f}`, dest);
}

// --- pagina: bundle del motor + servidor local ---
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'render-strudel-'));
await build({
  entryPoints: [path.join(here, 'render_strudel_page.js')], bundle: true, format: 'iife', platform: 'browser',
  outfile: path.join(work, 'bundle.js'), logLevel: 'error', absWorkingDir: here,
});
fs.writeFileSync(path.join(work, 'index.html'), '<!doctype html><meta charset="utf-8"><script src="bundle.js"></script>');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const [root, rel] = url.startsWith('/piano/') ? [cache, url.slice(7)] : [work, url.replace(/^\/+/, '') || 'index.html'];
  const f = path.join(root, rel);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
fs.writeFileSync(path.join(work, 'piano.json'), JSON.stringify({ ...pianoMap, _base: `${base}/piano/` }));

// --- render ---
const chrome = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
let result;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(`${base}/index.html`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  result = await page.evaluate((a) => window.renderStrudel(a), {
    code: fs.readFileSync(codeFile, 'utf8'), cycles, tail, sampleMapUrl: `${base}/piano.json`,
  });
} finally {
  await browser.close();
  server.close();
}

const wav = Buffer.from(result.wavBase64, 'base64');
fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
if (outFile.endsWith('.mp3')) {
  const tmp = path.join(work, 'out.wav');
  fs.writeFileSync(tmp, wav);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-q:a', '2', outFile]);
} else {
  fs.writeFileSync(outFile, wav);
}
fs.rmSync(work, { recursive: true, force: true });
console.log(JSON.stringify({ bpm: result.bpm, notas: result.events, segundos: +result.seconds.toFixed(2), salida: outFile }));
