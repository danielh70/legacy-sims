# codex-bio-pink-shell verification

## Commands run

```sh
git diff -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js > ./tmp/codex-bio-pink-shell-patch.diff
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-pink-shell-probe-patch' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-pink-shell-probe-patch.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-pink-shell-targeted4-patch' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-targeted-compile-suspects-truth.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-pink-shell-targeted4-patch.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-pink-shell-meta-patch' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-pink-shell-meta-patch.log 2>&1
```

## Checks

- Syntax checks passed: `legacy-sim-v1.0.4-clean.js`, `brute-sim-v1.4.6.js`
- Missing input files: none
- Diff artifact written: `./tmp/codex-bio-pink-shell-patch.diff`

## Targeted row summary

- `DL Dual Rift Bio`
  - targeted4: win `50.12 -> 45.24` (`-4.88`), avgT `11.3289 -> 12.0617` (`+0.7328`)
  - meta: win `49.60 -> 45.24` (`-4.36`), avgT `11.3621 -> 12.0617` (`+0.6996`)
  - probe detail: `DL Dual Rift Two Bio P4` win `49.49 -> 45.23` (`-4.26`), but adjacent `DL Dual Rift One Bio P4` moved `+3.38` and `DL Dual Rift Bio P4 + O4` moved `+4.53`
- `DL Core/Rift Bio`
  - targeted4: win `43.81 -> 37.45` (`-6.36`), avgT `12.6962 -> 13.1096` (`+0.4134`)
  - meta: win `43.72 -> 37.45` (`-6.27`), avgT `12.6735 -> 13.1096` (`+0.4361`)
  - probe detail: `DL Core/Rift Two Bio P4` win `43.90 -> 37.34` (`-6.56`), while `DL Core/Rift One Bio P4` moved `+2.07` and `DL Core/Rift Bio P4 + O4` moved `+2.36`
- `DL Gun Sniper Mix`
  - targeted4: win `65.24 -> 65.86` (`+0.62`), avgT `9.1763 -> 9.2208` (`+0.0445`)
  - meta: win `65.85 -> 65.86` (`+0.01`), avgT `9.1649 -> 9.2208` (`+0.0559`)
- `HF Scythe Pair`
  - targeted4: win `65.97 -> 65.46` (`-0.51`), avgT `9.5155 -> 9.5395` (`+0.0240`)
  - meta: win `66.42 -> 65.46` (`-0.96`), avgT `9.5285 -> 9.5395` (`+0.0110`)

## Meta summary

- meanAbsΔwin: `2.04`
- meanAbsΔavgT: `0.1266`
- worstAbsΔwin: `6.27` (`CUSTOM vs DL Core/Rift Bio`)

## Probe summary

- Intended two-Bio rows did not converge tightly: `DL Dual Rift Two Bio P4` remained `-4.26` win, `DL Core/Rift Two Bio P4` remained `-6.56` win.
- One-Bio rows moved unexpectedly and materially: `DL Dual Rift One Bio P4` `+3.38`, `DL Core/Rift One Bio P4` `+2.07`.
- No-Bio rows moved only slightly: `DL Dual Rift No Bio` `+0.37`, `DL Core/Rift No Bio` `-0.32`.

## Verdict

**NEED ONE MICRO-CHECK**

Reason: the intended two-Bio targets are still among the worst rows, while one-Bio rows also moved by `~2-3.4` win. That is not clean enough to call `KEEP PATCH`, but the no-Bio rows stayed near-noise, so this is not a clear `REVERT PATCH` from this pass alone.
