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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brainstorm_ideas: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["brainstorm_idea_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["brainstorm_idea_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["brainstorm_idea_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brainstorm_ideas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_post_statuses: {
        Row: {
          channel: Database["public"]["Enums"]["social_channel"]
          client_id: string
          color: string
          created_at: string
          display_order: number
          icon: string
          id: string
          is_final: boolean
          name: string
          slug: string
          tenant_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["social_channel"]
          client_id: string
          color?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_final?: boolean
          name: string
          slug: string
          tenant_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["social_channel"]
          client_id?: string
          color?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_final?: boolean
          name?: string
          slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_post_statuses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_post_statuses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          channels: Database["public"]["Enums"]["social_channel"][] | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          important_links: Json | null
          name: string
          notes: string | null
          persona: string | null
          segment: string | null
          status: Database["public"]["Enums"]["client_status"]
          tags: string[] | null
          tenant_id: string
          tone_of_voice: string | null
          updated_at: string
        }
        Insert: {
          channels?: Database["public"]["Enums"]["social_channel"][] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          important_links?: Json | null
          name: string
          notes?: string | null
          persona?: string | null
          segment?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[] | null
          tenant_id: string
          tone_of_voice?: string | null
          updated_at?: string
        }
        Update: {
          channels?: Database["public"]["Enums"]["social_channel"][] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          important_links?: Json | null
          name?: string
          notes?: string | null
          persona?: string | null
          segment?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[] | null
          tenant_id?: string
          tone_of_voice?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          client_ids: string[] | null
          created_at: string
          custom_role_id: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_ids?: string[] | null
          created_at?: string
          custom_role_id?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_ids?: string[] | null
          created_at?: string
          custom_role_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_period: string
          code: string
          created_at: string
          currency: string
          display_order: number
          features: Json
          id: string
          is_active: boolean
          max_active_clients: number | null
          max_members: number | null
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          billing_period?: string
          code: string
          created_at?: string
          currency?: string
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_active_clients?: number | null
          max_members?: number | null
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          billing_period?: string
          code?: string
          created_at?: string
          currency?: string
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_active_clients?: number | null
          max_members?: number | null
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_id: string | null
          parent_id: string | null
          post_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["comment_status"]
          tenant_id: string
          updated_at: string
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_id?: string | null
          parent_id?: string | null
          post_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          tenant_id: string
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_id?: string | null
          parent_id?: string | null
          post_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          tenant_id?: string
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "post_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          media_type: string
          post_id: string
          tenant_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          media_type?: string
          post_id: string
          tenant_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          media_type?: string
          post_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          article_content: string | null
          article_title: string | null
          caption: string | null
          channel: Database["public"]["Enums"]["social_channel"]
          client_id: string
          created_at: string
          custom_status_id: string | null
          group_id: string | null
          id: string
          project_type: Database["public"]["Enums"]["project_type"] | null
          scheduled_at: string | null
          seo_keyword: string | null
          seo_keywords: string[]
          status: Database["public"]["Enums"]["post_status"]
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          article_content?: string | null
          article_title?: string | null
          caption?: string | null
          channel: Database["public"]["Enums"]["social_channel"]
          client_id: string
          created_at?: string
          custom_status_id?: string | null
          group_id?: string | null
          id?: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          scheduled_at?: string | null
          seo_keyword?: string | null
          seo_keywords?: string[]
          status?: Database["public"]["Enums"]["post_status"]
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          article_content?: string | null
          article_title?: string | null
          caption?: string | null
          channel?: Database["public"]["Enums"]["social_channel"]
          client_id?: string
          created_at?: string
          custom_status_id?: string | null
          group_id?: string | null
          id?: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          scheduled_at?: string | null
          seo_keyword?: string | null
          seo_keywords?: string[]
          status?: Database["public"]["Enums"]["post_status"]
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_custom_status_id_fkey"
            columns: ["custom_status_id"]
            isOneToOne: false
            referencedRelation: "client_post_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: Database["public"]["Enums"]["app_action"]
          created_at: string
          feature: Database["public"]["Enums"]["app_feature"]
          id: string
          role_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["app_action"]
          created_at?: string
          feature: Database["public"]["Enums"]["app_feature"]
          id?: string
          role_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["app_action"]
          created_at?: string
          feature?: Database["public"]["Enums"]["app_feature"]
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_api_tokens: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          tenant_id?: string
          token_hash?: string
          token_prefix?: string
        }
        Relationships: []
      }
      tenant_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          plan_override: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          plan_override?: boolean
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          plan_override?: boolean
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_client_access: {
        Row: {
          client_id: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_client_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          custom_role_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      create_tenant_with_owner: {
        Args: { _full_name: string; _tenant_name: string }
        Returns: Json
      }
      get_tenant_name_for_invitation: {
        Args: { invitation_token: string }
        Returns: string
      }
      get_tenant_subscription: {
        Args: { _tenant_id: string }
        Returns: {
          current_period_end: string
          effective_status: Database["public"]["Enums"]["subscription_status"]
          features: Json
          max_active_clients: number
          max_members: number
          plan_code: string
          plan_id: string
          plan_name: string
          plan_override: boolean
          raw_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["app_action"]
          _feature: Database["public"]["Enums"]["app_feature"]
          _user_id: string
        }
        Returns: boolean
      }
      has_plan_feature: {
        Args: { _feature: string; _tenant_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_locked: { Args: { _tenant_id: string }; Returns: boolean }
      remove_team_member: { Args: { _member_id: string }; Returns: boolean }
      seed_default_roles_for_tenant: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      unaccent_safe: { Args: { _input: string }; Returns: string }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      validate_api_token: {
        Args: { _token_hash: string }
        Returns: {
          created_by: string
          tenant_id: string
        }[]
      }
      validate_invitation_token: { Args: { _token: string }; Returns: Json }
      within_plan_limit: {
        Args: { _resource: string; _tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_action: "view" | "create" | "edit" | "delete"
      app_feature: "clients" | "posts" | "post_status" | "brainstorm"
      app_role: "owner" | "member"
      brainstorm_idea_status:
        | "nova"
        | "dar_sequencia"
        | "reformular"
        | "abandonar"
        | "arquivada"
      client_status: "active" | "paused"
      comment_status: "open" | "resolved"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      post_status:
        | "draft"
        | "ai_generated"
        | "reviewed"
        | "approved"
        | "scheduled"
        | "published"
      project_type:
        | "ete"
        | "eta"
        | "osmose_reversa"
        | "ultrafiltracao"
        | "fisico_quimico"
        | "mbr"
      social_channel:
        | "instagram_feed"
        | "instagram_story"
        | "instagram_reels"
        | "tiktok"
        | "linkedin"
        | "facebook"
        | "twitter"
        | "youtube"
        | "wordpress"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "locked"
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
      app_action: ["view", "create", "edit", "delete"],
      app_feature: ["clients", "posts", "post_status", "brainstorm"],
      app_role: ["owner", "member"],
      brainstorm_idea_status: [
        "nova",
        "dar_sequencia",
        "reformular",
        "abandonar",
        "arquivada",
      ],
      client_status: ["active", "paused"],
      comment_status: ["open", "resolved"],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      post_status: [
        "draft",
        "ai_generated",
        "reviewed",
        "approved",
        "scheduled",
        "published",
      ],
      project_type: [
        "ete",
        "eta",
        "osmose_reversa",
        "ultrafiltracao",
        "fisico_quimico",
        "mbr",
      ],
      social_channel: [
        "instagram_feed",
        "instagram_story",
        "instagram_reels",
        "tiktok",
        "linkedin",
        "facebook",
        "twitter",
        "youtube",
        "wordpress",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "locked",
      ],
    },
  },
} as const
