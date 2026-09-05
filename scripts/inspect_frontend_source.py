#!/usr/bin/env python3
"""Inspect the checked-in V4 frontend archive without building or executing it.

Verifies the buildgate source/archive hashes, opens the tarball in memory, and
prints small context windows around gift, registration, login and certificate
checkout API usage. No network requests, database access or source mutation.
"""
from __future__ import annotations

import base64
import hashlib
import io
import re
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    'k00.txt','m00.txt','m01.txt',
    'f02a.txt','f02b.txt','f02c.txt','f02d.txt',
    'm03.txt','m04.txt',
    'f05a.txt','f05b.txt','f05c.txt','f05d.txt',
    'm06.txt','m07.txt'
]
EXPECTED_SOURCE_SHA = 'c850b4e7ce40a523a15eb1cb5e9be0b8e30280033940ed039cb1c90e5e03c442'
EXPECTED_ARCHIVE_SHA = 'b08c92f561ca67d2a8ab130fe149759e59ead9f952f51af4ad86a5cc52fd57f3'
PATTERNS = [
    re.compile(r'/certificate/checkout', re.I),
    re.compile(r'/auth/register', re.I),
    re.compile(r'/auth/login', re.I),
    re.compile(r'(/gift\b|Gift the Moon|personalised gift|personalized gift)', re.I),
    re.compile(r'(checkout_url|window\.location|location\.href|navigate\()', re.I),
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    source = ''.join((ROOT / 'buildgate' / p).read_text(encoding='utf-8') for p in PARTS)
    if len(source) != 130960 or sha256(source.encode('ascii')) != EXPECTED_SOURCE_SHA:
        raise SystemExit('frontend buildgate source verification failed')
    archive = base64.b64decode(source.encode('ascii'), validate=True)
    if len(archive) != 98220 or sha256(archive) != EXPECTED_ARCHIVE_SHA:
        raise SystemExit('frontend archive verification failed')

    print('FRONTEND_ARCHIVE_VERIFIED', len(source), len(archive))
    matches = 0
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tf:
        for member in tf.getmembers():
            if not member.isfile() or not re.search(r'\.(?:js|jsx|ts|tsx)$', member.name, re.I):
                continue
            fh = tf.extractfile(member)
            if fh is None:
                continue
            text = fh.read().decode('utf-8', errors='replace')
            lines = text.splitlines()
            hit_lines: set[int] = set()
            for idx, line in enumerate(lines):
                if any(p.search(line) for p in PATTERNS):
                    hit_lines.add(idx)
            if not hit_lines:
                continue
            print('FRONTEND_FILE_BEGIN', member.name)
            shown: set[int] = set()
            for idx in sorted(hit_lines):
                start = max(0, idx - 3)
                end = min(len(lines), idx + 4)
                if all(i in shown for i in range(start, end)):
                    continue
                print(f'--- lines {start+1}-{end} ---')
                for i in range(start, end):
                    print(f'{i+1:04d}: {lines[i]}')
                    shown.add(i)
                matches += 1
            print('FRONTEND_FILE_END', member.name)
    print('FRONTEND_FLOW_INSPECT_OK', matches)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
