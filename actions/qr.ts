'use server'
  import { revalidatePath } from 'next/cache'
  import { getServerSupabase } from '@/lib/supabaseServer'

  // The contract passed between the form and the action: either an error message,
  // or the newly-created row (its DB-minted id + name) so the UI can draw the QR.
  export type CreateState =
    | { error?: string; created?: { id: string; name: string | null } }
    | undefined

  //batch aint even mattering right now anyway so its p chill
  export async function createBatch(prev: CreateState, form: FormData): Promise<CreateState> {
    const name = (form.get('name') as string)?.trim() || null      // batches.name is nullable

    const supabase = await getServerSupabase()                      // authenticated because checked
    const { data: { user } } = await supabase.auth.getUser()        // check user is authenticated
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('batches')
      .insert({ name, created_by: user.id })                       // 
      .select('id, name')                                          // ask for the new row back
      .single()
    if (error || !data) return { error: error?.message ?? 'Could not create batch' }  // RLS refusal lands here if the person does not have the permission

    revalidatePath('/')                                            // dashboard data may have changed
    return { created: data }                                       // hand the UUID back to the form
  }
  
  export async function createWorkstation(prev: CreateState, form: FormData): Promise<CreateState> {
    const name = (form.get('name') as string)?.trim()             // workstations.name is NOT NULL there must be a workstation right
    const location = (form.get('location') as string)?.trim() || null
    if (!name) return { error: 'Workstation Name is required' }

    const supabase = await getServerSupabase()
    const { data, error } = await supabase
      .from('workstations')
      .insert({ name, location })                                  // no created_by as spec only audits batches
      .select('id, name')
      .single()
    if (error || !data) return { error: error?.message ?? 'Could not create workstation' }

    revalidatePath('/')
    return { created: data }
  }

  export async function createComponent(prev: CreateState, form: FormData): Promise<CreateState> {
    const name = (form.get('name') as string)?.trim()
    if (!name) return { error: 'Component Name is required.'}

    const supabase = await getServerSupabase()

    //Insert new component and default to 'pending'
    const { data, error } = await supabase  
      .from('components')
      .insert({
        name,
        current_status: 'pending'
      })
      .select('id, name')
      .single()

      if (error || !data) return { error: error?.message ?? 'Could not create component'}

      revalidatePath('/')
      return { created: data }
  }
