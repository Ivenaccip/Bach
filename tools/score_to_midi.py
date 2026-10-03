#!/usr/bin/env python3
"""Exporta una partitura (clave del corpus de music21 o archivo MusicXML) a MIDI.

Uso:
    python tools/score_to_midi.py bach/bwv846 bwv846/source.mid

Imprime la procedencia de la codificacion (software, fuente) para anotar la
licencia: la licencia de la composicion no es la de la codificacion.
"""
import argparse
import re
import sys
import zipfile
from pathlib import Path

from music21 import converter, corpus


def provenance(path: Path) -> dict:
    """Lee <software>, <source> y <rights> del MusicXML (si el archivo los trae)."""
    if path.suffix == ".mxl":
        with zipfile.ZipFile(path) as z:
            name = next(n for n in z.namelist() if n.endswith(".xml") and not n.startswith("META-INF"))
            xml = z.read(name).decode("utf-8", "replace")
    else:
        xml = path.read_text("utf-8", "replace")
    pick = lambda tag: re.findall(rf"<{tag}[^>]*>([^<]*)</{tag}>", xml)
    return {"software": pick("software"), "source": pick("source"), "rights": pick("rights"), "encoding_date": pick("encoding-date")}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("score", help="clave del corpus de music21 (p. ej. bach/bwv846) o ruta a .xml/.mxl/.musicxml")
    ap.add_argument("out", help="MIDI de salida")
    args = ap.parse_args()

    path = Path(args.score)
    if path.exists():
        src = path
    else:
        found = corpus.getWork(args.score)
        if not found:
            print(f"no encuentro {args.score!r} en el corpus de music21", file=sys.stderr)
            return 1
        src = Path(found)

    score = converter.parse(src)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    score.write("midi", fp=args.out)
    print(f"fuente: {src}")
    print(f"procedencia: {provenance(src)}")
    print(f"escrito: {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
