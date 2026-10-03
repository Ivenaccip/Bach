// HORIZONTE VIOLETA - tema original de house melodico
// La menor, 124 bpm, 72 compases (~2:19). Composicion propia: no usa material de ninguna cancion.
setcpm(124/4) // 1 ciclo = 1 compas de 4/4

// ---------- armonia: 8 compases que se repiten (Am F C G | Am F Dm E) ----------
const acordes = note("<[e4,a4,c5] [f4,a4,c5] [e4,g4,c5] [d4,g4,b4] [e4,a4,c5] [f4,a4,c5] [d4,f4,a4] [e4,g#4,b4]>")
const raices  = note("<a2 f2 c3 g2 a2 f2 d2 e2>")

// ---------- melodia: 8 compases, 16 semicorcheas por compas ----------
const melodia = note(`<
  [e5 ~ ~ ~ c5 ~ ~ ~ a4 ~ c5 ~ e5 ~ ~ ~]
  [f5 ~ ~ ~ e5 ~ c5 ~ a4 ~ ~ ~ c5 ~ ~ ~]
  [g5 ~ ~ e5 ~ ~ c5 ~ e5 ~ g5 ~ ~ ~ ~ ~]
  [d5 ~ ~ ~ b4 ~ ~ ~ g4 ~ b4 ~ d5 ~ ~ ~]
  [e5 ~ ~ ~ a5 ~ ~ ~ g5 ~ e5 ~ c5 ~ ~ ~]
  [a5 ~ ~ ~ f5 ~ ~ c5 ~ ~ a4 ~ c5 ~ ~ ~]
  [d5 ~ f5 ~ a5 ~ ~ ~ f5 ~ d5 ~ ~ ~ ~ ~]
  [g#4 ~ b4 ~ e5 ~ g#5 ~ ~ ~ ~ ~ b5 ~ ~ ~]
>`)

// ---------- capas (cada una lleva un .color que sirve de etiqueta) ----------
// bateria TR-909
const bombo    = s("bd*4").bank("RolandTR909").gain(.9).color("red")
const palmada  = s("~ cp ~ cp").bank("RolandTR909").gain(.6).color("orange")
const hatCerr  = s("hh*16").bank("RolandTR909").gain("[.22 .12 .3 .12]*4").color("yellow")
const hatAbier = s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(.28).color("white")
const perc     = s("~ ~ rim ~ ~ rim ~ ~").bank("RolandTR909").gain(.25).color("brown")
const crash    = s("cr").bank("RolandTR909").gain(.5).color("pink")

// bajo: corcheas a contratiempo, entre los bombos
const bajo = raices.struct("~ x ~ x ~ x ~ x").s("sawtooth").lpf(450).release(.1).gain(.7).color("blue")

// pad largo y pad "bombeado" (volumen que cae con cada bombo, como un sidechain)
const padLargo  = acordes.s("supersaw").unison(3).lpf(1400).release(.4).gain(.3)
                    .room(.4).size(3).orbit(2).color("purple")
const padBombeo = acordes.struct("x*8").s("supersaw").unison(3).lpf(1800).release(.06)
                    .gain("[.1 .38]*4").room(.4).size(3).orbit(2).color("purple")
// acordes cortos a ritmo 3-3-2
const stab = acordes.struct("x ~ ~ x ~ ~ x ~").s("supersaw").unison(3).lpf(3200)
               .decay(.18).sustain(0).release(.08).gain(.3).room(.4).size(3).orbit(2).color("magenta")

// melodia principal y arpegio de semicorcheas
const lead = melodia.s("supersaw").unison(3).lpf(4500).attack(.004).decay(.22).sustain(.25).release(.3).clip(2.5)
               .gain(.45).delay(.3).delaytime(.363).delayfeedback(.4).room(.25).size(3).orbit(3).color("cyan")
const leadSuave = melodia.s("triangle").attack(.02).release(.5).clip(3)
               .gain(.4).delay(.3).delaytime(.363).delayfeedback(.4).room(.25).size(3).orbit(3).color("cyan")
const leadAlto = lead.transpose(12).gain(.2)
const arp16 = acordes.arp("[0 1 2 1]*4").s("triangle").lpf(2600).decay(.12).sustain(0).release(.05)
                .gain(.28).delay(.3).delaytime(.363).delayfeedback(.4).room(.25).size(3).orbit(3).color("green")

// subida: redoble de caja que acelera + ruido que sube
const redoble = s("sd*<8 8 16 32>").bank("RolandTR909").gain("<.5 .6 .8 1>").color("brown")
const riser   = s("white*8").hpf(saw.range(400,7000).slow(8)).gain(saw.range(.04,.35).slow(8))
                  .release(.1).color("grey")

// ---------- secciones (8 compases = 1 vuelta de la armonia) ----------
const mitad2 = "<0 0 0 0 1 1 1 1>" // apagado en los compases 1-4, encendido en 5-8

const intro = stack(
  padLargo.lpf(saw.range(500,1600).slow(8)),
  arp16.lpf(saw.range(600,3200).slow(8)),
  hatAbier.mask(mitad2),
  bombo.mask(mitad2),
)
const subida = stack(
  padLargo.lpf(saw.range(600,5000).slow(8)),
  arp16.lpf(saw.range(1500,6000).slow(8)),
  bombo, hatCerr, hatAbier,
  palmada.mask(mitad2), redoble.mask(mitad2), riser,
)
const estribillo = stack(
  bombo, palmada, hatCerr, hatAbier, crash.mask("<1 0 0 0 0 0 0 0>"),
  bajo, padBombeo, stab, lead,
)
const pausa = stack(
  padLargo, arp16.postgain(.8),
  leadSuave.mask(mitad2), hatAbier.postgain(.6).mask(mitad2),
)
const subida2 = stack(
  subida,
  stab.lpf(saw.range(800,4000).slow(8)).postgain(.8).mask(mitad2),
)
const estribillo2 = stack(
  estribillo, leadAlto, perc, arp16.postgain(.7),
)
const cierre = stack(
  bombo.mask("<1 1 1 1 1 1 0 0>"), hatCerr.mask("<1 1 1 1 0 0 0 0>"),
  hatAbier.mask("<1 1 1 1 1 1 0 0>"), arp16.mask("<1 1 1 1 0 0 0 0>"),
  padLargo.postgain("<1 .9 .8 .65 .5 .35 .2 .1>"),
)

// ---------- forma: 72 compases ----------
$: arrange(
  [8, intro],        // 1-8     pad y arpegio; bombo desde el compas 5
  [8, subida],       // 9-16    bombo, hats, redoble y ruido que sube
  [16, estribillo],  // 17-32   primer drop
  [8, pausa],        // 33-40   respiro sin bombo
  [8, subida2],      // 41-48   segunda subida
  [16, estribillo2], // 49-64   segundo drop, con melodia doblada
  [8, cierre],       // 65-72   salida
)

// Si algo distorsiona: all(x => x.postgain(.7))
