(function () {
  'use strict';

  const VERSION = '0.1.3';

  function nowIso() {
    return new Date().toISOString();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function deepClone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function parseCsv(str) {
    return String(str || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function normalizeNameKey(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function toFiniteNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function averageFinite(values, digits = 4) {
    const xs = values.map(toFiniteNumber).filter((n) => n !== null);
    if (!xs.length) return null;
    const out = xs.reduce((a, b) => a + b, 0) / xs.length;
    return digits == null ? out : Number(out.toFixed(digits));
  }

  function minFinite(values) {
    const xs = values.map(toFiniteNumber).filter((n) => n !== null);
    return xs.length ? Math.min(...xs) : null;
  }

  function maxFinite(values) {
    const xs = values.map(toFiniteNumber).filter((n) => n !== null);
    return xs.length ? Math.max(...xs) : null;
  }

  function firstFinite(values) {
    for (const value of values || []) {
      const n = toFiniteNumber(value);
      if (n !== null) return n;
    }
    return null;
  }

  function slug(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed';
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function textOf(el) {
    return (el?.innerText || el?.textContent || '').trim();
  }

  function getActionEls() {
    return Array.from(document.querySelectorAll('input, button'));
  }

  function getButtonsByValue(value) {
    return getActionEls().filter((el) => {
      const tag = (el.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'button') return false;
      const v = (el.value || textOf(el)).trim();
      return v === value;
    });
  }

  function getButtonsByOnclick(fnName) {
    return getActionEls().filter((el) => {
      const onclick = el.getAttribute && (el.getAttribute('onclick') || '');
      return typeof onclick === 'string' && onclick.includes(fnName);
    });
  }

  function getExportButtons() {
    const byOnclick = getButtonsByOnclick('shareBuildCode');
    if (byOnclick.length) return byOnclick;
    const byValue = getButtonsByValue('Export');
    if (byValue.length) return byValue;
    return getActionEls().filter((el) => /export/i.test((el.value || textOf(el)).trim()));
  }

  function normalizeAttackType(v) {
    const s = String(v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (!s) return 'normal';
    if (s === 'quick' || s === 'quick atk' || s === 'quick attack') return 'quick';
    if (s === 'aimed' || s === 'aim' || s === 'aimed atk' || s === 'aimed attack') return 'aimed';
    if (s === 'cover' || s === 'covered' || s === 'take cover' || s === 'cover attack')
      return 'cover';
    return 'normal';
  }

  function normalizeAttackTypeStrict(v, label) {
    const raw = String(v == null ? '' : v).trim();
    if (!raw) {
      throw new Error(`Missing ${label}.attackType`);
    }
    const normalizedRaw = raw.toLowerCase().replace(/\s+/g, ' ');
    const supported = new Set([
      'normal',
      'normal atk',
      'normal attack',
      'quick',
      'quick atk',
      'quick attack',
      'aimed',
      'aim',
      'aimed atk',
      'aimed attack',
      'cover',
      'covered',
      'take cover',
      'cover attack',
    ]);
    if (!supported.has(normalizedRaw)) {
      throw new Error(`Unsupported ${label}.attackType: ${raw}`);
    }
    return normalizeAttackType(raw);
  }

  function findSelectOption(selectEl, valueNeedle) {
    if (!selectEl) return null;
    const rawNeedle = String(valueNeedle || '').trim();
    const needle = rawNeedle.toLowerCase();
    const options = Array.from(selectEl.options || []);
    return options.find((opt) => String(opt.value || '').trim().toLowerCase() === needle)
      || options.find((opt) => textOf(opt).toLowerCase() === needle)
      || options.find((opt) => textOf(opt).toLowerCase().includes(needle))
      || options.find((opt) => String(opt.value || '').trim() === rawNeedle);
  }

  function setSelectByText(selectEl, textNeedle) {
    if (!selectEl) return false;
    const match = findSelectOption(selectEl, textNeedle);
    if (!match) return false;
    selectEl.value = match.value;
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function setAttackType(selectEl, attackType) {
    if (!selectEl) return false;
    const normalized = normalizeAttackType(attackType);
    return setSelectByText(selectEl, normalized)
      || setSelectByText(selectEl, normalized === 'cover' ? 'Take Cover' : normalized)
      || setSelectByText(selectEl, normalized === 'normal' ? 'Normal Atk' : normalized === 'quick' ? 'Quick Atk' : normalized === 'aimed' ? 'Aimed Atk' : 'Take Cover');
  }

  function isAttackTypeSelect(selectEl) {
    if (!selectEl) return false;
    const values = Array.from(selectEl.options || []).map((opt) =>
      normalizeAttackType(opt.value || textOf(opt)),
    );
    return values.includes('normal')
      && values.includes('quick')
      && values.includes('aimed')
      && values.includes('cover');
  }

  function findAttackTypeSelects(selects) {
    const attacker = document.querySelector('select[name="attacker_attack_type"]');
    const defender = document.querySelector('select[name="defender_attack_type"]');
    const attackSelects = (selects || []).filter((el) => isAttackTypeSelect(el));
    const fallback = attackSelects.filter((el) => el !== attacker && el !== defender);

    return {
      attackerAttackTypeSelect: attacker || fallback[0] || null,
      defenderAttackTypeSelect:
        defender || fallback.find((el) => el !== (attacker || fallback[0] || null)) || null,
      attackTypeSelectCandidates: attackSelects,
    };
  }

  function buildToPageImport(build) {
    function slotToImport(slot) {
      if (!slot || !slot.name) return null;
      const upgrades = [];
      const crystals = normalizeUpgradeArray(slot.crystals);
      const crystal = String(
        (slot.crystal != null ? slot.crystal : slot.crystalName != null ? slot.crystalName : '') || '',
      ).trim();
      const crystalEntries = crystals.length
        ? crystals
        : crystal
          ? [crystal, crystal, crystal, crystal]
          : [];
      const inlineUpgrades = normalizeUpgradeArray(slot.upgrades);

      for (const entry of crystalEntries) upgrades.push(entry);
      if (inlineUpgrades.length) {
        if (
          crystalEntries.length
          && stableStringify(inlineUpgrades.slice(0, crystalEntries.length)) === stableStringify(crystalEntries)
        ) {
          for (const up of inlineUpgrades.slice(crystalEntries.length)) upgrades.push(up);
        } else {
          for (const up of inlineUpgrades) upgrades.push(up);
        }
      }
      return { name: slot.name, upgrades };
    }

    return {
      armor: slotToImport(build.armor),
      weapon1: slotToImport(build.weapon1),
      weapon2: slotToImport(build.weapon2),
      misc1: slotToImport(build.misc1),
      misc2: slotToImport(build.misc2),
      stats: {
        hp: Number(build.stats?.hp ?? 865),
        level: Number(build.stats?.level ?? 80),
        speed: Number(build.stats?.speed ?? 60),
        dodge: Number(build.stats?.dodge ?? 14),
        accuracy: Number(build.stats?.accuracy ?? 14),
      },
      attackType: normalizeAttackType(build.attackType),
    };
  }

  function normalizeUpgradeArray(upgrades) {
    return Array.isArray(upgrades)
      ? upgrades.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
  }

  function normalizeSlotCrystalEntries(slot) {
    if (!slot) return [];
    const crystals = normalizeUpgradeArray(slot.crystals);
    if (crystals.length) return crystals;
    const crystal = String(
      (slot.crystal != null ? slot.crystal : slot.crystalName != null ? slot.crystalName : '') || '',
    ).trim();
    return crystal ? [crystal, crystal, crystal, crystal] : [];
  }

  function normalizeSlotUpgradeEntries(slot) {
    if (!slot) return [];
    const inlineUpgrades = normalizeUpgradeArray(slot.upgrades);
    const fieldUpgrades = normalizeUpgradeArray([slot.upgrade1, slot.upgrade2]);
    const crystalEntries = normalizeSlotCrystalEntries(slot);
    if (crystalEntries.length) {
      if (
        inlineUpgrades.length >= crystalEntries.length
        && stableStringify(inlineUpgrades.slice(0, crystalEntries.length)) === stableStringify(crystalEntries)
      ) {
        return inlineUpgrades;
      }
      return crystalEntries.concat(inlineUpgrades.length ? inlineUpgrades : fieldUpgrades);
    }
    return inlineUpgrades.length ? inlineUpgrades : fieldUpgrades;
  }

  function normalizePageBuildSlot(slot) {
    return {
      name: String(slot && slot.name ? slot.name : '').trim(),
      upgrades: normalizeSlotUpgradeEntries(slot),
    };
  }

  function normalizePageBuild(pageBuild) {
    const stats = (pageBuild && pageBuild.stats) || {};
    return {
      stats: {
        level: Number(stats.level),
        hp: Number(stats.hp),
        speed: Number(stats.speed),
        dodge: Number(stats.dodge),
        accuracy: Number(stats.accuracy),
      },
      armor: normalizePageBuildSlot(pageBuild && pageBuild.armor),
      weapon1: normalizePageBuildSlot(pageBuild && pageBuild.weapon1),
      weapon2: normalizePageBuildSlot(pageBuild && pageBuild.weapon2),
      misc1: normalizePageBuildSlot(pageBuild && pageBuild.misc1),
      misc2: normalizePageBuildSlot(pageBuild && pageBuild.misc2),
      attackType: normalizeAttackType(pageBuild && pageBuild.attackType),
    };
  }

  function normalizedBuildIdentity(pageBuild) {
    const normalized = normalizePageBuild(pageBuild);
    return {
      stats: normalized.stats,
      armor: normalized.armor,
      weapon1: normalized.weapon1,
      weapon2: normalized.weapon2,
      misc1: normalized.misc1,
      misc2: normalized.misc2,
    };
  }

  function diffNormalizedBuilds(expected, actual) {
    const diffs = [];
    function addDiff(path, exp, act) {
      if (stableStringify(exp) === stableStringify(act)) return;
      diffs.push({ path, expected: exp, actual: act });
    }
    ['level', 'hp', 'speed', 'dodge', 'accuracy'].forEach((key) => {
      addDiff(`stats.${key}`, expected && expected.stats ? expected.stats[key] : null, actual && actual.stats ? actual.stats[key] : null);
    });
    ['armor', 'weapon1', 'weapon2', 'misc1', 'misc2'].forEach((slotKey) => {
      const expSlot = expected && expected[slotKey] ? expected[slotKey] : { name: '', upgrades: [] };
      const actSlot = actual && actual[slotKey] ? actual[slotKey] : { name: '', upgrades: [] };
      addDiff(`${slotKey}.name`, expSlot.name, actSlot.name);
      addDiff(`${slotKey}.upgrades`, expSlot.upgrades, actSlot.upgrades);
    });
    return diffs;
  }

  function stableStringify(x) {
    if (x === null) return 'null';
    const t = typeof x;
    if (t === 'number' || t === 'boolean') return String(x);
    if (t === 'string') return JSON.stringify(x);
    if (t !== 'object') return JSON.stringify(String(x));
    if (Array.isArray(x)) return '[' + x.map((v) => stableStringify(v)).join(',') + ']';
    const keys = Object.keys(x).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(x[k])).join(',') + '}';
  }

  function hashStr32(str) {
    str = String(str);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function hex8(u32) {
    return (u32 >>> 0).toString(16).padStart(8, '0');
  }

  function buildHash(normalizedPageBuild) {
    return hex8(hashStr32(stableStringify(normalizedPageBuild)));
  }

  function currentSelectAttackType(selectEl) {
    if (!selectEl) return '';
    const option = selectEl.options && selectEl.selectedIndex >= 0
      ? selectEl.options[selectEl.selectedIndex]
      : null;
    return normalizeAttackType(
      option ? (option.value || textOf(option)) : (selectEl.value || textOf(selectEl)),
    );
  }

  function looksLikePageBuildObject(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const keys = ['armor', 'weapon1', 'weapon2', 'misc1', 'misc2', 'stats'];
    if (!keys.every((key) => parsed[key] && typeof parsed[key] === 'object')) return false;
    const stats = parsed.stats || {};
    const statKeys = ['level', 'hp', 'speed', 'dodge', 'accuracy'];
    return statKeys.every((key) => Number.isFinite(Number(stats[key])));
  }

  function tryParsePageBuildJson(text) {
    if (text == null) return null;
    if (typeof text === 'object') {
      return looksLikePageBuildObject(text) ? text : null;
    }
    const raw = String(text).trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return looksLikePageBuildObject(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function tryParsePageBuild(raw) {
    return tryParsePageBuildJson(raw);
  }

  function previewText(raw, maxLen = 160) {
    const text = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    return text.length > maxLen ? `${text.slice(0, Math.max(0, maxLen - 3))}...` : text;
  }

  function describeButton(buttonEl) {
    if (!buttonEl) return null;
    return {
      tag: (buttonEl.tagName || '').toLowerCase(),
      id: buttonEl.id || '',
      name: buttonEl.getAttribute ? buttonEl.getAttribute('name') || '' : '',
      value: buttonEl.value || '',
      text: previewText(textOf(buttonEl), 80),
      className: typeof buttonEl.className === 'string' ? buttonEl.className : '',
      onclick: buttonEl.getAttribute ? buttonEl.getAttribute('onclick') || '' : '',
    };
  }

  function collectExportDomCandidates() {
    const out = [];
    const seen = new Set();
    const selectors = [
      'textarea',
      'input[type="text"]',
      'input:not([type])',
      'dialog',
      '[role="dialog"]',
      '.modal',
      '.popup',
      'pre',
      'code',
    ];
    const nodes = Array.from(document.querySelectorAll(selectors.join(',')));
    nodes.forEach((el, idx) => {
      const tag = (el.tagName || '').toLowerCase();
      const raw =
        tag === 'textarea' || tag === 'input'
          ? el.value
          : textOf(el);
      const text = String(raw || '').trim();
      if (!text) return;
      const key = [
        tag,
        el.id || '',
        el.getAttribute ? el.getAttribute('name') || '' : '',
        typeof el.className === 'string' ? el.className : '',
        idx,
      ].join('|');
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        key,
        source: tag === 'textarea' || tag === 'input' ? 'domInput' : 'domModal',
        text,
        meta: {
          tag,
          id: el.id || '',
          name: el.getAttribute ? el.getAttribute('name') || '' : '',
          className: typeof el.className === 'string' ? el.className : '',
        },
      });
    });
    return out;
  }

  function makeBuildVerificationError(details) {
    const attackerBuildSummary = details && details.attacker && Array.isArray(details.attacker.diff)
      ? details.attacker.diff.map((d) => d.path).join(', ')
      : '';
    const defenderBuildSummary = details && details.defender && Array.isArray(details.defender.diff)
      ? details.defender.diff.map((d) => d.path).join(', ')
      : '';
    const attackerAttackTypeSummary =
      details && details.attackerAttackTypeMatch
        ? ''
        : ` attackerAttackType=${details && details.requestedAttackTypes ? details.requestedAttackTypes.attacker : ''}->${details && details.actualAttackTypes ? details.actualAttackTypes.attacker : ''}`;
    const defenderAttackTypeSummary =
      details && details.defenderAttackTypeMatch
        ? ''
        : ` defenderAttackType=${details && details.requestedAttackTypes ? details.requestedAttackTypes.defender : ''}->${details && details.actualAttackTypes ? details.actualAttackTypes.defender : ''}`;
    const err = new Error(
      `Imported page verification mismatch: attackerBuild=${details.attackerBuildMatch ? 'ok' : 'mismatch'} defenderBuild=${details.defenderBuildMatch ? 'ok' : 'mismatch'} attackerStyle=${details.attackerAttackTypeMatch ? 'ok' : 'mismatch'} defenderStyle=${details.defenderAttackTypeMatch ? 'ok' : 'mismatch'}${attackerBuildSummary ? ` attackerDiffs=${attackerBuildSummary}` : ''}${defenderBuildSummary ? ` defenderDiffs=${defenderBuildSummary}` : ''}${attackerAttackTypeSummary}${defenderAttackTypeSummary}`,
    );
    err.buildVerification = details;
    return err;
  }

  function parseResultsText(rawText) {
    const text = String(rawText || '').replace(/\u00a0/g, ' ');
    const out = {
      rawText: text.trim(),
      attacker: {},
      defender: {},
      meta: {},
    };

    const aw = text.match(/Attacker wins:\s*([\d,]+)\s*\(([\d.]+)%\)/i);
    if (aw) {
      out.attacker.wins = Number(aw[1].replace(/,/g, ''));
      out.attacker.winPct = Number(aw[2]);
    }

    const ad = text.match(/Attacker wins:[\s\S]*?([\d,]+)\s*-\s*([\d,]+)\s*Dmg\s*\(Total\s*([\d,]+)\)/i);
    if (ad) {
      out.attacker.minDmg = Number(ad[1].replace(/,/g, ''));
      out.attacker.maxDmg = Number(ad[2].replace(/,/g, ''));
      out.attacker.totalDmg = Number(ad[3].replace(/,/g, ''));
    }

    const dw = text.match(/Defender wins:\s*([\d,]+)\s*\(([\d.]+)%\)/i);
    if (dw) {
      out.defender.wins = Number(dw[1].replace(/,/g, ''));
      out.defender.winPct = Number(dw[2]);
    }

    const dd = text.match(/Defender wins:[\s\S]*?([\d,]+)\s*-\s*([\d,]+)\s*Dmg\s*\(Total\s*([\d,]+)\)/i);
    if (dd) {
      out.defender.minDmg = Number(dd[1].replace(/,/g, ''));
      out.defender.maxDmg = Number(dd[2].replace(/,/g, ''));
      out.defender.totalDmg = Number(dd[3].replace(/,/g, ''));
    }

    const tt = text.match(/Total Turns:\s*([\d,]+)/i);
    if (tt) out.meta.totalTurns = Number(tt[1].replace(/,/g, ''));

    const at = text.match(/Average Turns:\s*([\d.]+)/i);
    if (at) out.meta.avgTurns = Number(at[1]);

    const sf = text.match(/Shortest Fight:\s*([\d,]+)\s*Turns/i);
    if (sf) out.meta.shortestFight = Number(sf[1].replace(/,/g, ''));

    const lf = text.match(/Longest Fight:\s*([\d,]+)\s*Turns/i);
    if (lf) out.meta.longestFight = Number(lf[1].replace(/,/g, ''));

    return out;
  }

  function makeBuild(name, build) {
    return { name, build: deepClone(build) };
  }

  function cloneBuildWithStats(entry, stats) {
    const next = deepClone(entry.build);
    next.stats = { ...next.stats, ...stats };
    return makeBuild(entry.name, next);
  }

  function resolveBuildList(requested, defaults, filters, kindLabel) {
    const defaultMap = new Map(
      defaults.map((entry) => [normalizeNameKey(entry.name), deepClone(entry)]),
    );

    if (Array.isArray(requested) && requested.length && typeof requested[0] !== 'string') {
      return deepClone(requested);
    }

    const names = requested == null
      ? (Array.isArray(filters) ? filters : parseCsv(filters))
      : (Array.isArray(requested) ? requested : parseCsv(requested));

    if (!names.length) return deepClone(defaults);

    const missing = [];
    const out = [];
    for (const rawName of names) {
      const hit = defaultMap.get(normalizeNameKey(rawName));
      if (!hit) {
        missing.push(rawName);
        continue;
      }
      out.push(deepClone(hit));
    }

    if (missing.length) {
      throw new Error(
        `Unknown ${kindLabel}: ${missing.join(', ')}`,
      );
    }

    return out;
  }

  function extractRunMetrics(parsed, bestNetwork) {
    const json = bestNetwork && bestNetwork.json ? bestNetwork.json : null;
    const parsedAttackerWins = firstFinite([
      parsed && parsed.attacker && parsed.attacker.wins,
    ]);
    const parsedDefenderWins = firstFinite([
      parsed && parsed.defender && parsed.defender.wins,
    ]);
    const times = firstFinite([
      json && json.times,
      parsedAttackerWins != null && parsedDefenderWins != null
        ? parsedAttackerWins + parsedDefenderWins
        : null,
    ]);

    const attackerWins = firstFinite([
      json && json.attackerWins,
      parsedAttackerWins,
    ]);
    const defenderWins = firstFinite([
      json && json.defenderWins,
      parsedDefenderWins,
    ]);

    const attackerWinPct = firstFinite([
      times && attackerWins != null ? (attackerWins / times) * 100 : null,
      parsed && parsed.attacker && parsed.attacker.winPct,
    ]);
    const defenderWinPct = firstFinite([
      times && defenderWins != null ? (defenderWins / times) * 100 : null,
      parsed && parsed.defender && parsed.defender.winPct,
    ]);

    return {
      times,
      attackerWins,
      defenderWins,
      attackerWinPct,
      defenderWinPct,
      avgTurns: firstFinite([json && json.averageTurns, parsed && parsed.meta && parsed.meta.avgTurns]),
      totalTurns: firstFinite([json && json.turns && json.turns.total, parsed && parsed.meta && parsed.meta.totalTurns]),
      shortestFight: firstFinite([json && json.turns && json.turns.min, parsed && parsed.meta && parsed.meta.shortestFight]),
      longestFight: firstFinite([json && json.turns && json.turns.max, parsed && parsed.meta && parsed.meta.longestFight]),
      A_hit: firstFinite([json && json.attackerChances && json.attackerChances.hit]),
      A_dmg1: firstFinite([json && json.attackerChances && json.attackerChances.damage1]),
      A_dmg2: firstFinite([json && json.attackerChances && json.attackerChances.damage2]),
      D_hit: firstFinite([json && json.defenderChances && json.defenderChances.hit]),
      D_dmg1: firstFinite([json && json.defenderChances && json.defenderChances.damage1]),
      D_dmg2: firstFinite([json && json.defenderChances && json.defenderChances.damage2]),
      A_totalDmg: firstFinite([json && json.attackerDamage && json.attackerDamage.total, parsed && parsed.attacker && parsed.attacker.totalDmg]),
      D_totalDmg: firstFinite([json && json.defenderDamage && json.defenderDamage.total, parsed && parsed.defender && parsed.defender.totalDmg]),
      A_minDmg: firstFinite([json && json.attackerDamage && json.attackerDamage.min, parsed && parsed.attacker && parsed.attacker.minDmg]),
      A_maxDmg: firstFinite([json && json.attackerDamage && json.attackerDamage.max, parsed && parsed.attacker && parsed.attacker.maxDmg]),
      D_minDmg: firstFinite([json && json.defenderDamage && json.defenderDamage.min, parsed && parsed.defender && parsed.defender.minDmg]),
      D_maxDmg: firstFinite([json && json.defenderDamage && json.defenderDamage.max, parsed && parsed.defender && parsed.defender.maxDmg]),
    };
  }

  function aggregateMatchupRuns(attacker, defender, rawRuns, repeatTarget) {
    const successfulRuns = rawRuns.filter((row) => !row.error);
    if (!successfulRuns.length) return null;

    const metricsRows = successfulRuns.map((row) => row.metrics || {});
    const repeatCount = successfulRuns.length;
    const times = firstFinite(metricsRows.map((m) => m.times));
    const avgAttackerWinPct = averageFinite(metricsRows.map((m) => m.attackerWinPct), 4);
    const avgDefenderWinPct = averageFinite(metricsRows.map((m) => m.defenderWinPct), 4);
    const avgTurns = averageFinite(metricsRows.map((m) => m.avgTurns), 4);
    const avgAHit = averageFinite(metricsRows.map((m) => m.A_hit), 4);
    const avgADmg1 = averageFinite(metricsRows.map((m) => m.A_dmg1), 4);
    const avgADmg2 = averageFinite(metricsRows.map((m) => m.A_dmg2), 4);
    const avgDHit = averageFinite(metricsRows.map((m) => m.D_hit), 4);
    const avgDDmg1 = averageFinite(metricsRows.map((m) => m.D_dmg1), 4);
    const avgDDmg2 = averageFinite(metricsRows.map((m) => m.D_dmg2), 4);

    const avgAttackerWins = times != null && avgAttackerWinPct != null
      ? Number(((avgAttackerWinPct / 100) * times).toFixed(4))
      : null;
    const avgDefenderWins = times != null && avgDefenderWinPct != null
      ? Number(((avgDefenderWinPct / 100) * times).toFixed(4))
      : null;

    const aggregateJson = {
      times,
      attackerWins: avgAttackerWins,
      defenderWins: avgDefenderWins,
      averageTurns: avgTurns,
      turns: {
        total: averageFinite(metricsRows.map((m) => m.totalTurns), null),
        min: minFinite(metricsRows.map((m) => m.shortestFight)),
        max: maxFinite(metricsRows.map((m) => m.longestFight)),
      },
      attackerDamage: {
        total: averageFinite(metricsRows.map((m) => m.A_totalDmg), null),
        min: minFinite(metricsRows.map((m) => m.A_minDmg)),
        max: maxFinite(metricsRows.map((m) => m.A_maxDmg)),
      },
      defenderDamage: {
        total: averageFinite(metricsRows.map((m) => m.D_totalDmg), null),
        min: minFinite(metricsRows.map((m) => m.D_minDmg)),
        max: maxFinite(metricsRows.map((m) => m.D_maxDmg)),
      },
      attackerChances: {
        hit: avgAHit,
        damage1: avgADmg1,
        damage2: avgADmg2,
      },
      defenderChances: {
        hit: avgDHit,
        damage1: avgDDmg1,
        damage2: avgDDmg2,
      },
      error: '',
    };

    return {
      attacker: attacker.name,
      defender: defender.name,
      startedAt: successfulRuns[0].startedAt,
      finishedAt: successfulRuns[successfulRuns.length - 1].finishedAt,
      pageBuilds: {
        attacker: buildToPageImport(attacker.build),
        defender: buildToPageImport(defender.build),
      },
      requestedPageBuilds: successfulRuns[0].requestedPageBuilds || null,
      verifiedPageBuilds: successfulRuns[0].verifiedPageBuilds || null,
      requestedHashes: successfulRuns[0].requestedHashes || null,
      verifiedHashes: successfulRuns[0].verifiedHashes || null,
      buildVerified: true,
      requestedAttackTypes: successfulRuns[0].requestedAttackTypes || null,
      actualAttackTypes: successfulRuns[0].actualAttackTypes || null,
      attackerBuildMatch: true,
      defenderBuildMatch: true,
      attackerAttackTypeMatch: true,
      defenderAttackTypeMatch: true,
      repeatCount,
      repeatTarget,
      parsedResults: {
        attacker: {
          wins: avgAttackerWins,
          winPct: avgAttackerWinPct,
          minDmg: aggregateJson.attackerDamage.min,
          maxDmg: aggregateJson.attackerDamage.max,
          totalDmg: aggregateJson.attackerDamage.total,
        },
        defender: {
          wins: avgDefenderWins,
          winPct: avgDefenderWinPct,
          minDmg: aggregateJson.defenderDamage.min,
          maxDmg: aggregateJson.defenderDamage.max,
          totalDmg: aggregateJson.defenderDamage.total,
        },
        meta: {
          totalTurns: aggregateJson.turns.total,
          avgTurns,
          shortestFight: aggregateJson.turns.min,
          longestFight: aggregateJson.turns.max,
        },
      },
      aggregates: {
        attackerWinPct: avgAttackerWinPct,
        defenderWinPct: avgDefenderWinPct,
        avgTurns,
        A_hit: avgAHit,
        A_dmg1: avgADmg1,
        A_dmg2: avgADmg2,
        D_hit: avgDHit,
        D_dmg1: avgDDmg1,
        D_dmg2: avgDDmg2,
        attackerWinPctMin: minFinite(metricsRows.map((m) => m.attackerWinPct)),
        attackerWinPctMax: maxFinite(metricsRows.map((m) => m.attackerWinPct)),
        defenderWinPctMin: minFinite(metricsRows.map((m) => m.defenderWinPct)),
        defenderWinPctMax: maxFinite(metricsRows.map((m) => m.defenderWinPct)),
        repeatCount,
      },
      network: {
        best: {
          kind: 'aggregate',
          json: aggregateJson,
        },
      },
    };
  }

  const DEFAULT_ATTACKERS = [
    makeBuild('MAUL_CSTAFF', {
      stats: { level: 80, hp: 595, speed: 60, dodge: 68, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal', upgrades: [] },
      misc2: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('MAUL_CSTAFF_OLD', {
      stats: { level: 80, hp: 595, speed: 60, dodge: 68, accuracy: 14 },
      armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Crystal Maul', crystal: 'Perfect Fire Crystal', upgrades: [] },
      weapon2: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Orange Crystal', upgrades: [] },
      misc2: { name: 'Projector Bots', crystal: 'Perfect Pink Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('BOMBS_RIFT_MAXHP', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('BOMBS_BOMBS_MAXHP', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('RIFT_BOMBS_MAXHP', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('CORE_VOID_ATTACKER', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Void Sword', crystal: 'Perfect Fire Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
  ];

  const STRATIFIED_ATTACKER_ARCHETYPES = [
    'MAUL_CSTAFF',
    'BOMBS_RIFT_MAXHP',
    'CORE_VOID_ATTACKER',
  ];
  const STRATIFIED_HP_BUCKETS = [500, 595, 700, 865];
  const STRATIFIED_STYLES = ['dodge-heavy', 'balanced', 'accuracy-heavy'];

  function makeStratifiedStats(hp, style) {
    // Existing repo presets imply hp + 5 * (dodge + accuracy) = 1005.
    const statBudget = (1005 - Number(hp)) / 5;
    const total = Math.round(statBudget);
    const extra = Math.max(0, total - 28);
    let dodgeShare = 0.5;

    if (style === 'dodge-heavy') dodgeShare = 0.75;
    else if (style === 'accuracy-heavy') dodgeShare = 0.25;

    let dodge = 14 + Math.round(extra * dodgeShare);
    let accuracy = total - dodge;

    if (dodge < 14) {
      dodge = 14;
      accuracy = total - dodge;
    }
    if (accuracy < 14) {
      accuracy = 14;
      dodge = total - accuracy;
    }

    return { hp: Number(hp), dodge, accuracy };
  }

  function makeStratifiedAttackers() {
    const archetypeMap = new Map(
      DEFAULT_ATTACKERS.map((entry) => [entry.name, entry]),
    );
    const out = [];

    for (const archetypeName of STRATIFIED_ATTACKER_ARCHETYPES) {
      const archetype = archetypeMap.get(archetypeName);
      if (!archetype) continue;

      for (const hp of STRATIFIED_HP_BUCKETS) {
        for (const style of STRATIFIED_STYLES) {
          const next = cloneBuildWithStats(archetype, makeStratifiedStats(hp, style));
          next.name = `${archetypeName} HP${hp} ${style}`;
          out.push(next);
        }
      }
    }

    return out;
  }

  function makeStratifiedConfig(overrides = {}) {
    return {
      attackers: makeStratifiedAttackers(),
      defenders: deepClone(DEFAULT_DEFENDERS),
      repeats: 3,
      trialsText: '10,000 times',
      ...deepClone(overrides),
    };
  }

  const DEFAULT_DEFENDERS = [
    makeBuild('SG1 Split Bombs T2', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('DL Gun Build 2', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Q15 Gun', crystal: 'Perfect Fire Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('DL Gun Build 3', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Double Barrel Sniper Rifle', crystal: 'Perfect Fire Crystal', upgrades: [] },
      misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Green Crystal', upgrades: [] },
      misc2: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Green Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('DL Gun Build 4', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Q15 Gun', crystal: 'Perfect Fire Crystal', upgrades: [] },
      misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal', upgrades: [] },
      misc2: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('DL Gun Build 7', {
      stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Double Barrel Sniper Rifle', crystal: 'Perfect Fire Crystal', upgrades: [] },
      misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Green Crystal', upgrades: [] },
      misc2: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Green Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('T2 Scythe Build', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Scythe T2', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Scythe T2', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Bio Spinal Enhancer', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('HF Core/Void', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Hellforged Armor', crystal: 'Cabrusion Crystal', upgrades: [] },
      weapon1: { name: 'Void Sword', crystal: 'Perfect Fire Crystal', upgrades: [] },
      weapon2: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
    makeBuild('Core/Void Build 1', {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },
      weapon1: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Void Sword', crystal: 'Perfect Fire Crystal', upgrades: [] },
      misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal', upgrades: [] },
      attackType: 'normal',
    }),
  ];

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function requirePlainObject(value, label) {
    if (!isPlainObject(value)) {
      throw new Error(`Invalid ${label}: expected object`);
    }
    return value;
  }

  function requireFiniteStat(stats, key, label) {
    const value = Number(stats && stats[key]);
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid ${label}.stats.${key}: expected finite number`);
    }
    return value;
  }

  function normalizeLegacyExportSlot(slot, label) {
    requirePlainObject(slot, label);

    const name = String(slot.name || '').trim();
    if (!name) {
      throw new Error(`Invalid ${label}.name: expected non-empty string`);
    }

    if (!Array.isArray(slot.upgrades)) {
      throw new Error(`Invalid ${label}.upgrades: expected array`);
    }
    const upgrades = normalizeUpgradeArray(slot.upgrades);
    if (upgrades.length !== slot.upgrades.length) {
      throw new Error(`Invalid ${label}.upgrades: entries must be non-empty strings`);
    }

    if (slot.crystal == null || String(slot.crystal).trim() === '') {
      throw new Error(`Invalid ${label}.crystal: expected non-empty string`);
    }
    const crystal = String(slot.crystal).trim();

    let crystals = null;
    if (slot.crystals != null) {
      if (!Array.isArray(slot.crystals)) {
        throw new Error(`Invalid ${label}.crystals: expected array when present`);
      }
      crystals = normalizeUpgradeArray(slot.crystals);
      if (crystals.length !== slot.crystals.length) {
        throw new Error(`Invalid ${label}.crystals: entries must be non-empty strings`);
      }
      if (crystals.length !== 4) {
        throw new Error(`Invalid ${label}.crystals: expected exactly 4 crystal entries`);
      }
    }

    return crystals
      ? { name, crystal, crystals, upgrades }
      : { name, crystal, upgrades };
  }

  function normalizeLegacyExportBuild(build, label) {
    requirePlainObject(build, label);
    const stats = requirePlainObject(build.stats, `${label}.stats`);
    const out = {
      stats: {
        level: requireFiniteStat(stats, 'level', label),
        hp: requireFiniteStat(stats, 'hp', label),
        speed: requireFiniteStat(stats, 'speed', label),
        dodge: requireFiniteStat(stats, 'dodge', label),
        accuracy: requireFiniteStat(stats, 'accuracy', label),
      },
      armor: normalizeLegacyExportSlot(build.armor, `${label}.armor`),
      weapon1: normalizeLegacyExportSlot(build.weapon1, `${label}.weapon1`),
      weapon2: normalizeLegacyExportSlot(build.weapon2, `${label}.weapon2`),
      misc1: normalizeLegacyExportSlot(build.misc1, `${label}.misc1`),
      misc2: normalizeLegacyExportSlot(build.misc2, `${label}.misc2`),
      attackType: normalizeAttackTypeStrict(build.attackType, label),
    };

    const buildLabel = String(build.label || '').trim();
    if (buildLabel) out.label = buildLabel;
    return out;
  }

  function normalizeLegacyExportEntries(entries, label) {
    if (!Array.isArray(entries) || !entries.length) {
      throw new Error(`Invalid ${label}: expected non-empty array`);
    }

    const out = [];
    const seen = new Set();
    entries.forEach((entry, index) => {
      requirePlainObject(entry, `${label}[${index}]`);
      const name = String(entry.name || '').trim();
      if (!name) {
        throw new Error(`Invalid ${label}[${index}].name: expected non-empty string`);
      }
      const key = normalizeNameKey(name);
      if (seen.has(key)) {
        throw new Error(`Duplicate ${label} name: ${name}`);
      }
      seen.add(key);

      const normalized = {
        name,
        build: normalizeLegacyExportBuild(entry.build, `${label}[${index}].build`),
      };
      if (entry.hash != null) {
        const hash = String(entry.hash || '').trim();
        if (!hash) {
          throw new Error(`Invalid ${label}[${index}].hash: expected non-empty string when present`);
        }
        normalized.hash = hash;
      }
      out.push(normalized);
    });

    return out;
  }

  // Legacy export bridge usage:
  // Terminal:
  //   mkdir -p ./tmp && \
  //   LEGACY_DEFENDER_FILE=./data/legacy-defenders-meta-v2-curated.js \
  //   LEGACY_VERIFY_DEFENDERS=all \
  //   node ./tools/export-legacy-truth-config.js > ./tmp/legacy-truth-config.json
  //
  // Browser console:
  //   await LegacyTruthCollector.runLegacyExport(PASTE_JSON_HERE, {
  //     repeats: 3,
  //     trialsText: '10,000 times',
  //     outputFile: 'data/truth/legacy-truth-current-attacker-vs-meta.json',
  //   });
  function loadLegacyExport(rawOrObject) {
    let parsed = rawOrObject;
    if (typeof rawOrObject === 'string') {
      const raw = rawOrObject.trim();
      if (!raw) {
        throw new Error('Legacy export JSON is empty.');
      }
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new Error(
          `Legacy export JSON parse failed: ${err && err.message ? err.message : String(err)}`,
        );
      }
    }

    requirePlainObject(parsed, 'legacy export root');
    const meta = requirePlainObject(parsed.meta, 'legacy export meta');
    const attackers = normalizeLegacyExportEntries(parsed.attackers, 'attackers');
    const defenders = normalizeLegacyExportEntries(parsed.defenders, 'defenders');

    if (meta.crystalSlots != null && Number(meta.crystalSlots) !== 4) {
      throw new Error(
        `Unsupported legacy export meta.crystalSlots=${meta.crystalSlots}; browser import expects 4.`,
      );
    }

    return {
      meta: deepClone(meta),
      attackers,
      defenders,
    };
  }

  async function runLegacyExport(rawOrObject, overrides = {}) {
    if (overrides != null && !isPlainObject(overrides)) {
      throw new Error('runLegacyExport() overrides must be an object when provided.');
    }
    const blocked = ['attackers', 'defenders', 'attackerFilters', 'defenderFilters'];
    const blockedKeys = blocked.filter((key) => overrides && overrides[key] != null);
    if (blockedKeys.length) {
      throw new Error(
        `runLegacyExport() does not accept ${blockedKeys.join(', ')} overrides; the export defines those lists.`,
      );
    }

    const loaded = loadLegacyExport(rawOrObject);
    return runMatrix({
      ...deepClone(overrides || {}),
      attackers: loaded.attackers,
      defenders: loaded.defenders,
      legacyExportMeta: loaded.meta,
    });
  }

  function installNetworkHooks() {
    if (window.__legacyTruthNetHooks) return window.__legacyTruthNetHooks;

    const logs = [];
    const originalFetch = window.fetch ? window.fetch.bind(window) : null;
    const originalXhrOpen = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
    const originalXhrSend = window.XMLHttpRequest && window.XMLHttpRequest.prototype.send;

    function pushLog(entry) {
      logs.push({ id: logs.length + 1, ts: Date.now(), ...entry });
      if (logs.length > 500) logs.splice(0, logs.length - 500);
    }

    if (originalFetch) {
      window.fetch = async function (...args) {
        const started = Date.now();
        const req = args[0];
        const url = typeof req === 'string' ? req : req?.url || '';
        const res = await originalFetch(...args);
        try {
          const clone = res.clone();
          const text = await clone.text();
          let json = null;
          try { json = JSON.parse(text); } catch (_) {}
          pushLog({
            kind: 'fetch',
            url,
            status: res.status,
            ok: res.ok,
            ms: Date.now() - started,
            text,
            json,
          });
        } catch (_) {}
        return res;
      };
    }

    if (originalXhrOpen && originalXhrSend) {
      window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__legacyTruthMethod = method;
        this.__legacyTruthUrl = url;
        return originalXhrOpen.call(this, method, url, ...rest);
      };

      window.XMLHttpRequest.prototype.send = function (...args) {
        const started = Date.now();
        this.addEventListener('loadend', function () {
          try {
            const text = typeof this.responseText === 'string' ? this.responseText : '';
            let json = null;
            try { json = JSON.parse(text); } catch (_) {}
            pushLog({
              kind: 'xhr',
              method: this.__legacyTruthMethod || 'GET',
              url: this.__legacyTruthUrl || '',
              status: this.status,
              ok: this.status >= 200 && this.status < 300,
              ms: Date.now() - started,
              text,
              json,
            });
          } catch (_) {}
        });
        return originalXhrSend.call(this, ...args);
      };
    }

    window.__legacyTruthNetHooks = {
      version: VERSION,
      logs,
      getSlice(startIdx) {
        return logs.slice(startIdx);
      },
      clear() {
        logs.length = 0;
      },
    };
    return window.__legacyTruthNetHooks;
  }

  function findResultsBox() {
    const direct = document.querySelector('#results-box, #results, [id*="results"]');
    if (direct) return direct;

    const candidates = Array.from(document.querySelectorAll('div, section, td, center, span'));
    const scored = candidates
      .map((el) => {
        const txt = textOf(el);
        let score = 0;
        if (/Results\s*\(/i.test(txt)) score += 20;
        if (/Attacker wins:/i.test(txt)) score += 10;
        if (/Defender wins:/i.test(txt)) score += 10;
        if (/Average Turns:/i.test(txt)) score += 5;
        if (/Shortest Fight:/i.test(txt)) score += 3;
        return { el, score, len: txt.length };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.len - a.len);
    return scored[0]?.el || null;
  }

  function getPageHandles() {
    const importButtons = getButtonsByOnclick('inputBuildCode').length
      ? getButtonsByOnclick('inputBuildCode')
      : getButtonsByValue('Import');
    const exportButtons = getExportButtons();
    const attackP1 = getButtonsByValue('Attack as P1')[0] || null;
    const attackP2 = getButtonsByValue('Attack as P2')[0] || null;
    const selects = Array.from(document.querySelectorAll('select'));
    const trialSelect = selects.find((el) => Array.from(el.options || []).some((opt) => /times/i.test(textOf(opt))));
    const attackTypeHandles = findAttackTypeSelects(selects);
    const loadingMsg = document.querySelector('#loading-msg, #loading, .loading, [id*="loading"]');
    const resultsBox = findResultsBox();

    return {
      importButtons,
      exportButtons,
      attackP1,
      attackP2,
      trialSelect,
      attackerAttackTypeSelect: attackTypeHandles.attackerAttackTypeSelect,
      defenderAttackTypeSelect: attackTypeHandles.defenderAttackTypeSelect,
      attackTypeSelectCandidates: attackTypeHandles.attackTypeSelectCandidates,
      loadingMsg,
      resultsBox,
    };
  }

  async function importBuildByButton(buttonEl, pageBuild, opts = {}) {
    if (!buttonEl) throw new Error('Import button not found.');
    const buildJson = JSON.stringify(pageBuild);
    const originalPrompt = window.prompt;
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    let promptCount = 0;
    window.prompt = function (...args) {
      promptCount += 1;
      if (opts.logPrompts) console.log('[LegacyTruthCollector] prompt args:', args);
      return buildJson;
    };
    window.alert = function (...args) {
      console.log('[LegacyTruthCollector] alert during import:', ...args);
    };
    window.confirm = function (...args) {
      console.log('[LegacyTruthCollector] confirm during import:', ...args);
      return true;
    };

    try {
      buttonEl.click();
      await sleep(opts.importDelayMs ?? 200);
      if (!promptCount && opts.strictPrompt) {
        throw new Error('Import click did not trigger prompt(). The page may be using a custom modal.');
      }
    } finally {
      window.prompt = originalPrompt;
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    }
  }

  async function exportBuildByButton(buttonEl, opts = {}) {
    if (!buttonEl) throw new Error('Export button not found.');
    const originalPrompt = window.prompt;
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    const originalClipboard = typeof navigator !== 'undefined' && navigator.clipboard
      ? navigator.clipboard
      : null;
    const originalWriteText =
      originalClipboard && typeof originalClipboard.writeText === 'function'
        ? originalClipboard.writeText
        : null;
    const originalWrite =
      originalClipboard && typeof originalClipboard.write === 'function'
        ? originalClipboard.write
        : null;
    let clipboardWriteTextPatched = false;
    let clipboardWritePatched = false;
    const beforeDomCandidates = collectExportDomCandidates();
    const beforeDomMap = new Map(beforeDomCandidates.map((entry) => [entry.key, entry.text]));

    let bestCapture = null;
    const debug = {
      button: describeButton(buttonEl),
      promptFired: false,
      promptArgs: [],
      promptDefaultValueSeen: null,
      promptReturnValueSeen: null,
      alertTexts: [],
      clipboardTextLength: null,
      domCandidates: [],
      captureSourcesTried: [],
    };

    function recordCapture(source, raw, priority, extraMeta = null) {
      const parsed = tryParsePageBuildJson(raw);
      if (!parsed) return false;
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
      if (!bestCapture || priority > bestCapture.priority) {
        bestCapture = {
          source,
          raw: text,
          pageBuild: parsed,
          priority,
          extraMeta,
        };
      }
      return true;
    }

    function rememberPromptArgs(args) {
      debug.promptArgs = args.map((arg, idx) => ({
        index: idx,
        type: typeof arg,
        length: String(arg == null ? '' : arg).length,
        preview: previewText(arg),
      }));
    }

    function scanDomCandidates() {
      const current = collectExportDomCandidates();
      const changed = [];
      current.forEach((entry) => {
        if (beforeDomMap.get(entry.key) === entry.text) return;
        changed.push(entry);
        if (debug.domCandidates.length < 8) {
          debug.domCandidates.push({
            source: entry.source,
            meta: entry.meta,
            length: entry.text.length,
            preview: previewText(entry.text),
          });
        }
        recordCapture(entry.source, entry.text, entry.source === 'domInput' ? 120 : 110, entry.meta);
      });
      return changed.length;
    }

    window.prompt = function (...args) {
      debug.promptFired = true;
      rememberPromptArgs(args);
      debug.captureSourcesTried.push('prompt');
      const defaultValue = args.length > 1 ? args[1] : '';
      debug.promptDefaultValueSeen = previewText(defaultValue);
      recordCapture('promptDefaultValue', defaultValue, 400);
      const promptReturnValue = typeof defaultValue === 'string' ? defaultValue : '';
      debug.promptReturnValueSeen = previewText(promptReturnValue);
      recordCapture('promptReturnValue', promptReturnValue, 300);
      return promptReturnValue;
    };
    window.alert = function (...args) {
      debug.captureSourcesTried.push('alert');
      debug.alertTexts = args.map((arg) => previewText(arg));
      args.forEach((arg) => {
        recordCapture('alert', arg, 200);
      });
    };
    window.confirm = function (...args) {
      debug.captureSourcesTried.push('confirm');
      args.forEach((arg) => {
        recordCapture('confirm', arg, 150);
      });
      return true;
    };
    if (originalClipboard && originalWriteText) {
      try {
        originalClipboard.writeText = async function (text) {
          debug.captureSourcesTried.push('clipboard.writeText');
          debug.clipboardTextLength = String(text || '').length;
          recordCapture('clipboardWriteText', text, 180);
          return originalWriteText.call(originalClipboard, text);
        };
        clipboardWriteTextPatched = true;
      } catch (_) {}
    }
    if (originalClipboard && originalWrite) {
      try {
        originalClipboard.write = async function (items) {
          debug.captureSourcesTried.push('clipboard.write');
          try {
            if (Array.isArray(items)) {
              for (const item of items) {
                if (!item || !Array.isArray(item.types) || !item.types.includes('text/plain')) continue;
                const blob = await item.getType('text/plain');
                const text = await blob.text();
                debug.clipboardTextLength = String(text || '').length;
                recordCapture('clipboardWrite', text, 170);
              }
            }
          } catch (_) {}
          return originalWrite.call(originalClipboard, items);
        };
        clipboardWritePatched = true;
      } catch (_) {}
    }

    try {
      buttonEl.click();
      const waitMs = opts.exportDelayMs ?? 300;
      const deadline = Date.now() + waitMs;
      while (Date.now() < deadline) {
        scanDomCandidates();
        if (bestCapture && bestCapture.priority >= 400) break;
        await sleep(50);
      }
      scanDomCandidates();
    } finally {
      window.prompt = originalPrompt;
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      if (originalClipboard && clipboardWriteTextPatched) originalClipboard.writeText = originalWriteText;
      if (originalClipboard && clipboardWritePatched) originalClipboard.write = originalWrite;
    }

    if (!bestCapture) {
      console.error('[LegacyTruthCollector] Export capture failed:', debug);
      const err = new Error('Export click did not yield a parseable page build JSON.');
      err.exportCaptureDebug = debug;
      throw err;
    }

    return {
      raw: bestCapture.raw,
      pageBuild: bestCapture.pageBuild,
      source: bestCapture.source,
    };
  }

  async function verifyCurrentPageBuilds(attackerBuild, defenderBuild, handles = getPageHandles(), opts = {}) {
    if (!handles || !Array.isArray(handles.exportButtons) || handles.exportButtons.length < 2) {
      throw new Error(`Expected at least 2 Export buttons, found ${handles && handles.exportButtons ? handles.exportButtons.length : 0}.`);
    }

    const requestedPageBuilds = {
      attacker: normalizePageBuild(buildToPageImport(attackerBuild)),
      defender: normalizePageBuild(buildToPageImport(defenderBuild)),
    };
    const requestedBuildIdentities = {
      attacker: normalizedBuildIdentity(requestedPageBuilds.attacker),
      defender: normalizedBuildIdentity(requestedPageBuilds.defender),
    };
    const requestedAttackTypes = {
      attacker: normalizeAttackType(attackerBuild && attackerBuild.attackType),
      defender: normalizeAttackType(defenderBuild && defenderBuild.attackType),
    };

    const attackerExport = await exportBuildByButton(handles.exportButtons[0], opts);
    const defenderExport = await exportBuildByButton(handles.exportButtons[1], opts);

    const verifiedPageBuilds = {
      attacker: normalizePageBuild(attackerExport.pageBuild),
      defender: normalizePageBuild(defenderExport.pageBuild),
    };
    const verifiedBuildIdentities = {
      attacker: normalizedBuildIdentity(verifiedPageBuilds.attacker),
      defender: normalizedBuildIdentity(verifiedPageBuilds.defender),
    };
    const actualAttackTypes = {
      attacker: currentSelectAttackType(handles.attackerAttackTypeSelect),
      defender: currentSelectAttackType(handles.defenderAttackTypeSelect),
    };
    const exportedAttackTypes = {
      attacker: {
        present:
          !!attackerExport.pageBuild
          && Object.prototype.hasOwnProperty.call(attackerExport.pageBuild, 'attackType'),
        raw:
          attackerExport.pageBuild
          && Object.prototype.hasOwnProperty.call(attackerExport.pageBuild, 'attackType')
            ? attackerExport.pageBuild.attackType
            : undefined,
        normalized: normalizeAttackType(attackerExport.pageBuild && attackerExport.pageBuild.attackType),
      },
      defender: {
        present:
          !!defenderExport.pageBuild
          && Object.prototype.hasOwnProperty.call(defenderExport.pageBuild, 'attackType'),
        raw:
          defenderExport.pageBuild
          && Object.prototype.hasOwnProperty.call(defenderExport.pageBuild, 'attackType')
            ? defenderExport.pageBuild.attackType
            : undefined,
        normalized: normalizeAttackType(defenderExport.pageBuild && defenderExport.pageBuild.attackType),
      },
    };

    const requestedHashes = {
      attacker: buildHash(requestedBuildIdentities.attacker),
      defender: buildHash(requestedBuildIdentities.defender),
    };
    const verifiedHashes = {
      attacker: buildHash(verifiedBuildIdentities.attacker),
      defender: buildHash(verifiedBuildIdentities.defender),
    };

    const attackerDiff = diffNormalizedBuilds(
      requestedBuildIdentities.attacker,
      verifiedBuildIdentities.attacker,
    );
    const defenderDiff = diffNormalizedBuilds(
      requestedBuildIdentities.defender,
      verifiedBuildIdentities.defender,
    );
    const attackerBuildMatch = attackerDiff.length === 0;
    const defenderBuildMatch = defenderDiff.length === 0;
    const attackerAttackTypeMatch =
      !!handles.attackerAttackTypeSelect
      && actualAttackTypes.attacker === requestedAttackTypes.attacker;
    const defenderAttackTypeMatch =
      !!handles.defenderAttackTypeSelect
      && actualAttackTypes.defender === requestedAttackTypes.defender;

    console.log('[LegacyTruthCollector] Attack type verification:', {
      requestedAttackTypes,
      actualAttackTypes,
      exportedAttackTypes,
      attackerSelectorFound: !!handles.attackerAttackTypeSelect,
      defenderSelectorFound: !!handles.defenderAttackTypeSelect,
    });

    if (!attackerBuildMatch) {
      console.error('[LegacyTruthCollector] Attacker build verification mismatch:', {
        expected: requestedBuildIdentities.attacker,
        actual: verifiedBuildIdentities.attacker,
        diff: attackerDiff,
      });
    }
    if (!defenderBuildMatch) {
      console.error('[LegacyTruthCollector] Defender build verification mismatch:', {
        expected: requestedBuildIdentities.defender,
        actual: verifiedBuildIdentities.defender,
        diff: defenderDiff,
      });
    }
    if (!attackerAttackTypeMatch) {
      console.error('[LegacyTruthCollector] Attacker attack type selector mismatch:', {
        requested: requestedAttackTypes.attacker,
        actual: actualAttackTypes.attacker,
        selectorFound: !!handles.attackerAttackTypeSelect,
        exportedAttackType: exportedAttackTypes.attacker,
      });
    }
    if (!defenderAttackTypeMatch) {
      console.error('[LegacyTruthCollector] Defender attack type selector mismatch:', {
        requested: requestedAttackTypes.defender,
        actual: actualAttackTypes.defender,
        selectorFound: !!handles.defenderAttackTypeSelect,
        exportedAttackType: exportedAttackTypes.defender,
      });
    }

    return {
      buildVerified:
        attackerBuildMatch
        && defenderBuildMatch
        && attackerAttackTypeMatch
        && defenderAttackTypeMatch,
      attackerBuildMatch,
      defenderBuildMatch,
      attackerAttackTypeMatch,
      defenderAttackTypeMatch,
      requestedPageBuilds,
      verifiedPageBuilds,
      requestedHashes,
      verifiedHashes,
      requestedAttackTypes,
      actualAttackTypes,
      exportedAttackTypes,
      attacker: {
        match: attackerBuildMatch,
        exportRaw: attackerExport.raw,
        diff: attackerDiff,
      },
      defender: {
        match: defenderBuildMatch,
        exportRaw: defenderExport.raw,
        diff: defenderDiff,
      },
    };
  }

  async function waitForSim(handles, beforeText, timeoutMs) {
    const started = Date.now();
    const loading = handles.loadingMsg;
    const resultsBox = handles.resultsBox;
    let sawLoading = false;

    while (Date.now() - started < timeoutMs) {
      const loadingVisible = !!loading && getComputedStyle(loading).display !== 'none';
      const currentText = textOf(resultsBox);
      if (loadingVisible) sawLoading = true;
      if (sawLoading && !loadingVisible && currentText) return currentText;
      if (!loading && currentText && currentText !== beforeText) return currentText;
      await sleep(100);
    }

    const fallback = textOf(resultsBox);
    if (fallback) return fallback;
    throw new Error(`Timed out waiting for sim result after ${timeoutMs} ms.`);
  }

  function pickBestNetworkResult(logs) {
    if (!Array.isArray(logs) || !logs.length) return null;

    const scoreLog = (entry) => {
      let score = 0;
      const text = String(entry?.text || '');
      const json = entry?.json;
      if (json && typeof json === 'object') score += 20;
      if (/win|attacker|defender|turn|damage|dmg/i.test(text)) score += 10;
      if (/sim|dojo|combat|fight/i.test(String(entry?.url || ''))) score += 5;
      if (entry?.ok) score += 2;
      return score;
    };

    return logs
      .map((entry) => ({ entry, score: scoreLog(entry) }))
      .sort((a, b) => b.score - a.score || b.entry.ts - a.entry.ts)[0]?.entry || null;
  }

  async function runMatrix(config = {}) {
    const handles = getPageHandles();
    if (handles.importButtons.length < 2) {
      throw new Error(`Expected at least 2 Import buttons, found ${handles.importButtons.length}.`);
    }
    if (handles.exportButtons.length < 2) {
      throw new Error(`Expected at least 2 Export buttons, found ${handles.exportButtons.length}.`);
    }
    if (!handles.attackP1) {
      throw new Error('Attack as P1 button not found.');
    }
    if (!handles.resultsBox) {
      throw new Error('#results-box not found.');
    }

    const net = installNetworkHooks();
    const attackers = resolveBuildList(
      config.attackers,
      DEFAULT_ATTACKERS,
      config.attackerFilters,
      'attackers',
    );
    const defenders = resolveBuildList(
      config.defenders,
      DEFAULT_DEFENDERS,
      config.defenderFilters,
      'defenders',
    );
    const repeats = Math.max(1, Number(config.repeats || 1) || 1);
    const trialText = config.trialsText || '10,000 times';
    const timeoutMs = Number(config.timeoutMs || 30000);
    const importDelayMs = Number(config.importDelayMs || 250);
    const betweenRunsMs = Number(config.betweenRunsMs || 250);

    if (handles.trialSelect) {
      const ok = setSelectByText(handles.trialSelect, trialText);
      if (!ok) console.warn('[LegacyTruthCollector] Could not set trial dropdown to:', trialText);
    }

    const run = {
      collectorVersion: VERSION,
      startedAt: nowIso(),
      pageUrl: location.href,
      trialsText: trialText,
      repeats,
      filters: {
        attackers: Array.isArray(config.attackers) && typeof config.attackers[0] === 'string'
          ? config.attackers.slice()
          : parseCsv(config.attackerFilters),
        defenders: Array.isArray(config.defenders) && typeof config.defenders[0] === 'string'
          ? config.defenders.slice()
          : parseCsv(config.defenderFilters),
      },
      counts: {
        attackers: attackers.length,
        defenders: defenders.length,
        matchups: attackers.length * defenders.length,
        repeats,
        runsPlanned: attackers.length * defenders.length * repeats,
      },
      handleDiscovery: {
        attackerAttackTypeSelectFound: !!handles.attackerAttackTypeSelect,
        defenderAttackTypeSelectFound: !!handles.defenderAttackTypeSelect,
        attackTypeSelectCandidatesFound: handles.attackTypeSelectCandidates.length,
      },
      matchups: [],
      rawRuns: [],
      errors: [],
    };
    if (config.legacyExportMeta && typeof config.legacyExportMeta === 'object') {
      run.legacyExportMeta = deepClone(config.legacyExportMeta);
    }

    console.log(
      `[LegacyTruthCollector] Starting ${run.counts.matchups} matchups x ${repeats} repeats = ${run.counts.runsPlanned} runs (${attackers.length} attackers x ${defenders.length} defenders).`,
    );
    console.log(
      `[LegacyTruthCollector] Attack type selectors: attacker=${run.handleDiscovery.attackerAttackTypeSelectFound ? 'found' : 'missing'} defender=${run.handleDiscovery.defenderAttackTypeSelectFound ? 'found' : 'missing'} candidates=${run.handleDiscovery.attackTypeSelectCandidatesFound}`,
    );
    if (!run.handleDiscovery.attackerAttackTypeSelectFound || !run.handleDiscovery.defenderAttackTypeSelectFound) {
      console.warn(
        '[LegacyTruthCollector] Attack type selector(s) missing. Strict verification will still run, but attack-style verification will fail clearly until the live selector handles are found.',
      );
    }

    let runIdx = 0;
    for (const attacker of attackers) {
      for (const defender of defenders) {
        const label = `${attacker.name} vs ${defender.name}`;
        const rawRowsForMatchup = [];

        for (let repeatIndex = 1; repeatIndex <= repeats; repeatIndex += 1) {
          runIdx += 1;
          console.log(
            `[LegacyTruthCollector] [${runIdx}/${run.counts.runsPlanned}] ${label} (repeat ${repeatIndex}/${repeats})`,
          );

          const beforeText = textOf(handles.resultsBox);
          const netStart = net.logs.length;
          const startedAt = nowIso();

          try {
            const requestedAttackerPageBuild = buildToPageImport(attacker.build);
            const requestedDefenderPageBuild = buildToPageImport(defender.build);

            await importBuildByButton(handles.importButtons[0], requestedAttackerPageBuild, {
              importDelayMs,
              strictPrompt: false,
            });
            await importBuildByButton(handles.importButtons[1], requestedDefenderPageBuild, {
              importDelayMs,
              strictPrompt: false,
            });

            const attackerAttackType = normalizeAttackType(attacker.build && attacker.build.attackType);
            const defenderAttackType = normalizeAttackType(defender.build && defender.build.attackType);
            const attackerAttackTypeSet = setAttackType(
              handles.attackerAttackTypeSelect,
              attackerAttackType,
            );
            const defenderAttackTypeSet = setAttackType(
              handles.defenderAttackTypeSelect,
              defenderAttackType,
            );

            const buildVerification = await verifyCurrentPageBuilds(
              attacker.build,
              defender.build,
              handles,
              { exportDelayMs: importDelayMs },
            );
            if (!buildVerification.buildVerified) {
              throw makeBuildVerificationError(buildVerification);
            }

            handles.attackP1.click();
            const rawText = await waitForSim(handles, beforeText, timeoutMs);
            const networkLogs = net.getSlice(netStart);
            const bestNetwork = pickBestNetworkResult(networkLogs);
            const parsed = parseResultsText(rawText);
            const metrics = extractRunMetrics(parsed, bestNetwork);

            const rawRun = {
              attacker: attacker.name,
              defender: defender.name,
              repeatIndex,
              repeatCount: repeats,
              startedAt,
              finishedAt: nowIso(),
              pageBuilds: {
                attacker: requestedAttackerPageBuild,
                defender: requestedDefenderPageBuild,
              },
              requestedPageBuilds: buildVerification.requestedPageBuilds,
              verifiedPageBuilds: buildVerification.verifiedPageBuilds,
              requestedHashes: buildVerification.requestedHashes,
              verifiedHashes: buildVerification.verifiedHashes,
              buildVerified: true,
              requestedAttackTypes: buildVerification.requestedAttackTypes,
              actualAttackTypes: buildVerification.actualAttackTypes,
              attackerBuildMatch: buildVerification.attackerBuildMatch,
              defenderBuildMatch: buildVerification.defenderBuildMatch,
              attackerAttackTypeMatch: buildVerification.attackerAttackTypeMatch,
              defenderAttackTypeMatch: buildVerification.defenderAttackTypeMatch,
              attackTypes: {
                attacker: attackerAttackType,
                defender: defenderAttackType,
                attackerSelectFound: !!handles.attackerAttackTypeSelect,
                defenderSelectFound: !!handles.defenderAttackTypeSelect,
                attackerSet: attackerAttackTypeSet,
                defenderSet: defenderAttackTypeSet,
                actualAttacker: buildVerification.actualAttackTypes.attacker,
                actualDefender: buildVerification.actualAttackTypes.defender,
                exportedBuildAttacker: buildVerification.exportedAttackTypes.attacker,
                exportedBuildDefender: buildVerification.exportedAttackTypes.defender,
              },
              parsedResults: parsed,
              metrics,
              rawResultsText: rawText,
              network: {
                best: bestNetwork,
                all: networkLogs,
              },
            };

            run.rawRuns.push(rawRun);
            rawRowsForMatchup.push(rawRun);
          } catch (err) {
            const message = err && err.message ? err.message : String(err);
            console.error(`[LegacyTruthCollector] ERROR on ${label} repeat ${repeatIndex}/${repeats}:`, err);
            const errorRow = {
              attacker: attacker.name,
              defender: defender.name,
              repeatIndex,
              repeatCount: repeats,
              startedAt,
              failedAt: nowIso(),
              error: message,
              buildVerification: err && err.buildVerification ? err.buildVerification : null,
            };
            run.errors.push(errorRow);
            run.rawRuns.push(errorRow);
            rawRowsForMatchup.push(errorRow);
          }

          await sleep(betweenRunsMs);
        }

        const aggregated = aggregateMatchupRuns(attacker, defender, rawRowsForMatchup, repeats);
        if (aggregated) {
          run.matchups.push(aggregated);
        }
      }
    }

    run.finishedAt = nowIso();
    run.completed = run.matchups.length;
    run.completedRuns = run.rawRuns.length;
    run.failed = run.errors.length;

    const filename = config.outputFile || `legacy-truth-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    downloadJson(filename, run);

    console.log('[LegacyTruthCollector] Done.', {
      completed: run.completed,
      completedRuns: run.completedRuns,
      failed: run.failed,
      filename,
      run,
    });

    return run;
  }

  window.LegacyTruthCollector = {
    version: VERSION,
    DEFAULT_ATTACKERS: deepClone(DEFAULT_ATTACKERS),
    DEFAULT_DEFENDERS: deepClone(DEFAULT_DEFENDERS),
    STRATIFIED_ATTACKER_ARCHETYPES: STRATIFIED_ATTACKER_ARCHETYPES.slice(),
    STRATIFIED_HP_BUCKETS: STRATIFIED_HP_BUCKETS.slice(),
    STRATIFIED_STYLES: STRATIFIED_STYLES.slice(),
    buildToPageImport,
    loadLegacyExport,
    runLegacyExport,
    normalizeAttackType,
    normalizePageBuild,
    setAttackType,
    verifyCurrentPageBuilds,
    makeStratifiedAttackers,
    makeStratifiedConfig,
    parseResultsText,
    installNetworkHooks,
    runMatrix,

    debugHandles() {
      const h = getPageHandles();
      const out = {
        version: VERSION,
        importButtons: h.importButtons.map((el, i) => ({
          index: i,
          value: el.value || textOf(el),
          onclick: el.getAttribute && el.getAttribute('onclick'),
        })),
        exportButtons: h.exportButtons.map((el, i) => ({
          index: i,
          value: el.value || textOf(el),
          onclick: el.getAttribute && el.getAttribute('onclick'),
        })),
        attackP1: h.attackP1 ? { value: h.attackP1.value || textOf(h.attackP1), onclick: h.attackP1.getAttribute && h.attackP1.getAttribute('onclick') } : null,
        attackP2: h.attackP2 ? { value: h.attackP2.value || textOf(h.attackP2), onclick: h.attackP2.getAttribute && h.attackP2.getAttribute('onclick') } : null,
        trialSelectFound: !!h.trialSelect,
        attackerAttackTypeSelect: h.attackerAttackTypeSelect
          ? {
              name: h.attackerAttackTypeSelect.name || '',
              value: h.attackerAttackTypeSelect.value || '',
            }
          : null,
        defenderAttackTypeSelect: h.defenderAttackTypeSelect
          ? {
              name: h.defenderAttackTypeSelect.name || '',
              value: h.defenderAttackTypeSelect.value || '',
            }
          : null,
        attackTypeSelectCandidatesFound: h.attackTypeSelectCandidates.length,
        loadingMsgFound: !!h.loadingMsg,
        resultsBoxFound: !!h.resultsBox,
        resultsPreview: h.resultsBox ? textOf(h.resultsBox).slice(0, 300) : '',
      };
      console.log('[LegacyTruthCollector] debugHandles()', out);
      return out;
    },
    async quick() {
      return runMatrix({});
    },
  };

  console.log('[LegacyTruthCollector] Ready. Run LegacyTruthCollector.quick(), LegacyTruthCollector.runMatrix({...}), or LegacyTruthCollector.runLegacyExport(json, {...}).');
})();
