"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function AuthCard() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let error;

    if (mode === "signup") {
      // 1. Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      error = signUpError;

      if (!error) {
        setMessage("Check your email for the confirmation link.");
      }
    } else {
      // Login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      error = signInError;

      if (!error) {
        router.push("/");
      }
    }

    if (error) {
      setMessage(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-lg transition-all duration-300">
        <h1 className="mb-6 text-center text-3xl font-bold tracking-wide text-cyan-400">
          Echo
        </h1>
        <p className="mb-6 text-center text-neutral-400">
          {mode === "signup"
            ? "Create your account to join the conversation."
            : "Welcome back. Log in to continue."}
        </p>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none focus:ring focus:ring-cyan-500/30"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none focus:ring focus:ring-cyan-500/30"
          />
          <button
            type="submit"
            disabled={loading}
            className={clsx(
              "w-full rounded-lg px-4 py-3 font-medium text-white shadow-md transition",
              loading
                ? "bg-neutral-700 cursor-not-allowed"
                : "bg-cyan-500 hover:bg-cyan-400",
            )}
          >
            {loading
              ? mode === "signup"
                ? "Signing up..."
                : "Logging in..."
              : mode === "signup"
                ? "Sign Up"
                : "Log In"}
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-sm text-neutral-400">{message}</p>
        )}
        <p className="mt-6 text-center text-sm text-neutral-500">
          {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="font-medium text-cyan-400 hover:underline"
          >
            {mode === "signup" ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
