export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      User: {
        Row: {
          id: string
          supabaseId: string
          email: string
          name: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          supabaseId: string
          email: string
          name?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          supabaseId?: string
          email?: string
          name?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      Academy: {
        Row: {
          id: string
          ownerId: string
          name: string
          country: string
          currency: string
          createdAt: string
        }
        Insert: {
          id?: string
          ownerId: string
          name: string
          country: string
          currency?: string
          createdAt?: string
        }
        Update: {
          id?: string
          ownerId?: string
          name?: string
          country?: string
          currency?: string
          createdAt?: string
        }
        Relationships: []
      }
      Upload: {
        Row: {
          id: string
          academyId: string
          fileName: string
          fileUrl: string | null
          status: Database["public"]["Enums"]["UploadStatus"]
          rowCount: number | null
          headers: Json | null
          sampleRows: Json | null
          rawRowsJson: Json | null
          mappingJson: Json | null
          uploadedAt: string
          processedAt: string | null
        }
        Insert: {
          id?: string
          academyId: string
          fileName: string
          fileUrl?: string | null
          status?: Database["public"]["Enums"]["UploadStatus"]
          rowCount?: number | null
          headers?: Json | null
          sampleRows?: Json | null
          rawRowsJson?: Json | null
          mappingJson?: Json | null
          uploadedAt?: string
          processedAt?: string | null
        }
        Update: {
          id?: string
          academyId?: string
          fileName?: string
          fileUrl?: string | null
          status?: Database["public"]["Enums"]["UploadStatus"]
          rowCount?: number | null
          headers?: Json | null
          sampleRows?: Json | null
          rawRowsJson?: Json | null
          mappingJson?: Json | null
          uploadedAt?: string
          processedAt?: string | null
        }
        Relationships: []
      }
      ColumnMapping: {
        Row: {
          id: string
          academyId: string
          name: string
          mappingJson: Json
          isDefault: boolean
          createdAt: string
        }
        Insert: {
          id?: string
          academyId: string
          name: string
          mappingJson: Json
          isDefault?: boolean
          createdAt?: string
        }
        Update: {
          id?: string
          academyId?: string
          name?: string
          mappingJson?: Json
          isDefault?: boolean
          createdAt?: string
        }
        Relationships: []
      }
      Student: {
        Row: {
          id: string
          academyId: string
          uploadId: string | null
          externalId: string | null
          name: string
          contact: string | null
          joinDate: string | null
          lastSessionDate: string | null
          attendanceRate: number | null
          paymentStatus: string | null
          lastPaymentDate: string | null
          totalSessions: number | null
          feesAmount: string | null
          subject: string | null
          tutor: string | null
          rawDataJson: Json
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          academyId: string
          uploadId?: string | null
          externalId?: string | null
          name: string
          contact?: string | null
          joinDate?: string | null
          lastSessionDate?: string | null
          attendanceRate?: number | null
          paymentStatus?: string | null
          lastPaymentDate?: string | null
          totalSessions?: number | null
          feesAmount?: string | null
          subject?: string | null
          tutor?: string | null
          rawDataJson: Json
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          academyId?: string
          uploadId?: string | null
          externalId?: string | null
          name?: string
          contact?: string | null
          joinDate?: string | null
          lastSessionDate?: string | null
          attendanceRate?: number | null
          paymentStatus?: string | null
          lastPaymentDate?: string | null
          totalSessions?: number | null
          feesAmount?: string | null
          subject?: string | null
          tutor?: string | null
          rawDataJson?: Json
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      RiskAssessment: {
        Row: {
          id: string
          studentId: string
          uploadId: string | null
          riskScore: number
          riskBand: Database["public"]["Enums"]["RiskBand"]
          reasonsJson: Json
          recommendedAction: string
          confidence: number
          ruleScore: number
          aiModel: string
          computedAt: string
        }
        Insert: {
          id?: string
          studentId: string
          uploadId?: string | null
          riskScore: number
          riskBand: Database["public"]["Enums"]["RiskBand"]
          reasonsJson: Json
          recommendedAction: string
          confidence: number
          ruleScore: number
          aiModel: string
          computedAt?: string
        }
        Update: {
          id?: string
          studentId?: string
          uploadId?: string | null
          riskScore?: number
          riskBand?: Database["public"]["Enums"]["RiskBand"]
          reasonsJson?: Json
          recommendedAction?: string
          confidence?: number
          ruleScore?: number
          aiModel?: string
          computedAt?: string
        }
        Relationships: []
      }
      Action: {
        Row: {
          id: string
          academyId: string
          studentId: string
          type: string
          content: string | null
          status: Database["public"]["Enums"]["ActionStatus"]
          takenBy: string | null
          takenAt: string | null
          notes: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          academyId: string
          studentId: string
          type: string
          content?: string | null
          status?: Database["public"]["Enums"]["ActionStatus"]
          takenBy?: string | null
          takenAt?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          academyId?: string
          studentId?: string
          type?: string
          content?: string | null
          status?: Database["public"]["Enums"]["ActionStatus"]
          takenBy?: string | null
          takenAt?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      AiUsageLog: {
        Row: {
          id: string
          academyId: string | null
          uploadId: string | null
          feature: string
          provider: string
          model: string
          requestHash: string
          inputTokens: number | null
          outputTokens: number | null
          totalTokens: number | null
          cacheHit: boolean
          status: string
          errorCode: string | null
          latencyMs: number
          metadataJson: Json | null
          createdAt: string
        }
        Insert: {
          id?: string
          academyId?: string | null
          uploadId?: string | null
          feature: string
          provider?: string
          model: string
          requestHash: string
          inputTokens?: number | null
          outputTokens?: number | null
          totalTokens?: number | null
          cacheHit?: boolean
          status: string
          errorCode?: string | null
          latencyMs: number
          metadataJson?: Json | null
          createdAt?: string
        }
        Update: {
          id?: string
          academyId?: string | null
          uploadId?: string | null
          feature?: string
          provider?: string
          model?: string
          requestHash?: string
          inputTokens?: number | null
          outputTokens?: number | null
          totalTokens?: number | null
          cacheHit?: boolean
          status?: string
          errorCode?: string | null
          latencyMs?: number
          metadataJson?: Json | null
          createdAt?: string
        }
        Relationships: []
      }
    }
    Enums: {
      UploadStatus: 'PENDING' | 'PREVIEW_READY' | 'MAPPED' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
      RiskBand: 'HIGH' | 'MEDIUM' | 'LOW'
      ActionStatus: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'STUDENT_SAVED' | 'STUDENT_LOST'
    }
  }
}
