"use client";
import { useState, useRef, useEffect } from "react";
import { aiApi } from "@/lib/api";
import { Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message { role: "user" | "assistant"; content: string; }

interface Props {
  domain?: string;
  initialMessage?: string;
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export function AICoachChat({ domain, initialMessage, conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessage ? [{ role: "assistant", content: initialMessage }] : []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load existing conversation when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages(initialMessage ? [{ role: "assistant", content: initialMessage }] : []);
      setConvId(undefined);
      return;
    }
    setLoadingHistory(true);
    setMessages([]);
    aiApi.getConversation(conversationId)
      .then(({ data }) => {
        const msgs: Message[] = (data.messages || []).map(
          (m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content })
        );
        setMessages(msgs);
        setConvId(conversationId);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading || loadingHistory) return;
    const msg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await aiApi.chat(msg, domain, convId);
      if (!convId && data.conversation_id) {
        setConvId(data.conversation_id);
        onConversationCreated?.(data.conversation_id);
      }
      setMessages(m => [...m, { role: "assistant", content: data.message }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">Life OS Coach</p>
          <p className="text-xs text-green-500">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loadingHistory && (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-2 h-2 bg-gray-300 rounded-full"
                  animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Ask me anything about your {domain || "life"}.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-gray-100"}`}>
                {msg.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-gray-600" />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-gray-50 text-gray-900 rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-gray-600" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask your life coach…"
            disabled={loadingHistory}
            className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <button onClick={send} disabled={!input.trim() || loading || loadingHistory}
            className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
