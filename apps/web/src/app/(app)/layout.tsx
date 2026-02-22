import Navbar from "@/components/navbar";
import { getSkillCount } from "@/lib/get-skill-count";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const skillCount = await getSkillCount();

  return (
    <>
      <Navbar skillCount={skillCount} />
      {children}
    </>
  );
}
