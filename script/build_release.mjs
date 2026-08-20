import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionDirectory = join(root, "Extension");
const distDirectory = join(root, "dist");
const sourceManifest = JSON.parse(readFileSync(join(extensionDirectory, "manifest.json"), "utf8"));
const version = sourceManifest.version;
const stagingDirectory = join(distDirectory, `browser-monitor-${version}`);
const archivePath = join(distDirectory, `browser-monitor-${version}.zip`);
const checksumPath = join(distDirectory, "SHA256SUMS.txt");

const runtimeDirectories = ["core", "features", "icons", "images", "rules", "ui", "vendor"];

rmSync(distDirectory, { recursive: true, force: true });
mkdirSync(stagingDirectory, { recursive: true });

for (const directory of runtimeDirectories) {
  cpSync(join(extensionDirectory, directory), join(stagingDirectory, directory), {
    recursive: true,
    filter: (path) => !/(^|\/)(tests?|TestFixtures|output)(\/|$)/i.test(path) &&
      !/(^|\/)(package\.json|package-lock\.json|\.DS_Store)$/.test(path)
  });
}

const releaseManifest = structuredClone(sourceManifest);
delete releaseManifest.key;
writeFileSync(join(stagingDirectory, "manifest.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`);

function filesBelow(directory, prefix = "") {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = join(directory, entry);
    const relative = join(prefix, entry);
    return statSync(absolute).isDirectory() ? filesBelow(absolute, relative) : [relative];
  });
}

const packagedFiles = filesBelow(stagingDirectory);
assert.ok(packagedFiles.includes("manifest.json"), "Release manifest is missing");
assert.ok(!("key" in releaseManifest), "Development public key leaked into the Store package");
assert.ok(!releaseManifest.permissions.includes("declarativeNetRequestFeedback"));
assert.ok(packagedFiles.every((file) => !/(^|\/)(tests?|TestFixtures|output)(\/|$)/i.test(file)));
assert.ok(packagedFiles.every((file) => !/(^|\/)(package\.json|\.DS_Store)$/.test(file)));

const scripts = packagedFiles.filter((file) => file.endsWith(".js"));
for (const file of scripts) {
  const source = readFileSync(join(stagingDirectory, file), "utf8");
  assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\s*\(/, `${file} contains dynamic code execution`);
  assert.doesNotMatch(source, /onRuleMatchedDebug|declarativeNetRequestFeedback/, `${file} contains a debug-only API`);
  for (const match of source.matchAll(/\bfrom\s+["'](\.[^"']+)["']/g)) {
    const dependency = resolve(dirname(join(stagingDirectory, file)), match[1]);
    assert.ok(existsSync(dependency), `${file} imports ${match[1]}, but that module is missing from the package`);
  }
}

const zip = spawnSync("zip", ["-X", "-q", "-r", archivePath, "."], {
  cwd: stagingDirectory,
  encoding: "utf8"
});
assert.equal(zip.status, 0, zip.stderr || "zip failed");
assert.ok(existsSync(archivePath), "Release archive was not created");

const archive = readFileSync(archivePath);
const checksum = createHash("sha256").update(archive).digest("hex");
writeFileSync(checksumPath, `${checksum}  ${archivePath.split("/").at(-1)}\n`);
rmSync(stagingDirectory, { recursive: true, force: true });

console.log(JSON.stringify({
  ok: true,
  version,
  archive: archivePath,
  bytes: archive.byteLength,
  sha256: checksum,
  fileCount: packagedFiles.length
}, null, 2));
