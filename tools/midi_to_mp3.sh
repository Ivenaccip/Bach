#!/usr/bin/env bash
# MIDI -> MP3 con FluidSynth + soundfont General MIDI (piano por defecto).
# Uso: tools/midi_to_mp3.sh entrada.mid salida.mp3 [soundfont.sf2]
# Requiere: fluidsynth, ffmpeg (con libmp3lame) y un soundfont
# (Ubuntu/Debian: apt install fluidsynth fluid-soundfont-gm).
set -euo pipefail

mid="${1:?falta el .mid de entrada}"
mp3="${2:?falta el .mp3 de salida}"
sf2="${3:-/usr/share/sounds/sf2/FluidR3_GM.sf2}"

[ -f "$sf2" ] || { echo "no encuentro el soundfont: $sf2" >&2; exit 1; }

wav="$(mktemp --suffix=.wav)"
trap 'rm -f "$wav"' EXIT

fluidsynth -ni -g 1.0 -r 44100 -F "$wav" "$sf2" "$mid" >/dev/null
# 1.5 s de silencio al final para que la ultima nota no se corte en seco
ffmpeg -y -loglevel error -i "$wav" -af "apad=pad_dur=1.5" -codec:a libmp3lame -q:a 2 "$mp3"
echo "$mp3"
