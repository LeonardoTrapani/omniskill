import HeroSection from "@/components/landing/HeroSection";
import SkillsTable from "@/components/landing/SkillsTable";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { getSkillCount } from "@/lib/get-skill-count";

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
