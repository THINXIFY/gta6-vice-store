import { Button, Card, Field, Flash, input, label, PageHeader, when } from "@/components/admin/ui";
import { targetProcessingMinutes } from "@/config/payments";
import { checkoutOpen } from "@/lib/checkout";
import { PaymentQr } from "@/components/checkout/ui";
import { listAdmins, retentionSummary, totpStatus } from "@/server/admin";
import { MIN_PASSWORD, require2fa, requireAdmin } from "@/server/auth";
import {
  cancel2faAction,
  changePasswordAction,
  confirm2faAction,
  createAdminAction,
  disable2faAction,
  purgeScreenshotsAction,
  reset2faAction,
  setAdminActiveAction,
  start2faAction,
} from "../../actions";

export const metadata = { title: "Settings" };

const codeInput = `${input} w-36 font-mono tracking-[0.3em]`;

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; enroll?: string }> }) {
  // Reachable without 2FA so an admin can enroll when ADMIN_REQUIRE_2FA=1.
  const me = await requireAdmin(undefined, { allowWithout2fa: true });
  const [admins, flash, totp, retention] = await Promise.all([
    me.role === "owner" ? listAdmins() : Promise.resolve([]),
    searchParams,
    totpStatus(me),
    retentionSummary(),
  ]);

  return (
    <div className="grid gap-5">
      <PageHeader title="Settings" />
      <Flash ok={flash.ok} error={flash.error} />
      {require2fa() && !totp.enabled && (
        <p role="alert" className="rounded-lg border border-sunset/30 bg-sunset/[0.07] px-4 py-3 text-sm">
          Two-factor authentication is required for admin accounts. Set it up below to continue.
        </p>
      )}

      <Card title="Two-factor authentication">
        {totp.enabled ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <p className="text-sm text-warm/70">
              <span className="font-semibold text-success-soft">On.</span> Signing in needs your password and a code from your authenticator app.
            </p>
            <form action={disable2faAction} className="flex items-end gap-2">
              <label className={label}>
                Current code
                <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" className={codeInput} />
              </label>
              <Button variant="danger">Turn off</Button>
            </form>
          </div>
        ) : totp.pending ? (
          <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
            <PaymentQr value={totp.pending.uri} label="QR code to add this account to your authenticator app" className="size-48" />
            <div className="grid content-start gap-4 text-sm">
              <p className="text-warm/70">Scan with an authenticator app (for example Google Authenticator, 1Password or Authy), then enter the 6-digit code it shows.</p>
              <p className="text-xs text-warm/50">
                Can’t scan? Enter this key: <span data-totp-secret className="font-mono break-all text-warm/80">{totp.pending.secret.replace(/(.{4})/g, "$1 ").trim()}</span>
              </p>
              <form action={confirm2faAction} className="flex flex-wrap items-end gap-2">
                <label className={label}>
                  Code from the app
                  <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" className={codeInput} />
                </label>
                <Button>Turn on</Button>
              </form>
              <form action={cancel2faAction}>
                <button className="text-xs text-warm/50 hover:text-warm">Cancel setup</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[36rem] text-sm text-warm/70">Protect this account with a one-time code from an authenticator app, in addition to your password.</p>
            <form action={start2faAction}>
              <Button>Set up two-factor</Button>
            </form>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="System">
          <dl className="divide-y divide-warm/6">
            <Field k="Live checkout" v={checkoutOpen ? "Enabled" : "Disabled (development)"} />
            <Field k="Database" v={process.env.DATABASE_URL ? "PostgreSQL" : "Embedded PGlite (local)"} />
            <Field k="Target processing" v={`${targetProcessingMinutes} minutes (target only, never auto-approves)`} />
            <Field k="Signed in as" v={`${me.email} (${me.role})`} />
            <Field k="Two-factor required" v={require2fa() ? "Yes (ADMIN_REQUIRE_2FA=1)" : "No (set ADMIN_REQUIRE_2FA=1 in production)"} />
          </dl>
        </Card>

        <Card title="Change your password">
          <form action={changePasswordAction} className="grid gap-3">
            <label className={label}>
              Current password
              <input name="current" type="password" required autoComplete="current-password" className={input} />
            </label>
            <label className={label}>
              New password (at least {MIN_PASSWORD} characters)
              <input name="next" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className={input} />
            </label>
            <Button variant="secondary">Change password</Button>
          </form>
        </Card>
      </div>

      {me.role === "owner" && (
        <Card title="Admin users">
          <ul className="divide-y divide-warm/6">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  {a.email} <span className="text-xs text-warm/45 capitalize">· {a.role}</span>
                  <span className="block text-xs text-warm/45">
                    Last sign-in {when(a.lastLoginAt)} · Two-factor {a.twoFactor ? "on" : "off"}
                  </span>
                </span>
                {a.id !== me.id && a.twoFactor && (
                  <form action={reset2faAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button variant="secondary" className="h-8 px-3 text-xs">
                      Reset two-factor
                    </Button>
                  </form>
                )}
                {a.id !== me.id && (
                  <form action={setAdminActiveAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={a.active ? "false" : "true"} />
                    <Button variant={a.active ? "danger" : "secondary"} className="h-8 px-3 text-xs">
                      {a.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <form action={createAdminAction} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_8rem_1fr_auto] sm:items-end">
            <label className={label}>
              Email
              <input name="email" type="email" required className={input} />
            </label>
            <label className={label}>
              Role
              <select name="role" className={`${input} appearance-none`}>
                <option value="reviewer">Reviewer</option>
                <option value="owner">Owner</option>
              </select>
            </label>
            <label className={label}>
              Temporary password
              <input name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className={input} />
            </label>
            <Button>Add admin</Button>
          </form>
          <p className="mt-3 text-xs text-warm/45">Reviewers can review and approve payments. Owners can also manage wallets, prices, fulfillment and admins.</p>
        </Card>
      )}

      <Card title="Payment screenshot retention">
        <dl className="divide-y divide-warm/6">
          <Field k="Kept for" v={`${retention.days} days, then deletable once the order is closed (SCREENSHOT_RETENTION_DAYS)`} />
          <Field k="Stored" v={`${retention.kept} screenshots, ${(retention.bytes / 1024 / 1024).toFixed(1)} MB`} />
          <Field k="Already deleted" v={retention.purged} />
          <Field k="Due for deletion" v={retention.due} />
        </dl>
        {me.role === "owner" && (
          <form action={purgeScreenshotsAction} className="mt-4">
            <Button variant="danger" disabled={retention.due === 0}>
              Delete {retention.due} due screenshot{retention.due === 1 ? "" : "s"}
            </Button>
          </form>
        )}
        <p className="mt-3 text-xs text-warm/45">
          Only screenshots of released, rejected or expired orders older than the retention period are deleted. Orders still in review keep theirs. Each screenshot’s size and fingerprint stay in the record, and every deletion is logged.
        </p>
      </Card>
    </div>
  );
}
