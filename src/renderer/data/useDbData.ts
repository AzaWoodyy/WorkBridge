import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchItems,
  fetchLinks,
  fetchPlanner,
  fetchConnections,
  fetchSyncStatus,
  fetchSyncCadence,
  updateSyncCadence,
  flushAll,
  gitlabAddNote,
  clickupAddComment,
  rocketChatThreadReply,
  rocketChatReact,
  gitlabApprove,
  gitlabUnapprove,
  gitlabUpdateLabels,
  gitlabUpdateReviewers,
  createLink,
  confirmLink,
  saveConnection,
  storeToken,
  testConnection,
  triggerSync,
  upsertPlannerState
} from './api'

export function useItems() {
  return useQuery({ queryKey: ['items'], queryFn: fetchItems })
}

export function useLinks() {
  return useQuery({ queryKey: ['links'], queryFn: fetchLinks })
}

export function usePlanner() {
  return useQuery({ queryKey: ['planner'], queryFn: fetchPlanner })
}

export function useConnections() {
  return useQuery({ queryKey: ['connections'], queryFn: fetchConnections })
}

export function useSyncStatus() {
  return useQuery({ queryKey: ['sync-status'], queryFn: fetchSyncStatus, refetchInterval: 30000 })
}

export function useSyncCadence() {
  return useQuery({ queryKey: ['sync-cadence'], queryFn: fetchSyncCadence })
}

export function useSyncCadenceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSyncCadence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-cadence'] })
    }
  })
}

export function usePlannerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: upsertPlannerState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
    }
  })
}

export function useConnectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    }
  })
}

export function useStoreTokenMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ source, token }: { source: string; token: string }) => storeToken(source, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    }
  })
}

export function useTestConnectionMutation() {
  return useMutation({
    mutationFn: testConnection
  })
}

export function useTriggerSyncMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      queryClient.invalidateQueries({ queryKey: ['links'] })
    }
  })
}

export function useFlushAllMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: flushAll,
    onSuccess: () => {
      queryClient.invalidateQueries()
    }
  })
}

export function useGitLabNoteMutation() {
  return useMutation({ mutationFn: gitlabAddNote })
}

export function useClickUpCommentMutation() {
  return useMutation({ mutationFn: clickupAddComment })
}

export function useRocketChatReplyMutation() {
  return useMutation({ mutationFn: rocketChatThreadReply })
}

export function useRocketChatReactMutation() {
  return useMutation({ mutationFn: rocketChatReact })
}

export function useGitLabLabelsMutation() {
  return useMutation({ mutationFn: gitlabUpdateLabels })
}

export function useGitLabReviewersMutation() {
  return useMutation({ mutationFn: gitlabUpdateReviewers })
}

export function useGitLabApproveMutation() {
  return useMutation({ mutationFn: gitlabApprove })
}

export function useGitLabUnapproveMutation() {
  return useMutation({ mutationFn: gitlabUnapprove })
}

export function useCreateLinkMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
    }
  })
}

export function useConfirmLinkMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: confirmLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
    }
  })
}
