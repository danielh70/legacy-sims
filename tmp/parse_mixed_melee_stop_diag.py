#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def extract_marked_json(text: str, marker: str):
    idx = text.find(marker)
    if idx < 0:
        raise ValueError(f"marker not found: {marker}")
    start = text.find("{", idx)
    if start < 0:
        raise ValueError(f"json start not found after marker: {marker}")
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError(f"unterminated json block after marker: {marker}")


def load_replay_rows(path: Path):
    data = json.loads(path.read_text())
    out = {}
    for row in data["rows"]:
        out[row["defender"]] = {
            "truthWin": row["truth"]["winPct"],
            "dWin": row["dWinPct"],
            "dAvgTurns": row["dAvgTurns"],
        }
    return out


def rate(num, den):
    return 0 if not den else num / den


def load_debug(path: Path):
    text = path.read_text()
    block = extract_marked_json(text, "[LEGACY_REPLAY_DEBUG_MATCHUP]")
    a = block["debugActionCounters"]["attacker"]
    d = block["debugActionCounters"]["defender"]
    return {
        "identityMatch": block["verification"]["identityMatch"],
        "aTurns": a["turnsTaken"],
        "dTurns": d["turnsTaken"],
        "aW1Attempts": a["weapon1Attempts"],
        "aW2Attempts": a["weapon2Attempts"],
        "dW1Attempts": d["weapon1Attempts"],
        "dW2Attempts": d["weapon2Attempts"],
        "aW2SkipCount": a["weapon1Attempts"] - a["weapon2Attempts"],
        "dW2SkipCount": d["weapon1Attempts"] - d["weapon2Attempts"],
        "aW2OnDead": a["w2OnDeadCount"],
        "dW2OnDead": d["w2OnDeadCount"],
        "aKillsW1": a["killsByW1"],
        "aKillsW2": a["killsByW2"],
        "dKillsW1": d["killsByW1"],
        "dKillsW2": d["killsByW2"],
        "aTotalKills": a["totalKills"],
        "dTotalKills": d["totalKills"],
        "aAvgAppliedPerTurn": a["averageAppliedDamagePerTurn"],
        "dAvgAppliedPerTurn": d["averageAppliedDamagePerTurn"],
        "aAppliedRawRatio": a["appliedRawRatio"],
        "dAppliedRawRatio": d["appliedRawRatio"],
        "aW2OnDeadPerKill": rate(a["w2OnDeadCount"], a["totalKills"]),
        "dW2OnDeadPerKill": rate(d["w2OnDeadCount"], d["totalKills"]),
        "aW2SkipRate": rate(a["weapon1Attempts"] - a["weapon2Attempts"], a["weapon1Attempts"]),
        "dW2SkipRate": rate(d["weapon1Attempts"] - d["weapon2Attempts"], d["weapon1Attempts"]),
    }


def main():
    if len(sys.argv) != 9:
        raise SystemExit(
            "usage: parse_mixed_melee_stop_diag.py caseA_json caseB_json "
            "a_dual a_gun a_hf b_dual b_gun b_hf"
        )
    case_a = load_replay_rows(Path(sys.argv[1]))
    case_b = load_replay_rows(Path(sys.argv[2]))
    defenders = ["DL Dual Rift Bio", "DL Gun Sniper Mix", "HF Scythe Pair"]
    logs = {
        ("A", "DL Dual Rift Bio"): load_debug(Path(sys.argv[3])),
        ("A", "DL Gun Sniper Mix"): load_debug(Path(sys.argv[4])),
        ("A", "HF Scythe Pair"): load_debug(Path(sys.argv[5])),
        ("B", "DL Dual Rift Bio"): load_debug(Path(sys.argv[6])),
        ("B", "DL Gun Sniper Mix"): load_debug(Path(sys.argv[7])),
        ("B", "HF Scythe Pair"): load_debug(Path(sys.argv[8])),
    }
    out = {"summary": {}, "debug": {}}
    for defender in defenders:
        out["summary"][defender] = {
            "truthWin": case_a[defender]["truthWin"],
            "caseA_dWin": case_a[defender]["dWin"],
            "caseB_dWin": case_b[defender]["dWin"],
            "dWinChange": round(case_b[defender]["dWin"] - case_a[defender]["dWin"], 2),
            "caseA_dAvgTurns": case_a[defender]["dAvgTurns"],
            "caseB_dAvgTurns": case_b[defender]["dAvgTurns"],
        }
        out["debug"][defender] = {"A": logs[("A", defender)], "B": logs[("B", defender)]}
    print(json.dumps(out, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
