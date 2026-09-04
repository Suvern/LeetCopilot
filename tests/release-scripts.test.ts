import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const root = new URL('..', import.meta.url);
const checkVersionScript = new URL('../scripts/check-version.mjs', import.meta.url);

async function runVersionCheck(version?: string) {
  return execFileAsync(process.execPath, [checkVersionScript.pathname], {
    cwd: root.pathname,
    env: {
      ...process.env,
      ...(version === undefined ? {} : { LEETCOPILOT_RELEASE_VERSION: version }),
    },
  });
}

describe('release version scripts', () => {
  it('accepts the repository version as the expected release version', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    await expect(runVersionCheck(packageJson.version)).resolves.toMatchObject({ stdout: expect.stringContaining(`Version ${packageJson.version} is consistent.`) });
  });

  it('rejects prerelease and mismatched expected versions', async () => {
    await expect(runVersionCheck('0.1.0-rc.1')).rejects.toThrow('Expected version must be a stable semver value');
    await expect(runVersionCheck('999.999.999')).rejects.toThrow('Expected version mismatch');
  });
});
