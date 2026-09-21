import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const release=JSON.parse(readFileSync('release/version.json','utf8')).version;
assert.match(release,/^\d+\.\d+\.\d+$/,'La versión central debe ser semántica.');
const packageJson=JSON.parse(readFileSync('package.json','utf8'));
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
assert.equal(packageJson.version,release,'package.json no coincide con la versión central.');
assert.equal(lock.version,release,'package-lock.json no coincide con la versión central.');
assert.equal(lock.packages[''].version,release,'El paquete raíz del lock no coincide con la versión central.');
assert.match(readFileSync('app/app-version.ts','utf8'),new RegExp(`APP_VERSION = '${release.replaceAll('.','\\.')}'`),'El marcador visible no coincide con la versión central.');
// Monorepo: el API en backend/ comparte la misma versión (un solo release:patch).
const backendRelease=JSON.parse(readFileSync('backend/release-version.json','utf8'));
const backendPackage=JSON.parse(readFileSync('backend/package.json','utf8'));
const backendLock=JSON.parse(readFileSync('backend/package-lock.json','utf8'));
assert.equal(backendRelease.version,release,'backend/release-version.json no coincide con la versión central.');
assert.equal(backendPackage.version,release,'backend/package.json no coincide con la versión central.');
assert.equal(backendLock.version,release,'backend/package-lock.json no coincide con la versión central.');
assert.equal(backendLock.packages[''].version,release,'El paquete raíz del lock del API no coincide con la versión central.');
console.log(`PASS: versión centralizada de Scale OS v${release} (web + backend).`);
