import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const parts = [
  'k00.txt','m00.txt','m01.txt',
  'f02a.txt','f02b.txt','f02c.txt','f02d.txt',
  'm03.txt','m04.txt',
  'f05a.txt','f05b.txt','f05c.txt','f05d.txt',
  'm06.txt','m07.txt'
];
const expectedSourceSha = 'c850b4e7ce40a523a15eb1cb5e9be0b8e30280033940ed039cb1c90e5e03c442';
const expectedArchiveSha = 'b08c92f561ca67d2a8ab130fe149759e59ead9f952f51af4ad86a5cc52fd57f3';

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
let source = '';
for (const name of parts) {
  const p = path.join(root, 'buildgate', name);
  if (!fs.existsSync(p)) throw new Error(`Missing build source part: ${name}`);
  source += fs.readFileSync(p, 'utf8');
}
if (source.length !== 130960) throw new Error(`Source length mismatch: ${source.length}`);
if (sha256(source) !== expectedSourceSha) throw new Error('Source SHA mismatch');
console.log('V4_SOURCE_VERIFIED', source.length, expectedSourceSha);

const archive = Buffer.from(source, 'base64');
if (archive.length !== 98220) throw new Error(`Archive length mismatch: ${archive.length}`);
if (sha256(archive) !== expectedArchiveSha) throw new Error('Archive SHA mismatch');
console.log('V4_ARCHIVE_VERIFIED', archive.length, expectedArchiveSha);

const archivePath = path.join(root, '.v4-frontend.tar.gz');
fs.writeFileSync(archivePath, archive);
execFileSync('tar', ['-xzf', archivePath, '-C', root], { stdio: 'inherit' });

const publicDir = path.join(root, 'frontend', 'public');
fs.mkdirSync(publicDir, { recursive: true });

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Asset download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50000) throw new Error(`Asset unexpectedly small: ${url}`);
  fs.writeFileSync(dest, buf);
  console.log('ASSET_OK', path.basename(dest), buf.length, sha256(buf));
}

await download(
  'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg',
  path.join(publicDir, 'moon-surface.jpg')
);
await download(
  'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg',
  path.join(publicDir, 'moon-bump.jpg')
);

const certSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="990" viewBox="0 0 1400 990">
<rect width="1400" height="990" fill="#07070d"/>
<rect x="46" y="46" width="1308" height="898" rx="22" fill="none" stroke="#c8a64b" stroke-width="3"/>
<circle cx="700" cy="250" r="112" fill="#bfc0c2" stroke="#e0c56a" stroke-width="3"/>
<text x="700" y="460" text-anchor="middle" fill="#e9cf7b" font-family="Georgia,serif" font-size="54">LUNAR BIRTHRIGHT PROJECT</text>
<text x="700" y="535" text-anchor="middle" fill="#f5f0df" font-family="Georgia,serif" font-size="38">Founding Citizen Certificate</text>
<text x="700" y="615" text-anchor="middle" fill="#b7b3a8" font-family="Arial,sans-serif" font-size="24">A symbolic quarter-acre lunar registry keepsake</text>
<text x="700" y="690" text-anchor="middle" fill="#d7bd6d" font-family="Arial,sans-serif" font-size="22">Our Moon. Our Story. Our Birthright.</text>
<text x="700" y="850" text-anchor="middle" fill="#777" font-family="Arial,sans-serif" font-size="17">Symbolic commemorative registry — no legal lunar land ownership is created.</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'founding-certificate.svg'), certSvg);

const certComponent = path.join(root, 'frontend', 'src', 'components', 'OriginalFoundingCertificate.jsx');
if (fs.existsSync(certComponent)) {
  const text = fs.readFileSync(certComponent, 'utf8').replace("'/founding-certificate.png'", "'/founding-certificate.svg'");
  fs.writeFileSync(certComponent, text);
}

const pkgPath = path.join(root, 'frontend', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = { ...(pkg.dependencies || {}), ajv: '8.17.1', 'ajv-keywords': '5.1.0' };
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

execFileSync('npm', ['install', '--legacy-peer-deps'], { cwd: path.join(root, 'frontend'), stdio: 'inherit' });
execFileSync(path.join(root, 'frontend', 'node_modules', '.bin', 'craco'), ['build'], {
  cwd: path.join(root, 'frontend'),
  stdio: 'inherit'
});
console.log('V4_PRODUCTION_FRONTEND_BUILD_OK');
