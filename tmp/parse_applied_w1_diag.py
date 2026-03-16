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


def load_debug(path: Path):
    text = path.read_text()
    block = extract_marked_json(text, "[LEGACY_REPLAY_DEBUG_MATCHUP]")
    a = block["debugActionCounters"]["attacker"]
    d = block["debugActionCounters"]["defender"]
    return {
        "identityMatch": block["verification"]["identityMatch"],
        "attacker": {
            "turnsTaken": a["turnsTaken"],
            "weapon1Attempts": a["weapon1Attempts"],
            "weapon2Attempts": a["weapon2Attempts"],
            "w2OnDeadCount": a["w2OnDeadCount"],
            "w2StopOnKillCount": a["w2StopOnKillCount"],
            "w2AfterAppliedW1GateCount": a["w2AfterAppliedW1GateCount"],
            "killsByW1": a["killsByW1"],
            "killsByW2": a["killsByW2"],
            "totalKills": a["totalKills"],
            "avgAppliedPerTurn": a["averageAppliedDamagePerTurn"],
        },
        "defender": {
            "turnsTaken": d["turnsTaken"],
            "weapon1Attempts": d["weapon1Attempts"],
            "weapon2Attempts": d["weapon2Attempts"],
            "w2OnDeadCount": d["w2OnDeadCount"],
            "w2StopOnKillCount": d["w2StopOnKillCount"],
            "w2AfterAppliedW1GateCount": d["w2AfterAppliedW1GateCount"],
            "killsByW1": d["killsByW1"],
            "killsByW2": d["killsByW2"],
            "totalKills": d["totalKills"],
            "avgAppliedPerTurn": d["averageAppliedDamagePerTurn"],
        },
    }


def main():
    if len(sys.argv) != 9:
        raise SystemExit(
            "usage: parse_applied_w1_diag.py caseA caseB caseC caseD caseE debugA debugB debugC"
        )
    cases = {
        "A_auto": load_replay_rows(Path(sys.argv[1])),
        "B_attacker": load_replay_rows(Path(sys.argv[2])),
        "C_defender": load_replay_rows(Path(sys.argv[3])),
        "D_both": load_replay_rows(Path(sys.argv[4])),
        "E_attacker_stop1": load_replay_rows(Path(sys.argv[5])),
    }
    defenders = ["DL Dual Rift Bio", "DL Gun Sniper Mix", "HF Scythe Pair"]
    out = {"summary": {}, "debug_dual_rift": {}}
    for defender in defenders:
        out["summary"][defender] = {}
        for case_name, rows in cases.items():
            out["summary"][defender][case_name] = rows[defender]
    out["debug_dual_rift"]["A_auto"] = load_debug(Path(sys.argv[6]))
    out["debug_dual_rift"]["B_attacker"] = load_debug(Path(sys.argv[7]))
    out["debug_dual_rift"]["E_attacker_stop1"] = load_debug(Path(sys.argv[8]))
    print(json.dumps(out, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
