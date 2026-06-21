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
  { ssr: false } // server-side rendering: false means only render on client side
)

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

  //core logic: when camera sees QR code
  const handleScan = async (detectedCodes: any) => {
    // stop scanning if updating, or already successfully finished both
    if (!detectedCodes || detectedCodes.length == 0 || isUpdating || successMessage) return;

    const rawText = detectedCodes[0].rawValue;
    setErrorMessage(null);

    //temporary variable to hold current state
    let currentComponent = component;
    let currentWorkstation = workstation;

    // LOGIC BRANCH 1: is it a workstation?
    if (rawText.startsWith('STATION:')) {
      //Expected format: STATION:{name}:{UUID}
      const parts = rawText.split(':');
      //safety check: 3 parts present in QR code?
      if (parts.length < 3) {
        setErrorMessage("Invalid Station QR: Missing UUID.");
        return;
      }

      const stationName = parts[1];
      const stationId = parts[2];

      if (workstation?.id === stationId) return; //prevent double-scan same station

      const newStation = { id: stationId, name: stationName };
      setWorkStation(newStation);
      currentWorkstation = newStation;
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
      currentComponent = newComp;
      setIsUpdating(false);
    }

    // FINAL CHECK: Do we have BOTH WORKSTATION & COMPONENT?
    if (currentComponent && currentWorkstation) {
      setIsUpdating(true);

      const { error } = await supabase  
        .from('components')
        .update({
          current_status: 'in_progress',
          current_workstation_id: currentWorkstation.id,
          current_workstation_name: currentWorkstation.name
        })
        .eq('id', currentComponent.id);

      if (error) {
        setErrorMessage("Database Error: " + error.message);
      } else {
        // SUCCESS! 
        setSuccessMessage(`Component '${currentComponent.name}' is now In Progress at ${currentWorkstation}`);
      }
      setIsUpdating(false);
    }
  };

  // Reset function so worker can scan the next pair of items
  const resetScanner = () => {
    setComponent(null);
    setWorkStation(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  //if user denies camera permissions
  const handleError = (error: unknown) => {
    console.error(error);
    setErrorMessage("Camera error: Please ensure permissions are granted.");
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-slate-900 p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Station Scanner</h1>

      {/* Dynamic Instruction Text */}
      {!successMessage && (
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

      {/* Hide camera if successfully scanned both */}
      {!successMessage ? (
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
      ) : (
        <div className="mt-4 bg-green-500 text-white p-8 rounded-xl w-full max-w-sm
        text-center shadow-lg transform transition-all scale-105">
          <h2 className="text-2xl font-bold mb-4">Pairing Complete!</h2>
          <p className="text-lg font-medium mb-6 leading-relaxed">{successMessage}</p>
          <button
            onClick={resetScanner}
            className="bg-white text-green-600 font-bold py-3 px-8 rounded-full 
            hover:bg-green-50 transition-colors shadow-md">
            Scan Next Item
          </button>
        </div>
      )}

      <button onClick={() => logout()} className="mt-12 text-slate-400 underline hover:text-slate-200">
        Logout
      </button>
    </main>
  );
}