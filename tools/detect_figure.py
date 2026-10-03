#!/usr/bin/env python3
"""Detecta la figura repetida de un MIDI cuantizado a 16avos y reporta que compases la cumplen.

Hipotesis (se comprueba contra los datos, no se asume): cada medio compas (8 semicorcheas) es
    paso 0      nota grave 1, sostenida 8 pasos
    paso 1      nota grave 2, sostenida 7 pasos
    pasos 2-7   a b c a b c  (tres agudas repetidas, 1 paso cada una)
y las dos mitades del compas llevan las mismas alturas.

Uso:
    python tools/detect_figure.py bwv846/bach_clean.mid            # tabla de los compases
    python tools/detect_figure.py bwv846/bach_clean.mid --json     # acordes de los compases que cumplen
"""
import argparse
import json
import sys

import pretty_midi as pm

STEPS_PER_BAR = 16


def load_steps(path):
    """notas como (pista, pitch, paso_inicial, pasos_de_duracion) con paso = 16avo."""
    midi = pm.PrettyMIDI(path)
    bpm = midi.get_tempo_changes()[1][0]
    step_sec = 60.0 / bpm / 4
    notes = []
    for ti, inst in enumerate(midi.instruments):
        for n in inst.notes:
            notes.append((ti, n.pitch, round(n.start / step_sec), round((n.end - n.start) / step_sec)))
    return notes, bpm


def bar_figure(bar_notes):
    """(l1, l2, a, b, c) si el compas cumple la hipotesis; si no, (None, motivo)."""
    by_step = {}
    for ti, p, s, d in bar_notes:
        by_step.setdefault(s % STEPS_PER_BAR, []).append((ti, p, d))
    halves = []
    for h in (0, 8):
        try:
            (_, l1, d1), = by_step[h + 0]
            (_, l2, d2), = by_step[h + 1]
            up = [by_step[h + k] for k in range(2, 8)]
            assert all(len(u) == 1 for u in up)
            up = [u[0] for u in up]
            assert (d1, d2) == (8, 7) and all(d == 1 for _, _, d in up)
            a, b, c, a2, b2, c2 = (p for _, p, _ in up)
            assert (a, b, c) == (a2, b2, c2)
            halves.append((l1, l2, a, b, c))
        except (KeyError, ValueError, AssertionError):
            return None, f"el medio compas {h // 8 + 1} no sigue la figura"
    if halves[0] != halves[1]:
        return None, "las dos mitades llevan alturas distintas"
    if len(bar_notes) != 16:
        return None, f"{len(bar_notes)} notas (se esperaban 16)"
    return halves[0], None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("midi")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    notes, bpm = load_steps(args.midi)
    n_bars = max((s + d - 1) // STEPS_PER_BAR for _, _, s, d in notes) + 1
    rows, ok = [], 0
    for bar in range(n_bars):
        bar_notes = [n for n in notes if n[2] // STEPS_PER_BAR == bar]
        fig, why = bar_figure(bar_notes)
        ok += fig is not None
        rows.append({"bar": bar + 1, "figure": [pm.note_number_to_name(p) for p in fig] if fig else None, "midi": list(fig) if fig else None, "why_not": why, "notes": len(bar_notes)})

    if args.json:
        json.dump({"bpm": bpm, "bars": n_bars, "conform": ok, "rows": rows}, sys.stdout, indent=1)
        print()
        return 0
    print(f"{args.midi}: {n_bars} compases, tempo {bpm}, cumplen la figura {ok}/{n_bars}")
    for r in rows:
        print(f"  c{r['bar']:02d}", " ".join(r["figure"]) if r["figure"] else f"-- {r['why_not']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
