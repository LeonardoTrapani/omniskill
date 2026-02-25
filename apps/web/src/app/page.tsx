import CTA from "@/features/landing/components/CTA";
import Features from "@/features/landing/components/Features";
import Footer from "@/features/landing/components/Footer";
import HeroSection from "@/features/landing/components/HeroSection";
import Pricing from "@/features/landing/components/Pricing";
import SkillsTable from "@/features/landing/components/SkillsTable";
import { getSkillCount } from "@/features/landing/lib/get-skill-count";

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
