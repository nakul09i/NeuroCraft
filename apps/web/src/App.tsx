import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { ScannerView } from "./components/ScannerView";
import { ReconView } from "./components/ReconView";
import { QuantumView } from "./components/QuantumView";
import { ReportsView } from "./components/ReportsView";
import { AuthModal } from "./components/AuthModal";
import { api } from "./api";
import { ScanResponse, UserProfile } from "./types";
import { Shield, Lock, Terminal } from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check existing auth token
    api.getMe().then((profile) => {
      if (profile) setUser(profile);
    });
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  const handleNavigateToReport = (scanId: string) => {
    setSelectedScanId(scanId);
    setActiveTab("reports");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070a11] text-slate-100 cyber-grid-bg">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === "scanner" && (
          <ScannerView onGenerateReport={handleNavigateToReport} />
        )}
        {activeTab === "recon" && <ReconView />}
        {activeTab === "quantum" && <QuantumView />}
        {activeTab === "reports" && <ReportsView initialScanId={selectedScanId} />}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(newUser) => setUser(newUser)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#060910] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">NeuroCraft</span>
            <span>—</span>
            <span>Detect. Verify. Prove.</span>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span className="text-purple-400">Bell-State TVD Analysis</span>
            <span>•</span>
            <span className="text-emerald-400">Zero Dynamic Code Execution</span>
            <span>•</span>
            <span className="text-cyan-400">FOSS Free-First Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
