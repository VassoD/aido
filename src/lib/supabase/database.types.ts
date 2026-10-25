// Generated from the Supabase schema (project "aido"). Regenerate after migrations; do not edit by hand.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      application_messages: {
        Row: {
          application_id: string;
          body: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          application_id: string;
          body: string;
          created_at?: string;
          id?: string;
          sender_id: string;
        };
        Update: {
          application_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_messages_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          answers: Json;
          completed_at: string | null;
          created_at: string;
          fit_summary: string | null;
          id: string;
          mission_id: string;
          motivation: string | null;
          status: string;
          updated_at: string;
          volunteer_id: string;
        };
        Insert: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          fit_summary?: string | null;
          id?: string;
          mission_id: string;
          motivation?: string | null;
          status?: string;
          updated_at?: string;
          volunteer_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          fit_summary?: string | null;
          id?: string;
          mission_id?: string;
          motivation?: string | null;
          status?: string;
          updated_at?: string;
          volunteer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      missions: {
        Row: {
          admin_area_code: string | null;
          cause: string;
          city: string | null;
          commitment: string;
          country_code: string;
          created_at: string;
          deleted_at: string | null;
          description: string;
          end_date: string | null;
          id: string;
          lat: number | null;
          location_mode: string;
          lon: number | null;
          organization_id: string;
          places: number | null;
          postal_code: string | null;
          published_at: string | null;
          questions: Json;
          schedule_text: string | null;
          skills: string[];
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          admin_area_code?: string | null;
          cause?: string;
          city?: string | null;
          commitment?: string;
          country_code?: string;
          created_at?: string;
          deleted_at?: string | null;
          description: string;
          end_date?: string | null;
          id?: string;
          lat?: number | null;
          location_mode?: string;
          lon?: number | null;
          organization_id: string;
          places?: number | null;
          postal_code?: string | null;
          published_at?: string | null;
          questions?: Json;
          schedule_text?: string | null;
          skills?: string[];
          start_date?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          admin_area_code?: string | null;
          cause?: string;
          city?: string | null;
          commitment?: string;
          country_code?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          end_date?: string | null;
          id?: string;
          lat?: number | null;
          location_mode?: string;
          lon?: number | null;
          organization_id?: string;
          places?: number | null;
          postal_code?: string | null;
          published_at?: string | null;
          questions?: Json;
          schedule_text?: string | null;
          skills?: string[];
          start_date?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "missions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          city: string | null;
          contact_email: string | null;
          country_code: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          national_id: string;
          national_id_type: string;
          owner_id: string;
          postal_code: string | null;
          updated_at: string;
          verified: boolean;
          verified_at: string | null;
          website: string | null;
        };
        Insert: {
          city?: string | null;
          contact_email?: string | null;
          country_code?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          national_id: string;
          national_id_type: string;
          owner_id: string;
          postal_code?: string | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
          website?: string | null;
        };
        Update: {
          city?: string | null;
          contact_email?: string | null;
          country_code?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          national_id?: string;
          national_id_type?: string;
          owner_id?: string;
          postal_code?: string | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      volunteer_profiles: {
        Row: {
          about: string | null;
          causes: string[];
          city: string | null;
          contact_email: string | null;
          created_at: string;
          first_name: string | null;
          interests: string[];
          linkedin_url: string | null;
          phone: string | null;
          skills: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          about?: string | null;
          causes?: string[];
          city?: string | null;
          contact_email?: string | null;
          created_at?: string;
          first_name?: string | null;
          interests?: string[];
          linkedin_url?: string | null;
          phone?: string | null;
          skills?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          about?: string | null;
          causes?: string[];
          city?: string | null;
          contact_email?: string | null;
          created_at?: string;
          first_name?: string | null;
          interests?: string[];
          linkedin_url?: string | null;
          phone?: string | null;
          skills?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<TableName extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][TableName]["Row"];
export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][TableName]["Insert"];
export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][TableName]["Update"];
