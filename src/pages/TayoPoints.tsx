import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Plus, Minus, Trophy, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout";

interface Child {
  id: string;
  full_name: string;
  parent_name: string;
  servant_id: string | null;
}

interface TayoTransaction {
  id: string;
  child_id: string;
  points: number;
  reason: string | null;
  recorded_by: string;
  created_at: string;
}

interface ChildWithPoints extends Child {
  totalPoints: number;
}

const TayoPoints = () => {
  const { user, userRole } = useAuth();
  const { t, isRTL } = useLanguage();
  const [children, setChildren] = useState<ChildWithPoints[]>([]);
  const [transactions, setTransactions] = useState<TayoTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChild, setSelectedChild] = useState<ChildWithPoints | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChildrenWithPoints();
    }
  }, [user, userRole]);

  const fetchChildrenWithPoints = async () => {
    try {
      setIsLoading(true);
      
      let childrenQuery = supabase.from("children_safe_view" as any).select("id, full_name, parent_name, servant_id") as any;
      
      if (userRole === "parent") {
        childrenQuery = childrenQuery.eq("parent_id", user?.id);
      } else if (userRole === "servant") {
        childrenQuery = childrenQuery.eq("servant_id", user?.id);
      }
      
      const { data: childrenData, error: childrenError } = await childrenQuery;
      
      if (childrenError) throw childrenError;

      const childIds = childrenData?.map((c: any) => c.id) || [];
      if (childIds.length === 0) {
        setChildren([]);
        setIsLoading(false);
        return;
      }

      const { data: transactionsData, error: transactionsError } = await supabase
        .from("tayo_transactions")
        .select("*")
        .in("child_id", childIds)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;

      setTransactions(transactionsData || []);

      const childrenWithPoints = (childrenData || []).map((child: any) => {
        const childTransactions = (transactionsData || []).filter((t: any) => t.child_id === child.id);
        const totalPoints = childTransactions.reduce((sum: number, t: any) => sum + t.points, 0);
        return { ...child, totalPoints };
      });

      childrenWithPoints.sort((a: ChildWithPoints, b: ChildWithPoints) => b.totalPoints - a.totalPoints);
      setChildren(childrenWithPoints);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching children with points:", error);
      }
      toast.error(t('tayo.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPoints = async () => {
    if (!selectedChild || !user) return;
    
    const points = isAdding ? Math.abs(pointsToAdd) : -Math.abs(pointsToAdd);
    
    try {
      const { error } = await supabase.from("tayo_transactions").insert({
        child_id: selectedChild.id,
        points: points,
        reason: reason || null,
        recorded_by: user.id,
      });

      if (error) throw error;

      toast.success(isAdding ? t('tayo.addSuccess') : t('tayo.deductSuccess'));
      setDialogOpen(false);
      setSelectedChild(null);
      setPointsToAdd(1);
      setReason("");
      fetchChildrenWithPoints();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding points:", error);
      }
      toast.error(t('tayo.saveError'));
    }
  };

  const openPointsDialog = (child: ChildWithPoints, adding: boolean) => {
    setSelectedChild(child);
    setIsAdding(adding);
    setPointsToAdd(1);
    setReason("");
    setDialogOpen(true);
  };

  const filteredChildren = children.filter(child =>
    child.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManagePoints = userRole === "admin" || userRole === "servant";

  const getChildTransactions = (childId: string) => {
    return transactions.filter(t => t.child_id === childId).slice(0, 5);
  };

  return (
    <AppLayout title={t('tayo.title')}>
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className={`absolute top-3 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isRTL ? 'pr-10' : 'pl-10'}
          />
        </div>
      </div>

      {/* Leaderboard */}
      {children.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {t('tayo.leaderboard')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {children.slice(0, 3).map((child, index) => (
                <div
                  key={child.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-500/20' :
                    index === 1 ? 'bg-gray-400/20' :
                    'bg-orange-600/20'
                  }`}
                >
                  <span className="text-2xl font-bold">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                  <div>
                    <p className="font-medium">{child.full_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {child.totalPoints} {t('tayo.points')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children List */}
      {filteredChildren.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('children.noChildren')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChildren.map((child) => (
            <Card key={child.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{child.full_name}</CardTitle>
                    <CardDescription>{child.parent_name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">
                      {child.totalPoints}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Recent Transactions */}
                <div className="mb-4 space-y-1">
                  {getChildTransactions(child.id).length > 0 ? (
                    getChildTransactions(child.id).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[150px]">
                          {tx.reason || t('tayo.noReason')}
                        </span>
                        <span className={tx.points > 0 ? 'text-green-600' : 'text-red-600'}>
                          {tx.points > 0 ? '+' : ''}{tx.points}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('tayo.noTransactions')}</p>
                  )}
                </div>

                {/* Action Buttons */}
                {canManagePoints && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => openPointsDialog(child, true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('tayo.add')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => openPointsDialog(child, false)}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      {t('tayo.deduct')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Deduct Points Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAdding ? t('tayo.addPoints') : t('tayo.deductPoints')} - {selectedChild?.full_name}
            </DialogTitle>
            <DialogDescription>
              {isAdding ? t('tayo.addPointsDesc') : t('tayo.deductPointsDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="points">{t('tayo.pointsAmount')}</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={pointsToAdd}
                onChange={(e) => setPointsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="reason">{t('tayo.reason')}</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('tayo.reasonPlaceholder')}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleAddPoints}
                className={isAdding ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {isAdding ? t('tayo.add') : t('tayo.deduct')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TayoPoints;
