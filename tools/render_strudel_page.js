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

function wav16(left, right, sr) {
  const n = left.length;
  const buf = new ArrayBuffer(44 + n * 4);
  const v = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44;
  const q = (x) => Math.max(-1, Math.min(1, x)) * 0x7fff;
  for (let i = 0; i < n; i++) { v.setInt16(o, q(left[i]), true); v.setInt16(o + 2, q(right[i]), true); o += 4; }
  return new Uint8Array(buf);
}

window.renderStrudel = async ({ code, cycles, tail, sampleMapUrl }) => {
  await core.evalScope(core, mini, tonal, webaudio);
  const { evaluate, scheduler } = core.repl({ defaultOutput: () => {}, getTime: () => 0, transpiler });
  const pattern = await evaluate(code, false);
  if (!pattern) throw new Error('la evaluacion del codigo Strudel fallo');
  const cps = scheduler.cps;

  // superdough hace `new AudioContext()` la primera vez: le damos uno offline con la duracion exacta
  const seconds = cycles / cps + tail;
  const off = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil(seconds * SR), sampleRate: SR });
  window.AudioContext = function () { return off; };
  // todas las notas quedan programadas a la vez: sin esto superdough corta las mas viejas a las 128
  webaudio.setMaxPolyphony(100000);
  await webaudio.samples(sampleMapUrl);

  const pending = [];
  for (const hap of pattern.queryArc(0, cycles)) {
    if (!hap.hasOnset()) continue;
    const start = hap.whole.begin.valueOf() / cps;
    const dur = hap.whole.end.sub(hap.whole.begin).valueOf() / cps;
    pending.push(webaudio.webaudioOutput(hap, start, dur, cps));
  }
  await Promise.all(pending);
  const rendered = await off.startRendering();
  const wav = wav16(rendered.getChannelData(0), rendered.getChannelData(1), SR);
  return { cps, bpm: cps * 240, events: pending.length, seconds, wavBase64: toBase64(wav) };
};
window.__ready = true;
