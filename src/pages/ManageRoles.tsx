import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Shield } from "lucide-react";
import { Database } from "@/lib/supabase-types";

type UserRole = Database['public']['Tables']['user_roles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserWithRole {
  id: string;
  full_name: string;
  email: string | null;
  role: 'admin' | 'servant' | 'parent' | null;
}

const ManageRoles = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user && userRole === "admin") {
      fetchUsers();
    } else if (user && userRole !== "admin") {
      toast.error("Only administrators can manage roles");
      navigate("/dashboard");
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*") as { data: Profile[] | null; error: any };

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*") as { data: UserRole[] | null; error: any };

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = (roles || []).find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: userRole?.role || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Failed to load users");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'servant' | 'parent' | 'none') => {
    try {
      if (newRole === 'none') {
        // Delete the role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId) as any;

        if (error) throw error;
        toast.success("Role removed successfully");
      } else {
        // Upsert the role
        const { error } = await supabase
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: newRole,
          }, {
            onConflict: "user_id,role"
          }) as any;

        if (error) throw error;
        toast.success("Role updated successfully");
      }

      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to update role");
      console.error("Error:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Manage User Roles</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>
              Assign roles to users to control their access level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg bg-muted p-4">
              <h3 className="font-semibold mb-2">Role Descriptions:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><strong>Admin:</strong> Full access to all features</li>
                <li><strong>Servant:</strong> Can manage assigned children and record attendance</li>
                <li><strong>Parent:</strong> Can view their child's information and attendance</li>
              </ul>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email || "-"}</TableCell>
                      <TableCell>
                        {u.role ? (
                          <Badge
                            variant={
                              u.role === "admin"
                                ? "default"
                                : u.role === "servant"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {u.role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No role</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role || "none"}
                          onValueChange={(value) =>
                            handleRoleChange(u.id, value as 'admin' | 'servant' | 'parent' | 'none')
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Role</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="servant">Servant</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Manual Setup (Alternative Method)</CardTitle>
            <CardDescription>
              If you need to manually set roles via the backend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Open your Lovable Cloud backend</p>
            <p>2. Navigate to the <code className="bg-muted px-1 py-0.5 rounded">user_roles</code> table</p>
            <p>3. Click "Insert row" and add:</p>
            <ul className="ml-6 space-y-1 list-disc">
              <li><strong>user_id:</strong> The user's ID from the profiles table</li>
              <li><strong>role:</strong> Select admin, servant, or parent</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageRoles;