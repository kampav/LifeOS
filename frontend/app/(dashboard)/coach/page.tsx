"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { DOMAINS, getDomain, cn } from "@/lib/utils";
import { Plus, MessageSquare, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, parseISO } from "date-fns";

const AICoachChat = dynamic(
  () => import("@/components/life-os/AICoachChat").then(m => m.AICoachChat),
  { ssr: false, loading: () => <div className="flex-1 animate-pulse bg-gray-50 rounded-xl" /> }
);

interface ConversationSummary {
  id: string;
  domain?: string;
  title?: string;
  updated_at: string;
  messages: Array<{ role: string; content: string }>;
}

function ConversationSidebar({
  conversations,
  activeConvId,
  onNewChat,
  onSelect,
}: {
  conversations: ConversationSummary[];
  activeConvId: string | undefined;
  onNewChat: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-900 text-sm">Conversations</h2>
        <button onClick={onNewChat}
          className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-400 text-xs">No conversations yet.</p>
        ) : (
          conversations.map(conv => {
            const domain = conv.domain ? getDomain(conv.domain) : null;
            const isActive = conv.id === activeConvId;
            const preview = conv.messages?.find(m => m.role === "user")?.content;
            return (
              <button key={conv.id} onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0",
                  isActive && "bg-indigo-50 border-l-2 border-l-primary"
                )}>
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm line-clamp-1 flex-1", isActive ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                    {conv.title || preview || "New conversation"}
                  </p>
                  {domain && (
                    <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: domain.color }}>
                      {domain.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(parseISO(conv.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function CoachPage() {
  const [activeConvId, setActiveConvId] = useState<string | undefined>(undefined);
  const [activeDomain, setActiveDomain] = useState<string | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const qc = useQueryClient();

  const { data: conversations = [] } = useQuery<ConversationSummary[]>({
    queryKey: ["ai-conversations"],
    queryFn: () => aiApi.conversations().then(r => Array.isArray(r.data) ? r.data : []),
    staleTime: 30_000,
    retry: false,
  });

  function handleNewChat() {
    setActiveConvId(undefined);
    setActiveDomain(undefined);
    setShowHistory(false);
  }

  function handleSelect(id: string) {
    setActiveConvId(id);
    setShowHistory(false);
  }

  function handleConversationCreated(id: string) {
    setActiveConvId(id);
    qc.invalidateQueries({ queryKey: ["ai-conversations"] });
  }

  const activeConvTitle = conversations.find(c => c.id === activeConvId)?.title;

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-screen overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 flex-shrink-0">
        <ConversationSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          onNewChat={handleNewChat}
          onSelect={handleSelect}
        />
      </aside>

      {/* Mobile history overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div className="fixed inset-0 bg-black/20 z-40 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)} />
            <motion.aside className="fixed left-0 top-0 h-full w-72 bg-white z-50 flex flex-col shadow-xl md:hidden"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}>
              <ConversationSidebar
                conversations={conversations}
                activeConvId={activeConvId}
                onNewChat={handleNewChat}
                onSelect={handleSelect}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <button onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
            <MessageSquare className="w-4 h-4" /> History
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-gray-900 truncate">
            {activeConvId ? (activeConvTitle || "Conversation") : "New Chat"}
          </span>
          <button onClick={handleNewChat}
            className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Domain pills — new conversation only */}
        {!activeConvId && (
          <div className="px-4 pt-4 pb-0 flex flex-wrap gap-2 flex-shrink-0">
            <button onClick={() => setActiveDomain(undefined)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                !activeDomain ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              All Domains
            </button>
            {DOMAINS.map(d => (
              <button key={d.id} onClick={() => setActiveDomain(d.id)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  activeDomain === d.id ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                style={activeDomain === d.id ? { backgroundColor: d.color } : undefined}>
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 min-h-0 p-4">
          <AICoachChat
            key={activeConvId ?? "new"}
            domain={activeConvId ? undefined : activeDomain}
            conversationId={activeConvId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
