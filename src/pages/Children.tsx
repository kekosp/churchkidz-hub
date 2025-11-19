import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { childSchema } from "@/lib/validation-schemas";

interface Child {
  id: string;
  full_name: string;
  date_of_birth: string;
  age: number;
  address: string;
  parent_name: string;
  parent_phone: string;
  school_grade: string;
  attendance_status: string;
  notes: string;
  servant_id: string | null;
}

const Children = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [servants, setServants] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    address: "",
    parent_name: "",
    parent_phone: "",
    school_grade: "",
    attendance_status: "Regular",
    notes: "",
    servant_id: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchChildren();
      fetchServants();
    }
  }, [user, authLoading, navigate]);

  const fetchServants = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles(id, full_name)")
        .eq("role", "servant") as any;

      if (error) throw error;
      setServants(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error fetching servants:", error);
      }
    }
  };

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .order("full_name") as any;

      if (error) throw error;
      setChildren(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error loading children:", error);
      }
      toast.error("Unable to load children. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input
      const validation = childSchema.safeParse(formData);

      if (!validation.success) {
        const errors = validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        toast.error(errors);
        return;
      }

      // Convert empty servant_id to null and set parent_id for parent users
      const dataToSubmit: any = {
        ...formData,
        servant_id: formData.servant_id || null,
      };

      // Automatically set parent_id for parent-role users when creating
      if (!editingChild && userRole === "parent" && user) {
        dataToSubmit.parent_id = user.id;
      }

      if (editingChild) {
        const { error } = await supabase
          .from("children")
          .update(dataToSubmit)
          .eq("id", editingChild.id) as any;

        if (error) throw error;
        toast.success("Child updated successfully");
      } else {
        const { error } = await supabase
          .from("children")
          .insert([dataToSubmit]) as any;

        if (error) throw error;
        toast.success("Child added successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchChildren();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error saving child:", error);
      }
      toast.error("Unable to save child information. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this child?")) return;

    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", id) as any;

      if (error) throw error;
      toast.success("Child deleted successfully");
      fetchChildren();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error deleting child:", error);
      }
      toast.error("Unable to delete child. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      date_of_birth: "",
      address: "",
      parent_name: "",
      parent_phone: "",
      school_grade: "",
      attendance_status: "Regular",
      notes: "",
      servant_id: "",
    });
    setEditingChild(null);
  };

  const openEditDialog = (child: Child) => {
    setEditingChild(child);
    setFormData({
      full_name: child.full_name,
      date_of_birth: child.date_of_birth,
      address: child.address || "",
      parent_name: child.parent_name,
      parent_phone: child.parent_phone,
      school_grade: child.school_grade || "",
      attendance_status: child.attendance_status,
      notes: child.notes || "",
      servant_id: child.servant_id || "",
    });
    setIsDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const canEdit = userRole === "admin" || userRole === "servant";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Children Management</h1>
          </div>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Child
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingChild ? "Edit Child" : "Add New Child"}</DialogTitle>
                  <DialogDescription>Enter the child's information below</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth *</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_name">Parent/Guardian Name *</Label>
                      <Input
                        id="parent_name"
                        value={formData.parent_name}
                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_phone">Parent Phone *</Label>
                      <Input
                        id="parent_phone"
                        type="tel"
                        value={formData.parent_phone}
                        onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="school_grade">School Grade</Label>
                      <Input
                        id="school_grade"
                        value={formData.school_grade}
                        onChange={(e) => setFormData({ ...formData, school_grade: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attendance_status">Attendance Status</Label>
                      <Select
                        value={formData.attendance_status}
                        onValueChange={(value) => setFormData({ ...formData, attendance_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Irregular">Irregular</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {userRole === "admin" && (
                    <div className="space-y-2">
                      <Label htmlFor="servant_id">Assigned Servant/Teacher</Label>
                      <Select
                        value={formData.servant_id || "unassigned"}
                        onValueChange={(value) => setFormData({ ...formData, servant_id: value === "unassigned" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a servant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">None</SelectItem>
                          {servants.map((servant: any) => (
                            <SelectItem key={servant.user_id} value={servant.user_id}>
                              {servant.profiles?.full_name || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingChild ? "Update" : "Add"} Child
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Children</CardTitle>
            <CardDescription>
              {children.length} {children.length === 1 ? "child" : "children"} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground">
                        No children found
                      </TableCell>
                    </TableRow>
                  ) : (
                    children.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell className="font-medium">{child.full_name}</TableCell>
                        <TableCell>{child.age}</TableCell>
                        <TableCell>{child.parent_name}</TableCell>
                        <TableCell>{child.parent_phone}</TableCell>
                        <TableCell>{child.school_grade || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              child.attendance_status === "Regular"
                                ? "default"
                                : child.attendance_status === "Irregular"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {child.attendance_status}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(child)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {userRole === "admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(child.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Children;