(async () => {
  // ============================================================
  // Defender attack-style check (DEFENDER-LOCKED)
  // Build locked as DEFENDER, only defender_attack_type is varied.
  // ============================================================

  const TIMES_FAST = 500;
  const TIMES_CHECK = 1000;

  const POOL_SIZE = 7;
  const META_BIAS = 0.8;

  const PACE_MS = 140;
  const BETWEEN_OPP_MS = 85;
  const BETWEEN_STYLE_MS = 220;

  const CR = {
    AMULET: 'Amulet Crystal',
    PINK: 'Perfect Pink Crystal',
  };
  const repeat4 = (x) => [x, x, x, x];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const STATS = { hp: '550', speed: '60', dodge: '67', accuracy: '14', level: '80' };

  // ---- locked build ----
  const BASE = {
    // armor: {
    //   name: 'Dark Legion Armor',
    //   upgrades: repeat4('Abyss Crystal'),
    //   label: 'Dark Legion(Abyss)',
    // },
    armor: {
      name: 'SG1 Armor',
      upgrades: repeat4('Abyss Crystal'),
      label: 'SG1(Abyss)',
    },
    weapon1: { name: 'Core Staff', upgrades: repeat4(CR.AMULET) },
    weapon2: { name: 'Crystal Maul', upgrades: repeat4(CR.AMULET) },
    misc1: { name: 'Bio Spinal Enhancer', upgrades: repeat4(CR.PINK) },
    misc2: { name: 'Bio Spinal Enhancer', upgrades: repeat4(CR.PINK) },
    stats: { ...STATS },
    attackType: 'normal',
    __weaponType: 'melee',
  };

  // ---- prompt-safe apply ----
  async function applyBuild(side, buildObj) {
    if (typeof window.inputBuildCode !== 'function') throw new Error('inputBuildCode not found.');
    const payload = JSON.stringify(buildObj);
    const oldPrompt = window.prompt;
    window.prompt = () => payload;
    try {
      window.inputBuildCode(side);
    } finally {
      window.prompt = oldPrompt;
    }
    await sleep(PACE_MS);
  }

  // ---- IMPORTANT: set DEFENDER attack style using the real dropdown ----
  function setDefenderAttackType(type) {
    const sel = document.querySelector('select[name="defender_attack_type"]');
    if (!sel) throw new Error('defender_attack_type select not found');
    sel.value = type; // must be one of: normal, quick, aimed, cover
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sel.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setTimes(times) {
    const sel = document.querySelector('#times-input');
    if (!sel) throw new Error('times-input select not found');
    sel.value = String(times);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function resultsText() {
    const box = document.querySelector('#results-box');
    return box ? box.textContent || '' : '';
  }

  function parseAttackerWinPct(txt) {
    const m = txt.match(/Attacker wins[^()]*\(([\d.]+)%\)/i);
    if (!m) throw new Error('Could not parse attacker win%.');
    return parseFloat(m[1]);
  }

  async function waitForResultChange(prevTxt, timeoutMs = 240000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeoutMs) {
      const txt = resultsText();
      if (txt && txt !== prevTxt && /Attacker wins/i.test(txt)) return txt;
      await sleep(70);
    }
    throw new Error('Timed out waiting for sim result.');
  }

  let SIM_LOCK = false;
  async function runSimOnce(timesRequested, defenderType) {
    while (SIM_LOCK) await sleep(60);
    SIM_LOCK = true;
    try {
      setTimes(timesRequested);
      await sleep(PACE_MS);

      // FORCE it right before sim
      setDefenderAttackType(defenderType);
      await sleep(60);

      const prev = resultsText();
      const btn = document.querySelector('input.attackButton[value="Attack as P1"]');
      if (!btn) throw new Error('Attack as P1 button not found');
      btn.click();

      const txt = await waitForResultChange(prev);
      return parseAttackerWinPct(txt);
    } finally {
      SIM_LOCK = false;
    }
  }

  // ---- attacker presets ----
  function getPresetIndices() {
    const btns = [
      ...document.querySelectorAll("input.button[type='button'][value='Attacker']"),
    ].filter((b) => (b.getAttribute('onclick') || '').includes('updateCombatantWithBuildIndex('));
    return btns.map((_, i) => i);
  }

  function presetNameByIndex(idx) {
    const boxes = [...document.querySelectorAll('.build-box')];
    const box = boxes[idx];
    return box?.querySelector('.name')?.textContent?.trim() || `Preset#${idx}`;
  }

  function isMeta(name) {
    const s = (name || '').toLowerCase();
    return s.includes('rift') || s.includes('core staff') || s.includes('corestaff');
  }

  async function setAttackerToPreset(idx) {
    if (typeof window.updateCombatantWithBuildIndex !== 'function')
      throw new Error('updateCombatantWithBuildIndex not found.');
    window.updateCombatantWithBuildIndex(idx, true);
    await sleep(PACE_MS);
  }

  const allIdxs = getPresetIndices();
  if (!allIdxs.length) throw new Error('No attacker preset buttons found.');

  const nameCache = new Map();
  const getName = (i) =>
    nameCache.has(i)
      ? nameCache.get(i)
      : (nameCache.set(i, presetNameByIndex(i)), nameCache.get(i));

  const metaIdxs = allIdxs.filter((i) => isMeta(getName(i)));
  const otherIdxs = allIdxs.filter((i) => !isMeta(getName(i)));

  function makePool(seed) {
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const shuf = (arr) => arr.slice().sort(() => rand() - 0.5);

    const need = Math.min(POOL_SIZE, allIdxs.length);
    const wantMeta = Math.min(need, Math.floor(need * META_BIAS));
    const wantOther = need - wantMeta;

    const pool = [];
    pool.push(...shuf(metaIdxs.length ? metaIdxs : allIdxs).slice(0, wantMeta));
    pool.push(...shuf(otherIdxs.length ? otherIdxs : allIdxs).slice(0, wantOther));

    const set = new Set(pool);
    const out = [...set];
    if (out.length < need) {
      for (const x of shuf(allIdxs)) {
        if (out.length >= need) break;
        if (!set.has(x)) {
          set.add(x);
          out.push(x);
        }
      }
    }
    return out;
  }

  const POOL_A = makePool(4441);
  const POOL_B = makePool(4442);

  console.log('POOL A:', POOL_A.map(getName));
  console.log('POOL B:', POOL_B.map(getName), '\n');

  async function scoreOnPool(defenderType, times, pool) {
    // defender build is fixed; just ensure it's applied once per call
    await applyBuild('defender', BASE);

    let sum = 0,
      worst = 100;

    for (const idx of pool) {
      await setAttackerToPreset(idx);
      const atkWin = await runSimOnce(times, defenderType);
      const defWin = 100 - atkWin;
      sum += defWin;
      worst = Math.min(worst, defWin);
      await sleep(BETWEEN_OPP_MS);
    }
    return { avg: sum / pool.length, worst };
  }

  async function scoreStyle(defenderType, times) {
    const a = await scoreOnPool(defenderType, times, POOL_A);
    const b = await scoreOnPool(defenderType, times, POOL_B);
    return { meta: (a.avg + b.avg) / 2, worst: Math.min(a.worst, b.worst) };
  }

  // IMPORTANT: use "cover" not "covered"
  const STYLES = ['normal', 'aimed', 'cover']; // add "quick" if you want

  console.log(`Build locked. Testing DEFENDER attack type: ${STYLES.join(', ')}\n`);

  // FAST
  const fast = [];
  for (const s of STYLES) {
    console.log(`FAST @${TIMES_FAST}: defender=${s}`);
    const r = await scoreStyle(s, TIMES_FAST);
    fast.push({ style: s, ...r });
    console.log(`  -> meta=${r.meta.toFixed(2)} | worst=${r.worst.toFixed(2)}\n`);
    await sleep(BETWEEN_STYLE_MS);
  }

  fast.sort((a, b) => b.meta - a.meta);
  console.log(`=== FAST RANK @${TIMES_FAST} (meta | worst) ===`);
  fast.forEach((x, i) =>
    console.log(
      `#${String(i + 1).padStart(2, '0')} meta=${x.meta.toFixed(2)} | worst=${x.worst.toFixed(2)} | ${x.style}`,
    ),
  );

  // RECHECK top 2
  const top2 = fast.slice(0, 2);
  const checked = [];
  for (let i = 0; i < top2.length; i++) {
    console.log(`\nrecheck #${i + 1}/${top2.length} @${TIMES_CHECK}: defender=${top2[i].style}`);
    const r = await scoreStyle(top2[i].style, TIMES_CHECK);
    checked.push({ style: top2[i].style, ...r });
    console.log(`  CHECK -> meta=${r.meta.toFixed(2)} | worst=${r.worst.toFixed(2)}`);
    await sleep(BETWEEN_STYLE_MS);
  }

  checked.sort((a, b) => b.meta - a.meta);
  console.log(`\n=== RECHECK RANK @${TIMES_CHECK} (meta | worst) ===`);
  checked.forEach((x, i) =>
    console.log(
      `#${String(i + 1).padStart(2, '0')} meta=${x.meta.toFixed(2)} | worst=${x.worst.toFixed(2)} | ${x.style}`,
    ),
  );

  const best = checked[0] || fast[0];
  console.log(
    `\nBEST DEFENDER ATTACK TYPE: ${best.style} | meta=${best.meta.toFixed(2)} | worst=${best.worst.toFixed(2)}`,
  );
  window.__legacy_best_defender_attack_type = {
    fast,
    checked,
    pools: { A: POOL_A.map(getName), B: POOL_B.map(getName) },
    build: BASE,
  };
})();
