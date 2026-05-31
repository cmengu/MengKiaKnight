'use client';

// added import for supabase and the type database 
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database';

//this is the type for the current status of a component, replaced the old type statustype with this new one linekd with supabase. 

type StatusType = Database['public']['Tables']['components']['Row']['current_status']

//I am using conditional rendering here to implement all 3 pages of login,
//manager, worker for poc. will need to refactor for future development


//ManagerDashboard component. onLogout variable to track page changing
function ManagerDashboard({ onLogout }: { onLogout: () => void}) {
  //create memory to hold array of components from the database
  const [componentsList, setComponentsList] = useState([]);

  //here useEffect to prevent infinite looping 
  useEffect(() => {
    console.log("Dashboard loaded! Ready to fetch data.");

    const fetchComponents = async () => {
      const { data, error } = await supabase
        .from('components')
        .select('*')

      if (error) {
        console.log("Error fetching data:", error);
      } else {
        //save cloud data to react memory
        setComponentsList(data);
      }
    };
    
    fetchComponents();

  }, []);   //[] at end is a safety lock to ensure data only fetched once

  //
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-600 gap-4 p-8">
      <h1 className="text-3xl font-bold text-emerald-400 mb-6">
        Manager Dashboard
      </h1>

      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-2xl"> 
        <h2 className="text-xl text-white font-bold mb-4"> Live Factory Components</h2>

        {/* The Assembly Line (.map) */}
        <div className="flex flex-col gap-3">
          {componentsList.length === 0? (
            <p className="text-slate-400 text-center py-4"> 
              No components found or still loading...
            </p> 
            ) : (
            componentsList.map((item, index) => (
              <div key={index} className="flex justify-between bg-slate-700 p-4 rounded-lg items-center"> 
                <span className="font-mono text-slate-300 text-sm">
                  Component Name: { item.name }
                </span>
                <span className="font-bold text-amber-400 uppercase tracking-wider text-sm">
                  { item.current_status }
                </span>
              </div>
             ))
          )}
        </div>
      </div>

      {/* Button to leave manager page back to main */}
      <button onClick={onLogout} className="mt-8 text-slate-400 underline
      hover:text-slate-200">
        Switch Role (Logout)
      </button>
    </main>
  );
}


//workerscaner component. separated out from previous home function

//NOTE TO MENG: please update the logic here so that workers can add new components
//and change their status, maybe to and fro pending to in progress?
//up to you
function WorkerScanner({onLogout}: {onLogout: () => void}) {
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

      {/*Button to leave room*/}
      <button onClick={onLogout} className="mt-8 text-slate-400 underline
      hover:text-slate-200">
        Switch Role (Logout)
      </button>
    </main>
  );
}


//controller
export default function Home() {
  //Memory to track which page currently on 
  const [currentPage, setCurrentPage] = useState<'login' | 'worker' | 'manager'>('login');

  //function that brings back to login page
  const handleLogout = () => setCurrentPage('login');

  if (currentPage === 'worker') {
    return <WorkerScanner onLogout={handleLogout} />;
  }

  if (currentPage === 'manager') {
    return <ManagerDashboard onLogout={handleLogout} />;
  }

  //if not in any page, show 'log in' page
  return (
    <main className="flex flex-col items-center justify-center min-h-screen
    bg-slate-900 p-8">
      <div className="bg-slate-800 rounded-xl shadow-lg p-8 w-full max-w-sm 
      text-center border border-slate-700">
        <h1 className="text-2xl font-bold text-slate-100 mb-8">Who are you?</h1>

        <div className="flex flex-col gap-4">
          <button onClick={() => setCurrentPage('worker')} className="w-full bg-blue-600 
          text-white font-bold py-3 rounded-lg">
            I am a Worker
          </button>
          <button onClick={() => setCurrentPage('manager')} className="w-full bg-blue-600 
          text-white font-bold py-3 rounded-lg">
            I am a Manager
          </button>
        </div>
      </div>
    </main>
  );
}