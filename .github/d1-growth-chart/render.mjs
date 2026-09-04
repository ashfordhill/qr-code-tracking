/**
 * metrics-daily.json is the source of truth for the chart. Wrangler output only feeds the JSON build step.
 *
 * Build metrics JSON from wrangler (D1 query output):
 *   node render.mjs --build-metrics <wrangler-result.json> <metrics-daily.json> [--fixture]
 *
 * Render chart SVG from committed metrics JSON:
 *   node render.mjs --from-json <metrics-daily.json> <chart.svg>
 *
 * --fixture : do not extend the timeline to real Central today (stable output for sample wrangler JSON).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { compile } from 'vega-lite';
import * as vega from 'vega';

const METRICS_SCHEMA_VERSION = 2;
const LEGACY_SCHEMA_VERSION = 1;
const CHICAGO_TZ = 'America/Chicago';

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

/** YYYY-MM-DD in America/Chicago for an ISO timestamp string. */
function chicagoCalendarDay(isoTimestamp) {
  const d = new Date(String(isoTimestamp));
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid timestamp: ${isoTimestamp}`);
  }
  return d.toLocaleDateString('en-CA', { timeZone: CHICAGO_TZ });
}

function chicagoTodayIso() {
  return chicagoCalendarDay(new Date().toISOString());
}

/**
 * Rows from metrics.sql: { kind: 'poster_installed'|'poster_uninstalled'|'scan', at: ISO string }.
 * Legacy 'label' rows (pre-poster-lineage query) are treated as installs.
 */
function extractEventsFromWrangler(wranglerJsonPath) {
  const raw = readFileSync(wranglerJsonPath, 'utf8');
  const data = parseWranglerJsonArray(raw);
  const batches = Array.isArray(data) ? data : [data];
  const events = [];
  for (const batch of batches) {
    if (!batch?.results || !Array.isArray(batch.results)) continue;
    for (const row of batch.results) {
      if (!row?.at) continue;
      let kind = String(row.kind ?? '').toLowerCase();
      if (kind === 'label') kind = 'poster_installed';
      if (kind !== 'poster_installed' && kind !== 'poster_uninstalled' && kind !== 'scan') {
        throw new Error(`Unexpected kind in D1 row: ${row.kind}`);
      }
      events.push({ kind, at: String(row.at) });
    }
  }
  if (events.length === 0) {
    throw new Error(
      'No poster/scan events in wrangler JSON. For remote SELECTs use `wrangler d1 execute --command` (not `--file`).',
    );
  }
  return events;
}

function assertIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) {
    throw new Error(`Bad calendar_day: ${s}`);
  }
}

function parseIsoUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcIsoDateFromMs(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Inclusive range of calendar days (YYYY-MM-DD strings). */
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
 * One row per America/Chicago calendar day from first activity through Central "today"
 * (or through last event day in --fixture mode). Cumulative = COUNT(*) through end of that day.
 */
function buildDailyCumulativeFromEvents(events, fixtureMode) {
  const installDays = [];
  const uninstallDays = [];
  const scanDays = [];
  for (const e of events) {
    const day = chicagoCalendarDay(e.at);
    if (e.kind === 'poster_installed') installDays.push(day);
    else if (e.kind === 'poster_uninstalled') uninstallDays.push(day);
    else scanDays.push(day);
  }
  if (installDays.length === 0 && scanDays.length === 0) return [];

  const allEventDays = [...installDays, ...uninstallDays, ...scanDays].sort();
  const first = allEventDays[0];
  const lastEvent = allEventDays[allEventDays.length - 1];
  const centralToday = chicagoTodayIso();
  const end = fixtureMode ? lastEvent : maxIso(centralToday, lastEvent);
  const start = minIso(first, end);

  const wide = [];
  for (const day of eachIsoDayInclusive(start, end)) {
    assertIsoDate(day);
    let posters = 0;
    let scans = 0;
    for (const d of installDays) {
      if (d <= day) posters++;
    }
    for (const d of uninstallDays) {
      if (d <= day) posters--;
    }
    for (const d of scanDays) {
      if (d <= day) scans++;
    }
    wide.push({ calendar_day: day, posters, scans });
  }
  return wide;
}

/** Canonical committed file: one row per Central calendar day, cumulative totals. */
function readMetricsDailyJson(jsonPath) {
  const raw = readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  if (
    data.schemaVersion !== METRICS_SCHEMA_VERSION &&
    data.schemaVersion !== LEGACY_SCHEMA_VERSION
  ) {
    throw new Error(
      `Unsupported metrics JSON schemaVersion (expected ${METRICS_SCHEMA_VERSION} or ${LEGACY_SCHEMA_VERSION}).`,
    );
  }
  if (!Array.isArray(data.days) || data.days.length === 0) {
    throw new Error('metrics JSON must include non-empty "days" array.');
  }
  const wide = [];
  for (const row of data.days) {
    const day = normalizeCalendarDay(row.calendar_day);
    // v2 uses "posters"; v1 files used "labels"/"labels_cumulative" (raw label rows).
    const posters =
      row.posters !== undefined
        ? Number(row.posters)
        : row.labels !== undefined
          ? Number(row.labels)
          : reqNum(row, 'labels_cumulative', day);
    const scans =
      row.scans !== undefined ? Number(row.scans) : reqNum(row, 'scans_cumulative', day);
    if (Number.isNaN(posters) || Number.isNaN(scans)) {
      throw new Error(`Invalid numbers for ${day}`);
    }
    wide.push({ calendar_day: day, posters, scans });
  }
  wide.sort((a, b) => a.calendar_day.localeCompare(b.calendar_day));
  return wide;
}

function writeMetricsDailyJson(wide, eventCount, jsonPath) {
  const payload = {
    schemaVersion: METRICS_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    calendar: CHICAGO_TZ,
    centralToday: chicagoTodayIso(),
    note:
      'Per America/Chicago calendar day: posters = net installed posters (installs minus uninstalls, one per poster_id — QR replacements do not add), scans = cumulative. Nightly workflow should run ~22:00 Central (04:00 UTC) so the chart includes through that local day, not an early UTC tomorrow.',
    eventCount,
    dayCount: wide.length,
    days: wide.map((d) => ({
      calendar_day: d.calendar_day,
      posters: d.posters,
      scans: d.scans,
    })),
  };
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildSpec(wide) {
  const last = wide[wide.length - 1];
  const caption = `Latest (Central): ${last.posters} posters · ${last.scans} scans · through ${last.calendar_day}`;
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
      { fold: ['posters', 'scans'], as: ['metric', 'v'] },
      {
        calculate: "datum.metric == 'posters' ? 'Posters' : 'Scans'",
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
        scale: { domain: ['Posters', 'Scans'], range: ['#7c3aed', '#15803d'] },
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
  const events = extractEventsFromWrangler(wranglerPath);
  const wide = buildDailyCumulativeFromEvents(events, fixtureMode);
  if (wide.length === 0) {
    throw new Error('No metrics rows after expansion.');
  }
  writeMetricsDailyJson(wide, events.length, jsonOut);
  console.log(
    `Wrote ${jsonOut} (${wide.length} Central day(s), ${events.length} event(s), through ${wide[wide.length - 1].calendar_day}).`,
  );
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
