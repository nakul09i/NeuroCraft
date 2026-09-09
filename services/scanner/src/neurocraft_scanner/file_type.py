"""Content-based file type detection and magic-byte inspection for NeuroCraft."""

import struct
import zipfile
from pathlib import Path

from neurocraft_types import FileTypeEnum, FileTypeInfo

# Magic Byte Constants
PE_MZ_MAGIC = b"MZ"
ELF_MAGIC = b"\x7fELF"
MACHO_MAGIC_32 = b"\xfe\xed\xfa\xce"
MACHO_MAGIC_64 = b"\xfe\xed\xfa\xcf"
MACHO_CIGAM_32 = b"\xce\xfa\xed\xfe"
MACHO_CIGAM_64 = b"\xcf\xfa\xed\xfe"
PDF_MAGIC = b"%PDF-"
ZIP_MAGIC = b"PK\x03\x04"
OLE_OFFICE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff"
GIF_MAGIC_87 = b"GIF87a"
GIF_MAGIC_89 = b"GIF89a"
BMP_MAGIC = b"BM"

# Known executable/archive extensions that map to formats
EXTENSION_MAP: dict[str, FileTypeEnum] = {
    ".exe": FileTypeEnum.PE,
    ".dll": FileTypeEnum.PE,
    ".sys": FileTypeEnum.PE,
    ".scr": FileTypeEnum.PE,
    ".elf": FileTypeEnum.ELF,
    ".so": FileTypeEnum.ELF,
    ".dylib": FileTypeEnum.MACH_O,
    ".pdf": FileTypeEnum.PDF,
    ".zip": FileTypeEnum.ZIP,
    ".apk": FileTypeEnum.APK,
    ".doc": FileTypeEnum.OFFICE,
    ".docx": FileTypeEnum.OFFICE,
    ".xls": FileTypeEnum.OFFICE,
    ".xlsx": FileTypeEnum.OFFICE,
    ".ppt": FileTypeEnum.OFFICE,
    ".pptx": FileTypeEnum.OFFICE,
    ".png": FileTypeEnum.IMAGE,
    ".jpg": FileTypeEnum.IMAGE,
    ".jpeg": FileTypeEnum.IMAGE,
    ".gif": FileTypeEnum.IMAGE,
    ".bmp": FileTypeEnum.IMAGE,
    ".txt": FileTypeEnum.TEXT,
    ".csv": FileTypeEnum.TEXT,
    ".log": FileTypeEnum.TEXT,
    ".json": FileTypeEnum.TEXT,
    ".md": FileTypeEnum.TEXT,
    ".py": FileTypeEnum.TEXT,
    ".sh": FileTypeEnum.TEXT,
    ".ps1": FileTypeEnum.TEXT,
    ".bat": FileTypeEnum.TEXT,
    ".cmd": FileTypeEnum.TEXT,
    ".js": FileTypeEnum.TEXT,
    ".html": FileTypeEnum.TEXT,
    ".xml": FileTypeEnum.TEXT,
    ".yaml": FileTypeEnum.TEXT,
    ".yml": FileTypeEnum.TEXT,
}


def is_text_content(header: bytes) -> bool:
    """Check if header bytes consist solely of printable ASCII or UTF-8 text."""
    if not header:
        return True
    try:
        decoded = header.decode("utf-8")
        # Check that control chars (other than whitespace \r \n \t) are absent
        control_chars = sum(1 for c in decoded if ord(c) < 32 and c not in "\r\n\t")
        return (control_chars / len(decoded)) < 0.02
    except UnicodeDecodeError:
        return False


def is_pe_file(header: bytes, file_path: Path) -> bool:
    """Validate that file has MZ header and a valid PE signature offset."""
    if not header.startswith(PE_MZ_MAGIC):
        return False
    if len(header) < 64:
        return False
    try:
        pe_offset = struct.unpack_from("<I", header, 0x3C)[0]
        if pe_offset < 0 or pe_offset > 1024 * 1024:  # sane offset bounds
            return False
        with open(file_path, "rb") as f:
            f.seek(pe_offset)
            sig = f.read(4)
            return sig == b"PE\x00\x00"
    except Exception:
        return False


def is_apk_or_office_zip(file_path: Path) -> FileTypeEnum | None:
    """Inspect ZIP container entries to determine if it is an APK or Office document."""
    try:
        if not zipfile.is_zipfile(file_path):
            return None
        with zipfile.ZipFile(file_path, "r") as zf:
            namelist = set(zf.namelist())
            # APK check
            if "AndroidManifest.xml" in namelist or "classes.dex" in namelist:
                return FileTypeEnum.APK
            # Office OOXML check
            if "[Content_Types].xml" in namelist:
                for name in namelist:
                    if name.startswith(("word/", "xl/", "ppt/")):
                        return FileTypeEnum.OFFICE
    except Exception:
        pass
    return None


def detect_file_type(file_path: Path, filename: str | None = None) -> FileTypeInfo:
    """
    Detect the normalized file type strictly from file content / magic bytes.
    Does NOT trust file extension or caller-supplied MIME strings.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Read the first 4096 bytes for header inspection
    with open(file_path, "rb") as f:
        header = f.read(4096)

    # 1. Portable Executable (Windows)
    if is_pe_file(header, file_path):
        detected = FileTypeEnum.PE
        mime = "application/vnd.microsoft.portable-executable"
        desc = "Windows Portable Executable (PE32/PE32+)"
        supported = True

    # 2. ELF (Linux/UNIX)
    elif header.startswith(ELF_MAGIC):
        detected = FileTypeEnum.ELF
        mime = "application/x-executable"
        desc = "Executable and Linkable Format (ELF)"
        supported = True

    # 3. Mach-O (macOS/iOS)
    elif header.startswith((MACHO_MAGIC_32, MACHO_MAGIC_64, MACHO_CIGAM_32, MACHO_CIGAM_64)):
        detected = FileTypeEnum.MACH_O
        mime = "application/x-mach-binary"
        desc = "Mach-O Binary"
        supported = False  # Extractor planned for future phase

    # 4. PDF
    elif header.startswith(PDF_MAGIC):
        detected = FileTypeEnum.PDF
        mime = "application/pdf"
        desc = "Portable Document Format (PDF)"
        supported = True

    # 5. OLE Compound Document (Legacy Office)
    elif header.startswith(OLE_OFFICE_MAGIC):
        detected = FileTypeEnum.OFFICE
        mime = "application/x-ole-storage"
        desc = "Microsoft Compound File Binary (OLE/Office)"
        supported = True

    # 6. ZIP / APK / OOXML Office
    elif header.startswith(ZIP_MAGIC):
        zip_subtype = is_apk_or_office_zip(file_path)
        if zip_subtype == FileTypeEnum.APK:
            detected = FileTypeEnum.APK
            mime = "application/vnd.android.package-archive"
            desc = "Android Package Archive (APK)"
            supported = True
        elif zip_subtype == FileTypeEnum.OFFICE:
            detected = FileTypeEnum.OFFICE
            mime = "application/vnd.openxmlformats-officedocument"
            desc = "Microsoft OpenXML Office Document"
            supported = True
        else:
            detected = FileTypeEnum.ZIP
            mime = "application/zip"
            desc = "ZIP Archive Container"
            supported = True

    # 7. Images (PNG, JPEG, GIF, BMP) - fully supported static extraction
    elif header.startswith(PNG_MAGIC):
        detected = FileTypeEnum.IMAGE
        mime = "image/png"
        desc = "PNG Image"
        supported = True
    elif header.startswith(JPEG_MAGIC):
        detected = FileTypeEnum.IMAGE
        mime = "image/jpeg"
        desc = "JPEG Image"
        supported = True
    elif header.startswith((GIF_MAGIC_87, GIF_MAGIC_89)):
        detected = FileTypeEnum.IMAGE
        mime = "image/gif"
        desc = "GIF Image"
        supported = True
    elif header.startswith(BMP_MAGIC):
        detected = FileTypeEnum.IMAGE
        mime = "image/bmp"
        desc = "BMP Image"
        supported = True

    # 8. Plain text / scripts
    elif is_text_content(header):
        detected = FileTypeEnum.TEXT
        mime = "text/plain"
        desc = "Plain Text / Script"
        supported = True

    # 9. Fallback: Unknown
    else:
        detected = FileTypeEnum.UNKNOWN
        mime = "application/octet-stream"
        desc = "Unknown / Unrecognized Binary Format"
        supported = False

    # Extension mismatch check
    mismatch = False
    if filename:
        ext = Path(filename).suffix.lower()
        expected = EXTENSION_MAP.get(ext)
        if expected and expected != detected:
            mismatch = True

    return FileTypeInfo(
        type=detected,
        mime=mime,
        description=desc,
        is_supported=supported,
        extension_mismatch=mismatch,
    )
