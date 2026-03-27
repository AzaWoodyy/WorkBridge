/// <reference types="vite/client" />

declare global {
  interface Window {
    workbridge: {
      getVersion: () => string
      ping: () => string
      getItems: () => Promise<unknown[]>
      getLinks: () => Promise<unknown[]>
      getPlanner: () => Promise<unknown[]>
      upsertPlanner: (payload: { itemId: string; lane?: string; priority?: string; pinned?: boolean; personalNote?: string }) => Promise<{ ok: boolean }>
      getConnections: () => Promise<unknown[]>
      saveConnection: (payload: { source: string; baseUrl?: string | null; accountLabel?: string | null; scopeJson?: string | null; enabled?: boolean }) => Promise<{ ok: boolean }>
      storeToken: (source: string, token: string) => Promise<{ ok: boolean }>
      testConnection: (payload: { source: string; baseUrl?: string; token?: string; userId?: string }) => Promise<{ ok: boolean; message?: string }>
      testNotification: () => Promise<{ ok: boolean; message?: string }>
      openDevTools: () => Promise<{ ok: boolean }>
      listGitLabProjects: () => Promise<{ ok: boolean; projects: string[] }>
      listGitLabGroups: () => Promise<{ ok: boolean; groups: string[] }>
      listGitLabMembers: (projectId: number) => Promise<{ ok: boolean; members: Array<{ id: number; username: string; name?: string | null }> }>
      listClickUpLists: () => Promise<{ ok: boolean; lists: Array<{ id: string; label: string }> }>
      listClickUpEquipeOptions: (listId: string) => Promise<{ ok: boolean; options: { fieldId: string | null; options: Array<{ id: string; name: string }> } }>
      listRocketChatRooms: () => Promise<{ ok: boolean; rooms: string[] }>
      getSyncStatus: () => Promise<unknown[]>
      getSyncCadence: () => Promise<{ minutes: number }>
      getGitLabDiagnostics: () => Promise<{
        gitlabItemCount: number
        gitlabPlannerCount: number
        gitlabLinkCount: number
        orphanPlannerCount: number
        duplicateExternalIds: Array<{ externalId: string; ids: string[] }>
        sampleIdentityMap: Array<{ id: string; externalId: string }>
        recentAudit: Array<{
          id: number
          eventType: string
          tableName: string
          rowId: string
          source: string | null
          payloadJson: string | null
          createdAt: string
        }>
        connection: { enabled: boolean; lastSyncAt: string | null; lastError: string | null } | null
      }>
      setSyncCadence: (minutes: number) => Promise<{ minutes: number }>
      triggerSync: (source: string) => Promise<{ ok: boolean }>
      flushAll: () => Promise<{ ok: boolean }>
      openExternal: (url: string) => Promise<{ ok: boolean }>
      gitlabAddNote: (payload: { projectId: number; iid: number; body: string }) => Promise<{ ok: boolean }>
      clickupAddComment: (payload: { taskId: string; body: string }) => Promise<{ ok: boolean }>
      rocketChatThreadReply: (payload: { roomId: string; threadId: string; body: string }) => Promise<{ ok: boolean }>
      rocketChatReact: (payload: { messageId: string; emoji: string; shouldReact?: boolean }) => Promise<{ ok: boolean }>
      gitlabUpdateLabels: (payload: { projectId: number; iid: number; labels: string[] }) => Promise<{ ok: boolean }>
      gitlabUpdateReviewers: (payload: { projectId: number; iid: number; assignees: string[]; reviewers: string[] }) => Promise<{ ok: boolean }>
      gitlabApprove: (payload: { projectId: number; iid: number }) => Promise<{ ok: boolean }>
      gitlabUnapprove: (payload: { projectId: number; iid: number }) => Promise<{ ok: boolean }>
      createLink: (payload: { fromId: string; toId: string; relationType: string; origin: 'manual' | 'auto'; suggested: boolean }) => Promise<{ ok: boolean }>
      confirmLink: (linkId: string) => Promise<{ ok: boolean }>
    }
  }
}

export {}
