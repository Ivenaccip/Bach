#!/usr/bin/env python3
"""Pruebas de clean_midi.clean con MIDIs sinteticos. Uso: python tools/test_clean_midi.py"""
import sys
from pathlib import Path

import pretty_midi as pm

sys.path.insert(0, str(Path(__file__).parent))
from clean_midi import clean  # noqa: E402

BPM = 60.0  # a 60 bpm 1 segundo = 1 negra: los tiempos de abajo estan en negras


def make(notes):
    m = pm.PrettyMIDI(initial_tempo=BPM)
    inst = pm.Instrument(program=0)
    inst.notes = [pm.Note(velocity=v, pitch=p, start=s, end=e) for p, s, e, v in notes]
    m.instruments.append(inst)
    return m


def run(notes, merge_gap=0.0, min_vel=20, fixed_bpm=None):
    tracks, stats = clean(make(notes), BPM, fixed_bpm, grid=0.25, min_beats=0.125, min_vel=min_vel, merge_gap=merge_gap)
    return [(p, round(s, 3), round(e, 3)) for p, s, e, _ in tracks[0][1]], stats


# repeticion legitima de partitura (hueco exactamente 0): no se une, ni siquiera con merge_gap alto
out, _ = run([(60, 0, 2, 90), (60, 2, 4, 90)], merge_gap=0.5)
assert out == [(60, 0, 2), (60, 2, 4)], out

# re-ataque partido por la transcripcion (hueco 0.05 negras): con merge_gap se une; sin el, no
out, st = run([(60, 0, 1.0, 90), (60, 1.05, 2.0, 90)], merge_gap=0.1)
assert out == [(60, 0, 2.0)] and st["re_ataques_unidos"] == 1, (out, st)
out, _ = run([(60, 0, 1.0, 90), (60, 1.05, 2.0, 90)], merge_gap=0.0)
assert len(out) == 2, out

# velocidad baja y notas muy cortas se borran y se cuentan
out, st = run([(60, 0, 1, 10), (62, 0, 0.05, 90), (64, 0, 1, 90)])
assert out == [(64, 0, 1)] and st["borradas_velocidad_baja"] == 1 and st["borradas_muy_cortas"] == 1, (out, st)

# cuantiza a 16avos
out, st = run([(60, 0.1, 0.9, 90)])
assert out == [(60, 0.0, 1.0)] and st["notas_movidas_por_cuantizacion"] == 1, (out, st)

# misma altura solapada: la primera termina donde empieza la segunda
out, st = run([(60, 0, 2, 90), (60, 1, 2, 90)])
assert out == [(60, 0, 1), (60, 1, 2)] and st["solapes_recortados"] == 1, (out, st)

# tempo fijo (audio): 2 s reales a 120 bpm son 4 negras, aunque el MIDI diga 60 bpm
out, _ = run([(60, 0, 2, 90)], fixed_bpm=120.0)
assert out == [(60, 0.0, 4.0)], out

print("ok: 6 pruebas")
