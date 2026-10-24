# tega-asset — drop your assets here

Files placed here are served at `/tega-asset/...` and the UI uses them **automatically**.
Until a file exists, the app **falls back** to emoji / CSS — nothing breaks. Add files incrementally.

Paths are defined once in `tega-web/lib/assets.ts`.

## Drop list (exact paths)

| File | Used by | Spec | Fallback if missing |
|---|---|---|---|
| `logo.svg` | header (marketing + game), landing hero | horizontal wordmark, transparent | text "TEGA" |
| `logo-mark.svg` | (reserved) square icon | square, works at 32px | — |
| `icon.png` | favicon / tab icon | 512×512 | browser default |
| `og.png` | link/social share preview | 1200×630 | none |
| `cards/bagi.png` | game card front (cooperate) | portrait ~3:4, fills card | 🤝 + "BAGI" |
| `cards/embat.png` | game card front (betray) | portrait ~3:4, fills card | 🔪 + "EMBAT" |
| `cards/back.png` | face-down / locked card | portrait ~3:4, fills card | "?" / 🔒 |
| `mascot/snake.png` | landing hero | transparent PNG | nothing |
| `mascot/snake-sad.png` | (reserved) lose screen | transparent PNG | nothing |
| `bg/hero.webp` | landing hero backdrop | 1920×1080, dark, low-detail | CSS gradient |
| `bg/arena.webp` | play + spectator backdrop | 1920×1080, subtle | CSS gradient |
| `art/win.png` | win screen (play + spectator) | transparent, big | text "YOU WON" |
| `art/lose.png` | lose screen (play) | transparent, big | text "YOU LOST" |
| `art/jackpot.png` | weekly jackpot banner | transparent coins/treasure | nothing |
| `icons/mass.svg` | lobby "Mass Jackpot" card | 48px mono/colored | 👥 |
| `icons/tournament.svg` | lobby "Tournaments" card | 48px | 🏆 |
| `icons/snake-score.svg` | lobby "Snake Score" card | 48px | 🐍 |
| `icons/cosmetics.svg` | lobby "Cosmetics" card | 48px | 🎨 |
| `sfx/tick.mp3` | countdown last 5s | short | WebAudio beep |
| `sfx/lock.mp3` | (reserved) commit | short | WebAudio beep |
| `sfx/reveal.mp3` | card reveal | short | WebAudio sting |
| `sfx/win.mp3` | win | short | WebAudio jingle |
| `sfx/lose.mp3` | lose | short | WebAudio descend |

## Notes
- **SVG** for logo/icons/cards (crisp, tiny). **PNG/WebP transparent** for art/mascot/backgrounds. **1200×630 PNG** for `og.png`. **short MP3** for sfx.
- To add a new asset slot: add a path to `lib/assets.ts` and use `<AssetImg src=... fallback=... />` (or `<AssetBg>` for backgrounds).
- Minimum-effort high-impact set: `logo.svg`, `icon.png`, `cards/bagi.png`, `cards/embat.png`, `cards/back.png`.
