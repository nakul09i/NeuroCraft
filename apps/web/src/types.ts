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
  weight?: number;
}

export interface Capability {
  capability: string;
  status: string;
  confidence: string;
  evidence: string[];
}

export type HashMatchStatus = "MATCH" | "MISMATCH" | "NOT_PROVIDED" | "INVALID_REFERENCE";

export type IntegrityStatus =
  | "VERIFIED"
  | "UNCHANGED"
  | "MISMATCH"
  | "SIGNED"
  | "UNSIGNED"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export type TrustLevel = "VERY_LOW" | "LOW" | "NEUTRAL" | "HIGH" | "VERY_HIGH";

export interface TrustEvidenceItem {
  type: string;
  algorithm?: string;
  value?: string;
  status: string;
  meaning: string;
  details?: Record<string, any>;
}

export interface FileIntegrityReport {
  scan_id: string;
  sha256: string;
  sha512?: string;
  sha1?: string;
  reference_hash?: string;
  hash_match_status: HashMatchStatus;
  signature_info?: DigitalSignatureInfo;
  integrity_status: IntegrityStatus;
  trust_score: number;
  trust_level: TrustLevel;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  confidence_score: number;
  evidence: TrustEvidenceItem[];
  created_at: string;
}

export interface TrustAssessment {
  scan_id: string;
  trust_score: number;
  trust_level: TrustLevel;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  confidence_score: number;
  integrity_status: IntegrityStatus;
  risk_level: VerdictLevel;
  risk_score: number;
  evidence: TrustEvidenceItem[];
  summary: string;
  created_at: string;
}

export interface ScanResponse {
  scan_id: string;
  user_id?: string;
  status?: string;
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
    confidence?: "LOW" | "MEDIUM" | "HIGH";
    confidence_score?: number;
    category_scores?: Record<string, number | null>;
  };
  engines: Record<string, string>;
  findings: Finding[];
  capabilities: Capability[];
  signature_info?: DigitalSignatureInfo;
  integrity_summary?: FileIntegrityReport;
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
  target_type?: string;
  authorization_confirmed?: boolean;
  status: string;
  exposure_score: number;
  exposure_level: VerdictLevel;
  confidence?: string;
  confidence_score?: number;
  dns_records: DnsRecord[];
  tls_info?: TlsCertificateInfo;
  security_headers?: HttpSecurityHeaders;
  assets: ReconAsset[];
  findings: ReconFinding[];
  technologies?: Array<{ name: string; category: string; confidence: number; source: string }>;
  rdap_info?: {
    registrar?: string;
    created_date?: string;
    expiration_date?: string;
    nameservers?: string[];
    status?: string[];
  };
  limitations?: string[];
  cached?: boolean;
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

export interface ScanHistoryItem {
  id: string;
  scan_id: string;
  user_id?: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_size_bytes: number;
  sha256: string;
  status: string;
  analysis_status: string;
  risk_score: number;
  risk_level: VerdictLevel;
  confidence: string;
  integrity_status: string;
  signature_status: string;
  trust_score?: number;
  trust_level?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScanReconCorrelation {
  scan_id: string;
  recon_available: boolean;
  recon_id?: string;
  target?: string;
  exposure_score?: number;
  exposure_level?: string;
  technologies?: Array<{ name: string; category: string; confidence: number; source: string }>;
  dns?: any[];
  tls?: Record<string, any>;
  headers?: Record<string, any>;
}

export type SyncState = "online" | "offline" | "syncing" | "synced" | "pending" | "failed";

export interface SyncQueueItem {
  id: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_attempt_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncSummary {
  counts: {
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    retrying: number;
    total: number;
  };
  pending_count: number;
  failed_count: number;
  synced_count: number;
  last_synced_at?: string;
  is_syncing: boolean;
  status: string;
}

