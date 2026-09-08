"""Safe static ELF (Executable and Linkable Format) analysis extractor."""

import struct
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum

ELF_MACHINE_MAP = {
    0x03: "x86 (32-bit)",
    0x3E: "x86_64 (64-bit)",
    0x28: "ARM",
    0xB7: "AArch64 (ARM64)",
    0x08: "MIPS",
    0xF3: "RISC-V",
}


def extract_elf_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely parse ELF header and program segments without executing code.
    """
    findings: list[Finding] = []
    features: dict[str, Any] = {}

    try:
        with open(file_path, "rb") as f:
            ident = f.read(16)
            if not ident.startswith(b"\x7fELF"):
                return {"error": "Not a valid ELF file"}, findings

            ei_class = ident[4]  # 1 = 32-bit, 2 = 64-bit
            ei_data = ident[5]  # 1 = LSB (little endian), 2 = MSB (big endian)
            is_64 = ei_class == 2
            endian = "<" if ei_data == 1 else ">"

            # Read ELF header remainder
            header_fmt = f"{endian}HHIQQQIHHHHHH" if is_64 else f"{endian}HHIIIIIHHHHHH"
            header_size = struct.calcsize(header_fmt)
            header_data = f.read(header_size)

            if len(header_data) < header_size:
                raise ValueError("Truncated ELF header")

            fields = struct.unpack(header_fmt, header_data)
            e_type = fields[0]  # 2 = ET_EXEC, 3 = ET_DYN (shared object / PIE)
            e_machine = fields[1]
            e_entry = fields[3]
            e_phoff = fields[4]  # Program header offset
            _ = fields[8]        # e_phentsize
            e_phnum = fields[9]  # Number of program headers

            features["bit_class"] = "64-bit" if is_64 else "32-bit"
            features["endianness"] = "little" if ei_data == 1 else "big"
            features["machine"] = ELF_MACHINE_MAP.get(e_machine, f"Unknown (0x{e_machine:04X})")
            features["entry_point"] = hex(e_entry)
            features["is_pie_or_shared"] = e_type == 3
            features["program_header_count"] = e_phnum

            # Inspect Program Headers for RWX (Executable and Writable) segments
            has_rwx_segment = False
            rwx_segments: list[dict[str, Any]] = []

            if e_phoff > 0 and e_phnum > 0 and e_phnum < 1000:
                f.seek(e_phoff)
                for i in range(e_phnum):
                    if is_64:
                        ph_data = f.read(56)
                        if len(ph_data) < 56:
                            break
                        # Elf64_Phdr: p_type (I), p_flags (I), p_offset (Q), p_vaddr (Q), p_paddr (Q), p_filesz (Q), p_memsz (Q), p_align (Q)
                        p_type, p_flags, p_offset, p_vaddr, _, p_filesz, p_memsz, _ = struct.unpack(
                            f"{endian}IIQQQQQQ", ph_data
                        )
                    else:
                        ph_data = f.read(32)
                        if len(ph_data) < 32:
                            break
                        # Elf32_Phdr: p_type (I), p_offset (I), p_vaddr (I), p_paddr (I), p_filesz (I), p_memsz (I), p_flags (I), p_align (I)
                        p_type, p_offset, p_vaddr, _, p_filesz, p_memsz, p_flags, _ = struct.unpack(
                            f"{endian}IIIIIIII", ph_data
                        )

                    # PF_X = 1, PF_W = 2, PF_R = 4
                    is_write = bool(p_flags & 2)
                    is_exec = bool(p_flags & 1)

                    if p_type == 1 and is_write and is_exec:  # PT_LOAD with RWX
                        has_rwx_segment = True
                        rwx_segments.append(
                            {
                                "index": i,
                                "offset": p_offset,
                                "vaddr": hex(p_vaddr),
                                "filesz": p_filesz,
                            }
                        )

            features["has_rwx_segment"] = has_rwx_segment

            # Findings
            if has_rwx_segment:
                findings.append(
                    Finding(
                        id="FIND-ELF-001",
                        category="SECURITY_MITIGATION",
                        title="Writable and Executable ELF Segment (W^X Violation)",
                        description="ELF binary contains a loadable segment that is both writable and executable. Frequently used in packed or shellcode loaders.",
                        severity=SeverityEnum.HIGH,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"rwx_segments": rwx_segments},
                        source_engine="elf_extractor",
                        recommendation="Review compilation flags (-z noexecstack); verify if self-modifying code or packing is present.",
                    )
                )

    except Exception as err:
        findings.append(
            Finding(
                id="FIND-ELF-ERR-001",
                category="MALFORMED_HEADER",
                title="Malformed or Corrupted ELF Header",
                description=f"Error reading ELF structure: {err}",
                severity=SeverityEnum.MEDIUM,
                confidence=ConfidenceEnum.HIGH,
                evidence={"error": str(err)},
                source_engine="elf_extractor",
                recommendation="Inspect file for binary tampering or corrupt headers.",
            )
        )
        features["error"] = str(err)

    return features, findings
