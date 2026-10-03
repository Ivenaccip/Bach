#!/usr/bin/env python3
"""Genera el enlace de strudel.cc para un archivo de codigo (https://strudel.cc/# + base64 UTF-8).

Uso: python tools/strudel_link.py bwv846/bach.strudel.js [salida.txt]
Comprueba que el enlace decodifica byte a byte al archivo.
"""
import base64
import sys
from pathlib import Path

code = Path(sys.argv[1]).read_bytes()
url = "https://strudel.cc/#" + base64.b64encode(code).decode()
assert base64.b64decode(url.split("#", 1)[1]) == code
if len(sys.argv) > 2:
    Path(sys.argv[2]).write_text(url + "\n")
print(f"{len(code)} bytes de codigo -> enlace de {len(url)} caracteres")
if len(sys.argv) <= 2:
    print(url)
