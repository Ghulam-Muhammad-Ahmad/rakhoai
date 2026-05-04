export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      Academy: {
        Row: {
          country: string
          createdAt: string
          currency: string
          id: string
          name: string
          ownerId: string
        }
        Insert: {
          country: string
          createdAt?: string
          currency?: string
          id: string
          name: string
          ownerId: string
        }
        Update: {
          country?: string
          createdAt?: string
          currency?: string
          id?: string
          name?: string
          ownerId?: string
        }
        Relationships: []
      }
      Action: {
        Row: {
          academyId: string
          content: string | null
          createdAt: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["ActionStatus"]
          studentId: string
          takenAt: string | null
          takenBy: string | null
          type: string
          updatedAt: string
        }
        Insert: {
          academyId: string
          content?: string | null
          createdAt?: string
          id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["ActionStatus"]
          studentId: string
          takenAt?: string | null
          takenBy?: string | null
          type: string
          updatedAt?: string
        }
        Update: {
          academyId?: string
          content?: string | null
          createdAt?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["ActionStatus"]
          studentId?: string
          takenAt?: string | null
          takenBy?: string | null
          type?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Action_academyId_fkey"
            columns: ["academyId"]
            isOneToOne: false
            referencedRelation: "Academy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Action_studentId_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "Student"
            referencedColumns: ["id"]
          },
        ]
      }
      AiUsageLog: {
        Row: {
          academyId: string | null
          cacheHit: boolean
          createdAt: string
          errorCode: string | null
          feature: string
          id: string
          inputTokens: number | null
          latencyMs: number
          metadataJson: Json | null
          model: string
          outputTokens: number | null
          provider: string
          requestHash: string
          status: string
          totalTokens: number | null
          uploadId: string | null
        }
        Insert: {
          academyId?: string | null
          cacheHit?: boolean
          createdAt?: string
          errorCode?: string | null
          feature: string
          id: string
          inputTokens?: number | null
          latencyMs: number
          metadataJson?: Json | null
          model: string
          outputTokens?: number | null
          provider?: string
          requestHash: string
          status: string
          totalTokens?: number | null
          uploadId?: string | null
        }
        Update: {
          academyId?: string | null
          cacheHit?: boolean
          createdAt?: string
          errorCode?: string | null
          feature?: string
          id?: string
          inputTokens?: number | null
          latencyMs?: number
          metadataJson?: Json | null
          model?: string
          outputTokens?: number | null
          provider?: string
          requestHash?: string
          status?: string
          totalTokens?: number | null
          uploadId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AiUsageLog_academyId_fkey"
            columns: ["academyId"]
            isOneToOne: false
            referencedRelation: "Academy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AiUsageLog_uploadId_fkey"
            columns: ["uploadId"]
            isOneToOne: false
            referencedRelation: "Upload"
            referencedColumns: ["id"]
          },
        ]
      }
      ColumnMapping: {
        Row: {
          academyId: string
          createdAt: string
          id: string
          isDefault: boolean
          mappingJson: Json
          name: string
        }
        Insert: {
          academyId: string
          createdAt?: string
          id: string
          isDefault?: boolean
          mappingJson: Json
          name: string
        }
        Update: {
          academyId?: string
          createdAt?: string
          id?: string
          isDefault?: boolean
          mappingJson?: Json
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ColumnMapping_academyId_fkey"
            columns: ["academyId"]
            isOneToOne: false
            referencedRelation: "Academy"
            referencedColumns: ["id"]
          },
        ]
      }
      EmailAlert: {
        Row: {
          academyId: string
          body: string
          createdAt: string
          errorMessage: string | null
          id: string
          recipientEmail: string
          riskAssessmentId: string
          sentAt: string | null
          status: string
          studentId: string
          subject: string
        }
        Insert: {
          academyId: string
          body: string
          createdAt?: string
          errorMessage?: string | null
          id: string
          recipientEmail: string
          riskAssessmentId: string
          sentAt?: string | null
          status?: string
          studentId: string
          subject: string
        }
        Update: {
          academyId?: string
          body?: string
          createdAt?: string
          errorMessage?: string | null
          id?: string
          recipientEmail?: string
          riskAssessmentId?: string
          sentAt?: string | null
          status?: string
          studentId?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "EmailAlert_academyId_fkey"
            columns: ["academyId"]
            isOneToOne: false
            referencedRelation: "Academy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EmailAlert_riskAssessmentId_fkey"
            columns: ["riskAssessmentId"]
            isOneToOne: true
            referencedRelation: "RiskAssessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EmailAlert_studentId_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "Student"
            referencedColumns: ["id"]
          },
        ]
      }
      RiskAssessment: {
        Row: {
          aiModel: string
          computedAt: string
          confidence: number
          id: string
          reasonsJson: Json
          recommendedAction: string
          riskBand: Database["public"]["Enums"]["RiskBand"]
          riskScore: number
          ruleScore: number
          studentId: string
          uploadId: string | null
        }
        Insert: {
          aiModel: string
          computedAt?: string
          confidence: number
          id: string
          reasonsJson: Json
          recommendedAction: string
          riskBand: Database["public"]["Enums"]["RiskBand"]
          riskScore: number
          ruleScore: number
          studentId: string
          uploadId?: string | null
        }
        Update: {
          aiModel?: string
          computedAt?: string
          confidence?: number
          id?: string
          reasonsJson?: Json
          recommendedAction?: string
          riskBand?: Database["public"]["Enums"]["RiskBand"]
          riskScore?: number
          ruleScore?: number
          studentId?: string
          uploadId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "RiskAssessment_studentId_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "Student"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RiskAssessment_uploadId_fkey"
            columns: ["uploadId"]
            isOneToOne: false
            referencedRelation: "Upload"
            referencedColumns: ["id"]
          },
        ]
      }
      Student: {
        Row: {
          academyId: string
          attendanceRate: number | null
          contact: string | null
          createdAt: string
          externalId: string | null
          feesAmount: number | null
          id: string
          joinDate: string | null
          lastPaymentDate: string | null
          lastSessionDate: string | null
          name: string
          paymentStatus: string | null
          rawDataJson: Json
          subject: string | null
          totalSessions: number | null
          tutor: string | null
          updatedAt: string
          uploadId: string | null
        }
        Insert: {
          academyId: string
          attendanceRate?: number | null
          contact?: string | null
          createdAt?: string
          externalId?: string | null
          feesAmount?: number | null
          id: string
          joinDate?: string | null
          lastPaymentDate?: string | null
          lastSessionDate?: string | null
          name: string
          paymentStatus?: string | null
          rawDataJson: Json
          subject?: string | null
          totalSessions?: number | null
          tutor?: string | null
          updatedAt?: string
          uploadId?: string | null
        }
        Update: {
          academyId?: string
          attendanceRate?: number | null
          contact?: string | null
          createdAt?: string
          externalId?: string | null
          feesAmount?: number | null
          id?: string
          joinDate?: string | null
          lastPaymentDate?: string | null
          lastSessionDate?: string | null
          name?: string
          paymentStatus?: string | null
          rawDataJson?: Json
          subject?: string | null
          totalSessions?: number | null
          tutor?: string | null
          updatedAt?: string
          uploadId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Student_academyId_fkey"
            columns: ["academyId"]
            isOneToOne: false
            referencedRelation: "Academy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Student_uploadId_fkey"
            columns: ["uploadId"]
            isOneToOne: false
            referencedRelation: "Upload"
            referencedColumns: ["id"]
          },
        ]
      }
      Upload: {
        Row: {
          academyId: string
          fileName: string
          fileUrl: string | null
          headers: Json | null
          id: string
          mappingJson: Json | null
          processedAt: string | null
          rawRowsJson: Json | null
          rowCount: number | null
          sampleRows: Json | null
          status: Database["public"]["Enums"]["UploadStatus"]
          uploadedAt: string
        }
        Insert: {
          academyId: string
          fileName: string
          fileUrl?: string | null
          headers?: Json | null
          id: string
          mappingJson?: Json | null
          processedAt?: string | null
          rawRowsJson?: Json | null
          rowCount?: number | null
          sampleRows?: Json | null
          status?: Database["public"]["Enums"]["UploadStatus"]
          uploadedAt?: string
        }
        Update: {
          academyId?: string
          fileName?: string
          fileUrl?: string | null
          headers?: Json | null
          id?: string
          mappingJson?: Json | null
          processedAt?: string | null
          rawRowsJson?: Json | null
          rowCount?: number | null
          sampleRows?: Json | null
          status?: Database["public"]["Enums"]["UploadStatus"]
          uploadedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Upload_academyId_fkey"
            columns: ["academyId"]
            isOneToOne: false
            referencedRelation: "Academy"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ActionStatus:
        | "PENDING"
        | "IN_PROGRESS"
        | "DONE"
        | "STUDENT_SAVED"
        | "STUDENT_LOST"
      RiskBand: "HIGH" | "MEDIUM" | "LOW"
      UploadStatus:
        | "PENDING"
        | "PREVIEW_READY"
        | "MAPPED"
        | "PROCESSING"
        | "PROCESSED"
        | "FAILED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ActionStatus: [
        "PENDING",
        "IN_PROGRESS",
        "DONE",
        "STUDENT_SAVED",
        "STUDENT_LOST",
      ],
      RiskBand: ["HIGH", "MEDIUM", "LOW"],
      UploadStatus: [
        "PENDING",
        "PREVIEW_READY",
        "MAPPED",
        "PROCESSING",
        "PROCESSED",
        "FAILED",
      ],
    },
  },
} as const
