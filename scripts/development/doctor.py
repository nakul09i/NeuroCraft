"""Development environment diagnostic tool for NeuroCraft."""

import platform
import shutil
import sys


def check_tool(name: str) -> tuple[bool, str]:
    path = shutil.which(name)
    if path:
        return True, path
    return False, "Not installed / not in PATH"


def main() -> None:
    print("=" * 60)
    print("NeuroCraft Diagnostic Doctor (Phase 0)")
    print("=" * 60)
    print(f"OS Platform     : {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"Python Version  : {sys.version.split()[0]} ({sys.executable})")

    tools = ["git", "docker", "ruff", "mypy", "pytest", "clamscan", "yara"]
    print("\nExternal Tooling Status:")
    for tool in tools:
        found, detail = check_tool(tool)
        status = "[OK]  " if found else "[OPT] "
        print(f"  {status} {tool:<12}: {detail}")

    print("\nPhase 0 Status: Engineering foundation initialized cleanly.")
    print("=" * 60)


if __name__ == "__main__":
    main()
