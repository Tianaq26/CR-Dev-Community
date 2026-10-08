import { Check, Clock, UserCheck, UserMinus, UserPlus, X } from 'lucide-react'
import { useFriendActions } from '../hooks/queries'
import type { Relationship } from '../lib/types'

interface Props {
  userId: string
  userName: string
  relationship: Relationship
  size?: 'sm' | 'md'
}

/** One control that always offers the right next step for the friendship between me and this person. */
export function RelationshipButton({ userId, userName, relationship, size = 'sm' }: Props) {
  const { send, accept, decline, remove } = useFriendActions()
  const sz = size === 'sm' ? 'btn--sm' : ''
  const busy = send.isPending || accept.isPending || decline.isPending || remove.isPending

  switch (relationship.state) {
    case 'self':
      return null

    case 'friends':
      return (
        <span className="row" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
          <span className="chip chip--open">
            <UserCheck size={14} /> Amigos
          </span>
          <button
            type="button"
            className="icon-btn"
            title={`Quitar a ${userName} de tus amigos`}
            aria-label={`Quitar a ${userName} de tus amigos`}
            disabled={busy}
            onClick={() => window.confirm(`¿Quitar a ${userName} de tus amigos?`) && remove.mutate(userId)}
          >
            <UserMinus size={16} />
          </button>
        </span>
      )

    case 'requestSent':
      return (
        <button
          type="button"
          className={`btn btn--ghost ${sz}`}
          disabled={busy}
          title="Cancelar solicitud"
          onClick={() => remove.mutate(userId)}
        >
          <Clock size={15} /> Solicitud enviada
        </button>
      )

    case 'requestReceived':
      return (
        <span className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
          <button
            type="button"
            className={`btn btn--primary ${sz}`}
            disabled={busy || !relationship.requestId}
            onClick={() => relationship.requestId && accept.mutate(relationship.requestId)}
          >
            <Check size={15} /> Aceptar
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Rechazar la solicitud de ${userName}`}
            title="Rechazar"
            disabled={busy || !relationship.requestId}
            onClick={() => relationship.requestId && decline.mutate(relationship.requestId)}
          >
            <X size={17} />
          </button>
        </span>
      )

    default:
      return (
        <button type="button" className={`btn btn--glass ${sz}`} disabled={busy} onClick={() => send.mutate(userId)}>
          <UserPlus size={15} /> Agregar
        </button>
      )
  }
}
