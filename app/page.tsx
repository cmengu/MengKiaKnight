'use client';

// added import for supabase and the type database 
import { useState } from 'react';
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database';

//this is the type for the current status of a component, replaced the old type statustype with this new one linekd with supabase. 

type StatusType = Database['public']['Tables']['components']['Row']['current_status']

export default function Home() {

  //change pending to match the state along witht the database type not Pending capital
  const [status, setStatus] = useState<StatusType>('pending');

  //updated the new funtion to udpate the status, so if there is an error, it will update a dummy row
  //in later/future stages, it will update the uuid taht the qr code gives when scanned, but for now im testing the connection of the button to the databse 
  //so i just used a dummy uuid for now if there is error, so i can see whether it works or not
  // IMPT: i disabled RLS to test this was runnign into this problem that the logic did not work i was so frustated
  //turned out its jsut RLS bruh 
  const updateStatus = async () => {
    const { error } = await supabase
      .from('components')
      .update({ current_status: 'in_progress' })
      .eq('id', 'c119ed50-f377-416e-83be-2af85dc2e8d6')
      
    if (error) {
      console.log(error)
    } else {
      setStatus('in_progress')
    } 
  } 

  return (
    <main className="flex flex-col items-center justify-center min-h-screen
    bg-slate-900 gap-1">
      <h1 className="text-white text-3xl font-bold">
        MPT Component Scanner
      </h1>

      <p className="text-slate-300 text-lg">
        Current Status: {status}
      </p>

      <button className="bg-blue-600 text-white font-bold py-3 p-3
      rounded-lg hover:bg-blue-700" onClick={updateStatus}>
        'Scan QR' to Update to In Progress
      </button>
    </main>
  );
}