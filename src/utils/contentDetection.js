function normalize(value) {
  return String(value || '').toLowerCase().trim()
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getArrayLength(value) {
  return Array.isArray(value) ? value.length : 0
}

function getParticipantCount(event = {}) {
  return Math.max(
    toNumber(event.numberOfParticipants),
    toNumber(event.NumberOfParticipants),
    getArrayLength(event.Participants),
    getArrayLength(event.participants)
  )
}

function getGroupCount(event = {}) {
  return Math.max(
    toNumber(event.groupMemberCount),
    toNumber(event.GroupMemberCount),
    getArrayLength(event.GroupMembers),
    getArrayLength(event.groupMembers)
  )
}

function makeContent(type, confidence, reason) {
  return {
    type,
    label: type === 'solo' ? 'Solo' : 'PvP',
    confidence,
    reason,
    source: 'local',
  }
}

export function getAssistPlayers(event = {}) {
  const participants = Array.isArray(event.Participants) ? event.Participants : []
  const killerName = normalize(event.Killer?.Name)

  return participants.filter((player) => normalize(player.Name) !== killerName)
}

export function detectEventContent(event = {}) {
  if (!event) {
    return makeContent('pvp', 'low', 'Aucun detail disponible.')
  }

  const participantCount = getParticipantCount(event)
  const groupCount = getGroupCount(event)
  const assistCount = getAssistPlayers(event).length

  if (assistCount === 0 && participantCount <= 1 && groupCount <= 1) {
    return makeContent('solo', 'medium', 'Aucun assist ni groupe detecte.')
  }

  return makeContent('pvp', 'high', 'Tout contenu non solo est classe PvP.')
}
