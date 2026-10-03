#!/usr/bin/env node
// Evalua un archivo Strudel con el motor real (@strudel/core + mini + tonal + transpiler),
// igual que el REPL de strudel.cc (incluye `$:`), y vuelca los eventos como JSON.
//
//   node tools/strudel_events.mjs bwv846/bach.strudel.js --bars 4
//
// Salida: { cps, bpm, cycles, events: [{ pitch, start, dur, sound }] } con start y dur en negras
// (1 ciclo = 1 compas de 4/4 = 4 negras). Los eventos sin nota (p. ej. bateria) se ignoran.
import { readFileSync } from 'node:fs';

const core = await import('@strudel/core');
const mini = await import('@strudel/mini');
const tonal = await import('@strudel/tonal');
const { transpiler } = await import('@strudel/transpiler');

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error('uso: strudel_events.mjs archivo.strudel.js [--bars N] [--beats-per-cycle 4]');
  process.exit(2);
}
const opt = (name, dflt) => (rest.includes(name) ? Number(rest[rest.indexOf(name) + 1]) : dflt);
const cycles = opt('--bars', 4);
const beatsPerCycle = opt('--beats-per-cycle', 4);

await core.evalScope(core, mini, tonal);
const { evaluate, scheduler } = core.repl({
  defaultOutput: () => {},
  getTime: () => 0,
  transpiler,
});

const logs = [];
const origLog = console.log;
console.log = (...a) => logs.push(a.join(' '));
const pattern = await evaluate(readFileSync(file, 'utf8'), false);
console.log = origLog;
if (!pattern) {
  console.error('la evaluacion fallo (mira el error de arriba)');
  process.exit(1);
}

const toMidi = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return core.noteToMidi(v);
  return undefined;
};

const events = [];
for (const hap of pattern.queryArc(0, cycles)) {
  const v = hap.value ?? {};
  const raw = typeof v === 'object' ? (v.note ?? v.n) : v;
  const pitch = toMidi(raw);
  if (pitch === undefined || !hap.whole) continue;
  // los eventos cortados por el borde de la consulta (parte != todo) se descartan
  if (hap.part.begin.ne(hap.whole.begin) || hap.part.end.ne(hap.whole.end)) continue;
  events.push({
    pitch,
    start: hap.whole.begin.valueOf() * beatsPerCycle,
    dur: hap.whole.end.sub(hap.whole.begin).valueOf() * beatsPerCycle,
    sound: typeof v === 'object' ? (v.s ?? v.sound ?? null) : null,
  });
}
events.sort((a, b) => a.start - b.start || a.pitch - b.pitch);

const cps = scheduler.cps;
process.stdout.write(JSON.stringify({ cps, bpm: cps * 60 * beatsPerCycle, cycles, events }) + '\n');
