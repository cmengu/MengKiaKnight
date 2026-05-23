'use client';

import { useState } from 'react';

type StatusType = 'Pending' | 'In Progress' | 'Completed';

export default function Home() {

  const [status, setStatus] = useState<StatusType>('Pending');

  const updateStatus = () => {
    setStatus('In Progress');
  };

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