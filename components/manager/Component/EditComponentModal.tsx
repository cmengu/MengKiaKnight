'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ComponentItem } from './ComponentManager'

interface Props {
  item: ComponentItem | null;
  onClose: () => void;
  onSuccess: (id: string, newStatus: string, newDeadline: string | null) => void;
}

export function EditComponentModal({ item, onClose, onSuccess }: Props) {
  const [editForm, setEditForm] = useState({ status: '', date: '', time: '' })
  const [isUpdating, setIsUpdating] = useState(false)

  // Auto-fill the form when the item is passed in
  useEffect(() => {
    if (item) {
      let datePart = ''
      let timePart = ''
      if (item.deadline) {
        const d = new Date(item.deadline)
        const pad = (n: number) => n.toString().padStart(2, '0')
        datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      setEditForm({ status: item.current_status, date: datePart, time: timePart })
    }
  }, [item])

  if (!item) return null;

  const handleSaveEdit = async () => {
    if (!editForm.date && editForm.time) {
      alert("You must select a date if you are setting a deadline.")
      return
    }

    setIsUpdating(true)
    let newDeadline = null
    if (editForm.date) {
      const finalTime = editForm.time || '23:59'
      newDeadline = new Date(`${editForm.date}T${finalTime}:00`).toISOString()
    }

    const { error } = await supabase
      .from('components')
      .update({ current_status: editForm.status, deadline: newDeadline })
      .eq('id', item.id)

    if (!error) {
      // Audit log the override
      await supabase.from('status_logs').insert({
        component_id: item.id,
        to_status: editForm.status,
        updated_by: 'Manager (Admin)',
        workstation_name: 'Manager Override'
      })
      
      onSuccess(item.id, editForm.status, newDeadline)
    } else {
      alert("Failed to update component: " + error.message)
    }
    setIsUpdating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Override: {item.name}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Force Status</label>
            <select 
              value={editForm.status}
              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="defect">Defect / Rework</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Adjust Deadline</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="flex-2 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Time is optional (defaults to 11:59 PM).</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-300 hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={handleSaveEdit} disabled={isUpdating} className="px-4 py-2 rounded-lg font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50">
            {isUpdating ? 'Saving...' : 'Confirm Override'}
          </button>
        </div>
      </div>
    </div>
  )
}