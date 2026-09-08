"""Unit tests for content-based file type detection and mismatch checking."""

import struct
from pathlib import Path

from neurocraft_scanner.file_type import detect_file_type
from neurocraft_types import FileTypeEnum


def test_detect_plain_text(tmp_path: Path):
    f = tmp_path / "note.txt"
    f.write_text("Hello, this is a plain text file.", encoding="utf-8")

    info = detect_file_type(f, filename="note.txt")
    assert info.type == FileTypeEnum.TEXT
    assert info.is_supported is True
    assert info.extension_mismatch is False


def test_detect_pdf(tmp_path: Path):
    f = tmp_path / "document.pdf"
    f.write_bytes(b"%PDF-1.7\n%raw content here\n%%EOF")

    info = detect_file_type(f, filename="document.pdf")
    assert info.type == FileTypeEnum.PDF
    assert info.is_supported is True
    assert info.extension_mismatch is False


def test_detect_elf(tmp_path: Path):
    f = tmp_path / "sample.elf"
    # Minimal 16-byte ELF ident header
    f.write_bytes(b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 8)

    info = detect_file_type(f, filename="sample.elf")
    assert info.type == FileTypeEnum.ELF
    assert info.is_supported is True


def test_detect_pe_synthetic(tmp_path: Path):
    f = tmp_path / "sample.exe"
    # Synthetic PE: MZ at 0, offset at 0x3C pointing to 0x80, PE\0\0 at 0x80
    header = bytearray(256)
    header[0:2] = b"MZ"
    struct.pack_into("<I", header, 0x3C, 0x80)
    header[0x80:0x84] = b"PE\x00\x00"
    f.write_bytes(header)

    info = detect_file_type(f, filename="sample.exe")
    assert info.type == FileTypeEnum.PE
    assert info.is_supported is True
    assert info.extension_mismatch is False


def test_extension_content_mismatch(tmp_path: Path):
    # A PE executable named invoice.pdf
    f = tmp_path / "invoice.pdf"
    header = bytearray(256)
    header[0:2] = b"MZ"
    struct.pack_into("<I", header, 0x3C, 0x80)
    header[0x80:0x84] = b"PE\x00\x00"
    f.write_bytes(header)

    info = detect_file_type(f, filename="invoice.pdf")
    assert info.type == FileTypeEnum.PE
    assert info.extension_mismatch is True


def test_unknown_file_type(tmp_path: Path):
    f = tmp_path / "random.dat"
    f.write_bytes(b"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\xaa\xbb\xcc\xdd\xee\xff")

    info = detect_file_type(f, filename="random.dat")
    assert info.type == FileTypeEnum.UNKNOWN
    assert info.is_supported is False
