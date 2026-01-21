import { supabase } from '../supabaseClient'

// Base columns that always exist
const BASE_SELECT = 'id, created_at, team_number, start_time, duration_seconds, notes, title, tournament_name'
const BASE_SELECT_WITH_EVENTS = `${BASE_SELECT}, events:match_events(type, timestamp_ms, total, scored, phase)`

// Scoring columns (may not exist in older databases)
const SCORING_COLUMNS = ['motif', 'auto_pattern', 'teleop_pattern', 'auto_leave', 'teleop_park']

// Cache for whether scoring columns exist
let scoringColumnsExist = null

async function checkScoringColumnsExist() {
  if (scoringColumnsExist !== null) return scoringColumnsExist

  try {
    // Try to select one of the scoring columns
    const { error } = await supabase
      .from('matches')
      .select('motif')
      .limit(1)

    scoringColumnsExist = !error
  } catch {
    scoringColumnsExist = false
  }

  return scoringColumnsExist
}

function getSelectQuery(includeEvents = true) {
  if (scoringColumnsExist) {
    const scoring = SCORING_COLUMNS.join(', ')
    return includeEvents
      ? `${BASE_SELECT}, ${scoring}, events:match_events(type, timestamp_ms, total, scored, phase)`
      : `${BASE_SELECT}, ${scoring}`
  }
  return includeEvents ? BASE_SELECT_WITH_EVENTS : BASE_SELECT
}

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
    // Scoring fields (defaults if columns don't exist)
    motif: row.motif || null,
    autoPattern: row.auto_pattern || '',
    teleopPattern: row.teleop_pattern || '',
    autoLeave: row.auto_leave ?? false,
    teleopPark: row.teleop_park || 'none',
  }
}

const buildMatchInsertPayload = (userId, rawMatch, source = 'recorder', includeScoringFields = false) => {
  const {
    startTime,
    duration,
    teamNumber,
    notes,
    events,
    tournamentName,
    title,
    motif,
    autoPattern,
    teleopPattern,
    autoLeave,
    teleopPark,
  } = rawMatch

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

  // Only include scoring fields if the columns exist
  if (includeScoringFields) {
    match.motif = motif || null
    match.auto_pattern = autoPattern || ''
    match.teleop_pattern = teleopPattern || ''
    match.auto_leave = autoLeave ?? false
    match.teleop_park = teleopPark || 'none'
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
  const hasScoring = await checkScoringColumnsExist()
  const { match, eventRows } = buildMatchInsertPayload(userId, rawMatch, source, hasScoring)

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .insert(match)
    .select(getSelectQuery(false))
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
    .select(getSelectQuery(true))
    .eq('id', matchData.id)
    .single()

  if (fetchError) {
    throw fetchError
  }

  return mapDbMatchToAppMatch(fullMatch)
}

export async function listMatchesForCurrentUser() {
  await checkScoringColumnsExist()

  const { data, error } = await supabase
    .from('matches')
    .select(getSelectQuery(true))
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data || []).map(mapDbMatchToAppMatch)
}

export async function getMatchForCurrentUser(matchId) {
  await checkScoringColumnsExist()

  const { data, error } = await supabase
    .from('matches')
    .select(getSelectQuery(true))
    .eq('id', matchId)
    .single()

  if (error) {
    throw error
  }

  return mapDbMatchToAppMatch(data)
}

export async function updateMatch(matchId, changes) {
  const hasScoring = await checkScoringColumnsExist()

  const payload = {}
  if (Object.prototype.hasOwnProperty.call(changes, 'tournamentName')) {
    payload.tournament_name = changes.tournamentName || null
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
    payload.title = changes.title || null
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'teamNumber')) {
    payload.team_number = changes.teamNumber || null
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'notes')) {
    payload.notes = changes.notes || ''
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'startTime')) {
    payload.start_time = changes.startTime
      ? new Date(changes.startTime).toISOString()
      : null
  }

  // Scoring fields (only if columns exist)
  if (hasScoring) {
    if (Object.prototype.hasOwnProperty.call(changes, 'motif')) {
      payload.motif = changes.motif || null
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'autoPattern')) {
      payload.auto_pattern = changes.autoPattern || ''
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'teleopPattern')) {
      payload.teleop_pattern = changes.teleopPattern || ''
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'autoLeave')) {
      payload.auto_leave = changes.autoLeave ?? false
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'teleopPark')) {
      payload.teleop_park = changes.teleopPark || 'none'
    }
  }

  const { data, error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId)
    .select(getSelectQuery(true))
    .single()

  if (error) {
    throw error
  }

  return mapDbMatchToAppMatch(data)
}

export async function saveMatchEdits(matchId, rawMatch) {
  const hasScoring = await checkScoringColumnsExist()

  const {
    startTime,
    duration,
    teamNumber,
    notes,
    title,
    tournamentName,
    events,
    motif,
    autoPattern,
    teleopPattern,
    autoLeave,
    teleopPark,
  } = rawMatch

  const meta = {
    team_number: teamNumber || null,
    start_time: startTime ? new Date(startTime).toISOString() : null,
    duration_seconds: duration ?? null,
    notes: notes || '',
    title: title || null,
    tournament_name: tournamentName || null,
  }

  // Scoring fields (only if columns exist)
  if (hasScoring) {
    meta.motif = motif || null
    meta.auto_pattern = autoPattern || ''
    meta.teleop_pattern = teleopPattern || ''
    meta.auto_leave = autoLeave ?? false
    meta.teleop_park = teleopPark || 'none'
  }

  const { error: matchError } = await supabase
    .from('matches')
    .update(meta)
    .eq('id', matchId)

  if (matchError) {
    throw matchError
  }

  const eventRows = (events || []).map((e) => ({
    type: e.type,
    timestamp_ms: e.timestamp ?? 0,
    total: e.type === 'cycle' ? e.total ?? 0 : null,
    scored: e.type === 'cycle' ? e.scored ?? 0 : null,
    phase: e.phase ?? null,
    match_id: matchId,
  }))

  const { error: delError } = await supabase
    .from('match_events')
    .delete()
    .eq('match_id', matchId)

  if (delError) {
    throw delError
  }

  if (eventRows.length > 0) {
    const { error: insError } = await supabase
      .from('match_events')
      .insert(eventRows)

    if (insError) {
      throw insError
    }
  }

  const { data, error } = await supabase
    .from('matches')
    .select(getSelectQuery(true))
    .eq('id', matchId)
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

// Export for testing/debugging
export { checkScoringColumnsExist }
