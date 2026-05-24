"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markBildirimlerOkundu } from "@/lib/repositories/bildirim";

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await markBildirimlerOkundu(user.id);
  revalidatePath("/", "layout");
}
