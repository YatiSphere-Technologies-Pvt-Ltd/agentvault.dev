"use client";

import { useEffect, useState } from "react";
import { VaultMark } from "./Sections";

const NAV = [
  { label: "Product",    href: "#product" },
  { label: "Solutions",  href: "#platform" },
  { label: "Governance", href: "#governance" },
  { label: "Customers",  href: "#customers" },
  { label: "Pricing",    href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-hero-bg/85 backdrop-blur-md border-b border-border" : "bg-transparent"
    }`}>
      <div className="flex items-center justify-between px-6 md:px-10 lg:px-16 py-5">
        <a href="#" className="flex items-center gap-2.5 text-foreground text-[17px] font-semibold tracking-tight">
          <VaultMark />
          <span>AgentVault</span>
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map(n => (
            <a key={n.label} href={n.href}
               className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors tracking-tight">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="#" className="hidden lg:inline whitespace-nowrap text-[12.5px] text-muted-foreground hover:text-foreground transition-colors">Sign in</a>
          <button className="hidden md:inline-flex whitespace-nowrap items-center text-primary-foreground bg-primary hover:brightness-110 active:scale-[0.97] transition-all rounded-md text-[12.5px] px-4 py-2 font-medium">
            Book a demo
          </button>
        </div>
      </div>
    </header>
  );
}
