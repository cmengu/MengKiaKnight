'use client'

export function PermissionInstructions({ os }: { os: string }){
    const renderSteps = () => {
        if (os === 'iOS') {
            return (
                <ul className="text-left text-sm text-slate-300 list-disc pl-5 space-y-2 mt-4">
                    <li>Tap the <strong>&apos;Aa&apos;</strong> icon in your URL bar.</li>
                    <li>Tap <strong>Website Settings</strong>.</li>
                    <li>Change Camera to <strong>Allow</strong>.</li>
                </ul>
            );
        }
        // NOTE: dis used to say 'Andriod' — typo meant android ppl always fell
        // thru to the desktop steps. useDeviceOS returns 'Android', so match dat.
        if (os === 'Android') {
            return (
            <ul className="text-left text-sm text-slate-300 list-disc pl-5 space-y-2 mt-4">
                <li>Tap the <strong>Lock icon</strong> next to the URL.</li>
                <li>Tap <strong>Permissions</strong>.</li>
                <li>Toggle Camera to <strong>Allow</strong>.</li>
            </ul> 
            );
        }
        return (
            <ul className="text-left text-sm text-slate-300 list-disc pl-5 space-y-2 mt-4">
                <li>Click the <strong>Lock icon</strong> in your browser&apos;s URL bar.</li>
                <li>Change Camera from Block to <strong>Allow</strong>.</li>
            </ul>
        );
    };

    return (
        <div className="w-full max-w-sm bg-slate-800 border-4 border-yellow-600 rounded-xl p-6 text-center shadow-2xl">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h2 className="text-xl font-bold text-white mb-2">Camera Access Blocked</h2>
            <p className="text-slate-400 text-sm">Your browser is preventing us from turning on the scanner.</p>
            {renderSteps()}
        </div>
    );
}