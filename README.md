# Build Engine Games — Web Showcase

Retro **Build Engine** games in the browser: **WebAssembly + WebGL**, unified launcher, GRP verification, and IndexedDB saves.

**Live demo:** [https://buildenginegames.online/](https://buildenginegames.online/)

![Duke Nukem 3D gameplay](screenshots/showcase-banner.gif)

## What's in this repo

| Included | Not included (you provide) |
|----------|----------------------------|
| Launcher UI (`index.html`), EN/RU | Retail `*.GRP` / `*.RFF` / game folders |
| Per-game `run.html`, `saves.js`, `usergrp.js` | Prebuilt `*.wasm`, `*.js`, `*.data` blobs |
| `serve.py`, deploy scripts | Emscripten SDK (use your local `emsdk`) |
| Screenshots & showcase GIF | |

After cloning, run **`sync-from-projects.ps1`** to copy wasm builds from your local `*web` port projects on the Desktop.

## Quick start (local)

```powershell
cd buildgit

# 1. Copy wasm/js/data from sibling *web projects (Desktop)
powershell -File sync-from-projects.ps1
powershell -File install-usergrp.ps1

# 2. Start unified server (port 8760)
powershell -File start-servers.ps1
# or: python serve.py
```

Open **http://127.0.0.1:8760/** — select your GRP or game folder, then **PLAY**.

Hard-refresh after rebuilds: **Ctrl+F5**.

## Supported games

Blood, Lenin: First Blood, Redneck Rampage, Duke Nukem 3D (+ DLC), Shadow Warrior (+ addons), NAM, WW2 GI, Powerslave, TekWar, Witchaven I/II, Liquidator, Plunder & Pillage, Quest TCs, and more — see the launcher grid.

## Deploy

Upload the whole folder to static hosting (same structure as the live site). Runtime binaries must be present in each `####-slug/` directory.

```powershell
powershell -File scripts\prepare-unplugged.ps1   # verify Unplugged/ layout
```

**Unplugged** (no GRP check): `/Unplugged/` — same game paths, `../8766-blood/run.html` etc.

## Build details

See **[BUILD.md](BUILD.md)** for the full port matrix, Emscripten commands, and Duke DLC pipeline.

## License

Engine source lives in separate `*web` repositories (NBlood, EDuke32, Rednukem, etc.). This repo contains only the **showcase shell** — HTML, scripts, and launcher assets. Game data remains the property of their respective rights holders.

---

## Русский

Веб-витрина игр на **Build Engine**: WASM-порты, единый ланчер, проверка GRP, сохранения в IndexedDB.

**Онлайн:** [https://buildenginegames.online/](https://buildenginegames.online/)


© 2026 [Carter54](https://github.com/Carter54git)
