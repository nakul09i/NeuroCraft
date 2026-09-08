import {
  DashboardStats,
  QuantumScenario,
  QuantumSimulationResponse,
  ReconScanResponse,
  ReportResponse,
  ScanResponse,
  TokenResponse,
  UserProfile,
} from "./types";

const API_BASE = "/api/v1";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("nc_token");
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Authentication failed");
    }
    const data: TokenResponse = await res.json();
    localStorage.setItem("nc_token", data.access_token);
    return data;
  },

  async signup(email: string, password: string, display_name: string): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Signup failed" }));
      throw new Error(err.detail || "Registration failed");
    }
    const data: TokenResponse = await res.json();
    localStorage.setItem("nc_token", data.access_token);
    return data;
  },

  async getMe(): Promise<UserProfile | null> {
    const token = localStorage.getItem("nc_token");
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        localStorage.removeItem("nc_token");
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem("nc_token");
  },

  // File Scanning
  async uploadAndScan(file: File): Promise<ScanResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    const token = localStorage.getItem("nc_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/scans`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Scan failed" }));
      throw new Error(err.detail || "File scan failed");
    }
    return await res.json();
  },

  async getScan(scanId: string): Promise<ScanResponse> {
    const res = await fetch(`${API_BASE}/scans/${scanId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Scan not found");
    return await res.json();
  },

  async listScans(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/scans`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // Passive Reconnaissance
  async runRecon(target: string): Promise<ReconScanResponse> {
    const res = await fetch(`${API_BASE}/recon`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Recon scan failed" }));
      throw new Error(err.detail || "Reconnaissance execution failed");
    }
    return await res.json();
  },

  async listReconScans(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/recon`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // Quantum Trust Simulation
  async runQuantumSimulation(
    scenario: QuantumScenario,
    shots: number = 1024,
    noise_level: number = 0.0
  ): Promise<QuantumSimulationResponse> {
    const res = await fetch(`${API_BASE}/quantum/simulations`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scenario,
        shots,
        qubits: 2,
        noise_level,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Simulation failed" }));
      throw new Error(err.detail || "Quantum trust simulation failed");
    }
    return await res.json();
  },

  async listQuantumSimulations(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/quantum/simulations`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // Security Reports
  async generateReport(
    reportType: string,
    scanId?: string,
    reconId?: string,
    quantumId?: string
  ): Promise<ReportResponse> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        report_type: reportType,
        scan_id: scanId,
        recon_id: reconId,
        quantum_id: quantumId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Report generation failed" }));
      throw new Error(err.detail || "Security report generation failed");
    }
    return await res.json();
  },

  async listReports(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/reports`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const raw = await res.json();
        return {
          total_scans: Number(raw.total_scans ?? 0),
          critical_threats: Number(raw.critical_threats ?? raw.high_risk_findings ?? 0),
          recon_targets: Number(raw.recon_targets ?? raw.recon_scans_count ?? 0),
          quantum_simulations: Number(raw.quantum_simulations ?? raw.quantum_simulations_count ?? 0),
          average_exposure: Number(raw.average_exposure ?? raw.average_risk_score ?? 0),
          recent_scans: Array.isArray(raw.recent_scans) ? raw.recent_scans : [],
        };
      }
    } catch {
      // Return default stats
    }
    return {
      total_scans: 0,
      critical_threats: 0,
      recon_targets: 0,
      quantum_simulations: 0,
      average_exposure: 0,
      recent_scans: [],
    };
  },
};
