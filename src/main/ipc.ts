import { registerClickupHandlers } from './ipc/clickup'
import { registerConnectionsHandlers } from './ipc/connections'
import { registerGitlabHandlers } from './ipc/gitlab'
import { registerPlannerHandlers } from './ipc/planner'
import { registerRocketchatHandlers } from './ipc/rocketchat'
import { registerSystemHandlers } from './ipc/system'
export function registerIpc() {
  registerGitlabHandlers()
  registerClickupHandlers()
  registerRocketchatHandlers()
  registerConnectionsHandlers()
  registerPlannerHandlers()
  registerSystemHandlers()
}
