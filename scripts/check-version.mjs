import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packagePath = resolve(root, 'package.json');
const manifestPath = resolve(root, 'public/manifest.json');
const expectedVersion = process.env.LEETCOPILOT_RELEASE_VERSION?.trim();

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

if (!versionPattern.test(packageJson.version)) {
  throw new Error(`package.json version must be a stable semver value, got: ${packageJson.version}`);
}

if (!versionPattern.test(manifest.version)) {
  throw new Error(`public/manifest.json version must be a stable semver value, got: ${manifest.version}`);
}

if (packageJson.version !== manifest.version) {
  throw new Error(`Version mismatch: package.json=${packageJson.version}, public/manifest.json=${manifest.version}`);
}

if (expectedVersion !== undefined) {
  if (!versionPattern.test(expectedVersion)) {
    throw new Error(`Expected version must be a stable semver value, got: ${expectedVersion}`);
  }

  if (packageJson.version !== expectedVersion) {
    throw new Error(`Expected version mismatch: expected=${expectedVersion}, package.json=${packageJson.version}`);
  }
}

console.log(`Version ${packageJson.version} is consistent.`);
