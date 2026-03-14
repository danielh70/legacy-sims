// ==UserScript==
// @name         Legacy Online Meta Collector
// @namespace    LegacyTools
// @version      0.1.0
// @description  Collect enemy online builds for current-meta analysis and defender-list curation
// @match        https://www.legacy-game.net/onlinenow.php*
// @match        https://dev.legacy-game.net/onlinenow.php*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const NAMESPACE = 'LegacyOnlineMetaCollector';
  if (window[NAMESPACE]) return;

  const VERSION = '0.1.0';
  const DEBUG = true;
  const MIN_PLAYER_LEVEL = 80;
  const REQUEST_DELAY_MS = 350;
  const FETCH_RETRY_COUNT = 1;
  const MISSING_CRYSTAL_SKIP_THRESHOLD = 3;
  const CRYSTAL_SLOTS_PER_ITEM = 4;
  const DEBUG_HTML_SNIPPET_LENGTH = 1600;
  const MAX_LOG_LINES = 80;
  const MAX_SAMPLE_PLAYERS = 5;
  const MAX_CONSOLE_SIGNATURES = 5;
  const STORAGE_KEY_LAST_REPORT = 'legacy-online-meta-collector:last-report';

  const OWN_GANG = 'Outcasts';
  const GANG_ROGUE = 'Rogue';
  const GANG_CHAPTER = 'The Chapter';
  const GANG_DARK_FLAME = 'Dark Flame';
  const GANG_BLADES = 'Blades of Dawn';

  const COSMETIC_ITEM_PREFIXES = [
    'Phoenix Elite',
    'Green Neon',
    'Yellow Neon',
    'Purple Neon',
    'Orange Neon',
    'Blue Neon',
    'Pink Neon',
    'Red Neon',
    'Halloween',
    'Christmas',
    'Aberrant',
    'Neon',
  ];

  const CRYSTAL_NAME_ALIASES = {
    'Tainted Abyss Crystal': 'Abyss Crystal',
    'Green Inferno Crystal': 'Perfect Green Crystal',
    'Orange Inferno Crystal': 'Perfect Orange Crystal',
    'Yellow Inferno Crystal': 'Perfect Yellow Crystal',
  };

  const ALLOWED_GANGS = [GANG_CHAPTER, GANG_DARK_FLAME, GANG_BLADES];
  const EXCLUDED_GANGS = [OWN_GANG, GANG_ROGUE];

  const SELECTORS = {
    maintables: 'table.maintable',
    activePlayerTableTitle: 'Active Player List',
    profileLinks: 'a[href*="profile.php?p="]',
    modelessLinks: 'a[href*="javascript:modelesswin"]',
    popupBlocks: 'table.modblock2',
    popupTables: 'table.maintable',
    slotContextNodes: 'td, tr, div',
  };

  const SLOT_ORDER = ['armor', 'weapon1', 'weapon2', 'misc1', 'misc2'];
  const SLOT_LABELS = {
    armor: 'Armor',
    weapon1: 'Weapon 1',
    weapon2: 'Weapon 2',
    misc1: 'Misc 1',
    misc2: 'Misc 2',
  };
  const SLOT_TYPE_EXPECTATIONS = {
    armor: 'Armor',
    weapon1: 'Weapon',
    weapon2: 'Weapon',
    misc1: 'Misc',
    misc2: 'Misc',
  };
  const SLOT_LABEL_PATTERNS = [
    { slotKey: 'armor', re: /\(\s*armor\s*\)/i },
    { slotKey: 'weapon1', re: /\(\s*weapon\s*1\s*\)/i },
    { slotKey: 'weapon2', re: /\(\s*weapon\s*2\s*\)/i },
    { slotKey: 'misc1', re: /\(\s*misc\s*1\s*\)/i },
    { slotKey: 'misc2', re: /\(\s*misc\s*2\s*\)/i },
  ];

  const GANG_ICON_MAP = new Map([
    ['gang1.png', GANG_CHAPTER],
    ['gang2.png', GANG_DARK_FLAME],
    ['gang3.png', GANG_BLADES],
    ['gang4.png', OWN_GANG],
    ['gang5.png', GANG_ROGUE],
  ]);
  const TAB_GANG_MAP = new Map([
    ['1', GANG_CHAPTER],
    ['2', GANG_DARK_FLAME],
    ['3', GANG_BLADES],
    ['4', OWN_GANG],
    ['5', GANG_ROGUE],
  ]);

  const SUPPORTED_CRYSTAL_NAMES = [
    'Abyss Crystal',
    'Perfect Pink Crystal',
    'Perfect Orange Crystal',
    'Perfect Green Crystal',
    'Perfect Yellow Crystal',
    'Amulet Crystal',
    'Perfect Fire Crystal',
    'Cabrusion Crystal',
    'Berserker Crystal',
  ];

  const SUPPORTED_UPGRADE_NAMES = [
    'Faster Reload 4',
    'Enhanced Scope 4',
    'Faster Ammo 4',
    'Tracer Rounds 4',
    'Sharpened Blade 1',
    'Faster Reload 1',
    'Magnetic Blade 1',
    'Faster Ammo 1',
    'Magnetic Blade 3',
    'Stronger Guard 3',
    'Sharpened Blade 3',
    'Extra Grip 3',
    'Magnetic Blade 2',
    'Enhanced Poison 2',
    'Sharpened Blade 2',
    'Extra Grip 2',
    'Laser Sight',
    'Poisoned Tip',
  ];

  const SUPPORTED_ITEM_META = {
    'SG1 Armor': { type: 'Armor', skillType: '', hasUpgradeSlots: false },
    'Dark Legion Armor': { type: 'Armor', skillType: '', hasUpgradeSlots: false },
    'Hellforged Armor': { type: 'Armor', skillType: '', hasUpgradeSlots: false },
    'Crystal Maul': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: false },
    'Core Staff': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: false },
    'Void Axe': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: false },
    'Scythe T2': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: false },
    'Void Sword': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: false },
    'Reaper Axe': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: false },
    'Split Crystal Bombs T2': { type: 'Weapon', skillType: 'projSkill', hasUpgradeSlots: false },
    'Alien Staff': { type: 'Weapon', skillType: 'projSkill', hasUpgradeSlots: false },
    'Void Bow': { type: 'Weapon', skillType: 'projSkill', hasUpgradeSlots: true },
    'Fortified Void Bow': { type: 'Weapon', skillType: 'projSkill', hasUpgradeSlots: true },
    'Rift Gun': { type: 'Weapon', skillType: 'gunSkill', hasUpgradeSlots: false },
    'Double Barrel Sniper Rifle': { type: 'Weapon', skillType: 'gunSkill', hasUpgradeSlots: false },
    'Q15 Gun': { type: 'Weapon', skillType: 'gunSkill', hasUpgradeSlots: false },
    'Bio Gun Mk4': { type: 'Weapon', skillType: 'gunSkill', hasUpgradeSlots: true },
    'Gun Blade Mk4': { type: 'Weapon', skillType: 'gunSkill', hasUpgradeSlots: true },
    'Ritual Dagger IV': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: true },
    'Warlords Katana': { type: 'Weapon', skillType: 'meleeSkill', hasUpgradeSlots: true },
    'Bio Spinal Enhancer': { type: 'Misc', skillType: '', hasUpgradeSlots: false },
    'Scout Drones': { type: 'Misc', skillType: '', hasUpgradeSlots: false },
    'Droid Drone': { type: 'Misc', skillType: '', hasUpgradeSlots: false },
    'Orphic Amulet': { type: 'Misc', skillType: '', hasUpgradeSlots: false },
    'Projector Bots': { type: 'Misc', skillType: '', hasUpgradeSlots: false },
    'Nerve Gauntlet': { type: 'Misc', skillType: '', hasUpgradeSlots: false },
    'Recon Drones': { type: 'Misc', skillType: '', hasUpgradeSlots: false },
  };

  const SUPPORTED_ITEM_NAMES = Object.keys(SUPPORTED_ITEM_META);
  const COSMETIC_ITEM_PREFIXES_SORTED = COSMETIC_ITEM_PREFIXES.slice().sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );

  const SUPPORTED_ITEM_SET = new Set(SUPPORTED_ITEM_NAMES);
  const SUPPORTED_CRYSTAL_SET = new Set(SUPPORTED_CRYSTAL_NAMES);
  const SUPPORTED_UPGRADE_SET = new Set(SUPPORTED_UPGRADE_NAMES);
  const SIM_READY_IMPUTATION_CONFIDENCE_HIGH = 'high';
  const SIM_READY_IMPUTATION_CONFIDENCE_MEDIUM = 'medium';
  const SIM_READY_IMPUTATION_RULE_3_SAME_1_MISSING = '3_same_1_missing';
  const SIM_READY_IMPUTATION_RULE_2_SAME_2_MISSING = '2_same_2_missing';

  const state = {
    scanning: false,
    stopRequested: false,
    activeControllers: new Set(),
    lastRequestAt: 0,
    counters: emptyCounters(),
    report: loadLastReport(),
    logs: [],
    panel: null,
    ui: null,
  };

  function emptyCounters() {
    return {
      rowsScanned: 0,
      allowedGangPlayersFound: 0,
      profilesFetched: 0,
      acceptedBuilds: 0,
      skippedBuilds: 0,
    };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function normalizeWhitespace(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function textOf(node) {
    if (!node) return '';
    return normalizeWhitespace(node.innerText || node.textContent || '');
  }

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  function stableStringify(value) {
    if (value === null) return 'null';
    const t = typeof value;
    if (t === 'number' || t === 'boolean') return String(value);
    if (t === 'string') return JSON.stringify(value);
    if (t !== 'object') return JSON.stringify(String(value));
    if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toAbsoluteUrl(url, base) {
    return new URL(String(url || ''), base || window.location.href).href;
  }

  function previewText(value, maxLen) {
    const text = normalizeWhitespace(value);
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
  }

  function previewHtml(html, maxLen = DEBUG_HTML_SNIPPET_LENGTH) {
    return previewText(String(html || '').replace(/\s+/g, ' '), maxLen);
  }

  function objectFromCounts(names) {
    const out = Object.create(null);
    for (const name of names || []) {
      const key = String(name || '').trim();
      if (!key) continue;
      out[key] = (out[key] || 0) + 1;
    }
    return out;
  }

  function uniqueSorted(values) {
    return Array.from(new Set((values || []).filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
  }

  function sortByGangOrder(values) {
    const rank = new Map([
      [GANG_CHAPTER, 1],
      [GANG_DARK_FLAME, 2],
      [GANG_BLADES, 3],
      [OWN_GANG, 4],
      [GANG_ROGUE, 5],
    ]);
    return Array.from(new Set((values || []).filter(Boolean))).sort((a, b) => {
      const ra = rank.has(a) ? rank.get(a) : 999;
      const rb = rank.has(b) ? rank.get(b) : 999;
      if (ra !== rb) return ra - rb;
      return String(a).localeCompare(String(b));
    });
  }

  function slugify(value) {
    return (
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'unnamed'
    );
  }

  function formatFileTimestamp(isoString) {
    const d = isoString ? new Date(isoString) : new Date();
    const yyyy = String(d.getFullYear()).padStart(4, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText(value) {
    const text = String(value == null ? '' : value);
    if (!text) return false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        // Fall back below.
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (_) {
      ok = false;
    }
    textarea.remove();
    return ok;
  }

  function loadLastReport() {
    const raw = window.localStorage.getItem(STORAGE_KEY_LAST_REPORT);
    return raw ? safeJsonParse(raw) : null;
  }

  function saveLastReport(report) {
    if (!report) {
      window.localStorage.removeItem(STORAGE_KEY_LAST_REPORT);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY_LAST_REPORT, JSON.stringify(report));
  }

  function log(message) {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    state.logs.push(line);
    if (state.logs.length > MAX_LOG_LINES) state.logs.splice(0, state.logs.length - MAX_LOG_LINES);
    renderUi();
  }

  function createEmptyReport() {
    return {
      createdAt: nowIso(),
      pageUrl: window.location.href,
      minPlayerLevel: MIN_PLAYER_LEVEL,
      allowedGangs: ALLOWED_GANGS.slice(),
      excludedGangs: EXCLUDED_GANGS.slice(),
      totals: {
        rowsScanned: 0,
        allowedGangPlayersFound: 0,
        profilesFetched: 0,
        acceptedBuilds: 0,
        skippedBuilds: 0,
        skippedByReason: {},
        stopped: false,
        requestDelayMs: REQUEST_DELAY_MS,
        fetchRetryCount: FETCH_RETRY_COUNT,
        missingCrystalSkipThreshold: MISSING_CRYSTAL_SKIP_THRESHOLD,
        normalizedItemCount: 0,
        normalizedCrystalCount: 0,
        totalImputedSlots: 0,
        totalHighConfidenceImputations: 0,
        totalMediumConfidenceImputations: 0,
      },
      rawSightings: [],
      acceptedBuilds: [],
      skippedBuilds: [],
      buildFrequencySummary: [],
      archetypeSummary: [],
      defenderStarterSnippets: [],
      normalizationSummary: [],
      crystalNormalizationSummary: [],
      imputationSummary: [],
    };
  }

  function incSkipReason(report, reason) {
    report.totals.skippedByReason[reason] = (report.totals.skippedByReason[reason] || 0) + 1;
  }

  function updateTotalsFromState(report) {
    report.totals.rowsScanned = state.counters.rowsScanned;
    report.totals.allowedGangPlayersFound = state.counters.allowedGangPlayersFound;
    report.totals.profilesFetched = state.counters.profilesFetched;
    report.totals.acceptedBuilds = state.counters.acceptedBuilds;
    report.totals.skippedBuilds = state.counters.skippedBuilds;
  }

  function htmlToDocument(html) {
    return new DOMParser().parseFromString(String(html || ''), 'text/html');
  }

  function gangFromPageUrl(url) {
    const parsed = new URL(url || window.location.href, window.location.href);
    return TAB_GANG_MAP.get(parsed.searchParams.get('g') || '') || '';
  }

  function gangFromRow(row, pageGangHint) {
    const icon = row ? row.querySelector('img[src*="gang"]') : null;
    if (icon) {
      const src = String(icon.getAttribute('src') || '').toLowerCase();
      for (const [needle, gangName] of GANG_ICON_MAP.entries()) {
        if (src.includes(needle)) return gangName;
      }
    }
    return pageGangHint || '';
  }

  function extractProfileUrl(row) {
    const link = row ? row.querySelector(SELECTORS.profileLinks) : null;
    if (!link) return '';
    return toAbsoluteUrl(link.getAttribute('href') || '', window.location.href);
  }

  function playerNameFromProfileUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return normalizeWhitespace(parsed.searchParams.get('p') || '');
    } catch (_) {
      return '';
    }
  }

  function parseLevelFromText(text) {
    const match = normalizeWhitespace(text).match(/\b(?:lvl?|level)\s*[:.]?\s*(\d{1,3})\b/i);
    return match ? Number(match[1]) : null;
  }

  function cellTextList(row) {
    return Array.from((row && row.querySelectorAll('td')) || []).map((cell) => textOf(cell));
  }

  function detectActivePlayerTableColumns(table) {
    const rows = Array.from((table && table.querySelectorAll('tr')) || []);
    const out = {
      levelColumnIndex: null,
      locationColumnIndex: null,
    };

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      cells.forEach((cell, idx) => {
        const value = textOf(cell).toLowerCase();
        if (out.levelColumnIndex == null && value === 'level') out.levelColumnIndex = idx;
        if (out.locationColumnIndex == null && value === 'location') out.locationColumnIndex = idx;
      });
    });

    return out;
  }

  function parseBareLevelCell(text) {
    const value = normalizeWhitespace(text);
    if (!value) return null;
    const labeled = parseLevelFromText(value);
    if (labeled !== null) return labeled;
    return /^\d{1,3}$/.test(value) ? Number(value) : null;
  }

  function parseLevelFromRow(row, columnHints) {
    const cells = Array.from((row && row.querySelectorAll('td')) || []);
    if (!cells.length) return parseLevelFromText(textOf(row));

    const levelColumnIndex =
      columnHints && Number.isInteger(columnHints.levelColumnIndex)
        ? columnHints.levelColumnIndex
        : null;

    if (levelColumnIndex != null && cells[levelColumnIndex]) {
      const exact = parseBareLevelCell(textOf(cells[levelColumnIndex]));
      if (exact !== null) return exact;
    }

    const numericOnlyCells = cells
      .map((cell, idx) => ({
        idx,
        value: textOf(cell),
        hasProfileLink: Boolean(cell.querySelector(SELECTORS.profileLinks)),
        hasActionLink: Boolean(
          cell.querySelector('a[href*="attack"], a[href*="mail"], a[href*="message"]'),
        ),
      }))
      .filter(
        (entry) => /^\d{1,3}$/.test(entry.value) && !entry.hasProfileLink && !entry.hasActionLink,
      );
    if (numericOnlyCells.length) return Number(numericOnlyCells[numericOnlyCells.length - 1].value);

    for (const cell of cells) {
      const fallback = parseBareLevelCell(textOf(cell));
      if (fallback !== null) return fallback;
    }

    return parseLevelFromText(textOf(row));
  }

  function isLikelyLocationText(value, playerName) {
    if (!value) return false;
    if (playerName && value.includes(playerName)) return false;
    if (/^(attack|profile|spy|mail|message|fight)$/i.test(value)) return false;
    if (/\b(level|lvl)\b/i.test(value)) return false;
    if (/^\d+$/.test(value)) return false;
    if (/(chapter|dark flame|blade|blades|outcasts|rogue)/i.test(value)) return false;
    return value.length > 2 && /[a-z]/i.test(value);
  }

  function parseLocationFromRow(row, playerName, columnHints) {
    const cells = cellTextList(row);
    const locationColumnIndex =
      columnHints && Number.isInteger(columnHints.locationColumnIndex)
        ? columnHints.locationColumnIndex
        : null;

    if (locationColumnIndex != null && cells[locationColumnIndex]) {
      const exact = cells[locationColumnIndex];
      if (isLikelyLocationText(exact, playerName)) return exact;
    }

    for (const value of cells) {
      if (isLikelyLocationText(value, playerName)) return value;
    }

    return null;
  }

  function parseOnlinePlayersFromDocument(doc) {
    const pageGangHint = gangFromPageUrl(window.location.href);
    const tables = Array.from(doc.querySelectorAll(SELECTORS.maintables));
    const activeTable = tables.find((table) =>
      textOf(table).includes(SELECTORS.activePlayerTableTitle),
    );
    if (!activeTable) return [];

    const columnHints = detectActivePlayerTableColumns(activeTable);
    const rows = Array.from(activeTable.querySelectorAll('tr'));
    const players = [];
    rows.forEach((row, idx) => {
      const profileUrl = extractProfileUrl(row);
      if (!profileUrl) return;

      const playerName = playerNameFromProfileUrl(profileUrl) || textOf(row.querySelector('a'));
      const rowText = textOf(row);
      players.push({
        rowIndex: idx,
        playerName,
        gangName: gangFromRow(row, pageGangHint),
        profileUrl,
        level: parseLevelFromRow(row, columnHints),
        location: parseLocationFromRow(row, playerName, columnHints),
        rowText,
      });
    });

    return players;
  }

  function skipReasonForGang(gangName) {
    if (!gangName) return 'skipped_disallowed_gang';
    if (gangName === OWN_GANG) return 'skipped_own_gang';
    if (gangName === GANG_ROGUE) return 'skipped_rogue';
    if (!ALLOWED_GANGS.includes(gangName)) return 'skipped_disallowed_gang';
    return '';
  }

  function shouldSkipByLevel(playerRowData) {
    if (!playerRowData || !Number.isFinite(playerRowData.level)) return null;
    if (playerRowData.level >= MIN_PLAYER_LEVEL) return null;
    return {
      skipReason: 'skipped_below_min_level',
      message: `level ${playerRowData.level} < ${MIN_PLAYER_LEVEL}`,
    };
  }

  function slotKeyFromText(text) {
    const raw = normalizeWhitespace(text);
    for (const entry of SLOT_LABEL_PATTERNS) {
      if (entry.re.test(raw)) return entry.slotKey;
    }
    return '';
  }

  function extractModelessUrl(href) {
    const raw = String(href || '').trim();
    const match = raw.match(/modelesswin\(\s*['"]([^'"]+)['"]/i);
    return match ? toAbsoluteUrl(match[1], window.location.href) : '';
  }

  function slotCandidateFromAnchor(anchor) {
    const contextCandidates = [];
    if (anchor && anchor.closest) {
      contextCandidates.push(anchor.closest('td'));
      contextCandidates.push(anchor.closest('tr'));
      contextCandidates.push(anchor.parentElement);
      contextCandidates.push(anchor.parentElement && anchor.parentElement.parentElement);
    }
    for (const node of contextCandidates) {
      const slotKey = slotKeyFromText(textOf(node));
      if (!slotKey) continue;
      const img = anchor.querySelector('img[alt]');
      return {
        slotKey,
        slotLabel: SLOT_LABELS[slotKey],
        popupUrl: extractModelessUrl(anchor.getAttribute('href') || ''),
        profileItemNameFallback: normalizeWhitespace(
          img ? img.getAttribute('alt') || '' : textOf(anchor),
        ),
        contextText: previewText(textOf(node), 240),
      };
    }
    return null;
  }

  function parseProfileBuild(doc) {
    const slots = {
      armor: null,
      weapon1: null,
      weapon2: null,
      misc1: null,
      misc2: null,
    };
    const seen = new Set();
    const anchors = Array.from(doc.querySelectorAll(SELECTORS.modelessLinks));
    for (const anchor of anchors) {
      const candidate = slotCandidateFromAnchor(anchor);
      if (!candidate || seen.has(candidate.slotKey)) continue;
      seen.add(candidate.slotKey);
      slots[candidate.slotKey] = candidate;
    }

    return {
      slots,
      missingSlots: SLOT_ORDER.filter((slotKey) => !slots[slotKey]),
      gearLinkCount: anchors.length,
    };
  }

  async function waitForRequestTurn() {
    const sinceLast = Date.now() - state.lastRequestAt;
    const wait = Math.max(0, REQUEST_DELAY_MS - sinceLast);
    if (wait > 0) await sleep(wait);
    state.lastRequestAt = Date.now();
  }

  async function fetchHtml(url) {
    const absoluteUrl = toAbsoluteUrl(url, window.location.href);
    let lastError = null;

    for (let attempt = 0; attempt <= FETCH_RETRY_COUNT; attempt += 1) {
      if (state.stopRequested) throw new Error('Stopped');
      if (attempt > 0) log(`Retry ${attempt}/${FETCH_RETRY_COUNT}: ${absoluteUrl}`);
      await waitForRequestTurn();

      const controller = new AbortController();
      state.activeControllers.add(controller);
      try {
        const response = await window.fetch(absoluteUrl, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const html = await response.text();
        return html;
      } catch (error) {
        lastError = error;
        if (state.stopRequested) {
          const stopped = new Error('Stopped');
          stopped.isStopped = true;
          throw stopped;
        }
      } finally {
        state.activeControllers.delete(controller);
      }
    }

    throw lastError || new Error(`Fetch failed for ${absoluteUrl}`);
  }

  function extractPopupTitleText(doc) {
    const tables = Array.from(doc.querySelectorAll(SELECTORS.popupTables));
    for (const table of tables) {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (!rows.length) continue;
      const text = textOf(rows[0]);
      if (text) return text;
    }
    return '';
  }

  function rawItemNameFromPopupTitle(titleText, fallbackName) {
    const raw = normalizeWhitespace(titleText);
    const cleanedTitle = raw.replace(/\s+\(\s*[^()]+\s*\)\s*$/, '').trim();
    if (cleanedTitle) return cleanedTitle;
    return normalizeWhitespace(fallbackName);
  }

  function popupRows(doc) {
    return Array.from(doc.querySelectorAll(SELECTORS.popupBlocks)).flatMap((table) =>
      Array.from(table.querySelectorAll('tr')),
    );
  }

  function modRowName(row) {
    const rowText = textOf(row);
    if (!rowText) return '';
    const directName = rowText.match(/^(.*?)(?:\s*\(|$)/);
    return normalizeWhitespace(directName ? directName[1] : rowText);
  }

  function parseItemPopup(html, options) {
    const fallbackName = normalizeWhitespace(options && options.fallbackName);
    const slotKey = options && options.slotKey ? options.slotKey : '';
    const doc = htmlToDocument(html);
    const titleText = extractPopupTitleText(doc);
    const rawItemName = rawItemNameFromPopupTitle(titleText, fallbackName);

    if (!rawItemName) {
      return {
        ok: false,
        error: 'Unable to parse popup item name',
        titleText,
        debug: DEBUG ? { popupHtmlSnippet: previewHtml(html) } : undefined,
      };
    }

    const rows = popupRows(doc);
    const crystals = [];
    const rawCrystalNames = [];
    const upgrades = [];
    const unknownCrystalRows = [];
    const unknownUpgradeRows = [];
    const rawModRows = [];
    const crystalNormalizationEntries = [];

    let crystalRowSlotsConsumed = 0;
    rows.forEach((row) => {
      const name = modRowName(row);
      if (!name) return;
      rawModRows.push(name);

      const crystalInfo = normalizeCrystalName(name);
      if (crystalInfo.supported) {
        if (crystals.length < CRYSTAL_SLOTS_PER_ITEM) {
          crystals.push(crystalInfo.normalizedName);
          rawCrystalNames.push(crystalInfo.rawName);
          if (crystalInfo.normalizationApplied) {
            crystalNormalizationEntries.push({
              rawName: crystalInfo.rawName,
              normalizedName: crystalInfo.normalizedName,
              normalizationReason: crystalInfo.normalizationReason,
            });
          }
        }
        crystalRowSlotsConsumed = Math.min(CRYSTAL_SLOTS_PER_ITEM, crystalRowSlotsConsumed + 1);
        return;
      }

      if (SUPPORTED_UPGRADE_SET.has(name)) {
        upgrades.push(name);
        return;
      }

      const rowText = textOf(row);
      const imgSrc = String(
        (row.querySelector('img') && row.querySelector('img').getAttribute('src')) || '',
      );
      const looksLikeCrystal =
        /crystal/i.test(name) ||
        /crystal/i.test(rowText) ||
        /crystal/i.test(imgSrc) ||
        crystalRowSlotsConsumed < CRYSTAL_SLOTS_PER_ITEM;

      if (looksLikeCrystal && crystalRowSlotsConsumed < CRYSTAL_SLOTS_PER_ITEM) {
        unknownCrystalRows.push(name);
        crystalRowSlotsConsumed += 1;
        return;
      }

      unknownUpgradeRows.push(name);
    });

    const missingCrystalSlots = Math.max(0, CRYSTAL_SLOTS_PER_ITEM - crystals.length);
    const itemMeta = SUPPORTED_ITEM_META[rawItemName] || null;

    return {
      ok: true,
      rawItemName,
      titleText,
      slotKey,
      rawCrystalNames: rawCrystalNames.slice(0, CRYSTAL_SLOTS_PER_ITEM),
      crystals: crystals.slice(0, CRYSTAL_SLOTS_PER_ITEM),
      crystalCounts: objectFromCounts(crystals.slice(0, CRYSTAL_SLOTS_PER_ITEM)),
      upgrades: upgrades.slice(),
      rawModRows,
      crystalNormalizationEntries,
      unknownCrystals: unknownCrystalRows,
      unknownUpgrades: unknownUpgradeRows,
      missingCrystalSlots,
      supportedItem: Boolean(itemMeta),
      supported: Boolean(itemMeta) && !unknownUpgradeRows.length,
      debug:
        DEBUG && (unknownCrystalRows.length || unknownUpgradeRows.length)
          ? {
              popupHtmlSnippet: previewHtml(html),
              titleText,
              rawModRows,
            }
          : undefined,
    };
  }

  function normalizeItemName(rawName) {
    const raw = normalizeWhitespace(rawName);
    if (!raw) {
      return {
        rawName: '',
        normalizedName: '',
        normalizationApplied: false,
        normalizationReason: '',
        matchedPrefix: '',
        supported: false,
      };
    }

    if (SUPPORTED_ITEM_SET.has(raw)) {
      return {
        rawName: raw,
        normalizedName: raw,
        normalizationApplied: false,
        normalizationReason: 'exact_match',
        matchedPrefix: '',
        supported: true,
      };
    }

    const rawLower = raw.toLowerCase();
    for (const prefix of COSMETIC_ITEM_PREFIXES_SORTED) {
      const prefixLower = prefix.toLowerCase();
      if (!rawLower.startsWith(`${prefixLower} `)) continue;
      const stripped = raw.slice(prefix.length).trim();
      if (!SUPPORTED_ITEM_SET.has(stripped)) continue;
      return {
        rawName: raw,
        normalizedName: stripped,
        normalizationApplied: true,
        normalizationReason: 'cosmetic_prefix_strip',
        matchedPrefix: prefix,
        supported: true,
      };
    }

    return {
      rawName: raw,
      normalizedName: raw,
      normalizationApplied: false,
      normalizationReason: '',
      matchedPrefix: '',
      supported: false,
    };
  }

  function normalizeCrystalName(rawName) {
    const raw = normalizeWhitespace(rawName);
    if (!raw) {
      return {
        rawName: '',
        normalizedName: '',
        normalizationApplied: false,
        normalizationReason: '',
        supported: false,
      };
    }

    if (SUPPORTED_CRYSTAL_SET.has(raw)) {
      return {
        rawName: raw,
        normalizedName: raw,
        normalizationApplied: false,
        normalizationReason: 'exact_match',
        supported: true,
      };
    }

    const aliased = CRYSTAL_NAME_ALIASES[raw] || '';
    if (aliased && SUPPORTED_CRYSTAL_SET.has(aliased)) {
      return {
        rawName: raw,
        normalizedName: aliased,
        normalizationApplied: true,
        normalizationReason: 'alias_map',
        supported: true,
      };
    }

    return {
      rawName: raw,
      normalizedName: raw,
      normalizationApplied: false,
      normalizationReason: '',
      supported: false,
    };
  }

  function normalizeSlot(slotKey, slotData) {
    const rawItemName = normalizeWhitespace(
      slotData && (slotData.rawItemName || slotData.itemName || slotData.name),
    );
    if (!slotData || !rawItemName) return null;

    const itemNameInfo = normalizeItemName(rawItemName);
    const itemName = itemNameInfo.normalizedName || rawItemName;
    const itemMeta = SUPPORTED_ITEM_META[itemName] || null;
    const crystalNames = (slotData.crystals || []).filter((name) => SUPPORTED_CRYSTAL_SET.has(name));
    const rawCrystalNames = Array.isArray(slotData.rawCrystalNames)
      ? slotData.rawCrystalNames
          .map((name) => normalizeWhitespace(name))
          .filter(Boolean)
          .slice(0, crystalNames.length)
      : crystalNames.slice();
    const supportedUpgrades = (slotData.upgrades || []).filter((name) =>
      SUPPORTED_UPGRADE_SET.has(name),
    );

    const out = {
      rawName: rawItemName,
      name: itemName,
      rawCrystalNames,
      crystals: crystalNames,
      crystalCounts: objectFromCounts(crystalNames),
      upgrades: supportedUpgrades,
      supported: Boolean(itemMeta) && itemNameInfo.supported && !slotData.unknownUpgrades.length,
      missingCrystalSlots: Math.max(0, Number(slotData.missingCrystalSlots || 0)),
      itemType: itemMeta ? itemMeta.type : '',
      skillType: itemMeta ? itemMeta.skillType : '',
      hasUpgradeSlots: itemMeta ? itemMeta.hasUpgradeSlots : false,
      unknownCrystalNames: (slotData.unknownCrystals || []).slice(),
      unknownUpgradeNames: (slotData.unknownUpgrades || []).slice(),
      normalizationApplied: itemNameInfo.normalizationApplied,
      normalizationReason: itemNameInfo.normalizationReason,
      matchedPrefix: itemNameInfo.matchedPrefix,
      crystalNormalizationEntries: Array.isArray(slotData.crystalNormalizationEntries)
        ? deepClone(slotData.crystalNormalizationEntries)
        : [],
      source: 'item_popup',
      slotKey,
    };
    if (itemNameInfo.normalizationApplied) out.normalizedFrom = rawItemName;
    return out;
  }

  function countMissingCrystalSlots(build) {
    return SLOT_ORDER.reduce(
      (sum, slotKey) => sum + Number(build[slotKey]?.missingCrystalSlots || 0),
      0,
    );
  }

  function normalizeBuildAgainstDefs(parsedBuild) {
    const build = {};
    const unknownItems = [];
    const unsupportedUpgrades = [];
    const slotIssues = [];

    SLOT_ORDER.forEach((slotKey) => {
      const normalized = normalizeSlot(slotKey, parsedBuild[slotKey]);
      build[slotKey] = normalized;

      if (!normalized) {
        slotIssues.push({ slotKey, issue: 'missing_slot_data' });
        return;
      }

      if (!SUPPORTED_ITEM_SET.has(normalized.name)) {
        unknownItems.push({
          slotKey,
          rawName: normalized.rawName,
          itemName: normalized.name,
          normalizationApplied: normalized.normalizationApplied,
          matchedPrefix: normalized.matchedPrefix,
        });
      }

      if (normalized.itemType !== SLOT_TYPE_EXPECTATIONS[slotKey]) {
        slotIssues.push({
          slotKey,
          issue: 'slot_type_mismatch',
          expected: SLOT_TYPE_EXPECTATIONS[slotKey],
          actual: normalized.itemType || '',
          itemName: normalized.name,
        });
      }

      if (normalized.unknownUpgradeNames.length) {
        unsupportedUpgrades.push({
          slotKey,
          itemName: normalized.name,
          unknownUpgradeNames: normalized.unknownUpgradeNames.slice(),
        });
      }
    });

    return {
      build,
      unknownItems,
      unsupportedUpgrades,
      slotIssues,
      totalMissingCrystalSlots: countMissingCrystalSlots(build),
    };
  }

  function slotSignature(slot) {
    if (!slot || !slot.name) return 'missing';
    const crystals = slot.crystals.length ? slot.crystals.join(' > ') : '-';
    const upgrades = slot.upgrades.length ? slot.upgrades.join(' + ') : '-';
    return `${slot.name}|C:${crystals}|M:${slot.missingCrystalSlots}|U:${upgrades}`;
  }

  function buildSignature(build) {
    return SLOT_ORDER.map((slotKey) => `${slotKey}:${slotSignature(build[slotKey])}`).join(' || ');
  }

  function buildLabelHint(build) {
    const weapons = [build.weapon1?.name || '', build.weapon2?.name || '']
      .filter(Boolean)
      .join(' + ');
    const miscs = [build.misc1?.name || '', build.misc2?.name || ''].filter(Boolean).join(' + ');
    return `${build.armor?.name || 'Unknown Armor'} | ${weapons || 'Unknown Weapons'} | ${miscs || 'Unknown Miscs'}`;
  }

  function normalizationEntriesFromBuild(build) {
    if (!build) return [];
    return SLOT_ORDER.map((slotKey) => build[slotKey])
      .filter((slot) => slot && slot.normalizationApplied && slot.rawName && slot.name)
      .map((slot) => ({
        slotKey: slot.slotKey,
        rawName: slot.rawName,
        normalizedName: slot.name,
        matchedPrefix: slot.matchedPrefix || '',
      }));
  }

  function crystalNormalizationEntriesFromBuild(build) {
    if (!build) return [];
    return SLOT_ORDER.flatMap((slotKey) => {
      const slot = build[slotKey];
      if (!slot || !Array.isArray(slot.crystalNormalizationEntries)) return [];
      return slot.crystalNormalizationEntries
        .filter((entry) => entry && entry.rawName && entry.normalizedName)
        .map((entry) => ({
          slotKey: slot.slotKey,
          rawName: entry.rawName,
          normalizedName: entry.normalizedName,
          normalizationReason: entry.normalizationReason || '',
        }));
    });
  }

  function normalizationLogSuffix(build) {
    const itemEntries = normalizationEntriesFromBuild(build);
    const crystalEntries = crystalNormalizationEntriesFromBuild(build);
    const segments = [];

    if (itemEntries.length) {
      const parts = itemEntries.slice(0, 4).map((entry) => `${entry.rawName} -> ${entry.normalizedName}`);
      if (itemEntries.length > 4) parts.push(`+${itemEntries.length - 4} more`);
      segments.push(`normalized items: ${parts.join('; ')}`);
    }

    if (crystalEntries.length) {
      const parts = crystalEntries
        .slice(0, 4)
        .map((entry) => `${entry.rawName} -> ${entry.normalizedName}`);
      if (crystalEntries.length > 4) parts.push(`+${crystalEntries.length - 4} more`);
      segments.push(`normalized crystals: ${parts.join('; ')}`);
    }

    return segments.length ? ` | ${segments.join(' | ')}` : '';
  }

  function inferSlotCrystalsForSimulation(slot) {
    if (!slot) return null;

    const out = deepClone(slot);
    const collectedCrystals = Array.isArray(slot.crystals)
      ? slot.crystals.slice(0, CRYSTAL_SLOTS_PER_ITEM)
      : [];
    const numericMissingCrystalSlots = Number(slot.missingCrystalSlots);
    const collectedMissingCrystalSlots = Math.max(
      0,
      Number.isFinite(numericMissingCrystalSlots)
        ? Math.max(
            numericMissingCrystalSlots,
            CRYSTAL_SLOTS_PER_ITEM - collectedCrystals.length,
          )
        : CRYSTAL_SLOTS_PER_ITEM - collectedCrystals.length,
    );
    const uniqueKnownCrystals = uniqueSorted(collectedCrystals);
    const simReadyCrystals = collectedCrystals.slice();

    let imputed = false;
    let imputationConfidence = '';
    let imputationRule = '';
    let imputedCrystalName = '';
    let imputedCrystalCount = 0;

    if (
      collectedCrystals.length === 3 &&
      collectedMissingCrystalSlots === 1 &&
      uniqueKnownCrystals.length === 1
    ) {
      imputed = true;
      imputationConfidence = SIM_READY_IMPUTATION_CONFIDENCE_HIGH;
      imputationRule = SIM_READY_IMPUTATION_RULE_3_SAME_1_MISSING;
      imputedCrystalName = uniqueKnownCrystals[0];
      imputedCrystalCount = 1;
      simReadyCrystals.push(imputedCrystalName);
    } else if (
      collectedCrystals.length === 2 &&
      collectedMissingCrystalSlots === 2 &&
      uniqueKnownCrystals.length === 1
    ) {
      imputed = true;
      imputationConfidence = SIM_READY_IMPUTATION_CONFIDENCE_MEDIUM;
      imputationRule = SIM_READY_IMPUTATION_RULE_2_SAME_2_MISSING;
      imputedCrystalName = uniqueKnownCrystals[0];
      imputedCrystalCount = 2;
      simReadyCrystals.push(imputedCrystalName, imputedCrystalName);
    }

    out.collectedCrystals = collectedCrystals.slice();
    out.collectedCrystalCounts = objectFromCounts(collectedCrystals);
    out.collectedMissingCrystalSlots = collectedMissingCrystalSlots;
    out.crystals = simReadyCrystals.slice(0, CRYSTAL_SLOTS_PER_ITEM);
    out.crystalCounts = objectFromCounts(out.crystals);
    out.missingCrystalSlots = Math.max(0, CRYSTAL_SLOTS_PER_ITEM - out.crystals.length);
    out.imputed = imputed;
    out.imputationConfidence = imputationConfidence;
    out.imputationRule = imputationRule;
    out.imputedCrystalName = imputedCrystalName;
    out.imputedCrystalCount = imputedCrystalCount;
    out.simReadySource = imputed ? 'derived_imputation' : 'collected';
    return out;
  }

  function buildSimReadyVariant(build) {
    const simReadyBuild = {};
    const imputationEntries = [];
    let totalImputedSlots = 0;
    let totalHighConfidenceImputations = 0;
    let totalMediumConfidenceImputations = 0;

    SLOT_ORDER.forEach((slotKey) => {
      const simReadySlot = inferSlotCrystalsForSimulation(build ? build[slotKey] : null);
      simReadyBuild[slotKey] = simReadySlot;

      if (!simReadySlot || !simReadySlot.imputed || !simReadySlot.imputedCrystalName) return;

      totalImputedSlots += 1;
      if (simReadySlot.imputationConfidence === SIM_READY_IMPUTATION_CONFIDENCE_HIGH) {
        totalHighConfidenceImputations += 1;
      } else if (simReadySlot.imputationConfidence === SIM_READY_IMPUTATION_CONFIDENCE_MEDIUM) {
        totalMediumConfidenceImputations += 1;
      }

      imputationEntries.push({
        slotKey,
        crystalName: simReadySlot.imputedCrystalName,
        imputationConfidence: simReadySlot.imputationConfidence,
        imputationRule: simReadySlot.imputationRule,
        collectedCrystalCount: simReadySlot.collectedCrystals.length,
        finalCrystalCount: simReadySlot.crystals.length,
        imputedCrystalCount: simReadySlot.imputedCrystalCount,
      });
    });

    return {
      build: simReadyBuild,
      totalImputedSlots,
      totalHighConfidenceImputations,
      totalMediumConfidenceImputations,
      imputationEntries,
    };
  }

  function withSimReadyBuildData(entry) {
    if (!entry) return null;
    if (!entry.build) return deepClone(entry);
    const out = deepClone(entry);
    const simReady = buildSimReadyVariant(out.build);
    out.simReadyBuild = simReady.build;
    out.simReadyImputation = {
      totalImputedSlots: simReady.totalImputedSlots,
      totalHighConfidenceImputations: simReady.totalHighConfidenceImputations,
      totalMediumConfidenceImputations: simReady.totalMediumConfidenceImputations,
      entries: simReady.imputationEntries,
    };
    return out;
  }

  function enrichAcceptedEntriesWithSimReady(entries) {
    return (entries || []).map((entry) => withSimReadyBuildData(entry));
  }

  function imputationEntriesFromAcceptedEntry(entry) {
    const existingEntries = entry?.simReadyImputation?.entries;
    if (Array.isArray(existingEntries)) return existingEntries.filter(Boolean);
    const simReadyEntry = entry && entry.build ? withSimReadyBuildData(entry) : null;
    const entries = simReadyEntry?.simReadyImputation?.entries;
    return Array.isArray(entries) ? entries.filter(Boolean) : [];
  }

  function summarizeImputations(entries) {
    const map = new Map();
    let totalImputedSlots = 0;
    let totalHighConfidenceImputations = 0;
    let totalMediumConfidenceImputations = 0;

    (entries || []).forEach((entry) => {
      imputationEntriesFromAcceptedEntry(entry).forEach((imputation) => {
        totalImputedSlots += 1;
        if (imputation.imputationConfidence === SIM_READY_IMPUTATION_CONFIDENCE_HIGH) {
          totalHighConfidenceImputations += 1;
        } else if (imputation.imputationConfidence === SIM_READY_IMPUTATION_CONFIDENCE_MEDIUM) {
          totalMediumConfidenceImputations += 1;
        }

        const key = `${imputation.crystalName}|||${imputation.imputationRule}`;
        if (!map.has(key)) {
          map.set(key, {
            crystalName: imputation.crystalName,
            imputationRule: imputation.imputationRule,
            imputationConfidence: imputation.imputationConfidence,
            count: 0,
          });
        }
        map.get(key).count += 1;
      });
    });

    return {
      totalImputedSlots,
      totalHighConfidenceImputations,
      totalMediumConfidenceImputations,
      summary: Array.from(map.values()).sort(
        (a, b) =>
          b.count - a.count ||
          a.crystalName.localeCompare(b.crystalName) ||
          a.imputationRule.localeCompare(b.imputationRule),
      ),
    };
  }

  function simReadyImputationLogSuffix(entry) {
    const imputationEntries = imputationEntriesFromAcceptedEntry(entry);
    if (!imputationEntries.length) return '';
    const parts = imputationEntries.slice(0, 3).map((imputation) => {
      return `${imputation.slotKey} ${imputation.crystalName} x${imputation.collectedCrystalCount} -> x${imputation.finalCrystalCount}`;
    });
    if (imputationEntries.length > 3) parts.push(`+${imputationEntries.length - 3} more`);
    return ` | sim-ready imputation: ${parts.join('; ')}`;
  }

  function slotStarterObject(slot) {
    const out = {
      name: slot.name,
    };
    if (slot.crystals.length === CRYSTAL_SLOTS_PER_ITEM && new Set(slot.crystals).size === 1) {
      out.crystal = slot.crystals[0];
    } else {
      out.crystals = slot.crystals.slice();
    }
    if (slot.itemType === 'Weapon' || slot.upgrades.length) out.upgrades = slot.upgrades.slice();
    if (slot.missingCrystalSlots > 0) out.missingCrystalSlots = slot.missingCrystalSlots;
    return out;
  }

  function buildStarterObject(build, labelHint) {
    const out = {
      labelHint: labelHint || '',
      armor: slotStarterObject(build.armor),
      weapon1: slotStarterObject(build.weapon1),
      weapon2: slotStarterObject(build.weapon2),
      misc1: slotStarterObject(build.misc1),
      misc2: slotStarterObject(build.misc2),
    };
    if (!out.labelHint) delete out.labelHint;
    return out;
  }

  function compactExportPreview(build, labelHint) {
    return JSON.stringify(buildStarterObject(build, labelHint));
  }

  function formatStarterSnippet(build, labelHint) {
    return JSON.stringify(buildStarterObject(build, labelHint), null, 2);
  }

  function skillFamilyLabel(slot) {
    if (!slot || !slot.skillType) return '';
    if (slot.skillType === 'gunSkill') return 'gun';
    if (slot.skillType === 'meleeSkill') return 'melee';
    if (slot.skillType === 'projSkill') return 'proj';
    return slot.skillType;
  }

  function summarizeArchetype(build) {
    const weapons = [build.weapon1?.name || '', build.weapon2?.name || ''].filter(Boolean).sort();
    const miscs = [build.misc1?.name || '', build.misc2?.name || ''].filter(Boolean).sort();
    const weaponFamilies = [skillFamilyLabel(build.weapon1), skillFamilyLabel(build.weapon2)]
      .filter(Boolean)
      .sort();
    const armorName = build.armor?.name || '';
    const key = stableStringify({
      armor: armorName,
      weapons,
      miscs,
      weaponFamilies,
    });
    return {
      key,
      label: `${armorName} | ${weapons.join(' + ')} | ${miscs.join(' + ')}`,
      armor: armorName,
      weapons,
      miscs,
      weaponFamilies,
    };
  }

  async function collectBuildForPlayer(sighting) {
    const profileHtml = await fetchHtml(sighting.profileUrl);
    state.counters.profilesFetched += 1;
    renderUi();

    const profileDoc = htmlToDocument(profileHtml);
    const profileParse = parseProfileBuild(profileDoc);
    if (!profileParse.gearLinkCount) {
      const error = new Error('Profile has no equipped item links');
      error.skipReason = 'skipped_no_equipped_items';
      if (DEBUG) {
        error.debug = {
          gearLinkCount: profileParse.gearLinkCount,
          profileHtmlSnippet: previewHtml(profileHtml),
        };
      }
      throw error;
    }
    if (profileParse.missingSlots.length) {
      const error = new Error(
        `Missing profile gear slots: ${profileParse.missingSlots.join(', ')}`,
      );
      error.skipReason = 'skipped_incomplete_profile_parse';
      if (DEBUG) {
        error.debug = {
          missingSlots: profileParse.missingSlots.slice(),
          gearLinkCount: profileParse.gearLinkCount,
          profileHtmlSnippet: previewHtml(profileHtml),
        };
      }
      throw error;
    }

    const popupBuild = {};
    for (const slotKey of SLOT_ORDER) {
      if (state.stopRequested) throw new Error('Stopped');
      const slotInfo = profileParse.slots[slotKey];
      if (!slotInfo || !slotInfo.popupUrl) {
        const error = new Error(`Missing popup link for ${slotKey}`);
        error.skipReason = 'skipped_incomplete_profile_parse';
        if (DEBUG) {
          error.debug = {
            slotKey,
            slotInfo,
            profileHtmlSnippet: previewHtml(profileHtml),
          };
        }
        throw error;
      }

      let popupHtml = '';
      try {
        popupHtml = await fetchHtml(slotInfo.popupUrl);
      } catch (error) {
        if (error && (error.isStopped || String(error.message) === 'Stopped')) throw error;
        error.skipReason = 'skipped_fetch_error';
        if (DEBUG) {
          error.debug = {
            slotKey,
            popupUrl: slotInfo.popupUrl,
            profileHtmlSnippet: previewHtml(profileHtml),
          };
        }
        throw error;
      }

      const popupParse = parseItemPopup(popupHtml, {
        fallbackName: slotInfo.profileItemNameFallback,
        slotKey,
      });
      if (!popupParse.ok) {
        const error = new Error(popupParse.error || `Popup parse failed for ${slotKey}`);
        error.skipReason = 'skipped_popup_parse_error';
        error.debug = {
          slotKey,
          popupUrl: slotInfo.popupUrl,
          fallbackName: slotInfo.profileItemNameFallback,
          popupHtmlSnippet: previewHtml(popupHtml),
          ...(popupParse.debug || {}),
        };
        throw error;
      }
      popupBuild[slotKey] = popupParse;
    }

    const normalized = normalizeBuildAgainstDefs(popupBuild);
    if (normalized.unknownItems.length) {
      const error = new Error(
        `Unsupported item(s): ${normalized.unknownItems
          .map((x) =>
            x.rawName && x.rawName !== x.itemName ? `${x.rawName} -> ${x.itemName}` : x.itemName,
          )
          .join(', ')}`,
      );
      error.skipReason = 'skipped_unknown_item';
      error.build = deepClone(normalized.build);
      error.totalMissingCrystalSlots = normalized.totalMissingCrystalSlots;
      error.debug = DEBUG
        ? { unknownItems: normalized.unknownItems.slice(), popupBuild }
        : undefined;
      throw error;
    }

    if (normalized.unsupportedUpgrades.length) {
      const error = new Error(
        `Unsupported upgrade(s): ${normalized.unsupportedUpgrades
          .map((x) => x.unknownUpgradeNames.join(', '))
          .join(' | ')}`,
      );
      error.skipReason = 'skipped_incomplete_profile_parse';
      error.build = deepClone(normalized.build);
      error.totalMissingCrystalSlots = normalized.totalMissingCrystalSlots;
      error.debug = DEBUG
        ? { unsupportedUpgrades: normalized.unsupportedUpgrades.slice(), popupBuild }
        : undefined;
      throw error;
    }

    if (normalized.slotIssues.length) {
      const error = new Error(
        `Slot issue(s): ${normalized.slotIssues
          .map((x) => `${x.slotKey}:${x.issue}${x.itemName ? `:${x.itemName}` : ''}`)
          .join(', ')}`,
      );
      error.skipReason = 'skipped_incomplete_profile_parse';
      error.build = deepClone(normalized.build);
      error.totalMissingCrystalSlots = normalized.totalMissingCrystalSlots;
      error.debug = DEBUG ? { slotIssues: normalized.slotIssues.slice(), popupBuild } : undefined;
      throw error;
    }

    if (!normalized.build.armor || !normalized.build.armor.name) {
      const error = new Error('Armor missing');
      error.skipReason = 'skipped_incomplete_profile_parse';
      throw error;
    }

    if (!normalized.build.weapon1?.name && !normalized.build.weapon2?.name) {
      const error = new Error('Both weapons missing');
      error.skipReason = 'skipped_incomplete_profile_parse';
      throw error;
    }

    if (normalized.totalMissingCrystalSlots >= MISSING_CRYSTAL_SKIP_THRESHOLD) {
      const error = new Error(
        `Missing crystal slots ${normalized.totalMissingCrystalSlots} >= ${MISSING_CRYSTAL_SKIP_THRESHOLD}`,
      );
      error.skipReason = 'skipped_too_many_missing_crystals';
      error.build = deepClone(normalized.build);
      error.totalMissingCrystalSlots = normalized.totalMissingCrystalSlots;
      error.debug = DEBUG
        ? {
            totalMissingCrystalSlots: normalized.totalMissingCrystalSlots,
            build: normalized.build,
          }
        : undefined;
      throw error;
    }

    return {
      build: normalized.build,
      totalMissingCrystalSlots: normalized.totalMissingCrystalSlots,
    };
  }

  function makeSkippedEntry(base, skipReason, error) {
    const out = {
      playerName: base.playerName,
      gangName: base.gangName,
      profileUrl: base.profileUrl,
      level: Number.isFinite(base.level) ? base.level : null,
      location: base.location || null,
      collectedAt: nowIso(),
      skipReason,
      errorMessage: error ? String(error.message || error) : '',
      debug: error && error.debug ? deepClone(error.debug) : undefined,
    };
    if (error && error.build) out.build = deepClone(error.build);
    if (error && Number.isFinite(error.totalMissingCrystalSlots)) {
      out.totalMissingCrystalSlots = Number(error.totalMissingCrystalSlots);
    }
    return out;
  }

  function makeAcceptedEntry(base, build, totalMissingCrystalSlots) {
    return withSimReadyBuildData({
      playerName: base.playerName,
      gangName: base.gangName,
      profileUrl: base.profileUrl,
      level: Number.isFinite(base.level) ? base.level : null,
      location: base.location || null,
      collectedAt: nowIso(),
      totalMissingCrystalSlots,
      build,
    });
  }

  function entryBuildForSummary(entry, buildKey = 'build') {
    if (!entry) return null;
    if (buildKey && entry[buildKey]) return entry[buildKey];
    return entry.build || null;
  }

  function summarizeBuildFrequency(acceptedBuilds, buildKey = 'build') {
    const map = new Map();

    acceptedBuilds.forEach((entry) => {
      const build = entryBuildForSummary(entry, buildKey);
      if (!build) return;
      const signature = buildSignature(build);
      if (!map.has(signature)) {
        const labelHint = buildLabelHint(build);
        map.set(signature, {
          signature,
          count: 0,
          gangsSeen: new Set(),
          samplePlayers: [],
          representativeBuild: deepClone(build),
          labelHint,
          compactExportPreview: compactExportPreview(build, labelHint),
          starterSnippet: formatStarterSnippet(build, labelHint),
        });
      }

      const bucket = map.get(signature);
      bucket.count += 1;
      if (entry.gangName) bucket.gangsSeen.add(entry.gangName);
      if (bucket.samplePlayers.length < MAX_SAMPLE_PLAYERS)
        bucket.samplePlayers.push(entry.playerName);
    });

    return Array.from(map.values())
      .map((bucket) => ({
        signature: bucket.signature,
        count: bucket.count,
        gangsSeen: sortByGangOrder(Array.from(bucket.gangsSeen)),
        samplePlayers: bucket.samplePlayers.slice(),
        representativeBuild: bucket.representativeBuild,
        labelHint: bucket.labelHint,
        compactExportPreview: bucket.compactExportPreview,
        starterSnippet: bucket.starterSnippet,
      }))
      .sort((a, b) => b.count - a.count || a.signature.localeCompare(b.signature));
  }

  function summarizeArchetypes(acceptedBuilds, buildKey = 'build') {
    const map = new Map();

    acceptedBuilds.forEach((entry) => {
      const build = entryBuildForSummary(entry, buildKey);
      if (!build) return;
      const archetype = summarizeArchetype(build);
      if (!map.has(archetype.key)) {
        map.set(archetype.key, {
          ...archetype,
          count: 0,
          gangsSeen: new Set(),
          samplePlayers: [],
          representativeBuild: deepClone(build),
        });
      }

      const bucket = map.get(archetype.key);
      bucket.count += 1;
      if (entry.gangName) bucket.gangsSeen.add(entry.gangName);
      if (bucket.samplePlayers.length < MAX_SAMPLE_PLAYERS)
        bucket.samplePlayers.push(entry.playerName);
    });

    return Array.from(map.values())
      .map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        armor: bucket.armor,
        weapons: bucket.weapons,
        miscs: bucket.miscs,
        weaponFamilies: bucket.weaponFamilies,
        count: bucket.count,
        gangsSeen: sortByGangOrder(Array.from(bucket.gangsSeen)),
        samplePlayers: bucket.samplePlayers.slice(),
        representativeBuild: bucket.representativeBuild,
        compactExportPreview: compactExportPreview(bucket.representativeBuild, bucket.label),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function summarizeNormalization(entries) {
    const map = new Map();
    let totalNormalizedItemCount = 0;

    (entries || []).forEach((entry) => {
      normalizationEntriesFromBuild(entry.build).forEach((norm) => {
        totalNormalizedItemCount += 1;
        const key = `${norm.rawName}|||${norm.normalizedName}`;
        if (!map.has(key)) {
          map.set(key, {
            rawName: norm.rawName,
            normalizedName: norm.normalizedName,
            count: 0,
            matchedPrefixes: new Set(),
          });
        }
        const bucket = map.get(key);
        bucket.count += 1;
        if (norm.matchedPrefix) bucket.matchedPrefixes.add(norm.matchedPrefix);
      });
    });

    return {
      totalNormalizedItemCount,
      summary: Array.from(map.values())
        .map((bucket) => ({
          rawName: bucket.rawName,
          normalizedName: bucket.normalizedName,
          count: bucket.count,
          matchedPrefixes: Array.from(bucket.matchedPrefixes).sort((a, b) => a.localeCompare(b)),
        }))
        .sort((a, b) => b.count - a.count || a.rawName.localeCompare(b.rawName)),
    };
  }

  function summarizeCrystalNormalizations(entries) {
    const map = new Map();
    let totalNormalizedCrystalCount = 0;

    (entries || []).forEach((entry) => {
      crystalNormalizationEntriesFromBuild(entry.build).forEach((norm) => {
        totalNormalizedCrystalCount += 1;
        const key = `${norm.rawName}|||${norm.normalizedName}`;
        if (!map.has(key)) {
          map.set(key, {
            rawName: norm.rawName,
            normalizedName: norm.normalizedName,
            count: 0,
            normalizationReasons: new Set(),
          });
        }
        const bucket = map.get(key);
        bucket.count += 1;
        if (norm.normalizationReason) bucket.normalizationReasons.add(norm.normalizationReason);
      });
    });

    return {
      totalNormalizedCrystalCount,
      summary: Array.from(map.values())
        .map((bucket) => ({
          rawName: bucket.rawName,
          normalizedName: bucket.normalizedName,
          count: bucket.count,
          normalizationReasons: Array.from(bucket.normalizationReasons).sort((a, b) =>
            a.localeCompare(b),
          ),
        }))
        .sort((a, b) => b.count - a.count || a.rawName.localeCompare(b.rawName)),
    };
  }

  function finalizeReport(report) {
    report.acceptedBuilds = enrichAcceptedEntriesWithSimReady(report.acceptedBuilds || []);
    const normalization = summarizeNormalization(
      (report.acceptedBuilds || []).concat(report.skippedBuilds || []),
    );
    const crystalNormalization = summarizeCrystalNormalizations(
      (report.acceptedBuilds || []).concat(report.skippedBuilds || []),
    );
    const imputation = summarizeImputations(report.acceptedBuilds || []);
    report.totals.normalizedItemCount = normalization.totalNormalizedItemCount;
    report.totals.normalizedCrystalCount = crystalNormalization.totalNormalizedCrystalCount;
    report.totals.totalImputedSlots = imputation.totalImputedSlots;
    report.totals.totalHighConfidenceImputations = imputation.totalHighConfidenceImputations;
    report.totals.totalMediumConfidenceImputations = imputation.totalMediumConfidenceImputations;
    report.normalizationSummary = normalization.summary;
    report.crystalNormalizationSummary = crystalNormalization.summary;
    report.imputationSummary = imputation.summary;
    report.buildFrequencySummary = summarizeBuildFrequency(report.acceptedBuilds);
    report.archetypeSummary = summarizeArchetypes(report.acceptedBuilds);
    report.defenderStarterSnippets = defenderStarterSnippetsFromSummary(
      report.buildFrequencySummary,
    );
    updateTotalsFromState(report);
  }

  function buildValidBuildExportReport(report) {
    if (!report) return null;

    const acceptedBuilds = enrichAcceptedEntriesWithSimReady(report.acceptedBuilds || []);
    const buildFrequencySummary = summarizeBuildFrequency(acceptedBuilds);
    const archetypeSummary = summarizeArchetypes(acceptedBuilds);
    const normalization = summarizeNormalization(acceptedBuilds);
    const crystalNormalization = summarizeCrystalNormalizations(acceptedBuilds);
    const imputation = summarizeImputations(acceptedBuilds);
    const defenderStarterSnippets = defenderStarterSnippetsFromSummary(buildFrequencySummary);

    return {
      createdAt: report.createdAt || nowIso(),
      pageUrl: report.pageUrl || window.location.href,
      allowedGangs: Array.isArray(report.allowedGangs)
        ? report.allowedGangs.slice()
        : ALLOWED_GANGS.slice(),
      minPlayerLevel: Number.isFinite(report.minPlayerLevel)
        ? Number(report.minPlayerLevel)
        : MIN_PLAYER_LEVEL,
      totals: {
        acceptedBuildCount: acceptedBuilds.length,
        uniqueBuildSignatureCount: buildFrequencySummary.length,
        uniqueArchetypeCount: archetypeSummary.length,
        normalizedItemCount: normalization.totalNormalizedItemCount,
        normalizedCrystalCount: crystalNormalization.totalNormalizedCrystalCount,
        totalImputedSlots: imputation.totalImputedSlots,
        totalHighConfidenceImputations: imputation.totalHighConfidenceImputations,
        totalMediumConfidenceImputations: imputation.totalMediumConfidenceImputations,
      },
      acceptedBuilds,
      buildFrequencySummary,
      archetypeSummary,
      normalizationSummary: normalization.summary,
      crystalNormalizationSummary: crystalNormalization.summary,
      imputationSummary: imputation.summary,
      defenderStarterSnippets,
    };
  }

  function buildSimReadyExportReport(report) {
    if (!report) return null;

    const simReadyBuilds = enrichAcceptedEntriesWithSimReady(report.acceptedBuilds || []);
    const buildFrequencySummary = summarizeBuildFrequency(simReadyBuilds, 'simReadyBuild');
    const archetypeSummary = summarizeArchetypes(simReadyBuilds, 'simReadyBuild');
    const normalization = summarizeNormalization(simReadyBuilds);
    const crystalNormalization = summarizeCrystalNormalizations(simReadyBuilds);
    const imputation = summarizeImputations(simReadyBuilds);
    const defenderStarterSnippets = defenderStarterSnippetsFromSummary(buildFrequencySummary);

    return {
      createdAt: report.createdAt || nowIso(),
      pageUrl: report.pageUrl || window.location.href,
      allowedGangs: Array.isArray(report.allowedGangs)
        ? report.allowedGangs.slice()
        : ALLOWED_GANGS.slice(),
      minPlayerLevel: Number.isFinite(report.minPlayerLevel)
        ? Number(report.minPlayerLevel)
        : MIN_PLAYER_LEVEL,
      totals: {
        acceptedBuildCount: simReadyBuilds.length,
        simReadyBuildCount: simReadyBuilds.length,
        uniqueBuildSignatureCount: buildFrequencySummary.length,
        uniqueArchetypeCount: archetypeSummary.length,
        normalizedItemCount: normalization.totalNormalizedItemCount,
        normalizedCrystalCount: crystalNormalization.totalNormalizedCrystalCount,
        totalImputedSlots: imputation.totalImputedSlots,
        totalHighConfidenceImputations: imputation.totalHighConfidenceImputations,
        totalMediumConfidenceImputations: imputation.totalMediumConfidenceImputations,
      },
      simReadyBuilds,
      buildFrequencySummary,
      archetypeSummary,
      normalizationSummary: normalization.summary,
      crystalNormalizationSummary: crystalNormalization.summary,
      imputationSummary: imputation.summary,
      defenderStarterSnippets,
    };
  }

  function defenderStarterSnippetsFromSummary(summary) {
    return (summary || []).map((entry) => ({
      signature: entry.signature,
      count: entry.count,
      labelHint: entry.labelHint,
      starterSnippet: entry.starterSnippet,
    }));
  }

  function generateMetaSummary(report) {
    if (!report) return 'No report collected yet.';
    const lines = [];
    lines.push(`Legacy Online Meta Report ${report.createdAt}`);
    lines.push(`Page: ${report.pageUrl}`);
    lines.push(`Allowed gangs: ${report.allowedGangs.join(', ')}`);
    lines.push(`Excluded gangs: ${report.excludedGangs.join(', ')}`);
    lines.push(`Min player level: ${report.minPlayerLevel ?? MIN_PLAYER_LEVEL}`);
    lines.push(
      `Totals: scanned=${report.totals.rowsScanned} allowed=${report.totals.allowedGangPlayersFound} profiles=${report.totals.profilesFetched} accepted=${report.totals.acceptedBuilds} skipped=${report.totals.skippedBuilds} normalizedItems=${report.totals.normalizedItemCount || 0} normalizedCrystals=${report.totals.normalizedCrystalCount || 0} imputedSlots=${report.totals.totalImputedSlots || 0}`,
    );

    const skipEntries = Object.entries(report.totals.skippedByReason || {}).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    if (skipEntries.length) {
      lines.push('Skipped by reason:');
      skipEntries.forEach(([reason, count]) => lines.push(`- ${reason}: ${count}`));
    }

    if (report.buildFrequencySummary.length) {
      lines.push('Top build signatures:');
      report.buildFrequencySummary.slice(0, 5).forEach((entry) => {
        lines.push(
          `- ${entry.count}x | ${entry.gangsSeen.join('/')} | ${entry.samplePlayers.join(', ')} | ${entry.signature}`,
        );
      });
    }

    if (report.archetypeSummary.length) {
      lines.push('Top archetypes:');
      report.archetypeSummary.slice(0, 5).forEach((entry) => {
        lines.push(`- ${entry.count}x | ${entry.gangsSeen.join('/')} | ${entry.label}`);
      });
    }

    return lines.join('\n');
  }

  function printConsoleSummary(report) {
    if (!report) return;
    const topSignatures = report.buildFrequencySummary
      .slice(0, MAX_CONSOLE_SIGNATURES)
      .map((entry) => ({
        count: entry.count,
        gangsSeen: entry.gangsSeen.join('/'),
        samplePlayers: entry.samplePlayers.join(', '),
        signature: entry.signature,
      }));

    console.group('[Legacy Online Meta Collector]');
    console.log('Rows scanned:', report.totals.rowsScanned);
    console.log('Allowed players:', report.totals.allowedGangPlayersFound);
    console.log('Accepted builds:', report.totals.acceptedBuilds);
    console.log('Skipped builds by reason:', report.totals.skippedByReason);
    console.log('Normalized item count:', report.totals.normalizedItemCount || 0);
    console.log('Normalized crystal count:', report.totals.normalizedCrystalCount || 0);
    console.log('Total imputed slots:', report.totals.totalImputedSlots || 0);
    console.log(
      'High/medium imputations:',
      `${report.totals.totalHighConfidenceImputations || 0}/${report.totals.totalMediumConfidenceImputations || 0}`,
    );
    if (topSignatures.length) console.table(topSignatures);
    if ((report.normalizationSummary || []).length) {
      console.table(report.normalizationSummary.slice(0, MAX_CONSOLE_SIGNATURES));
    }
    if ((report.crystalNormalizationSummary || []).length) {
      console.table(report.crystalNormalizationSummary.slice(0, MAX_CONSOLE_SIGNATURES));
    }
    if ((report.imputationSummary || []).length) {
      console.table(report.imputationSummary.slice(0, MAX_CONSOLE_SIGNATURES));
    }
    console.groupEnd();
  }

  function rawSightingEntry(player) {
    return {
      rowIndex: player.rowIndex,
      playerName: player.playerName,
      gangName: player.gangName || '',
      profileUrl: player.profileUrl,
      level: Number.isFinite(player.level) ? player.level : null,
      location: player.location || null,
      rowText: player.rowText,
      status: 'queued',
      skipReason: '',
      deduped: false,
      accepted: false,
      build: null,
      totalMissingCrystalSlots: null,
    };
  }

  async function runScan() {
    if (state.scanning) {
      log('Scan already running.');
      return;
    }

    const report = createEmptyReport();
    state.scanning = true;
    state.stopRequested = false;
    state.activeControllers.forEach((controller) => controller.abort());
    state.activeControllers.clear();
    state.lastRequestAt = 0;
    state.counters = emptyCounters();
    state.logs = [];
    state.report = report;
    renderUi();

    log(`Starting scan on ${window.location.pathname}${window.location.search}`);

    try {
      const players = parseOnlinePlayersFromDocument(document);
      state.counters.rowsScanned = players.length;
      report.rawSightings = players.map(rawSightingEntry);
      updateTotalsFromState(report);
      renderUi();

      if (!players.length) {
        log('No Active Player List rows found.');
      }

      const sightingByProfileUrl = new Map();
      players.forEach((player, idx) => {
        const raw = report.rawSightings[idx];
        const gangSkipReason = skipReasonForGang(player.gangName);
        if (gangSkipReason) {
          raw.status = 'skipped';
          raw.skipReason = gangSkipReason;
          const skipped = makeSkippedEntry(player, gangSkipReason);
          report.skippedBuilds.push(skipped);
          state.counters.skippedBuilds += 1;
          incSkipReason(report, gangSkipReason);
          return;
        }

        const levelSkip = shouldSkipByLevel(player);
        if (levelSkip) {
          raw.status = 'skipped';
          raw.skipReason = levelSkip.skipReason;
          const skipped = makeSkippedEntry(player, levelSkip.skipReason, {
            message: levelSkip.message,
          });
          report.skippedBuilds.push(skipped);
          state.counters.skippedBuilds += 1;
          incSkipReason(report, levelSkip.skipReason);
          log(`Skipped ${player.playerName} | ${levelSkip.skipReason} | ${levelSkip.message}`);
          return;
        }

        if (sightingByProfileUrl.has(player.profileUrl)) {
          raw.status = 'deduped';
          raw.deduped = true;
          return;
        }

        raw.status = 'allowed';
        sightingByProfileUrl.set(player.profileUrl, { player, raw });
      });

      state.counters.allowedGangPlayersFound = sightingByProfileUrl.size;
      updateTotalsFromState(report);
      renderUi();
      log(`Allowed unique enemy profiles: ${sightingByProfileUrl.size}`);

      for (const { player, raw } of sightingByProfileUrl.values()) {
        if (state.stopRequested) break;
        log(`Fetching ${player.playerName} (${player.gangName})`);

        try {
          const collected = await collectBuildForPlayer(player);
          const accepted = makeAcceptedEntry(
            player,
            deepClone(collected.build),
            collected.totalMissingCrystalSlots,
          );
          report.acceptedBuilds.push(accepted);
          raw.status = 'accepted';
          raw.accepted = true;
          raw.build = deepClone(collected.build);
          raw.totalMissingCrystalSlots = collected.totalMissingCrystalSlots;
          state.counters.acceptedBuilds += 1;
          log(
            `Accepted ${player.playerName} | missing crystal slots=${collected.totalMissingCrystalSlots}${normalizationLogSuffix(collected.build)}${simReadyImputationLogSuffix(accepted)}`,
          );
        } catch (error) {
          if (
            state.stopRequested &&
            (error?.isStopped || String(error && error.message) === 'Stopped')
          )
            break;
          const skipReason = error && error.skipReason ? error.skipReason : 'skipped_fetch_error';
          const skipped = makeSkippedEntry(player, skipReason, error);
          report.skippedBuilds.push(skipped);
          raw.status = 'skipped';
          raw.skipReason = skipReason;
          raw.build = skipped.build ? deepClone(skipped.build) : null;
          raw.totalMissingCrystalSlots = Number.isFinite(skipped.totalMissingCrystalSlots)
            ? skipped.totalMissingCrystalSlots
            : null;
          state.counters.skippedBuilds += 1;
          incSkipReason(report, skipReason);
          log(
            `Skipped ${player.playerName} | ${skipReason} | ${previewText(error.message, 180)}${normalizationLogSuffix(skipped.build)}`,
          );
        }

        updateTotalsFromState(report);
        renderUi();
      }

      report.totals.stopped = Boolean(state.stopRequested);
      finalizeReport(report);

      state.report = report;
      saveLastReport(report);
      renderUi();
      printConsoleSummary(report);

      const belowMinCount = report.totals.skippedByReason.skipped_below_min_level || 0;
      if (state.stopRequested) {
        log(`Scan stopped. below min skipped=${belowMinCount}`);
      } else {
        log(
          `Finished scan. accepted=${report.totals.acceptedBuilds} skipped=${report.totals.skippedBuilds} belowMin=${belowMinCount}`,
        );
      }
    } catch (error) {
      if (
        !(state.stopRequested && (error?.isStopped || String(error && error.message) === 'Stopped'))
      ) {
        log(
          `Fatal scan error: ${previewText(error && error.message ? error.message : error, 220)}`,
        );
        console.error('[Legacy Online Meta Collector] Fatal scan error', error);
      }
      report.totals.stopped = Boolean(state.stopRequested);
      finalizeReport(report);
      state.report = report;
      saveLastReport(report);
    } finally {
      state.scanning = false;
      renderUi();
    }
  }

  function stopScan() {
    if (!state.scanning) {
      log('No active scan to stop.');
      return;
    }
    state.stopRequested = true;
    state.activeControllers.forEach((controller) => controller.abort());
    state.activeControllers.clear();
    log('Stop requested. Finishing current step.');
    renderUi();
  }

  async function copyCurrentSummary() {
    if (!state.report) {
      log('No summary to copy.');
      return;
    }
    const ok = await copyText(generateMetaSummary(state.report));
    log(ok ? 'Copied meta summary.' : 'Copy meta summary failed.');
  }

  async function copyFullJsonReport() {
    if (!state.report) {
      log('No full report to copy.');
      return;
    }
    const ok = await copyText(JSON.stringify(state.report, null, 2));
    log(ok ? 'Copied full JSON report.' : 'Copy full JSON failed.');
  }

  function downloadFullJsonReport() {
    if (!state.report) {
      log('No full report to download.');
      return;
    }
    const filename = `legacy-online-meta-${formatFileTimestamp(state.report.createdAt)}.json`;
    downloadJson(filename, state.report);
    log(`Downloaded full JSON ${filename}`);
  }

  async function copyValidBuildJsonReport() {
    if (!state.report) {
      log('No valid-build report to copy.');
      return;
    }
    const validReport = buildValidBuildExportReport(state.report);
    const ok = await copyText(JSON.stringify(validReport, null, 2));
    log(ok ? 'Copied valid-build JSON report.' : 'Copy valid-build JSON failed.');
  }

  function downloadValidBuildJsonReport() {
    if (!state.report) {
      log('No valid-build report to download.');
      return;
    }
    const validReport = buildValidBuildExportReport(state.report);
    const filename = `legacy-online-valid-builds-${formatFileTimestamp(validReport.createdAt)}.json`;
    downloadJson(filename, validReport);
    log(`Downloaded valid-build JSON ${filename}`);
  }

  async function copySimReadyJsonReport() {
    if (!state.report) {
      log('No sim-ready report to copy.');
      return;
    }
    const simReadyReport = buildSimReadyExportReport(state.report);
    const ok = await copyText(JSON.stringify(simReadyReport, null, 2));
    log(ok ? 'Copied sim-ready JSON report.' : 'Copy sim-ready JSON failed.');
  }

  function downloadSimReadyJsonReport() {
    if (!state.report) {
      log('No sim-ready report to download.');
      return;
    }
    const simReadyReport = buildSimReadyExportReport(state.report);
    const filename = `legacy-online-sim-ready-${formatFileTimestamp(simReadyReport.createdAt)}.json`;
    downloadJson(filename, simReadyReport);
    log(`Downloaded sim-ready JSON ${filename}`);
  }

  function clearResults() {
    if (state.scanning) {
      log('Stop the active scan before clearing results.');
      return;
    }
    state.report = null;
    state.logs = [];
    state.counters = emptyCounters();
    saveLastReport(null);
    renderUi();
  }

  function counterRow(label, value) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.gap = '10px';
    row.style.fontSize = '12px';

    const left = document.createElement('span');
    left.textContent = label;
    left.style.color = '#adb5bd';

    const right = document.createElement('span');
    right.textContent = String(value);
    right.style.color = '#f8f9fa';
    right.style.fontWeight = '600';

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function makeButton(label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.background = '#1c1f24';
    button.style.color = '#f8f9fa';
    button.style.border = '1px solid #444b55';
    button.style.borderRadius = '4px';
    button.style.padding = '6px 8px';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    button.addEventListener('click', handler);
    button.addEventListener('mouseenter', () => {
      button.style.background = '#252a31';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = '#1c1f24';
    });
    return button;
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'legacy-online-meta-collector-panel';
    panel.style.position = 'fixed';
    panel.style.right = '12px';
    panel.style.bottom = '12px';
    panel.style.width = '330px';
    panel.style.maxHeight = '80vh';
    panel.style.overflow = 'hidden';
    panel.style.zIndex = '2147483647';
    panel.style.background = 'rgba(10, 12, 15, 0.96)';
    panel.style.color = '#f8f9fa';
    panel.style.border = '1px solid #2f343c';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 10px 26px rgba(0, 0, 0, 0.35)';
    panel.style.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace';
    panel.style.padding = '10px';

    const title = document.createElement('div');
    title.textContent = `Legacy Meta Collector v${VERSION}`;
    title.style.fontSize = '13px';
    title.style.fontWeight = '700';
    title.style.marginBottom = '8px';
    panel.appendChild(title);

    const buttons = document.createElement('div');
    buttons.style.display = 'grid';
    buttons.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    buttons.style.gap = '6px';
    buttons.style.marginBottom = '10px';

    const scanButton = makeButton('Scan Online Builds', runScan);
    scanButton.style.gridColumn = 'span 2';
    const stopButton = makeButton('Stop', stopScan);
    stopButton.style.gridColumn = 'span 2';
    const copyFullJsonButton = makeButton('Copy Full JSON', copyFullJsonReport);
    const downloadFullJsonButton = makeButton('Download Full JSON', downloadFullJsonReport);
    const copyValidBuildJsonButton = makeButton('Copy Valid Build JSON', copyValidBuildJsonReport);
    const downloadValidBuildJsonButton = makeButton(
      'Download Valid Build JSON',
      downloadValidBuildJsonReport,
    );
    const copySimReadyJsonButton = makeButton('Copy Sim-Ready JSON', copySimReadyJsonReport);
    const downloadSimReadyJsonButton = makeButton(
      'Download Sim-Ready JSON',
      downloadSimReadyJsonReport,
    );
    const copySummaryButton = makeButton('Copy Meta Summary', copyCurrentSummary);
    copySummaryButton.style.gridColumn = 'span 2';
    const clearButton = makeButton('Clear Results', clearResults);
    clearButton.style.gridColumn = 'span 2';

    buttons.appendChild(scanButton);
    buttons.appendChild(stopButton);
    buttons.appendChild(copyFullJsonButton);
    buttons.appendChild(downloadFullJsonButton);
    buttons.appendChild(copyValidBuildJsonButton);
    buttons.appendChild(downloadValidBuildJsonButton);
    buttons.appendChild(copySimReadyJsonButton);
    buttons.appendChild(downloadSimReadyJsonButton);
    buttons.appendChild(copySummaryButton);
    buttons.appendChild(clearButton);
    panel.appendChild(buttons);

    const counterWrap = document.createElement('div');
    counterWrap.style.display = 'grid';
    counterWrap.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    counterWrap.style.gap = '4px 10px';
    counterWrap.style.marginBottom = '10px';
    panel.appendChild(counterWrap);

    const status = document.createElement('div');
    status.style.fontSize = '12px';
    status.style.marginBottom = '8px';
    status.style.color = '#8ecae6';
    panel.appendChild(status);

    const logLabel = document.createElement('div');
    logLabel.textContent = 'Log';
    logLabel.style.fontSize = '12px';
    logLabel.style.marginBottom = '4px';
    logLabel.style.color = '#adb5bd';
    panel.appendChild(logLabel);

    const logArea = document.createElement('pre');
    logArea.style.margin = '0';
    logArea.style.padding = '8px';
    logArea.style.background = '#0f1216';
    logArea.style.border = '1px solid #242932';
    logArea.style.borderRadius = '6px';
    logArea.style.maxHeight = '240px';
    logArea.style.overflow = 'auto';
    logArea.style.whiteSpace = 'pre-wrap';
    logArea.style.wordBreak = 'break-word';
    logArea.style.fontSize = '11px';
    panel.appendChild(logArea);

    document.body.appendChild(panel);

    state.panel = panel;
    state.ui = {
      scanButton,
      stopButton,
      copyFullJsonButton,
      downloadFullJsonButton,
      copyValidBuildJsonButton,
      downloadValidBuildJsonButton,
      copySimReadyJsonButton,
      downloadSimReadyJsonButton,
      copySummaryButton,
      clearButton,
      counterWrap,
      status,
      logArea,
    };
    renderUi();
  }

  function renderUi() {
    if (!state.ui) return;

    const report = state.report;
    const counters = state.counters;
    state.ui.scanButton.disabled = state.scanning;
    state.ui.stopButton.disabled = !state.scanning;
    state.ui.copyFullJsonButton.disabled = state.scanning || !report;
    state.ui.downloadFullJsonButton.disabled = state.scanning || !report;
    state.ui.copyValidBuildJsonButton.disabled = state.scanning || !report;
    state.ui.downloadValidBuildJsonButton.disabled = state.scanning || !report;
    state.ui.copySimReadyJsonButton.disabled = state.scanning || !report;
    state.ui.downloadSimReadyJsonButton.disabled = state.scanning || !report;
    state.ui.copySummaryButton.disabled = state.scanning || !report;
    state.ui.clearButton.disabled = state.scanning || (!report && !state.logs.length);

    state.ui.scanButton.style.opacity = state.scanning ? '0.55' : '1';
    state.ui.stopButton.style.opacity = state.scanning ? '1' : '0.55';
    state.ui.copyFullJsonButton.style.opacity = !state.scanning && report ? '1' : '0.55';
    state.ui.downloadFullJsonButton.style.opacity = !state.scanning && report ? '1' : '0.55';
    state.ui.copyValidBuildJsonButton.style.opacity = !state.scanning && report ? '1' : '0.55';
    state.ui.downloadValidBuildJsonButton.style.opacity = !state.scanning && report ? '1' : '0.55';
    state.ui.copySimReadyJsonButton.style.opacity = !state.scanning && report ? '1' : '0.55';
    state.ui.downloadSimReadyJsonButton.style.opacity = !state.scanning && report ? '1' : '0.55';
    state.ui.copySummaryButton.style.opacity = !state.scanning && report ? '1' : '0.55';
    state.ui.clearButton.style.opacity =
      !state.scanning && (report || state.logs.length) ? '1' : '0.55';

    state.ui.counterWrap.innerHTML = '';
    state.ui.counterWrap.appendChild(counterRow('rows scanned', counters.rowsScanned));
    state.ui.counterWrap.appendChild(
      counterRow('allowed players', counters.allowedGangPlayersFound),
    );
    state.ui.counterWrap.appendChild(counterRow('profiles fetched', counters.profilesFetched));
    state.ui.counterWrap.appendChild(counterRow('accepted builds', counters.acceptedBuilds));
    state.ui.counterWrap.appendChild(counterRow('skipped builds', counters.skippedBuilds));
    state.ui.counterWrap.appendChild(
      counterRow('delay / retry', `${REQUEST_DELAY_MS}ms / ${FETCH_RETRY_COUNT}`),
    );

    if (state.scanning) {
      state.ui.status.textContent = state.stopRequested ? 'status: stopping' : 'status: scanning';
    } else if (report) {
      state.ui.status.textContent = `status: idle | last report ${report.createdAt}`;
    } else {
      state.ui.status.textContent = 'status: idle';
    }

    state.ui.logArea.textContent = state.logs.length
      ? state.logs.join('\n')
      : 'Ready on Online Now page.';
  }

  const api = {
    VERSION,
    DEBUG,
    MIN_PLAYER_LEVEL,
    REQUEST_DELAY_MS,
    FETCH_RETRY_COUNT,
    MISSING_CRYSTAL_SKIP_THRESHOLD,
    CRYSTAL_SLOTS_PER_ITEM,
    COSMETIC_ITEM_PREFIXES: COSMETIC_ITEM_PREFIXES.slice(),
    CRYSTAL_NAME_ALIASES: { ...CRYSTAL_NAME_ALIASES },
    ALLOWED_GANGS: ALLOWED_GANGS.slice(),
    EXCLUDED_GANGS: EXCLUDED_GANGS.slice(),
    SELECTORS: deepClone(SELECTORS),
    SUPPORTED_ITEM_NAMES: SUPPORTED_ITEM_NAMES.slice(),
    SUPPORTED_CRYSTAL_NAMES: SUPPORTED_CRYSTAL_NAMES.slice(),
    SUPPORTED_UPGRADE_NAMES: SUPPORTED_UPGRADE_NAMES.slice(),
    normalizeItemName,
    normalizeCrystalName,
    parseOnlinePlayersFromDocument,
    gangFromRow,
    extractProfileUrl,
    parseProfileBuild,
    extractModelessUrl,
    fetchHtml,
    parseItemPopup,
    normalizeBuildAgainstDefs,
    countMissingCrystalSlots,
    inferSlotCrystalsForSimulation,
    buildSimReadyVariant,
    buildSignature,
    summarizeArchetype,
    generateMetaSummary,
    buildValidBuildExportReport,
    buildSimReadyExportReport,
    buildStarterObject,
    formatStarterSnippet,
    getLastReport: () => deepClone(state.report),
    scan: runScan,
    stop: stopScan,
    clearResults,
  };

  window[NAMESPACE] = api;
  createPanel();
  log(`Ready. Allowed gangs: ${ALLOWED_GANGS.join(', ')}`);
})();
