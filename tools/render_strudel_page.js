// Parte de render_strudel.mjs; corre dentro de Chromium (esbuild lo empaqueta). Evalua codigo
// Strudel con el motor real y lo renderiza sin conexion (OfflineAudioContext) con superdough,
// el mismo motor de audio que strudel.cc.
import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import { transpiler } from '@strudel/transpiler';
import * as webaudio from '@strudel/webaudio';

const SR = 44100;

const toBase64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

function wav16(left, right, sr, gain = 1) {
  const n = left.length;
  const buf = new ArrayBuffer(44 + n * 4);
  const v = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44;
  const q = (x) => Math.max(-1, Math.min(1, x * gain)) * 0x7fff;
  for (let i = 0; i < n; i++) { v.setInt16(o, q(left[i]), true); v.setInt16(o + 2, q(right[i]), true); o += 4; }
  return new Uint8Array(buf);
}

const DS = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';

window.renderStrudel = async ({ code, cycles, tail, debug }) => {
  window.__debug = debug;
  await core.evalScope(core, mini, tonal, webaudio);
  const { evaluate, scheduler } = core.repl({ defaultOutput: () => {}, getTime: () => 0, transpiler });
  const pattern = await evaluate(code, false);
  if (!pattern) throw new Error('la evaluacion del codigo Strudel fallo');
  const cps = scheduler.cps;
  const cycleSec = 1 / cps;

  // superdough hace `new AudioContext()` la primera vez: le damos uno offline con la duracion exacta
  const seconds = cycles / cps + tail;
  const off = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil(seconds * SR), sampleRate: SR });
  // superdough le cuelga metodos a AudioContext.prototype (reverb, delay, vocales); un contexto
  // offline no es un AudioContext, asi que se los copiamos
  for (const k of ['createReverb', 'adjustLength', 'createFeedbackDelay', 'createVowelFilter']) {
    off[k] = window.AudioContext.prototype[k];
  }
  window.AudioContext = function () { return off; };

  // lo mismo que el prebake del REPL de strudel.cc: sintes, piano, baterias y Dirt-Samples
  const realResume = off.resume.bind(off);
  off.resume = async () => {}; // un contexto offline no se puede "reanudar" antes de empezar; initAudio lo pide
  await webaudio.initAudio({ maxPolyphony: 100000 }); // carga los worklets (supersaw, etc.)
  off.resume = realResume;
  await webaudio.registerSynthSounds();
  await Promise.allSettled(
    ['tidal-drum-machines', 'piano', 'Dirt-Samples', 'EmuSP12', 'vcsl', 'mridangam'].map((n) =>
      webaudio.samples(`${DS}/${n}.json`)),
  );

  // Se programa un ciclo por delante con suspend(): si se programaran los 4000+ eventos a la vez
  // habria miles de nodos vivos a la vez y el render se arrastra.
  let events = 0;
  let failure = null;
  const scheduleCycle = async (c) => {
    const pending = [];
    for (const hap of pattern.queryArc(c, c + 1)) {
      if (!hap.hasOnset()) continue;
      const start = hap.whole.begin.valueOf() / cps;
      const dur = hap.whole.end.sub(hap.whole.begin).valueOf() / cps;
      // `deadline` es relativo a currentTime, pero `t` (el 5.o argumento) es absoluto y manda si no es 0
      pending.push(webaudio.webaudioOutput(hap, start - off.currentTime, dur, cps, start));
    }
    events += pending.length;
    if (window.__debug) console.log(`ciclo ${c}: ${pending.length} eventos, currentTime=${off.currentTime.toFixed(3)}`);
    await Promise.all(pending);
  };
  await scheduleCycle(0);
  if (cycles > 1) await scheduleCycle(1);
  for (let c = 1; c < cycles - 1; c++) {
    off.suspend(c * cycleSec).then(async () => {
      try { await scheduleCycle(c + 1); } catch (e) { failure ??= e; }
      off.resume();
    });
  }
  const rendered = await off.startRendering();
  if (failure) throw failure;
  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  // si la mezcla pasa de 0 dBFS (en el navegador tambien distorsionaria) se baja el volumen general
  // hasta -1 dBFS en vez de recortar; nunca se sube
  const gain = peak > 0.891 ? 0.891 / peak : 1;
  const wav = wav16(left, right, SR, gain);
  return { cps, bpm: cps * 240, events, seconds, peak, gainDb: 20 * Math.log10(gain), wavBase64: toBase64(wav) };
};
window.__ready = true;
