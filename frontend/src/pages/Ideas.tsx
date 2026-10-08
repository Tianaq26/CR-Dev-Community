import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Plus, Search } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { IdeaCard } from '../components/Cards'
import { IdeaForm } from '../components/IdeaForm'
import { EmptyState, ErrorNote, Loading, LoadMore } from '../components/states'
import { Tabs } from '../components/Tabs'
import { useToast } from '../components/Toast'
import { useIdeas, type IdeaFilters } from '../hooks/queries'
import { useDebounced } from '../hooks/useDebounced'
import { api } from '../lib/api'
import type { IdeaDetail } from '../lib/types'

type Tab = NonNullable<IdeaFilters['feed']>

export default function IdeasPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const toast = useToast()
  const [composing, setComposing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('recent')
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim(), 300)

  const ideas = useIdeas({ feed: tab, q: q || undefined })
  const items = ideas.data?.pages.flatMap((p) => p.items) ?? []

  const create = useMutation({
    mutationFn: (v: { title: string; body: string; tags: string[] }) => api.post<IdeaDetail>('/api/ideas', v),
    onSuccess: (idea) => {
      void client.invalidateQueries({ queryKey: ['ideas'] })
      toast.success('Idea publicada.')
      navigate(`/ideas/${idea.id}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <p className="eyebrow">Ideas</p>
        <div className="page-head__row">
          <h1>Ideas en borrador</h1>
          {!composing && (
            <button type="button" className="btn btn--primary" onClick={() => setComposing(true)}>
              <Plus size={17} /> Compartir una idea
            </button>
          )}
        </div>
        <p className="lede">
          Antes de ser un proyecto, casi todo es una idea. Compártela y deja que otros opinen o levanten la mano para
          ayudarte.
        </p>
        <hr className="rule" />
      </header>

      {composing && (
        <section className="glass glass--dense form-card" style={{ marginBottom: '1.75rem' }}>
          <h2>Nueva idea</h2>
          <IdeaForm
            submitLabel="Publicar idea"
            busy={create.isPending}
            error={error}
            onSubmit={(v) => {
              setError(null)
              create.mutate(v)
            }}
            onCancel={() => setComposing(false)}
          />
        </section>
      )}

      <div className="toolbar">
        <Tabs
          label="Qué ideas ver"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'recent', label: 'Recientes' },
            { value: 'foryou', label: 'Para ti' },
            { value: 'friends', label: 'De amigos' },
          ]}
        />
        <div className="search">
          <Search size={17} />
          <input className="input" type="search" placeholder="Buscar ideas…" aria-label="Buscar ideas" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {tab === 'foryou' && (user?.skills.length ?? 0) === 0 && (
        <p className="muted small" style={{ marginBottom: '1rem' }}>
          Agrega habilidades a tu perfil para ver aquí las ideas que necesitan lo que sabes hacer.
        </p>
      )}

      {ideas.isLoading ? (
        <Loading />
      ) : ideas.isError ? (
        <ErrorNote error={ideas.error} onRetry={() => void ideas.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Lightbulb size={26} />} title={q ? 'No encontramos ideas con esa búsqueda' : 'Aún no hay ideas por aquí'}>
          {!q && tab === 'recent' && <p>Sé la primera persona en compartir una.</p>}
          {!q && tab !== 'recent' && <p>Cambia a «Recientes» para ver todas las ideas de la comunidad.</p>}
        </EmptyState>
      ) : (
        <>
          <div className="stack">
            {items.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
          <LoadMore hasMore={!!ideas.hasNextPage} loading={ideas.isFetchingNextPage} onClick={() => void ideas.fetchNextPage()} />
        </>
      )}
    </div>
  )
}
