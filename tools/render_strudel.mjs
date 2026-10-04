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
// Si la mezcla pasa de 0 dBFS (pico > 1) se baja el volumen general hasta -1 dBFS en vez de
// recortar, y lo avisa en la salida (`volumen_ajustado_dB`); nunca sube el volumen.
// La salida es .wav, o .mp3 si la ruta termina en .mp3 (necesita ffmpeg con libmp3lame).
// Carga lo mismo que el REPL de strudel.cc: sintes (supersaw, sawtooth...), piano, baterias
// (tidal-drum-machines) y Dirt-Samples. Las muestras se bajan con curl, solo las que usa el
// codigo, a tools/.cache/net la primera vez. No carga soundfonts (gm_*) ni los alias de bancos.
// Chromium: variable CHROMIUM o /opt/pw-browsers/chromium.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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

// --- red: todo lo que el motor pida a raw.githubusercontent.com se atiende desde una cache local
// (bajada con curl), asi el navegador no necesita salir a internet ---
const cache = path.join(here, '.cache', 'net');
fs.mkdirSync(cache, { recursive: true });
const curl = (url, dest) => execFileSync('curl', ['-sSfL', '--max-time', '120', '-o', dest, url], { stdio: 'pipe' });
const fetchCached = (url) => {
  const f = path.join(cache, createHash('sha1').update(url).digest('hex'));
  if (!fs.existsSync(f)) { curl(url, `${f}.part`); fs.renameSync(`${f}.part`, f); }
  return fs.readFileSync(f);
};

// --- pagina: bundle del motor + servidor local ---
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'render-strudel-'));
await build({
  entryPoints: [path.join(here, 'render_strudel_page.js')], bundle: true, format: 'iife', platform: 'browser',
  outfile: path.join(work, 'bundle.js'), logLevel: 'error', absWorkingDir: here,
});
fs.writeFileSync(path.join(work, 'index.html'), '<!doctype html><meta charset="utf-8"><script src="bundle.js"></script>');

const server = http.createServer((req, res) => {
  const f = path.join(work, req.url.split('?')[0].replace(/^\/+/, '') || 'index.html');
  if (!f.startsWith(work) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// --- render ---
const chrome = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
let result;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.route('https://raw.githubusercontent.com/**', async (route) => {
    try {
      await route.fulfill({ status: 200, body: fetchCached(route.request().url()), headers: { 'access-control-allow-origin': '*' } });
    } catch {
      await route.fulfill({ status: 404, body: '', headers: { 'access-control-allow-origin': '*' } });
    }
  });
  await page.goto(`${base}/index.html`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  result = await page.evaluate((a) => window.renderStrudel(a), {
    code: fs.readFileSync(codeFile, 'utf8'), cycles, tail,
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
console.log(JSON.stringify({
  bpm: Math.round(result.bpm), eventos: result.events, segundos: +result.seconds.toFixed(2),
  pico_sin_ajustar: +result.peak.toFixed(2), volumen_ajustado_dB: +result.gainDb.toFixed(1), salida: outFile,
}));
