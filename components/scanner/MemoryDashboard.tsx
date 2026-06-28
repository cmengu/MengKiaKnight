'use client'

type ScannedComponent = { id: string, name: string; status:string };
type ScannedStation = { id: string; name: string };

export function MemoryDashboard({ component, workstation}: { component: ScannedComponent | null, workstation: ScannedStation | null }) {
    return (
        <div className="flex gap-4 mb-6 w-full max-w-sm">
            <div className={`flex-1 p-3 rounded text-center border-2 ${component ? 'border-green-500 bg-green-500/20 text-green-400' : 
                'border-slate-700 text-slate-500'
            }`}>
                <div className="text-xs uppercase font-bold tracking-wider">Component</div>
                <div className="font-semibold truncate">{component ? component.name: 'Waiting...'}</div>
            </div>
            <div className={`flex-1 p-3 rounded text-center border-2 ${workstation ? 'border-green-500 bg-green-500/20 text-green-400' : 
                'border-slate-700 text-slate-500'
            }`}>
                <div className="text-xs uppercase font-bold tracking-wider">Workstation</div>
                <div className="font-semibold truncate">{workstation ? workstation.name: 'Waiting...'}</div>
            </div>
        </div>


    )
}