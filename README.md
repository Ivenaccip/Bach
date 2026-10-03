# Bach → Strudel

Flujo "pieza ya hecha → analizar → código Strudel" (strudel.cc), probado con Bach por ser dominio público. Resultados por pieza en su carpeta; empieza por [`bwv846/README.md`](bwv846/README.md).

## Reproducir

```bash
python3 -m venv venv && . venv/bin/activate && pip install -r requirements.txt
(cd tools && npm install)        # motor de Strudel (versiones fijadas) para el verificador

python tools/score_to_midi.py bach/bwv846 bwv846/source.mid
python tools/clean_midi.py bwv846/source.mid bwv846/bach_clean.mid --names "mano derecha,mano izquierda"
python tools/clean_midi.py bwv846/bach_clean.mid bwv846/chunks/c01_compases_01-04.mid --bars 1-4
python tools/detect_figure.py bwv846/bach_clean.mid
python tools/verify_strudel.py bwv846/bach.strudel.js bwv846/chunks/c01_compases_01-04.mid --bars 4 --strict
python tools/test_clean_midi.py
```

## Herramientas (`tools/`)

| Script | Para qué |
|---|---|
| `score_to_midi.py` | Partitura (corpus de music21 o MusicXML) → MIDI; imprime la procedencia para anotar la licencia |
| `clean_midi.py` | Rejilla de 16avos, borra notas cortas/débiles, une re-ataques de audio, recorta compases (`--bars`). Con `--audio` estima el tempo con librosa (suele dar el doble o la mitad: revisar) |
| `detect_figure.py` | Comprueba qué compases siguen la figura de acorde arpegiado y saca sus acordes |
| `strudel_events.mjs` | Evalúa código Strudel con el motor real y vuelca los eventos |
| `verify_strudel.py` | Compara código Strudel contra un MIDI: tempo, compases, notas, duraciones |
| `run_web_app.cjs` | Corre la web app de MIDI-To-Strudel en local (Chromium headless) cuando la alojada no es alcanzable |

Las conversiones MIDI → Strudel las hacen [`beejsbj/midi-strudel`](https://github.com/beejsbj/midi-strudel) (su repositorio no incluye archivo de licencia) y [`Emanuel-de-Jong/MIDI-To-Strudel`](https://github.com/Emanuel-de-Jong/MIDI-To-Strudel) (GPL-3.0). Se clonan aparte; no hay código suyo en este repositorio.
