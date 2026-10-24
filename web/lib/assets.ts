// Central asset manifest — maps to optional files in /public/tega-asset/.
// Every consumer (AssetImg / AssetBg / sfx) falls back gracefully when a file is
// missing, so the UI looks right before any binary assets are dropped in.

export const ASSET_BASE = "/tega-asset";

export const assets = {
  logo: `${ASSET_BASE}/tega-icon-no-bg.png`,
  icon: `${ASSET_BASE}/tega-icon.png`,

  cardBagi: `${ASSET_BASE}/bagi-card.png`,
  cardEmbat: `${ASSET_BASE}/embat-card.png`,
  cardBack: `${ASSET_BASE}/card-back.png`,

  arenaBg: `${ASSET_BASE}/arena.png`,

  artWin: `${ASSET_BASE}/splash-win.png`,
  artLose: `${ASSET_BASE}/splash-lose.png`,
  artDraw: `${ASSET_BASE}/splash-draw.png`,

  avatars: [
    `${ASSET_BASE}/avatar-cobra.png`,
    `${ASSET_BASE}/avatar-robot.png`,
    `${ASSET_BASE}/avatar-fox.png`,
    `${ASSET_BASE}/avatar-owl.png`,
  ],

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
