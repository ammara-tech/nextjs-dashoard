import SideNav from '@/app/ui/dashboard/sidenav';
import HistoryNav from '@/app/ui/history-nav';
import HeaderTools from '@/app/ui/header-tools';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div className="grow p-6 md:overflow-y-auto md:p-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <HistoryNav fallbackHref="/dashboard" />
          <HeaderTools showNotifications={false} />
        </div>
        {children}
      </div>
    </div>
  );
}
