import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, HandHeart, Lightbulb, MessageCircle, Sparkles } from 'lucide-react'
import { Tabs } from '../components/Tabs'
import { useStats } from '../hooks/queries'

interface Example {
  key: string
  tab: string
  project: { stamp: string; title: string; text: string; roles: { skill: string; match: boolean }[] }
  person: { initials: string; color: string; name: string; headline: string; skills: { skill: string; match: boolean }[] }
}

const EXAMPLES: Example[] = [
  {
    key: 'libro',
    tab: 'Libro ilustrado',
    project: {
      stamp: 'En desarrollo',
      title: 'Cuentos del Cafetal',
      text: 'Libro ilustrado e interactivo con relatos orales de familias cafetaleras.',
      roles: [
        { skill: 'Músico', match: true },
        { skill: 'Frontend', match: false },
      ],
    },
    person: {
      initials: 'MS',
      color: '#8f6a45',
      name: 'Mateo Salazar',
      headline: 'Músico y productor',
      skills: [
        { skill: 'Músico', match: true },
        { skill: 'Composición', match: false },
      ],
    },
  },
  {
    key: 'juego',
    tab: 'Videojuego',
    project: {
      stamp: 'En desarrollo',
      title: 'Chucho en la Cuadra',
      text: 'Juego de plataformas en 2D: un perro callejero recorre su cuadra buscando a su dueña. Hay tres niveles listos; faltan los fondos y la música.',
      roles: [
        { skill: 'Ilustración', match: true },
        { skill: 'Músico', match: false },
      ],
    },
    person: {
      initials: 'VC',
      color: '#7b8650',
      name: 'Valeria Cruz',
      headline: 'Ilustradora de pixel art',
      skills: [
        { skill: 'Ilustración', match: true },
        { skill: 'Animación', match: false },
      ],
    },
  },
]

const ROTATE_MS = 7000

/** Two sample matches, one at a time. They rotate by themselves until the visitor picks one. */
function MatchIllustration() {
  const [index, setIndex] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), ROTATE_MS)
    return () => window.clearInterval(id)
  }, [auto])

  const ex = EXAMPLES[index]
  return (
    <div className="match-art-wrap">
      <Tabs
        label="Ejemplos de cómo encajan proyectos y personas"
        value={ex.key}
        onChange={(key) => {
          setAuto(false)
          setIndex(EXAMPLES.findIndex((e) => e.key === key))
        }}
        items={EXAMPLES.map((e) => ({ value: e.key, label: e.tab }))}
      />
      <div className="match-art" key={ex.key} aria-live="polite">
        <div className="match-art__project glass">
          <span className="stamp stamp--building">{ex.project.stamp}</span>
          <h3>{ex.project.title}</h3>
          <p>{ex.project.text}</p>
          <div className="stack stack--sm">
            <span className="label-sm">Se busca</span>
            <div className="chips">
              {ex.project.roles.map((r) => (
                <span key={r.skill} className={`chip ${r.match ? 'chip--match' : 'chip--open'}`}>
                  {r.skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="match-art__link">
          <span className="chip chip--match">
            <Sparkles size={13} /> Encaja
          </span>
        </div>

        <div className="match-art__person glass glass--dense">
          <span className="avatar avatar--initials" style={{ '--size': '46px', '--bg': ex.person.color } as CSSProperties}>
            {ex.person.initials}
          </span>
          <div>
            <strong>{ex.person.name}</strong>
            <p className="small muted">{ex.person.headline}</p>
            <div className="chips" style={{ marginTop: '0.45rem' }}>
              {ex.person.skills.map((sk) => (
                <span key={sk.skill} className={`chip ${sk.match ? 'chip--match' : ''}`}>
                  {sk.skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const { data: stats } = useStats()

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">Comunidad de gente que hace cosas</p>
          <h1>Cada proyecto necesita a alguien como tú.</h1>
          <p className="lede">
            Publica lo que estás construyendo y cuenta qué perfiles buscas: un músico, una ilustradora, alguien que sepa
            de bases de datos. Si tienes esa habilidad, el proyecto te encuentra a ti.
          </p>
          <div className="row" style={{ gap: '0.8rem', marginTop: '0.4rem' }}>
            <Link to="/register" className="btn btn--primary btn--lg">
              Crear mi cuenta <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn--glass btn--lg">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <MatchIllustration />
      </section>

      <div className="ornament" style={{ margin: '3.5rem 0 2.5rem' }} aria-hidden="true">
        ✦
      </div>

      <section className="steps" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="sr-only">
          Cómo funciona
        </h2>
        <article className="step glass">
          <span className="step__n">I</span>
          <h3>Publica tu proyecto</h3>
          <p>
            Cuenta de qué trata, añade fotos o un video y detalla a quién necesitas. Un puesto por cada perfil: música,
            diseño, código, escritura…
          </p>
        </article>
        <article className="step glass">
          <span className="step__n">II</span>
          <h3>Encuentra el encaje</h3>
          <p>
            Anota tus habilidades en tu perfil. Los proyectos que buscan justo lo que haces aparecen primero en tu
            inicio, marcados con «Encaja contigo».
          </p>
        </article>
        <article className="step glass">
          <span className="step__n">III</span>
          <h3>Construyan juntos</h3>
          <p>
            Envía una solicitud al puesto que te interesa. Quien creó el proyecto la revisa y, si la acepta, ya eres
            parte del equipo.
          </p>
        </article>
      </section>

      <section className="ideas-band glass glass--tint-ochre">
        <div>
          <p className="eyebrow">¿Todavía es solo una idea?</p>
          <h2>Compártela y deja que otros la mejoren.</h2>
          <p className="muted" style={{ marginTop: '0.7rem', maxWidth: '48ch' }}>
            No hace falta tener un proyecto armado. Publica una idea y la comunidad puede darte feedback o levantar la
            mano para ayudarte a desarrollarla.
          </p>
        </div>
        <ul className="ideas-band__list">
          <li>
            <Lightbulb size={20} /> <span>Publica una idea en minutos</span>
          </li>
          <li>
            <MessageCircle size={20} /> <span>Recibe feedback de otras personas</span>
          </li>
          <li>
            <HandHeart size={20} /> <span>Descubre quién quiere ayudarte</span>
          </li>
        </ul>
      </section>

      {stats && stats.members > 0 && (
        <section className="stats" aria-label="La comunidad en números">
          <div>
            <strong>{stats.members}</strong>
            <span>{stats.members === 1 ? 'persona' : 'personas'}</span>
          </div>
          <div>
            <strong>{stats.projects}</strong>
            <span>{stats.projects === 1 ? 'proyecto' : 'proyectos'}</span>
          </div>
          <div>
            <strong>{stats.ideas}</strong>
            <span>{stats.ideas === 1 ? 'idea' : 'ideas'}</span>
          </div>
        </section>
      )}
    </div>
  )
}
