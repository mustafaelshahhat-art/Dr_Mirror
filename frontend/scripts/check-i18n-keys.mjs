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
 * Exit code 0 = all required keys present.
 * Exit code 1 = missing keys detected.
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

function loadNamespaceKeys(dir, filename) {
  const raw = readFileSync(join(dir, filename), 'utf-8');
  return collectKeys(JSON.parse(raw));
}

function compareDirectories(enDir, arDir) {
  const enFiles = readdirSync(enDir).filter(f => f.endsWith('.json'));
  const arFiles = new Set(readdirSync(arDir).filter(f => f.endsWith('.json')));

  const missing = [];

  for (const file of enFiles) {
    const ns = basename(file, '.json');
    const enKeys = loadNamespaceKeys(enDir, file);

    if (!arFiles.has(file)) {
      for (const key of enKeys) {
        missing.push({ ns, lang: 'ar', key });
      }
      continue;
    }

    const arKeys = loadNamespaceKeys(arDir, file);

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
    const arKeys = loadNamespaceKeys(arDir, file);
    for (const key of arKeys) {
      missing.push({ ns, lang: 'en', key });
    }
  }

  return missing;
}

const localesDir = join(import.meta.dirname, '..', 'src', 'locales');
const enDir = join(localesDir, 'en');
const arDir = join(localesDir, 'ar');

const missing = compareDirectories(enDir, arDir);

if (missing.length === 0) {
  console.log('✓ All locale keys are covered across en and ar.');
  process.exit(0);
}

console.error(`✗ Found ${missing.length} missing key(s):\n`);
for (const { ns, lang, key } of missing) {
  console.error(`  ${ns} (${lang}): ${key}`);
}
console.error(`\nRun with: node scripts/check-i18n-keys.mjs`);
process.exit(1);
