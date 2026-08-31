import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceExtensions = new Set([".astro", ".cjs", ".js", ".mjs", ".ts", ".tsx"]);
const violations = [];

for (const directory of ["core", "adapters", "src"]) {
  for (const file of await filesUnder(resolve(root, directory))) {
    await inspect(file);
  }
}

if (violations.length > 0) {
  console.error("Core isolation failed:");
  for (const violation of violations) console.error(`  ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Core isolation: clean");
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

async function inspect(file) {
  const source = await readFile(file, "utf8");
  const repoPath = relative(root, file).replaceAll("\\", "/");
  const lines = source.split("\n");
  const isCore = repoPath.startsWith("core/");
  const isFront = /^src\/(?:components\/|layouts\/|pages\/(?!api\/))/.test(repoPath);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const imports = [
      ...line.matchAll(/\b(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g),
      ...line.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
    ];

    for (const match of imports) {
      const specifier = match[1];
      if (
        isCore &&
        (!specifier.startsWith(".") ||
          !isWithin(resolve(dirname(file), specifier), resolve(root, "core")))
      ) {
        report(repoPath, lineNumber, `core import escapes core/: ${specifier}`);
      }
      if (isFront && reachesLayer(file, specifier, ["core", "adapters"])) {
        report(repoPath, lineNumber, `front import reaches ${specifier}`);
      }
      if (repoPath.startsWith("adapters/") && reachesLayer(file, specifier, ["src", "contracts"])) {
        report(repoPath, lineNumber, `adapter import points outward: ${specifier}`);
      }
    }

    if (isCore && /(?:@cloudflare\/|cloudflare:)/.test(line)) {
      report(repoPath, lineNumber, "Cloudflare import/reference in core");
    }
    if (isCore && /\bEnv\b/.test(line)) {
      report(repoPath, lineNumber, "Env type in core");
    }
    if (isCore && /\b(?:AnalyticsEngineDataset|D1Database|DurableObjectNamespace|ExecutionContext|Fetcher|KVNamespace|R2Bucket|Request|Response|VectorizeIndex|WebSocketPair|caches|crypto|fetch|navigator)\b/.test(line)) {
      report(repoPath, lineNumber, "platform global in core");
    }
  });
}

function reachesLayer(file, specifier, layers) {
  if (!specifier.startsWith(".")) return layers.some((layer) => specifier === layer || specifier.startsWith(`${layer}/`));
  const target = resolve(dirname(file), specifier);
  return layers.some((layer) => isWithin(target, resolve(root, layer)));
}

function isWithin(target, directory) {
  const path = relative(directory, target);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function report(file, line, message) {
  violations.push(`${file}:${line}: ${message}`);
}
