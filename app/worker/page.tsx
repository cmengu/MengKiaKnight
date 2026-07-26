'use client'

import { useState, useEffect } from 'react';
import { logout } from '@/actions/auth';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/lib/supabase'


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
import {
  scannerService,
  processQaReroute,
  type VerifiedComponent,
  type VerifiedStation,
} from '@/lib/services/scannerService';
import {
  legalMoves,
  STATUS_LABELS,
  type ComponentStatus,
} from '@/lib/services/statusTransitions';
import { MemoryDashboard } from '@/components/scanner/MemoryDashboard';
import { PermissionInstructions } from '@/components/scanner/PermissionInstructions';

// `unknown` is what a modern catch block gives you, so squeeze a readable string
// out of it without pretending we know the shape
function errMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function WorkerScanner() {
  // 1. Initialize hooks
  const { workerName, workerId } = useWorkerIdentity();
  const { os } = useDeviceOS();

  // 2. UI states
  const [component, setComponent] = useState<VerifiedComponent | null>(null);
  const [workstation, setWorkStation] = useState<VerifiedStation | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);
  const [logWarning, setLogWarning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  //boolean checker to stop camera from spamming database
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ComponentStatus | null>(null);
  //core logic: when camera sees QR code
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(true);

  //QA rerouting states
  const [isRerouting, setIsRerouting] = useState(false);
  const [defectNote, setDefectNote] = useState('');
  const [reworkStationId, setReworkStationId] = useState('');
  const [allWorkstations, setAllWorkstations] = useState<{ id: string, name: string }[]>([]);

  // Fetch workstations on mount so the QA dropdown is ready
  useEffect(() => {
    supabase
      .from('workstations')
      .select('id, name')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setAllWorkstations(data);
      });
  }, []);

  // What dis worker is actually allowed to do right now. Worked out fresh on every
  // render from the component's real status + whether they're at the last station,
  // so the dropdown physically cannot offer an illegal move.
  const moves = component && workstation
    ? legalMoves(component.currentStatus, workstation.isFinalStation)
    : [];

  // Fall back to the first option if they haven't picked yet — or if they picked
  // something that stopped being legal because they rescanned a different station.
  const activeMove = moves.find((m) => m.to === selectedStatus) ?? moves[0] ?? null;

  // 3. Traffic routing logic
  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    // stop scanning if updating, or already successfully finished both
    if (!detectedCodes || detectedCodes.length === 0 || isUpdating || successMessage) return;

    const rawText = detectedCodes[0].rawValue;
    setErrorMessage(null);

    try {
      // LOGIC BRANCH 1: Workstation
      if (rawText.startsWith('STATION:')) {
        const parsed = scannerService.parseWorkstationQR(rawText);
        if (workstation?.id === parsed.id) return;

        setIsUpdating(true);
        // the QR only tells us what it CLAIMS to be. check it against the db —
        // that's also how we find out if dis is the final station, which decides
        // whether "Completed" is even on the menu
        const verified = await scannerService.verifyWorkstation(parsed.id);

        setWorkStation(verified);
      }

      // LOGIC BRANCH 2: Component
      else {
        if (component?.id === rawText) return;

        setIsUpdating(true);
        const verified = await scannerService.verifyComponent(rawText);
        setComponent(verified);
      }
    }

    // FINAL CHECK: Double-Tap Transaction
    catch (err: unknown) {

      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

      setErrorMessage(errMessage(err, "An Unexpected error occurred."));
    }

    setIsUpdating(false);
  };

  //reset function so worker can scan the next pair of items
  const resetScanner = () => {
    setComponent(null);
    setWorkStation(null);
    setSuccessMessage(null);
    setSuccessHint(null);
    setLogWarning(null);
    setErrorMessage(null);
    setSelectedStatus(null);
    setCameraBlocked(false);

    //HARD RESET TO KILL SCANNER COMPLETELY AND FIX UNABLE RESCAN BUG
    setIsScannerActive(false);

    //bring back to life 50ms later, so library's cache is permanently destroyed
    setTimeout(() => {
      setIsScannerActive(true);
    }, 50);
  }

  const confirmStatus = async () => {
    if (!component || !workstation || !activeMove || isUpdating) return;
    if (!workerId) {
      setErrorMessage("Authentication Error: Cannot verify your worker ID. Please log out and log back in.");
      return;
    }
    setIsUpdating(true);
    try {
      const result = await scannerService.processPairing({
        component,
        station: workstation,
        toStatus: activeMove.to,
        workerName,
        workerId,
      });

      // dis message used to report whatever the worker picked, even though the
      // database always wrote 'in_progress'. now it reports what actually landed.
      setSuccessMessage(
        `Component '${component.name}' is now ${STATUS_LABELS[result.newStatus]} at ${workstation.name}`
      );
      setSuccessHint(activeMove.hint);
      setLogWarning(result.logWarning ?? null);
    } catch (err: unknown) {
      setErrorMessage(errMessage(err, "Database Error"));
    }
    setIsUpdating(false);
  };

  const handleQaSubmit = async () => {
    if (!component || !reworkStationId || !defectNote.trim()) return;

    setIsUpdating(true);
    setErrorMessage(null); // Or setErrorMessage('') depending on your state setup

    try {
      // Find the name of the target station for the audit log
      const targetStation = allWorkstations.find(s => s.id === reworkStationId);
      const reworkStationName = targetStation ? targetStation.name : 'Unknown Station';

      const currentWorkerName = workerName

      // 2. Fire the backend routing logic
      await processQaReroute(
        component.id,
        component.name,
        component.currentStatus,
        reworkStationId,
        reworkStationName,
        defectNote,
        currentWorkerName
      );

      // 3. Trigger Phase 3 (Success Screen)
      setSuccessMessage('Defect Flagged & Rerouted!');
      setSuccessHint(`Sent back to ${reworkStationName} with defect note.`);
      setIsRerouting(false); // Close the red modal

    } catch (err: unknown) {
      console.error("Reroute failed:", err);
      setErrorMessage(errMessage(err, 'Failed to reroute component. Please try again.'));
    } finally {
      setIsUpdating(false);
    }
  };

  //if user denies camera permissions
  const handleError = (error: unknown) => {
    console.error("Camera Error Payload:", error);
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : '';

    if (name === 'NotAllowedError' || message.toLowerCase().includes('permission')) {
      setCameraBlocked(true);
      setErrorMessage(null);
    } else {
      setErrorMessage("Camera error: " + (message || "Ensure permissions are given"));
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
      {!successMessage && !(component && workstation) && !cameraBlocked && (
        <p className="text-slate-400 mb-6 text-center">
          {!component && !workstation && "Scan Component and Workstation QR"}
          {component && !workstation && "Component scanned! Now scan Workstation."}
          {!component && workstation && "Workstation scanned! Now scan Component."}
        </p>
      )}

      {/* Extracted MemoryDashboard Component */}
      <MemoryDashboard component={component} workstation={workstation} />

      {/* current state of the part, so the worker can see what they're changing FROM */}
      {component && !successMessage && (
        <div className="w-full max-w-sm -mt-2 mb-4 flex items-center justify-center gap-2 text-sm">
          <span className="text-slate-500">Currently</span>
          <span className="font-bold text-slate-200 uppercase tracking-wider">
            {STATUS_LABELS[component.currentStatus]}
          </span>
          {workstation?.isFinalStation && (
            <span className="ml-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              Final Station
            </span>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500 text-white font-bold p-4 rounded-lg w-full max-w-sm mb-4 text-center">
          {errorMessage}
        </div>
      )}

      {/* phase 1 camera -> phase 2 green status picker -> and thenphase 3 saved confirmation */}
      {successMessage ? (
        // PHASE 3: status saved
        <div className="mt-4 bg-slate-800 border-2 border-emerald-500 text-white p-8 rounded-2xl w-full max-w-sm text-center shadow-[0_0_30px_rgba(16,185,129,0.2)] transform transition-all scale-105">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-bold text-emerald-400 mb-2">Status Updated!</h2>
          <p className="text-lg text-slate-300 font-medium leading-relaxed">{successMessage}</p>
          {successHint && (
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">{successHint}</p>
          )}
          {/* snapshot saved but the audit row didn't — say so instead of hiding it */}
          {logWarning && (
            <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-4 leading-relaxed">
              {logWarning}
            </p>
          )}
        </div>
      ) : (component && workstation) ? (
        moves.length === 0 ? (
          // DEAD END: dis component already finished the line, nothing left to do
          <div className="mt-4 bg-slate-800 border-2 border-sky-500 text-white p-8 rounded-2xl w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold text-sky-400 mb-2">Already Completed</h2>
            <p className="text-slate-300 leading-relaxed">
              {component.name} has finished the line, so it cannot be updated again.
            </p>
          </div>
        ) : (
          // PHASE 2: both scanned adn then to green screen with status dropdown + confirm
          isRerouting ? (
            //  THE RED QA REWORK FORM FOR QA STATIONS
            <div className="mt-4 bg-red-600 text-white p-8 rounded-xl w-full max-w-sm text-center shadow-2xl transform transition-all scale-105">
              <h2 className="text-2xl font-bold mb-2">Flag Defect & Reroute</h2>
              <p className="text-sm font-medium mb-6 text-red-200 leading-relaxed">
                {component.name} @ {workstation.name}
              </p>

              {/* Select the workstation that messed up */}
              <label className="block text-left text-sm font-bold uppercase tracking-wider mb-2">
                Responsible Workstation *
              </label>
              <select
                value={reworkStationId}
                onChange={(e) => setReworkStationId(e.target.value)}
                className="w-full text-slate-900 font-bold text-lg p-3 rounded-xl mb-4 focus:ring-4 focus:ring-red-400 outline-none"
              >
                <option value="" disabled>-- Select Workstation --</option>
                {allWorkstations.map(station => (
                  <option key={station.id} value={station.id}>{station.name}</option>
                ))}
              </select>
              {/* Write the reason for flagging as defect */}
              <label className="block text-left text-sm font-bold uppercase tracking-wider mb-2">
                Defect Note *
              </label>
              <textarea
                value={defectNote}
                onChange={(e) => setDefectNote(e.target.value)}
                placeholder="e.g. Scratched chassis, failed voltage test..."
                className="w-full text-slate-900 text-base p-3 rounded-xl mb-6 min-h-[100px] focus:ring-4 focus:ring-red-400 outline-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setIsRerouting(false)}
                  className="flex-1 bg-red-800 text-white font-bold py-4 rounded-xl active:scale-95 transition-all hover:bg-red-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQaSubmit}
                  disabled={!reworkStationId || !defectNote.trim() || isUpdating}
                  className="flex-2 bg-slate-900 text-white font-bold py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Confirm Reroute'}
                </button>
              </div>
            </div>
          ) : (
            //  THE STANDARD GREEN UI FOR NON QA STATIONS
            <div className="mt-4 bg-emerald-500 text-white p-8 rounded-xl w-full max-w-sm text-center shadow-lg transform transition-all scale-105">
              <h2 className="text-2xl font-bold mb-2">Scan Complete!</h2>
              <p className="text-lg font-medium mb-6 leading-relaxed">
                {component.name} @ {workstation.name}
              </p>

              <label className="block text-left text-sm font-bold uppercase tracking-wider mb-2">
                What did you do?
              </label>
              <select
                value={activeMove?.to ?? ''}
                onChange={(e) => setSelectedStatus(e.target.value as ComponentStatus)}
                className="w-full text-slate-900 font-bold text-xl p-4 rounded-xl mb-2"
              >
                {moves.filter((move) => move.to !== 'flagged') /* THIS STRIPS OUT DEFECT OPTION */
                  .map((move) => (
                    <option key={move.to} value={move.to}>{move.label}</option>
                  ))}
              </select>

              {/* plain-english explanation of what the pick actually does */}
              {activeMove && (
                <p className="text-left text-sm text-white/90 mb-6 leading-relaxed">
                  {activeMove.hint}
                </p>
              )}

              <button
                onClick={confirmStatus}
                disabled={isUpdating}
                className="w-full bg-slate-900 text-white font-bold text-xl py-5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 mb-3"
              >
                {isUpdating ? 'Saving...' : 'Confirm Status'}
              </button>

              {/*  THE RED ALERT FLIP BUTTON (ONLY VISIBLE IF QA STATION)  */}
              {workstation.isQa && (
                <button
                  onClick={() => setIsRerouting(true)}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2"
                >
                  🚨 Flag Defect & Reroute
                </button>
              )}
            </div>
          )
        )
      ) : cameraBlocked ? (
        // camera permission denied leads to OS-specific instructions
        <PermissionInstructions os={os} />
      ) : (
        // PHASE 1: still scanning -> camera
        <div className="w-full max-w-sm overflow-hidden rounded-xl border-4 border-slate-700
         shadow-2xl relative bg-black min-h-[300px] flex items-center justify-center">
          {/*Conditional wrapping for reset scan debug */}
          {isScannerActive && (
            <Scanner
              onScan={handleScan}
              onError={handleError}
              formats={['qr_code']}
            />
          )}
          {isUpdating && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 backdrop-blur-sm">
              <span className="text-white font-bold text-xl animate-pulse">Processing...</span>
            </div>
          )}
        </div>
      )}




      <div className="w-full max-w-sm mt-auto pt-12 pb-4">
        {(component || workstation || successMessage || errorMessage || cameraBlocked) && (
          <button
            onClick={resetScanner}
            className={`w-full font-bold text-xl py-6 rounded-2xl border-4 shadow-lg active:scale-95 transition-all ${cameraBlocked ? 'bg-yellow-600 text-white border-yellow-700 hover:bg-yellow-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}>
            {successMessage ? "Scan Next Item" : cameraBlocked ? "I've allowed access,. try again" : "Reset Current Scan"}
          </button>
        )}
      </div>

    </main>
  );
}
