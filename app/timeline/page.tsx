import { redirect } from "next/navigation";

export default function TimelineRedirect() {
  redirect("/lore?view=timeline");
}
