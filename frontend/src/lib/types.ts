export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface UserBrief {
  id: string
  name: string
  headline: string | null
  avatarUrl: string | null
}

export type RelationshipState = 'self' | 'none' | 'friends' | 'requestSent' | 'requestReceived'
export interface Relationship {
  state: RelationshipState
  requestId: string | null
}

export interface WorkInfo {
  company: string | null
  role: string | null
}
export interface StudyInfo {
  institution: string | null
  program: string | null
}

export interface UserCard {
  id: string
  name: string
  headline: string | null
  location: string | null
  avatarUrl: string | null
  skills: string[]
  work: WorkInfo | null
  study: StudyInfo | null
  relationship: Relationship
  sharedSkills: number
}

export interface UserProfile {
  id: string
  email: string | null
  name: string
  headline: string | null
  location: string | null
  bio: string | null
  avatarUrl: string | null
  skills: string[]
  work: WorkInfo | null
  study: StudyInfo | null
  links: { github: string | null; website: string | null; linkedin: string | null }
  createdAt: string
  relationship: Relationship
  friendsCount: number
  projectsCount: number
  ideasCount: number
}

export interface AuthResponse {
  token: string
  user: UserProfile
}

export type ProjectStatus = 'Planning' | 'Building' | 'Paused' | 'Launched'
export type MediaKind = 'Image' | 'Video'

export interface RoleView {
  id: string
  title: string
  skill: string
  description: string | null
  isOpen: boolean
  isMatch: boolean
}

export interface ProjectCard {
  id: string
  title: string
  summary: string
  status: ProjectStatus
  createdAt: string
  owner: UserBrief
  coverUrl: string | null
  roles: RoleView[]
  membersCount: number
  matchCount: number
}

export interface MediaView {
  id: string
  kind: MediaKind
  url: string
}

export interface MemberView {
  user: UserBrief
  roleTitle: string
  joinedAt: string
}

export type JoinRequestStatus = 'Pending' | 'Accepted' | 'Declined'

export interface MyApplication {
  id: string
  status: JoinRequestStatus
  roleId: string | null
}

export interface ProjectDetail {
  id: string
  title: string
  summary: string
  description: string
  status: ProjectStatus
  repoUrl: string | null
  demoUrl: string | null
  createdAt: string
  updatedAt: string
  owner: UserBrief
  media: MediaView[]
  roles: RoleView[]
  members: MemberView[]
  isOwner: boolean
  isMember: boolean
  myApplication: MyApplication | null
  pendingRequests: number
}

export interface RoleSuggestions {
  roleId: string
  roleTitle: string
  skill: string
  people: UserCard[]
}

export interface FriendRequestView {
  id: string
  user: UserBrief
  createdAt: string
}

export interface FriendRequestsView {
  incoming: FriendRequestView[]
  outgoing: FriendRequestView[]
}

export interface JoinRequestReceived {
  id: string
  projectId: string
  projectTitle: string
  roleTitle: string | null
  applicant: UserBrief
  applicantSkills: string[]
  message: string
  createdAt: string
}

export interface JoinRequestSent {
  id: string
  projectId: string
  projectTitle: string
  roleTitle: string | null
  status: JoinRequestStatus
  createdAt: string
  respondedAt: string | null
}

export interface InboxView {
  friendRequests: FriendRequestView[]
  received: JoinRequestReceived[]
  sent: JoinRequestSent[]
  pending: number
}

export type CommentKind = 'Feedback' | 'Help'

export interface IdeaCard {
  id: string
  title: string
  excerpt: string
  tags: string[]
  author: UserBrief
  createdAt: string
  interest: number
  feedbackCount: number
  helpCount: number
  interested: boolean
  isMatch: boolean
}

export interface CommentView {
  id: string
  kind: CommentKind
  body: string
  author: UserBrief
  createdAt: string
  canDelete: boolean
}

export interface IdeaDetail {
  id: string
  title: string
  body: string
  tags: string[]
  author: UserBrief
  createdAt: string
  interest: number
  interested: boolean
  isOwner: boolean
  comments: CommentView[]
}

export interface SkillCatalog {
  groups: { name: string; skills: string[] }[]
  community: string[]
}

export interface Stats {
  members: number
  projects: number
  ideas: number
}

/** Shapes sent to the API when saving. */
export interface ProjectInput {
  title: string
  summary: string
  description: string
  status: ProjectStatus
  repoUrl: string
  demoUrl: string
  media: { kind: MediaKind; url: string }[]
  roles: { id?: string; title: string; skill: string; description: string; isOpen: boolean }[]
}

export interface ProfileInput {
  name: string
  headline: string
  location: string
  bio: string
  avatarUrl: string
  workCompany: string
  workRole: string
  studyInstitution: string
  studyProgram: string
  githubUrl: string
  websiteUrl: string
  linkedinUrl: string
  skills: string[]
}

export interface InterestState {
  interested: boolean
  interest: number
}
