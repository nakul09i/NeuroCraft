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

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = (RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, "") : "") + "/api/v1";

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

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data === "string" && data.trim()) return data.trim();
    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail.trim();
    if (Array.isArray(data?.detail)) {
      const parts = data.detail
        .map((item: any) => {
          if (typeof item === "string") return item;
          if (item?.msg) {
            const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "field";
            return `${field}: ${item.msg}`;
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length > 0) return parts.join("; ");
    }
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
    if (data?.detail && typeof data.detail === "object") {
      if (typeof data.detail.message === "string") return data.detail.message;
    }
  } catch {
    // Response body is not JSON
  }
  return res.statusText ? `${fallback} (${res.status} ${res.statusText})` : fallback;
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
      const msg = await extractErrorMessage(res, "Authentication failed. Please check credentials.");
      throw new Error(msg);
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
      const msg = await extractErrorMessage(res, "Registration failed. Please try again.");
      throw new Error(msg);
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
      const msg = await extractErrorMessage(res, "File analysis could not be completed.");
      throw new Error(msg);
    }
    return await res.json();
  },

  async getScan(scanId: string): Promise<ScanResponse> {
    const res = await fetch(`${API_BASE}/scans/${scanId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const msg = await extractErrorMessage(res, `Scan "${scanId}" was not found.`);
      throw new Error(msg);
    }
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
      const msg = await extractErrorMessage(res, "Network reconnaissance scan failed.");
      throw new Error(msg);
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
      const msg = await extractErrorMessage(res, "Quantum trust simulation could not be executed.");
      throw new Error(msg);
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
      const msg = await extractErrorMessage(res, "Could not generate the security report.");
      throw new Error(msg);
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
        const parseNum = (v: any): number => {
          if (v === null || v === undefined) return 0;
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        return {
          total_scans: parseNum(raw.total_scans),
          critical_threats: parseNum(raw.critical_threats ?? raw.high_risk_findings),
          recon_targets: parseNum(raw.recon_targets ?? raw.recon_scans_count),
          quantum_simulations: parseNum(raw.quantum_simulations ?? raw.quantum_simulations_count),
          average_exposure: parseNum(raw.average_exposure ?? raw.average_risk_score),
          recent_scans: Array.isArray(raw.recent_scans) ? raw.recent_scans : [],
        };
      }
    } catch {
      // Fallback default
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

  // System Health
  async getHealth(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) return await res.json();
      const rootHealth = await fetch("/health");
      if (rootHealth.ok) return await rootHealth.json();
    } catch {}
    return { status: "ok" };
  },
};

