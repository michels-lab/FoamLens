#!/usr/bin/env node
'use strict';

// Offline, read-only comparison of source-backed FoamLens Granada #177 UI audits.
// Do not ingest case data, screenshots, private paths, or arbitrary report text.
const fs = require('node:fs');
const SCHEMA = 'foamlens/granada-177-visible-controls/1';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10000;
const MODES = new Set(['home', 'data', 'field', 'analysis', 'export', 'view', 'review', 'live']);
const STATES = new Set(['missing', 'inactive-not-visual-tested', 'in-more', 'conditional', 'hidden', 'clipped', 'disabled', 'visible']);
const BAD = new Set(['missing', 'conditional', 'hidden', 'clipped', 'disabled']);

function safeId(value, field) {
  if (typeof value !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value)) {
    throw Error('Invalid ' + field + ' (only stable DOM identifiers are accepted)');
  }
  return value;
}
function canonicalMode(value) {
  const mode = String(value || '').toLowerCase();
  if (!MODES.has(mode)) throw Error('Unknown FoamLens mode');
  return mode;
}
function read(file) {
  const stat = fs.statSync(file);
  if (stat.size > MAX_BYTES) throw Error('Audit exceeds 5 MiB');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function normalizeRaw(row, mode, native) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error('Invalid control record');
  const id = safeId(row.id || row.controlId, 'control ID');
  const priority = native ? row.priority : (row.priority || 'contextual');
  if (!['primary', 'contextual', 'more'].includes(priority)) throw Error('Invalid priority for ' + id);
  const active = native ? row.active === true : true;
  const mounted = native ? row.mounted === true : row.mounted !== false;
  const state = native ? row.state : (
    !mounted ? 'missing' : row.hidden === true ? 'hidden' :
    row.clipped === true ? 'clipped' : row.disabled === true ? 'disabled' : 'visible'
  );
  if (!STATES.has(state)) throw Error('Unexpected state for ' + id);
  if (native) {
    if (typeof row.active !== 'boolean' || typeof row.mounted !== 'boolean') throw Error('Missing active/mounted evidence for ' + id);
    if (!active && state !== 'inactive-not-visual-tested' && state !== 'missing') throw Error('Inactive mode falsely marked visually tested');
    if (!mounted && state !== 'missing') throw Error('Unmounted control falsely marked present');
  }
  return {mode, id, priority, active, mounted, state};
}
function index(src) {
  const rows = [], native = !!(src && !Array.isArray(src) && src.schema === SCHEMA);
  if (native) {
    if (!src.evidence || !src.evidence.byMode || typeof src.evidence.byMode !== 'object') throw Error('Missing G0 evidence.byMode');
    for (const [key, records] of Object.entries(src.evidence.byMode)) {
      const mode = canonicalMode(key);
      if (!Array.isArray(records)) throw Error('Invalid G0 mode records');
      for (const item of records) {
        if (item.mode !== mode) throw Error('G0 row/mode disagreement');
        rows.push(normalizeRaw(item, mode, true));
      }
    }
  } else if (Array.isArray(src)) {
    for (const item of src) rows.push(normalizeRaw(item, canonicalMode(item.tab || item.mode), false));
  } else if (src && src.schema) {
    throw Error('Unsupported UI audit schema');
  } else {
    throw Error('Expected G0 audit JSON or a legacy control array');
  }
  if (!rows.length) throw Error('Empty audit is not evidence');
  if (rows.length > MAX_ROWS) throw Error('Too many controls');
  const entries = new Map();
  for (const x of rows) {
    const key = x.mode + '::' + x.id;
    if (entries.has(key)) throw Error('Duplicate control ID within mode');
    entries.set(key, x);
  }
  const context = native ? {
    activeRibbon: src.activeRibbon ?? null,
    activeAppMode: src.activeAppMode ?? null,
    cssWidth: src.viewport?.cssWidth,
    cssHeight: src.viewport?.cssHeight,
    devicePixelRatio: src.viewport?.devicePixelRatio
  } : null;
  if (native && (![context.cssWidth, context.cssHeight, context.devicePixelRatio].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0) ||
    typeof context.activeRibbon !== 'string')) throw Error('Incomplete G0 viewport/active mode context');
  if (native && !MODES.has(context.activeRibbon)) throw Error('Invalid active ribbon');
  return {native, entries, context};
}
function compare(before, after) {
  const a = index(before), b = index(after);
  if (a.native !== b.native) throw Error('Cannot compare different audit schemas');
  const issues = [];
  if (a.native) {
    for (const key of Object.keys(a.context)) {
      if (a.context[key] !== b.context[key]) issues.push(key);
    }
  }
  const result = {
    schemaVersion: 2,
    sourceSchema: a.native ? SCHEMA : 'legacy-control-array',
    comparable: issues.length === 0,
    contextMismatch: issues,
    context: a.context,
    coverage: {before: a.entries.size, after: b.entries.size, visuallyCompared: 0, inactiveUnverified: 0},
    regressions: [], improvements: [], removed: [], newControls: [], reviewRequired: [],
    limitations: [
      'Only controls in the actively rendered G0 mode can be visually compared',
      'Controls moved to More/Advanced are reachable but not permanently visible',
      'Identical audit context does not prove the same simulation data or application state',
      'Installed Windows DPI/screenshot/keyboard and scientific acceptance are still required'
    ]
  };
  // Different viewport/DPI/active ribbon creates invalid causal comparisons; fail closed.
  if (issues.length) return result;
  for (const [key, old] of a.entries) {
    const now = b.entries.get(key);
    const item = {mode: old.mode, id: old.id, priority: old.priority};
    if (!now) {
      if (old.active) result.removed.push({...item, kind: 'removed control'});
      else result.reviewRequired.push({...item, kind: 'inactive control absent from new inventory'});
      continue;
    }
    if (!old.active || !now.active) {
      result.coverage.inactiveUnverified++;
      if (old.mounted !== now.mounted) result.reviewRequired.push({...item, kind: 'mount state changed in inactive screen'});
      continue;
    }
    result.coverage.visuallyCompared++;
    const oldState = old.state, newState = now.state;
    if (oldState === newState) continue;
    if (oldState === 'visible' && (BAD.has(newState) || (old.priority === 'primary' && newState === 'in-more'))) {
      result.regressions.push({...item, from: oldState, to: newState});
    } else if (BAD.has(oldState) && newState === 'visible') {
      result.improvements.push({...item, from: oldState, to: newState});
    } else if (oldState === 'in-more' && newState === 'visible') {
      result.improvements.push({...item, from: oldState, to: newState});
    } else if (BAD.has(newState) && !BAD.has(oldState)) {
      result.regressions.push({...item, from: oldState, to: newState});
    } else {
      result.reviewRequired.push({...item, kind: 'state transition requiring review', from: oldState, to: newState});
    }
  }
  for (const [key, now] of b.entries) {
    if (!a.entries.has(key)) result.newControls.push({mode: now.mode, id: now.id, priority: now.priority, visuallyVerified: now.active});
  }
  return result;
}
function main(args) {
  if (args.length !== 2) throw Error('Usage: node audit-diff.cjs before.json after.json');
  const report = compare(read(args[0]), read(args[1]));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.comparable) return 3;
  if (report.regressions.length || report.removed.length) return 2;
  return 0;
}
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { process.stderr.write('Audit comparison failed: ' + error.message + '\n'); process.exitCode = 1; }
}
module.exports = {SCHEMA, index, compare, main, read};
