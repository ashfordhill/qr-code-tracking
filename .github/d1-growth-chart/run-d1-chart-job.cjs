/**
 * Mirrors .github/workflows/d1-growth-chart.yml:
 *   D1 query → metrics-daily.json → SVG from JSON (metrics JSON is source of truth for the chart).
 *
 * Remote D1: use `--command` + SQL text (same as CI). Do not use `--file` for
 * SELECTs — Wrangler's remote `--file` path uses import-style handling and
 * `--json` will not return result rows.
 *
 * From repo root (`.env` with Cloudflare token + account id):
 *   cd .github/d1-growth-chart && npm run chart:ci
 *   (or: npm --prefix .github/d1-growth-chart run chart:ci)
 *
 * Re-render only (edit .docs/metrics-daily.json first, no D1):
 *   npm run chart:ci:from-json
 *
 * From this directory: node run-d1-chart-job.cjs --query-only
 */
const { spawnSync } = require('node:child_process');
const {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} = require('node:fs');
const { join, resolve } = require('node:path');

const chartDir = resolve(__dirname);
const repoRoot = resolve(__dirname, '..', '..');
const wranglerOut = join(chartDir, 'wrangler-result.json');
const svgOut = join(repoRoot, '.docs', 'labels-scans-cumulative.svg');
const metricsJsonOut = join(repoRoot, '.docs', 'metrics-daily.json');
const renderMjs = join(chartDir, 'render.mjs');

function getWranglerCli() {
  return resolve(chartDir, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
}

function ensureWranglerInstalled() {
  if (existsSync(getWranglerCli())) return;
  console.log('→ npm ci (.github/d1-growth-chart) [install wrangler]');
  const ci = spawnSync('npm', ['ci'], {
    cwd: chartDir,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (ci.status !== 0) process.exit(ci.status ?? 1);
  if (!existsSync(getWranglerCli())) {
    console.error('wrangler CLI missing after npm ci.');
    process.exit(1);
  }
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  let text = readFileSync(filePath, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

function requireCloudflareEnv() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    const envPath = join(repoRoot, '.env');
    const hasFile = existsSync(envPath);
    console.error(
      'Missing CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID (non-empty).\n' +
        (hasFile
          ? `Found ${envPath} but those keys are missing or empty — save the file with values after each =.\n`
          : `Create ${envPath} from .env.example, or export vars in the shell.\n`),
    );
    process.exit(1);
  }
}

function runRemoteD1Query(dbTarget) {
  ensureWranglerInstalled();
  const sql = readFileSync(join(chartDir, 'metrics.sql'), 'utf8').trim();
  const wranglerEnv = {
    ...process.env,
    CI: 'true',
    FORCE_COLOR: '0',
  };

  const wranglerCli = getWranglerCli();
  const args = [
    wranglerCli,
    'd1',
    'execute',
    dbTarget,
    '--remote',
    '--command',
    sql,
    '--json',
  ];

  console.log(`→ wrangler d1 execute "${dbTarget}" --remote --command … → ${wranglerOut}`);
  const wr = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    shell: false,
    env: wranglerEnv,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  if (wr.status !== 0) {
    if (wr.stderr) process.stderr.write(wr.stderr);
    if (wr.stdout) process.stdout.write(wr.stdout);
    process.exit(wr.status ?? 1);
  }
  writeFileSync(wranglerOut, wr.stdout, 'utf8');
}

const fromJsonOnly = process.argv.includes('--from-json');

loadEnvFile(join(repoRoot, '.env'));

const dbTarget =
  process.env.D1_DB_TARGET ||
  process.env.CLOUDFLARE_D1_DATABASE_ID ||
  process.env.CLOUDFLARE_D1_DATABASE_NAME ||
  'labels-db';

if (process.argv.includes('--query-only')) {
  requireCloudflareEnv();
  runRemoteD1Query(dbTarget);
  console.log('Query-only done.');
  process.exit(0);
}

console.log('→ npm ci (.github/d1-growth-chart)');
const ci = spawnSync('npm', ['ci'], {
  cwd: chartDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
if (ci.status !== 0) process.exit(ci.status ?? 1);

mkdirSync(join(repoRoot, '.docs'), { recursive: true });

if (!fromJsonOnly) {
  requireCloudflareEnv();
  runRemoteD1Query(dbTarget);
  console.log(`→ node render.mjs --build-metrics → ${metricsJsonOut}`);
  const build = spawnSync(
    process.execPath,
    [renderMjs, '--build-metrics', wranglerOut, metricsJsonOut],
    { cwd: repoRoot, stdio: 'inherit', env: process.env },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);
} else {
  if (!existsSync(metricsJsonOut)) {
    console.error(`Missing ${metricsJsonOut} — create or edit it before --from-json.`);
    process.exit(1);
  }
  console.log(`→ skip D1; using ${metricsJsonOut}`);
}

console.log(`→ node render.mjs --from-json → ${svgOut}`);
const render = spawnSync(
  process.execPath,
  [renderMjs, '--from-json', metricsJsonOut, svgOut],
  { cwd: repoRoot, stdio: 'inherit', env: process.env },
);
if (render.status !== 0) process.exit(render.status ?? 1);

console.log('Done (no git commit). Inspect .docs/metrics-daily.json and .docs/labels-scans-cumulative.svg');
