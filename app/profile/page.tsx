import SettingsLink from "@/components/SettingsLink";

export default function ProfilePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pb-28 pt-10">
      <SettingsLink />
      <div className="h-24 w-24 rounded-full bg-surface-2 border border-border" />
      <p className="mt-4 text-lg font-semibold text-text">Matt</p>
      <p className="mt-6 text-sm text-text-muted">Coming soon.</p>
    </div>
  );
}
