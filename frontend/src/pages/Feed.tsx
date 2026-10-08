import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Lightbulb, Plus, Search, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { ProjectCard } from '../components/Cards'
import { RelationshipButton } from '../components/RelationshipButton'
import { EmptyState, ErrorNote, Loading, LoadMore } from '../components/states'
import { Tabs } from '../components/Tabs'
import { useFriendSuggestions, useIdeas, useInboxCount, useProjects, type ProjectFilters } from '../hooks/queries'
import { useDebounced } from '../hooks/useDebounced'
import { timeAgo } from '../lib/format'

type FeedTab = NonNullable<ProjectFilters['feed']>

function Aside() {
  const { data: count } = useInboxCount()
  const { data: ideas } = useIdeas({ feed: 'recent' })
  const { data: suggestions } = useFriendSuggestions()
  const recentIdeas = ideas?.pages[0]?.items.slice(0, 3) ?? []
  const pending = count?.pending ?? 0

  return (
    <aside className="feed-aside" aria-label="Para ti">
      {pending > 0 && (
        <Link to="/inbox" className="aside-alert glass glass--tint-ochre glass--lift">
          <Inbox size={20} />
          <span>
            Tienes <strong>{pending}</strong> {pending === 1 ? 'cosa pendiente' : 'cosas pendientes'} en tu bandeja
          </span>
        </Link>
      )}

      <section className="glass glass--quiet aside-card">
        <header className="row row--between">
          <h3>Ideas recientes</h3>
          <Link to="/ideas" className="small">
            Ver todas
          </Link>
        </header>
        {recentIdeas.length === 0 ? (
          <p className="muted small">Todavía no hay ideas. ¡Comparte la primera!</p>
        ) : (
          <ul className="aside-list">
            {recentIdeas.map((idea) => (
              <li key={idea.id}>
                <Link to={`/ideas/${idea.id}`} className="plain">
                  <strong>{idea.title}</strong>
                  <small className="faint">
                    {idea.author.name} · {timeAgo(idea.createdAt)}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/ideas" className="btn btn--glass btn--sm">
          <Lightbulb size={15} /> Compartir una idea
        </Link>
      </section>

      {suggestions && suggestions.length > 0 && (
        <section className="glass glass--quiet aside-card">
          <header className="row row--between">
            <h3>Personas que quizá conozcas</h3>
            <Link to="/people" className="small">
              Más
            </Link>
          </header>
          <ul className="aside-people">
            {suggestions.slice(0, 4).map((p) => (
              <li key={p.id}>
                <Link to={`/people/${p.id}`} className="byline">
                  <Avatar name={p.name} src={p.avatarUrl} size={38} />
                  <span>
                    <strong>{p.name}</strong>
                    <small className="faint">{p.skills.slice(0, 2).join(' · ') || p.headline}</small>
                  </span>
                </Link>
                <RelationshipButton userId={p.id} userName={p.name} relationship={p.relationship} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}

export default function FeedPage() {
  const { user } = useAuth()
  const hasSkills = (user?.skills.length ?? 0) > 0
  const [tab, setTab] = useState<FeedTab>(hasSkills ? 'foryou' : 'recent')
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim(), 300)

  const projects = useProjects({ feed: tab, q: q || undefined })
  const items = projects.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Tu tablero</p>
        <div className="page-head__row">
          <h1>Lo que se está construyendo</h1>
          <Link to="/projects/new" className="btn btn--primary">
            <Plus size={17} /> Publicar proyecto
          </Link>
        </div>
        <hr className="rule" />
      </header>

      <div className="feed-layout">
        <div>
          <div className="toolbar">
            <Tabs
              label="Qué proyectos ver"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'foryou', label: 'Para ti' },
                { value: 'recent', label: 'Recientes' },
                { value: 'friends', label: 'De amigos' },
              ]}
            />
            <div className="search">
              <Search size={17} />
              <input
                className="input"
                type="search"
                placeholder="Buscar por título o habilidad…"
                aria-label="Buscar proyectos"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {tab === 'foryou' && !hasSkills && (
            <div className="hint glass glass--tint-ochre">
              <p>
                <strong>Cuéntanos qué sabes hacer.</strong> Con tus habilidades en el perfil, aquí verás primero los
                proyectos que buscan justo eso.
              </p>
              <Link to="/me/edit" className="btn btn--primary btn--sm">
                Completar mi perfil
              </Link>
            </div>
          )}

          {projects.isLoading ? (
            <Loading />
          ) : projects.isError ? (
            <ErrorNote error={projects.error} onRetry={() => void projects.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={tab === 'friends' ? <Users size={26} /> : <Search size={26} />}
              title={
                q
                  ? 'No encontramos proyectos con esa búsqueda'
                  : tab === 'foryou'
                    ? 'Aún no hay proyectos que busquen lo que haces'
                    : tab === 'friends'
                      ? 'Tus amigos todavía no publicaron proyectos'
                      : 'Todavía no hay proyectos'
              }
            >
              {tab === 'foryou' && !q && (
                <p>
                  Prueba con <button type="button" className="linklike" onClick={() => setTab('recent')}>los más recientes</button> o
                  agrega más habilidades a tu perfil.
                </p>
              )}
              {tab === 'friends' && !q && (
                <p>
                  <Link to="/people">Encuentra personas</Link> y agrégalas como amigos para ver lo que publican.
                </p>
              )}
              {tab === 'recent' && !q && (
                <p>
                  Sé la primera persona en <Link to="/projects/new">publicar uno</Link>.
                </p>
              )}
            </EmptyState>
          ) : (
            <>
              <div className="card-grid card-grid--feed">
                {items.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
              <LoadMore hasMore={!!projects.hasNextPage} loading={projects.isFetchingNextPage} onClick={() => void projects.fetchNextPage()} />
            </>
          )}
        </div>

        <Aside />
      </div>
    </div>
  )
}
