"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { aiApi, documentsApi } from "@/lib/api";
import { Send, Bot, User, Paperclip, X, CheckCircle, SkipForward, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const CoachResponse = dynamic(() => import("@/components/life-os/CoachResponse"), { ssr: false });

interface Message { role: "user" | "assistant"; content: string; }

interface ActionItem { title: string; domain: string; item_type: string; }

interface UploadRecord {
  id: string;
  filename: string;
  status: "processing" | "ready" | "confirmed" | "skipped" | "error";
  sensitivity_tier?: number;
  summary?: string;
  domains?: string[];
  action_items?: ActionItem[];
  error_message?: string;
}

interface FileChip {
  file: File;
  uploadRecord?: UploadRecord;
  processing: boolean;
  error?: string;
}

interface Props {
  domain?: string;
  initialMessage?: string;
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

const TIER_LABEL: Record<number, string> = { 1: "General", 2: "Financial", 3: "Health/Medical" };
const TIER_COLOR: Record<number, string> = { 1: "text-gray-500", 2: "text-amber-600", 3: "text-red-600" };

export function AICoachChat({ domain, initialMessage, conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessage ? [{ role: "assistant", content: initialMessage }] : []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const [fileChips, setFileChips] = useState<FileChip[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null); // upload id being confirmed
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  }, [messages, fileChips]);

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

  const processFiles = useCallback(async (files: File[]) => {
    const MAX = 5;
    const allowed = files.slice(0, MAX);
    const chips: FileChip[] = allowed.map(f => ({ file: f, processing: true }));
    setFileChips(prev => [...prev, ...chips]);

    // Upload all in one request
    try {
      setMessages(m => [...m, { role: "assistant", content: `__file_processing__:${allowed.map(f => f.name).join(", ")}` }]);
      const { data } = await documentsApi.upload(allowed);
      const uploads: UploadRecord[] = data.uploads || [];

      setFileChips(prev => {
        const next = [...prev];
        for (let i = next.length - allowed.length; i < next.length; i++) {
          const rec = uploads[i - (next.length - allowed.length)];
          if (rec) {
            next[i] = { ...next[i], processing: false, uploadRecord: rec };
          } else {
            next[i] = { ...next[i], processing: false, error: "Upload failed." };
          }
        }
        return next;
      });

      // Remove the processing placeholder message, replace with classification message
      setMessages(m => m.filter(msg => !msg.content.startsWith("__file_processing__")));
      for (const rec of uploads) {
        if (rec.status === "ready") {
          setMessages(m => [...m, {
            role: "assistant",
            content: `__doc_confirm__:${rec.id}`,
          }]);
        } else if (rec.status === "error") {
          setMessages(m => [...m, {
            role: "assistant",
            content: `Could not process **${rec.filename}**. ${rec.error_message || "Please try again."}`,
          }]);
        }
      }
    } catch {
      setMessages(m => m.filter(msg => !msg.content.startsWith("__file_processing__")));
      setMessages(m => [...m, { role: "assistant", content: "File upload failed. Please try again." }]);
      setFileChips(prev => prev.map(c => c.processing ? { ...c, processing: false, error: "Upload failed." } : c));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) processFiles(files);
    e.target.value = "";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() { setDragging(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) processFiles(files);
  }

  async function confirmUpload(uploadId: string, items: ActionItem[]) {
    setConfirming(uploadId);
    try {
      await documentsApi.confirm(uploadId, items);
      setMessages(m => m.map(msg =>
        msg.content === `__doc_confirm__:${uploadId}`
          ? { role: "assistant", content: `✓ Added ${items.length} item${items.length !== 1 ? "s" : ""} from document.` }
          : msg
      ));
      setFileChips(prev => prev.map(c =>
        c.uploadRecord?.id === uploadId
          ? { ...c, uploadRecord: { ...c.uploadRecord!, status: "confirmed" } }
          : c
      ));
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Could not save items. Please try again." }]);
    } finally {
      setConfirming(null);
    }
  }

  async function skipUpload(uploadId: string) {
    await documentsApi.skip(uploadId).catch(() => null);
    setMessages(m => m.map(msg =>
      msg.content === `__doc_confirm__:${uploadId}`
        ? { role: "assistant", content: "Document skipped — nothing added." }
        : msg
    ));
    setFileChips(prev => prev.map(c =>
      c.uploadRecord?.id === uploadId
        ? { ...c, uploadRecord: { ...c.uploadRecord!, status: "skipped" } }
        : c
    ));
  }

  // Find the upload record for a confirmation message
  function getUploadRecord(uploadId: string): UploadRecord | undefined {
    for (const chip of fileChips) {
      if (chip.uploadRecord?.id === uploadId) return chip.uploadRecord;
    }
    return undefined;
  }

  function renderMessage(msg: Message, i: number) {
    // Processing placeholder
    if (msg.content.startsWith("__file_processing__:")) {
      const names = msg.content.replace("__file_processing__:", "");
      return (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
            <motion.div className="w-2 h-2 bg-indigo-400 rounded-full" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            Reading {names}…
          </div>
        </div>
      );
    }

    // Document confirmation card
    if (msg.content.startsWith("__doc_confirm__:")) {
      const uploadId = msg.content.replace("__doc_confirm__:", "");
      const rec = getUploadRecord(uploadId);
      if (!rec) return null;
      return <DocumentConfirmCard key={i} rec={rec} onConfirm={confirmUpload} onSkip={skipUpload} confirming={confirming === uploadId} />;
    }

    // Normal message
    return (
      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-gray-100"}`}>
          {msg.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-gray-600" />}
        </div>
        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-gray-50 text-gray-900 rounded-tl-sm"}`}
          data-role={msg.role === "assistant" ? "assistant" : undefined}>
          {msg.role === "assistant" ? (
            <CoachResponse message={msg.content} />
          ) : (
            msg.content
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-2xl shadow-card overflow-hidden transition-colors ${dragging ? "ring-2 ring-indigo-400 bg-indigo-50/20" : ""}`}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
    >
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
            <p className="text-gray-400 text-xs mt-1">Drop a file here or click the paperclip to upload a document.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => renderMessage(msg, i))}
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

      {/* File chips row */}
      {fileChips.length > 0 && (
        <div className="px-4 pt-2 flex gap-2 flex-wrap border-t border-gray-50">
          {fileChips.map((chip, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${
              chip.processing ? "border-indigo-200 bg-indigo-50 text-indigo-600" :
              chip.error ? "border-red-200 bg-red-50 text-red-600" :
              chip.uploadRecord?.status === "confirmed" ? "border-green-200 bg-green-50 text-green-600" :
              "border-gray-200 bg-gray-50 text-gray-600"
            }`}>
              {chip.processing && <motion.div className="w-2 h-2 rounded-full bg-indigo-400" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />}
              {chip.error && <AlertTriangle className="w-3 h-3" />}
              {chip.uploadRecord?.status === "confirmed" && <CheckCircle className="w-3 h-3" />}
              <span className="max-w-[120px] truncate">{chip.file.name}</span>
              {!chip.processing && (
                <button onClick={() => setFileChips(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt,.csv,.md"
            className="hidden"
            onChange={handleFileInput}
          />
          <button
            type="button"
            title="Attach document"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition"
          >
            <Paperclip className="w-4 h-4" />
          </button>
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

// ── Document confirmation card ────────────────────────────────────────────────

function DocumentConfirmCard({
  rec,
  onConfirm,
  onSkip,
  confirming,
}: {
  rec: UploadRecord;
  onConfirm: (id: string, items: ActionItem[]) => void;
  onSkip: (id: string) => void;
  confirming: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set((rec.action_items || []).map((_, i) => i))
  );

  function toggle(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const items = rec.action_items || [];
  const tier = rec.sensitivity_tier || 1;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-3">
      <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-3.5 h-3.5 text-gray-600" />
      </div>
      <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">📄 {rec.filename}</p>
            {rec.summary && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.summary}</p>}
          </div>
          <span className={`text-xs font-medium ${TIER_COLOR[tier]} flex-shrink-0`}>
            {TIER_LABEL[tier]}
          </span>
        </div>

        {/* Domain tags */}
        {(rec.domains || []).length > 0 && (
          <div className="px-4 py-2 flex gap-1.5 flex-wrap">
            {rec.domains!.map(d => (
              <span key={d} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full capitalize">{d}</span>
            ))}
          </div>
        )}

        {/* Action items */}
        {items.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Action Items</p>
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)}
                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                  <span className={`text-sm flex-1 ${selected.has(i) ? "text-gray-800" : "text-gray-400 line-through"}`}>
                    {item.title}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{item.domain}</span>
                  <span className="text-xs text-gray-300 capitalize">{item.item_type}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onConfirm(rec.id, items.filter((_, i) => selected.has(i)))}
            disabled={confirming || selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {confirming ? "Saving…" : `Add ${selected.size} item${selected.size !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={() => onSkip(rec.id)}
            disabled={confirming}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip
          </button>
        </div>
      </div>
    </motion.div>
  );
}
