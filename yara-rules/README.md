# NeuroCraft YARA Rules Directory

This directory stores YARA rule files (`.yar`, `.yara`) used by the static analysis scanner (`services/scanner`).

---

## Directory Organization

* `community/`: Curated open-source YARA rules from trusted threat research repositories (e.g., Florian Roth / Neo23x0 Signature Base, YARA-Rules Project).
* `custom/`: NeuroCraft-specific proprietary heuristics and rule sets crafted for targeted evasion detection.
* `test/`: Harmless test rules (e.g. matching harmless magic strings, EICAR test string) for unit and integration testing.

---

## Safety & Governance Rules

1. **Syntax Validation**: All rules must pass YARA syntax compilation before being deployed into production rule sets.
2. **Performance Constraints**: Rules should avoid unbounded regex patterns (`.*`) or excessive wildcard loops that induce high CPU overhead.
3. **No Embedded Live Exploits**: Rules must describe detection logic and byte patterns without embedding live exploit payloads.
