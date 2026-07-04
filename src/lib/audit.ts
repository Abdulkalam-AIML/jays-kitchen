import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VIEW'

export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  details,
}: {
  userId: string
  action: AuditAction | string
  entity: string
  entityId: string
  details?: Record<string, unknown>
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: (details || {}) as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    // Audit failures should not break main operations
    console.error('[AUDIT LOG ERROR]', error)
  }
}
