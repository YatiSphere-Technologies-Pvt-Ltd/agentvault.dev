import Navbar from "./components/Navbar";
import ArchitectureDiagram from "./components/home/ArchitectureDiagram";
import FooterCTA from "./components/home/FooterCTA";
import GovernSection from "./components/home/GovernSection";
import Hero from "./components/home/Hero";
import PlatformPillars from "./components/home/PlatformPillars";
import SolutionsPreview from "./components/home/SolutionsPreview";
import TrustStrip from "./components/home/TrustStrip";
import UseCases from "./components/home/UseCases";

export default function Page() {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <PlatformPillars />
        <SolutionsPreview />
        <GovernSection />
        <ArchitectureDiagram />
        <UseCases />
        <FooterCTA />
      </main>
    </div>
  );
}
