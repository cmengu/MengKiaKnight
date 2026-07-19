// The entire "what is a legal move" rulebook lives in dis file.
//
// No supabase, no react, no async — data in, data out. That's on purpose: it means
// the rules can be unit tested properly without mocking a database, and there's
// exactly ONE place to look when someone asks "wait, can a flagged part be completed?"
//
// THE RULE WE SETTLED ON:
// "completed" means the component finished the ENTIRE line — not just one station.
// So it's only offered at a station flagged is_final_station. At every other station,
// finishing your bit sends the component back to `pending`, which reads as
// "ready for the next station to pick up".
//
// Why bother: it makes the manager's "Completed Today" tile mean actual finished
// units. If any station could mark completed, one component crossing five stations
// would fire five "completed" events and the number would be fiction.

export const COMPONENT_STATUSES = ['pending', 'in_progress', 'completed', 'flagged'] as const

export type ComponentStatus = (typeof COMPONENT_STATUSES)[number]

/** Human wording for each status, so no screen ever shows a raw `in_progress`. */
export const STATUS_LABELS: Record<ComponentStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  flagged: 'Flagged',
}

/** One option we're willing to put in front of a worker, already worded for human eyes. */
export type Move = {
  to: ComponentStatus
  label: string
  hint: string
  tone: 'start' | 'finish' | 'flag'
}

/** Narrows a loose string (e.g. straight out of the db) into a status we recognise. */
export function isComponentStatus(value: string): value is ComponentStatus {
  return (COMPONENT_STATUSES as readonly string[]).includes(value)
}

// flagging is available from basically anywhere, so it lives up here instead of
// being retyped in every branch below
const FLAG_MOVE: Move = {
  to: 'flagged',
  label: 'Flag Defect',
  hint: 'Pulls this component off the line for review.',
  tone: 'flag',
}

/**
 * Every move a worker is allowed to make, given where the component is now and
 * whether they're standing at the last station on the line.
 *
 * Returns them in display order — the "normal" action first, flagging last.
 * An empty array means dead end (i.e. the thing is already finished).
 */
export function legalMoves(from: ComponentStatus, isFinalStation: boolean): Move[] {
  switch (from) {
    case 'pending':
      return [
        {
          to: 'in_progress',
          label: 'Start Work',
          hint: 'Marks this component as being worked on at this station.',
          tone: 'start',
        },
        FLAG_MOVE,
      ]

    case 'in_progress':
      return [
        isFinalStation
          ? {
              to: 'completed',
              label: 'Complete — Finished Line',
              hint: 'This is the final station, so the component is now a finished unit.',
              tone: 'finish',
            }
          : {
              to: 'pending',
              label: 'Done Here — Ready for Next Station',
              hint: 'Your part is done. The component is now waiting for the next station.',
              tone: 'finish',
            },
        FLAG_MOVE,
      ]

    case 'flagged':
      // one way out of a defect: somebody actually fixes it
      return [
        {
          to: 'in_progress',
          label: 'Start Rework',
          hint: 'Marks this defect as being fixed at this station.',
          tone: 'start',
        },
      ]

    case 'completed':
      // terminal on purpose. it's out the door.
      return []
  }
}

/** Cheap yes/no — is this exact move allowed right now? */
export function canTransition(
  from: ComponentStatus,
  to: ComponentStatus,
  isFinalStation: boolean,
): boolean {
  return legalMoves(from, isFinalStation).some((move) => move.to === to)
}

/**
 * Same as canTransition but throws something a worker can actually act on.
 * Used as the last gate before we write to the database.
 */
export function assertTransition(
  from: ComponentStatus,
  to: ComponentStatus,
  isFinalStation: boolean,
): void {
  if (canTransition(from, to, isFinalStation)) return

  // the three cases below are the ones people actually hit, so they get real
  // explanations instead of a generic "invalid transition" shrug
  if (from === 'completed') {
    throw new Error(
      'This component is already completed — it has finished the line and cannot be updated again.',
    )
  }

  if (to === 'completed' && !isFinalStation) {
    throw new Error(
      'Only the final station can mark a component as completed. Use "Done Here" to pass it to the next station.',
    )
  }

  const options = legalMoves(from, isFinalStation)
    .map((move) => `"${move.label}"`)
    .join(' or ')

  throw new Error(
    options
      ? `A "${from}" component cannot move to "${to}" here. Available actions: ${options}.`
      : `There are no available actions for a "${from}" component at this station.`,
  )
}
