import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import archiver from 'archiver';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const release = resolve(root, 'release');
const manifestPath = resolve(dist, 'manifest.json');
const expectedVersion = process.env.LEETCOPILOT_RELEASE_VERSION?.trim();

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!manifest.version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(manifest.version)) {
  throw new Error('dist/manifest.json must contain a valid semver version.');
}

if (expectedVersion !== undefined && manifest.version !== expectedVersion) {
  throw new Error(`Expected version mismatch: expected=${expectedVersion}, dist/manifest.json=${manifest.version}`);
}

await mkdir(release, { recursive: true });
const archivePath = resolve(release, `LeetCopilot-${manifest.version}.zip`);
const output = createWriteStream(archivePath);
const archive = archiver('zip', { zlib: { level: 9 } });

const completed = new Promise((resolvePromise, reject) => {
  output.on('close', resolvePromise);
  archive.on('error', reject);
});
archive.pipe(output);
archive.directory(dist, false);
await archive.finalize();
await completed;
console.log(`Created ${archivePath} (${archive.pointer()} bytes)`);
