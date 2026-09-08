export type VerdictLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SignatureStatus = "VALID" | "INVALID" | "UNSIGNED" | "SELF_SIGNED" | "CORRUPTED" | "REVOKED" | "EXPIRED" | "UNKNOWN";

export type QuantumScenario = "LEGITIMATE" | "FORGERY" | "REPLAY" | "IMPERSONATION" | "CHANNEL_MANIPULATION";

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serial_number: string;
  not_before: string;
  not_after: string;
  signature_algorithm: string;
  is_self_signed: boolean;
  is_expired: boolean;
}

export interface DigitalSignatureInfo {
  is_signed: boolean;
  status: SignatureStatus;
  signer_name?: string;
  issuer_name?: string;
  digest_algorithm?: string;
  certificates: CertificateInfo[];
  warnings: string[];
}

export interface Finding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: VerdictLevel | "INFO";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: Record<string, any>;
  source_engine: string;
}

export interface Capability {
  capability: string;
  status: string;
  confidence: string;
  evidence: string[];
}

export interface ScanResponse {
  scan_id: string;
  user_id?: string;
  file: {
    name: string;
    size: number;
    sha256: string;
    type: string;
    mime: string;
  };
  verdict: {
    level: VerdictLevel;
    score: number;
    category_scores?: Record<string, number | null>;
  };
  engines: Record<string, string>;
  findings: Finding[];
  capabilities: Capability[];
  signature_info?: DigitalSignatureInfo;
  metadata?: Record<string, any>;
}

export interface DnsRecord {
  record_type: string;
  value: string;
  ttl: number;
}

export interface TlsCertificateInfo {
  subject: string;
  issuer: string;
  san: string[];
  valid_from?: string;
  valid_to?: string;
  cipher_suite: string;
  tls_version: string;
  is_expired: boolean;
}

export interface HttpSecurityHeaders {
  hsts: boolean;
  csp: boolean;
  x_frame_options?: string;
  x_content_type_options: boolean;
  referrer_policy?: string;
  raw_headers: Record<string, string>;
}

export interface ReconFinding {
  id: string;
  category: string;
  title: string;
  severity: VerdictLevel | "INFO";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: Record<string, any>;
  recommendation: string;
}

export interface ReconAsset {
  id: string;
  hostname: string;
  asset_type: string;
  source: string;
  status: string;
  metadata?: Record<string, any>;
}

export interface ReconScanResponse {
  id: string;
  user_id?: string;
  target: string;
  status: string;
  exposure_score: number;
  exposure_level: VerdictLevel;
  dns_records: DnsRecord[];
  tls_info?: TlsCertificateInfo;
  security_headers?: HttpSecurityHeaders;
  assets: ReconAsset[];
  findings: ReconFinding[];
  created_at: string;
  completed_at?: string;
}

export interface QuantumSimulationResponse {
  id: string;
  user_id?: string;
  scenario: QuantumScenario;
  is_simulated: boolean;
  environment_badge: string;
  expected_distribution: Record<string, number>;
  observed_distribution: Record<string, number>;
  deviation: number;
  threshold: number;
  verdict: string;
  explanation: string;
  created_at: string;
}

export interface ReportResponse {
  id: string;
  user_id?: string;
  scan_id?: string;
  recon_id?: string;
  quantum_id?: string;
  report_type: "EXECUTIVE_AUDIT" | "TECHNICAL_DEEP_DIVE" | "COMPLIANCE_CERTIFICATE";
  title: string;
  summary: string;
  content: {
    observed_evidence: Record<string, any>;
    analytical_inference: Record<string, any>;
    quantum_simulation?: Record<string, any>;
    recommendations: string[];
  };
  created_at: string;
}

export interface DashboardStats {
  total_scans: number;
  critical_threats: number;
  recon_targets: number;
  quantum_simulations: number;
  average_exposure: number;
  recent_scans: Array<{
    scan_id: string;
    filename: string;
    risk_score: number;
    risk_level: VerdictLevel;
    created_at: string;
  }>;
}
