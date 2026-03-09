'use client';

import { type SimResponse } from '@/lib/engine/types';

interface ResultCardProps {
  result: SimResponse | null;
  isPending: boolean;
  error: string | null;
  statusText: string;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-white/80 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.16em] text-ink/50">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

function ComparisonRow({
  label,
  attacker,
  defender,
  emphasize = false,
}: {
  label: string;
  attacker: string;
  defender: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[minmax(120px,1fr)_minmax(88px,0.8fr)_minmax(88px,0.8fr)] items-center gap-3 rounded-2xl border px-3 py-2 ${
      emphasize ? 'border-accent/25 bg-accent/10' : 'border-line/70 bg-white/80'
    }`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">{label}</div>
      <div className="text-right font-display text-lg font-semibold text-accent">{attacker}</div>
      <div className="text-right font-display text-lg font-semibold text-steel">{defender}</div>
    </div>
  );
}

export function ResultCard({ result, isPending, error, statusText }: ResultCardProps) {
  return (
    <section className="rounded-[28px] border border-line bg-panel/90 p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Simulation Result</h2>
          <p className="text-sm text-ink/60">Server-side execution against the shared Legacy engine.</p>
        </div>
        {isPending ? (
          <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Running
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!result && !error ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 px-4 py-8 text-center text-sm text-ink/55">
          {statusText || 'Run a sim to populate win rate, damage totals, and compiled combat stats.'}
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
            <StatPill label="Attacker Win" value={`${result.attackerWinPct.toFixed(2)}%`} />
            <StatPill label="Defender Win" value={`${result.defenderWinPct.toFixed(2)}%`} />
            <StatPill label="Avg Turns" value={result.avgTurns.toFixed(2)} />
            <StatPill label="Turn Range" value={`${result.turnsMin}-${result.turnsMax}`} />
            <StatPill label="Att Total Dmg" value={result.attacker.totalDamage.toFixed(1)} />
            <StatPill label="Def Total Dmg" value={result.defender.totalDamage.toFixed(1)} />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-line/80 bg-white/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-ink">Side-by-Side Compare</h3>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                  <div className="text-right text-accent">Attacker</div>
                  <div className="text-right text-steel">Defender</div>
                </div>
              </div>
              <div className="grid gap-2">
                <ComparisonRow
                  label="Win Rate"
                  attacker={`${result.attackerWinPct.toFixed(2)}%`}
                  defender={`${result.defenderWinPct.toFixed(2)}%`}
                  emphasize
                />
                <ComparisonRow
                  label="Total Damage"
                  attacker={result.attacker.totalDamage.toFixed(1)}
                  defender={result.defender.totalDamage.toFixed(1)}
                />
                <ComparisonRow
                  label="Min Action"
                  attacker={result.attacker.minDamage.toFixed(1)}
                  defender={result.defender.minDamage.toFixed(1)}
                />
                <ComparisonRow
                  label="Max Action"
                  attacker={result.attacker.maxDamage.toFixed(1)}
                  defender={result.defender.maxDamage.toFixed(1)}
                />
                <ComparisonRow
                  label="Overall Proc"
                  attacker={`${result.attacker.overallDamageChancePct.toFixed(2)}%`}
                  defender={`${result.defender.overallDamageChancePct.toFixed(2)}%`}
                />
                <ComparisonRow
                  label="W1 Hit"
                  attacker={`${result.attacker.weapon1.hitChancePct.toFixed(2)}%`}
                  defender={`${result.defender.weapon1.hitChancePct.toFixed(2)}%`}
                />
                <ComparisonRow
                  label="W2 Hit"
                  attacker={`${result.attacker.weapon2.hitChancePct.toFixed(2)}%`}
                  defender={`${result.defender.weapon2.hitChancePct.toFixed(2)}%`}
                />
                <ComparisonRow
                  label="W1 Dmg Proc"
                  attacker={`${result.attacker.weapon1.overallDamageChancePct.toFixed(2)}%`}
                  defender={`${result.defender.weapon1.overallDamageChancePct.toFixed(2)}%`}
                />
                <ComparisonRow
                  label="W2 Dmg Proc"
                  attacker={`${result.attacker.weapon2.overallDamageChancePct.toFixed(2)}%`}
                  defender={`${result.defender.weapon2.overallDamageChancePct.toFixed(2)}%`}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { label: 'Attacker', side: result.attacker, tone: 'text-accent' },
                { label: 'Defender', side: result.defender, tone: 'text-steel' },
              ].map(({ label, side, tone }) => (
                <div key={label} className="rounded-2xl border border-line/80 bg-white/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className={`font-display text-lg font-semibold ${tone}`}>{label}</h3>
                    <div className="text-sm text-ink/60">
                      proc {side.overallDamageChancePct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <StatPill label="Min Dmg" value={side.minDamage.toFixed(1)} />
                    <StatPill label="Max Dmg" value={side.maxDamage.toFixed(1)} />
                    <StatPill label="Attempts" value={String(side.attempts)} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {[
                      { weaponLabel: 'Weapon 1', weapon: side.weapon1 },
                      { weaponLabel: 'Weapon 2', weapon: side.weapon2 },
                    ].map(({ weaponLabel, weapon }) => (
                      <div key={weaponLabel} className="rounded-2xl border border-line/70 bg-panel px-3 py-3">
                        <div className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-steel">
                          {weaponLabel}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-ink/75">
                          <div>hit {weapon.hitChancePct.toFixed(2)}%</div>
                          <div>skill|hit {weapon.skillGivenHitPct.toFixed(2)}%</div>
                          <div>overall dmg {weapon.overallDamageChancePct.toFixed(2)}%</div>
                          <div>
                            dmg range {weapon.damageRollRange[0]}-{weapon.damageRollRange[1]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details className="rounded-2xl border border-line/80 bg-white/80 p-4">
            <summary className="cursor-pointer font-display text-base font-semibold text-ink">
              Details / Debug
            </summary>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-steel">
                  Compiled Attacker
                </h3>
                <pre className="overflow-x-auto rounded-2xl bg-ink px-4 py-3 text-xs text-slate-100">
                  {JSON.stringify(result.compiled.attacker, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-steel">
                  Compiled Defender
                </h3>
                <pre className="overflow-x-auto rounded-2xl bg-ink px-4 py-3 text-xs text-slate-100">
                  {JSON.stringify(result.compiled.defender, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-steel">
                  Engine Signatures
                </h3>
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
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-steel">
                  Trace
                </h3>
                <pre className="max-h-80 overflow-auto rounded-2xl bg-ink px-4 py-3 text-xs text-slate-100">
                  {result.traceLines.length ? result.traceLines.join('\n') : 'Trace disabled'}
                </pre>
              </div>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}
