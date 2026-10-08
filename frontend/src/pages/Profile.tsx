import { Link, useParams } from 'react-router-dom'
import { Briefcase, Calendar, ExternalLink, GraduationCap, Link2, MapPin, Pencil, Plus } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { IdeaCard, ProjectCard } from '../components/Cards'
import { RelationshipButton } from '../components/RelationshipButton'
import { SkillChips } from '../components/SkillChips'
import { ErrorNote, Loading } from '../components/states'
import { useIdeas, useProfile, useProjects } from '../hooks/queries'
import { ApiError } from '../lib/api'
import { fullDate, plural } from '../lib/format'

export default function ProfilePage() {
  const { id = '' } = useParams()
  const { data: profile, isLoading, error, refetch } = useProfile(id)
  const projects = useProjects({ ownerId: id, feed: 'recent' })
  const ideas = useIdeas({ authorId: id, feed: 'recent' })

  if (isLoading) return <Loading />
  if (error || !profile) {
    return (
      <div className="page page--narrow">
        <ErrorNote error={error instanceof ApiError && error.status === 404 ? new Error('No encontramos a esta persona.') : error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const isSelf = profile.relationship.state === 'self'
  const { work, study, links } = profile
  const projectItems = projects.data?.pages.flatMap((p) => p.items) ?? []
  const ideaItems = ideas.data?.pages.flatMap((p) => p.items) ?? []
  const hasLinks = links.github || links.website || links.linkedin

  return (
    <div className="page">
      <title>{`${profile.name} · CR Dev Community`}</title>

      <header className="profile-head glass">
        <Avatar name={profile.name} src={profile.avatarUrl} size={112} />
        <div className="profile-head__main">
          <h1>{profile.name}</h1>
          {profile.headline && <p className="lede">{profile.headline}</p>}
          <ul className="profile-head__meta muted">
            {profile.location && (
              <li>
                <MapPin size={15} /> {profile.location}
              </li>
            )}
            <li>
              <Calendar size={15} /> En la comunidad desde {fullDate(profile.createdAt)}
            </li>
          </ul>
        </div>
        <div className="profile-head__actions">
          {isSelf ? (
            <Link to="/me/edit" className="btn btn--glass">
              <Pencil size={16} /> Editar perfil
            </Link>
          ) : (
            <RelationshipButton userId={profile.id} userName={profile.name} relationship={profile.relationship} size="md" />
          )}
        </div>
        <dl className="profile-head__stats">
          <div>
            <dt>Amigos</dt>
            <dd>{profile.friendsCount}</dd>
          </div>
          <div>
            <dt>Proyectos</dt>
            <dd>{profile.projectsCount}</dd>
          </div>
          <div>
            <dt>Ideas</dt>
            <dd>{profile.ideasCount}</dd>
          </div>
        </dl>
      </header>

      <div className="detail-layout">
        <div className="stack" style={{ gap: '2.2rem' }}>
          {profile.bio && (
            <section className="section" aria-labelledby="sobre-mi">
              <h2 id="sobre-mi">Sobre {isSelf ? 'mí' : profile.name.split(' ')[0]}</h2>
              <div className="prose">{profile.bio}</div>
            </section>
          )}

          <section className="section" aria-labelledby="proyectos">
            <div className="section__head">
              <h2 id="proyectos">Proyectos</h2>
              {isSelf && (
                <Link to="/projects/new" className="btn btn--glass btn--sm">
                  <Plus size={15} /> Nuevo
                </Link>
              )}
            </div>
            {projects.isLoading ? (
              <Loading />
            ) : projectItems.length === 0 ? (
              <p className="muted">{isSelf ? 'Aún no has publicado proyectos.' : `${profile.name.split(' ')[0]} aún no ha publicado proyectos.`}</p>
            ) : (
              <div className="card-grid">
                {projectItems.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </section>

          <section className="section" aria-labelledby="ideas">
            <div className="section__head">
              <h2 id="ideas">Ideas</h2>
              <span className="faint small">{plural(profile.ideasCount, 'idea', 'ideas')}</span>
            </div>
            {ideas.isLoading ? (
              <Loading />
            ) : ideaItems.length === 0 ? (
              <p className="muted">{isSelf ? 'Aún no has compartido ideas.' : 'Todavía no ha compartido ideas.'}</p>
            ) : (
              <div className="stack">
                {ideaItems.map((i) => (
                  <IdeaCard key={i.id} idea={i} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="stack detail-aside">
          <section className="glass glass--quiet aside-card">
            <h3>Habilidades</h3>
            {profile.skills.length > 0 ? (
              <SkillChips skills={profile.skills} highlightMine={!isSelf} />
            ) : (
              <p className="muted small">{isSelf ? 'Agrega tus habilidades para que te encuentren.' : 'Aún no ha indicado habilidades.'}</p>
            )}
          </section>

          {(work || study) && (
            <section className="glass glass--quiet aside-card">
              <h3>Trayectoria</h3>
              <ul className="facts">
                {work && (
                  <li>
                    <Briefcase size={17} />
                    <span>
                      <small className="label-sm">Trabaja</small>
                      <strong>{work.role ?? work.company}</strong>
                      {work.role && work.company && <span className="muted"> en {work.company}</span>}
                    </span>
                  </li>
                )}
                {study && (
                  <li>
                    <GraduationCap size={17} />
                    <span>
                      <small className="label-sm">Estudia</small>
                      <strong>{study.program ?? study.institution}</strong>
                      {study.program && study.institution && <span className="muted"> en {study.institution}</span>}
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}

          {hasLinks && (
            <section className="glass glass--quiet aside-card">
              <h3>Enlaces</h3>
              <ul className="links">
                {links.website && (
                  <li>
                    <a href={links.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={15} /> Sitio web
                    </a>
                  </li>
                )}
                {links.github && (
                  <li>
                    <a href={links.github} target="_blank" rel="noopener noreferrer">
                      <Link2 size={15} /> GitHub
                    </a>
                  </li>
                )}
                {links.linkedin && (
                  <li>
                    <a href={links.linkedin} target="_blank" rel="noopener noreferrer">
                      <Link2 size={15} /> LinkedIn
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
