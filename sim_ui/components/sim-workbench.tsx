'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { BuildPanel } from '@/components/build-panel';
import { ResultCard } from '@/components/result-card';
import { SlotEditor } from '@/components/slot-editor';
import { cloneBuild, type NamedBuildPreset, type SimBuild, type SimCatalog, type SimRequest, type SimResponse } from '@/lib/engine/types';
import {
  buttonClass,
  labelClass,
  numericControlClass,
  pageGridClass,
  pageShellClass,
  panelCardClass,
  railClass,
} from '@/lib/ui/layout-system';
import { swapBuildWeapons, type SlotKey, validateBuild } from '@/lib/ui/build-ux';

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

interface ActiveEditorState {
  side: 'attacker' | 'defender';
  slot: SlotKey;
}

const STORAGE_KEY = 'legacy-sim-ui-state-v1';

function presetMap(list: NamedBuildPreset[]) {
  return new Map(list.map((preset) => [preset.key, preset]));
}

const SLOT_LABELS: Record<SlotKey, string> = {
  armor: 'Armor',
  weapon1: 'Weapon 1',
  weapon2: 'Weapon 2',
  misc1: 'Misc 1',
  misc2: 'Misc 2',
};

const toolbarPrimaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-steel/20 bg-steel px-4 text-sm font-semibold text-white transition hover:bg-steel/90';
const toolbarToggleOffClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-line/60 bg-white/90 px-3 text-sm font-semibold text-ink/70 transition hover:border-accent hover:text-accent';
const toolbarToggleOnClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-3 text-sm font-semibold text-accent transition';

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
  const [activeEditor, setActiveEditor] = useState<ActiveEditorState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isPending, useServerTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const saved = JSON.parse(raw) as Partial<PersistedWorkbenchState>;
      if (saved.attackerBuild) setAttackerBuild(cloneBuild(saved.attackerBuild));
      if (saved.defenderBuild) setDefenderBuild(cloneBuild(saved.defenderBuild));
      if (saved.attackerPresetKey) setAttackerPresetKey(saved.attackerPresetKey);
      if (saved.defenderPresetKey) setDefenderPresetKey(saved.defenderPresetKey);
      if (saved.attackerReferenceBuild) {
        setAttackerReferenceBuild(cloneBuild(saved.attackerReferenceBuild));
      }
      if (saved.defenderReferenceBuild) {
        setDefenderReferenceBuild(cloneBuild(saved.defenderReferenceBuild));
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
  const panelEditor = useMemo(() => {
    if (!activeEditor) return null;

    const sideLabel = activeEditor.side === 'attacker' ? 'Attacker' : 'Defender';
    const tint = activeEditor.side === 'attacker' ? 'attacker' : 'defender';
    const build = activeEditor.side === 'attacker' ? attackerBuild : defenderBuild;
    const slotLabel = SLOT_LABELS[activeEditor.slot];
    const items =
      activeEditor.slot === 'armor'
        ? catalog.armors
        : activeEditor.slot === 'weapon1' || activeEditor.slot === 'weapon2'
          ? catalog.weapons
          : catalog.miscs;
    const errors =
      activeEditor.side === 'attacker'
        ? attackerValidation.slotErrors[activeEditor.slot]
        : defenderValidation.slotErrors[activeEditor.slot];

    return {
      side: activeEditor.side,
      sideLabel,
      tint,
      slot: activeEditor.slot,
      slotLabel,
      value: build[activeEditor.slot],
      items,
      errors,
    } as const;
  }, [
    activeEditor,
    attackerBuild,
    attackerValidation.slotErrors,
    catalog.armors,
    catalog.miscs,
    catalog.weapons,
    defenderBuild,
    defenderValidation.slotErrors,
  ]);

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

  function swapWeapons(build: SimBuild): SimBuild {
    return swapBuildWeapons(build);
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
  }

  function updateEditorSlot(nextSlotBuild: SimBuild[SlotKey]) {
    if (!activeEditor) return;

    const sourceBuild = activeEditor.side === 'attacker' ? attackerBuild : defenderBuild;
    const nextBuild = cloneBuild(sourceBuild);
    nextBuild[activeEditor.slot] = nextSlotBuild;
    markCustom(activeEditor.side, nextBuild);
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
      <section className={`${panelCardClass} px-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Legacy Combat Simulator
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
              Fast loadout editor and match summary
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-line/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-ink/65">
                {statusText}
              </span>
              <span className="rounded-full border border-line/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-ink/55">
                {hydrated ? 'Autosaved' : 'Loading saved state'}
              </span>
              {validationErrors.length ? (
                <span className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-700">
                  {validationErrors.length} validation issue{validationErrors.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-end gap-2.5 xl:max-w-[520px]">
            <label className="grid gap-1 text-sm">
              <span className={labelClass}>Trials</span>
              <input
                className={`${numericControlClass} w-28 bg-white`}
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
              className={
                canRun
                  ? toolbarPrimaryButtonClass
                  : 'inline-flex h-10 items-center justify-center rounded-xl border border-line/60 bg-line/50 px-4 text-sm font-semibold text-ink/45'
              }
              disabled={!canRun}
              onClick={() =>
                useServerTransition(() => {
                  void runSimulation();
                })
              }
            >
              Run
            </button>

            <button
              type="button"
              className={buttonClass}
              disabled={isPending}
              onClick={swapSides}
            >
              Swap sides
            </button>
          </div>
        </div>
      </section>

      <section className={pageGridClass}>
        <BuildPanel
          title="Attacker"
          tint="attacker"
          build={attackerBuild}
          referenceBuild={attackerReferenceBuild}
          selectedPresetKey={attackerPresetKey}
          presets={catalog.attackerPresets}
          featuredPresetKeys={catalog.featuredAttackerPresetKeys}
          catalog={catalog}
          validationSummary={attackerValidation.summary}
          slotErrors={attackerValidation.slotErrors}
          activeSlot={activeEditor?.side === 'attacker' ? activeEditor.slot : null}
          onPresetChange={(presetKey) => assignPreset('attacker', presetKey)}
          onBuildChange={(next) => markCustom('attacker', next)}
          onSwapWeapons={() => markCustom('attacker', swapWeapons(attackerBuild))}
          onSlotFocus={(slot) =>
            setActiveEditor((current) =>
              slot ? { side: 'attacker', slot } : current?.side === 'attacker' ? null : current,
            )
          }
        />
        <BuildPanel
          title="Defender"
          tint="defender"
          build={defenderBuild}
          referenceBuild={defenderReferenceBuild}
          selectedPresetKey={defenderPresetKey}
          presets={catalog.defenderPresets}
          featuredPresetKeys={catalog.featuredDefenderPresetKeys}
          catalog={catalog}
          validationSummary={defenderValidation.summary}
          slotErrors={defenderValidation.slotErrors}
          activeSlot={activeEditor?.side === 'defender' ? activeEditor.slot : null}
          onPresetChange={(presetKey) => assignPreset('defender', presetKey)}
          onBuildChange={(next) => markCustom('defender', next)}
          onSwapWeapons={() => markCustom('defender', swapWeapons(defenderBuild))}
          onSlotFocus={(slot) =>
            setActiveEditor((current) =>
              slot ? { side: 'defender', slot } : current?.side === 'defender' ? null : current,
            )
          }
        />
        <div className={railClass}>
          {panelEditor ? (
            <SlotEditor
              key={`${panelEditor.side}-${panelEditor.slot}-${panelEditor.value.name}`}
              label={`${panelEditor.sideLabel} -> ${panelEditor.slotLabel}`}
              tint={panelEditor.tint}
              value={panelEditor.value}
              items={panelEditor.items}
              catalog={catalog}
              errors={panelEditor.errors}
              onChange={updateEditorSlot}
              onClose={() => setActiveEditor(null)}
            />
          ) : (
            <ResultCard
              result={result}
              isPending={isPending}
              error={error}
              statusText={statusText}
              showDebug={includeTrace}
            />
          )}
        </div>
      </section>
    </main>
  );
}
