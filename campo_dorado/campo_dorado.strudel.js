// CAMPO DORADO - tema original de house folk
// Re mayor, 126 bpm, 88 compases (~2:48). Inspirado en el estilo de Avicii: piano en arpegio,
// ritmo de pisoton que pasa a bombo a negras, drop con un lead que se canta. Composicion propia:
// la melodia, el arreglo y los sonidos son nuevos; no usa material de ninguna cancion.
setcpm(126/4) // 1 ciclo = 1 compas de 4/4

// ---------- armonia: 8 compases que se repiten (D A Bm G | D A G A) ----------
const acordes = note("<[d4,f#4,a4] [c#4,e4,a4] [d4,f#4,b4] [d4,g4,b4] [d4,f#4,a4] [c#4,e4,a4] [d4,g4,b4] [c#4,e4,a4]>")
const raices  = note("<d3 a2 b2 g2 d3 a2 g2 a2>")

// ---------- melodia: 8 compases, 16 semicorcheas por compas, ritmo 3-3-2 ----------
const melodia = note(`<
  [a4 ~ ~ d5 ~ ~ e5 ~ f#5 ~ ~ e5 ~ ~ d5 ~]
  [e5 ~ ~ a5 ~ ~ e5 ~ c#5 ~ ~ b4 ~ ~ a4 ~]
  [d5 ~ ~ f#5 ~ ~ b5 ~ a5 ~ ~ f#5 ~ ~ d5 ~]
  [b4 ~ ~ d5 ~ ~ g5 ~ f#5 ~ ~ e5 ~ ~ d5 ~]
  [a4 ~ ~ d5 ~ ~ f#5 ~ a5 ~ ~ f#5 ~ ~ d5 ~]
  [e5 ~ ~ a5 ~ ~ b5 ~ c#6 ~ ~ a5 ~ ~ e5 ~]
  [d5 ~ ~ g5 ~ ~ a5 ~ b5 ~ ~ g5 ~ ~ f#5 ~]
  [e5 ~ ~ c#5 ~ ~ a4 ~ e5 ~ ~ ~ ~ ~ ~ ~]
>`)

// ---------- capas (cada una lleva un .color que sirve de etiqueta) ----------
// bateria TR-909: pisoton (bombo en 1 y 3) y bombo a negras
const stomp    = s("bd ~ bd ~").bank("RolandTR909").gain(.42).color("red")
const bombo    = s("bd*4").bank("RolandTR909").gain(.44).color("red")
const palmada  = s("~ cp ~ cp").bank("RolandTR909").gain(.29).color("orange")
const hatCerr8 = s("hh*8").bank("RolandTR909").gain(.12).color("yellow")
const hatCerr  = s("hh*16").bank("RolandTR909").gain("[.12 .07 .17 .07]*4").color("yellow")
const hatAbier = s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(.16).color("white")
const perc     = s("~ ~ rim ~ ~ rim ~ ~").bank("RolandTR909").gain(.14).color("brown")
const crash    = s("cr").bank("RolandTR909").gain(.3).color("pink")
const relleno  = s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ht ht mt lt").bank("RolandTR909").gain(.3).color("brown")

// bajo: largo en la estrofa, a contratiempo entre los bombos en el drop
const bajoLargo = raices.s("sawtooth").lpf(260).release(.25).gain(.25).color("blue")
const bajo      = raices.struct("~ x ~ x ~ x ~ x").s("sawtooth").lpf(450).release(.1).gain(.4).color("blue")

// piano: arpegio de corcheas y la melodia
const pianoArp = acordes.arp("[0 1 2 1]*2").s("piano").gain(.5).room(.3).size(3).orbit(2).color("green")
const pianoMel = melodia.s("piano").clip(1.5).gain(.5).room(.3).size(3).orbit(2).color("green")

// "guitarra" de pisoton (sierra con filtro y caida rapida) y acordes cortos a contratiempo
const strum = acordes.struct("x ~ x x ~ x x ~").s("sawtooth").lpf(2200).decay(.18).sustain(0).release(.1)
                .gain(.15).room(.25).size(2).orbit(2).color("gold")
const stab  = acordes.struct("[~ x]*4").s("sawtooth").lpf(2800).decay(.12).sustain(0).release(.06)
                .gain(.17).room(.25).size(2).orbit(2).color("magenta")

// pad largo y pad "bombeado" (volumen que cae con cada bombo, como un sidechain)
const padLargo  = acordes.s("supersaw").unison(3).lpf(1400).release(.4).gain(.17)
                    .room(.4).size(3).orbit(2).color("purple")
const padBombeo = acordes.struct("x*8").s("supersaw").unison(3).lpf(1800).release(.06)
                    .gain("[.06 .21]*4").room(.4).size(3).orbit(2).color("purple")

// melodia principal (drop), suave (estrofa), octava arriba y arpegio de pluck
const lead = melodia.s("supersaw").unison(3).lpf(4200).attack(.003).decay(.2).sustain(.3).release(.25).clip(1.6)
               .gain(.25).delay(.3).delaytime(.357).delayfeedback(.4).room(.25).size(3).orbit(3).color("cyan")
const leadSuave = melodia.s("triangle").attack(.02).release(.5).clip(3)
               .gain(.22).delay(.3).delaytime(.357).delayfeedback(.4).room(.25).size(3).orbit(3).color("cyan")
const leadAlto = lead.transpose(12).gain(.11)
const arpPluck = acordes.arp("[0 1 2 1]*4").s("triangle").lpf(2600).decay(.12).sustain(0).release(.05)
                   .gain(.15).delay(.3).delaytime(.357).delayfeedback(.4).room(.25).size(3).orbit(3).color("lime")

// subida: redoble de caja que acelera + ruido que sube
const redoble = s("sd*<8 8 16 32>").bank("RolandTR909").gain("<.2 .24 .32 .38>").color("brown")
const riser   = s("white*8").hpf(saw.range(400,7000).slow(8)).gain(saw.range(.02,.13).slow(8))
                  .release(.1).color("grey")

// ---------- mascaras: encender o apagar capas por compas dentro de una seccion ----------
const mitad2 = "<0 0 0 0 1 1 1 1>"   // 8 compases: apagado en 1-4, encendido en 5-8
const mitad1 = "<1 1 1 1 0 0 0 0>"
// (comillas simples: las dobles el REPL las lee como mini-notacion y "<" solo no es valida)
const desde  = (n, total = 16) => '<' + Array.from({ length: total }, (_, i) => (i >= n ? 1 : 0)).join(' ') + '>'

// ---------- secciones ----------
const intro = stack(
  pianoArp,
  padLargo.lpf(saw.range(500,1600).slow(8)).mask(mitad2),
  strum.mask(mitad2),
  stomp.mask(mitad2),
)
const estrofa = stack(
  pianoArp,
  strum.mask(desde(4)),
  padLargo.mask(desde(8)), bajoLargo.mask(desde(8)), stomp.mask(desde(8)),
  leadSuave.mask(desde(8)),
  hatCerr8.mask(desde(12)), palmada.mask(desde(12)),
)
const subida = stack(
  pianoArp, padLargo.lpf(saw.range(600,5000).slow(8)),
  stomp.mask(mitad1), bombo.gain(.36).mask(mitad2), hatCerr8,
  palmada.gain(.25).mask(mitad2), redoble.mask(mitad2), riser, relleno.gain(.25).mask("<0 0 0 0 0 0 0 1>"),
)
const drop = stack(
  bombo, palmada, hatCerr, hatAbier, crash.mask("<1 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0>"),
  bajo, padBombeo, stab, lead, pianoArp,
)
const pausa = stack(
  pianoArp, padLargo,
  pianoMel.mask(mitad2), hatAbier.mask("<0 0 0 0 0 0 1 1>"),
)
const subida2 = stack(
  subida,
  stab.lpf(saw.range(800,4000).slow(8)).mask(mitad2),
  leadSuave.mask(mitad2),
)
const drop2 = stack(
  drop, leadAlto, arpPluck, perc,
)
const cierre = stack(
  pianoArp.mask("<1 1 1 1 1 1 1 0>"),
  stomp.mask("<1 1 1 1 1 1 0 0>"),
  strum.mask("<1 1 1 1 0 0 0 0>"),
  padLargo.gain("<.17 .15 .13 .11 .09 .07 .05 .03>"),
)

// ---------- forma: 88 compases ----------
$: arrange(
  [8, intro],     // 1-8     piano; pisoton y pad desde el compas 5
  [16, estrofa],  // 9-24    piano, guitarra, pisoton, melodia suave, palmada y hats
  [8, subida],    // 25-32   bombo a negras, redoble y ruido que sube
  [16, drop],     // 33-48   primer drop
  [8, pausa],     // 49-56   respiro: piano y pad, melodia en piano desde el 53
  [8, subida2],   // 57-64   segunda subida
  [16, drop2],    // 65-80   segundo drop, melodia doblada una octava arriba
  [8, cierre],    // 81-88   salida
)
