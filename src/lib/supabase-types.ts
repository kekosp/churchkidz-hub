// Temporary type definitions until Supabase types regenerate
export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'servant' | 'parent';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'admin' | 'servant' | 'parent';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'admin' | 'servant' | 'parent';
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone_number: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone_number?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone_number?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          full_name: string;
          date_of_birth: string;
          age: number;
          address: string | null;
          parent_id: string | null;
          parent_name: string;
          parent_phone: string;
          school_grade: string | null;
          servant_id: string | null;
          attendance_status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          date_of_birth: string;
          address?: string | null;
          parent_id?: string | null;
          parent_name: string;
          parent_phone: string;
          school_grade?: string | null;
          servant_id?: string | null;
          attendance_status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          date_of_birth?: string;
          address?: string | null;
          parent_id?: string | null;
          parent_name?: string;
          parent_phone?: string;
          school_grade?: string | null;
          servant_id?: string | null;
          attendance_status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          child_id: string;
          service_date: string;
          present: boolean;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          service_date: string;
          present?: boolean;
          notes?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          service_date?: string;
          present?: boolean;
          notes?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}