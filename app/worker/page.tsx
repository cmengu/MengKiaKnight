'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logout } from '@/app/actions/auth';
// importing a next/dynamic wrapper to prevent camera boot up before page even reaches user browser 
// and causing infinite loop memory crash
import dynamic from 'next/dynamic';
//delay loading of heavy browser-only components
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false } // server-side rendering: false means only render on client side
)

export default function WorkerScanner() {
  //short-term memory for UI
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  //boolean checker to stop camera from spamming database
  const [isUpdating, setIsUpdating] = useState(false);

  //core logic: when camera sees QR code
  const handleScan = async (detectedCodes: any) => {
    //if see code AND aren't currently locked in a database request to prevent overloading DB
    if (detectedCodes && detectedCodes.length > 0 && !isUpdating) {
      const uuid = detectedCodes[0].rawValue;

      //prevent scanning same item twice in a row
      if (uuid == scannedId) return;

      setIsUpdating(true); //lock camera
      setErrorMessage(null); //clear old errors

      //contact supabase dynamically
      const { data, error } = await supabase
                                    .from('components')
                                    .update({ current_status: 'in_progress'})
                                    .eq('id', uuid) 
                                    .select();

      if (error) {
        setErrorMessage("Database Error: " + error.message); //db error
      } else if (data.length == 0) {
        setErrorMessage("Invalid QR: Component not found in our system."); //unhappy paths wrong QR scanned
      } else {
        setScannedId(uuid); //success
      }

      setIsUpdating(false); //unlock camera
    }
  };

  //if user denies camera permissions
  const handleError = (error: unknown) => {
    console.error(error);
    setErrorMessage("Camera error: Please ensure permissions are granted.");
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-slate-900 p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Station Scanner</h1>
      <p className="text-slate-400 mb-8">Aim camera at the component and workstation QR code</p>

      {/*Unhappy path: Display errors */}
      {errorMessage && (
        <div className="bg-red-500 text-white font-bold p-4 rounded-lg w-full max-w-sm mb-4 text-center">
          {errorMessage}
        </div>
      )}

      {/* The camera viewpoint*/}
      <div className="w-full max-w-sm overflow-hidden rounded-xl border-4 border-slate-700 shadow-2xl relative bg-black min-h-[300px]">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          formats={['qr_code']} // Optimization: Ignore standard barcodes
        />

        {/* Loading overlay when waiting for Supabase */}
        {isUpdating && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
            <span className="text-white font-bold text-xl animate-pulse">Updating Database...</span>
          </div>
        )}
      </div>

      {/* Happy Path: Display success */}
      {scannedId && (
        <div className="mt-8 bg-green-500 text-white p-6 rounded-lg w-full max-w-sm text-center">
          <h2 className="text-xl font-bold mb-2">Status: Updated to 'In Progress'!</h2>
          <p className="font-mono text-xs break-all">{scannedId}</p>
        </div>
      )}

      <button
        onClick={() => logout()}
        className="mt-12 text-slate-400 underline hover:text-slate-200"
      >
        Logout
      </button>
    </main>
  )
}