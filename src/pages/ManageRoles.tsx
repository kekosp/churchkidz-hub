import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Key } from "lucide-react";
import { Database } from "@/lib/supabase-types";
import { useLanguage } from "@/contexts/LanguageContext";
import { passwordValidation } from "@/lib/validation-schemas";
import { AppLayout } from "@/components/layout";
import ChildLinkingCard from "@/components/manage-roles/ChildLinkingCard";

type UserRole = Database['public']['Tables']['user_roles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserWithRole {
  id: string;
  full_name: string;
  email: string | null;
  role: 'admin' | 'servant' | 'parent' | 'child' | null;
}

const ManageRoles = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (authLoading || userRole === null) return;
    
    if (userRole === "admin") {
      fetchUsers();
    } else {
      toast.error(t('manageRoles.adminOnly'));
      navigate("/dashboard");
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*") as { data: Profile[] | null; error: any };

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*") as { data: UserRole[] | null; error: any };

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRoleData = (roles || []).find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: userRoleData?.role || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error loading users:", error);
      }
      toast.error(t('manageRoles.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'servant' | 'parent' | 'child' | 'none') => {
    try {
      if (newRole === 'none') {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId) as any;

        if (error) throw error;
        toast.success(t('manageRoles.roleRemoved'));
      } else {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole,
          }) as any;

        if (error) throw error;
        toast.success(t('manageRoles.roleUpdated'));
      }

      fetchUsers();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error updating role:", error);
      }
      toast.error(t('manageRoles.updateError'));
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t('roles.admin');
      case 'servant': return t('roles.servant');
      case 'parent': return t('roles.parent');
      case 'child': return t('roles.child');
      default: return role;
    }
  };

  const openPasswordDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    const validation = passwordValidation.safeParse(newPassword);
    if (!validation.success) {
      const errorMessage = validation.error.errors.map(e => e.message).join(". ");
      toast.error(errorMessage);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('manageRoles.passwordMismatch'));
      return;
    }

    try {
      setResettingPassword(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: selectedUser.id, newPassword },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to reset password');
      }

      toast.success(t('manageRoles.passwordResetSuccess'));
      setPasswordDialogOpen(false);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error resetting password:", error);
      }
      toast.error(t('manageRoles.passwordResetError'));
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <AppLayout title={t('manageRoles.title')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('roles.title')}</CardTitle>
          <CardDescription>{t('manageRoles.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg bg-muted p-4">
            <h3 className="font-semibold mb-2">{t('manageRoles.roleDescriptions')}</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
             <li><strong>{t('roles.admin')}:</strong> {t('manageRoles.adminDesc')}</li>
              <li><strong>{t('roles.servant')}:</strong> {t('manageRoles.servantDesc')}</li>
              <li><strong>{t('roles.parent')}:</strong> {t('manageRoles.parentDesc')}</li>
              <li><strong>{t('roles.child')}:</strong> {t('manageRoles.childDesc')}</li>
            </ul>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('manageRoles.currentRole')}</TableHead>
                <TableHead>{t('manageRoles.changeRole')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('manageRoles.noUsers')}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell dir="ltr">{u.email || "-"}</TableCell>
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
                          {getRoleLabel(u.role)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">{t('manageRoles.noRole')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role || "none"}
                        onValueChange={(value) =>
                          handleRoleChange(u.id, value as 'admin' | 'servant' | 'parent' | 'child' | 'none')
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('roles.none')}</SelectItem>
                          <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                          <SelectItem value="servant">{t('roles.servant')}</SelectItem>
                          <SelectItem value="parent">{t('roles.parent')}</SelectItem>
                          <SelectItem value="child">{t('roles.child')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPasswordDialog(u)}
                        className="gap-2"
                      >
                        <Key className="h-4 w-4" />
                        {t('manageRoles.resetPassword')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ChildLinkingCard />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('manageRoles.manualSetup')}</CardTitle>
          <CardDescription>{t('manageRoles.manualSetupDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Open your Lovable Cloud backend</p>
          <p>2. Navigate to the <code className="bg-muted px-1 py-0.5 rounded">user_roles</code> table</p>
          <p>3. Click "Insert row" and add:</p>
          <ul className={`space-y-1 list-disc ${isRTL ? 'mr-6' : 'ml-6'}`}>
            <li><strong>user_id:</strong> The user's ID from the profiles table</li>
            <li><strong>role:</strong> Select admin, servant, or parent</li>
          </ul>
        </CardContent>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('manageRoles.resetPasswordTitle')}</DialogTitle>
            <DialogDescription>
              {t('manageRoles.resetPasswordDesc')} {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('manageRoles.newPassword')}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('manageRoles.newPasswordPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('manageRoles.confirmPassword')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('manageRoles.confirmPasswordPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? t('common.saving') : t('manageRoles.resetPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ManageRoles;
