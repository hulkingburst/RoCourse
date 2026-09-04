import { AppShell } from "@/components/layout/app-shell";
import { countLessons, getCourseStructure, getSearchIndex } from "@/lib/lessons";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const sections = getCourseStructure();
  const searchEntries = getSearchIndex();
  const totalLessons = countLessons();

  return (
    <AppShell
      sections={sections}
      searchEntries={searchEntries}
      totalLessons={totalLessons}
    >
      {children}
    </AppShell>
  );
}
