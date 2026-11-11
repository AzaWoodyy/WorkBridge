import { z } from 'zod'
const id = z.string().min(1).max(2048)
const body = z.string().min(1).max(100000)
const source = z.enum(['gitlab', 'clickup', 'rocketchat'])
const mr = z.object({ projectId: z.number().int().positive(), iid: z.number().int().positive() })
const schemas: Record<string, z.ZodTypeAny> = {
  'upsert-planner': z.tuple([
    z.object({
      itemId: id,
      lane: z.enum(['inbox', 'today', 'this_week', 'later', 'waiting', 'done']).optional(),
      priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
      pinned: z.boolean().optional(),
      personalNote: z.string().max(100000).nullable().optional()
    })
  ]),
  'save-connection': z.tuple([
    z.object({
      source,
      baseUrl: z.string().url().nullable().optional(),
      accountLabel: z.string().max(256).nullable().optional(),
      scopeJson: z
        .string()
        .max(100000)
        .refine((value) => {
          try {
            const parsed = JSON.parse(value)
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          } catch {
            return false
          }
        }, 'Invalid scope JSON')
        .nullable()
        .optional(),
      enabled: z.boolean().optional()
    })
  ]),
  'store-token': z.tuple([source, body]),
  'test-connection': z.tuple([
    z.object({
      source,
      baseUrl: z.string().url().optional(),
      token: z.string().optional(),
      userId: z.string().optional()
    })
  ]),
  'list-gitlab-members': z.tuple([z.number().int().positive()]),
  'list-clickup-custom-field-options': z.tuple([id, id]),
  'set-sync-cadence': z.tuple([z.number().int().min(1).max(60)]),
  'trigger-sync': z.tuple([source]),
  'open-external': z.tuple([z.string().url()]),
  'create-link': z.tuple([
    z.object({
      fromId: id,
      toId: id,
      relationType: z.enum(['references', 'review_request', 'implements', 'relates_to']),
      origin: z.enum(['manual', 'auto']),
      suggested: z.boolean()
    })
  ]),
  'confirm-link': z.tuple([id]),
  'gitlab-add-note': z.tuple([mr.extend({ body })]),
  'gitlab-update-labels': z.tuple([mr.extend({ labels: z.array(z.string()).max(100) })]),
  'gitlab-update-reviewers': z.tuple([
    mr.extend({ assignees: z.array(id).max(100), reviewers: z.array(id).max(100) })
  ]),
  'gitlab-approve': z.tuple([mr]),
  'gitlab-unapprove': z.tuple([mr]),
  'clickup-add-comment': z.tuple([z.object({ taskId: id, body })]),
  'rocketchat-thread-reply': z.tuple([z.object({ roomId: id, threadId: id, body })]),
  'rocketchat-react': z.tuple([
    z.object({ messageId: id, emoji: id, shouldReact: z.boolean().optional() })
  ])
}
export function validateArgs(channel: string, args: unknown[]) {
  return (schemas[channel] ?? z.tuple([])).parse(args)
}
