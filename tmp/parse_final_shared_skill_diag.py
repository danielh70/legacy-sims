#!/usr/bin/env python3
import json
import math
import re
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
            "simWin": row["sim"]["winPct"],
            "dWin": row["dWinPct"],
            "avgTurns": row["sim"]["avgTurns"],
            "dAvgTurns": row["dAvgTurns"],
        }
    return out


def rate(num, den):
    return 0 if not den else num / den


def load_debug(path: Path):
    text = path.read_text()
    lines = text.splitlines()
    block = extract_marked_json(text, "[LEGACY_REPLAY_DEBUG_MATCHUP]")
    a = block["debugActionCounters"]["attacker"]
    d = block["debugActionCounters"]["defender"]
    aw1 = block["debugWeaponCounters"]["attacker"]["weapon1"]
    aw2 = block["debugWeaponCounters"]["attacker"]["weapon2"]
    dw1 = block["debugWeaponCounters"]["defender"]["weapon1"]
    dw2 = block["debugWeaponCounters"]["defender"]["weapon2"]
    def count_lines(*needles):
        total = 0
        for line in lines:
            if all(n in line for n in needles):
                total += 1
        return total

    return {
        "identityMatch": block["verification"]["identityMatch"],
        "sharedSkillA": count_lines("RD SKILL_SHARED", "A->D(ret)"),
        "sharedSkillD": count_lines("RD SKILL_SHARED", "D->A"),
        "hitSharedA": count_lines("RD HIT_SHARED", "A->D(ret)"),
        "hitSharedD": count_lines("RD HIT_SHARED", "D->A"),
        "aTurns": a["turnsTaken"],
        "dTurns": d["turnsTaken"],
        "aHitTurns": a["weapon1HitCount"],
        "dHitTurns": d["weapon1HitCount"],
        "aSkillW1": a["weapon1SkillSuccessCount"],
        "aSkillW2": a["weapon2SkillSuccessCount"],
        "dSkillW1": d["weapon1SkillSuccessCount"],
        "dSkillW2": d["weapon2SkillSuccessCount"],
        "aW2OnDead": a["w2OnDeadCount"],
        "dW2OnDead": d["w2OnDeadCount"],
        "aW1Overkill": a["w1OverkillCount"],
        "aW2Overkill": a["w2OverkillCount"],
        "dW1Overkill": d["w1OverkillCount"],
        "dW2Overkill": d["w2OverkillCount"],
        "aKillsW1": a["killsByW1"],
        "aKillsW2": a["killsByW2"],
        "dKillsW1": d["killsByW1"],
        "dKillsW2": d["killsByW2"],
        "aTotalKills": a["totalKills"],
        "dTotalKills": d["totalKills"],
        "aAvgAppliedPerTurn": a["averageAppliedDamagePerTurn"],
        "dAvgAppliedPerTurn": d["averageAppliedDamagePerTurn"],
        "aW1AvgAppliedPerSkill": aw1["averageAppliedDamagePerSkillSuccess"],
        "aW2AvgAppliedPerSkill": aw2["averageAppliedDamagePerSkillSuccess"],
        "dW1AvgAppliedPerSkill": dw1["averageAppliedDamagePerSkillSuccess"],
        "dW2AvgAppliedPerSkill": dw2["averageAppliedDamagePerSkillSuccess"],
        "aBothHitRate": rate(a["weapon1HitCount"], a["turnsTaken"]),
        "dBothHitRate": rate(d["weapon1HitCount"], d["turnsTaken"]),
        "aSkillGap": a["weapon1SkillSuccessCount"] - a["weapon2SkillSuccessCount"],
        "dSkillGap": d["weapon1SkillSuccessCount"] - d["weapon2SkillSuccessCount"],
        "aTurnsPerKill": rate(a["turnsTaken"], a["totalKills"]),
        "dTurnsPerAKill": rate(d["turnsTaken"], a["totalKills"]),
        "aW2OnDeadPerKill": rate(a["w2OnDeadCount"], a["totalKills"]),
    }


def main():
    if len(sys.argv) != 9:
        raise SystemExit(
            "usage: parse_final_shared_skill_diag.py caseA_json caseB_json "
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
            "caseA_dAvgTurns": case_a[defender]["dAvgTurns"],
            "caseB_dWin": case_b[defender]["dWin"],
            "caseB_dAvgTurns": case_b[defender]["dAvgTurns"],
            "dWinChange": round(case_b[defender]["dWin"] - case_a[defender]["dWin"], 2),
            "dAvgTurnsChange": round(case_b[defender]["dAvgTurns"] - case_a[defender]["dAvgTurns"], 4),
        }
        out["debug"][defender] = {"A": logs[("A", defender)], "B": logs[("B", defender)]}
    print(json.dumps(out, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
