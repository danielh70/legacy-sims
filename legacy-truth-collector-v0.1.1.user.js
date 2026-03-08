(function () {
  'use strict';

  const VERSION = '0.1.1';

  function nowIso() {
    return new Date().toISOString();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function deepClone(x) {
    return JSON.parse(JSON.stringify(x));
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

  function setSelectByText(selectEl, textNeedle) {
    if (!selectEl) return false;
    const needle = String(textNeedle || '').trim().toLowerCase();
    const options = Array.from(selectEl.options || []);
    const match = options.find((opt) => textOf(opt).toLowerCase() === needle)
      || options.find((opt) => textOf(opt).toLowerCase().includes(needle))
      || options.find((opt) => String(opt.value).trim() === String(textNeedle).trim());
    if (!match) return false;
    selectEl.value = match.value;
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function buildToPageImport(build) {
    function slotToImport(slot) {
      if (!slot || !slot.name) return null;
      const crystal = slot.crystal || null;
      const upgrades = [];
      if (crystal) {
        for (let i = 0; i < 4; i++) upgrades.push(crystal);
      }
      if (Array.isArray(slot.upgrades) && slot.upgrades.length) {
        for (const up of slot.upgrades) upgrades.push(up);
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
      attackType: String(build.attackType || 'normal').toLowerCase().includes('aura') ? 'aura' : 'normal',
    };
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
    const exportButtons = getButtonsByOnclick('shareBuildCode').length
      ? getButtonsByOnclick('shareBuildCode')
      : getButtonsByValue('Export');
    const attackP1 = getButtonsByValue('Attack as P1')[0] || null;
    const attackP2 = getButtonsByValue('Attack as P2')[0] || null;
    const selects = Array.from(document.querySelectorAll('select'));
    const trialSelect = selects.find((el) => Array.from(el.options || []).some((opt) => /times/i.test(textOf(opt))));
    const loadingMsg = document.querySelector('#loading-msg, #loading, .loading, [id*="loading"]');
    const resultsBox = findResultsBox();

    return {
      importButtons,
      exportButtons,
      attackP1,
      attackP2,
      trialSelect,
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
    if (!handles.attackP1) {
      throw new Error('Attack as P1 button not found.');
    }
    if (!handles.resultsBox) {
      throw new Error('#results-box not found.');
    }

    const net = installNetworkHooks();
    const attackers = config.attackers || DEFAULT_ATTACKERS;
    const defenders = config.defenders || DEFAULT_DEFENDERS;
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
      counts: {
        attackers: attackers.length,
        defenders: defenders.length,
        matchups: attackers.length * defenders.length,
      },
      matchups: [],
      errors: [],
    };

    console.log(`[LegacyTruthCollector] Starting ${run.counts.matchups} matchups (${attackers.length} attackers x ${defenders.length} defenders).`);

    let idx = 0;
    for (const attacker of attackers) {
      for (const defender of defenders) {
        idx += 1;
        const label = `${attacker.name} vs ${defender.name}`;
        console.log(`[LegacyTruthCollector] [${idx}/${run.counts.matchups}] ${label}`);

        const beforeText = textOf(handles.resultsBox);
        const netStart = net.logs.length;
        const startedAt = nowIso();

        try {
          await importBuildByButton(handles.importButtons[0], buildToPageImport(attacker.build), {
            importDelayMs,
            strictPrompt: false,
          });
          await importBuildByButton(handles.importButtons[1], buildToPageImport(defender.build), {
            importDelayMs,
            strictPrompt: false,
          });

          handles.attackP1.click();
          const rawText = await waitForSim(handles, beforeText, timeoutMs);
          const networkLogs = net.getSlice(netStart);
          const bestNetwork = pickBestNetworkResult(networkLogs);
          const parsed = parseResultsText(rawText);

          run.matchups.push({
            attacker: attacker.name,
            defender: defender.name,
            startedAt,
            finishedAt: nowIso(),
            pageBuilds: {
              attacker: buildToPageImport(attacker.build),
              defender: buildToPageImport(defender.build),
            },
            parsedResults: parsed,
            rawResultsText: rawText,
            network: {
              best: bestNetwork,
              all: networkLogs,
            },
          });
        } catch (err) {
          const message = err && err.message ? err.message : String(err);
          console.error(`[LegacyTruthCollector] ERROR on ${label}:`, err);
          run.errors.push({
            attacker: attacker.name,
            defender: defender.name,
            startedAt,
            failedAt: nowIso(),
            error: message,
          });
        }

        await sleep(betweenRunsMs);
      }
    }

    run.finishedAt = nowIso();
    run.completed = run.matchups.length;
    run.failed = run.errors.length;

    const filename = config.outputFile || `legacy-truth-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    downloadJson(filename, run);

    console.log('[LegacyTruthCollector] Done.', {
      completed: run.completed,
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
    buildToPageImport,
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

  console.log('[LegacyTruthCollector] Ready. Run LegacyTruthCollector.quick() or LegacyTruthCollector.runMatrix({...}).');
})();
