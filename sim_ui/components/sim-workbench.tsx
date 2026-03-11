'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { BuildPanel } from '@/components/build-panel';
import { ResultCard, ResultSummaryCard } from '@/components/result-card';
import { Workbench, type WorkbenchState, type WorkbenchTab } from '@/components/workbench';
import {
  cloneBuild,
  normalizeSimBuild,
  type NamedBuildPreset,
  type SimBuild,
  type SimCatalog,
  type SimRequest,
  type SimResponse,
} from '@/lib/engine/types';
import {
  compactNumericControlClass,
  labelClass,
  pageShellClass,
  panelCardClass,
  railClass,
} from '@/lib/ui/layout-system';
import {
  BUILD_PART_SOCKET_COUNT,
  getBuildPartSocketCrystals,
  swapBuildWeapons,
  type SlotKey,
  validateBuild,
} from '@/lib/ui/build-ux';

interface SimWorkbenchProps {
  catalog: SimCatalog;
}

interface PersistedWorkbenchState {
  attackerBuild: SimBuild;
  defenderBuild: SimBuild;
  attackerPresetKey: string;
  defenderPresetKey: string;
  attackerReferenceBuild: SimBuild;
  defenderReferenceBuild: SimBuild;
  trials: number;
  includeTrace: boolean;
}

const STORAGE_KEY = 'legacy-sim-ui-state-v1';

const toolbarPrimaryButtonClass =
  'inline-flex h-11 items-center justify-center rounded-2xl border border-steel/10 bg-steel px-5 text-sm font-semibold text-white transition hover:bg-steel/92';
const toolbarToggleOffClass =
  'inline-flex h-11 items-center justify-center rounded-2xl border border-line/60 bg-white/88 px-4 text-sm font-semibold text-ink/72 transition hover:border-accent hover:text-accent';
const toolbarToggleOnClass =
  'inline-flex h-11 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-accent transition';

function presetMap(list: NamedBuildPreset[]) {
  return new Map(list.map((preset) => [preset.key, preset]));
}

function slotTab(slot: SlotKey): WorkbenchTab {
  if (slot === 'armor') return 'armors';
  if (slot === 'weapon1' || slot === 'weapon2') return 'weapons';
  return 'miscs';
}

function defaultSlotForTab(tab: WorkbenchTab, currentSlot: SlotKey | null): SlotKey | null {
  if (tab === 'builds') return null;
  if (tab === 'armors') return 'armor';
  if (tab === 'weapons') {
    return currentSlot === 'weapon1' || currentSlot === 'weapon2' ? currentSlot : 'weapon1';
  }
  if (tab === 'miscs') {
    return currentSlot === 'misc1' || currentSlot === 'misc2' ? currentSlot : 'misc1';
  }
  if (tab === 'upgrades') {
    if (currentSlot === 'weapon1' || currentSlot === 'weapon2' || currentSlot === 'misc1' || currentSlot === 'misc2') {
      return currentSlot;
    }
    return 'weapon1';
  }
  return currentSlot ? currentSlot : 'armor';
}

export function SimWorkbench({ catalog }: SimWorkbenchProps) {
  const attackerPresets = presetMap(catalog.attackerPresets);
  const defenderPresets = presetMap(catalog.defenderPresets);

  const [attackerBuild, setAttackerBuild] = useState<SimBuild>(cloneBuild(catalog.initialAttacker.build));
  const [defenderBuild, setDefenderBuild] = useState<SimBuild>(cloneBuild(catalog.initialDefender.build));
  const [attackerPresetKey, setAttackerPresetKey] = useState<string>(catalog.initialAttacker.key);
  const [defenderPresetKey, setDefenderPresetKey] = useState<string>(catalog.initialDefender.key);
  const [attackerReferenceBuild, setAttackerReferenceBuild] = useState<SimBuild>(
    cloneBuild(catalog.initialAttacker.build),
  );
  const [defenderReferenceBuild, setDefenderReferenceBuild] = useState<SimBuild>(
    cloneBuild(catalog.initialDefender.build),
  );
  const [trials, setTrials] = useState<number>(5000);
  const [includeTrace, setIncludeTrace] = useState<boolean>(false);
  const [result, setResult] = useState<SimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Idle');
  const [isResultInspectorOpen, setResultInspectorOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [workbenchState, setWorkbenchState] = useState<WorkbenchState>({
    side: 'attacker',
    tab: 'builds',
    slot: null,
    socketIndex: null,
    upgradeIndex: 0,
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const saved = JSON.parse(raw) as Partial<PersistedWorkbenchState>;
      if (saved.attackerBuild) setAttackerBuild(normalizeSimBuild(saved.attackerBuild));
      if (saved.defenderBuild) setDefenderBuild(normalizeSimBuild(saved.defenderBuild));
      if (saved.attackerPresetKey) setAttackerPresetKey(saved.attackerPresetKey);
      if (saved.defenderPresetKey) setDefenderPresetKey(saved.defenderPresetKey);
      if (saved.attackerReferenceBuild) {
        setAttackerReferenceBuild(normalizeSimBuild(saved.attackerReferenceBuild));
      }
      if (saved.defenderReferenceBuild) {
        setDefenderReferenceBuild(normalizeSimBuild(saved.defenderReferenceBuild));
      }
      if (typeof saved.trials === 'number') setTrials(saved.trials);
      if (typeof saved.includeTrace === 'boolean') setIncludeTrace(saved.includeTrace);
    } catch {
      // Ignore malformed localStorage payloads.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload: PersistedWorkbenchState = {
      attackerBuild,
      defenderBuild,
      attackerPresetKey,
      defenderPresetKey,
      attackerReferenceBuild,
      defenderReferenceBuild,
      trials,
      includeTrace,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    attackerBuild,
    defenderBuild,
    attackerPresetKey,
    defenderPresetKey,
    attackerReferenceBuild,
    defenderReferenceBuild,
    trials,
    includeTrace,
    hydrated,
  ]);

  const attackerValidation = useMemo(
    () => validateBuild(attackerBuild, catalog),
    [attackerBuild, catalog],
  );
  const defenderValidation = useMemo(
    () => validateBuild(defenderBuild, catalog),
    [defenderBuild, catalog],
  );
  const validationErrors = [...attackerValidation.summary, ...defenderValidation.summary];
  const canRun = !isPending && validationErrors.length === 0;
  const statusToneChipClass = error
    ? 'border-red-300 bg-red-50 text-red-700'
    : isPending
      ? 'border-accent/30 bg-accent/10 text-accent'
      : 'border-line/55 bg-white/88 text-ink/68';

  function buildForSide(side: 'attacker' | 'defender') {
    return side === 'attacker' ? attackerBuild : defenderBuild;
  }

  function focusBuilds(side: 'attacker' | 'defender') {
    setWorkbenchState({
      side,
      tab: 'builds',
      slot: null,
      socketIndex: null,
      upgradeIndex: 0,
    });
  }

  function switchWorkbenchSide(side: 'attacker' | 'defender') {
    setWorkbenchState((current) => ({
      ...current,
      side,
    }));
  }

  function switchWorkbenchTab(tab: WorkbenchTab) {
    setWorkbenchState((current) => {
      if (tab === 'builds') {
        return {
          side: current.side,
          tab,
          slot: null,
          socketIndex: null,
          upgradeIndex: 0,
        };
      }

      return {
        ...current,
        tab,
        slot: defaultSlotForTab(tab, current.slot),
        socketIndex: tab === 'crystals' ? current.socketIndex ?? 0 : null,
        upgradeIndex: tab === 'upgrades' ? current.upgradeIndex : 0,
      };
    });
  }

  function focusSlot(side: 'attacker' | 'defender', slot: SlotKey) {
    setWorkbenchState({
      side,
      tab: slotTab(slot),
      slot,
      socketIndex: null,
      upgradeIndex: 0,
    });
  }

  function focusSocket(side: 'attacker' | 'defender', slot: SlotKey, socketIndex: number) {
    const socketCrystal = getBuildPartSocketCrystals(buildForSide(side)[slot])[socketIndex] || '';
    if (socketCrystal) {
      clearCrystal(side, slot, socketIndex);
    }

    setWorkbenchState({
      side,
      tab: 'crystals',
      slot,
      socketIndex,
      upgradeIndex: 0,
    });
  }

  function assignPreset(
    side: 'attacker' | 'defender',
    presetKey: string,
    explicitBuild?: SimBuild,
  ) {
    const presetLookup = side === 'attacker' ? attackerPresets : defenderPresets;
    const preset = presetLookup.get(presetKey);
    const nextBuild = explicitBuild ? cloneBuild(explicitBuild) : preset ? cloneBuild(preset.build) : null;

    if (side === 'attacker') {
      if (nextBuild) {
        setAttackerBuild(nextBuild);
        setAttackerReferenceBuild(cloneBuild(nextBuild));
      }
      setAttackerPresetKey(presetKey);
      return;
    }

    if (nextBuild) {
      setDefenderBuild(nextBuild);
      setDefenderReferenceBuild(cloneBuild(nextBuild));
    }
    setDefenderPresetKey(presetKey);
  }

  function markCustom(side: 'attacker' | 'defender', build: SimBuild) {
    if (side === 'attacker') {
      setAttackerBuild(cloneBuild(build));
      setAttackerPresetKey('__custom__');
      return;
    }
    setDefenderBuild(cloneBuild(build));
    setDefenderPresetKey('__custom__');
  }

  function mutateSlot(
    side: 'attacker' | 'defender',
    slot: SlotKey,
    mutate: (part: SimBuild[SlotKey]) => SimBuild[SlotKey],
  ) {
    const nextBuild = cloneBuild(buildForSide(side));
    nextBuild[slot] = mutate(cloneBuild(nextBuild[slot]));
    markCustom(side, nextBuild);
  }

  function commitSockets(side: 'attacker' | 'defender', slot: SlotKey, nextSockets: string[]) {
    mutateSlot(side, slot, (part) => {
      const normalized = Array.from({ length: BUILD_PART_SOCKET_COUNT }, (_, index) => nextSockets[index] || '');
      const primaryCrystal = normalized.find(Boolean) || '';
      return {
        ...part,
        crystal: primaryCrystal,
        crystals: normalized,
      };
    });
  }

  function clearCrystal(side: 'attacker' | 'defender', slot: SlotKey, socketIndex: number) {
    const nextSockets = [...getBuildPartSocketCrystals(buildForSide(side)[slot])];
    nextSockets[socketIndex] = '';
    commitSockets(side, slot, nextSockets);
  }

  function applyItem(side: 'attacker' | 'defender', slot: SlotKey, itemName: string) {
    const nextItem = catalog.itemsByName[itemName];

    mutateSlot(side, slot, (part) => ({
      ...part,
      name: itemName,
      upgrades: nextItem?.upgradeSlots?.length ? part.upgrades.slice(0, nextItem.upgradeSlots.length) : [],
    }));
  }

  function applyCrystal(
    side: 'attacker' | 'defender',
    slot: SlotKey,
    socketIndex: number,
    crystalName: string,
  ) {
    const nextSockets = [...getBuildPartSocketCrystals(buildForSide(side)[slot])];
    nextSockets[socketIndex] = crystalName;
    commitSockets(side, slot, nextSockets);
  }

  function fillAllCrystals(side: 'attacker' | 'defender', slot: SlotKey, crystalName: string) {
    commitSockets(side, slot, Array.from({ length: BUILD_PART_SOCKET_COUNT }, () => crystalName));
  }

  function fillRemainingCrystals(side: 'attacker' | 'defender', slot: SlotKey, crystalName: string) {
    const currentSockets = getBuildPartSocketCrystals(buildForSide(side)[slot]);
    commitSockets(side, slot, currentSockets.map((crystal) => crystal || crystalName));
  }

  function clearAllCrystals(side: 'attacker' | 'defender', slot: SlotKey) {
    commitSockets(side, slot, Array.from({ length: BUILD_PART_SOCKET_COUNT }, () => ''));
  }

  function applyUpgrade(
    side: 'attacker' | 'defender',
    slot: SlotKey,
    upgradeIndex: number,
    upgradeName: string,
  ) {
    mutateSlot(side, slot, (part) => {
      const nextUpgrades = [...part.upgrades];
      nextUpgrades[upgradeIndex] = upgradeName;
      return {
        ...part,
        upgrades: nextUpgrades.filter(Boolean),
      };
    });
  }

  function swapSides() {
    const nextAttacker = cloneBuild(defenderBuild);
    const nextDefender = cloneBuild(attackerBuild);
    const nextAttackerPreset = defenderPresetKey;
    const nextDefenderPreset = attackerPresetKey;
    const nextAttackerReference = cloneBuild(defenderReferenceBuild);
    const nextDefenderReference = cloneBuild(attackerReferenceBuild);

    setAttackerBuild(nextAttacker);
    setDefenderBuild(nextDefender);
    setAttackerPresetKey(nextAttackerPreset);
    setDefenderPresetKey(nextDefenderPreset);
    setAttackerReferenceBuild(nextAttackerReference);
    setDefenderReferenceBuild(nextDefenderReference);
    setWorkbenchState((current) => ({
      ...current,
      side: current.side === 'attacker' ? 'defender' : 'attacker',
    }));
  }

  function handlePresetSelection(side: 'attacker' | 'defender', presetKey: string) {
    if (presetKey === '__custom__') {
      assignPreset(side, presetKey, buildForSide(side));
    } else {
      assignPreset(side, presetKey);
    }

    setWorkbenchState((current) => ({
      ...current,
      side,
      tab: 'builds',
      slot: null,
      socketIndex: null,
      upgradeIndex: 0,
    }));
  }

  async function runSimulation() {
    if (!canRun) return;

    const payload: SimRequest = {
      attacker: {
        key: attackerPresetKey === '__custom__' ? 'CUSTOM' : attackerPresetKey,
        label: 'Attacker',
        build: attackerBuild,
      },
      defender: {
        key: defenderPresetKey === '__custom__' ? 'CUSTOM' : defenderPresetKey,
        label: 'Defender',
        build: defenderBuild,
      },
      trials,
      includeTrace,
      seed: 1337,
    };

    setError(null);
    setStatusText('Submitting run...');

    try {
      setStatusText('Running server sim...');
      const response = await fetch('/api/sim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SimResponse | { error?: string };
      if (!response.ok) {
        setError(typeof data === 'object' && data && 'error' in data ? data.error || 'Simulation failed.' : 'Simulation failed.');
        setResult(null);
        setStatusText('Run failed.');
        return;
      }

      setResult(data as SimResponse);
      setStatusText(`Complete · key ${String((data as SimResponse).signatures.logicKey)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Simulation failed.');
      setResult(null);
      setStatusText('Run failed.');
    }
  }

  return (
    <main className={pageShellClass}>
      <section className={`${panelCardClass} bg-panel/94`}>
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Legacy Combat Simulator
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[30px] font-semibold tracking-[-0.04em] text-ink">
                Two-build sandbox
              </h1>
              <span
                className={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold ${statusToneChipClass}`}
              >
                {statusText}
              </span>
              {validationErrors.length ? (
                <span className="inline-flex h-8 items-center rounded-full border border-red-300 bg-red-50 px-3 text-[11px] font-semibold text-red-700">
                  Resolve {validationErrors.length} issue{validationErrors.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[120px_repeat(3,auto)] sm:items-end">
            <label className="grid gap-1 text-sm">
              <span className={labelClass}>Trials</span>
              <input
                className={`${compactNumericControlClass} bg-white text-left`}
                type="number"
                min={1}
                step={100}
                value={trials}
                onChange={(event) => setTrials(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
              />
            </label>

            <button
              type="button"
              className={includeTrace ? toolbarToggleOnClass : toolbarToggleOffClass}
              onClick={() => setIncludeTrace((current) => !current)}
            >
              {includeTrace ? 'Trace on' : 'Trace off'}
            </button>

            <button
              type="button"
              className={canRun ? toolbarPrimaryButtonClass : 'inline-flex h-11 items-center justify-center rounded-2xl border border-line/60 bg-line/45 px-5 text-sm font-semibold text-ink/40'}
              disabled={!canRun}
              onClick={() =>
                startTransition(() => {
                  void runSimulation();
                })
              }
            >
              Run
            </button>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-line/60 bg-white/90 px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
              disabled={isPending}
              onClick={swapSides}
            >
              Swap sides
            </button>
          </div>
        </div>
      </section>

      {isResultInspectorOpen ? (
        <ResultCard
          result={result}
          isPending={isPending}
          error={error}
          statusText={statusText}
          showDebug={includeTrace}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_384px]">
        <section className="grid gap-4 xl:grid-cols-2">
          <BuildPanel
            title="Attacker"
            tint="attacker"
            build={attackerBuild}
            referenceBuild={attackerReferenceBuild}
            selectedPresetKey={attackerPresetKey}
            presets={catalog.attackerPresets}
            catalog={catalog}
            validationSummary={attackerValidation.summary}
            slotErrors={attackerValidation.slotErrors}
            activeSlot={workbenchState.side === 'attacker' ? workbenchState.slot : null}
            activeSocketIndex={workbenchState.side === 'attacker' ? workbenchState.socketIndex : null}
            onBuildFocus={() => focusBuilds('attacker')}
            onBuildChange={(next) => markCustom('attacker', next)}
            onSwapWeapons={() => markCustom('attacker', swapBuildWeapons(attackerBuild))}
            onSlotFocus={(slot) => focusSlot('attacker', slot)}
            onSocketInteract={(slot, socketIndex) => focusSocket('attacker', slot, socketIndex)}
          />

          <BuildPanel
            title="Defender"
            tint="defender"
            build={defenderBuild}
            referenceBuild={defenderReferenceBuild}
            selectedPresetKey={defenderPresetKey}
            presets={catalog.defenderPresets}
            catalog={catalog}
            validationSummary={defenderValidation.summary}
            slotErrors={defenderValidation.slotErrors}
            activeSlot={workbenchState.side === 'defender' ? workbenchState.slot : null}
            activeSocketIndex={workbenchState.side === 'defender' ? workbenchState.socketIndex : null}
            onBuildFocus={() => focusBuilds('defender')}
            onBuildChange={(next) => markCustom('defender', next)}
            onSwapWeapons={() => markCustom('defender', swapBuildWeapons(defenderBuild))}
            onSlotFocus={(slot) => focusSlot('defender', slot)}
            onSocketInteract={(slot, socketIndex) => focusSocket('defender', slot, socketIndex)}
          />
        </section>

        <aside className={`${railClass} order-first grid gap-4 xl:order-none xl:h-[calc(100vh-2.5rem)] xl:grid-rows-[auto_minmax(0,1fr)]`}>
          <ResultSummaryCard
            result={result}
            isPending={isPending}
            error={error}
            statusText={statusText}
            inspectOpen={isResultInspectorOpen}
            onInspect={() => setResultInspectorOpen((current) => !current)}
          />

          <div className="min-h-[34rem] xl:min-h-0">
            <Workbench
              catalog={catalog}
              attackerBuild={attackerBuild}
              defenderBuild={defenderBuild}
              attackerPresetKey={attackerPresetKey}
              defenderPresetKey={defenderPresetKey}
              attackerPresets={catalog.attackerPresets}
              defenderPresets={catalog.defenderPresets}
              featuredAttackerPresetKeys={catalog.featuredAttackerPresetKeys}
              featuredDefenderPresetKeys={catalog.featuredDefenderPresetKeys}
              state={workbenchState}
              onSideChange={switchWorkbenchSide}
              onTabChange={switchWorkbenchTab}
              onPresetSelect={handlePresetSelection}
              onSocketFocus={(socketIndex) =>
                setWorkbenchState((current) => ({ ...current, tab: 'crystals', socketIndex }))
              }
              onUpgradeIndexChange={(upgradeIndex) =>
                setWorkbenchState((current) => ({ ...current, tab: 'upgrades', upgradeIndex }))
              }
              onItemApply={applyItem}
              onCrystalApply={applyCrystal}
              onFillAllCrystals={fillAllCrystals}
              onFillRemainingCrystals={fillRemainingCrystals}
              onClearAllCrystals={clearAllCrystals}
              onUpgradeApply={applyUpgrade}
            />
          </div>
        </aside>
      </section>
    </main>
  );
}
