import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync, copyFileSync } from 'node:fs';

interface Manifest {
  minAppVersion: string;
  version: string;
}

interface ObsidianRelease {
  name: string;
}

const targetVersion = process.env['npm_package_version'];
if (!targetVersion) {
  throw new Error('npm_package_version not set');
}

const isBeta = targetVersion.includes('beta');

if (isBeta) {
  // For beta: copy manifest.json to manifest-beta.json and set beta version
  copyFileSync('manifest.json', 'manifest-beta.json');
  const manifestBeta = JSON.parse(readFileSync('manifest-beta.json', 'utf8')) as Manifest;
  manifestBeta.version = targetVersion;
  writeFileSync('manifest-beta.json', JSON.stringify(manifestBeta, null, '\t'));
} else {
  // For stable: fetch latest Obsidian version and update minAppVersion
  const response = await fetch('https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest');
  const release = await response.json() as Partial<ObsidianRelease>;
  const latestObsidianVersion = release.name;

  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')) as Manifest;
  if (latestObsidianVersion) {
    manifest.minAppVersion = latestObsidianVersion;
  }
  manifest.version = targetVersion;
  writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));

  // update versions.json with target version and minAppVersion
  const versions = JSON.parse(readFileSync('versions.json', 'utf8')) as Record<string, string>;
  versions[targetVersion] = manifest.minAppVersion;
  writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));

  // remove manifest-beta.json if it exists
  if (existsSync('manifest-beta.json')) {
    unlinkSync('manifest-beta.json');
  }
}

execSync('git add manifest.json versions.json manifest-beta.json', { stdio: 'inherit' });
