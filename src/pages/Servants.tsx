import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const Servants = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [servants, setServants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    // Wait for userRole to load before checking access
    if (!authLoading && user && userRole === null) {
      return; // Still loading role
    }
    if (user && (userRole === "admin" || userRole === "servant")) {
      fetchServants();
    } else if (user && userRole !== "admin" && userRole !== "servant") {
      navigate("/dashboard");
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchServants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles(full_name, phone_number, email)")
        .eq("role", "servant") as any;

      if (error) throw error;
      setServants(data || []);
    } catch (error: any) {
      toast.error("Failed to load servants");
      console.error("Error:", error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold">Servants Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Servants</CardTitle>
            <CardDescription>
              {servants.length} {servants.length === 1 ? "servant" : "servants"} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No servants found
                    </TableCell>
                  </TableRow>
                ) : (
                  servants.map((servant) => (
                    <TableRow key={servant.user_id}>
                      <TableCell className="font-medium">{servant.profiles?.full_name}</TableCell>
                      <TableCell>{servant.profiles?.email}</TableCell>
                      <TableCell>{servant.profiles?.phone_number || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Servants;