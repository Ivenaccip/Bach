// J. S. Bach - Preludio en Do mayor, BWV 846 - trozo 1: compases 1-4
// Fuente: partitura MuseScore del corpus de music21 (bach/bwv846). Ver bwv846/README.md.
setcpm(72/4) // 72 negras/min (Adagio, marcado en la partitura); 1 ciclo = 1 compas de 4/4

// Los acordes de cada compas, 5 notas de grave a agudo (sale de la fuente, no de memoria)
const acordes = note("<[c4,e4,g4,c5,e5] [c4,d4,a4,d5,f5] [b3,d4,g4,d5,f5] [c4,e4,g4,c5,e5]>")

// La figura es la misma en todos los compases y se toca dos veces por compas:
// los numeros eligen la nota del acorde (0 = la mas grave ... 4 = la mas aguda)
$: stack(
  acordes.arp("0 0"),                 // nota 1: sostenida 2 negras
  acordes.arp("[~ 1@7]*2"),           // nota 2: entra 1 semicorchea despues, sostenida 1.75 negras
  acordes.arp("[~ ~ 2 3 4 2 3 4]*2"), // notas 3, 4, 5 y otra vez 3, 4, 5
).sound("piano")

// Ajustes para probar si suena raro:
//   timbre:  .sound("gm_piano")
//   notas cortadas: .release(0.5)
