#!/usr/bin/env python3
"""Limpia un MIDI para convertirlo a Strudel.

Pasos (todos con parametros y con conteo de lo que tocan):
  1. tempo: --bpm, o estimado del audio (--audio, librosa.beat.beat_track), o el primero del MIDI.
     Con --bpm/--audio los tiempos del MIDI se toman como segundos reales (salida de audio -> MIDI);
     sin ellos se respeta el mapa de tempo del MIDI (partitura).
  2. cuantiza inicio y fin a una rejilla (por defecto 16avos = 0.25 negra).
  3. borra notas de velocidad baja o muy cortas (medidas ANTES de cuantizar).
  4. une re-ataques de la misma altura separados por un hueco 0 < hueco <= --merge-gap
     (con --merge-gap 0, el valor por defecto, no se une nada: en una partitura
     las notas repetidas pegadas son intencionales).
  5. opcional: --bars A-B recorta esos compases (4/4) y los desplaza a 0.

El MIDI de salida lleva un unico tempo; los cambios de tempo del original se aplanan.

Uso:
    python tools/clean_midi.py bwv846/source.mid bwv846/bach_clean.mid
    python tools/clean_midi.py bwv846/bach_clean.mid c01.mid --bars 1-4
"""
import argparse
import sys
from collections import Counter

import pretty_midi as pm

BEATS_PER_BAR = 4  # el handoff y los conversores asumen 4/4


def estimate_bpm_from_audio(path: str) -> float:
    import librosa

    y, sr = librosa.load(path, sr=None, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    return float(tempo if not hasattr(tempo, "__len__") else tempo[0])


def to_beats(midi: pm.PrettyMIDI, t: float, fixed_bpm: float | None) -> float:
    """Segundos -> negras. Con tempo fijo (--bpm/--audio) los segundos son reales (audio) y se
    convierten con ese tempo; si no, se usa el mapa de tempo del propio MIDI (partitura)."""
    if fixed_bpm:
        return t * fixed_bpm / 60.0
    return midi.time_to_tick(t) / midi.resolution


def clean(midi: pm.PrettyMIDI, bpm: float, fixed_bpm: float | None, grid: float, min_beats: float, min_vel: int, merge_gap: float):
    """Devuelve (lista de pistas [(nombre, [(pitch, ini, fin, vel)])], stats) en negras."""
    stats = Counter()
    tracks = []
    for inst in midi.instruments:
        if inst.is_drum:
            stats["pistas_percusion_omitidas"] += 1
            continue
        raw = []
        for n in inst.notes:
            s, e = to_beats(midi, n.start, fixed_bpm), to_beats(midi, n.end, fixed_bpm)
            stats["notas_entrada"] += 1
            if n.velocity < min_vel:
                stats["borradas_velocidad_baja"] += 1
                continue
            if e - s < min_beats:
                stats["borradas_muy_cortas"] += 1
                continue
            raw.append([n.pitch, s, e, n.velocity])

        # une re-ataques de la misma altura con un hueco pequeno, medido sobre los tiempos
        # crudos (despues de cuantizar un hueco chico quedaria en 0 y ya no se distinguiria de
        # una repeticion legitima). Hueco exactamente 0 = notas pegadas a proposito: no se une.
        joined = []
        for pitch in sorted({n[0] for n in raw}):
            same = sorted((n for n in raw if n[0] == pitch), key=lambda n: n[1])
            cur = same[0]
            for nxt in same[1:]:
                if merge_gap > 0 and 1e-6 < nxt[1] - cur[2] <= merge_gap + 1e-9:
                    cur[2] = max(cur[2], nxt[2])
                    stats["re_ataques_unidos"] += 1
                else:
                    joined.append(cur)
                    cur = nxt
            joined.append(cur)

        # cuantiza inicio y fin a la rejilla
        notes = []
        for pitch, s, e, vel in joined:
            qs, qe = round(s / grid) * grid, round(e / grid) * grid
            if qe <= qs:
                qe = qs + grid
            if abs(qs - s) > 0.01 or abs(qe - e) > 0.01:  # deriva numerica no cuenta
                stats["notas_movidas_por_cuantizacion"] += 1
            notes.append([pitch, qs, qe, vel])

        # misma altura solapada: la tecla se vuelve a golpear, asi que la anterior termina ahi
        for pitch in {n[0] for n in notes}:
            same = sorted((n for n in notes if n[0] == pitch), key=lambda n: n[1])
            for a, b in zip(same, same[1:]):
                if b[1] < a[2]:
                    a[2] = b[1]
                    stats["solapes_recortados"] += 1
        notes = [n for n in notes if n[2] > n[1]]
        notes.sort(key=lambda n: (n[1], n[0]))
        stats["notas_salida"] += len(notes)
        tracks.append((inst.name or f"pista{len(tracks)}", notes))
    return tracks, stats


def slice_bars(tracks, first_bar: int, last_bar: int):
    lo, hi = (first_bar - 1) * BEATS_PER_BAR, last_bar * BEATS_PER_BAR
    out = []
    for name, notes in tracks:
        kept = [[p, s - lo, min(e, hi) - lo, v] for p, s, e, v in notes if lo <= s < hi]
        out.append((name, kept))
    return out


def write_midi(tracks, bpm: float, path: str, names=None):
    out = pm.PrettyMIDI(resolution=480, initial_tempo=bpm)
    out.time_signature_changes = [pm.TimeSignature(4, 4, 0)]
    sec = lambda b: b * 60.0 / bpm
    for i, (name, notes) in enumerate(tracks):
        inst = pm.Instrument(program=0, name=(names[i] if names else name))
        for p, s, e, v in notes:
            inst.notes.append(pm.Note(velocity=int(v), pitch=int(p), start=sec(s), end=sec(e)))
        out.instruments.append(inst)
    out.write(path)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--bpm", type=float, help="tempo en negras/min (por defecto: --audio, o el primero del MIDI)")
    ap.add_argument("--audio", help="grabacion de la que estimar el tempo con librosa")
    ap.add_argument("--grid", type=float, default=0.25, help="rejilla en negras (0.25 = 16avos)")
    ap.add_argument("--min-beats", type=float, default=0.125, help="duracion minima en negras")
    ap.add_argument("--min-vel", type=int, default=20)
    ap.add_argument("--merge-gap", type=float, default=0.0, help="hueco maximo (negras) para unir re-ataques; 0 = no unir")
    ap.add_argument("--bars", help="recorta compases A-B (ambos incluidos)")
    ap.add_argument("--names", help="nombres de pista separados por coma (p. ej. 'mano derecha,mano izquierda')")
    args = ap.parse_args()

    midi = pm.PrettyMIDI(args.inp)
    tempos = midi.get_tempo_changes()[1]
    fixed = None
    if args.bpm:
        bpm, how = args.bpm, "--bpm"
        fixed = bpm
    elif args.audio:
        bpm, how = estimate_bpm_from_audio(args.audio), f"librosa sobre {args.audio}"
        fixed = bpm
        print(f"aviso: librosa suele devolver el doble o la mitad del tempo real: {bpm:.1f} podria ser {bpm / 2:.1f} o {bpm * 2:.1f}. Compruebalo de oido y repite con --bpm.")
    else:
        bpm, how = float(round(tempos[0], 3)), "primer tempo del MIDI"
    if not fixed and len(tempos) > 1:
        print(f"aviso: el original trae {len(tempos)} tempos {[round(float(t), 2) for t in tempos]}; se aplanan a {bpm}")

    tracks, stats = clean(midi, bpm, fixed, args.grid, args.min_beats, args.min_vel, args.merge_gap)
    if args.bars:
        a, b = (int(x) for x in args.bars.split("-"))
        tracks = slice_bars(tracks, a, b)
    names = [s.strip() for s in args.names.split(",")] if args.names else None
    write_midi(tracks, bpm, args.out, names)

    print(f"tempo: {bpm} ({how}); rejilla: {args.grid} negras")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"escrito: {args.out}  ({sum(len(n) for _, n in tracks)} notas en {len(tracks)} pistas)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
