// __tests__/scannerService.test.ts
//
// lib/supabase builds a real browser client the moment it's imported, so it gets
// swapped for a fake one here. Bonus: with a fake db we can assert on exactly what
// WOULD have been written, which is how the two headline bugs get pinned down.

const mockDb = {
  workstation: null as Record<string, unknown> | null,
  component: null as Record<string, unknown> | null,
  updateError: null as { message: string } | null,
  insertError: null as { message: string } | null,
  lastUpdate: null as Record<string, unknown> | null,
  lastInsert: null as Record<string, unknown> | null,
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === 'workstations'
              ? { data: mockDb.workstation, error: null }
              : { data: mockDb.component, error: null },
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        mockDb.lastUpdate = payload
        return { eq: async () => ({ error: mockDb.updateError }) }
      },
      insert: (payload: Record<string, unknown>) => {
        mockDb.lastInsert = payload
        return Promise.resolve({ error: mockDb.insertError })
      },
    }),
  },
}))

import { scannerService } from '@/lib/services/scannerService'

const A_STATION = { id: 'ws-1', name: 'Assembly', isFinalStation: false }
const FINAL_STATION = { id: 'ws-9', name: 'Final QA', isFinalStation: true }
const A_COMPONENT = { id: 'c-1', name: 'PCB-Board-001', currentStatus: 'in_progress' as const }

beforeEach(() => {
  mockDb.workstation = null
  mockDb.component = null
  mockDb.updateError = null
  mockDb.insertError = null
  mockDb.lastUpdate = null
  mockDb.lastInsert = null
})

describe('parseWorkstationQR', () => {

  it('pulls the name and id out of a normal station QR', () => {
    expect(scannerService.parseWorkstationQR('STATION:Assembly:ws-123')).toEqual({
      name: 'Assembly',
      id: 'ws-123',
    })
  })

  // dis is the regression test. the old version took parts[2] as the id, so a
  // colon anywhere in the station name silently made the id the wrong string
  // and every scan at that station died with "does not exist".
  it('survives a station name that contains a colon', () => {
    expect(scannerService.parseWorkstationQR('STATION:Line 2: Assembly:ws-123')).toEqual({
      name: 'Line 2: Assembly',
      id: 'ws-123',
    })
  })

  it('copes with a name full of colons', () => {
    expect(scannerService.parseWorkstationQR('STATION:A:B:C:ws-9')).toEqual({
      name: 'A:B:C',
      id: 'ws-9',
    })
  })

  it('trims stray whitespace off the id', () => {
    expect(scannerService.parseWorkstationQR('STATION:Assembly: ws-123 ').id).toBe('ws-123')
  })

  it.each([
    ['a component QR', 'some-random-uuid'],
    ['a missing id', 'STATION:Assembly'],
    ['the wrong prefix', 'WORKSTATION:Assembly:ws-1'],
    ['an empty id', 'STATION:Assembly:'],
    ['an empty name', 'STATION::ws-1'],
    ['nothing at all', ''],
  ])('rejects %s', (_label, raw) => {
    expect(() => scannerService.parseWorkstationQR(raw)).toThrow(/Invalid Station QR/)
  })
})

describe('verifyWorkstation', () => {

  it('returns the station and whether it is the end of the line', async () => {
    mockDb.workstation = { id: 'ws-9', name: 'Final QA', is_final_station: true, is_active: true }

    await expect(scannerService.verifyWorkstation('ws-9')).resolves.toEqual({
      id: 'ws-9',
      name: 'Final QA',
      isFinalStation: true,
    })
  })

  it('refuses a QR for a station that is not in the database', async () => {
    mockDb.workstation = null
    await expect(scannerService.verifyWorkstation('ws-nope')).rejects.toThrow(/not in the system/i)
  })

  it('refuses a station the manager has deactivated', async () => {
    mockDb.workstation = { id: 'ws-1', name: 'Old Rig', is_final_station: false, is_active: false }
    await expect(scannerService.verifyWorkstation('ws-1')).rejects.toThrow(/deactivated/i)
  })
})

describe('verifyComponent', () => {

  it('returns the component with its current status', async () => {
    mockDb.component = { id: 'c-1', name: 'PCB-Board-001', current_status: 'pending' }

    await expect(scannerService.verifyComponent('c-1')).resolves.toEqual({
      id: 'c-1',
      name: 'PCB-Board-001',
      currentStatus: 'pending',
    })
  })

  it('refuses a QR for a component that does not exist', async () => {
    mockDb.component = null
    await expect(scannerService.verifyComponent('nope')).rejects.toThrow(/does not exist/i)
  })

  it('complains loudly about a status it does not recognise', async () => {
    // better a clear error than silently defaulting and inventing a mystery state
    mockDb.component = { id: 'c-1', name: 'PCB-Board-001', current_status: 'banana' }
    await expect(scannerService.verifyComponent('c-1')).rejects.toThrow(/unrecognised status/i)
  })
})

describe('processPairing — the two bugs this whole branch exists for', () => {

  // BUG 1: to_status was hardcoded to 'in_progress', so 'completed' and 'flagged'
  // literally never reached the database no matter what the worker picked.
  it('writes the status the worker actually chose, not in_progress', async () => {
    const result = await scannerService.processPairing({
      component: A_COMPONENT,
      station: FINAL_STATION,
      toStatus: 'completed',
      workerName: 'Chen',
      workerId: 'u-1',
    })

    expect(result.newStatus).toBe('completed')
    expect(mockDb.lastUpdate?.current_status).toBe('completed')
    expect(mockDb.lastInsert?.to_status).toBe('completed')
  })

  it('records flagged properly too', async () => {
    await scannerService.processPairing({
      component: A_COMPONENT,
      station: A_STATION,
      toStatus: 'flagged',
      workerName: 'Chen',
      workerId: 'u-1',
    })

    expect(mockDb.lastUpdate?.current_status).toBe('flagged')
    expect(mockDb.lastInsert?.to_status).toBe('flagged')
  })

  // BUG 2: workstation_id was never written to status_logs, so every chatbot query
  // that joined logs to workstations on that column came back with zero rows.
  it('writes workstation_id into the audit trail', async () => {
    await scannerService.processPairing({
      component: A_COMPONENT,
      station: A_STATION,
      toStatus: 'pending',
      workerName: 'Chen',
      workerId: 'u-1',
    })

    expect(mockDb.lastInsert?.workstation_id).toBe('ws-1')
    expect(mockDb.lastInsert?.workstation_name).toBe('Assembly')
  })

  it('records where the component came from, not just where it landed', async () => {
    await scannerService.processPairing({
      component: A_COMPONENT,
      station: A_STATION,
      toStatus: 'flagged',
      workerName: 'Chen',
      workerId: 'u-1',
    })

    expect(mockDb.lastInsert?.from_status).toBe('in_progress')
  })
})

describe('processPairing — guarding the rules', () => {

  it('blocks an illegal move even if the UI somehow asks for one', async () => {
    // stale tab, replayed request, someone poking at the console — all handled here
    await expect(
      scannerService.processPairing({
        component: A_COMPONENT,
        station: A_STATION,           // NOT the final station
        toStatus: 'completed',
        workerName: 'Chen',
        workerId: 'u-1',
      }),
    ).rejects.toThrow(/only the final station/i)
  })

  it('writes nothing at all when the move is rejected', async () => {
    await expect(
      scannerService.processPairing({
        component: { ...A_COMPONENT, currentStatus: 'completed' },
        station: FINAL_STATION,
        toStatus: 'in_progress',
        workerName: 'Chen',
        workerId: 'u-1',
      }),
    ).rejects.toThrow()

    expect(mockDb.lastUpdate).toBeNull()
    expect(mockDb.lastInsert).toBeNull()
  })

  it('throws when the component snapshot fails to save', async () => {
    mockDb.updateError = { message: 'connection lost' }

    await expect(
      scannerService.processPairing({
        component: A_COMPONENT,
        station: A_STATION,
        toStatus: 'flagged',
        workerName: 'Chen',
        workerId: 'u-1',
      }),
    ).rejects.toThrow(/Component Update Error/)
  })

  it('warns instead of exploding when only the audit log fails', async () => {
    // the snapshot already landed, so throwing here would make the worker rescan
    // and we'd end up logging the same move twice
    mockDb.insertError = { message: 'log table busy' }

    const result = await scannerService.processPairing({
      component: A_COMPONENT,
      station: A_STATION,
      toStatus: 'flagged',
      workerName: 'Chen',
      workerId: 'u-1',
    })

    expect(result.newStatus).toBe('flagged')
    expect(result.logWarning).toMatch(/audit log/i)
  })

  it('says nothing when everything worked', async () => {
    const result = await scannerService.processPairing({
      component: A_COMPONENT,
      station: A_STATION,
      toStatus: 'flagged',
      workerName: 'Chen',
      workerId: 'u-1',
    })

    expect(result.logWarning).toBeUndefined()
  })
})
