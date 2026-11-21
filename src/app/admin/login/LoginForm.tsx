"use client";

import { useActionState, useState } from "react";
import { input, label } from "@/components/admin/ui";
import { loginAction } from "../actions";

/** Password first; if the account has two-factor on, the same form asks for the code next. */
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  // Controlled so the credentials survive the code step (form actions reset uncontrolled inputs).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const needCode = Boolean(state.needCode);

  return (
    <form action={action} className="grid gap-4">
      <label className={label}>
        Email
        <input name="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={needCode} className={input} />
      </label>
      <label className={label}>
        Password
        <input name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} readOnly={needCode} className={input} />
      </label>
      {needCode && (
        <label className={label}>
          Authentication code
          <input
            name="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            placeholder="123456"
            className={`${input} font-mono tracking-[0.3em]`}
            aria-describedby="code-hint"
          />
          <span id="code-hint" className="text-xs font-normal text-warm/50">
            Open your authenticator app and enter the 6-digit code for VICE STORE admin.
          </span>
        </label>
      )}
      {state.error && (
        <p role="alert" className="rounded-lg bg-vice/10 px-3 py-2 text-sm text-danger-soft">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="mt-1 h-11 rounded-lg bg-warm text-sm font-semibold text-obsidian transition-colors hover:bg-white disabled:opacity-60">
        {pending ? "Signing in…" : needCode ? "Verify and sign in" : "Sign in"}
      </button>
    </form>
  );
}
