export type CoordinateStatus = "valid" | "missing" | "invalid" | "outside_uzbekistan" | "unconfirmed";
export type ModerationStatus = "draft" | "pending_review" | "approved" | "rejected" | "needs_changes";
export type ActivityStatus = "active" | "archived" | "pending_delete" | "rejected_delete";

export type MedicalObject = {
  id: number;
  name: string;
  type: string;
  ownership: "Davlat" | "Xususiy" | "Aralash" | "Noma’lum";
  region: string;
  district: string;
  mahalla?: string;
  address: string;
  inn: string;
  position: LatLng;
  coordinateStatus: CoordinateStatus;
  moderationStatus: ModerationStatus;
  activityStatus: ActivityStatus;
  lastModified: string;
  // Extended fields for form
  license_number?: string;
  phone?: string;
  email?: string;
  website?: string;
  postal_code?: string;
  work_hours?: string;
  director_name?: string;
  responsible_person?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  coordinate_confirmed_at?: string;
  coordinate_confirmed_by?: string;
  properties_json?: Record<string, any>;
};

export type Region = {
  id: number;
  name: string;
  stats: {
    clinics: number;
    pharmacies: number;
    airports: number;
  };
  path: LatLng[];
  districts?: { id: number; name: string }[];
};

export type Airport = {
  id: number;
  name: string;
  position: LatLng;
}

export type Layer = 
  | "regions"
  | "districts"
  | "mahallas"
  | "state-clinics"
  | "private-clinics"
  | "pharmacies"
  | "airports"
  | "diseases"
  | "equipment";

export type LatLng = {
  lat: number;
  lng: number;
};

export type BasemapId = 'voyager' | 'positron' | 'dark-matter';

export type Basemap = {
  id: BasemapId;
  name: string;
  url: string;
};

// Import related types
export type ImportJobStatus = "draft" | "validating" | "ready" | "importing" | "completed" | "failed";

export type ImportJob = {
  id: string;
  file_name: string;
  file_type: "csv" | "xlsx" | "xls" | "geojson" | "json";
  layer_type: string;
  status: ImportJobStatus;
  uploaded_by?: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  warning_count: number;
  duplicate_count: number;
  mapping_json: Record<string, string>;
  preview_json: unknown;
  error_log: unknown[];
  created_at: string;
  completed_at?: string;
};

export type ImportPreviewRowStatus = "valid" | "warning" | "error" | "duplicate";

export type ImportPreviewRow = {
  rowNumber: number;
  data: Record<string, any>;
  mapped: Partial<MedicalObject>;
  status: ImportPreviewRowStatus;
  messages: string[];
};

export type BulkPasteRowStatus = "draft" | "valid" | "warning" | "error" | "duplicate";

export type BulkPasteRow = {
  id: string;
  name: string;
  object_type: string;
  ownership_type: string;
  region: string;
  district: string;
  mahalla: string;
  address: string;
  inn: string;
  lat: string;
  lon: string;
  phone: string;
  email?: string;
  website?: string;
  license_number?: string;
  old_cadastre?: string;
  new_cadastre?: string;
  notes?: string;
  status: BulkPasteRowStatus;
  messages: string[];
};

// Moderation Types
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes' | 'cancelled';
export type RequestType = 'create' | 'update' | 'archive' | 'delete' | 'restore';
export type RequestPriority = 'low' | 'normal' | 'high';

export interface ObjectChangeRequest {
  id: string;
  object_id?: number;
  object_name: string;
  requested_by_name: string;
  requested_by_role: string;
  type: RequestType;
  status: RequestStatus;
  priority: RequestPriority;
  region: string;
  district: string;
  before_data?: Partial<MedicalObject>;
  after_data: Partial<MedicalObject>;
  reason: string;
  admin_comment?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

// Audit Log Types
export type AuditLogSeverity = 'info' | 'warning' | 'critical';
export type AuditLogEntity = 'medical_object' | 'import_job' | 'change_request' | 'user' | 'role' | 'system';
export type AuditLogAction = 
  | 'object_created' | 'object_updated' | 'object_archived' | 'object_deleted' | 'object_restored'
  | 'import_started' | 'import_completed' | 'import_failed'
  | 'bulk_paste_started' | 'bulk_paste_completed'
  | 'change_request_created' | 'change_request_approved' | 'change_request_rejected'
  | 'role_assigned' | 'role_revoked' | 'user_blocked' | 'user_unblocked'
  | 'login' | 'logout';

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: AuditLogAction;
  entity_type: AuditLogEntity;
  entity_id: string;
  entity_name: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  severity: AuditLogSeverity;
  created_at: string;
}