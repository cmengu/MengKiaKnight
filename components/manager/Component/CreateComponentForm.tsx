'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ComponentItem } from './ComponentManager'

interface Props {
  onSuccess: (newItem: ComponentItem) => void;
}

export function CreateComponentForm({ onSuccess }: Props) {
  const [createForm, setCreateForm] = useState({ name: '', date: '', time: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateComponent = async () => {
    if (!createForm.name.trim()) {
      alert("Component name is required.")
      return
    }
    
    setIsSubmitting(true)
    
    let newDeadline = null
    if (createForm.date) {
      const finalTime = createForm.time || '23:59'
      newDeadline = new Date(`${createForm.date}T${finalTime}:00`).toISOString()
    }

    const { data, error } = await supabase
      .from('components')
      .insert({
        name: createForm.name,
        current_status: 'pending',
        deadline: newDeadline,
        created_at: new Date().toISOString()
      })
      .select('*, workstations(name)')
      .single()

    if (!error && data) {
      onSuccess(data as unknown as ComponentItem)
      setCreateForm({ name: '', date: '', time: '' }) // Reset form on success
    } else {
      alert("Failed to create component: " + error?.message)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-4">Create New Component</h3>
      
      <div className="flex flex-col md:flex-row gap-4 items-end">
        {/* Name Input */}
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-400 mb-1">Component Name *</label>
          <input 
            type="text"
            placeholder="e.g. Pins A"
            value={createForm.name}
            onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Date Input */}
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-400 mb-1">Target Deadline</label>
          <input
            type="date"
            value={createForm.date}
            onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Time Input */}
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-400 mb-1">Target Time</label>
          <input
            type="time"
            value={createForm.time}
            onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleCreateComponent} 
          disabled={isSubmitting} 
          className="w-full md:w-auto h-[42px] px-6 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  )
}