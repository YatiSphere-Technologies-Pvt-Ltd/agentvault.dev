import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth/AuthProvider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata = {
  title: "AgentVault — Enterprise agents, governed.",
  description:
    "Build, deploy, and govern AI agents your risk team will sign off on. Policy-as-code, full observability, and eight production accelerators — all in a vault you control.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sora antialiased bg-hero-bg min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
