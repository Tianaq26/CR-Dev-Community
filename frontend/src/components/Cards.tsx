import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Briefcase, GraduationCap, HandHeart, Heart, MapPin, MessageCircle, Sparkles, Users } from 'lucide-react'
import { api } from '../lib/api'
import { hashIndex, STATUS_LABEL, studyLine, timeAgo, workLine } from '../lib/format'
import { mediaUrl } from '../lib/media'
import type { IdeaCard as IdeaCardData, InterestState, ProjectCard as ProjectCardData, ProjectStatus, UserCard } from '../lib/types'
import { useToast } from './Toast'
import { Avatar } from './Avatar'
import { RelationshipButton } from './RelationshipButton'
import { SkillChips } from './SkillChips'

export function StatusStamp({ status }: { status: ProjectStatus }) {
  return <span className={`stamp stamp--${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
}

const COVERS = [
  ['#d9b98b', '#b98f5f'],
  ['#d7a77c', '#a8603a'],
  ['#c9c496', '#8a9560'],
  ['#e2c58b', '#bb8a2f'],
  ['#c7a58a', '#8f5f49'],
]

/** Used when a project has no photo yet: a woodcut-style tile with the project's initial. */
export function CoverPlaceholder({ title }: { title: string }) {
  const [a, b] = COVERS[hashIndex(title, COVERS.length)]
  return (
    <div className="cover-ph" style={{ background: `linear-gradient(145deg, ${a}, ${b})` }} aria-hidden="true">
      <span>{title.trim()[0]?.toUpperCase() ?? '·'}</span>
    </div>
  )
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const openRoles = project.roles.filter((r) => r.isOpen)
  const cover = mediaUrl(project.coverUrl)
  return (
    <article className="pcard glass glass--lift">
      <div className="pcard__cover">
        {cover ? <img src={cover} alt="" loading="lazy" /> : <CoverPlaceholder title={project.title} />}
        <div className="pcard__cover-badges">
          <StatusStamp status={project.status} />
        </div>
      </div>

      <div className="pcard__body">
        {project.matchCount > 0 && (
          <span className="chip chip--match pcard__match">
            <Sparkles size={13} /> Encaja contigo
          </span>
        )}
        <h3 className="pcard__title">
          <Link to={`/projects/${project.id}`} className="stretched">
            {project.title}
          </Link>
        </h3>
        <p className="pcard__summary">{project.summary}</p>

        {openRoles.length > 0 ? (
          <div className="pcard__roles">
            <span className="label-sm">Se busca</span>
            <ul className="chips">
              {openRoles.slice(0, 4).map((role) => (
                <li key={role.id} className={`chip ${role.isMatch ? 'chip--match' : 'chip--open'}`}>
                  {role.skill}
                </li>
              ))}
              {openRoles.length > 4 && <li className="chip">+{openRoles.length - 4}</li>}
            </ul>
          </div>
        ) : (
          <div className="pcard__roles">
            <span className="label-sm faint">Equipo completo por ahora</span>
          </div>
        )}
      </div>

      <footer className="pcard__foot">
        <Link to={`/people/${project.owner.id}`} className="byline">
          <Avatar name={project.owner.name} src={project.owner.avatarUrl} size={28} />
          <span>{project.owner.name}</span>
        </Link>
        <span className="faint small row" style={{ gap: '0.6rem' }}>
          <span title="Integrantes">
            <Users size={13} style={{ verticalAlign: '-2px' }} /> {project.membersCount}
          </span>
          <span>{timeAgo(project.createdAt)}</span>
        </span>
      </footer>
    </article>
  )
}

export function IdeaCard({ idea }: { idea: IdeaCardData }) {
  const client = useQueryClient()
  const toast = useToast()
  const toggle = useMutation({
    mutationFn: () =>
      idea.interested
        ? api.del<InterestState>(`/api/ideas/${idea.id}/interest`)
        : api.put<InterestState>(`/api/ideas/${idea.id}/interest`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['ideas'] })
      void client.invalidateQueries({ queryKey: ['idea', idea.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <article className="icard glass glass--lift">
      <header className="row row--between" style={{ alignItems: 'flex-start' }}>
        <Link to={`/people/${idea.author.id}`} className="byline">
          <Avatar name={idea.author.name} src={idea.author.avatarUrl} size={34} />
          <span>
            <strong>{idea.author.name}</strong>
            <small className="faint">{timeAgo(idea.createdAt)}</small>
          </span>
        </Link>
        {idea.isMatch && (
          <span className="chip chip--match">
            <Sparkles size={13} /> Busca lo que haces
          </span>
        )}
      </header>

      <h3 className="icard__title">
        <Link to={`/ideas/${idea.id}`} className="stretched">
          {idea.title}
        </Link>
      </h3>
      <p className="icard__excerpt">{idea.excerpt}</p>
      {idea.tags.length > 0 && (
        <div className="stack stack--sm">
          <span className="label-sm">Busca</span>
          <SkillChips skills={idea.tags} highlightMine />
        </div>
      )}

      <footer className="icard__foot">
        <button
          type="button"
          className={`pill-btn ${idea.interested ? 'is-on' : ''}`}
          aria-pressed={idea.interested}
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
        >
          <Heart size={15} fill={idea.interested ? 'currentColor' : 'none'} /> {idea.interest}
          <span className="sr-only"> me interesa</span>
        </button>
        <span className="faint small row" style={{ gap: '1rem' }}>
          <span title="Feedback">
            <MessageCircle size={14} style={{ verticalAlign: '-2px' }} /> {idea.feedbackCount}
          </span>
          <span title="Personas que quieren ayudar">
            <HandHeart size={14} style={{ verticalAlign: '-2px' }} /> {idea.helpCount}
          </span>
        </span>
      </footer>
    </article>
  )
}

export function PersonCard({ person }: { person: UserCard }) {
  const work = workLine(person.work)
  const study = studyLine(person.study)
  return (
    <article className="person glass glass--lift">
      <Link to={`/people/${person.id}`} className="person__avatar" aria-label={`Ver perfil de ${person.name}`}>
        <Avatar name={person.name} src={person.avatarUrl} size={56} />
      </Link>
      <div className="person__main">
        <h3>
          <Link to={`/people/${person.id}`} className="plain">
            {person.name}
          </Link>
        </h3>
        {person.headline && <p className="muted small">{person.headline}</p>}
        <ul className="person__meta faint small">
          {person.location && (
            <li>
              <MapPin size={13} /> {person.location}
            </li>
          )}
          {work && (
            <li>
              <Briefcase size={13} /> {work}
            </li>
          )}
          {study && (
            <li>
              <GraduationCap size={13} /> {study}
            </li>
          )}
        </ul>
        <SkillChips skills={person.skills} highlightMine limit={6} />
      </div>
      <div className="person__action">
        <RelationshipButton userId={person.id} userName={person.name} relationship={person.relationship} />
      </div>
    </article>
  )
}
