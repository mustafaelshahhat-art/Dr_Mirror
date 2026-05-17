#!/usr/bin/env node

/**
 * i18n key coverage checker.
 *
 * Compares translation keys across Arabic and English locale namespaces.
 * Handles CLDR plural suffix differences: Arabic uses _zero, _one, _two,
 * _few, _many, _other; English uses _one, _other. A key that is a plural
 * form in one language is considered matched if the base key exists in
 * the other language under any plural suffix.
 *
 * Fails on:
 *   - missing keys in either language
 *   - extra namespace files that only exist on one side
 *   - malformed JSON in any locale file
 *
 * Exit code 0 = all required keys present and all files parse.
 * Exit code 1 = parity violations or malformed JSON detected.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const PLURAL_SUFFIXES = {
  en: ['_one', '_other', '_zero'],
  ar: ['_zero', '_one', '_two', '_few', '_many', '_other'],
};

const ALL_PLURAL_SUFFIXES = new Set([...PLURAL_SUFFIXES.en, ...PLURAL_SUFFIXES.ar]);

function collectKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const k of collectKeys(value, fullKey)) keys.add(k);
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function getBaseKey(key) {
  for (const suffix of ALL_PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length);
    }
  }
  return null;
}

function hasPluralMatch(key, targetSet) {
  const base = getBaseKey(key);
  if (base === null) return false;
  for (const suffix of ALL_PLURAL_SUFFIXES) {
    if (targetSet.has(base + suffix)) return true;
  }
  return false;
}

function loadNamespaceKeys(dir, filename, parseErrors) {
  const fullPath = join(dir, filename);
  let raw;
  try {
    raw = readFileSync(fullPath, 'utf-8');
  } catch (err) {
    parseErrors.push({ file: fullPath, message: `read failed: ${err.message}` });
    return null;
  }
  try {
    return collectKeys(JSON.parse(raw));
  } catch (err) {
    parseErrors.push({ file: fullPath, message: err.message });
    return null;
  }
}

function compareDirectories(enDir, arDir) {
  const enFiles = readdirSync(enDir).filter((f) => f.endsWith('.json'));
  const arFiles = new Set(readdirSync(arDir).filter((f) => f.endsWith('.json')));

  const missing = [];
  const parseErrors = [];

  for (const file of enFiles) {
    const ns = basename(file, '.json');
    const enKeys = loadNamespaceKeys(enDir, file, parseErrors);
    if (enKeys === null) continue;

    if (!arFiles.has(file)) {
      for (const key of enKeys) {
        missing.push({ ns, lang: 'ar', key });
      }
      continue;
    }

    const arKeys = loadNamespaceKeys(arDir, file, parseErrors);
    if (arKeys === null) continue;

    for (const key of enKeys) {
      if (arKeys.has(key)) continue;
      if (hasPluralMatch(key, arKeys)) continue;
      missing.push({ ns, lang: 'ar', key });
    }

    for (const key of arKeys) {
      if (enKeys.has(key)) continue;
      if (hasPluralMatch(key, enKeys)) continue;
      missing.push({ ns, lang: 'en', key });
    }
  }

  for (const file of arFiles) {
    if (enFiles.includes(file)) continue;
    const ns = basename(file, '.json');
    const arKeys = loadNamespaceKeys(arDir, file, parseErrors);
    if (arKeys === null) continue;
    for (const key of arKeys) {
      missing.push({ ns, lang: 'en', key });
    }
  }

  return { missing, parseErrors };
}

function groupByNamespace(missing) {
  const byNs = new Map();
  for (const entry of missing) {
    if (!byNs.has(entry.ns)) byNs.set(entry.ns, []);
    byNs.get(entry.ns).push(entry);
  }
  return byNs;
}

const localesDir = join(import.meta.dirname, '..', 'src', 'locales');
const enDir = join(localesDir, 'en');
const arDir = join(localesDir, 'ar');

const { missing, parseErrors } = compareDirectories(enDir, arDir);

if (parseErrors.length > 0) {
  console.error(`✗ Malformed JSON detected (${parseErrors.length}):\n`);
  for (const { file, message } of parseErrors) {
    console.error(`  ${file}`);
    console.error(`    ${message}`);
  }
  process.exit(1);
}

if (missing.length === 0) {
  console.log('✓ All locale keys are covered across en and ar.');
  process.exit(0);
}

const grouped = groupByNamespace(missing);
console.error(`✗ Found ${missing.length} missing key(s) across ${grouped.size} namespace(s):\n`);
for (const [ns, entries] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.error(`  [${ns}]`);
  for (const { lang, key } of entries) {
    console.error(`    (${lang}) ${key}`);
  }
  console.error('');
}
console.error('Hint: ensure every key under src/locales/en/<ns>.json also exists in src/locales/ar/<ns>.json (and vice versa).');
process.exit(1);
