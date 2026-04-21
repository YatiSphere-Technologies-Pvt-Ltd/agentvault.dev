"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import VaultMark from "./VaultMark";

const NAV = [
  { label: "Platform",   href: "/platform" },
  { label: "Solutions",  href: "/solutions" },
  { label: "Developers", href: "/developers" },
  { label: "Pricing",    href: "/pricing" },
  { label: "Company",    href: "/company" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
      scrolled ? "bg-hero-bg/90 backdrop-blur-md border-b border-border" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 h-16">
        <Link href="/" className="flex items-center gap-2.5 text-foreground text-[16px] font-semibold tracking-tight shrink-0">
          <VaultMark />
          <span>AgentVault</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map(n => (
            <Link key={n.label} href={n.href}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Link href="/app"
              className="inline-flex whitespace-nowrap items-center text-primary-foreground bg-primary hover:brightness-110 active:scale-[0.98] transition-all rounded-md text-[12.5px] px-3.5 py-1.5 font-medium">
              Open app →
            </Link>
          ) : (
            <>
              <Link href="/signin" className="hidden lg:inline text-[12.5px] text-muted-foreground hover:text-foreground px-2.5 py-1.5 transition-colors">
                Sign in
              </Link>
              <Link href="#demo" className="hidden md:inline text-[12.5px] text-muted-foreground hover:text-foreground px-2.5 py-1.5 transition-colors border border-border rounded-md">
                Book demo
              </Link>
              <Link href="/signup"
                className="inline-flex whitespace-nowrap items-center text-primary-foreground bg-primary hover:brightness-110 active:scale-[0.98] transition-all rounded-md text-[12.5px] px-3.5 py-1.5 font-medium">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
