import { AuditLog } from "../types";

export const mockAuditLogs: AuditLog[] = [
  {
    id: "AUD-001",
    actor_id: "user-1",
    actor_email: "superadmin@gis.uz",
    actor_role: "Super Admin",
    action: "object_updated",
    entity_type: "medical_object",
    entity_id: "1",
    entity_name: "Respublika Shoshilinch Tibbiy Yordam Markazi",
    before_data: {
      phone: "+998 71 277 00 00",
      work_hours: "09:00 - 18:00"
    },
    after_data: {
      phone: "+998 71 277 99 99",
      work_hours: "24/7"
    },
    ip_address: "192.168.1.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    severity: "info",
    created_at: "2024-03-22 10:30:45"
  },
  {
    id: "AUD-002",
    actor_id: "user-2",
    actor_email: "admin_toshkent@gis.uz",
    actor_role: "Admin",
    action: "import_completed",
    entity_type: "import_job",
    entity_id: "IMP-99",
    entity_name: "toshkent_klinikalar.xlsx",
    metadata: {
      total_rows: 152,
      created: 140,
      updated: 8,
      failed: 4
    },
    ip_address: "172.16.0.5",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    severity: "info",
    created_at: "2024-03-22 09:15:20"
  },
  {
    id: "AUD-003",
    actor_id: "user-1",
    actor_email: "superadmin@gis.uz",
    actor_role: "Super Admin",
    action: "role_revoked",
    entity_type: "user",
    entity_id: "user-55",
    entity_name: "malika@shox.uz",
    before_data: {
      role: "Moderator",
      status: "active"
    },
    after_data: {
      role: "Viewer",
      status: "restricted"
    },
    ip_address: "192.168.1.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    severity: "critical",
    created_at: "2024-03-21 16:45:00"
  },
  {
    id: "AUD-004",
    actor_id: "user-3",
    actor_email: "moderator@gis.uz",
    actor_role: "Moderator",
    action: "change_request_approved",
    entity_type: "change_request",
    entity_id: "REQ-001",
    entity_name: "Shox Med Center updates",
    metadata: {
      approved_fields: ["phone", "email"],
      comment: "Verified with the institution director."
    },
    ip_address: "10.0.0.25",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64)",
    severity: "info",
    created_at: "2024-03-21 11:20:10"
  },
  {
    id: "AUD-005",
    actor_id: "user-4",
    actor_email: "director@shoxmed.uz",
    actor_role: "Institution Director",
    action: "login",
    entity_type: "system",
    entity_id: "shox-med-center",
    entity_name: "Shox Med Center Cabinet",
    ip_address: "84.54.71.12",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    severity: "info",
    created_at: "2024-03-21 08:30:00"
  },
  {
    id: "AUD-006",
    actor_id: "user-1",
    actor_email: "superadmin@gis.uz",
    actor_role: "Super Admin",
    action: "object_archived",
    entity_type: "medical_object",
    entity_id: "5",
    entity_name: "Eski Shahar Poliklinikasi",
    before_data: {
      status: "active"
    },
    after_data: {
      status: "archived"
    },
    ip_address: "192.168.1.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    severity: "warning",
    created_at: "2024-03-20 14:00:00"
  }
];