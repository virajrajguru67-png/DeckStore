import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  fullHeight?: boolean;
  hideSidebar?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  titleElement?: React.ReactNode;
}


export function DashboardLayout({ 
  children, 
  title, 
  subtitle, 
  fullHeight = false, 
  hideSidebar = false,
  leftAction,
  rightAction,
  titleElement
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!hideSidebar && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header 
          title={title || 'VaultNexus'} 
          subtitle={subtitle} 
          leftAction={leftAction}
          rightAction={rightAction}
          titleElement={titleElement}
        />

        <AnimatePresence mode="wait">
          <motion.main
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              "flex-1 w-full",
              fullHeight ? "overflow-hidden" : "overflow-y-auto"
            )}
          >
            {fullHeight ? (
              children
            ) : (
              <div className="max-w-[1920px] mx-auto p-6">
                {children}
              </div>
            )}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

