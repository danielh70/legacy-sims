'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { BuildPanel } from '@/components/build-panel';
import { ResultCard } from '@/components/result-card';
import { cloneBuild, type NamedBuildPreset, type SimBuild, type SimCatalog, type SimRequest, type SimResponse } from '@/lib/engine/types';
import { swapBuildWeapons, validateBuild } from '@/lib/ui/build-ux';

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

function presetMap(list: NamedBuildPreset[]) {
  return new Map(list.map((preset) => [preset.key, preset]));
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
    setStatusText('Sending build to server...');

    try {
      setStatusText('Legacy simulator running on the server...');
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
      setStatusText(`Completed with exact legacy server logic key ${String((data as SimResponse).signatures.logicKey)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Simulation failed.');
      setResult(null);
      setStatusText('Run failed.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1560px] flex-col gap-4 px-4 py-6 lg:px-6">
      <section className="overflow-hidden rounded-[32px] border border-line bg-panel/90 shadow-panel">
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] lg:px-6">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Legacy Combat Simulator
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink lg:text-4xl">
              Accuracy-first UI over the existing server-side sim.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              `sim_ui` keeps item defs, defender payloads, and combat execution rooted in the current
              `legacy-sim-v1.0.4-clean.js` module. The UI only edits build payloads and sends them to a
              Node route for execution.
            </p>
            <div className="mt-4 inline-flex rounded-2xl border border-moss/30 bg-moss/10 px-4 py-2 text-sm text-ink">
              Server sim uses the exact legacy Node logic. No client-side combat resolution is used.
            </div>
          </div>

          <div className="rounded-[28px] border border-line/80 bg-white/70 p-4">
            <div className="mb-4 rounded-2xl border border-line/70 bg-panel px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
                    Run Status
                  </div>
                  <div className="mt-1 text-sm text-ink/75">{statusText}</div>
                </div>
                <div className="text-xs text-ink/50">{hydrated ? 'Autosaved locally' : 'Loading local state'}</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line/70">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-accent via-steel to-moss transition-all ${
                    isPending ? 'w-2/3 animate-pulse' : result ? 'w-full' : 'w-1/5'
                  }`}
                />
              </div>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-xs uppercase tracking-[0.14em] text-ink/55">Trials</span>
                <input
                  className="rounded-xl border border-line bg-white px-3 py-2 outline-none transition focus:border-accent"
                  type="number"
                  min={1}
                  step={100}
                  value={trials}
                  onChange={(event) => setTrials(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs uppercase tracking-[0.14em] text-ink/55">Debug</span>
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    includeTrace
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-white text-ink/70 hover:border-accent/40'
                  }`}
                  onClick={() => setIncludeTrace((current) => !current)}
                >
                  {includeTrace ? 'Trace on' : 'Trace off'}
                </button>
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  canRun
                    ? 'border-steel/20 bg-steel text-white hover:bg-steel/90'
                    : 'cursor-not-allowed border-line bg-line/50 text-ink/45'
                }`}
                disabled={!canRun}
                onClick={() =>
                  useServerTransition(() => {
                    void runSimulation();
                  })
                }
              >
                Run Sim
              </button>
              <button
                type="button"
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
                disabled={isPending}
                onClick={swapSides}
              >
                Swap Attacker / Defender
              </button>
              <button
                type="button"
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
                disabled={isPending}
                onClick={() => {
                  setDefenderBuild(cloneBuild(attackerBuild));
                  setDefenderPresetKey('__custom__');
                  setDefenderReferenceBuild(cloneBuild(attackerBuild));
                }}
              >
                Copy Attacker to Defender
              </button>
              <button
                type="button"
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
                disabled={isPending}
                onClick={() => {
                  setAttackerBuild(cloneBuild(defenderBuild));
                  setAttackerPresetKey('__custom__');
                  setAttackerReferenceBuild(cloneBuild(defenderBuild));
                }}
              >
                Copy Defender to Attacker
              </button>
            </div>

            {validationErrors.length ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-700">
                Resolve validation issues before running the server sim.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
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
          onPresetChange={(presetKey) => assignPreset('attacker', presetKey)}
          onBuildChange={(next) => markCustom('attacker', next)}
          onSwapWeapons={() => markCustom('attacker', swapWeapons(attackerBuild))}
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
          onPresetChange={(presetKey) => assignPreset('defender', presetKey)}
          onBuildChange={(next) => markCustom('defender', next)}
          onSwapWeapons={() => markCustom('defender', swapWeapons(defenderBuild))}
        />
      </section>

      <ResultCard result={result} isPending={isPending} error={error} statusText={statusText} />
    </main>
  );
}
