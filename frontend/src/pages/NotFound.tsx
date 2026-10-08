import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page page--narrow">
      <div className="empty glass glass--dense">
        <p className="eyebrow">Error 404</p>
        <h1>Esta página se perdió en el taller.</h1>
        <p className="muted" style={{ marginTop: '0.6rem' }}>
          Puede que el enlace esté mal escrito o que lo que buscas ya no exista.
        </p>
        <div style={{ marginTop: '1.2rem' }}>
          <Link to="/" className="btn btn--primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
