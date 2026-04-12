"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/onboarding");
  }

  const PERKS = [
    { icon: "🧠", text: "AI coach trained on your real data" },
    { icon: "📊", text: "10 life domains tracked automatically" },
    { icon: "🔒", text: "Private by design — your data stays yours" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#1a1a2e] p-12 relative overflow-hidden">
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-purple-600/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-white font-bold text-xl">Life OS</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            The operating system<br />for your life.
          </h2>
          <p className="text-indigo-200 text-lg leading-relaxed mb-12">
            Join thousands who use Life OS to make better decisions, build better habits, and live more intentionally.
          </p>
          <div className="space-y-4">
            {PERKS.map((p, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i }}
                className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                <span className="text-2xl">{p.icon}</span>
                <span className="text-white/80 text-sm">{p.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-indigo-300/60 text-sm">Free to start. No credit card required.</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md">

          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="font-bold text-gray-900 text-xl">Life OS</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-500 mb-8">Free forever. No credit card needed.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Alex Smith" required
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters" required
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25 mt-2">
              {loading ? "Creating your account…" : "Get started free"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-3">
            By signing up you agree to our Terms & Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
