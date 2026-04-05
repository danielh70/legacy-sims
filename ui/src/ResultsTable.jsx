function winColor(pct) {
  if (pct >= 70) return 'text-accent-green';
  if (pct >= 50) return 'text-accent-yellow';
  if (pct >= 30) return 'text-accent-orange';
  return 'text-accent-red';
}

export default function ResultsTable({ results }) {
  if (!results || !results.variants || results.variants.length === 0) {
    return null;
  }

  const variant = results.variants[0];
  const defenders = variant.defenders || [];

  if (defenders.length === 0) {
    return (
      <div className="bg-dark-800 rounded-lg p-3 border border-dark-600">
        <p className="text-gray-400 text-sm">No results to display.</p>
      </div>
    );
  }

  const sorted = [...defenders].sort((a, b) => a.winPct - b.winPct);
  const summary = variant.summary;

  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-600">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-accent-yellow uppercase tracking-wider">Results</h2>
        {summary && (
          <span className="text-xs text-gray-400">
            Mean: <span className={winColor(summary.meanWin)}>{summary.meanWin?.toFixed(2)}%</span>
            {' | '}Min: <span className="text-accent-red">{summary.minWin?.toFixed(2)}%</span> ({summary.minName})
            {' | '}Max: <span className="text-accent-green">{summary.maxWin?.toFixed(2)}%</span> ({summary.maxName})
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dark-500 text-gray-400 text-left">
              <th className="py-1.5 px-2 font-medium">Defender</th>
              <th className="py-1.5 px-2 font-medium text-right">Win%</th>
              <th className="py-1.5 px-2 font-medium text-right">Avg Turns</th>
              <th className="py-1.5 px-2 font-medium text-right">First Move</th>
              <th className="py-1.5 px-2 font-medium text-right">A Hit</th>
              <th className="py-1.5 px-2 font-medium text-right">D Hit</th>
              <th className="py-1.5 px-2 font-medium text-right">A Range</th>
              <th className="py-1.5 px-2 font-medium text-right">D Range</th>
              <th className="py-1.5 px-2 font-medium text-right">Turns Min</th>
              <th className="py-1.5 px-2 font-medium text-right">Turns Max</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <tr
                key={d.name}
                className={`border-b border-dark-700 hover:bg-dark-700/50 ${
                  i % 2 === 0 ? '' : 'bg-dark-800/50'
                }`}
              >
                <td className="py-1 px-2 font-medium text-gray-300 truncate max-w-[200px]" title={d.name}>
                  {d.name}
                </td>
                <td className={`py-1 px-2 text-right font-bold ${winColor(d.winPct)}`}>
                  {d.winPct.toFixed(2)}%
                </td>
                <td className="py-1 px-2 text-right text-gray-300">
                  {d.avgTurns.toFixed(2)}
                </td>
                <td className="py-1 px-2 text-right text-gray-400">
                  A:{d.firstMove?.attackerRate?.toFixed(1)}%
                </td>
                <td className="py-1 px-2 text-right text-gray-400">
                  {d.a?.hit?.[0]?.toFixed?.(1) || d.a?.hit?.[0] || '--'}
                  {d.a?.hit?.[1] != null ? `/${typeof d.a.hit[1] === 'number' ? d.a.hit[1].toFixed(1) : d.a.hit[1]}` : ''}
                </td>
                <td className="py-1 px-2 text-right text-gray-400">
                  {d.d?.hit?.[0]?.toFixed?.(1) || d.d?.hit?.[0] || '--'}
                  {d.d?.hit?.[1] != null ? `/${typeof d.d.hit[1] === 'number' ? d.d.hit[1].toFixed(1) : d.d.hit[1]}` : ''}
                </td>
                <td className="py-1 px-2 text-right text-gray-400">
                  {d.a?.range?.[0]}-{d.a?.range?.[1]}
                </td>
                <td className="py-1 px-2 text-right text-gray-400">
                  {d.d?.range?.[0]}-{d.d?.range?.[1]}
                </td>
                <td className="py-1 px-2 text-right text-gray-500">{d.turnsMin}</td>
                <td className="py-1 px-2 text-right text-gray-500">{d.turnsMax}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Run metadata */}
      <div className="mt-2 text-[10px] text-gray-500 flex gap-4 flex-wrap">
        <span>Trials: {results.run?.trials?.toLocaleString()}</span>
        <span>Seed: {results.run?.seed}</span>
        <span>Deterministic: {results.run?.deterministic ? 'ON' : 'OFF'}</span>
        <span>Style: A:{variant.attackerAttackType} D:{variant.defenderAttackType}</span>
        {results.createdUtc && <span>Run: {new Date(results.createdUtc).toLocaleString()}</span>}
      </div>
    </div>
  );
}
