import CliDemo from "@/app/_landing/cli-demo";
import CTA from "@/app/_landing/cta";
import Features from "@/app/_landing/features";
import Footer from "@/app/_landing/footer";
import { PageOverlay, SectionDivider } from "@/app/_landing/grid-background";
import HeroSection from "@/app/_landing/hero-section";
import HowItWorks from "@/app/_landing/how-it-works";
import Pricing from "@/app/_landing/pricing";
import { getSkillCount } from "@/lib/landing/get-skill-count";

const TOTAL_SECTIONS = 5;

export default async function Home() {
  const skillCount = await getSkillCount();

  return (
    <main className="relative min-h-screen bg-background">
      <PageOverlay />

      <HeroSection skillCount={skillCount} />

      <SectionDivider index={1} total={TOTAL_SECTIONS} label="How It Works" />
      <HowItWorks />

      <SectionDivider index={2} total={TOTAL_SECTIONS} label="Features" />
      <Features />

      <SectionDivider index={3} total={TOTAL_SECTIONS} label="Developer Experience" />
      <CliDemo />

      <SectionDivider index={4} total={TOTAL_SECTIONS} label="Pricing" />
      <Pricing />

      <SectionDivider index={5} total={TOTAL_SECTIONS} label="Get Started" />
      <CTA />

      <Footer />
    </main>
  );
}
