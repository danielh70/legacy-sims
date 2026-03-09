'use client';

import { type CompiledCombatant, type SideSummary, type SimResponse } from '@/lib/engine/types';
import {
  disclosureClass,
  disclosureSummaryClass,
  innerSurfaceClass,
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

const wholeNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const summaryCardClass = `${innerSurfaceClass} border border-line/60`;
const summaryPillClass = 'rounded-xl bg-white/88 px-3 py-2 ring-1 ring-line/10';
const subpanelClass = 'rounded-2xl bg-panel/60 p-3 ring-1 ring-line/10';

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number) {
  return `${formatNumber(value, 2)}%`;
}

function SummaryPill({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={summaryPillClass}>
      <div className={labelClass}>{label}</div>
      <div className={`mt-1 font-display text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function ComparisonRow({
  label,
  attacker,
  defender,
}: {
  label: string;
  attacker: string;
  defender: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(92px,1fr)_minmax(72px,0.8fr)_minmax(72px,0.8fr)] items-center gap-2 rounded-xl bg-white/88 px-3 py-2 ring-1 ring-line/10">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">{label}</div>
      <div className="text-right text-sm font-semibold text-accent">{attacker}</div>
      <div className="text-right text-sm font-semibold text-steel">{defender}</div>
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
    <div className={subpanelClass}>
      <div className={`mb-2 font-display text-sm font-semibold ${tone}`}>{label}</div>
      {weaponLines.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {weaponLines.map((weapon, index) => (
            <span
              key={`${label}-w${index + 1}-${weapon?.name}`}
              className="inline-flex h-7 items-center rounded-full border border-line/60 bg-white/92 px-2.5 text-[11px] font-semibold text-ink/70"
            >
              W{index + 1} {weapon?.name} {weapon?.min}-{weapon?.max}
            </span>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {statRows.map(([statLabel, value]) => (
          <div key={`${label}-${statLabel}`} className="rounded-xl bg-white/88 px-2.5 py-2 ring-1 ring-line/10">
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink/45">{statLabel}</div>
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
    <div className={subpanelClass}>
      <div className={`mb-2 font-display text-sm font-semibold ${tone}`}>{label} Weapon Detail</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { weaponLabel: 'Weapon 1', weapon: side.weapon1 },
          { weaponLabel: 'Weapon 2', weapon: side.weapon2 },
        ].map(({ weaponLabel, weapon }) => (
          <div key={weaponLabel} className="rounded-xl bg-white/88 px-3 py-2 text-xs text-ink/70 ring-1 ring-line/10">
            <div className="font-semibold uppercase tracking-[0.12em] text-ink/45">{weaponLabel}</div>
            <div className="mt-1">Attempts {wholeNumber.format(weapon.attempts)}</div>
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

export function ResultCard({ result, isPending, error, statusText, showDebug }: ResultCardProps) {
  const winnerLabel =
    result && result.attackerWinPct !== result.defenderWinPct
      ? result.attackerWinPct > result.defenderWinPct
        ? 'Attacker favored'
        : 'Defender favored'
      : 'Even matchup';

  return (
    <section className={panelCardClass}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Results</h2>
          <div className="text-xs text-ink/55">{statusText}</div>
        </div>
        {isPending ? (
          <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Running
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!result && !error ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/55 px-4 py-7 text-center text-sm text-ink/50">
          Run a simulation to populate the matchup summary.
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-3">
          <div className={summaryCardClass}>
            <div className={labelClass}>Summary</div>
            <div className="mt-1 font-display text-base font-semibold text-ink">{winnerLabel}</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryPill label="Attacker Win" value={formatPercent(result.attackerWinPct)} tone="text-accent" />
            <SummaryPill label="Defender Win" value={formatPercent(result.defenderWinPct)} tone="text-steel" />
            <SummaryPill label="Avg Turns" value={formatNumber(result.avgTurns, 2)} />
            <SummaryPill
              label="Turn Range"
              value={`${wholeNumber.format(result.turnsMin)}-${wholeNumber.format(result.turnsMax)}`}
            />
          </div>

          <details className={disclosureClass}>
            <summary className={disclosureSummaryClass}>
              <span>Final combat stats</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/35">
                Expand
              </span>
            </summary>
            <div className="grid gap-2 border-t border-line/40 px-3 py-3">
              <CompiledCard label="Attacker" tone="text-accent" side={result.compiled.attacker} />
              <CompiledCard label="Defender" tone="text-steel" side={result.compiled.defender} />
            </div>
          </details>

          <details className={disclosureClass}>
            <summary className={disclosureSummaryClass}>
              <span>Advanced metrics</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/35">
                Expand
              </span>
            </summary>
            <div className="grid gap-3 border-t border-line/40 px-3 py-3">
              <div className="grid gap-2">
                <div className="grid grid-cols-[minmax(92px,1fr)_minmax(72px,0.8fr)_minmax(72px,0.8fr)] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                  <div />
                  <div className="text-right text-accent">Attacker</div>
                  <div className="text-right text-steel">Defender</div>
                </div>
                <ComparisonRow
                  label="Overall Proc"
                  attacker={formatPercent(result.attacker.overallDamageChancePct)}
                  defender={formatPercent(result.defender.overallDamageChancePct)}
                />
                <ComparisonRow
                  label="Min Action"
                  attacker={formatNumber(result.attacker.minDamage, 1)}
                  defender={formatNumber(result.defender.minDamage, 1)}
                />
                <ComparisonRow
                  label="Max Action"
                  attacker={formatNumber(result.attacker.maxDamage, 1)}
                  defender={formatNumber(result.defender.maxDamage, 1)}
                />
                <ComparisonRow
                  label="W1 Hit"
                  attacker={formatPercent(result.attacker.weapon1.hitChancePct)}
                  defender={formatPercent(result.defender.weapon1.hitChancePct)}
                />
                <ComparisonRow
                  label="W2 Hit"
                  attacker={formatPercent(result.attacker.weapon2.hitChancePct)}
                  defender={formatPercent(result.defender.weapon2.hitChancePct)}
                />
                <ComparisonRow
                  label="W1 Proc"
                  attacker={formatPercent(result.attacker.weapon1.overallDamageChancePct)}
                  defender={formatPercent(result.defender.weapon1.overallDamageChancePct)}
                />
                <ComparisonRow
                  label="W2 Proc"
                  attacker={formatPercent(result.attacker.weapon2.overallDamageChancePct)}
                  defender={formatPercent(result.defender.weapon2.overallDamageChancePct)}
                />
              </div>

              <div className="grid gap-2">
                <WeaponDetailSection label="Attacker" tone="text-accent" side={result.attacker} />
                <WeaponDetailSection label="Defender" tone="text-steel" side={result.defender} />
              </div>
            </div>
          </details>

          {showDebug ? (
            <details className={disclosureClass}>
              <summary className={disclosureSummaryClass}>
                <span>Debug output</span>
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/35">
                  Expand
                </span>
              </summary>
              <div className="grid gap-3 border-t border-line/40 px-3 py-3">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                    Engine Signatures
                  </div>
                  <pre className="overflow-x-auto rounded-2xl bg-ink px-4 py-3 text-xs text-slate-100">
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
                  <pre className="max-h-80 overflow-auto rounded-2xl bg-ink px-4 py-3 text-xs text-slate-100">
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
