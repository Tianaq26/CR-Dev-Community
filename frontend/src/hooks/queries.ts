import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../components/Toast'
import { api, qs } from '../lib/api'
import type {
  FriendRequestsView,
  IdeaCard,
  IdeaDetail,
  InboxView,
  Paged,
  ProjectCard,
  ProjectDetail,
  Relationship,
  RoleSuggestions,
  JoinRequestReceived,
  SkillCatalog,
  Stats,
  UserCard,
  UserProfile,
} from '../lib/types'

const PAGE = 9

function usePaged<T>(key: unknown[], path: string, params: Record<string, string | number | undefined | null>) {
  return useInfiniteQuery({
    queryKey: [...key, params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<Paged<T>>(`${path}${qs({ ...params, page: pageParam, pageSize: PAGE })}`),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })
}

export interface ProjectFilters {
  feed?: 'recent' | 'foryou' | 'friends'
  q?: string
  skill?: string
  ownerId?: string
}
export const useProjects = (filters: ProjectFilters) => usePaged<ProjectCard>(['projects'], '/api/projects', { ...filters })

export interface IdeaFilters {
  feed?: 'recent' | 'foryou' | 'friends'
  q?: string
  authorId?: string
}
export const useIdeas = (filters: IdeaFilters) => usePaged<IdeaCard>(['ideas'], '/api/ideas', { ...filters })

export const usePeople = (filters: { q?: string; skill?: string }) => usePaged<UserCard>(['people'], '/api/users', { ...filters })

export const useProject = (id: string) =>
  useQuery({ queryKey: ['project', id], queryFn: () => api.get<ProjectDetail>(`/api/projects/${id}`), enabled: Boolean(id) })

export const useProjectSuggestions = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: ['project', id, 'suggestions'],
    queryFn: () => api.get<RoleSuggestions[]>(`/api/projects/${id}/suggestions`),
    enabled,
  })

export const useProjectRequests = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: ['project', id, 'requests'],
    queryFn: () => api.get<JoinRequestReceived[]>(`/api/projects/${id}/requests`),
    enabled,
  })

export const useIdea = (id: string) =>
  useQuery({ queryKey: ['idea', id], queryFn: () => api.get<IdeaDetail>(`/api/ideas/${id}`), enabled: Boolean(id) })

export const useProfile = (id: string) =>
  useQuery({ queryKey: ['profile', id], queryFn: () => api.get<UserProfile>(`/api/users/${id}`) })

export const useInbox = () => useQuery({ queryKey: ['inbox'], queryFn: () => api.get<InboxView>('/api/inbox') })

export const useInboxCount = () =>
  useQuery({
    queryKey: ['inbox-count'],
    queryFn: () => api.get<{ pending: number }>('/api/inbox/count'),
    refetchInterval: 60_000,
  })

export const useFriends = () => useQuery({ queryKey: ['friends'], queryFn: () => api.get<UserCard[]>('/api/friends') })

export const useFriendRequests = () =>
  useQuery({ queryKey: ['friend-requests'], queryFn: () => api.get<FriendRequestsView>('/api/friends/requests') })

export const useFriendSuggestions = () =>
  useQuery({ queryKey: ['friend-suggestions'], queryFn: () => api.get<UserCard[]>('/api/friends/suggestions') })

export const useSkillCatalog = () =>
  useQuery({ queryKey: ['skills'], queryFn: () => api.get<SkillCatalog>('/api/skills'), staleTime: 10 * 60_000 })

export const useStats = () =>
  useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/api/stats'), staleTime: 5 * 60_000 })

/** Everything that depends on who my friends are or what is waiting for me. */
export function useRefreshSocial() {
  const client = useQueryClient()
  return () => {
    for (const key of ['inbox', 'inbox-count', 'friends', 'friend-requests', 'friend-suggestions', 'people', 'profile', 'projects', 'ideas']) {
      void client.invalidateQueries({ queryKey: [key] })
    }
  }
}

export function useFriendActions() {
  const refresh = useRefreshSocial()
  const toast = useToast()
  const done = { onSuccess: refresh, onError: (e: Error) => toast.error(e.message) }
  return {
    send: useMutation({ mutationFn: (userId: string) => api.post<Relationship>('/api/friends/requests', { userId }), ...done }),
    accept: useMutation({ mutationFn: (requestId: string) => api.post<Relationship>(`/api/friends/requests/${requestId}/accept`), ...done }),
    decline: useMutation({ mutationFn: (requestId: string) => api.post(`/api/friends/requests/${requestId}/decline`), ...done }),
    remove: useMutation({ mutationFn: (userId: string) => api.del(`/api/friends/${userId}`), ...done }),
  }
}
