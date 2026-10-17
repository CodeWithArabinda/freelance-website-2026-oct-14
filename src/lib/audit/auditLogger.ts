import { prisma } from "../db";

export async function logAuditEvent(
  params: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown> | null;
  },
  dbClient: any = prisma
) {
  try {
    return await dbClient.auditEvent.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload ? JSON.stringify(params.payload) : null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit event:", error);
    return null;
  }
}
