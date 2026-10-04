# Campo Dorado

Tema original de house folk, inspirado en el estilo de Avicii: piano en arpegio, ritmo de pisotón que pasa a bombo a negras, y un drop con un lead que se puede cantar. Re mayor, 126 bpm, 88 compases (2:47). La melodía, el arreglo y los sonidos están escritos desde cero para este repositorio; no usa material de ninguna canción.

## Para escucharlo

- Enlace: [`strudel_link.txt`](strudel_link.txt) (abre strudel.cc con [`campo_dorado.strudel.js`](campo_dorado.strudel.js) ya cargado). O pega el código en strudel.cc y pulsa Ctrl+Enter; Ctrl+. lo detiene.
- Audio: `node tools/render_strudel.mjs campo_dorado/campo_dorado.strudel.js campo_dorado.mp3 --cycles 88 --tail 4` lo toca con el motor de audio de Strudel (necesita Chromium y ffmpeg; ver el README de la raíz).
- Cuéntame qué cambiar: ritmo, mezcla, melodía, duración o timbres.

## Forma

| Sección | Compases | Tiempo | Qué pasa |
|---|---|---|---|
| intro | 1-8 | 0:00-0:15 | piano; pad con filtro que se abre, guitarra y pisotón desde el compás 5 |
| estrofa | 9-24 | 0:15-0:45 | piano y guitarra; desde el 17 pisotón, bajo, pad y melodía suave; desde el 21 palmada y hats |
| subida | 25-32 | 0:45-1:00 | pisotón y luego bombo a negras, redoble que acelera, ruido que sube y relleno de toms |
| drop | 33-48 | 1:00-1:31 | primer drop: bombo, palmada, hats, bajo, pad "bombeado", acordes a contratiempo y la melodía |
| pausa | 49-56 | 1:31-1:46 | sin bombo ni bajo; piano y pad, y la melodía en piano desde el 53 |
| subida2 | 57-64 | 1:46-2:01 | como la primera subida, más acordes cortos y melodía suave |
| drop2 | 65-80 | 2:01-2:32 | segundo drop: melodía doblada una octava arriba, arpegio y percusión extra |
| cierre | 81-88 | 2:32-2:47 | se apagan capas hasta quedar el piano y el pad |

## Música

- **Armonía** (8 compases, un acorde por compás): D · A · Bm · G · D · A · G · A. Es una progresión muy habitual en el género; lo propio es la melodía y el arreglo. Las voces se mueven lo mínimo de un acorde al siguiente.
- **Melodía** (8 compases, 16 semicorcheas por compás): seis notas por compás con el ritmo 3-3-2 / 3-3-2. Sube en arco (la, re, mi, fa# …), la segunda mitad sube hasta el do# agudo en el compás 6 y cierra en el 8 sobre el mi.
- **Sonido**: batería TR-909 (`RolandTR909`), `piano` de Strudel, "guitarra" hecha con sierra filtrada de caída rápida, `supersaw` para pad y lead, `triangle` para la melodía suave y el arpegio. Tres órbitas: batería y bajo sin efectos, piano/pad/acordes con reverb, melodía y arpegio con eco de corchea con puntillo (357 ms) y reverb.
- **Pad "bombeado"**: simula un sidechain bajando el volumen en cada tiempo; no es un sidechain real.

## Verificación (sin oído)

```bash
node tools/strudel_events.mjs campo_dorado/campo_dorado.strudel.js --bars 88 --all > ev.json
python tools/analyze_track.py ev.json \
  --sections "intro:8,estrofa:16,subida:8,drop:16,pausa:8,subida2:8,drop2:16,cierre:8" \
  --roles "red:bombo,orange:palmada,yellow:hat cerrado,white:hat abierto,brown/sd:redoble,brown/rim:perc,brown/ht:relleno,brown/mt:relleno,brown/lt:relleno,pink:crash,blue:bajo,purple:pad,magenta:stab,gold:guitarra,cyan:melodia,green:piano,lime:arpegio,grey:ruido" \
  --scale "D E F# G A B C#"
```

El código evalúa con el motor real (`@strudel/core` 1.2.2): 126 bpm, 88 compases y 4494 eventos. El analizador da "sin problemas":

- 0 notas fuera de Re mayor en todas las capas; la raíz del bajo está siempre en el acorde de su compás.
- Melodía: 276 notas, 222 del acorde (80%), 18 séptimas y 36 notas de paso (9.ª y 6.ª); ninguna ajena al acorde cae en tiempo fuerte (la primera versión tenía 3, que cambié).
- Todos los bombos caen en una negra (pisotón en 1 y 3; a negras en subidas y drops), las palmadas en 2 y 4 y el hat abierto a contratiempo; los barridos de filtro suben dentro de su subida.

Además se renderizó con `tools/render_strudel.mjs` y se midió el audio:

- **Entrada de capas.** Se listó en qué compases suena cada capa y coincide con la tabla de arriba (la primera versión tenía las máscaras `desde()` mal escritas y todas las capas sonaban desde el principio de la sección; ya está corregido: hay que envolver esas cadenas en `mini(...)`).
- **Estructura del audio.** La intro arranca suave y el pad y el pisotón entran en el 5; en la estrofa el volumen se duplica al entrar el bajo y el pad en el 17; los graves (40-110 Hz) desaparecen en la pausa; el volumen sube a lo largo de las subidas, se mantiene parejo en los drops y cae a silencio en el cierre.
- **Equilibrio.** Cada capa se tocó por separado y se midió su volumen: la guitarra y los acordes cortos estaban unos 15 dB por debajo del piano (inaudibles) y el lead unos 10 dB; los subí, y bajé el piano dentro del drop.
- **Pico.** 0,97 en todo el tema (sin recorte; en strudel.cc llegaría igual).

**Lo que NO está verificado:**
- **Cómo suena.** Los volúmenes los ajusté midiendo cada capa, no de oído: no sé si el equilibrio entre piano, guitarra, bajo y lead te gusta, ni si la "guitarra" parece una guitarra.
- Que el enlace abra bien en strudel.cc (no puedo abrirlo desde aquí); sí comprobé que decodifica byte a byte al archivo.
- Que strudel.cc corra una versión compatible con 1.2.2 y cargue `RolandTR909` y `piano` por defecto.
- Rendimiento: pad, acordes y lead suman muchas voces `supersaw`; en un equipo flojo puede entrecortarse. Bajar `unison(3)` a `unison(2)` alivia.
- No pude cotejar la melodía con catálogos de canciones. Si algo te suena a un tema concreto, dímelo y lo cambio.

## Archivos

| Archivo | Qué es |
|---|---|
| `campo_dorado.strudel.js` | El tema |
| `strudel_link.txt` | Enlace a strudel.cc |
