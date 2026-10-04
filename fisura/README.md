# Fisura

Tema original de dubstep, sin piano: Fa menor, 140 bpm en medio tiempo (el bombo cae en el 1 y la caja en el 3), 80 compases (2:17). Está escrito desde cero para este repositorio; no parte de ninguna canción existente.

## Para escucharlo

- Enlace: [`strudel_link.txt`](strudel_link.txt) (abre strudel.cc con [`fisura.strudel.js`](fisura.strudel.js) ya cargado). O pega el código en strudel.cc y pulsa Ctrl+Enter; Ctrl+. lo detiene.
- Audio: `node tools/render_strudel.mjs fisura/fisura.strudel.js fisura.mp3 --cycles 80 --tail 4` lo toca con el motor de audio de Strudel (necesita Chromium y ffmpeg; ver el README de la raíz).
- Cuéntame qué cambiar: el wobble (más lento, más rápido, más sucio), la batería, la mezcla, la melodía o la duración.

## Forma

| Sección | Compases | Tiempo | Qué pasa |
|---|---|---|---|
| intro | 1-16 | 0:00-0:27 | pad con vocales; campanas desde el 3, sub desde el 9, bombo y caja desde el 13 |
| subida | 17-24 | 0:27-0:41 | hats, ruido que sube, redoble que acelera desde el 21 y relleno de toms |
| drop | 25-40 | 0:41-1:08 | primer drop: sub y wobble, bombo en 1, caja y palmada en 3, hats, acordes con vocal |
| pausa | 41-48 | 1:08-1:22 | respiro con pad y campanas; sub y hats desde el 45 |
| subida2 | 49-56 | 1:22-1:36 | como la primera, más glissando de sierra y wobble cerrado desde el 53 |
| drop2 | 57-72 | 1:36-2:03 | segundo drop: se suma el bajo con vocales ("yoi-yoi") y un shaker |
| cierre | 73-80 | 2:03-2:17 | se apagan capas hasta quedar el pad |

## Música

- **Armonía** (8 compases, un acorde por compás): Fm · Fm · Db · Db · Bbm · Bbm · Cm · Cm. El wobble toca solo notas del acorde de cada compás.
- **Wobble**: 64 notas por compás de sierra; cada nota toma el corte del filtro de un seno que da 4 u 8 vueltas por compás (6 en el último: tresillo). El filtro sube y baja a escalones de 1/64 de compás. Por encima: `distort` y huecos (silencios) a medio compás, a negras o a corcheas.
- **Sub**: seno una octava por debajo del wobble, una nota por negra (Fa1 = 43,7 Hz).
- **Bajo con vocales** (drop2): sierra una octava arriba con un filtro de formantes (`a e o i`) que cambia cada semicorchea.
- **Pad y acordes**: `supersaw` con vocales (el pad cambia de vocal cada compás) y acordes cortos a contratiempo con vocal.
- **Campanas FM**: seno con modulación en razón 3,5 (inarmónica) cuyo índice decae como una campana; tocan una melodía de 8 compases (una nota por negra) con eco de corchea con puntillo.
- **Batería TR-808**: bombo en el 1 y un segundo bombo (paso 10 o 13) que alterna cada compás; caja y palmada en el 3; hats a semicorcheas con acento; hat abierto en el paso 14 compás sí, compás no.

## Verificación (sin oído)

```bash
node tools/strudel_events.mjs fisura/fisura.strudel.js --bars 80 --all > ev.json
python tools/analyze_track.py ev.json \
  --sections "intro:16,subida:8,drop:16,pausa:8,subida2:8,drop2:16,cierre:8" \
  --roles "red:kick,orange:snare,brown:clap,yellow:hat,white:hat abierto,silver:shaker,pink:crash,teal:relleno,grey:ruido,slategrey:glissando,blue:bajo,purple:pad,magenta:stab,cyan:melodia" \
  --scale "F G G# A# C C# D# E"
```

El código evalúa con el motor real (`@strudel/core` 1.2.2): 140 bpm, 80 compases y 5016 eventos (5042 al contar los que quedan cortados por una máscara). No usa ningún sonido `piano`.

- **Escala y armonía**: 0 notas fuera de Fa menor en el bajo, el pad, los acordes y la melodía; la raíz del bajo está siempre en el acorde de su compás. El analizador marca el glissando (248 notas fuera de escala) porque es cromático a propósito.
- **Batería**: el bombo cae solo en los pasos 0 y 10/13, la caja y la palmada solo en el paso 8 (el 3), 16 hats por compás y el hat abierto solo en el paso 14. El analizador pensado para house (bombo en cada negra) no aplica; lo comprobé a mano con el volcado de eventos.
- **Entrada de capas**: se listó en qué compases suena cada capa y coincide con la tabla de arriba.
- **El wobble modula de verdad**: se renderizó solo el bajo y se midió el centroide espectral compás a compás. El timbre oscila a 2,5 Hz en los compases de 4 vueltas (esperado 2,33) y a 4,4-5,0 Hz en los de 8 (esperado 4,67), entre unos 250 y 1350 Hz, con la amplitud casi constante.
- **Audio**: se renderizó con `tools/render_strudel.mjs` y se midió por compás: la intro arranca casi en silencio y va subiendo; no hay graves hasta que entra el sub en el 9; la pausa pierde el sub hasta el 45; los drops son los tramos más fuertes y el volumen cae a silencio en el cierre.
- **Equilibrio**: se tocó cada capa por separado y se midió. La primera mezcla tenía los acordes con vocal casi inaudibles y la batería muy por debajo del bajo; subí batería y acordes y bajé sub, wobble y bajo con vocales. El pico del audio es 0,85 (sin recorte).

**Lo que NO está verificado:**
- **Cómo suena.** Sobre todo si el wobble suena a "wub" o a zumbido a escalones (cada escalón dura unos 27 ms), si el bajo con vocales parece una voz, y si el equilibrio entre bajo y batería funciona. Los volúmenes los ajusté midiendo, no de oído.
- **Sub y bombo** pueden taparse: no hay sidechain real (el motor 1.2.2 no tiene `duckorbit`). Y Fa1 (43,7 Hz) apenas se oye en altavoces pequeños o auriculares de móvil.
- Que el enlace abra bien en strudel.cc (no puedo abrirlo desde aquí); sí comprobé que decodifica byte a byte al archivo.
- Que strudel.cc cargue `RolandTR808` por defecto y corra una versión compatible con 1.2.2 (el filtro de vocales y la FM son del mismo motor).
- Rendimiento: el wobble son unas 37 notas por segundo y el bajo con vocales unas 19 más; en un equipo flojo puede entrecortarse. Bajar `segment(64)` a `segment(32)` (y el `fast(...)` de la misma forma) alivia.
- No pude cotejar la melodía con catálogos de canciones. Si algo te suena a un tema concreto, dímelo y lo cambio.

## Archivos

| Archivo | Qué es |
|---|---|
| `fisura.strudel.js` | El tema |
| `strudel_link.txt` | Enlace a strudel.cc |
