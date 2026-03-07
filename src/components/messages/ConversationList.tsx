import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface Conversation {
  oderId: string;
  name: string;
  lastMessage: string;
  lastDate: string;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (otherId: string) => void;
  selectedId: string | null;
  loading: boolean;
  emptyText: string;
}

const ConversationList = ({ conversations, onSelect, selectedId, loading, emptyText }: ConversationListProps) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">{emptyText}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv) => (
        <button
          key={conv.oderId}
          onClick={() => onSelect(conv.oderId)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent/50 ${
            selectedId === conv.oderId ? "bg-accent" : ""
          }`}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {conv.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{conv.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(conv.lastDate), "MMM d")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
          </div>
          {conv.unreadCount > 0 && (
            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-destructive text-destructive-foreground rounded-full shrink-0">
              {conv.unreadCount}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
};

export default ConversationList;
