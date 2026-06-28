'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logout } from '@/app/actions/auth';

// importing a next/dynamic wrapper to prevent camera boot up before page even reaches user browser 
// and causing infinite loop memory crash 
// delay loading of heavy browser-only components
import dynamic from 'next/dynamic';
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false } // server-side rendering: false means only mounts on client side
)

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'pending', label: 'Pending' },
] as const;

//define a type for our component & workstation memory
type ScannedComponent = { id: string; name: string };
type ScannedStation = { id: string; name: string };

export default function WorkerScanner() {
  // 1. two part memory system for component and workstation
  const [component, setComponent] = useState<ScannedComponent | null>(null);
  const [workstation, setWorkStation] = useState<ScannedStation | null>(null);

  // 2. UI states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  //boolean checker to stop camera from spamming database
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('in_progress');
  //core logic: when camera sees QR code
  const handleScan = async (detectedCodes: any) => {
    // stop scanning if updating, or already successfully finished both
    if (!detectedCodes || detectedCodes.length == 0 || isUpdating || successMessage) return;

    const rawText = detectedCodes[0].rawValue;
    setErrorMessage(null);

    // LOGIC BRANCH 1: is it a workstation?
    if (rawText.startsWith('STATION:')) {
      //Expected format: STATION:{name}:{UUID}
      const parts = rawText.split(':');
      //safety check: 3 parts present in QR code?
      if (parts.length < 3) {
        setErrorMessage("Invalid Station QR: Missing essential parts.");
        return;
      }

      const stationName = parts[1];
      const stationId = parts[2];

      if (workstation?.id === stationId) return; //prevent double-scan same station

      const newStation = { id: stationId, name: stationName };
      setWorkStation(newStation);
      
    }

    // LOGIC BRANCH 2 : else assume is a component
    else {
      if (component?.id === rawText) return; //prevent double-scan same component

      setIsUpdating(true);
      // do a .select() FIRST to verify it exists, grab its name, but dont update yet until have both!
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('id', rawText);

      if (error || data.length === 0) {
        setErrorMessage("Invalid QR: Component does not exist in system");
        setIsUpdating(false);
        return;
      }

      const compName = data[0].name || "Unknown Component";

      const newComp = { id: rawText, name: compName };
      setComponent(newComp);
      setIsUpdating(false);
    }
  };

  //eeset function so worker can scan the next pair of items
  const resetScanner = () => {
    setComponent(null);
    setWorkStation(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    setSelectedStatus('in_progress');
  }

  const confirmStatus = async () => {
    if (!component || !workstation || isUpdating) return;
    setIsUpdating(true);

    const { error } = await supabase
      .from('components')
      .update({
        current_status: selectedStatus,
        current_workstation_id: workstation.id,
        current_workstation_name: workstation.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', component.id);

    if (error) {
      setErrorMessage("Database Error: " + error.message);
    } else {
      const label = STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label ?? selectedStatus;
      setSuccessMessage(`Component '${component.name}' is now ${label} at ${workstation.name}`);
    }
    setIsUpdating(false);
  };


  //if user denies camera permissions
  const handleError = (error: unknown) => {
    console.error(error);
    setErrorMessage("Camera error: Please ensure permissions are granted.");
  };

  return (
    //min-h-[100dvh] dynamic-viewport-height to perfectly fit mobile screens and prevent blockage by native navigational bar 
    //added 'relative' for the absolute logout button
    <main className="flex flex-col items-center min-h-[100dvh] bg-slate-900 p-6 relative">
      
      {/* Logout button pinned to TOP RIGHT */}
      <button onClick={() => logout()} className="absolute top-6 right-6 text-slate-400 underline hover:text-slate-200 text-sm font-semibold p-2">
        Logout
      </button>

      {/* Adjusted top margin to account for the absolute button */}
      <h1 className="text-3xl font-bold text-white mb-2 mt-4">Station Scanner</h1>

      {/* Dynamic Instruction Text */}
      {!successMessage && !(component && workstation) && (
        <p className="text-slate-400 mb-6 text-center">
          {!component && !workstation && "Scan Component and Workstation QR"}
          {component && !workstation && "Component scanned! Now scan Workstation."}
          {!component && workstation && "Workstation scanned! Now scan Component."}
        </p>
      )}

      {/* Memory Status Dashboard */}
      <div className="flex gap-4 mb-6 w-full max-w-sm">
        <div className={`flex-1 p-3 rounded text-center border-2 ${component ? 'border-green-500 bg-green-500/20 text-green-400' : 
          'border-slate-700 text-slate-500'}`}>
            <div className="text-xs uppercase font-bold tracking-wider">Component</div>
            <div className="font-semibold truncate">{component ? component.name : 'Waiting...'}</div>
          </div>
        <div className={`flex-1 p-3 rounded text-center border-2 ${workstation ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-slate-700 text-slate-500'}`}>
          <div className="text-xs uppercase font-bold tracking-wider">Workstation</div>
          <div className="font-semibold truncate">{workstation ? workstation.name : 'Waiting...'}</div>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-500 text-white font-bold p-4 rounded-lg w-full max-w-sm mb-4 text-center">
          {errorMessage}
        </div>
      )}

      {/* phase 1 camera -> phase 2 green status picker -> and thenphase 3 saved confirmation */}
      {successMessage ? (
         // PHASE 3: status saved
         <div className="mt-4 bg-green-500 text-white p-8 rounded-xl w-full max-w-sm
         text-center shadow-lg transform transition-all scale-105">
           <h2 className="text-2xl font-bold mb-4">Status Updated!</h2>
           <p className="text-lg font-medium mb-6 leading-relaxed">{successMessage}</p>
         </div>
       ) : (component && workstation) ? (
         // PHASE 2: both scanned adn then to green screen with status dropdown + confirm
         <div className="mt-4 bg-green-500 text-white p-8 rounded-xl w-full max-w-sm
         text-center shadow-lg transform transition-all scale-105">
           <h2 className="text-2xl font-bold mb-2">Scan Complete!</h2>
           <p className="text-lg font-medium mb-6 leading-relaxed">
             {component.name} @ {workstation.name}
           </p>

           <label className="block text-left text-sm font-bold uppercase tracking-wider mb-2">
             Update status to:
           </label>
           <select
             value={selectedStatus}
             onChange={(e) => setSelectedStatus(e.target.value)}
             className="w-full text-slate-900 font-bold text-xl p-4 rounded-xl mb-6"
           >
             {STATUS_OPTIONS.map((o) => (
               <option key={o.value} value={o.value}>{o.label}</option>
             ))}
           </select>

           <button
             onClick={confirmStatus}
             disabled={isUpdating}
             className="w-full bg-slate-900 text-white font-bold text-xl py-5 rounded-2xl
             active:scale-95 transition-all disabled:opacity-50"
           >
             {isUpdating ? 'Saving...' : 'Confirm Status'}
           </button>
         </div>
       ) : (
         // PHASE 1: still scanning -> camera 
         <div className="w-full max-w-sm overflow-hidden rounded-xl border-4 border-slate-700
         shadow-2xl relative bg-black min-h-[300px] flex items-center justify-center">
           <Scanner 
             onScan={handleScan}
             onError={handleError}
             formats={['qr_code']}
           />
           {isUpdating && (
             <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 backdrop-blur-sm">
               <span className="text-white font-bold text-xl animate-pulse">Processing...</span>
             </div>
           )}
         </div>
       )}


      

      {/* NEW RESET BUTTON: Big, bottom-pinned, glove friendly */}
      {/* Use mt-auto to push flex container to absolute bottom of screen */}
      <div className="w-full max-w-sm mt-auto pt-12 pb-4">
        {/* Only show button if there is actively something to reset (component, station, error, message) */}
        {(component || workstation || successMessage || errorMessage) && (
          <button
            onClick={resetScanner}
            className="w-full bg-slate-800 text-slate-200 font-bold text-xl py-6 rounded-2xl border-4 border-slate-700 shadow-lg
            active:scale-95 transition-all">
              {successMessage ? "Scan Next Item" : "Reset Current Scan"}
            </button>
        )}
      </div>

    </main>
  );
}