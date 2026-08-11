import { AppShell } from "@/components/layout/app-shell";
import { getCourseStructure, getSearchIndex } from "@/lib/lessons";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const sections = getCourseStructure();
  const searchEntries = getSearchIndex();

  return (
    <AppShell sections={sections} searchEntries={searchEntries}>
      {children}
    </AppShell>
  );
}
