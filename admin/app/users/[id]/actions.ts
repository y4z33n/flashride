"use server";

import { adminApi } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function blockUserAction(userId: string, reason: string) {
  await adminApi.blockUser(userId, reason || undefined);
  revalidatePath(`/users/${userId}`);
}

export async function unblockUserAction(userId: string) {
  await adminApi.unblockUser(userId);
  revalidatePath(`/users/${userId}`);
}
