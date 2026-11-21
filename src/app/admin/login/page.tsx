import { redirect } from "next/navigation";
import { site } from "@/config/site";
import { currentAdmin } from "@/server/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main id="main" className="relative isolate grid min-h-svh place-items-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_45%_at_25%_15%,rgb(255_87_154/0.14),transparent_70%),radial-gradient(45%_40%_at_80%_85%,rgb(178_140_255/0.12),transparent_70%)]" />
      <div className="w-full max-w-sm">
        <p className="bg-gradient-to-r from-warm via-[#ffb3cf] to-vice bg-clip-text font-display text-4xl font-extrabold tracking-[0.06em] text-transparent">{site.name}</p>
        <h1 className="mt-6 text-xl font-semibold">Admin sign in</h1>
        <p className="mt-1 text-sm text-warm/55">Orders, payments and fulfillment.</p>
        <div className="mt-6 rounded-2xl border border-line bg-panel/90 p-6 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
