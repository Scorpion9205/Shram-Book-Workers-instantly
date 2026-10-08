"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/cards/EmptyState";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/hooks/redux";
import { useGetChatMessagesQuery, useSendChatMessageMutation } from "@/features/chat/chatApi";
import { useChatSocket } from "@/hooks/useChatSocket";

interface ChatThreadProps {
  bookingId: string;
  otherPartyName: string;
  otherPartyImage?: string | null;
}

export function ChatThread({ bookingId, otherPartyName, otherPartyImage }: ChatThreadProps) {
  const currentUserId = useAppSelector((s) => s.auth.user?.id);
  const { data: messages = [], isLoading } = useGetChatMessagesQuery(bookingId);
  const [sendMessage, { isLoading: isSending }] = useSendChatMessageMutation();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useChatSocket(bookingId);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    try {
      await sendMessage({ bookingId, content }).unwrap();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send message.");
      setDraft(content);
    }
  }

  return (
    <Card className="flex h-[70vh] flex-col">
      <CardHeader className="flex flex-row items-center gap-3 border-b">
        <Avatar>
          <AvatarImage src={otherPartyImage ?? undefined} />
          <AvatarFallback>{otherPartyName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-base">{otherPartyName}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-2/3" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Say hello to get the conversation started." />
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div key={message.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={cn("mt-1 text-[10px] opacity-70", isMine ? "text-right" : "text-left")}>
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </CardContent>

      <div className="flex items-center gap-2 border-t p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          maxLength={2000}
          disabled={isSending}
        />
        <Button size="icon" onClick={handleSend} disabled={isSending || !draft.trim()} loading={isSending}>
          <Send className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
