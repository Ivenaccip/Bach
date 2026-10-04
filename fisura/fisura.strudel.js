// FISURA - tema original de dubstep
// Fa menor, 140 bpm en medio tiempo (el bombo cae en el 1 y la caja en el 3), 80 compases (~2:17).
// Sin piano: sub de seno, wobble de sierra con filtro que se abre y se cierra, bajo con vocales
// ("yoi-yoi"), campanas FM, pad con formantes y bateria TR-808. Composicion propia: no usa
// material de ninguna cancion.
setcpm(140/4) // 1 ciclo = 1 compas de 4/4

// ---------- armonia: 8 compases que se repiten (Fm Fm Db Db | Bbm Bbm Cm Cm) ----------
const acordes = note("<[f3,ab3,c4] [f3,ab3,c4] [f3,ab3,db4] [f3,ab3,db4] [f3,bb3,db4] [f3,bb3,db4] [g3,c4,eb4] [g3,c4,eb4]>")
const raices  = note("<f1 f1 db2 db2 bb1 bb1 c2 c2>")

// notas del wobble: 4 por compas, siempre del acorde del compas
const notasWub = note(`<
  [f2 f2 f2 f2]
  [f2 f2 f2 ab2]
  [db3 db3 db3 db3]
  [db3 db3 f3 db3]
  [bb2 bb2 bb2 bb2]
  [bb2 bb2 db3 bb2]
  [c3 c3 c3 c3]
  [c3 c3 eb3 g3]
>`)
// huecos del bajo: 1 = suena, 0 = silencio (a medio compas, a negras o a corcheas)
const gate = "<[1 1 1 1] [1 1 1 [1 0]] [1 1 1 1] [1 1 [1 0] 0] [1 1 1 1] [1 1 1 [1 0]] [1 1 1 1] [1 1 0 0]>"

// ---------- melodia de campanas: 8 compases, 16 semicorcheas por compas ----------
const melodia = note(`<
  [c5 ~ ~ ~ f5 ~ ~ ~ ab5 ~ ~ ~ ~ ~ ~ ~]
  [ab5 ~ ~ ~ g5 ~ ~ ~ f5 ~ ~ ~ ~ ~ ~ ~]
  [db5 ~ ~ ~ f5 ~ ~ ~ ab5 ~ ~ ~ ~ ~ ~ ~]
  [ab5 ~ ~ ~ f5 ~ ~ ~ db5 ~ ~ ~ ~ ~ ~ ~]
  [bb4 ~ ~ ~ db5 ~ ~ ~ f5 ~ ~ ~ ~ ~ ~ ~]
  [f5 ~ ~ ~ db5 ~ ~ ~ bb4 ~ ~ ~ ~ ~ ~ ~]
  [g4 ~ ~ ~ c5 ~ ~ ~ eb5 ~ ~ ~ g5 ~ ~ ~]
  [g5 ~ ~ ~ eb5 ~ ~ ~ c5 ~ ~ ~ ~ ~ ~ ~]
>`)

// ---------- capas (cada una lleva un .color que sirve de etiqueta) ----------
// bateria TR-808 en medio tiempo
const kick  = s("<[bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~] [bd ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~]>").bank("RolandTR808").gain(1.2).color("red")
const snare = s("~ ~ sd ~").bank("RolandTR808").gain(.9).color("orange")
const clap  = s("~ ~ cp ~").bank("RolandTR808").gain(.5).color("brown")
const hats  = s("hh*16").bank("RolandTR808").gain("[.28 .15 .38 .15]*4").color("yellow")
const ohat  = s("<[~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ oh ~] ~>").bank("RolandTR808").gain(.4).color("white")
const shaker = s("sh*8").bank("RolandTR808").gain(.2).color("silver")
const crash = s("cr").bank("RolandTR808").gain(.5).color("pink")
const relleno = s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ht ht mt lt").bank("RolandTR808").gain(.5).color("teal")
const redoble = s("sd*<8 8 16 32>").bank("RolandTR808").gain("<.25 .32 .44 .55>").color("teal")

// sub de seno: una nota por negra, sigue la raiz del acorde
const sub = raices.segment(4).s("sine").attack(.01).release(.08).gain(.42).mask(gate).color("blue")

// wobble: 64 notas por compas; el corte del filtro sigue un seno que da 4 u 8 vueltas por compas
// (el compas 8 de cada ciclo da 6: tresillo). Como cada nota toma un valor del seno, el filtro
// sube y baja a escalones de 1/64 de compas.
const wobble = notasWub.segment(64).s("sawtooth")
  .lpf(sine.range(160, 2600).fast("<4 8 4 8 4 8 4 6>")).lpq(4)
  .attack(.002).sustain(1).release(.008).distort(.25)
  .gain(.5).mask(gate).color("blue")
// bajo con vocales ("yoi-yoi"): una octava arriba, el filtro de formantes cambia cada semicorchea
const growl = notasWub.transpose(12).segment(32).s("sawtooth").vowel("[a e o i]*4").lpf(3200)
  .attack(.002).sustain(1).release(.008).distort(.3)
  .gain(.3).mask(gate).color("blue")

// pad con formantes (vocales que cambian cada compas) y acordes cortos con vocal
const pad  = acordes.s("supersaw").unison(3).vowel("<a a o o e e i i>").lpf(1600).attack(.3).release(.6)
               .gain(.3).room(.6).size(4).orbit(2).color("purple")
const stab = acordes.struct("~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~ x ~").s("supersaw").unison(3).vowel("a")
               .lpf(2400).decay(.15).sustain(0).release(.1).gain(1).room(.4).size(3).orbit(2).color("magenta")

// campanas FM: la modulacion en razon 3.5 las hace inarmonicas y el indice decae como una campana
const campana = melodia.s("sine").fmh(3.5).fmi(4).fmdecay(.6).fmsustain(0)
                  .attack(.001).decay(.9).sustain(0).release(.4).gain(.45)
                  .delay(.3).delaytime(.321).delayfeedback(.45).room(.5).size(4).orbit(3).color("cyan")

// subida: ruido que sube, glissando de sierra y redoble
const riser   = s("white*8").hpf(saw.range(400,8000).slow(8)).gain(saw.range(.03,.2).slow(8))
                  .release(.1).color("grey")
const glissando = note(saw.range(36,84).slow(8).segment(32)).s("sawtooth").lpf(saw.range(300,6000).slow(8))
                    .gain(saw.range(.04,.25).slow(8)).attack(.002).release(.02).color("slategrey")

// ---------- mascaras: encender o apagar capas por compas dentro de una seccion ----------
const mitad2 = "<0 0 0 0 1 1 1 1>"   // 8 compases: apagado en 1-4, encendido en 5-8
// (con comillas simples y sin mini() la mascara se ignora y la capa suena siempre; las dobles el REPL
// las lee como mini-notacion y "<" solo no es valida)
const desde  = (n, total = 16) => mini('<' + Array.from({ length: total }, (_, i) => (i >= n ? 1 : 0)).join(' ') + '>')

// ---------- secciones ----------
const intro = stack(
  pad, campana.mask(desde(2)),
  sub.mask(desde(8)),
  kick.mask(desde(12)), snare.mask(desde(12)),
)
const subida = stack(
  pad.lpf(saw.range(500,4000).slow(8)), campana,
  kick, snare, hats,
  redoble.mask(mitad2), riser, relleno.mask("<0 0 0 0 0 0 0 1>"),
)
const drop = stack(
  crash.mask("<1 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0>"),
  kick, snare, clap, hats, ohat,
  sub, wobble, pad.gain(.15), campana.gain(.3), stab,
)
const pausa = stack(
  pad, campana.gain(.55),
  sub.mask(mitad2), hats.mask(mitad2).gain(.1),
)
const subida2 = stack(
  subida, glissando, stab.mask(mitad2),
  wobble.lpf(sine.range(120,700).fast(4)).mask(mitad2).gain(.5),
)
const drop2 = stack(
  drop, growl, shaker,
)
const cierre = stack(
  kick.mask("<1 1 1 1 1 1 0 0>"), snare.mask("<1 1 1 1 1 1 0 0>"), hats.mask("<1 1 1 1 0 0 0 0>"),
  pad.gain("<.3 .27 .24 .21 .18 .15 .12 .09>"), campana.mask("<1 1 1 1 1 1 1 0>"),
)

// ---------- forma: 80 compases ----------
$: arrange(
  [16, intro],    // 1-16    pad; campanas desde el 5, sub desde el 9, bombo y caja desde el 13
  [8, subida],    // 17-24   hats, redoble, ruido que sube y relleno de toms
  [16, drop],     // 25-40   primer drop: sub, wobble, bombo en 1, caja en 3
  [8, pausa],     // 41-48   respiro con pad y campanas
  [8, subida2],   // 49-56   segunda subida, con glissando y wobble cerrado
  [16, drop2],    // 57-72   segundo drop: se suma el bajo con vocales
  [8, cierre],    // 73-80   salida
)
