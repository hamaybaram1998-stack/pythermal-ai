#!/usr/bin/env python3
"""Generate simple PWA PNG icons using only Python standard library."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parent

def chunk(kind, payload):
    return struct.pack('!I', len(payload)) + kind + payload + struct.pack('!I', zlib.crc32(kind + payload) & 0xffffffff)

def png(size):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            dx = (x - size * .5) / size
            dy = (y - size * .5) / size
            d = (dx * dx + dy * dy) ** .5
            # Dark rounded-square tile with bright blue / violet thermal lens.
            corner = min(x, y, size - 1 - x, size - 1 - y)
            if corner < size * .04 and ((x < size * .1 and y < size * .1) or (x > size * .9 and y < size * .1) or (x < size * .1 and y > size * .9) or (x > size * .9 and y > size * .9)):
                color = (9, 13, 24, 255)
            elif d < .28:
                glow = max(0, 1 - d / .28)
                color = (int(31 + glow * 76), int(112 + glow * 109), int(183 + glow * 72), 255)
            elif d < .34:
                color = (104, 105, 218, 255)
            else:
                color = (16, 26, 44, 255)
            row.extend(color)
        rows.append(bytes(row))
    raw = b''.join(rows)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    (ROOT / f'icon-{size}.png').write_bytes(data)
    print(f'Created icon-{size}.png')

for size in (192, 512):
    png(size)
