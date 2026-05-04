import type { Database } from "./database.types";

export type Tables = Database["public"]["Tables"];

// Row types (what comes back from SELECT)
export type UserRow           = Tables["User"]["Row"];
export type AcademyRow        = Tables["Academy"]["Row"];
export type UploadRow         = Tables["Upload"]["Row"];
export type ColumnMappingRow  = Tables["ColumnMapping"]["Row"];
export type StudentRow        = Tables["Student"]["Row"];
export type RiskAssessmentRow = Tables["RiskAssessment"]["Row"];
export type ActionRow         = Tables["Action"]["Row"];
export type AiUsageLogRow     = Tables["AiUsageLog"]["Row"];

// Insert types (what you send on INSERT)
export type UserInsert           = Tables["User"]["Insert"];
export type AcademyInsert        = Tables["Academy"]["Insert"];
export type UploadInsert         = Tables["Upload"]["Insert"];
export type ColumnMappingInsert  = Tables["ColumnMapping"]["Insert"];
export type StudentInsert        = Tables["Student"]["Insert"];
export type RiskAssessmentInsert = Tables["RiskAssessment"]["Insert"];
export type ActionInsert         = Tables["Action"]["Insert"];
export type AiUsageLogInsert     = Tables["AiUsageLog"]["Insert"];

// Update types
export type StudentUpdate = Tables["Student"]["Update"];
export type UploadUpdate  = Tables["Upload"]["Update"];
export type ActionUpdate  = Tables["Action"]["Update"];
