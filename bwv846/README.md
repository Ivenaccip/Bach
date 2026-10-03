# BWV 846, Preludio en Do mayor → Strudel

**Estado: trozo 1 (compases 1-4) listo para escuchar.** La pieza completa (34 compases) está limpia en MIDI, pero todavía no se convirtió a Strudel: primero escuchas y dices qué corregir.

## Para probar

- Enlace: [`strudel_link.txt`](strudel_link.txt) (abre strudel.cc con `bach.strudel.js` ya cargado). También puedes pegar el contenido de [`bach.strudel.js`](bach.strudel.js) en strudel.cc y pulsar Ctrl+Enter.
- Qué decirme tras escuchar: tempo (ahora 72 negras/min), notas raras, timbre.
- Dos ajustes rápidos están comentados al final del código: `.sound("gm_piano")` (otro piano) y `.release(0.5)` (si las notas suenan cortadas). No sé cuál suena mejor: no puedo oír.
- Dura 4 compases y se repite en bucle.

## Archivos

| Archivo | Qué es |
|---|---|
| `bach_clean.mid` | Pieza completa limpia: 535 notas, 34 compases, 2 pistas (mano derecha / izquierda), 72 bpm |
| `chunks/c01_compases_01-04.mid` | Compases 1-4 (64 notas), la entrada de las tres herramientas |
| `bach_raw.strudel.js` | Salida cruda de beejsbj/midi-strudel para los compases 1-4 |
| `raw/c01.emanuel.strudel.js` | Salida cruda de MIDI-To-Strudel (Emanuel de Jong), para comparar |
| `bach.strudel.js` | Versión refactorizada (acordes + arpegio) |
| `source.mid` | Exportación directa de la partitura, sin limpiar |

## Fuente y licencias

| Pieza | Origen | Licencia |
|---|---|---|
| Composición | J. S. Bach (1685-1750) | Dominio público |
| Codificación (partitura → notas) | Corpus de music21 (`bach/bwv846`), archivo MuseScore 1.3 de `musescore.com/score/117279`, fechado 2013-07-09 | **No verificada.** El archivo no trae campo de derechos. El corpus de music21 dice que las codificaciones "pueden tener restricciones" (por ejemplo de uso comercial) y remite a la licencia de cada obra |
| Grabación (ruta de audio) | Candidata: Kimiko Ishizaka, *Open Well-Tempered Clavier* | **No usada ni verificada**: archive.org y Musopen están bloqueados en este entorno |

Consecuencia práctica: para uso personal en strudel.cc no veo problema, pero antes de publicar o usar comercialmente conviene rehacer el MIDI desde una partitura con licencia clara (Mutopia o IMSLP) y comparar con esta. Mutopia tampoco es alcanzable desde este entorno, así que no pude hacerlo yo.

## Qué herramienta funcionó mejor

Las tres recibieron los mismos 4 compases. La web app y el script de Emanuel dan texto idéntico, así que se evaluaron con el motor real de Strudel dos salidas distintas (ver "Verificación"):

| Herramienta | Resultado en compases 1-4 | Notas |
|---|---|---|
| Web app MIDI-To-Strudel | Altura e inicio 64/64; **duración 48/64** | La versión alojada está bloqueada. Corrí en local la misma `index.html` + `main.js` en Chromium headless; solo sustituí las dos peticiones a CDN (Tailwind, que es solo estilo, y `@tonejs/midi`, la misma librería instalada con npm). Salida idéntica al script Python |
| `beejsbj/midi-strudel` (CLI) | **64/64 con duraciones** | La más fiel, pero larga: 39 líneas de código y las líneas no coinciden con los compases. Su `--format url` da el enlace |
| `Midi-to-Strudel.py` (`-b 4 -n 16`) | Altura e inicio 64/64; **duración 48/64** | La más compacta (9 líneas) y fácil de leer por compás. Las 16 notas graves quedan como semicorcheas (0,25 negras) en vez de sostenidas (2 y 1,75 negras), porque cada pista es monofónica |

Elegí beejsbj como crudo (`bach_raw.strudel.js`) por ser la única sin pérdidas.

## Lo que se detectó y se ajustó

- **Tempo.** Viene en la partitura: Adagio = 72 negras/min. Al final hay un ritardando (compás 33: 66 → 48 → 30). `bach_clean.mid` y el código usan un solo tempo (72), así que ese ritardando se pierde. No afecta a los compases 1-4.
- **La figura.** `tools/detect_figure.py` comprueba contra los datos que cada medio compás es: nota grave 1 sostenida 8 semicorcheas, nota grave 2 entrando una semicorchea después y sostenida 7, y tres agudas `a b c a b c`. **La cumplen 31 de los 34 compases**; los compases 32, 33 y 34 (el final) no, y habrá que tratarlos aparte. De ahí sale el refactor: un acorde de 5 notas por compás y tres capas `.arp` con los índices de la figura.
- **Solapes.** En el MIDI hay 2 notas de la misma altura solapadas (compases 32 y 33); `clean_midi.py` recorta la primera donde empieza la segunda. Fuera de los compases 1-4.
- **Compases.** La codificación tiene 34. No pude cotejarla con otra edición (sin acceso a IMSLP/Mutopia).
- **Tamaño.** Para 4 compases, el refactor tiene 7 líneas de código (sin comentarios ni vacías) frente a 39 del crudo de beejsbj y 9 del de Emanuel. Cada compás nuevo suma un acorde de ~20 caracteres; en el crudo suma varias líneas.

## Verificación (sin oído)

`tools/verify_strudel.py` evalúa el código con el motor real de Strudel (`@strudel/core` 1.2.2, con el mismo transpilador del REPL, incluido `$:`) y lo compara con el MIDI:

```
python tools/verify_strudel.py bwv846/bach.strudel.js bwv846/chunks/c01_compases_01-04.mid --bars 4 --strict
  tempo:    codigo 72.000 bpm | MIDI 72.000 bpm | OK
  compases: codigo 4 consultados | MIDI 4
  notas:    codigo 64 | MIDI 64
  altura+inicio: 64/64 coinciden
  + duracion:    64/64 coinciden
  veredicto: identico
```

Los tres archivos Strudel dan 72 bpm, 4 compases y 64 notas. Sobre una copia del código con 2 notas cambiadas (una en el compás 1 y otra en el 4) el verificador sí falla (62/64).

**Lo que NO está verificado:**
- Cómo suena. Lo único comprobado es qué notas, cuándo y cuánto duran.
- Que el enlace abra bien en strudel.cc: no puedo abrirlo desde aquí. Sí comprobé que decodifica byte a byte a `bach.strudel.js`, que usa el mismo formato (`#` + base64) que beejsbj y que el código es solo ASCII.
- Que strudel.cc corra la misma versión del motor (1.2.2) que usé yo, ni que el sonido `piano` cargue.
- La ruta audio → MIDI con una grabación real. Solo probé la estimación de tempo con audio sintético de los primeros 16 compases a 72 bpm, y librosa devolvió **143,6 bpm**, el doble. Si se usa `--audio`, hay que revisar el tempo de oído y repetir con `--bpm`. basic-pitch no se instaló porque no había grabación que transcribir.
- Invención nº 1 (BWV 772): no está en el corpus offline y no hay otra fuente alcanzable.

## Siguiente

1. Pega, escucha y dime qué corregir (tempo, notas, timbre).
2. Con tu respuesta, convierto los compases 5-8 y siguientes en trozos de 4 y añado `arrange([...])` para la forma. Los compases 32-34 irán aparte porque no siguen la figura.
