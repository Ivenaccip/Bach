#!/usr/bin/env python3
"""Compara un archivo Strudel con un MIDI sin oirlo: evalua el codigo con el motor real de Strudel
(tools/strudel_events.mjs) y contrasta tempo, numero de compases y la secuencia de notas.

Uso:
    python tools/verify_strudel.py bwv846/bach.strudel.js bwv846/chunks/c01_compases_01-04.mid
    python tools/verify_strudel.py CODIGO.js MIDI.mid --bars 4 --strict

Reporta dos niveles: (altura, inicio) y (altura, inicio, duracion). Sale con codigo 1 si hay
diferencias de altura/inicio, o tambien de duracion con --strict.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import pretty_midi as pm

TOL = 1e-3  # negras
NAME = pm.note_number_to_name


def strudel_events(code: str, bars: int):
    here = Path(__file__).parent
    res = subprocess.run(["node", str(here / "strudel_events.mjs"), code, "--bars", str(bars)], capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"fallo la evaluacion de {code}:\n{res.stderr or res.stdout}")
    return json.loads(res.stdout.strip().splitlines()[-1])


def midi_events(path: str):
    midi = pm.PrettyMIDI(path)
    bpm = float(midi.get_tempo_changes()[1][0])
    beat = 60.0 / bpm
    ev = [(n.pitch, n.start / beat, (n.end - n.start) / beat) for i in midi.instruments for n in i.notes]
    return sorted(ev, key=lambda e: (e[1], e[0])), bpm


def diff(a, b, with_dur):
    """a - b como multiconjuntos de eventos, con tolerancia."""
    key = (lambda e: (e[0], e[1], e[2])) if with_dur else (lambda e: (e[0], e[1]))
    rest, only_a = list(b), []
    for e in a:
        for j, o in enumerate(rest):
            if all(abs(x - y) <= TOL for x, y in zip(key(e), key(o))):
                del rest[j]
                break
        else:
            only_a.append(e)
    return only_a, rest  # (solo en a, solo en b)


def fmt(e):
    return f"{NAME(e[0])}@{e[1]:g}(dur {e[2]:g})"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("code")
    ap.add_argument("midi")
    ap.add_argument("--bars", type=int, help="compases a consultar (por defecto: los del MIDI)")
    ap.add_argument("--strict", action="store_true", help="las diferencias de duracion tambien fallan")
    args = ap.parse_args()

    ref, midi_bpm = midi_events(args.midi)
    bars = args.bars or int(-(-max(s + d for _, s, d in ref) // 4))
    got = strudel_events(args.code, bars)
    mine = [(e["pitch"], e["start"], e["dur"]) for e in got["events"]]

    print(f"{args.code}  vs  {args.midi}")
    print(f"  tempo:    codigo {got['bpm']:.3f} bpm | MIDI {midi_bpm:.3f} bpm | {'OK' if abs(got['bpm'] - midi_bpm) < 0.01 else 'DIFERENTE'}")
    code_end = max((s + d for _, s, d in mine), default=0) / 4
    print(f"  compases: codigo {bars} consultados (ultimo evento termina en el compas {code_end:g}) | MIDI {bars}")
    print(f"  notas:    codigo {len(mine)} | MIDI {len(ref)}")
    sounds = sorted({str(e["sound"]) for e in got["events"]})
    print(f"  timbre:   {', '.join(sounds)}")

    pos_a, pos_b = diff(mine, ref, with_dur=False)
    dur_a, dur_b = diff(mine, ref, with_dur=True)
    print(f"  altura+inicio: {len(ref) - len(pos_b)}/{len(ref)} coinciden; solo en codigo {len(pos_a)}, solo en MIDI {len(pos_b)}")
    print(f"  + duracion:    {len(ref) - len(dur_b)}/{len(ref)} coinciden; solo en codigo {len(dur_a)}, solo en MIDI {len(dur_b)}")
    shown = 0
    for label, items in (("solo en codigo", dur_a), ("solo en MIDI", dur_b)):
        for e in items[:8]:
            print(f"    {label}: {fmt(e)}")
            shown += 1
        if len(items) > 8:
            print(f"    ... y {len(items) - 8} mas ({label})")
    bad_pos = bool(pos_a or pos_b)
    bad_dur = bool(dur_a or dur_b)
    print("  veredicto:", "DIFERENCIAS de altura/inicio" if bad_pos else ("misma secuencia de notas; DIFIERE en duraciones" if bad_dur else "identico"))
    return 1 if bad_pos or (args.strict and bad_dur) else 0


if __name__ == "__main__":
    sys.exit(main())
