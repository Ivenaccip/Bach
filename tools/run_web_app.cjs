// Corre la web app de Emanuel-de-Jong/MIDI-To-Strudel (index.html + main.js, sin cambios) en
// Chromium headless, para cuando emanuel-de-jong.github.io no es alcanzable.
// Unica sustitucion: las 2 peticiones a CDN se atienden en local (tailwind -> vacio, solo
// estilos; skypack @tonejs/midi -> la misma libreria instalada con npm).
//
//   WEBAPP_DIR=ruta/al/clon TONEJS_MIDI=ruta/a/@tonejs/midi/build/Midi.js \
//   NODE_PATH=<donde este playwright> node tools/run_web_app.cjs entrada.mid salida.txt [compases] [notas_por_compas]
const { chromium } = require('playwright');
const fs = require('fs');
const [,, midiPath, outPath, bars = '4', notesPerBar = '16'] = process.argv;
const root = process.env.WEBAPP_DIR;
const toneFile = process.env.TONEJS_MIDI;
if (!root || !toneFile) { console.error('define WEBAPP_DIR y TONEJS_MIDI'); process.exit(2); }
const tone = fs.readFileSync(toneFile, 'utf8');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.route('**/cdn.tailwindcss.com/**', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/cdn.skypack.dev/**', r => r.fulfill({ contentType: 'application/javascript', body: tone + '\nexport const Midi = self.Midi;' }));
  await page.goto('file://' + root + '/index.html');
  await page.waitForFunction(() => window.Midi, null, { timeout: 10000 });
  await page.fill('#barLimit', bars);
  await page.fill('#notesPerBar', notesPerBar);
  await page.setInputFiles('#file', midiPath);
  await page.click('#convertBtn');
  await page.waitForFunction(() => document.querySelector('#output').value.length > 0, null, { timeout: 10000 });
  const out = await page.inputValue('#output');
  fs.writeFileSync(outPath, out);
  console.log(out);
  await browser.close();
})().catch(e => { console.error('FALLO', e); process.exit(1); });
