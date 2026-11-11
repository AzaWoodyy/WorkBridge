import { fetchGitLabMembers } from '@renderer/data/api'
import type { Link } from '@renderer/data/types'
import {
  useClickUpCommentMutation,
  useConfirmLinkMutation,
  useCreateLinkMutation,
  useGitLabApproveMutation,
  useGitLabLabelsMutation,
  useGitLabNoteMutation,
  useGitLabReviewersMutation,
  useGitLabUnapproveMutation,
  useItems,
  useLinks,
  usePlanner,
  usePlannerMutation,
  useRocketChatReactMutation,
  useRocketChatReplyMutation
} from '@renderer/data/useDbData'
import { useAppStore } from '@renderer/store/appStore'
import * as joypixels from 'emoji-toolkit'
import { useEffect, useMemo, useState } from 'react'

export function useDetailController(itemId?: string) {
  const { data: items } = useItems()
  const { data: planner } = usePlanner()
  const { data: links } = useLinks()
  const plannerMutation = usePlannerMutation()
  const gitlabNoteMutation = useGitLabNoteMutation()
  const gitlabLabelsMutation = useGitLabLabelsMutation()
  const gitlabReviewersMutation = useGitLabReviewersMutation()
  const gitlabApproveMutation = useGitLabApproveMutation()
  const gitlabUnapproveMutation = useGitLabUnapproveMutation()
  const clickupCommentMutation = useClickUpCommentMutation()
  const rocketReplyMutation = useRocketChatReplyMutation()
  const rocketReactMutation = useRocketChatReactMutation()
  const createLinkMutation = useCreateLinkMutation()
  const confirmLinkMutation = useConfirmLinkMutation()

  const item = items?.find((entry) => entry.id === itemId)
  const plannerEntry = planner?.find((entry) => entry.itemId === itemId)
  const [note, setNote] = useState('')
  const [mrComment, setMrComment] = useState('')
  const [mrLabels, setMrLabels] = useState('')
  const [mrAssignees, setMrAssignees] = useState<string[]>([])
  const [mrReviewers, setMrReviewers] = useState<string[]>([])
  const [clickupComment, setClickupComment] = useState('')
  const [rocketReply, setRocketReply] = useState('')
  const [rocketEmoji, setRocketEmoji] = useState('')
  const [gitlabMembers, setGitlabMembers] = useState<Array<{ value: string; label?: string }>>([])
  const [gitlabMembersLoading, setGitlabMembersLoading] = useState(false)
  const [gitlabMembersError, setGitlabMembersError] = useState<string | null>(null)

  const rocketQuickReactions = [':eyes:', ':ping_pong:', ':white_check_mark:', ':hourglass:']
  const displayRocketEmoji = (value: string) => {
    if (!value) return value
    const normalized = value.startsWith(':')
      ? value
      : value.length > 2
        ? `:${value.replace(/:/g, '')}:`
        : value
    const converted = joypixels.shortnameToUnicode(normalized)
    return converted || value
  }
  const normalizeRocketEmoji = (value: string) => {
    if (!value) return value
    if (value.startsWith(':') && value.endsWith(':')) return value
    const short = joypixels.toShort(value)
    const match = short.match(/:[a-z0-9_+-]+:/i)
    if (match) return match[0]
    if (value.startsWith(':')) return value
    if (value.length > 2) return `:${value.replace(/:/g, '')}:`
    return value
  }
  const linkOpen = useAppStore((state) => state.linkModalOpen)
  const setLinkOpen = useAppStore((state) => state.setLinkModalOpen)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkRelation, setLinkRelation] = useState('relates_to')
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null)

  useEffect(() => {
    setNote(plannerEntry?.personalNote ?? '')
  }, [plannerEntry?.personalNote])

  useEffect(() => {
    if (!item) return
    const metaLabels = (item.meta?.labels ?? []) as string[]
    const metaAssignees = (item.meta?.assignees ?? []) as string[]
    const metaReviewers = (item.meta?.reviewers ?? []) as string[]
    setMrLabels(metaLabels.join(', '))
    setMrAssignees(metaAssignees)
    setMrReviewers(metaReviewers)
  }, [item])

  useEffect(() => {
    const projectId = item?.source === 'gitlab' ? item.meta?.projectId : null
    if (!projectId) {
      setGitlabMembers([])
      return
    }
    let active = true
    setGitlabMembersLoading(true)
    setGitlabMembersError(null)
    fetchGitLabMembers(projectId)
      .then((response) => {
        if (!active) return
        if (!response?.ok) {
          setGitlabMembers([])
          setGitlabMembersError(response?.message ?? 'Failed to load members.')
          return
        }
        const options = (response.members ?? []).map((member) => ({
          value: member.username,
          label: member.name ? `${member.name} (@${member.username})` : `@${member.username}`
        }))
        setGitlabMembers(options)
      })
      .catch((error) => {
        if (!active) return
        setGitlabMembers([])
        setGitlabMembersError(error instanceof Error ? error.message : 'Failed to load members.')
      })
      .finally(() => {
        if (!active) return
        setGitlabMembersLoading(false)
      })
    return () => {
      active = false
    }
  }, [item?.id, item?.source, item?.meta?.projectId])

  const relatedLinks = useMemo(() => {
    if (!item || !links) return []
    return links.filter(
      (link) => link.fromItemId === item.id || link.toItemId === item.id
    ) as Link[]
  }, [item, links])

  const relatedItems = useMemo(() => {
    if (!item || !links || !items) return []
    const relatedIds = relatedLinks.map((link) =>
      link.fromItemId === item.id ? link.toItemId : link.fromItemId
    )
    return items.filter((entry) => relatedIds.includes(entry.id))
  }, [item, links, items, relatedLinks])

  const relatedMessages = useMemo(
    () => relatedItems.filter((entry) => entry.source === 'rocketchat'),
    [relatedItems]
  )

  const linkCandidates = useMemo(() => {
    if (!item || !items) return []
    return items
      .filter((entry) => entry.id !== item.id)
      .filter((entry) =>
        item.source === 'gitlab' ? entry.source === 'clickup' : entry.source === 'gitlab'
      )
      .filter((entry) => entry.title.toLowerCase().includes(linkSearch.toLowerCase()))
  }, [item, items, linkSearch])

  const meta = item?.meta ?? {}
  const isApproved = Boolean(meta.approvals?.approved)
  const titleText = (item?.title ?? '').replace(/\s*\n\s*/g, ' ')

  return {
    items,
    planner,
    links,
    plannerMutation,
    gitlabNoteMutation,
    gitlabLabelsMutation,
    gitlabReviewersMutation,
    gitlabApproveMutation,
    gitlabUnapproveMutation,
    clickupCommentMutation,
    rocketReplyMutation,
    rocketReactMutation,
    createLinkMutation,
    confirmLinkMutation,
    item,
    plannerEntry,
    note,
    setNote,
    mrComment,
    setMrComment,
    mrLabels,
    setMrLabels,
    mrAssignees,
    setMrAssignees,
    mrReviewers,
    setMrReviewers,
    clickupComment,
    setClickupComment,
    rocketReply,
    setRocketReply,
    rocketEmoji,
    setRocketEmoji,
    gitlabMembers,
    gitlabMembersLoading,
    gitlabMembersError,
    rocketQuickReactions,
    displayRocketEmoji,
    normalizeRocketEmoji,
    linkOpen,
    setLinkOpen,
    linkSearch,
    setLinkSearch,
    linkRelation,
    setLinkRelation,
    linkTargetId,
    setLinkTargetId,
    relatedLinks,
    relatedItems,
    relatedMessages,
    linkCandidates,
    meta,
    isApproved,
    titleText
  }
}
