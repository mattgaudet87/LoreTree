import SettingsLink from "@/components/SettingsLink";

export default function AddLoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-28">
      <SettingsLink />
      {children}
    </div>
  );
}
