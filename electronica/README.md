# Horizonte Violeta

Tema original de house melódico para Strudel: La menor, 124 bpm, 72 compases (2:19). Está escrito desde cero para este repositorio; no parte de ninguna canción existente.

## Para escucharlo

- Enlace: [`strudel_link.txt`](strudel_link.txt) (abre strudel.cc con [`horizonte_violeta.strudel.js`](horizonte_violeta.strudel.js) ya cargado). O pega el código en strudel.cc y pulsa Ctrl+Enter; Ctrl+. lo detiene.
- Cuéntame qué cambiar: ritmo, mezcla (qué suena fuerte o tapado), melodía, duración o timbres.
- Si algo distorsiona, la última línea del código trae `all(x => x.postgain(.7))` para bajar el volumen general.

## Forma

| Sección | Compases | Tiempo | Qué pasa |
|---|---|---|---|
| intro | 1-8 | 0:00-0:15 | pad y arpegio con filtro que se abre; bombo y hat abierto desde el compás 5 |
| subida | 9-16 | 0:15-0:30 | bombo, hats, palmada (desde el 13), redoble de caja que acelera (13-16) y ruido que sube |
| estribillo | 17-32 | 0:30-1:01 | primer drop: bombo, palmada, hats, bajo, pad "bombeado", acordes 3-3-2 y la melodía |
| pausa | 33-40 | 1:01-1:17 | sin bombo ni bajo; pad, arpegio y la melodía suave desde el 37 |
| subida2 | 41-48 | 1:17-1:32 | como la primera subida, más los acordes cortos entrando en el 45 |
| estribillo2 | 49-64 | 1:32-2:03 | segundo drop: todo lo anterior, melodía doblada una octava arriba, percusión extra y arpegio |
| cierre | 65-72 | 2:03-2:19 | se apagan capas y el pad se desvanece |

## Música

- **Armonía** (8 compases, 1 acorde por compás): Am · F · C · G · Am · F · Dm · E. Es una progresión muy habitual en el género; lo propio es la melodía y el arreglo. Las notas de cada acorde están elegidas para que cada voz se mueva lo menos posible de un acorde al siguiente.
- **Melodía** (8 compases, 16 semicorcheas por compás): la primera mitad baja y sube dentro de cada acorde; la segunda sube al la5 (compases 5 a 7) y cierra, en el compás 8, con un arpegio ascendente de Mi mayor hasta el si5, que lleva de vuelta al principio. El mi sobre Fa (compás 2) y el sol sobre La menor (compás 5) son séptimas, a propósito.
- **Sonido**: batería TR-909 (`RolandTR909`), bajo en corcheas a contratiempo entre los bombos, `supersaw` para pad, acordes y melodía, `triangle` para el arpegio y la melodía suave. Hay tres órbitas: batería y bajo sin efectos, pad y acordes con reverb, melodía y arpegio con eco de corchea con puntillo y reverb.
- **Pad "bombeado"**: simula un sidechain bajando el volumen en cada tiempo. No es un sidechain real, porque el motor con el que verifiqué (1.2.2) no tiene `duckorbit`; si tu strudel.cc ya lo tiene se puede reemplazar.
- No pude cotejar la melodía con catálogos de canciones. Si algo te suena a un tema concreto, dímelo y lo cambio.

## Verificación (sin oído)

```bash
node tools/strudel_events.mjs electronica/horizonte_violeta.strudel.js --bars 72 --all > ev.json
python tools/analyze_track.py ev.json \
  --sections "intro:8,subida:8,estribillo:16,pausa:8,subida2:8,estribillo2:16,cierre:8" \
  --roles "red:bombo,orange:palmada,yellow:hat cerrado,white:hat abierto,brown/sd:redoble,brown/rim:perc,pink:crash,blue:bajo,purple:pad,magenta:stab,cyan:melodia,green:arpegio,grey:ruido" \
  --scale "A B C D E F G G#"
```

Con el motor real de Strudel (`@strudel/core` 1.2.2) el código evalúa sin errores y da 124 bpm, 72 compases y 4116 eventos. El analizador comprueba:

- Bombo en cada negra (232 golpes), palmada en los tiempos 2 y 4 (80), hat abierto a contratiempo (248) y 16 hats cerrados por compás.
- 0 notas fuera de La menor (con el sol# de Mi mayor permitido), y la raíz del bajo está siempre dentro del acorde de su compás.
- Melodía: 240 notas, 228 del acorde (95%) y 12 séptimas; ninguna nota ajena.
- Los barridos de filtro suben dentro de su sección: ruido 400 → 6897 Hz, pad 600 → 4450 Hz en las subidas.
- Que los sonidos existen: `supersaw`, `sawtooth`, `triangle` y `white` están registrados en el motor de sonido, y `bd cp hh oh rim sd cr` existen en el mapa de muestras `RolandTR909`.
- Que el analizador sirve: con 3 cambios a propósito (palmada fuera de tiempo, bajo en nota ajena, melodía con nota ajena) falla en los tres.

Una decisión de método: la primera versión del analizador solo aceptaba notas de la tríada y marcó las 12 séptimas como error; la regla era demasiado estricta para este género y la cambié para separar séptimas (color) de notas realmente ajenas. Las notas del tema no se tocaron.

**Lo que NO está verificado:**
- **Cómo suena.** Ni la mezcla (los volúmenes son estimados: bombo .9, bajo .7, pad .3, acordes .3, melodía .45), ni si distorsiona, ni si el bajo y el bombo se tapan.
- Que el enlace abra bien en strudel.cc (no puedo abrirlo desde aquí); sí comprobé que decodifica byte a byte al archivo.
- Que strudel.cc cargue por defecto el banco `RolandTR909` y corra una versión compatible con 1.2.2.
- Rendimiento: el pad bombeado y los `supersaw` suman muchas voces; en un equipo flojo puede entrecortarse. Bajar `unison(3)` a `unison(2)` alivia.

## Archivos

| Archivo | Qué es |
|---|---|
| `horizonte_violeta.strudel.js` | El tema |
| `strudel_link.txt` | Enlace a strudel.cc |
