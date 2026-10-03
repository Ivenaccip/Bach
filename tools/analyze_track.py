#!/usr/bin/env python3
"""Analiza un tema Strudel (sin oirlo) a partir del volcado de eventos de strudel_events.mjs --all.

Las capas se identifican por su `.color(...)`, que en el codigo se usa como etiqueta. Comprueba:
  - linea de tiempo: secciones, compases y tiempo
  - densidad de eventos por capa y seccion
  - escala: notas fuera de la escala dada
  - armonia: la raiz del bajo esta en el acorde del compas; que parte de la melodia son notas
    del acorde, septimas (color) o notas ajenas, y si las ajenas caen en tiempo fuerte
  - bateria: bombo en cada negra, palmada en 2 y 4, hats donde toca
  - registro (nota mas grave y mas aguda) por capa

Uso:
    node tools/strudel_events.mjs tema.strudel.js --bars 72 --all > ev.json
    python tools/analyze_track.py ev.json --sections "intro:8,subida:8,drop:16" \\
        --roles "red:bombo,blue:bajo,purple:pad,cyan:melodia" --scale "A B C D E F G G#"
"""
import argparse
import json
import sys
from collections import Counter, defaultdict

import pretty_midi as pm

PC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def load(path):
    return json.loads(open(path).read().strip().splitlines()[-1])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("events")
    ap.add_argument("--sections", required=True, help="nombre:compases,... en orden")
    ap.add_argument("--roles", required=True, help="color:rol (o color/sonido:rol) separados por coma")
    ap.add_argument("--scale", help='clases de altura permitidas, p. ej. "A B C D E F G G#"')
    ap.add_argument("--bass", default="bajo", help="rol del bajo")
    ap.add_argument("--chords", default="pad", help="rol del que se deduce el acorde de cada compas")
    ap.add_argument("--melody", default="melodia", help="rol de la melodia principal")
    args = ap.parse_args()

    d = load(args.events)
    bpm = d["bpm"]
    roles = dict(kv.split(":", 1) for kv in args.roles.split(","))

    def role_of(e):
        color = e["value"].get("color")
        return roles.get(f"{color}/{e['sound']}") or roles.get(color) or f"?{color}/{e['sound']}"

    ev = []
    for e in d["events"]:
        bar = int(e["start"] // 4) + 1
        step = round((e["start"] % 4) * 4)  # semicorchea dentro del compas, 0-15
        ev.append({**e, "bar": bar, "step": step, "role": role_of(e)})
    n_bars = d["cycles"]
    bar_sec = 4 * 60.0 / bpm

    # ---- linea de tiempo ----
    secs, b = [], 1
    for item in args.sections.split(","):
        name, n = item.rsplit(":", 1)
        secs.append((name, b, b + int(n) - 1))
        b += int(n)
    assert b - 1 == n_bars, f"las secciones suman {b - 1} compases y el volcado tiene {n_bars}"
    total = n_bars * bar_sec
    print(f"{n_bars} compases a {bpm:.1f} bpm = {int(total // 60)}:{int(total % 60):02d} ({total:.0f} s); {len(ev)} eventos")
    names = sorted({e["role"] for e in ev})
    colw = max(len(n) for n in names) + 1
    print("\nEventos por seccion y capa (total en la seccion):")
    print(f"{'seccion':<14}{'compases':<10}{'tiempo':<12}" + "".join(f"{n[:colw]:>{colw+1}}" for n in names))
    for name, a, z in secs:
        c = Counter(e["role"] for e in ev if a <= e["bar"] <= z)
        t0, t1 = (a - 1) * bar_sec, z * bar_sec
        print(f"{name:<14}{f'{a}-{z}':<10}{f'{int(t0//60)}:{int(t0%60):02d}-{int(t1//60)}:{int(t1%60):02d}':<12}" + "".join(f"{(c[n] or '.'):>{colw+1}}" for n in names))

    problems = []

    # ---- bateria ----
    print("\nBateria:")
    for role, rule, label in [
        ("bombo", lambda e: e["step"] % 4 == 0, "en cada negra"),
        ("palmada", lambda e: e["step"] in (4, 12), "en los tiempos 2 y 4"),
        ("hat abierto", lambda e: e["step"] % 4 == 2, "a contratiempo (la corchea de despues del tiempo)"),
    ]:
        es = [e for e in ev if e["role"] == role]
        bad = [e for e in es if not rule(e)]
        print(f"  {role}: {len(es)} golpes, {label}: {'OK' if not bad else f'{len(bad)} FUERA'}")
        if bad:
            problems.append(f"{role} fuera de su rejilla")
    hats = Counter(e["bar"] for e in ev if e["role"] == "hat cerrado")
    print(f"  hat cerrado: {sum(hats.values())} golpes, {sorted(set(hats.values()))} por compas (esperado 16)")

    # ---- armonia ----
    chords = defaultdict(set)
    for e in ev:
        if e["role"] == args.chords and e["pitch"] is not None:
            chords[e["bar"]].add(e["pitch"] % 12)
    scale = {PC.index(n) for n in args.scale.split()} if args.scale else None
    print("\nEscala y armonia:")
    for role in sorted({e["role"] for e in ev if e["pitch"] is not None}):
        es = [e for e in ev if e["role"] == role and e["pitch"] is not None]
        lo, hi = min(e["pitch"] for e in es), max(e["pitch"] for e in es)
        out = [e for e in es if scale and e["pitch"] % 12 not in scale]
        print(f"  {role:<10} registro {pm.note_number_to_name(lo)}-{pm.note_number_to_name(hi)}"
              + (f"; fuera de escala: {len(out)}" if scale else ""))
        if out:
            problems.append(f"{role}: {len(out)} notas fuera de escala")
    missing = [bar for bar in range(1, n_bars + 1) if bar not in chords]
    print(f"  compases sin acorde ({args.chords}): {missing or 'ninguno'}")
    root_bad = [e for e in ev if e["role"] == args.bass and e["pitch"] is not None and e["pitch"] % 12 not in chords.get(e["bar"], set())]
    print(f"  raiz del bajo dentro del acorde del compas: {'OK' if not root_bad else f'{len(root_bad)} FUERA'}")
    if root_bad:
        problems.append("bajo fuera del acorde")

    # raiz de cada compas = nota del bajo; sirve para reconocer las septimas del acorde
    roots = {}
    for e in ev:
        if e["role"] == args.bass and e["pitch"] is not None:
            roots.setdefault(e["bar"], e["pitch"] % 12)
    mel = [e for e in ev if e["role"] == args.melody and e["pitch"] is not None and e["sound"] == "supersaw"]
    ct, seventh, foreign = 0, Counter(), Counter()
    strong = {"septima": 0, "ajena": 0}
    for e in mel:
        pc, bar = e["pitch"] % 12, e["bar"]
        key = ((bar - 1) % 8 + 1, PC[pc], e["step"])
        if pc in chords.get(bar, set()):
            ct += 1
        elif bar in roots and (pc - roots[bar]) % 12 in (10, 11):  # septima menor o mayor sobre la raiz
            seventh[key] += 1
            strong["septima"] += e["step"] in (0, 8)
        else:
            foreign[key] += 1
            strong["ajena"] += e["step"] in (0, 8)
    print(f"  melodia: {len(mel)} notas: {ct} del acorde ({100 * ct / max(1, len(mel)):.0f}%), "
          f"{sum(seventh.values())} septimas (color), {sum(foreign.values())} ajenas")
    fmt = lambda c: ", ".join(f"c{b}:{n}@{s}x{k}" for (b, n, s), k in sorted(c.items())) or "ninguna"
    print(f"  septimas (compas de la vuelta de 8, nota, semicorchea 0-15, veces): {fmt(seventh)}")
    print(f"  ajenas: {fmt(foreign)}")
    print(f"  en tiempo fuerte (semicorchea 0 u 8): {strong['septima']} septimas, {strong['ajena']} ajenas")
    if strong["ajena"]:
        problems.append("notas ajenas al acorde en tiempo fuerte")

    # ---- barridos de filtro ----
    print("\nBarridos de filtro (primer y ultimo evento de la capa en cada subida):")
    for name, a, z in secs:
        # Strudel guarda lpf como `cutoff` y hpf como `hcutoff`
        for role, label, key in (("ruido", "hpf", "hcutoff"), ("pad", "lpf", "cutoff"), ("arpegio", "lpf", "cutoff")):
            es = sorted((e for e in ev if e["role"] == role and a <= e["bar"] <= z and key in e["value"]), key=lambda e: e["start"])
            if es and abs(es[0]["value"][key] - es[-1]["value"][key]) > 1:
                print(f"  {name:<12} {role:<8} {label}: {es[0]['value'][key]:.0f} -> {es[-1]['value'][key]:.0f} Hz")

    print("\nRESULTADO:", "sin problemas" if not problems else "; ".join(problems))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
