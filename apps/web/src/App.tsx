import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import { NotificationProvider } from "./context/NotificationContext";
import { Sidebar } from "./components/layout/Sidebar";
import { MobileDrawer } from "./components/layout/MobileDrawer";
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { CommandPalette } from "./components/layout/CommandPalette";
import { DashboardView } from "./components/views/DashboardView";
import { ScannerView } from "./components/views/ScannerView";
import { ReconView } from "./components/views/ReconView";
import { QuantumView } from "./components/views/QuantumView";
import { ReportsView } from "./components/views/ReportsView";
import { HistoryView } from "./components/views/HistoryView";
import { SettingsView } from "./components/views/SettingsView";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AuthModal } from "./components/AuthModal";
import { HelpModal } from "./components/ui/HelpModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ConnectivityProvider } from "./context/ConnectivityContext";
import { clearUserSyncListeners } from "./services/syncService";
import { UserProfile } from "./types";

const MainApp: React.FC = () => {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | undefined>(undefined);

  // Dynamic document title update per active route
  const pageTitles: Record<string, string> = {
    dashboard: "NeuroCraft — Overview",
    scanner: "NeuroCraft — Analyze File",
    recon: "NeuroCraft — Recon",
    quantum: "NeuroCraft — Trust Verification",
    reports: "NeuroCraft — Reports",
    history: "NeuroCraft — History",
    settings: "NeuroCraft — Settings",
  };

  useEffect(() => {
    document.title = pageTitles[activeTab] || "NeuroCraft — Detect. Verify. Prove.";
  }, [activeTab]);

  const handleLogout = async () => {
    await logout();
    clearUserSyncListeners();
    toast.info("Signed out successfully.");
  };

  const handleNavigateToScan = (scanId: string) => {
    setSelectedScanId(scanId);
    setActiveTab("scanner");
  };

  const handleNavigateToReport = (scanId: string) => {
    setSelectedScanId(scanId);
    setActiveTab("reports");
  };

  const tabBreadcrumbs: Record<string, string> = {
    dashboard: "Overview",
    scanner: "Analyze File",
    recon: "Recon",
    quantum: "Trust",
    reports: "Reports",
    history: "History",
    settings: "Settings",
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text-primary calm-ambient-bg">
      {/* Collapsible Desktop Sidebar with Favorites */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          activeTabTitle={tabBreadcrumbs[activeTab] || "NeuroCraft"}
          onOpenCommand={() => setCommandPaletteOpen(true)}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          onNavigate={setActiveTab}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenHelp={() => setHelpModalOpen(true)}
        />

        {/* Scrollable View Area wrapped in ErrorBoundary */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-24 md:pb-8">
          <ErrorBoundary fallbackTitle="View Rendering Error">
            <div key={activeTab} className="page-enter">
              {activeTab === "dashboard" && (
                <DashboardView onNavigate={setActiveTab} user={user} />
              )}
              {activeTab === "scanner" && (
                <ScannerView
                  selectedScanId={selectedScanId}
                  onGenerateReport={handleNavigateToReport}
                />
              )}
              {activeTab === "recon" && <ReconView />}
              {activeTab === "quantum" && <QuantumView />}
              {activeTab === "reports" && (
                <ReportsView initialScanId={selectedScanId} />
              )}
              {activeTab === "history" && (
                <HistoryView onNavigateToScan={handleNavigateToScan} />
              )}
              {activeTab === "settings" && (
                <SettingsView
                  user={user}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      {/* Global Command Palette (Ctrl/Cmd + K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
      />

      {/* Help & Shortcuts Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(newUser) => {
          toast.success(`Welcome back, ${newUser.display_name || newUser.email}`);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NotificationProvider>
          <AuthProvider>
            <ConnectivityProvider>
              <MainApp />
            </ConnectivityProvider>
          </AuthProvider>
        </NotificationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
