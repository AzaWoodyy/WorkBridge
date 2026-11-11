import {
  addClickUpTaskComment,
  listClickUpCustomFieldOptions,
  listClickUpLists
} from '../integrations/clickup'
import { syncClickUpNow } from '../sync'
import { getClickUpAuth } from './auth'
import { handle } from './validate'
export function registerClickupHandlers() {
  handle('workbridge:list-clickup-lists', async () => {
    try {
      const { token } = await getClickUpAuth()
      const lists = await listClickUpLists(token)
      return { ok: true, lists }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load lists.'
      return { ok: false, message, lists: [] }
    }
  })

  handle(
    'workbridge:list-clickup-custom-field-options',
    async (_event, listId: string, field: string) => {
      try {
        const { token } = await getClickUpAuth()
        const options = await listClickUpCustomFieldOptions(token, listId, field)
        return { ok: true, options }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load customField options.'
        return { ok: false, message, options: { fieldId: null, options: [] } }
      }
    }
  )

  handle(
    'workbridge:clickup-add-comment',
    async (_event, payload: { taskId: string; body: string }) => {
      const { token } = await getClickUpAuth()
      await addClickUpTaskComment(token, payload.taskId, payload.body)
      await syncClickUpNow()
      return { ok: true }
    }
  )
}
