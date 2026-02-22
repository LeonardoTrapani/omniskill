import Navbar from "@/components/navbar";
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
      <Navbar skillCount={skillCount} />
      <HeroSection skillCount={skillCount} />
      <SkillsTable limit={5} showSearch={false} />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
