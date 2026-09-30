import { redirect } from "next/navigation";

// Search lives inside the Lore page; this keeps the Search tab pointing at it.
export default function SearchPage() {
  redirect("/lore?search=1");
}
