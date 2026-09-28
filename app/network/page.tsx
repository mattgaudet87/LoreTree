import { redirect } from "next/navigation";

export default async function NetworkRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ view: "map" });
  if (typeof params.path === "string") qs.set("path", params.path);
  redirect(`/lore?${qs.toString()}`);
}
