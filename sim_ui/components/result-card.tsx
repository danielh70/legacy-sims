'use client';

import { type CompiledCombatant, type SideSummary, type SimResponse } from '@/lib/engine/types';
import {
  buttonClass,
  chipClass,
  disclosureClass,
  disclosureSummaryClass,
  labelClass,
  panelCardClass,
} from '@/lib/ui/layout-system';

interface ResultCardProps {
  result: SimResponse | null;
  isPending: boolean;
  error: string | null;
  statusText: string;
  showDebug: boolean;
}

interface ResultSummaryCardProps {
  result: SimResponse | null;
  isPending: boolean;
  error: string | null;
  statusText: string;
  inspectOpen: boolean;
  onInspect: () => void;
}

const wholeNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number) {
  return `${formatNumber(value, 2)}%`;
}

function getWinnerLabel(result: SimResponse | null) {
  if (!result) return 'No result yet';
  if (result.attackerWinPct === result.defenderWinPct) return 'Even matchup';
  return result.attackerWinPct > result.defenderWinPct ? 'Attacker favored' : 'Defender favored';
}

function SummaryMetric({
  label,
  value,
  tone = 'text-ink',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[20px] border border-line/45 bg-white/84 px-4 py-3">
      <div className={labelClass}>{label}</div>
      <div className={`mt-1 font-display text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function OutcomeSideCard({
  label,
  tone,
  winPct,
  side,
}: {
  label: string;
  tone: string;
  winPct: number;
  side: SideSummary;
}) {
  return (
    <div className="rounded-[22px] border border-line/45 bg-white/84 p-4">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tone}`}>
        {label}
      </div>
      <div className="mt-2 font-display text-[32px] font-semibold tracking-[-0.03em] text-ink">
        {formatPercent(winPct)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <SummaryMetric label="Overall Proc" value={formatPercent(side.overallDamageChancePct)} tone={tone} />
        <SummaryMetric label="Action Range" value={`${formatNumber(side.minDamage, 1)}-${formatNumber(side.maxDamage, 1)}`} />
        <SummaryMetric label="Total Damage" value={wholeNumber.format(side.totalDamage)} />
      </div>
    </div>
  );
}

function CompiledCard({
  label,
  tone,
  side,
}: {
  label: string;
  tone: string;
  side: CompiledCombatant;
}) {
  const weaponLines = [side.weapon1, side.weapon2].filter(Boolean);
  const statRows = [
    ['Style', side.attackType ? side.attackType[0].toUpperCase() + side.attackType.slice(1) : 'Normal'],
    ['HP', wholeNumber.format(side.hp)],
    ['Arm', wholeNumber.format(side.armor)],
    ['Spd', wholeNumber.format(side.speed)],
    ['Acc', wholeNumber.format(side.acc)],
    ['Dod', wholeNumber.format(side.dodge)],
    ['Gun', wholeNumber.format(side.gun)],
    ['Mel', wholeNumber.format(side.mel)],
    ['Prj', wholeNumber.format(side.prj)],
    ['Def', wholeNumber.format(side.defSk)],
  ];

  return (
    <div className="rounded-[22px] border border-line/45 bg-white/84 p-4">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tone}`}>
        {label}
      </div>
      {weaponLines.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {weaponLines.map((weapon, index) => (
            <span
              key={`${label}-w${index + 1}-${weapon?.name}`}
              className={`${chipClass} bg-white/92`}
            >
              W{index + 1} {weapon?.name} {weapon?.min}-{weapon?.max}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {statRows.map(([statLabel, value]) => (
          <div
            key={`${label}-${statLabel}`}
            className="rounded-[18px] border border-line/40 bg-white/90 px-3 py-2.5"
          >
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink/42">{statLabel}</div>
            <div className="mt-1 font-display text-sm font-semibold text-ink">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeaponDetailSection({
  label,
  tone,
  side,
}: {
  label: string;
  tone: string;
  side: SideSummary;
}) {
  return (
    <div className="rounded-[22px] border border-line/45 bg-white/84 p-4">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tone}`}>
        {label} weapons
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          { weaponLabel: 'Weapon 1', weapon: side.weapon1 },
          { weaponLabel: 'Weapon 2', weapon: side.weapon2 },
        ].map(({ weaponLabel, weapon }) => (
          <div
            key={weaponLabel}
            className="rounded-[18px] border border-line/40 bg-white/90 px-3 py-3 text-sm text-ink/70"
          >
            <div className="font-semibold uppercase tracking-[0.14em] text-ink/45">{weaponLabel}</div>
            <div className="mt-2">Attempts {wholeNumber.format(weapon.attempts)}</div>
            <div>Hit {formatPercent(weapon.hitChancePct)}</div>
            <div>Skill | Hit {formatPercent(weapon.skillGivenHitPct)}</div>
            <div>Overall Proc {formatPercent(weapon.overallDamageChancePct)}</div>
            <div>
              Damage Range {wholeNumber.format(weapon.damageRollRange[0])}-
              {wholeNumber.format(weapon.damageRollRange[1])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultSummaryCard({
  result,
  isPending,
  error,
  statusText,
  inspectOpen,
  onInspect,
}: ResultSummaryCardProps) {
  const canInspect = Boolean(result || error);

  return (
    <section className={`${panelCardClass} bg-panel/94`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className={labelClass}>Match Summary</div>
            {isPending ? (
              <span className={`${chipClass} border-accent/25 bg-accent/10 text-accent`}>
                Running
              </span>
            ) : null}
          </div>
          <div className="mt-2 font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">
            {error ? 'Run failed' : getWinnerLabel(result)}
          </div>
          <div className="mt-1 text-sm text-ink/55">{statusText}</div>
        </div>

        <button
          type="button"
          className={
            canInspect
              ? buttonClass
              : 'inline-flex h-10 items-center justify-center rounded-xl border border-line/60 bg-line/40 px-4 text-sm font-semibold text-ink/40'
          }
          disabled={!canInspect}
          onClick={onInspect}
        >
          {inspectOpen ? 'Hide' : 'Inspect'}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-[20px] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : result ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <SummaryMetric label="Attacker" value={formatPercent(result.attackerWinPct)} tone="text-accent" />
          <SummaryMetric label="Defender" value={formatPercent(result.defenderWinPct)} tone="text-steel" />
          <SummaryMetric label="Avg Turns" value={formatNumber(result.avgTurns, 2)} />
          <SummaryMetric
            label="Turn Range"
            value={`${wholeNumber.format(result.turnsMin)}-${wholeNumber.format(result.turnsMax)}`}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-line/70 bg-white/74 px-4 py-8 text-sm text-ink/55">
          Run a simulation to populate the summary.
        </div>
      )}
    </section>
  );
}

export function ResultCard({ result, isPending, error, statusText, showDebug }: ResultCardProps) {
  return (
    <section className={`${panelCardClass} bg-panel/96 p-5 md:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/40 pb-4">
        <div>
          <div className={labelClass}>Result Inspector</div>
          <h2 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.03em] text-ink">
            {error ? 'Run failed' : getWinnerLabel(result)}
          </h2>
          <div className="mt-1 text-sm text-ink/55">{statusText}</div>
        </div>

        {isPending ? (
          <span className={`${chipClass} border-accent/25 bg-accent/10 text-accent`}>
            Running
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-[20px] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!result && !error ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-line/70 bg-white/74 px-4 py-10 text-center text-sm text-ink/55">
          Run a simulation to populate the matchup summary.
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.34fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <OutcomeSideCard
                label="Attacker"
                tone="text-accent"
                winPct={result.attackerWinPct}
                side={result.attacker}
              />
              <OutcomeSideCard
                label="Defender"
                tone="text-steel"
                winPct={result.defenderWinPct}
                side={result.defender}
              />
            </div>

            <div className="grid gap-2">
              <SummaryMetric label="Avg Turns" value={formatNumber(result.avgTurns, 2)} />
              <SummaryMetric
                label="Turn Range"
                value={`${wholeNumber.format(result.turnsMin)}-${wholeNumber.format(result.turnsMax)}`}
              />
              <SummaryMetric label="Logic Key" value={String(result.signatures.logicKey)} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <CompiledCard label="Attacker" tone="text-accent" side={result.compiled.attacker} />
            <CompiledCard label="Defender" tone="text-steel" side={result.compiled.defender} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <WeaponDetailSection label="Attacker" tone="text-accent" side={result.attacker} />
            <WeaponDetailSection label="Defender" tone="text-steel" side={result.defender} />
          </div>

          {showDebug ? (
            <details className={disclosureClass}>
              <summary className={disclosureSummaryClass}>
                <span>Debug output</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink/35">
                  Expand
                </span>
              </summary>
              <div className="grid gap-4 border-t border-line/40 px-4 py-4">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                    Engine Signatures
                  </div>
                  <pre className="overflow-x-auto rounded-[20px] bg-ink px-4 py-4 text-xs text-slate-100">
                    {JSON.stringify(
                      {
                        signatures: result.signatures,
                        cfg: result.cfg,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                    Trace
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-[20px] bg-ink px-4 py-4 text-xs text-slate-100">
                    {result.traceLines.length ? result.traceLines.join('\n') : 'No trace recorded'}
                  </pre>
                </div>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
