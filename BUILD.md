# Build guide — Build Engine Web Showcase

This document describes how to produce the **runtime binaries** that the launcher expects in each `####-slug/` folder.

## Prerequisites

- **Emscripten** — e.g. `bloodweb\emsdk` with `emsdk activate` and `emsdk_env.ps1`
- **Source ports** on Desktop (sibling folders to this repo)
- **Retail game files** — local only, never committed

## One-command sync (recommended)

From this folder:

```powershell
powershell -File sync-from-projects.ps1
powershell -File install-usergrp.ps1
```

`sync-from-projects.ps1` copies `run.html`, `saves.js`, `*.js`, `*.wasm`, `*.data` from each `*web\web` project into the matching port directory.

### Port matrix

| Folder | Engine | Source project (Desktop) | Port |
|--------|--------|--------------------------|------|
| `8766-blood` | NBlood | `bloodweb` | 8766 |
| `8770-blood-lenin` | NBlood | `fbloodweb` | 8770 |
| `8767-redneck` | Rednukem | `rredneckweb` | 8767 |
| `8768-nam` | Rednukem | `namweb` | 8768 |
| `8769-ww2gi` | Rednukem | `ww2giweb` | 8769 |
| `8791-ww2-platoon` | Rednukem | `ww2plweb` | 8791 |
| `8772-rrridesagain` | Rednukem | `rrridesagainweb` | 8772 |
| `8773-rrroute66` | Rednukem | `rrroute66web` | 8773 |
| `8774-powerslave` | PCExhumed | `powerslaveweb` | 8774 |
| `8775-swarrior` | VoidSW | `swarriorweb` | 8775 |
| `8776-duke3d` | EDuke32 | `duke3dweb` | 8776 |
| `8777-tekwar` | eTekWar | `tekwarweb` | 8777 |
| `8778-liquidator` | EDuke32 | `liquidatorweb` | 8778 |
| `8786-plunder` | EDuke32 | `plunderweb` | 8786 |
| `8787-sw-twindragon` | VoidSW | `swtdweb` | 8787 |
| `8788-sw-wanton` | VoidSW | `swwdweb` | 8788 |
| `8789-quest-hussein` | EDuke32 | `qfhweb` | 8789 |
| `8790-quest-alqaeda` | EDuke32 | `qfblweb` | 8790 |
| `8783-witchaven` | eWitchaven | `witchavenweb` | 8783 |
| `8784-witchaven2` | eWitchaven | `witchaven2web` | 8784 |

Sync a subset:

```powershell
powershell -File sync-from-projects.ps1 -Only Blood,Duke3D
```

## Per-project Emscripten builds (reference)

### NBlood (Blood)

```powershell
cd bloodweb\NBlood-r14353
. ..\emsdk\emsdk_env.ps1
make EMSCRIPTEN=1 HTML=1 blood EMPRELOAD=../gamefiles@/
```

Output: `bloodweb\web\nblood.{js,wasm,data}`

### EDuke32 (Duke 3D)

```powershell
cd duke3dweb\NBlood-master
. ..\bloodweb\emsdk\emsdk_env.ps1
make EMSCRIPTEN=1 HTML=0 WEBGAME=duke3d web EMPRELOAD=../gamefiles@/
```

### Rednukem family

```powershell
cd rredneckweb
.\scripts\build-web.ps1 -EmsdkRoot ..\bloodweb\emsdk
```

Similar pattern for `namweb`, `ww2giweb`, etc.

### Duke 3D DLC (vacation, DC, nwinter, penthouse)

Requires base `8776-duke3d` build first:

```powershell
powershell -File scripts\build-duke-dlc.ps1 -Dlc all
```

Stages gamedata under `dlc-build/`, rebuilds `eduke32.data` per episode, deploys to `8779-duke-vacation`, `8780-duke-dc`, etc.

## Local test server

```powershell
python serve.py
# BEGW_PORT=8760 by default
# http://127.0.0.1:8760/
```

## Hosting checklist

1. Run `sync-from-projects.ps1` + `install-usergrp.ps1`
2. Run `scripts\prepare-unplugged.ps1`
3. Upload entire folder (including `screenshots/`, all `####-slug/` with wasm blobs)
4. Point domain to static host — see live reference: [buildenginegames.online](https://buildenginegames.online/)

## Files intentionally gitignored

- `*.wasm`, `*.data`, engine `*.js` bundles
- `*.grp`, `*.rff`, `*.art`, `gamedata/`, `dlc-build/`

Clone → sync → play. Game data always stays on the user's machine.
