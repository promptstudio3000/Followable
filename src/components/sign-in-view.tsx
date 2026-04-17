import { signInAction } from "@/app/auth-actions";
import { WalletSignInCard } from "@/components/wallet-sign-in-card";
import { DEMO_PASSWORD } from "@/lib/demo-auth";
import { seedData } from "@/lib/demo-data";

export function SignInView({
  error,
  username,
  next,
}: {
  error?: string;
  username?: string;
  next?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-stone-200 bg-[linear-gradient(135deg,#151515_0%,#352715_48%,#48583f_100%)] p-8 text-white shadow-[0_28px_90px_rgba(28,23,15,0.18)]">
          <div className="text-xs uppercase tracking-[0.24em] text-white/70">Authentication</div>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
            Sign in to follow, subscribe, unlock, and publish.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-200">
            This MVP uses a demo credential flow so the product can be tested immediately. Session cookies are signed, and the account model maps cleanly to a future database-backed auth system.
          </p>
          <div className="mt-6 rounded-2xl border border-white/12 bg-white/10 p-5 text-sm leading-7 text-stone-100">
            <div className="font-semibold">Demo password</div>
            <div className="mt-2">Use <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">{DEMO_PASSWORD}</span> with any seeded username below.</div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(27,24,19,0.08)]">
            <div className="text-sm font-medium text-stone-500">Session</div>
            <form action={signInAction} className="mt-4 space-y-4">
              <input type="hidden" name="next" value={next || "/"} />
              <label className="block space-y-2 text-sm font-medium text-stone-700">
                <span>Username</span>
                <input
                  name="username"
                  defaultValue={username}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="urban.scout.plzen"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium text-stone-700">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  defaultValue={DEMO_PASSWORD}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              {error === "invalid" ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  Username or password did not match the demo dataset.
                </div>
              ) : null}
              <button className="w-full rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white">
                Sign in
              </button>
            </form>
          </div>

          <WalletSignInCard next={next} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(27,24,19,0.08)]">
        <div className="text-sm font-medium text-stone-500">Seeded creator accounts</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seedData.users.map((user) => (
            <form key={user.id} action={signInAction} className="rounded-2xl border border-stone-200 p-4 text-left transition hover:border-stone-900 hover:bg-stone-50">
              <input type="hidden" name="username" value={user.username} />
              <input type="hidden" name="password" value={DEMO_PASSWORD} />
              <input type="hidden" name="next" value={next || "/"} />
              <div className="font-medium text-stone-900">{user.displayName}</div>
              <div className="mt-1 text-sm text-stone-500">@{user.username}</div>
              <div className="mt-3 text-sm leading-6 text-stone-600">{user.bio}</div>
              <button className="mt-4 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900">
                Sign in as this creator
              </button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
