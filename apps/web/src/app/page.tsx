import HeroSection from "@/components/landing/HeroSection";
import SkillsTable from "@/components/landing/SkillsTable";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <SkillsTable limit={5} showSearch={false} />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
