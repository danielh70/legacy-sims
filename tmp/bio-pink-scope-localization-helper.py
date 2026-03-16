#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path("/Users/danielhook/Desktop/code_projects/legacy_sims")

BASE_META = ROOT / "results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--2026-03-14T22-29-28-524Z.json"
PATCH_META = ROOT / "results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-bio-pink-meta-patch--2026-03-15T02-31-37-217Z.json"
BASE_PROBE = ROOT / "results/replay/legacy-replay--legacy-truth-double-bio-probe--legacy-sim-v1.0.4-clean--none--2026-03-15T02-21-42-069Z.json"
PATCH_PROBE = ROOT / "results/replay/legacy-replay--legacy-truth-double-bio-probe--legacy-sim-v1.0.4-clean--none--codex-bio-pink-probe-patch--2026-03-15T02-31-37-211Z.json"


def load_rows(path):
    with path.open() as f:
        data = json.load(f)
    return {row["defender"]: row for row in data["rows"]}


def build_predicates(build):
    w1 = build["weapon1"]["name"]
    w2 = build["weapon2"]["name"]
    m1 = build["misc1"]
    m2 = build["misc2"]
    misc_names = [m1["name"], m2["name"]]
    misc_specs = [m1["crystalSpecShort"], m2["crystalSpecShort"]]
    misc_crystals = [set(m1.get("crystalSpec", {}).keys()), set(m2.get("crystalSpec", {}).keys())]
    return {
        "armor": build["armor"]["name"],
        "baseShell": {
            "hp": build["stats"]["hp"],
            "speed": build["stats"]["speed"],
            "dodge": build["stats"]["dodge"],
            "accuracy": build["stats"]["accuracy"],
        },
        "weaponSet": sorted([w1, w2]),
        "hasRiftGun": "Rift Gun" in (w1, w2),
        "exactRiftCoreFamily": set([w1, w2]) in ({"Rift Gun"}, {"Rift Gun", "Core Staff"}),
        "bioCount": sum(1 for name in misc_names if name == "Bio Spinal Enhancer"),
        "doubleBio": misc_names == ["Bio Spinal Enhancer", "Bio Spinal Enhancer"],
        "exactDoubleBioP4": misc_names == ["Bio Spinal Enhancer", "Bio Spinal Enhancer"] and misc_specs == ["P4", "P4"],
        "allBioPinkOnly": all(
            misc_names[i] != "Bio Spinal Enhancer" or misc_crystals[i] == {"Perfect Pink Crystal"}
            for i in range(2)
        ),
        "bioSpecShorts": misc_specs,
    }


def summarize_row(row):
    build = row["resolvedBuilds"]["defender"]
    return {
        "defender": row["defender"],
        "truthWinPct": row["truth"]["winPct"],
        "dWinPct": row["dWinPct"],
        "dAvgTurns": row["dAvgTurns"],
        "build": {
            "armor": build["armor"]["name"],
            "weapon1": build["weapon1"]["name"],
            "weapon2": build["weapon2"]["name"],
            "misc1": f'{build["misc1"]["name"]}[{build["misc1"]["crystalSpecShort"]}]',
            "misc2": f'{build["misc2"]["name"]}[{build["misc2"]["crystalSpecShort"]}]',
        },
        "predicates": build_predicates(build),
    }


def main():
    base_meta = load_rows(BASE_META)
    patch_meta = load_rows(PATCH_META)
    base_probe = load_rows(BASE_PROBE)
    patch_probe = load_rows(PATCH_PROBE)

    improved = []
    for name, row in base_meta.items():
        if name not in patch_meta:
            continue
        before_abs = row["absWinPct"]
        after_abs = patch_meta[name]["absWinPct"]
        improved.append(
            {
                "defender": name,
                "absWinImprovement": round(before_abs - after_abs, 2),
                "before": summarize_row(row),
                "after": summarize_row(patch_meta[name]),
            }
        )
    improved.sort(key=lambda x: x["absWinImprovement"], reverse=True)

    probe_focus = []
    for name in [
        "DL Dual Rift No Bio",
        "DL Dual Rift One Bio P4",
        "DL Dual Rift Two Bio P4",
        "DL Dual Rift Bio P4 + O4",
        "DL Core/Rift No Bio",
        "DL Core/Rift One Bio P4",
        "DL Core/Rift Two Bio P4",
        "DL Core/Rift Bio P4 + O4",
    ]:
        probe_focus.append(
            {
                "defender": name,
                "absWinImprovement": round(base_probe[name]["absWinPct"] - patch_probe[name]["absWinPct"], 2),
                "before": summarize_row(base_probe[name]),
                "after": summarize_row(patch_probe[name]),
            }
        )

    print(
        json.dumps(
            {
                "metaMostImproved": improved[:8],
                "metaMostRegressed": sorted(improved, key=lambda x: x["absWinImprovement"])[:8],
                "probeFocus": probe_focus,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
