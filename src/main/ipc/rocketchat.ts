import {
  listRocketChatRooms,
  postRocketChatThreadReply,
  reactRocketChatMessage
} from '../integrations/rocketchat'
import { syncRocketChatNow } from '../sync'
import { getRocketChatAuth } from './auth'
import { handle } from './validate'
export function registerRocketchatHandlers() {
  handle('workbridge:list-rocketchat-rooms', async () => {
    try {
      const { baseUrl, token, userId } = await getRocketChatAuth()
      const rooms = await listRocketChatRooms(baseUrl, token, userId)
      return { ok: true, rooms }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load rooms.'
      return { ok: false, message, rooms: [] }
    }
  })

  handle(
    'workbridge:rocketchat-thread-reply',
    async (_event, payload: { roomId: string; threadId: string; body: string }) => {
      const { baseUrl, token, userId } = await getRocketChatAuth()
      await postRocketChatThreadReply(
        baseUrl,
        token,
        userId,
        payload.roomId,
        payload.threadId,
        payload.body
      )
      await syncRocketChatNow()
      return { ok: true }
    }
  )

  handle(
    'workbridge:rocketchat-react',
    async (_event, payload: { messageId: string; emoji: string; shouldReact?: boolean }) => {
      const { baseUrl, token, userId } = await getRocketChatAuth()
      await reactRocketChatMessage(
        baseUrl,
        token,
        userId,
        payload.messageId,
        payload.emoji,
        payload.shouldReact ?? true
      )
      await syncRocketChatNow()
      return { ok: true }
    }
  )
}
