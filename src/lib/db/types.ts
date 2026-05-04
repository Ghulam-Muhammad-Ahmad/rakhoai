import type { Database } from "./database.types";

export type Tables = Database["public"]["Tables"];

// Row types (what comes back from SELECT)
export type AcademyRow        = Tables["Academy"]["Row"];
export type UploadRow         = Tables["Upload"]["Row"];
export type ColumnMappingRow  = Tables["ColumnMapping"]["Row"];
export type StudentRow        = Tables["Student"]["Row"];
export type RiskAssessmentRow = Tables["RiskAssessment"]["Row"];
export type ActionRow         = Tables["Action"]["Row"];
export type AiUsageLogRow     = Tables["AiUsageLog"]["Row"];
export type EmailAlertRow     = Tables["EmailAlert"]["Row"];

// Insert types (what you send on INSERT)
export type AcademyInsert        = Tables["Academy"]["Insert"];
export type UploadInsert         = Tables["Upload"]["Insert"];
export type ColumnMappingInsert  = Tables["ColumnMapping"]["Insert"];
export type StudentInsert        = Tables["Student"]["Insert"];
export type RiskAssessmentInsert = Tables["RiskAssessment"]["Insert"];
export type ActionInsert         = Tables["Action"]["Insert"];
export type AiUsageLogInsert     = Tables["AiUsageLog"]["Insert"];
export type EmailAlertInsert     = Tables["EmailAlert"]["Insert"];

// Update types
export type StudentUpdate        = Tables["Student"]["Update"];
export type UploadUpdate         = Tables["Upload"]["Update"];
export type ActionUpdate         = Tables["Action"]["Update"];
export type RiskAssessmentUpdate = Tables["RiskAssessment"]["Update"];
export type ColumnMappingUpdate  = Tables["ColumnMapping"]["Update"];
export type AcademyUpdate        = Tables["Academy"]["Update"];
export type EmailAlertUpdate     = Tables["EmailAlert"]["Update"];
