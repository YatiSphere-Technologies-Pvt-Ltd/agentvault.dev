import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import {
  TrustTicker,
  Pillars,
  FeatureShowcase,
  Accelerators,
  Governance,
  Testimonial,
  ClosingCTA,
  Footer,
} from "./components/Sections";

export default function Page() {
  return (
    <div className="bg-hero-bg min-h-screen relative">
      <Navbar />
      <Hero />
      <TrustTicker />
      <Pillars />
      <FeatureShowcase />
      <Accelerators />
      <Governance />
      <Testimonial />
      <ClosingCTA />
      <Footer />
    </div>
  );
}
