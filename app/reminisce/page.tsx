import SettingsLink from "@/components/SettingsLink";

export default function ReminiscePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 pb-28 text-center">
      <SettingsLink />
      <h1 className="font-serif text-lg font-medium text-text">Reminisce</h1>
      <p className="max-w-xs text-sm text-text-muted">
        Guided memory conversations about your photos will live here.
      </p>
    </div>
  );
}
