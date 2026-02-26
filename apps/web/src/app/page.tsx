import CTA from "@/app/_landing/cta";
import Features from "@/app/_landing/features";
import Footer from "@/app/_landing/footer";
import HeroSection from "@/app/_landing/hero-section";
import Pricing from "@/app/_landing/pricing";
import SkillsTable from "@/components/skills/skills-table";
import { getSkillCount } from "@/lib/landing/get-skill-count";

export default async function Home() {
  const skillCount = await getSkillCount();

  return (
    <main className="min-h-screen bg-background">
      <HeroSection skillCount={skillCount} />
      <div className="py-6 flex flex-col gap-24 max-w-7xl mx-auto">
        <SkillsTable limit={5} showSearch />
        <Features />
        <Pricing />
      </div>
      <CTA />
      <Footer />
    </main>
  );
}
