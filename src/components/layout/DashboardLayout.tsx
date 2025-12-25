import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  fullHeight?: boolean;
}

export function DashboardLayout({ children, title, subtitle, fullHeight = false }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title || 'Deck Store'} subtitle={subtitle} />
        {fullHeight ? (
          <main className="flex-1 overflow-hidden w-full">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-8 lg:p-10 w-full bg-gradient-to-br from-background via-background to-muted/20">
            <div className="max-w-[1920px] mx-auto">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

