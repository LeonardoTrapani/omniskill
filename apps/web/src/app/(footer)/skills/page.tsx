import SkillsFlickerBackground from "./_components/skills-flicker-background";
import SkillsTable from "@/components/skills/skills-table";

interface SkillsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const params = await searchParams;
  const initialSearch = params.q ?? "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <SkillsFlickerBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.08em] font-mono text-primary">
            Skills Marketplace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Explore the Ecosystem
          </h1>
          <p className="mt-2 max-w-[560px] text-sm leading-6 text-muted-foreground text-pretty">
            Browse and install skills from the public catalog.
          </p>
        </header>

        {/* Table */}
        <SkillsTable showViewAll={false} infiniteScroll initialSearch={initialSearch} />
      </div>
    </main>
  );
}
