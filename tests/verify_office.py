"""Validate generated OpenXML and PWA PNGs using Python standard library only."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "tests" / "artifacts"
for name in ("planejador.docx", "mecanico.docx", "planejador.xlsx"):
    path = ARTIFACTS / name
    assert path.exists(), f"Missing generated test artifact: {path}"
    with ZipFile(path) as zf:
        assert zf.testzip() is None, f"Corrupt ZIP: {path}"
        members = zf.namelist()
        assert "[Content_Types].xml" in members
        for member in members:
            if member.endswith((".xml", ".rels")) or member == "[Content_Types].xml":
                try:
                    ET.fromstring(zf.read(member))
                except ET.ParseError as error:
                    raise AssertionError(f"{path}: {member} contains malformed XML: {error}") from error
        if name.endswith(".xlsx"):
            assert "xl/worksheets/sheet1.xml" in members
            assert "xl/drawings/drawing1.xml" in members, "Embedded photos absent from Excel"
        else:
            assert "word/document.xml" in members
            assert any(item.startswith("word/media/foto_") for item in members), "Embedded photos absent from DOCX"
        print("Validated Office document:", name, len(members), "ZIP members")

for size in (192, 512):
    file = ROOT / "assets" / f"icon-{size}.png"
    data = file.read_bytes()
    assert data.startswith(b"\x89PNG\r\n\x1a\n"), f"Not PNG: {file}"
    width, height = struct.unpack(">II", data[16:24])
    assert (width, height) == (size, size), f"Unexpected PNG size: {(width, height)}"
    cursor = 8
    compressed = bytearray()
    while cursor < len(data):
        length = struct.unpack(">I", data[cursor:cursor+4])[0]
        typ = data[cursor+4:cursor+8]
        payload = data[cursor+8:cursor+8+length]
        actual_crc = struct.unpack(">I", data[cursor+8+length:cursor+12+length])[0]
        assert zlib.crc32(typ + payload) == actual_crc, f"PNG CRC invalid {file}: {typ}"
        if typ == b"IDAT":
            compressed.extend(payload)
        cursor += 12 + length
        if typ == b"IEND":
            break
    rgba = zlib.decompress(compressed)
    assert len(rgba) == size * (1 + size*3), "Wrong decompressed bitmap"
    print("Validated PWA PNG:", file.name)
