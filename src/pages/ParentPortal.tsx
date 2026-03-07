import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MessageSquare, Users, Trophy, Send, CheckCircle, Clock, XCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";

const ParentPortal = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [tayoPoints, setTayoPoints] = useState<Record<string, number>>({});
  const [excuses, setExcuses] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [servants, setServants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Excuse form
  const [excuseChildId, setExcuseChildId] = useState("");
  const [excuseDate, setExcuseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [excuseReason, setExcuseReason] = useState("");
  const [showExcuseDialog, setShowExcuseDialog] = useState(false);

  // Message form
  const [msgReceiverId, setMsgReceiverId] = useState("");
  const [msgChildId, setMsgChildId] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgContent, setMsgContent] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Edit child form
  const [editingChild, setEditingChild] = useState<any>(null);
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (!authLoading && userRole !== "parent") {
      toast.error(t("parentPortal.parentOnly"));
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate, t]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch parent's children
      const { data: childrenData } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id);
      setChildren(childrenData || []);

      const childIds = (childrenData || []).map(c => c.id);

      if (childIds.length > 0) {
        // Fetch attendance
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("*")
          .in("child_id", childIds)
          .order("service_date", { ascending: false })
          .limit(100);
        setAttendance(attendanceData || []);

        // Fetch tayo points
        const { data: tayoData } = await supabase
          .from("tayo_transactions")
          .select("child_id, points")
          .in("child_id", childIds);
        const pointsMap: Record<string, number> = {};
        (tayoData || []).forEach(t => {
          pointsMap[t.child_id] = (pointsMap[t.child_id] || 0) + t.points;
        });
        setTayoPoints(pointsMap);

        // Fetch servants for messaging
        const servantIds = [...new Set((childrenData || []).map(c => c.servant_id).filter(Boolean))];
        if (servantIds.length > 0) {
          const { data: servantData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", servantIds);
          setServants(servantData || []);
        }
      }

      // Fetch excuses
      const { data: excuseData } = await supabase
        .from("absence_excuses")
        .select("*")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: false });
      setExcuses(excuseData || []);

      // Fetch messages
      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      setMessages(msgData || []);
    } catch (error) {
      toast.error(t("parentPortal.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "parent" && user) {
      fetchData();
    }
  }, [userRole, user]);

  // Realtime messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("parent-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.receiver_id === user.id) {
          setMessages(prev => [msg, ...prev]);
          toast.info(t("parentPortal.newMessage"));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, t]);

  const submitExcuse = async () => {
    if (!user || !excuseChildId || !excuseReason.trim()) return;
    try {
      const { error } = await supabase.from("absence_excuses").insert({
        child_id: excuseChildId,
        parent_id: user.id,
        service_date: excuseDate,
        reason: excuseReason.trim(),
      });
      if (error) throw error;
      toast.success(t("parentPortal.excuseSubmitted"));
      setShowExcuseDialog(false);
      setExcuseReason("");
      fetchData();
    } catch {
      toast.error(t("parentPortal.excuseError"));
    }
  };

  const sendMessage = async () => {
    if (!user || !msgReceiverId || !msgContent.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: msgReceiverId,
        child_id: msgChildId || null,
        subject: msgSubject.trim() || null,
        content: msgContent.trim(),
      });
      if (error) throw error;
      toast.success(t("parentPortal.messageSent"));
      setShowMessageDialog(false);
      setMsgContent("");
      setMsgSubject("");
      fetchData();
    } catch {
      toast.error(t("parentPortal.messageError"));
    }
  };

  const updateChildInfo = async () => {
    if (!editingChild) return;
    try {
      const { error } = await supabase
        .from("children")
        .update({ address: editAddress, notes: editNotes })
        .eq("id", editingChild.id);
      if (error) throw error;
      toast.success(t("parentPortal.childUpdated"));
      setEditingChild(null);
      fetchData();
    } catch {
      toast.error(t("parentPortal.updateError"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700"><Clock className="h-3 w-3 mr-1" />{t("parentPortal.statusPending")}</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-500/10 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />{t("parentPortal.statusApproved")}</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-500/10 text-red-700"><XCircle className="h-3 w-3 mr-1" />{t("parentPortal.statusRejected")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChildName = (childId: string) => children.find(c => c.id === childId)?.full_name || childId;

  return (
    <AppLayout title={t("parentPortal.title")}>
      <div className="space-y-6">
        <Tabs defaultValue="children" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="children" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("parentPortal.myChildren")}</span>
            </TabsTrigger>
            <TabsTrigger value="excuses" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("parentPortal.excuses")}</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t("parentPortal.messages")}</span>
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">{t("parentPortal.points")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Children & Attendance Tab */}
          <TabsContent value="children" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : children.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{t("parentPortal.noChildren")}</CardContent></Card>
            ) : (
              children.map(child => {
                const childAttendance = attendance.filter(a => a.child_id === child.id);
                const presentCount = childAttendance.filter(a => a.present).length;
                return (
                  <Card key={child.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{child.full_name}</CardTitle>
                          <CardDescription>{child.school_grade || t("childReport.notSpecified")}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingChild(child);
                          setEditAddress(child.address || "");
                          setEditNotes(child.notes || "");
                        }}>
                          {t("common.edit")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 rounded-lg bg-primary/5">
                          <p className="text-2xl font-bold text-primary">{childAttendance.length}</p>
                          <p className="text-xs text-muted-foreground">{t("childReport.totalSessions")}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-green-500/5">
                          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                          <p className="text-xs text-muted-foreground">{t("common.present")}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-red-500/5">
                          <p className="text-2xl font-bold text-red-600">{childAttendance.length - presentCount}</p>
                          <p className="text-xs text-muted-foreground">{t("common.absent")}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-yellow-500/5">
                          <p className="text-2xl font-bold text-yellow-600">{tayoPoints[child.id] || 0}</p>
                          <p className="text-xs text-muted-foreground">{t("tayo.points")}</p>
                        </div>
                      </div>
                      {childAttendance.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium mb-2">{t("parentPortal.recentAttendance")}</p>
                          {childAttendance.slice(0, 5).map(a => (
                            <div key={a.id} className="flex items-center justify-between text-sm py-1">
                              <span>{format(new Date(a.service_date), "yyyy-MM-dd")}</span>
                              <Badge variant={a.present ? "default" : "destructive"}>
                                {a.present ? t("common.present") : t("common.absent")}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Excuses Tab */}
          <TabsContent value="excuses" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showExcuseDialog} onOpenChange={setShowExcuseDialog}>
                <DialogTrigger asChild>
                  <Button><FileText className="h-4 w-4 mr-2" />{t("parentPortal.submitExcuse")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("parentPortal.submitExcuse")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={excuseChildId} onValueChange={setExcuseChildId}>
                      <SelectTrigger><SelectValue placeholder={t("parentPortal.selectChild")} /></SelectTrigger>
                      <SelectContent>
                        {children.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={excuseDate} onChange={e => setExcuseDate(e.target.value)} />
                    <Textarea
                      placeholder={t("parentPortal.excuseReasonPlaceholder")}
                      value={excuseReason}
                      onChange={e => setExcuseReason(e.target.value)}
                    />
                    <Button onClick={submitExcuse} disabled={!excuseChildId || !excuseReason.trim()} className="w-full">
                      {t("common.save")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {excuses.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{t("parentPortal.noExcuses")}</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {excuses.map(excuse => (
                  <Card key={excuse.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{getChildName(excuse.child_id)}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(excuse.service_date), "yyyy-MM-dd")}</p>
                          <p className="text-sm mt-1">{excuse.reason}</p>
                        </div>
                        {getStatusBadge(excuse.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
                <DialogTrigger asChild>
                  <Button><Send className="h-4 w-4 mr-2" />{t("parentPortal.sendMessage")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("parentPortal.sendMessage")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={msgReceiverId} onValueChange={setMsgReceiverId}>
                      <SelectTrigger><SelectValue placeholder={t("parentPortal.selectServant")} /></SelectTrigger>
                      <SelectContent>
                        {servants.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={msgChildId} onValueChange={setMsgChildId}>
                      <SelectTrigger><SelectValue placeholder={t("parentPortal.regardingChild")} /></SelectTrigger>
                      <SelectContent>
                        {children.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder={t("parentPortal.subject")} value={msgSubject} onChange={e => setMsgSubject(e.target.value)} />
                    <Textarea
                      placeholder={t("parentPortal.messagePlaceholder")}
                      value={msgContent}
                      onChange={e => setMsgContent(e.target.value)}
                    />
                    <Button onClick={sendMessage} disabled={!msgReceiverId || !msgContent.trim()} className="w-full">
                      <Send className="h-4 w-4 mr-2" />{t("parentPortal.send")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {messages.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{t("parentPortal.noMessages")}</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <Card key={msg.id} className={!msg.is_read && msg.receiver_id === user?.id ? "border-primary/30 bg-primary/5" : ""}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {msg.subject && <p className="font-medium">{msg.subject}</p>}
                          <p className="text-sm mt-1">{msg.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {msg.sender_id === user?.id ? t("parentPortal.sent") : t("parentPortal.received")} • {format(new Date(msg.created_at), "yyyy-MM-dd HH:mm")}
                          </p>
                        </div>
                        {!msg.is_read && msg.receiver_id === user?.id && (
                          <Badge className="bg-primary text-primary-foreground">{t("parentPortal.unread")}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Points Tab */}
          <TabsContent value="points" className="space-y-4">
            {children.map(child => (
              <Card key={child.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{child.full_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="text-2xl font-bold">{tayoPoints[child.id] || 0}</span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Edit Child Dialog */}
        <Dialog open={!!editingChild} onOpenChange={(open) => !open && setEditingChild(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("parentPortal.updateChildInfo")} - {editingChild?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("children.address")}</label>
                <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">{t("common.notes")}</label>
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
              <Button onClick={updateChildInfo} className="w-full">{t("common.save")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ParentPortal;
