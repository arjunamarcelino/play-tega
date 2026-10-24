import Link from "next/link";
import { AssetImg } from "@/components/AssetImg";
import { assets } from "@/lib/assets";
import { MotionBackground } from "@/components/MotionBackground";
import { LandingMotion } from "@/components/LandingMotion";

// Enable pre-hide for reveal elements only when motion is allowed, with a
// failsafe that removes it so content can never stay hidden if JS stalls.
const MOTION_BOOT = `(function(){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var h=document.documentElement;h.classList.add('motion-ready');setTimeout(function(){h.classList.remove('motion-ready');},2500);}}catch(e){}})();`;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      <MotionBackground />
      <LandingMotion />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" aria-label="TEGA home" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-mon">
            <AssetImg src={assets.logo} alt="TEGA" className="h-7 w-auto" fallback={<span className="display text-xl font-black tracking-widest neon-mon">TEGA</span>} />
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/app"
              className="display rounded-xl border border-mon/60 bg-mon/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#d9d0ff] outline-none transition hover:bg-mon/35 hover:shadow-neon-mon focus-visible:outline-none focus-visible:shadow-neon-mon focus-visible:ring-2 focus-visible:ring-mon"
            >
              Enter App
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-6 py-8 text-center text-xs uppercase tracking-widest text-white/55 md:px-10">
          <span>TEGA · Built on</span>
          <AssetImg src={assets.monad} alt="Monad" className="h-3.5 w-auto opacity-80" fallback={<span>Monad</span>} />
          <span>· Monad Blitz Jogja</span>
        </footer>
      </div>
    </>
  );
}
