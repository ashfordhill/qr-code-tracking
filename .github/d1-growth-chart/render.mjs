/**
 * metrics-daily.json is the source of truth for the chart. Wrangler output only feeds the JSON build step.
 *
 * Build metrics JSON from wrangler (D1 query output):
 *   node render.mjs --build-metrics <wrangler-result.json> <metrics-daily.json> [--fixture]
 *
 * Render chart SVG from committed metrics JSON:
 *   node render.mjs --from-json <metrics-daily.json> <chart.svg>
 *
 * --fixture : do not extend the timeline to real UTC today (stable output for sample wrangler JSON).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { compile } from 'vega-lite';
import * as vega from 'vega';

const METRICS_SCHEMA_VERSION = 1;

/** Wrangler may print spinners before the JSON array; strip and parse. */
function parseWranglerJsonArray(raw) {
  const s = raw.trim();
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end <= start) {
    throw new Error('No JSON array found in wrangler output (check auth and query).');
  }
  return JSON.parse(s.slice(start, end + 1));
}

/** D1 / wrangler may return ISO datetimes; chart keys must be YYYY-MM-DD. */
function normalizeCalendarDay(raw) {
  if (raw == null || raw === '') {
    throw new Error('Row missing calendar_day.');
  }
  const s = String(raw).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) {
    throw new Error(`Unrecognized calendar_day (need leading YYYY-MM-DD): ${s}`);
  }
  return m[1];
}

function reqNum(row, key, day) {
  const v = row[key];
  if (v == null || v === '') {
    throw new Error(`Row for ${day} missing numeric ${key}.`);
  }
  const n = Number(v);
  if (Number.isNaN(n)) {
    throw new Error(`Row for ${day}: ${key} is not a number.`);
  }
  return n;
}

/** Sparse SQL rows: one row per activity day (plus today) with DB cumulative totals. */
function extractSparseCumulativeRows(wranglerJsonPath) {
  const raw = readFileSync(wranglerJsonPath, 'utf8');
  const data = parseWranglerJsonArray(raw);
  const batches = Array.isArray(data) ? data : [data];
  const rows = [];
  for (const batch of batches) {
    if (!batch?.results || !Array.isArray(batch.results)) continue;
    for (const row of batch.results) {
      if (!row || row.calendar_day == null) continue;
      rows.push(row);
    }
  }
  if (rows.length === 0) {
    throw new Error(
      'No rows in wrangler JSON. For remote SELECTs use `wrangler d1 execute --command` (not `--file`).',
    );
  }
  const byDay = new Map();
  for (const row of rows) {
    const day = normalizeCalendarDay(row.calendar_day);
    const labels = reqNum(row, 'labels_cumulative', day);
    const scans = reqNum(row, 'scans_cumulative', day);
    byDay.set(day, { calendar_day: day, labels, scans });
  }
  const unique = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, r]) => r);
  if (unique.length < rows.length) {
    console.warn(
      `Deduplicated ${rows.length - unique.length} duplicate calendar_day row(s) (e.g. repeated wrangler batches).`,
    );
  }
  return unique;
}

function assertIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) {
    throw new Error(`Bad calendar_day: ${s}`);
  }
}

function utcIsoDateFromMs(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function parseIsoUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Inclusive range of UTC calendar days as ISO strings. */
function eachIsoDayInclusive(isoStart, isoEnd) {
  const out = [];
  let t = parseIsoUtc(isoStart);
  const end = parseIsoUtc(isoEnd);
  while (t <= end) {
    out.push(utcIsoDateFromMs(t));
    t += 86400000;
  }
  return out;
}

function maxIso(a, b) {
  return a.localeCompare(b) >= 0 ? a : b;
}

function minIso(a, b) {
  return a.localeCompare(b) <= 0 ? a : b;
}

/**
 * One row per calendar day from first DB activity through `end` (UTC), forward-filling
 * cumulative totals from sparse SQL rows (same values as COUNT(*) through that day).
 */
function buildDenseCumulative(sparseSorted, fixtureMode) {
  if (sparseSorted.length === 0) return [];
  const first = sparseSorted[0].calendar_day;
  const lastData = sparseSorted[sparseSorted.length - 1].calendar_day;
  const today = utcIsoDateFromMs(Date.now());
  const end = fixtureMode ? lastData : maxIso(today, lastData);
  const start = minIso(first, end);

  let j = 0;
  let lastL = 0;
  let lastS = 0;
  const wide = [];
  for (const day of eachIsoDayInclusive(start, end)) {
    assertIsoDate(day);
    while (j < sparseSorted.length && sparseSorted[j].calendar_day <= day) {
      lastL = sparseSorted[j].labels;
      lastS = sparseSorted[j].scans;
      j++;
    }
    wide.push({ calendar_day: day, labels: lastL, scans: lastS });
  }
  return wide;
}

/** Canonical committed file: one row per UTC calendar day, cumulative totals. */
function readMetricsDailyJson(jsonPath) {
  const raw = readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  if (data.schemaVersion !== METRICS_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported metrics JSON schemaVersion (expected ${METRICS_SCHEMA_VERSION}).`,
    );
  }
  if (!Array.isArray(data.days) || data.days.length === 0) {
    throw new Error('metrics JSON must include non-empty "days" array.');
  }
  const wide = [];
  for (const row of data.days) {
    const day = normalizeCalendarDay(row.calendar_day);
    const labels =
      row.labels !== undefined
        ? Number(row.labels)
        : reqNum(row, 'labels_cumulative', day);
    const scans =
      row.scans !== undefined ? Number(row.scans) : reqNum(row, 'scans_cumulative', day);
    if (Number.isNaN(labels) || Number.isNaN(scans)) {
      throw new Error(`Invalid numbers for ${day}`);
    }
    wide.push({ calendar_day: day, labels, scans });
  }
  wide.sort((a, b) => a.calendar_day.localeCompare(b.calendar_day));
  return wide;
}

function writeMetricsDailyJson(wide, sparseRowCount, jsonPath) {
  const payload = {
    schemaVersion: METRICS_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    calendar: 'UTC',
    note:
      'Cumulative totals per calendar day. Built from D1 COUNT(*) (see metrics.sql); sparse query includes date(\'now\') so the current UTC day is always tallied when the workflow runs.',
    sparseRowCount,
    dayCount: wide.length,
    days: wide.map((d) => ({
      calendar_day: d.calendar_day,
      labels: d.labels,
      scans: d.scans,
    })),
  };
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildSpec(wide) {
  const last = wide[wide.length - 1];
  const caption = `Latest (UTC): ${last.labels} labels · ${last.scans} scans · through ${last.calendar_day}`;
  const sameYear =
    wide.length > 0 &&
    wide[0].calendar_day.slice(0, 4) === wide[wide.length - 1].calendar_day.slice(0, 4);
  const axisTimePattern = sameYear ? '%b %e' : '%b %e, %Y';
  const axisLabelExpr = `timeFormat(toDate(datum.value + 'T12:00:00Z'), '${axisTimePattern}')`;

  const xOrdinal = {
    field: 'calendar_day',
    type: 'ordinal',
    sort: null,
    title: null,
    axis: {
      labelAngle: wide.length > 12 ? -38 : 0,
      labelOverlap: 'greedy',
      labelExpr: axisLabelExpr,
      labelPadding: 6,
      ticks: false,
      domain: false,
      orient: 'bottom',
    },
  };

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 920,
    height: 380,
    padding: { left: 8, right: 24, top: 8, bottom: 8 },
    data: { values: wide },
    transform: [
      { fold: ['labels', 'scans'], as: ['metric', 'v'] },
      {
        calculate: "datum.metric == 'labels' ? 'Labels' : 'Scans'",
        as: 'series',
      },
    ],
    encoding: {
      x: xOrdinal,
      y: {
        field: 'v',
        type: 'quantitative',
        title: 'Cumulative count',
        scale: { domainMin: 0, nice: true },
        axis: { grid: true, tickMinStep: 1, format: 'd' },
      },
      color: {
        field: 'series',
        type: 'nominal',
        title: '',
        scale: { domain: ['Labels', 'Scans'], range: ['#7c3aed', '#15803d'] },
        legend: {
          orient: 'top',
          direction: 'horizontal',
          anchor: 'start',
          offset: 2,
          symbolStrokeWidth: 3,
          symbolType: 'stroke',
          labelFontSize: 12,
        },
      },
    },
    mark: {
      type: 'line',
      interpolate: 'step-after',
      strokeWidth: 2.5,
      point: {
        filled: true,
        size: 85,
        stroke: '#faf7f2',
        strokeWidth: 2,
      },
    },
    title: {
      text: 'QR Code Tracking in Berwyn, IL',
      caption,
      captionColor: '#57534e',
      captionFontSize: 11,
      anchor: 'start',
      align: 'left',
      color: '#292524',
      font: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      fontSize: 20,
      fontWeight: 650,
      offset: 6,
      frame: 'group',
    },
    config: {
      background: '#faf7f2',
      font: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      axis: {
        labelColor: '#57534e',
        titleColor: '#44403c',
        gridColor: '#e7e5e4',
        domainColor: '#d6d3d1',
        tickColor: '#d6d3d1',
        labelFontSize: 10,
        titleFontSize: 11,
      },
      view: { stroke: null },
      line: { strokeCap: 'round', strokeJoin: 'round' },
    },
  };
}

async function toSvg(vlSpec) {
  const { spec } = compile(vlSpec);
  const runtime = vega.parse(spec);
  const view = new vega.View(runtime, {
    renderer: 'none',
  });
  await view.runAsync();
  const svg = view.toSVG();
  return typeof svg.then === 'function' ? await svg : svg;
}

function parseCli() {
  const args = process.argv.slice(2);
  const fixtureMode = args.includes('--fixture');
  const filtered = args.filter((a) => a !== '--fixture');

  const fromJsonIdx = filtered.indexOf('--from-json');
  if (fromJsonIdx !== -1) {
    const jsonPath = filtered[fromJsonIdx + 1];
    const svgOut = filtered[fromJsonIdx + 2];
    if (!jsonPath || !svgOut) {
      console.error('Usage: node render.mjs --from-json <metrics-daily.json> <chart.svg>');
      process.exit(1);
    }
    return { mode: 'from-json', jsonPath, svgOut };
  }

  const buildIdx = filtered.indexOf('--build-metrics');
  if (buildIdx !== -1) {
    const wranglerPath = filtered[buildIdx + 1];
    const jsonOut = filtered[buildIdx + 2];
    if (!wranglerPath || !jsonOut) {
      console.error(
        'Usage: node render.mjs --build-metrics <wrangler-result.json> <metrics-daily.json> [--fixture]',
      );
      process.exit(1);
    }
    return { mode: 'build-metrics', wranglerPath, jsonOut, fixtureMode };
  }

  console.error(
    'Usage:\n' +
      '  node render.mjs --build-metrics <wrangler-result.json> <metrics-daily.json> [--fixture]\n' +
      '  node render.mjs --from-json <metrics-daily.json> <chart.svg>',
  );
  process.exit(1);
}

async function buildMetricsFromWrangler(wranglerPath, jsonOut, fixtureMode) {
  const sparse = extractSparseCumulativeRows(wranglerPath);
  const wide = buildDenseCumulative(sparse, fixtureMode);
  if (wide.length === 0) {
    throw new Error('No metrics rows after expansion.');
  }
  writeMetricsDailyJson(wide, sparse.length, jsonOut);
  console.log(`Wrote ${jsonOut} (${wide.length} day(s), ${sparse.length} sparse SQL row(s)).`);
  return wide;
}

async function renderSvgFromMetrics(wide, svgOut, { sourceLabel = 'JSON' } = {}) {
  if (wide.length === 0) {
    throw new Error('No chart rows.');
  }
  const spec = buildSpec(wide);
  const svg = await toSvg(spec);
  writeFileSync(svgOut, svg, 'utf8');
  console.log(`Wrote ${svgOut} (${wide.length} day(s) on chart from ${sourceLabel}).`);
}

const cli = parseCli();

if (cli.mode === 'build-metrics') {
  await buildMetricsFromWrangler(cli.wranglerPath, cli.jsonOut, cli.fixtureMode);
} else {
  const wide = readMetricsDailyJson(cli.jsonPath);
  await renderSvgFromMetrics(wide, cli.svgOut);
}
