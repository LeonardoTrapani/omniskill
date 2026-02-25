import SkillsFlickerBackground from "@/features/landing/components/skills-flicker-background";
import SkillsTable from "@/features/landing/components/SkillsTable";
import PageHeroCard from "@/shared/components/page-hero-card";

interface SkillsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const params = await searchParams;
  const initialSearch = params.q ?? "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-0">
      <SkillsFlickerBackground />

      <div className="relative z-10">
        <div className="space-y-6 max-w-7xl mx-auto">
          <PageHeroCard
            eyebrow="Skills Marketplace"
            title="Explore the Ecosystem"
            description="Browse the complete catalog of skills in the BETTER-SKILLS ecosystem. Install skills to your agent graph with one click, or publish your own for the community."
          />

          <SkillsTable showViewAll={false} infiniteScroll initialSearch={initialSearch} />
        </div>
      </div>
    </main>
  );
}
