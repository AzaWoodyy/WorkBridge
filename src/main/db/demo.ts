import { db } from './db'
import { externalItems, plannerState, links } from './schema'
import { isDemo } from '../runtime'

export function seedDemo() {
  if (!isDemo) throw new Error('Demo seed requires an isolated demo profile.')
  const now = new Date().toISOString()
  const samples = [
    {
      id: 'gl-mr-demo',
      source: 'gitlab',
      itemType: 'merge_request',
      title: 'Improve keyboard navigation',
      status: 'opened',
      lane: 'today',
      project: 'Orbit / Web',
      meta: {
        iid: 42,
        projectId: 1,
        sourceBranch: 'feat/keyboard',
        targetBranch: 'main',
        author: 'Alex',
        reviewers: ['Sam'],
        labels: ['accessibility'],
        needsReview: true
      }
    },
    {
      id: 'cu-task-demo',
      source: 'clickup',
      itemType: 'task',
      title: 'Polish the onboarding checklist',
      status: 'en cours',
      lane: 'this_week',
      project: 'Orbit / Product',
      meta: { priority: 'normal', customField: 'Design', assignees: ['Sam'] }
    },
    {
      id: 'rc-msg-demo',
      source: 'rocketchat',
      itemType: 'message',
      title: 'Alex in #launch',
      status: 'unread',
      lane: 'inbox',
      project: '#launch',
      meta: { username: 'Alex', roomName: 'launch' }
    },
    {
      id: 'cu-task-docs',
      source: 'clickup',
      itemType: 'task',
      title: 'Write the release guide',
      status: 'ouvert',
      lane: 'later',
      project: 'Orbit / Documentation',
      meta: {}
    },
    {
      id: 'gl-mr-search',
      source: 'gitlab',
      itemType: 'merge_request',
      title: 'Make search results easier to scan',
      status: 'opened',
      lane: 'inbox',
      project: 'Orbit / Web',
      meta: { iid: 43, projectId: 1, author: 'Sam', labels: ['UX'] }
    }
  ]
  for (const item of samples) {
    db.insert(externalItems)
      .values({
        id: item.id,
        source: item.source,
        externalId: item.id,
        itemType: item.itemType,
        title: item.title,
        bodySnippet:
          'Fictional demo content. Bring related work together, decide what matters, and plan the next step.',
        url: 'https://example.com/demo',
        status: item.status,
        projectOrRoomName: item.project,
        assigneeSummary: 'Alex, Sam',
        updatedAt: now,
        createdAt: now,
        rawJson: JSON.stringify(item.meta)
      })
      .run()
    db.insert(plannerState)
      .values({
        itemId: item.id,
        lane: item.lane,
        priority: 'P2',
        pinned: item.lane === 'today',
        updatedAt: now
      })
      .run()
  }
  db.insert(links)
    .values({
      id: 'demo-link',
      fromItemId: 'gl-mr-demo',
      toItemId: 'cu-task-demo',
      relationType: 'implements',
      origin: 'manual',
      suggested: false,
      createdAt: now
    })
    .run()
}
