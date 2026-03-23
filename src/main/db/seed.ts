import { db } from './db'
import { externalItems, links, plannerState, syncConnections } from './schema'

const nowIso = () => new Date().toISOString()

const demoItems = [
  {
    id: 'gl-1241',
    source: 'gitlab',
    externalId: '1241',
    itemType: 'merge_request',
    title: 'Improve cache invalidation in calendar sync',
    bodySnippet: 'Refactors cache keys and adds integration tests for sync edge cases.',
    url: 'https://gitlab.example.com/project/merge_requests/1241',
    status: 'Open',
    projectOrRoomName: 'WorkBridge / App',
    assigneeSummary: 'Lina T.',
    dueAt: null,
    updatedAt: '2026-03-17T18:40:00Z',
    rawJson: JSON.stringify({
      iid: 1241,
      projectId: 991,
      draft: false,
      reviewers: ['Lina T.', 'Morgan R.', 'Alex J.'],
      assignees: ['Lina T.'],
      labels: ['sync', 'cache'],
      approvals: { approved: false, approvalsLeft: 2, approvedBy: [] },
      pipelineStatus: 'running',
      state: 'opened',
      updatedAt: '2026-03-17T18:40:00Z',
      sourceBranch: 'feature/cache-invalidation/calendar-sync'
    }),
    createdAt: '2026-03-10T08:12:00Z'
  },
  {
    id: 'gl-1244',
    source: 'gitlab',
    externalId: '1244',
    itemType: 'merge_request',
    title: 'Dark mode polish for detail drawer',
    bodySnippet: 'Adds tokens for muted surfaces and improves contrast in drawer sections.',
    url: 'https://gitlab.example.com/project/merge_requests/1244',
    status: 'Approved',
    projectOrRoomName: 'WorkBridge / UI',
    assigneeSummary: 'You',
    dueAt: null,
    updatedAt: '2026-03-16T10:12:00Z',
    rawJson: JSON.stringify({
      iid: 1244,
      projectId: 992,
      draft: false,
      reviewers: ['You'],
      assignees: ['You'],
      labels: ['ui', 'dark-mode'],
      approvals: { approved: true, approvalsLeft: 0, approvedBy: ['You'] },
      pipelineStatus: 'success',
      state: 'opened',
      updatedAt: '2026-03-16T10:12:00Z',
      sourceBranch: 'ui/dark-mode-polish'
    }),
    createdAt: '2026-03-08T11:00:00Z'
  },
  {
    id: 'gl-edge-long',
    source: 'gitlab',
    externalId: '2288',
    itemType: 'merge_request',
    title:
      'Refactor multi-tenant authorization middleware to handle nested policies, long audit trails, and legacy role compatibility across legacy and new admin surfaces (edge-case fixture)',
    bodySnippet:
      'This MR touches multiple permission layers and includes a very long branch name for stress testing: feature/permissions/multi-tenant/legacy-compatibility/rewrite/phase-2/with-super-long-context-and-tests',
    url: 'https://gitlab.example.com/platform/merge_requests/2288',
    status: 'Open',
    projectOrRoomName: 'Platform / Authorization / Policy Engine / Core',
    assigneeSummary: 'You, Morgan R., Lina T.',
    dueAt: null,
    updatedAt: '2026-03-18T12:10:00Z',
    rawJson: JSON.stringify({
      iid: 2288,
      projectId: 4451,
      draft: false,
      reviewers: ['Ava S.', 'Morgan R.', 'Lina T.', 'Quinn L.', 'Rhea V.', 'Sam D.', 'Taylor P.', 'Omar K.'],
      assignees: ['You', 'Morgan R.', 'Lina T.'],
      labels: ['security', 'auth', 'breaking-change'],
      approvals: { approved: false, approvalsLeft: 3, approvedBy: [] },
      pipelineStatus: 'failed',
      state: 'opened',
      updatedAt: '2026-03-18T12:10:00Z',
      sourceBranch:
        'feature/permissions/multi-tenant/legacy-compatibility/rewrite/phase-2/with-super-long-context-and-tests'
    }),
    createdAt: '2026-03-12T09:12:00Z'
  },
  {
    id: 'cu-901',
    source: 'clickup',
    externalId: '901',
    itemType: 'task',
    title: 'Finalize onboarding copy + visuals',
    bodySnippet: 'Update onboarding screens with calm language and inline examples.',
    url: 'https://app.clickup.com/t/901',
    status: 'In Progress',
    projectOrRoomName: 'Design / Onboarding',
    assigneeSummary: 'You, Morgan R.',
    dueAt: '2026-03-19T17:00:00Z',
    updatedAt: '2026-03-17T09:30:00Z',
    rawJson: JSON.stringify({
      listName: 'Onboarding',
      folderName: 'Design',
      spaceName: 'WorkBridge',
      status: 'In Progress',
      assignees: ['You', 'Morgan R.'],
      priority: 'High',
      equipe: 'Team A'
    }),
    createdAt: '2026-03-12T10:05:00Z'
  },
  {
    id: 'cu-914',
    source: 'clickup',
    externalId: '914',
    itemType: 'task',
    title: 'Define MVP sync health rules',
    bodySnippet: 'List errors, retries, and user-facing banners for GitLab + ClickUp.',
    url: 'https://app.clickup.com/t/914',
    status: 'Backlog',
    projectOrRoomName: 'Product / Sync',
    assigneeSummary: 'You',
    dueAt: null,
    updatedAt: '2026-03-14T13:05:00Z',
    rawJson: JSON.stringify({
      listName: 'Sync',
      folderName: 'Product',
      spaceName: 'WorkBridge',
      status: 'Backlog',
      assignees: ['You'],
      priority: 'Low',
      equipe: 'Team A'
    }),
    createdAt: '2026-03-11T09:45:00Z'
  },
  {
    id: 'cu-edge-long',
    source: 'clickup',
    externalId: '9876',
    itemType: 'task',
    title:
      'Reconcile multiple import pipelines with strict validation and provide a fallback pathway for incomplete records without losing auditability (edge-case fixture)',
    bodySnippet:
      'Ensure long status labels, list names, and URLs are handled gracefully in the UI for dense task rows.',
    url: 'https://app.clickup.com/t/9876',
    status: 'In Progress - awaiting dependency from upstream migration team',
    projectOrRoomName: 'Operations / Data Migration / Long Running Requests / FY26',
    assigneeSummary: 'You, Morgan R., Lina T., Ava S., Quinn L.',
    dueAt: null,
    updatedAt: '2026-03-18T11:00:00Z',
    rawJson: JSON.stringify({
      listName: 'Migration',
      folderName: 'Operations',
      spaceName: 'WorkBridge',
      status: 'In Progress - awaiting dependency from upstream migration team',
      assignees: ['You', 'Morgan R.', 'Lina T.', 'Ava S.', 'Quinn L.'],
      priority: 'Urgent',
      equipe: 'Team A'
    }),
    createdAt: '2026-03-10T09:00:00Z'
  },
  {
    id: 'cu-missing',
    source: 'clickup',
    externalId: '9999',
    itemType: 'task',
    title: 'Task with missing optional metadata',
    bodySnippet: '',
    url: 'https://app.clickup.com/t/9999',
    status: 'Open',
    projectOrRoomName: null,
    assigneeSummary: '',
    dueAt: null,
    updatedAt: '2026-03-18T10:00:00Z',
    rawJson: null,
    createdAt: '2026-03-18T09:00:00Z'
  },
  {
    id: 'rc-219',
    source: 'rocketchat',
    externalId: '219',
    itemType: 'message',
    title: 'Review request: cache invalidation MR',
    bodySnippet: 'Can you review MR !1241? Focus on edge-case tests and CI.',
    url: 'https://chat.example.com/channel/app?msg=219',
    status: 'Unread',
    projectOrRoomName: '#app-review',
    assigneeSummary: 'You',
    dueAt: null,
    updatedAt: '2026-03-18T07:40:00Z',
    rawJson: JSON.stringify({
      roomId: 'room-app-review',
      roomName: '#app-review',
      roomType: 'c',
      author: 'Morgan',
      reviewRequest: true,
      mrUrls: ['https://gitlab.example.com/project/merge_requests/1241']
    }),
    createdAt: '2026-03-18T07:40:00Z'
  },
  {
    id: 'rc-223',
    source: 'rocketchat',
    externalId: '223',
    itemType: 'message',
    title: 'Pipeline failed on UI polish MR',
    bodySnippet: 'Heads up: UI MR !1244 failed on lint step. Needs a quick pass.',
    url: 'https://chat.example.com/channel/app?msg=223',
    status: 'Unread',
    projectOrRoomName: '#release',
    assigneeSummary: 'You',
    dueAt: null,
    updatedAt: '2026-03-18T08:15:00Z',
    rawJson: JSON.stringify({
      roomId: 'room-release',
      roomName: '#release',
      roomType: 'c',
      author: 'Ava',
      reviewRequest: false,
      mrUrls: ['https://gitlab.example.com/project/merge_requests/1244']
    }),
    createdAt: '2026-03-18T08:15:00Z'
  },
  {
    id: 'rc-edge-long',
    source: 'rocketchat',
    externalId: '555',
    itemType: 'message',
    title: 'Long URL stress test',
    bodySnippet:
      'Please review https://gitlab.example.com/ultra/long/path/with/no/spaces/and/a/verylongbranchname/feature/this/is/a/very/long/branch/that/never/ends?param=withaveryverylongquerystringthatkeepsgoingandgoingandgoing for today.',
    url: 'https://chat.example.com/channel/review-support?msg=555',
    status: 'Unread',
    projectOrRoomName: 'Review Support / Team A / Urgent Release / Long Room Name Example',
    assigneeSummary: 'You',
    dueAt: null,
    updatedAt: '2026-03-18T09:15:00Z',
    rawJson: JSON.stringify({
      roomId: 'room-review-support',
      roomName: 'Review Support / Team A / Urgent Release / Long Room Name Example',
      roomType: 'c',
      author: 'Quinn',
      reviewRequest: true,
      mrUrls: ['https://gitlab.example.com/ultra/long/path/merge_requests/2288']
    }),
    createdAt: '2026-03-18T09:15:00Z'
  }
]

const demoPlanner = [
  {
    itemId: 'gl-1241',
    lane: 'today',
    priority: 'P1',
    pinned: true,
    personalNote: 'Review with tests first.',
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'cu-901',
    lane: 'this_week',
    priority: 'P2',
    pinned: false,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'rc-219',
    lane: 'inbox',
    priority: 'P1',
    pinned: true,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'cu-914',
    lane: 'later',
    priority: 'P3',
    pinned: false,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'gl-1244',
    lane: 'waiting',
    priority: 'P2',
    pinned: false,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'rc-223',
    lane: 'inbox',
    priority: 'P3',
    pinned: false,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'gl-edge-long',
    lane: 'inbox',
    priority: 'P1',
    pinned: true,
    personalNote: 'Edge-case MR with long content + many reviewers.',
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'cu-edge-long',
    lane: 'this_week',
    priority: 'P2',
    pinned: false,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'rc-edge-long',
    lane: 'inbox',
    priority: 'P2',
    pinned: false,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  },
  {
    itemId: 'cu-missing',
    lane: 'inbox',
    priority: 'P3',
    pinned: false,
    personalNote: null,
    plannedFor: null,
    updatedAt: nowIso()
  }
]

const demoLinks = [
  {
    id: 'lnk-1',
    fromItemId: 'rc-219',
    toItemId: 'gl-1241',
    relationType: 'review_request',
    origin: 'auto',
    confidence: 82,
    suggested: true,
    createdAt: '2026-03-18T07:45:00Z',
    confirmedAt: null
  },
  {
    id: 'lnk-2',
    fromItemId: 'cu-901',
    toItemId: 'gl-1244',
    relationType: 'relates_to',
    origin: 'manual',
    confidence: null,
    suggested: false,
    createdAt: '2026-03-16T11:15:00Z',
    confirmedAt: '2026-03-16T11:16:00Z'
  },
  {
    id: 'lnk-3',
    fromItemId: 'rc-edge-long',
    toItemId: 'gl-edge-long',
    relationType: 'review_request',
    origin: 'auto',
    confidence: 86,
    suggested: true,
    createdAt: '2026-03-18T09:16:00Z',
    confirmedAt: null
  },
  {
    id: 'lnk-4',
    fromItemId: 'cu-edge-long',
    toItemId: 'gl-edge-long',
    relationType: 'implements',
    origin: 'manual',
    confidence: null,
    suggested: false,
    createdAt: '2026-03-18T11:30:00Z',
    confirmedAt: '2026-03-18T11:30:10Z'
  },
  {
    id: 'lnk-5',
    fromItemId: 'cu-901',
    toItemId: 'gl-edge-long',
    relationType: 'references',
    origin: 'manual',
    confidence: null,
    suggested: false,
    createdAt: '2026-03-18T11:35:00Z',
    confirmedAt: '2026-03-18T11:35:10Z'
  },
  {
    id: 'lnk-6',
    fromItemId: 'gl-1241',
    toItemId: 'gl-edge-long',
    relationType: 'relates_to',
    origin: 'manual',
    confidence: null,
    suggested: false,
    createdAt: '2026-03-18T11:40:00Z',
    confirmedAt: '2026-03-18T11:40:10Z'
  },
  {
    id: 'lnk-7',
    fromItemId: 'rc-219',
    toItemId: 'gl-edge-long',
    relationType: 'review_request',
    origin: 'auto',
    confidence: 74,
    suggested: true,
    createdAt: '2026-03-18T11:45:00Z',
    confirmedAt: null
  },
  {
    id: 'lnk-8',
    fromItemId: 'gl-1244',
    toItemId: 'gl-edge-long',
    relationType: 'references',
    origin: 'manual',
    confidence: null,
    suggested: false,
    createdAt: '2026-03-18T11:50:00Z',
    confirmedAt: '2026-03-18T11:50:10Z'
  }
]

const demoConnections = [
  {
    id: 'conn-gitlab',
    source: 'gitlab',
    baseUrl: 'https://gitlab.example.com',
    accountLabel: 'WorkBridge',
    scopeJson: JSON.stringify({ projects: ['WorkBridge/App', 'WorkBridge/UI'] }),
    enabled: false,
    lastSyncAt: null,
    lastError: null
  },
  {
    id: 'conn-clickup',
    source: 'clickup',
    baseUrl: null,
    accountLabel: 'ClickUp',
    scopeJson: JSON.stringify({ lists: ['Onboarding', 'Sync'] }),
    enabled: false,
    lastSyncAt: null,
    lastError: null
  },
  {
    id: 'conn-rocketchat',
    source: 'rocketchat',
    baseUrl: 'https://chat.example.com',
    accountLabel: 'Rocket.Chat',
    scopeJson: JSON.stringify({ rooms: ['#app-review', '#release'] }),
    enabled: false,
    lastSyncAt: null,
    lastError: null
  }
]

export async function seedDemoData() {
  const existing = db.select().from(externalItems).all()
  if (existing.length > 0) {
    return
  }

  db.insert(externalItems).values(demoItems).run()
  db.insert(plannerState).values(demoPlanner).run()
  db.insert(links).values(demoLinks).run()
  db.insert(syncConnections)
    .values(demoConnections)
    .onConflictDoNothing()
    .run()
}
