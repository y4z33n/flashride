"use server";

import { adminApi } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function updateReportStatusAction(reportId: string, status: string) {
  await adminApi.updateReportStatus(reportId, status);
  revalidatePath("/reports");
}
