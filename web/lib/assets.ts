// Central asset manifest — maps to the files in /public/tega-asset/.
// Every consumer (AssetImg / AssetBg / sfx) falls back gracefully when a file is
// missing, so the UI still looks right if an asset is ever removed.

export const ASSET_BASE = "/tega-asset";

export const assets = {
  logo: `${ASSET_BASE}/tega-icon-no-bg.png`, // transparent no-bg mark
  logoMark: `${ASSET_BASE}/logomark.svg`, // square mark
  icon: `${ASSET_BASE}/tega-icon.png`, // favicon / app icon
  og: `${ASSET_BASE}/tega-og.png`, // 1200x630 social share

  monad: `${ASSET_BASE}/monad-logo.svg`, // Monad full logo (white) for "Live on Monad"

  cardBagi: `${ASSET_BASE}/bagi-card.png`,
  cardEmbat: `${ASSET_BASE}/embat-card.png`,
  cardBack: `${ASSET_BASE}/card-back.png`,

  mascot: `${ASSET_BASE}/mascot-idle.png`,
  mascotSad: `${ASSET_BASE}/mascot-sad.png`,
  mascotCheer: `${ASSET_BASE}/mascot-scot.png`,

  heroBg: `${ASSET_BASE}/arena.png`, // reuse arena art as hero backdrop
  arenaBg: `${ASSET_BASE}/arena.png`,

  artWin: `${ASSET_BASE}/splash-win.png`,
  artLose: `${ASSET_BASE}/splash-lose.png`,
  artDraw: `${ASSET_BASE}/splash-draw.png`,
  jackpot: `${ASSET_BASE}/jackpot-pot.png`,
  handshake: `${ASSET_BASE}/handshake-and-dagger.png`, // BAGI vs EMBAT concept art

  avatars: [
    `${ASSET_BASE}/avatar-cobra.png`,
    `${ASSET_BASE}/avatar-robot.png`,
    `${ASSET_BASE}/avatar-fox.png`,
    `${ASSET_BASE}/avatar-owl.png`,
  ],

  // no dedicated mode icons provided → lobby cards keep emoji
  mode: {
    mass: `${ASSET_BASE}/icons/mass.svg`,
    tournament: `${ASSET_BASE}/icons/tournament.svg`,
    snake: `${ASSET_BASE}/icons/snake-score.svg`,
    cosmetics: `${ASSET_BASE}/icons/cosmetics.svg`,
  },

  sfx: {
    tick: `${ASSET_BASE}/sfx/tick.mp3`,
    lock: `${ASSET_BASE}/sfx/lock.mp3`,
    reveal: `${ASSET_BASE}/sfx/reveal.mp3`,
    win: `${ASSET_BASE}/sfx/win.mp3`,
    lose: `${ASSET_BASE}/sfx/lose.mp3`,
  },
} as const;

/** Deterministic avatar per address, so each player keeps a consistent face. */
export function avatarFor(addr: string | null | undefined): string {
  const a = assets.avatars;
  if (!addr) return a[0];
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
  return a[h % a.length];
}
