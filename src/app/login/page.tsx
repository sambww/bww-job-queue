"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Login failed");
      return;
    }
    router.push(params.get("next") || "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-2xl">
      <p className="font-mono text-xs tracking-[0.2em] text-cyan">ADMIN</p>
      <h1 className="mt-2 text-2xl font-semibold">Sign in to the queue</h1>
      <p className="mt-2 text-sm text-muted">Password-protected dispatch for Ballard Water Well.</p>
      <label className="mt-6 block text-sm text-muted">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-cyan"
          autoFocus
        />
      </label>
      {error ? <p className="mt-3 text-sm text-bad">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-lg bg-cyan px-4 py-2.5 font-medium text-ink hover:bg-cyan/90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Enter dashboard"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
