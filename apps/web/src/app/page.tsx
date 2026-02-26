import CTA from "@/app/_landing/cta";
import Features from "@/app/_landing/features";
import Footer from "@/app/_landing/footer";
import HeroSection from "@/app/_landing/hero-section";
import Pricing from "@/app/_landing/pricing";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <div className="py-6 flex flex-col gap-24 max-w-7xl mx-auto">
        <Features />
        <Pricing />
      </div>
      <CTA />
      <Footer />
    </main>
  );
}
