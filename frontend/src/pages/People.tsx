import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { PersonCard } from '../components/Cards'
import { EmptyState, ErrorNote, Loading, LoadMore } from '../components/states'
import { Tabs } from '../components/Tabs'
import { useFriendRequests, useFriends, useFriendSuggestions, usePeople, useSkillCatalog } from '../hooks/queries'
import { useDebounced } from '../hooks/useDebounced'

type Tab = 'discover' | 'friends'

export default function PeoplePage() {
  const [tab, setTab] = useState<Tab>('discover')
  const [search, setSearch] = useState('')
  const [skill, setSkill] = useState('')
  const q = useDebounced(search.trim(), 300)

  const { data: catalog } = useSkillCatalog()
  const people = usePeople({ q: q || undefined, skill: skill || undefined })
  const friends = useFriends()
  const requests = useFriendRequests()
  const suggestions = useFriendSuggestions()

  const everyone = people.data?.pages.flatMap((p) => p.items) ?? []
  const filtering = Boolean(q || skill)
  const incoming = requests.data?.incoming.length ?? 0

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <p className="eyebrow">Personas</p>
        <div className="page-head__row">
          <h1>Conoce a quien construye</h1>
        </div>
        <p className="lede">Busca por nombre o habilidad, agrega amigos y mira en qué proyectos andan.</p>
        <hr className="rule" />
      </header>

      <div className="toolbar">
        <Tabs
          label="Personas"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'discover', label: 'Descubrir' },
            { value: 'friends', label: `Mis amigos${friends.data ? ` (${friends.data.length})` : ''}` },
          ]}
        />
      </div>

      {tab === 'discover' ? (
        <>
          <div className="toolbar">
            <div className="search">
              <Search size={17} />
              <input className="input" type="search" placeholder="Buscar por nombre, ciudad o habilidad…" aria-label="Buscar personas" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="select" style={{ width: 'auto', minWidth: '12rem', borderRadius: '999px' }} aria-label="Filtrar por habilidad" value={skill} onChange={(e) => setSkill(e.target.value)}>
              <option value="">Todas las habilidades</option>
              {catalog?.groups.map((g) => (
                <optgroup key={g.name} label={g.name}>
                  {g.skills.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {!filtering && suggestions.data && suggestions.data.length > 0 && (
            <section className="section" style={{ marginBottom: '2rem' }}>
              <div className="section__head">
                <h2>Quizá las conozcas</h2>
              </div>
              <div className="stack stack--sm">
                {suggestions.data.slice(0, 3).map((p) => (
                  <PersonCard key={p.id} person={p} />
                ))}
              </div>
            </section>
          )}

          <section className="section">
            {!filtering && (
              <div className="section__head">
                <h2>Toda la comunidad</h2>
              </div>
            )}
            {people.isLoading ? (
              <Loading />
            ) : people.isError ? (
              <ErrorNote error={people.error} onRetry={() => void people.refetch()} />
            ) : everyone.length === 0 ? (
              <EmptyState icon={<Users size={26} />} title="No encontramos a nadie con esos criterios">
                <p>Prueba con otra palabra o quita el filtro de habilidad.</p>
              </EmptyState>
            ) : (
              <>
                <div className="stack stack--sm">
                  {everyone.map((p) => (
                    <PersonCard key={p.id} person={p} />
                  ))}
                </div>
                <LoadMore hasMore={!!people.hasNextPage} loading={people.isFetchingNextPage} onClick={() => void people.fetchNextPage()} />
              </>
            )}
          </section>
        </>
      ) : (
        <>
          {incoming > 0 && (
            <Link to="/inbox" className="aside-alert glass glass--tint-ochre glass--lift" style={{ marginBottom: '1.25rem' }}>
              <Users size={20} />
              <span>
                Tienes <strong>{incoming}</strong> {incoming === 1 ? 'solicitud de amistad' : 'solicitudes de amistad'} por responder
              </span>
            </Link>
          )}
          {friends.isLoading ? (
            <Loading />
          ) : friends.isError ? (
            <ErrorNote error={friends.error} onRetry={() => void friends.refetch()} />
          ) : (friends.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<Users size={26} />} title="Aún no tienes amigos agregados">
              <p>
                Ve a <button type="button" className="linklike" onClick={() => setTab('discover')}>Descubrir</button> y agrega a quienes te interesen.
              </p>
            </EmptyState>
          ) : (
            <div className="stack stack--sm">
              {friends.data!.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
