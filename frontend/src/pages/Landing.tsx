import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, HandHeart, Lightbulb, MessageCircle, Sparkles } from 'lucide-react'
import { useStats } from '../hooks/queries'

/** A sample match: a game project looking for an illustrator, and an illustrator who fits. */
function MatchIllustration() {
  return (
    <div className="match-art" aria-hidden="true">
      <div className="match-art__project glass">
        <span className="stamp stamp--building">En desarrollo</span>
        <h3>Chucho en la Cuadra</h3>
        <p>
          Juego de plataformas en 2D: un perro callejero recorre su cuadra buscando a su dueña. Hay tres niveles listos;
          faltan los fondos y la música.
        </p>
        <div className="stack stack--sm">
          <span className="label-sm">Se busca</span>
          <div className="chips">
            <span className="chip chip--match">Ilustración</span>
            <span className="chip chip--open">Músico</span>
          </div>
        </div>
      </div>

      <div className="match-art__link">
        <span className="chip chip--match">
          <Sparkles size={13} /> Encaja
        </span>
      </div>

      <div className="match-art__person glass glass--dense">
        <span className="avatar avatar--initials" style={{ '--size': '46px', '--bg': '#7b8650' } as CSSProperties}>
          VC
        </span>
        <div>
          <strong>Valeria Cruz</strong>
          <p className="small muted">Ilustradora de pixel art</p>
          <div className="chips" style={{ marginTop: '0.45rem' }}>
            <span className="chip chip--match">Ilustración</span>
            <span className="chip">Animación</span>
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
            Muchos proyectos se frenan por falta de una persona: quien dibuje, componga o programe. Aquí los publicas,
            dices a quién buscas y la gente con esa habilidad te encuentra.
          </p>
          <div className="row" style={{ gap: '0.8rem', marginTop: '0.4rem' }}>
            <Link to="/register" className="btn btn--primary btn--lg">
              Crear mi cuenta gratis <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn--glass btn--lg">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="faint small">Gratis · Solo necesitas un correo · Te toma un minuto</p>
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

      {stats && stats.members >= 10 && (
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

      <section className="final-cta">
        <h2>Empieza contando qué sabes hacer.</h2>
        <p className="muted">Con tus habilidades en el perfil, los proyectos que te necesitan te aparecen primero.</p>
        <Link to="/register" className="btn btn--primary btn--lg">
          Crear mi cuenta gratis <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  )
}
