import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";

const Messages = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

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

  // Group messages into conversations by the other user
  const conversations = useMemo(() => {
    if (!user) return [];
    const convMap: Record<string, { otherId: string; msgs: any[] }> = {};
    messages.forEach((m) => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap[otherId]) convMap[otherId] = { otherId, msgs: [] };
      convMap[otherId].msgs.push(m);
    });

    return Object.values(convMap)
      .map((c) => {
        const latest = c.msgs[0]; // already sorted desc
        const unreadCount = c.msgs.filter(m => m.receiver_id === user.id && !m.is_read).length;
        return {
          oderId: c.otherId,
          name: profiles[c.otherId] || c.otherId.slice(0, 8),
          lastMessage: latest.content,
          lastDate: latest.created_at,
          unreadCount,
        };
      })
      .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [messages, user, profiles]);

  // Get messages for selected conversation
  const chatMessages = useMemo(() => {
    if (!user || !selectedConversation) return [];
    return messages.filter(
      (m) =>
        (m.sender_id === user.id && m.receiver_id === selectedConversation) ||
        (m.receiver_id === user.id && m.sender_id === selectedConversation)
    );
  }, [messages, user, selectedConversation]);

  // Mark unread messages as read when opening a conversation
  useEffect(() => {
    if (!user || !selectedConversation) return;
    const unread = chatMessages.filter(m => m.receiver_id === user.id && !m.is_read);
    if (unread.length > 0) {
      const ids = unread.map(m => m.id);
      supabase.from("messages").update({ is_read: true }).in("id", ids).then(() => {
        setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true } : m));
      });
    }
  }, [selectedConversation, chatMessages, user]);

  const sendComposeMessage = async () => {
    if (!user || !receiverId || !content.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        subject: subject.trim() || null,
        content: content.trim(),
      });
      if (error) throw error;
      toast.success(t("messages.messageSent"));
      setShowCompose(false);
      setContent("");
      setSubject("");
      setSelectedConversation(receiverId);
      setReceiverId("");
      fetchMessages();
    } catch {
      toast.error(t("messages.messageError"));
    }
  };

  const sendChatMessage = useCallback(async (text: string) => {
    if (!user || !selectedConversation) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedConversation,
      content: text,
    });
    if (error) {
      toast.error(t("messages.messageError"));
      throw error;
    }
    fetchMessages();
  }, [user, selectedConversation, t]);

  const getName = (id: string | undefined) => id ? (profiles[id] || id.slice(0, 8)) : "";

  const showChat = !!selectedConversation;

  return (
    <AppLayout title={t("messages.title")}>
      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-0 md:gap-4 overflow-hidden">
        {/* Conversation List - hidden on mobile when chat is open */}
        <div className={`${showChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 shrink-0 border-r-0 md:border-r`}>
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="font-semibold text-sm">{t("messages.title")}</h2>
            <Dialog open={showCompose} onOpenChange={setShowCompose}>
              <DialogTrigger asChild>
                <Button size="sm"><Mail className="h-4 w-4 mr-1.5" />{t("messages.compose")}</Button>
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
                  <Input
                    placeholder={t("parentPortal.messagePlaceholder")}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                  <Button onClick={sendComposeMessage} disabled={!receiverId || !content.trim()} className="w-full">
                    <Send className="h-4 w-4 mr-2" />{t("parentPortal.send")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ConversationList
              conversations={conversations}
              onSelect={setSelectedConversation}
              selectedId={selectedConversation}
              loading={loading}
              emptyText={t("messages.noInbox")}
            />
          </div>
        </div>

        {/* Chat View */}
        <div className={`${showChat ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
          {selectedConversation ? (
            <ChatView
              messages={chatMessages}
              currentUserId={user?.id || ""}
              otherName={getName(selectedConversation)}
              onSend={sendChatMessage}
              onBack={() => setSelectedConversation(null)}
              sendLabel={t("parentPortal.send")}
              placeholder={t("parentPortal.messagePlaceholder")}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {t("messages.selectConversation") || "Select a conversation to start chatting"}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
