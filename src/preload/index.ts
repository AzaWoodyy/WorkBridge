import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getVersion: () => process.env.npm_package_version ?? '0.0.0',
  ping: () => 'pong',
  getItems: () => ipcRenderer.invoke('workbridge:get-items'),
  getLinks: () => ipcRenderer.invoke('workbridge:get-links'),
  getPlanner: () => ipcRenderer.invoke('workbridge:get-planner'),
  upsertPlanner: (payload: { itemId: string; lane?: string; priority?: string; pinned?: boolean; personalNote?: string }) =>
    ipcRenderer.invoke('workbridge:upsert-planner', payload),
  getConnections: () => ipcRenderer.invoke('workbridge:get-connections'),
  saveConnection: (payload: { source: string; baseUrl?: string | null; accountLabel?: string | null; scopeJson?: string | null; enabled?: boolean }) =>
    ipcRenderer.invoke('workbridge:save-connection', payload),
  storeToken: (source: string, token: string) => ipcRenderer.invoke('workbridge:store-token', source, token),
  testConnection: (payload: { source: string; baseUrl?: string; token?: string; userId?: string }) =>
    ipcRenderer.invoke('workbridge:test-connection', payload),
  testNotification: () => ipcRenderer.invoke('workbridge:test-notification'),
  openDevTools: () => ipcRenderer.invoke('workbridge:open-devtools'),
  listGitLabProjects: () => ipcRenderer.invoke('workbridge:list-gitlab-projects'),
  listGitLabGroups: () => ipcRenderer.invoke('workbridge:list-gitlab-groups'),
  listGitLabMembers: (projectId: number) => ipcRenderer.invoke('workbridge:list-gitlab-members', projectId),
  listClickUpLists: () => ipcRenderer.invoke('workbridge:list-clickup-lists'),
  listClickUpEquipeOptions: (listId: string) => ipcRenderer.invoke('workbridge:list-clickup-equipe-options', listId),
  listRocketChatRooms: () => ipcRenderer.invoke('workbridge:list-rocketchat-rooms'),
  getSyncStatus: () => ipcRenderer.invoke('workbridge:get-sync-status'),
  getSyncCadence: () => ipcRenderer.invoke('workbridge:get-sync-cadence'),
  getGitLabDiagnostics: () => ipcRenderer.invoke('workbridge:get-gitlab-diagnostics'),
  setSyncCadence: (minutes: number) => ipcRenderer.invoke('workbridge:set-sync-cadence', minutes),
  triggerSync: (source: string) => ipcRenderer.invoke('workbridge:trigger-sync', source),
  flushAll: () => ipcRenderer.invoke('workbridge:flush-all'),
  openExternal: (url: string) => ipcRenderer.invoke('workbridge:open-external', url),
  gitlabAddNote: (payload: { projectId: number; iid: number; body: string }) =>
    ipcRenderer.invoke('workbridge:gitlab-add-note', payload),
  clickupAddComment: (payload: { taskId: string; body: string }) =>
    ipcRenderer.invoke('workbridge:clickup-add-comment', payload),
  rocketChatThreadReply: (payload: { roomId: string; threadId: string; body: string }) =>
    ipcRenderer.invoke('workbridge:rocketchat-thread-reply', payload),
  rocketChatReact: (payload: { messageId: string; emoji: string; shouldReact?: boolean }) =>
    ipcRenderer.invoke('workbridge:rocketchat-react', payload),
  gitlabUpdateLabels: (payload: { projectId: number; iid: number; labels: string[] }) =>
    ipcRenderer.invoke('workbridge:gitlab-update-labels', payload),
  gitlabUpdateReviewers: (payload: { projectId: number; iid: number; assignees: string[]; reviewers: string[] }) =>
    ipcRenderer.invoke('workbridge:gitlab-update-reviewers', payload),
  gitlabApprove: (payload: { projectId: number; iid: number }) =>
    ipcRenderer.invoke('workbridge:gitlab-approve', payload),
  gitlabUnapprove: (payload: { projectId: number; iid: number }) =>
    ipcRenderer.invoke('workbridge:gitlab-unapprove', payload),
  createLink: (payload: { fromId: string; toId: string; relationType: string; origin: 'manual' | 'auto'; suggested: boolean }) =>
    ipcRenderer.invoke('workbridge:create-link', payload),
  confirmLink: (linkId: string) => ipcRenderer.invoke('workbridge:confirm-link', linkId)
}

contextBridge.exposeInMainWorld('workbridge', api)

export type WorkbridgeAPI = typeof api
