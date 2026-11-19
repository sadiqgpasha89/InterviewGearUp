#!/usr/bin/env python3
"""
Generates 100+ questions for each of the 9 roles in InterviewGearUp:
- backend (be-1 to be-100)
- frontend (fe-1 to fe-100)
- devops (do-1 to do-100)
- data (de-1 to de-100)
- ml (ml-1 to ml-100)
- general (gen-1 to gen-100)
- leadership (lead-1 to lead-100)
- qa (qa-1 to qa-100)
- security (sec-1 to sec-100)

Total: 900 questions
"""

import json
import os
import re
import sys

root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(os.path.dirname(__file__))
import common

with open("/tmp/existing-questions.json") as f:
    existing = json.load(f)

print("Loaded existing questions:")
for k, v in existing.items():
    print(f"  {k}: {len(v)} existing")

