import SkillsTable from "@/components/landing/SkillsTable";
import Navbar from "@/components/navbar";
import Footer from "@/components/landing/Footer";
import PageHeroCard from "@/components/page-hero-card";
import SkillsFlickerBackground from "@/components/skills-flicker-background";
import { getSkillCount } from "@/lib/get-skill-count";

interface SkillsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const [params, skillCount] = await Promise.all([searchParams, getSkillCount()]);
  const initialSearch = params.q ?? "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 sm:px-6 lg:px-0">
      <SkillsFlickerBackground />

      <div className="relative z-10">
        <div className="py-6 space-y-6 max-w-7xl mx-auto">
          <PageHeroCard
            eyebrow="Skills Marketplace"
            title="Explore the Ecosystem"
            description="Browse the complete catalog of skills in the Omniskill ecosystem. Install skills to your agent graph with one click, or publish your own for the community."
          />

          <SkillsTable
            showViewAll={false}
            infiniteScroll
            initialSearch={initialSearch}
            className="pt-8 pb-24 px-6 md:px-16"
          />

          <Footer />
        </div>
      </div>
    </main>
  );
}
