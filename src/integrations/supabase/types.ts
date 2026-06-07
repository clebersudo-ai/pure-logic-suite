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
  public: {
    Tables: {
      controle_qualidade: {
        Row: {
          analista_id: string | null
          aparencia: string | null
          created_at: string
          data_analise: string | null
          id: string
          observacoes: string | null
          ordem_producao_id: string
          ph: number | null
          status: Database["public"]["Enums"]["qualidade_status"]
          viscosidade: number | null
        }
        Insert: {
          analista_id?: string | null
          aparencia?: string | null
          created_at?: string
          data_analise?: string | null
          id?: string
          observacoes?: string | null
          ordem_producao_id: string
          ph?: number | null
          status?: Database["public"]["Enums"]["qualidade_status"]
          viscosidade?: number | null
        }
        Update: {
          analista_id?: string | null
          aparencia?: string | null
          created_at?: string
          data_analise?: string | null
          id?: string
          observacoes?: string | null
          ordem_producao_id?: string
          ph?: number | null
          status?: Database["public"]["Enums"]["qualidade_status"]
          viscosidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "controle_qualidade_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_anexos: {
        Row: {
          created_at: string
          documento_id: string
          enviado_por: string | null
          enviado_por_nome: string | null
          id: string
          mime_type: string | null
          nome_arquivo: string
          observacoes: string | null
          storage_path: string
          tamanho_bytes: number | null
        }
        Insert: {
          created_at?: string
          documento_id: string
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          observacoes?: string | null
          storage_path: string
          tamanho_bytes?: number | null
        }
        Update: {
          created_at?: string
          documento_id?: string
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          observacoes?: string | null
          storage_path?: string
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_anexos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_opcoes: {
        Row: {
          created_at: string
          id: string
          label: string | null
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          tipo: string
          updated_at?: string
          valor: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      documento_versoes: {
        Row: {
          created_at: string
          documento_id: string
          enviado_por: string | null
          enviado_por_nome: string | null
          id: string
          mime_type: string | null
          nome_arquivo: string
          observacoes: string | null
          storage_path: string
          tamanho_bytes: number | null
          versao: number
        }
        Insert: {
          created_at?: string
          documento_id: string
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          observacoes?: string | null
          storage_path: string
          tamanho_bytes?: number | null
          versao: number
        }
        Update: {
          created_at?: string
          documento_id?: string
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          observacoes?: string | null
          storage_path?: string
          tamanho_bytes?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_versoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          categoria: string | null
          cnpj: string | null
          created_at: string
          criado_por: string | null
          criticidade: string
          atualizacao_recorrente: boolean
          data_emissao: string | null
          data_validade: string | null
          descricao: string | null
          empresa: string | null
          id: string
          intervalo_atualizacao_dias: number | null
          nome: string
          numero_documento: string | null
          observacoes: string | null
          orgao_emissor: string | null
          proxima_atualizacao: string | null
          renovacao_obrigatoria: boolean
          responsavel: string | null
          status: string
          subcategoria: string | null
          tipo_documento: string | null
          uf: string | null
          unidade: string | null
          updated_at: string
          validado_em: string | null
          validado_ia: boolean
          versao_atual: number
        }
        Insert: {
          categoria?: string | null
          cnpj?: string | null
          created_at?: string
          criado_por?: string | null
          criticidade?: string
          atualizacao_recorrente?: boolean
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          empresa?: string | null
          id?: string
          intervalo_atualizacao_dias?: number | null
          nome: string
          numero_documento?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          proxima_atualizacao?: string | null
          renovacao_obrigatoria?: boolean
          responsavel?: string | null
          status?: string
          subcategoria?: string | null
          tipo_documento?: string | null
          uf?: string | null
          unidade?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_ia?: boolean
          versao_atual?: number
        }
        Update: {
          categoria?: string | null
          cnpj?: string | null
          created_at?: string
          criado_por?: string | null
          criticidade?: string
          atualizacao_recorrente?: boolean
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          empresa?: string | null
          id?: string
          intervalo_atualizacao_dias?: number | null
          nome?: string
          numero_documento?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          proxima_atualizacao?: string | null
          renovacao_obrigatoria?: boolean
          responsavel?: string | null
          status?: string
          subcategoria?: string | null
          tipo_documento?: string | null
          uf?: string | null
          unidade?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_ia?: boolean
          versao_atual?: number
        }
        Relationships: []
      }
      formulacoes: {
        Row: {
          created_at: string
          id: string
          materia_prima_id: string
          percentual: number
          produto_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_prima_id: string
          percentual: number
          produto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_prima_id?: string
          percentual?: number
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulacoes_materia_prima_id_fkey"
            columns: ["materia_prima_id"]
            isOneToOne: false
            referencedRelation: "materias_primas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      materias_primas: {
        Row: {
          codigo_interno: string
          created_at: string
          custo_unitario: number
          estoque_atual: number
          estoque_minimo: number
          fornecedor: string | null
          id: string
          lote_fornecedor: string | null
          nome: string
          unidade: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          codigo_interno: string
          created_at?: string
          custo_unitario?: number
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          lote_fornecedor?: string | null
          nome: string
          unidade?: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          codigo_interno?: string
          created_at?: string
          custo_unitario?: number
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          lote_fornecedor?: string | null
          nome?: string
          unidade?: string
          updated_at?: string
          validade?: string | null
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          id: string
          materia_prima_id: string
          motivo: string | null
          ordem_producao_id: string | null
          quantidade: number
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          materia_prima_id: string
          motivo?: string | null
          ordem_producao_id?: string | null
          quantidade: number
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          materia_prima_id?: string
          motivo?: string | null
          ordem_producao_id?: string | null
          quantidade?: number
          tipo?: Database["public"]["Enums"]["movimento_tipo"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_materia_prima_id_fkey"
            columns: ["materia_prima_id"]
            isOneToOne: false
            referencedRelation: "materias_primas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          created_at: string
          custo_total: number | null
          data_producao: string
          id: string
          numero_lote: string
          observacoes: string | null
          operador_id: string | null
          operador_nome: string | null
          produto_id: string
          quantidade_litros: number
          sequencia_fabricacao: string | null
          status: Database["public"]["Enums"]["ordem_status"]
          tanque: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          data_producao?: string
          id?: string
          numero_lote: string
          observacoes?: string | null
          operador_id?: string | null
          operador_nome?: string | null
          produto_id: string
          quantidade_litros: number
          sequencia_fabricacao?: string | null
          status?: Database["public"]["Enums"]["ordem_status"]
          tanque?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          data_producao?: string
          id?: string
          numero_lote?: string
          observacoes?: string | null
          operador_id?: string | null
          operador_nome?: string | null
          produto_id?: string
          quantidade_litros?: number
          sequencia_fabricacao?: string | null
          status?: Database["public"]["Enums"]["ordem_status"]
          tanque?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string | null
          created_at: string
          custo_calculado: number | null
          embalagem: string | null
          id: string
          margem_percentual: number | null
          nome: string
          preco_sugerido: number | null
          updated_at: string
          validade_meses: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          custo_calculado?: number | null
          embalagem?: string | null
          id?: string
          margem_percentual?: number | null
          nome: string
          preco_sugerido?: number | null
          updated_at?: string
          validade_meses?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          custo_calculado?: number | null
          embalagem?: string | null
          id?: string
          margem_percentual?: number | null
          nome?: string
          preco_sugerido?: number | null
          updated_at?: string
          validade_meses?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "administrador" | "producao" | "estoque" | "comercial"
      movimento_tipo: "entrada" | "saida" | "ajuste"
      ordem_status: "aberta" | "em_producao" | "finalizada" | "cancelada"
      qualidade_status: "pendente" | "aprovado" | "reprovado"
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
  public: {
    Enums: {
      app_role: ["administrador", "producao", "estoque", "comercial"],
      movimento_tipo: ["entrada", "saida", "ajuste"],
      ordem_status: ["aberta", "em_producao", "finalizada", "cancelada"],
      qualidade_status: ["pendente", "aprovado", "reprovado"],
    },
  },
} as const
