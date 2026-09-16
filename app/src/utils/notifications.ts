import type { CreekyDB, CreekyNotification } from "@/types/creeky";
import { uid } from "@/services/storage";

export function pushNotification(
  s: CreekyDB,
  title: string,
  text: string,
  kind: CreekyNotification["kind"] = "system"
): void {
  s.notifications.unshift({
    id: uid("n"),
    title,
    text,
    time: new Date().toLocaleString(),
    unread: true,
    kind,
  });
}
