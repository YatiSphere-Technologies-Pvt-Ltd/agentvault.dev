import Link from "next/link";
import Navbar from "./Navbar";
import FooterCTA from "./home/FooterCTA";

export default function ComingSoon({ page, tagline, description, items = [] }) {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <main>
        <section className="pt-28 pb-16 lg:pt-36 lg:pb-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-panel/60 text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
              {page}
            </div>
            <h1 className="mt-5 text-[36px] lg:text-[48px] leading-[1.08] font-semibold tracking-tight text-foreground max-w-[720px]">
              {tagline}
            </h1>
            <p className="mt-5 text-[15px] text-muted-foreground max-w-[620px] leading-relaxed">
              {description}
            </p>

            {items.length > 0 && (
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((it, i) => (
                  <div key={i} className="bg-panel border border-border rounded-xl p-5">
                    <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-2 text-[15px] font-semibold text-foreground">{it.title}</div>
                    <div className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{it.body}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 rounded-xl border border-dashed border-border bg-panel/40 px-6 py-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11.5px] font-mono uppercase tracking-[0.18em] text-primary">In progress</div>
                <div className="mt-1 text-[13px] text-foreground">
                  Full page ships next. In the meantime, explore the home page or start a trial.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/" className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
                  Back home
                </Link>
                <Link href="/signup" className="text-[12.5px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium">
                  Start free
                </Link>
              </div>
            </div>
          </div>
        </section>

        <FooterCTA />
      </main>
    </div>
  );
}
