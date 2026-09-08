import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import { Sidebar } from "./components/layout/Sidebar";
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
import { api } from "./api";
import { UserProfile } from "./types";

const MainApp: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.getMe().then((profile) => {
      if (profile) setUser(profile);
    });
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    toast.info("Signed out of your session.");
  };

  const handleNavigateToScan = (scanId: string) => {
    setSelectedScanId(scanId);
    setActiveTab("scanner");
  };

  const handleNavigateToReport = (scanId: string) => {
    setSelectedScanId(scanId);
    setActiveTab("reports");
  };

  const tabTitles: Record<string, string> = {
    dashboard: "Security Command Center",
    scanner: "File Analysis & Digital Signatures",
    recon: "Defensive Passive Reconnaissance",
    quantum: "Quantum Trust Simulation",
    reports: "Audit & Provenance Reports",
    history: "Security Audit Trail & History",
    settings: "Application Settings",
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text-primary cyber-grid-bg">
      {/* Collapsible Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          activeTabTitle={tabTitles[activeTab] || "NeuroCraft"}
          onOpenCommand={() => setCommandPaletteOpen(true)}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Scrollable View Area wrapped in ErrorBoundary */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-24 md:pb-8">
          <ErrorBoundary fallbackTitle="View Rendering Error">
            {activeTab === "dashboard" && (
              <DashboardView onNavigate={setActiveTab} user={user} />
            )}
            {activeTab === "scanner" && (
              <ScannerView onGenerateReport={handleNavigateToReport} />
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
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Global Command Palette (Ctrl/Cmd + K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
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
        <MainApp />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
