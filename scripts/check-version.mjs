import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packagePath = resolve(root, 'package.json');
const manifestPath = resolve(root, 'public/manifest.json');

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const versionPattern = /^\d+\.\d+\.\d+$/;

if (!versionPattern.test(packageJson.version)) {
  throw new Error(`package.json version must be a stable semver value, got: ${packageJson.version}`);
}

if (!versionPattern.test(manifest.version)) {
  throw new Error(`public/manifest.json version must be a stable semver value, got: ${manifest.version}`);
}

if (packageJson.version !== manifest.version) {
  throw new Error(`Version mismatch: package.json=${packageJson.version}, public/manifest.json=${manifest.version}`);
}

console.log(`Version ${packageJson.version} is consistent.`);
