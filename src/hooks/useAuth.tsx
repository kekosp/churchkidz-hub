import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserRole {
  role: "admin" | "servant" | "parent";
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole["role"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("🔍 Fetching role for user:", userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      console.log("📦 Role query result:", { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log("ℹ️ No role found for user");
          setUserRole(null);
        } else {
          console.error("❌ Error fetching user role:", error);
          setUserRole(null);
        }
      } else if (data) {
        console.log("✅ Setting userRole to:", data.role);
        setUserRole(data.role as "admin" | "servant" | "parent");
      } else {
        console.log("⚠️ No data returned");
        setUserRole(null);
      }
    } catch (error) {
      console.error("💥 Exception in fetchUserRole:", error);
      setUserRole(null);
    } finally {
      console.log("🏁 Finished fetching role, setting loading to false");
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, userRole, loading, signOut };
};