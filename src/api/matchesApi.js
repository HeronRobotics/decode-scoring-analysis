import { supabase } from '../supabaseClient'

const mapDbMatchToAppMatch = (row) => {
  const events = (row.events || []).map((e) => ({
    type: e.type,
    timestamp: e.timestamp_ms ?? 0,
    total: e.total ?? 0,
    scored: e.scored ?? 0,
    phase: e.phase || undefined,
  }))

  return {
    id: row.id,
    createdAt: row.created_at,
    teamNumber: row.team_number || '',
    startTime: row.start_time ? new Date(row.start_time).getTime() : null,
    duration: row.duration_seconds ?? null,
    notes: row.notes || '',
    title: row.title || '',
    tournamentName: row.tournament_name || '',
    events,
  }
}

const buildMatchInsertPayload = (userId, rawMatch, source = 'recorder') => {
  const { startTime, duration, teamNumber, notes, events, tournamentName, title } = rawMatch

  const match = {
    user_id: userId,
    team_number: teamNumber || null,
    start_time: startTime ? new Date(startTime).toISOString() : null,
    duration_seconds: duration ?? null,
    notes: notes || '',
    title: title || null,
    tournament_name: tournamentName || null,
    source,
  }

  const eventRows = (events || []).map((e) => ({
    type: e.type,
    timestamp_ms: e.timestamp ?? 0,
    total: e.type === 'cycle' ? e.total ?? 0 : null,
    scored: e.type === 'cycle' ? e.scored ?? 0 : null,
    phase: e.phase ?? null,
  }))

  return { match, eventRows }
}

export async function createMatchForUser(userId, rawMatch, source = 'recorder') {
  const { match, eventRows } = buildMatchInsertPayload(userId, rawMatch, source)

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .insert(match)
    .select('id, created_at, team_number, start_time, duration_seconds, notes, title, tournament_name')
    .single()

  if (matchError) {
    throw matchError
  }

  if (eventRows.length > 0) {
    const eventsWithMatchId = eventRows.map((e) => ({
      ...e,
      match_id: matchData.id,
    }))

    const { error: eventsError } = await supabase
      .from('match_events')
      .insert(eventsWithMatchId)

    if (eventsError) {
      await supabase.from('matches').delete().eq('id', matchData.id)
      throw eventsError
    }
  }

  const { data: fullMatch, error: fetchError } = await supabase
    .from('matches')
    .select(
      'id, created_at, team_number, start_time, duration_seconds, notes, title, tournament_name, events:match_events(type, timestamp_ms, total, scored, phase)',
    )
    .eq('id', matchData.id)
    .single()

  if (fetchError) {
    throw fetchError
  }

  return mapDbMatchToAppMatch(fullMatch)
}

export async function listMatchesForCurrentUser() {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, created_at, team_number, start_time, duration_seconds, notes, title, tournament_name, events:match_events(type, timestamp_ms, total, scored, phase)',
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data || []).map(mapDbMatchToAppMatch)
}

export async function updateMatch(matchId, changes) {
  const payload = {}
  if (Object.prototype.hasOwnProperty.call(changes, 'tournamentName')) {
    payload.tournament_name = changes.tournamentName || null
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
    payload.title = changes.title || null
  }

  const { data, error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId)
    .select(
      'id, created_at, team_number, start_time, duration_seconds, notes, title, tournament_name, events:match_events(type, timestamp_ms, total, scored, phase)',
    )
    .single()

  if (error) {
    throw error
  }

  return mapDbMatchToAppMatch(data)
}

export async function deleteMatch(matchId) {
  const { error } = await supabase.from('matches').delete().eq('id', matchId)
  if (error) {
    throw error
  }
}
