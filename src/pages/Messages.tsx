import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Inbox, Send, Mail, Reply, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Messages = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);

  // Compose form
  const [receiverId, setReceiverId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipients, setRecipients] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && userRole !== "admin" && userRole !== "servant") {
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      setMessages(data || []);

      // Collect unique user IDs to fetch names
      const userIds = new Set<string>();
      (data || []).forEach((m: any) => {
        userIds.add(m.sender_id);
        userIds.add(m.receiver_id);
      });
      if (userIds.size > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(userIds));
        const map: Record<string, string> = {};
        (profileData || []).forEach((p: any) => { map[p.id] = p.full_name; });
        setProfiles(map);
      }
    } catch {
      toast.error(t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    if (!user) return;
    try {
      // Fetch all profiles the user can see (RLS handles visibility)
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("id", user.id);
      setRecipients(data || []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if ((userRole === "admin" || userRole === "servant") && user) {
      fetchMessages();
      fetchRecipients();
    }
  }, [userRole, user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("staff-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.receiver_id === user.id || msg.sender_id === user.id) {
          setMessages(prev => [msg, ...prev.filter(m => m.id !== msg.id)]);
          if (msg.receiver_id === user.id) {
            toast.info(t("messages.newMessage"));
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, t]);

  const sendMessage = async () => {
    const targetId = replyTo ? (replyTo.sender_id === user?.id ? replyTo.receiver_id : replyTo.sender_id) : receiverId;
    if (!user || !targetId || !content.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: targetId,
        subject: subject.trim() || (replyTo?.subject ? `Re: ${replyTo.subject}` : null),
        content: content.trim(),
      });
      if (error) throw error;
      toast.success(t("messages.messageSent"));
      setShowCompose(false);
      setReplyTo(null);
      setContent("");
      setSubject("");
      setReceiverId("");
      fetchMessages();
    } catch {
      toast.error(t("messages.messageError"));
    }
  };

  const markAsRead = async (msgId: string) => {
    await supabase.from("messages").update({ is_read: true }).eq("id", msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
  };

  const inboxMessages = messages.filter(m => m.receiver_id === user?.id);
  const sentMessages = messages.filter(m => m.sender_id === user?.id);
  const unreadCount = inboxMessages.filter(m => !m.is_read).length;

  const getName = (id: string) => profiles[id] || id.slice(0, 8);

  const renderMessage = (msg: any, type: "inbox" | "sent") => (
    <Card
      key={msg.id}
      className={!msg.is_read && type === "inbox" ? "border-primary/30 bg-primary/5" : ""}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {type === "inbox" ? `${t("messages.from")}: ${getName(msg.sender_id)}` : `${t("messages.to")}: ${getName(msg.receiver_id)}`}
              </span>
              {!msg.is_read && type === "inbox" && (
                <Badge className="bg-primary text-primary-foreground text-[10px]">{t("parentPortal.unread")}</Badge>
              )}
            </div>
            {msg.subject && <p className="text-sm font-medium text-foreground">{msg.subject}</p>}
            <p className="text-sm text-muted-foreground mt-1">{msg.content}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              {format(new Date(msg.created_at), "yyyy-MM-dd HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {type === "inbox" && !msg.is_read && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markAsRead(msg.id)} title={t("messages.markRead")}>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
            )}
            {type === "inbox" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setReplyTo(msg);
                  setContent("");
                  setSubject("");
                }}
                title={t("messages.reply")}
              >
                <Reply className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title={t("messages.title")}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={showCompose} onOpenChange={setShowCompose}>
            <DialogTrigger asChild>
              <Button><Mail className="h-4 w-4 mr-2" />{t("messages.compose")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("messages.compose")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={receiverId} onValueChange={setReceiverId}>
                  <SelectTrigger><SelectValue placeholder={t("messages.selectRecipient")} /></SelectTrigger>
                  <SelectContent>
                    {recipients.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.full_name} ({r.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder={t("parentPortal.subject")} value={subject} onChange={e => setSubject(e.target.value)} />
                <Textarea
                  placeholder={t("parentPortal.messagePlaceholder")}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                />
                <Button onClick={sendMessage} disabled={!receiverId || !content.trim()} className="w-full">
                  <Send className="h-4 w-4 mr-2" />{t("parentPortal.send")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reply Dialog */}
        <Dialog open={!!replyTo} onOpenChange={(open) => !open && setReplyTo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("messages.reply")} - {getName(replyTo?.sender_id === user?.id ? replyTo?.receiver_id : replyTo?.sender_id)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {replyTo?.subject && (
                <p className="text-sm text-muted-foreground">{t("parentPortal.subject")}: {replyTo.subject}</p>
              )}
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">{t("messages.originalMessage")}:</p>
                <p>{replyTo?.content}</p>
              </div>
              <Textarea
                placeholder={t("parentPortal.messagePlaceholder")}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                autoFocus
              />
              <Button onClick={sendMessage} disabled={!content.trim()} className="w-full">
                <Reply className="h-4 w-4 mr-2" />{t("messages.reply")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              {t("messages.inbox")}
              {unreadCount > 0 && (
                <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-destructive text-destructive-foreground rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {t("messages.sentTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : inboxMessages.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{t("messages.noInbox")}</CardContent></Card>
            ) : (
              inboxMessages.map(msg => renderMessage(msg, "inbox"))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : sentMessages.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{t("messages.noSent")}</CardContent></Card>
            ) : (
              sentMessages.map(msg => renderMessage(msg, "sent"))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Messages;
