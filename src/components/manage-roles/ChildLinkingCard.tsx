import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link, Unlink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChildRecord {
  id: string;
  full_name: string;
  child_user_id: string | null;
}

interface ChildUser {
  id: string;
  full_name: string;
  email: string | null;
}

const ChildLinkingCard = () => {
  const { t } = useLanguage();
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [childUsers, setChildUsers] = useState<ChildUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [childrenRes, rolesRes, profilesRes] = await Promise.all([
        supabase.from("children").select("id, full_name, child_user_id"),
        supabase.from("user_roles").select("user_id").eq("role", "child"),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      if (childrenRes.error) throw childrenRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setChildren(childrenRes.data || []);

      // Filter profiles to only those with child role
      const childUserIds = new Set((rolesRes.data || []).map((r) => r.user_id));
      const childProfiles = (profilesRes.data || []).filter((p) => childUserIds.has(p.id));
      setChildUsers(childProfiles);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Error loading child linking data:", error);
      toast.error(t('manageRoles.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (childId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("children")
        .update({ child_user_id: userId })
        .eq("id", childId);

      if (error) throw error;
      toast.success(t('manageRoles.childLinked'));
      setSelectedLinks((prev) => ({ ...prev, [childId]: "" }));
      fetchData();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Error linking child:", error);
      toast.error(t('manageRoles.childLinkError'));
    }
  };

  const handleUnlink = async (childId: string) => {
    try {
      const { error } = await supabase
        .from("children")
        .update({ child_user_id: null })
        .eq("id", childId);

      if (error) throw error;
      toast.success(t('manageRoles.childUnlinked'));
      fetchData();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Error unlinking child:", error);
      toast.error(t('manageRoles.childUnlinkError'));
    }
  };

  const getLinkedUserName = (childUserId: string | null) => {
    if (!childUserId) return null;
    const user = childUsers.find((u) => u.id === childUserId);
    return user ? `${user.full_name} (${user.email || "-"})` : childUserId;
  };

  // Users not yet linked to any child
  const availableUsers = childUsers.filter(
    (u) => !children.some((c) => c.child_user_id === u.id)
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('manageRoles.childLinkingTitle')}</CardTitle>
        <CardDescription>{t('manageRoles.childLinkingDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('manageRoles.childRecord')}</TableHead>
                <TableHead>{t('manageRoles.linkedAccount')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {children.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                children.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.full_name}</TableCell>
                    <TableCell>
                      {child.child_user_id ? (
                        <Badge variant="secondary">
                          {getLinkedUserName(child.child_user_id)}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedLinks[child.id] || ""}
                            onValueChange={(value) =>
                              setSelectedLinks((prev) => ({ ...prev, [child.id]: value }))
                            }
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder={t('manageRoles.selectChildUser')} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.length === 0 ? (
                                <SelectItem value="__none" disabled>
                                  {t('manageRoles.noChildUsers')}
                                </SelectItem>
                              ) : (
                                availableUsers.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.full_name} ({u.email || "-"})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!selectedLinks[child.id]}
                            onClick={() => handleLink(child.id, selectedLinks[child.id])}
                            className="gap-1"
                          >
                            <Link className="h-4 w-4" />
                            {t('manageRoles.linkAction')}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {child.child_user_id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleUnlink(child.id)}
                          className="gap-1"
                        >
                          <Unlink className="h-4 w-4" />
                          {t('manageRoles.unlinkAction')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ChildLinkingCard;
