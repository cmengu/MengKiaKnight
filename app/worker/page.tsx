'use client'

import { useState } from 'react';
import { logout } from '@/app/actions/auth';

// importing a next/dynamic wrapper to prevent camera boot up before page even reaches user browser 
// and causing infinite loop memory crash 
// delay loading of heavy browser-only components
import dynamic from 'next/dynamic';
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false } // server-side rendering: false means only mounts on client side
)

//Hooks, services and components
import { useWorkerIdentity } from '@/hooks/useWorkerIdentity';
import { useDeviceOS } from '@/hooks/useDeviceOS';
import { scannerService } from '@/lib/services/scannerService';
import { MemoryDashboard } from '@/components/scanner/MemoryDashboard';
import { PermissionInstructions } from '@/components/scanner/PermissionInstructions';

//define a type for our component & workstation memory
type ScannedComponent = { id: string; name: string, status: string };
type ScannedStation = { id: string; name: string };

export default function WorkerScanner() {
  // 1. Initialize hooks
  const { workerName, workerId } = useWorkerIdentity();
  const { os } = useDeviceOS();

  // 2. UI states
  const [component, setComponent] = useState<ScannedComponent | null>(null);
  const [workstation, setWorkStation] = useState<ScannedStation | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  //boolean checker to stop camera from spamming database
  const [isUpdating, setIsUpdating] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  // 3. Traffic routing logic
  const handleScan = async (detectedCodes: any) => {
    // stop scanning if updating, or already successfully finished both
    if (!detectedCodes || detectedCodes.length === 0 || isUpdating || successMessage) return;

    const rawText = detectedCodes[0].rawValue;
    setErrorMessage(null);

    //temporary variable to hold current state
    let currentComponent = component;
    let currentWorkstation = workstation;

    try{
      // LOGIC BRANCH 1: Workstation
      if (rawText.startsWith('STATION:')) {
        const parsedStation = scannerService.parseWorkstationQR(rawText);
        if (workstation?.id === parsedStation.id) return;
        setWorkStation(parsedStation);
        currentWorkstation = parsedStation;
      }

      // LOGIC BRANCH 2: Component
      else {
        if (component?.id === rawText) return;
        setIsUpdating(true);
        const { name, currentStatus } = await scannerService.verifyComponent(rawText);
        const newComp = { id: rawText, name, status: currentStatus };
        setComponent(newComp);
        currentComponent = newComp;
        setIsUpdating(false);
      }

      // FINAL CHECK: Double-Tap Transaction
      if (currentComponent && currentWorkstation && workerId) {
        setIsUpdating(true);
        await scannerService.processPairing(
          currentComponent.id,
          currentComponent.name,
          currentWorkstation.id,
          currentWorkstation.name,
          workerName,
          workerId,
          currentComponent.status
        );
        setSuccessMessage(`Component '${currentComponent.name}' is now In Progess at ${currentWorkstation.name}`);
        setIsUpdating(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An Unexpected error occurred.");
      setIsUpdating(false);
    }
  }; 

  // Reset function so worker can scan the next pair of items
  const resetScanner = () => {
    setComponent(null);
    setWorkStation(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    setCameraBlocked(false);
  }

  //if user denies camera permissions
  const handleError = (error: any) => {
    console.error("Camera Error Payload:", error);
    if (error?.name === 'NotAllowedError' || error?.message?.toLowerCase().includes('permission')) {
      setCameraBlocked(true);
      setErrorMessage(null);
    } else {
      setErrorMessage("Camera error: " + (error?.message || "Ensure permissions are given"));
    }
  };

  // Rendered UI
  return (
    //min-h-[100dvh] dynamic-viewport-height to perfectly fit mobile screens and prevent blockage by native navigational bar 
    //added 'relative' for the absolute logout button
    <main className="flex flex-col items-center min-h-[100dvh] bg-slate-900 p-6 relative">
      
      {/* Logout button pinned to TOP RIGHT */}
      <button onClick={() => logout()} className="absolute top-6 right-6 text-slate-400 underline hover:text-slate-200 text-sm font-semibold p-2">
        Logout
      </button>

      <div className="w-full max-w-sm mt-4 text-left">
        <p className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-1">Active Worker</p>
        <p className="text-white text-xl font-bold mb-4">{workerName}</p>
      </div>

      {/* Adjusted top margin to account for the absolute button */}
      <h1 className="text-3xl font-bold text-slate-200 mb-2">Station Scanner</h1>

      {/* Dynamic Instruction Text */}
      {!successMessage && !cameraBlocked && (
        <p className="text-slate-400 mb-6 text-center">
          {!component && !workstation && "Scan Component and Workstation QR"}
          {component && !workstation && "Component scanned! Now scan Workstation."}
          {!component && workstation && "Workstation scanned! Now scan Component."}
        </p>
      )}

      {/* Extracted MemoryDashboard Component */}
      <MemoryDashboard component={component} workstation={workstation} />

      {errorMessage && (
        <div className="bg-red-500 text-white font-bold p-4 rounded-lg w-full max-w-sm mb-4 text-center">
          {errorMessage}
        </div>
      )}

      {cameraBlocked ? (
        //Extracted Component
        <PermissionInstructions os={os} />
      ) : !successMessage ? (
        <div className="w-full max-w-sm overflow-hidden rounded-xl border-4 border-slate-700 shadow-2xl relative bg-black 
        min-h-[300px] flex items-center justify-center">
          <Scanner onScan={handleScan} onError={handleError} formats={['qr_code']} />
          {isUpdating && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 blackdrop-blur-sm">
              <span className="text-white font-bold text-xl animate-pulse">Processing...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 bg-green-500 text-white p-8 rounded-xl w-full max-w-sm text-center shadow-lg transform transition-all scale-105">
          <h2 className="text-2xl font-bold mb-4">Pairing Complete!</h2>
          <p className="text-lg font-medium mb-6 leading-relaxed">{successMessage}</p>
        </div>
      )}

      <div className="w-full max-w-sm mt-auto pt-12 pb-4">
        {(component || workstation || successMessage || errorMessage || cameraBlocked) && (
          <button
            onClick={resetScanner}
            className={`w-full font-bold text-xl py-6 rounded-2xl border-4 shadow-lg active:scale-95 transition-all ${
              cameraBlocked ? 'bg-yellow-600 text-white border-yellow-700 hover:bg-yellow-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}>
              {successMessage ? "Scan Next Item" : cameraBlocked ? "I've allowed access,. try again" : "Reset Current Scan"}
            </button>
        )}
      </div>

    </main>
  );
}