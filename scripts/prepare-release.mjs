import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packagePath = resolve(root, 'package.json');
const manifestPath = resolve(root, 'public/manifest.json');
const version = process.argv[2]?.trim();
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

if (!versionPattern.test(version ?? '')) {
  throw new Error('Usage: pnpm release <version>, for example: pnpm release 0.1.0');
}

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const manifestText = await readFile(manifestPath, 'utf8');
const manifest = JSON.parse(manifestText);

packageJson.version = version;
manifest.version = version;

await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const versionField = /("version"\s*:\s*")[^"]+("\s*[,}])/;
if (!versionField.test(manifestText)) {
  throw new Error('public/manifest.json does not contain a version field.');
}

await writeFile(manifestPath, manifestText.replace(versionField, `$1${version}$2`));
console.log(`Prepared release ${version} in package.json and public/manifest.json.`);
