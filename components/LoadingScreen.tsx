export default function LoadingScreen() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-[18px] overflow-hidden bg-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[44%] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2"
        style={{ backgroundImage: "radial-gradient(circle, rgba(95,196,141,.2), transparent 70%)" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        className="relative h-28 w-28 rounded-[26px] shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
      />
      <p className="relative font-serif text-[30px] font-medium text-text">LoreTree</p>
      <p className="relative text-sm text-text-muted">Loading your memories…</p>
      <div className="relative h-[3px] w-[120px] overflow-hidden rounded-full bg-surface-2">
        <div className="banner-gradient loading-bar h-full w-1/3 rounded-full" />
      </div>
    </div>
  );
}
