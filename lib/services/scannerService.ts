import { supabase } from '@/lib/supabase';
import {
    assertTransition,
    isComponentStatus,
    type ComponentStatus,
} from '@/lib/services/statusTransitions';

/** A workstation the database has actually confirmed exists and is switched on. */
export type VerifiedStation = {
    id: string;
    name: string;
    isFinalStation: boolean;
};

/** A component the database has actually confirmed exists, with a status we recognise. */
export type VerifiedComponent = {
    id: string;
    name: string;
    currentStatus: ComponentStatus;
};

export type PairingResult = {
    newStatus: ComponentStatus;
    /** Set when the snapshot saved but the audit-trail row didn't. See processPairing. */
    logWarning?: string;
};

export const scannerService = {

    // 1. Pull the name + id out of a workstation QR code.
    //
    // Format is  STATION:<name>:<uuid>
    //
    // We read the uuid off the END rather than position 2, because station names are
    // free text. The moment somebody names a station "Line 2: Assembly" a naive
    // split grabs " Assembly" as the id and every single scan at that station dies
    // with a confusing "does not exist" error.
    parseWorkstationQR(rawText: string) {
        const parts = rawText.split(':');

        //safety check
        if (parts.length < 3 || parts[0] !== 'STATION') {
            throw new Error("Invalid Station QR: Missing essential parts.");
        }

        const id = parts[parts.length - 1].trim();
        // everything between the prefix and the id is the name, colons and all
        const name = parts.slice(1, -1).join(':').trim();

        if (!id || !name) {
            throw new Error("Invalid Station QR: Missing essential parts.");
        }

        return { name, id };
    },

    // 2. The QR says who it is — the database decides whether we believe it.
    //
    // Also where we find out if dis is the final station, which is what decides
    // whether the worker is even allowed to pick "Completed".
    async verifyWorkstation(id: string): Promise<VerifiedStation> {
        const { data, error } = await supabase
            .from('workstations')
            .select('id, name, is_final_station, is_active')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            throw new Error("Could not check that workstation: " + error.message);
        }
        if (!data) {
            throw new Error("Invalid Station QR: This workstation is not in the system.");
        }
        if (!data.is_active) {
            throw new Error(`Workstation "${data.name}" has been deactivated. Please ask your manager.`);
        }

        return {
            id: data.id,
            name: data.name,
            isFinalStation: data.is_final_station,
        };
    },

    // 3. Lookup "Dumb" component qr code
    async verifyComponent(uuid: string): Promise<VerifiedComponent> {
        const { data, error } = await supabase
            .from('components')
            .select('id, name, current_status')
            .eq('id', uuid)
            .maybeSingle();

        if (error) {
            throw new Error("Could not look up that component: " + error.message);
        }
        if (!data) {
            throw new Error("Invalid QR: Component does not exist in system");
        }

        // if the db is holding something we don't recognise, say so loudly rather
        // than guessing — a silent default is how you end up with mystery states
        const rawStatus = data.current_status ?? 'pending';
        if (!isComponentStatus(rawStatus)) {
            throw new Error(
                `Component "${data.name}" has an unrecognised status ("${rawStatus}"). Please tell your manager.`,
            );
        }

        return {
            id: data.id,
            name: data.name || "Unknown Component",
            currentStatus: rawStatus,
        };
    },

    // 4. The Double-tap database update
    //
    // Takes an object rather than eight positional arguments. The old signature ended
    // `..., fromStatus: string, toStatus: string)` and two strings sitting next to each
    // other is exactly how `toStatus` got quietly ignored for so long.
    async processPairing(params: {
        component: VerifiedComponent;
        station: VerifiedStation;
        toStatus: ComponentStatus;
        workerName: string;
        workerId: string;
    }): Promise<PairingResult> {
        const { component, station, toStatus, workerName, workerId } = params;

        // Gate it here as well as in the UI. The picker only ever offers legal moves,
        // but a stale tab or a replayed request shouldn't get to sneak past the rules.
        assertTransition(component.currentStatus, toStatus, station.isFinalStation);

        // Action 1: Update Component snapshot
        const { error: componentError } = await supabase
            .from('components')
            .update({
                current_status: toStatus,   // was hardcoded 'in_progress'. dis was THE bug.
                current_workstation_id: station.id,
                current_workstation_name: station.name,
                last_updated_by: workerName,
                updated_at: new Date().toISOString()
            })
            .eq('id', component.id);

        if (componentError) {
            throw new Error("Component Update Error: " + componentError.message);
        }

        //Action 2: Write to audit trail (status_logs)
        const { error: logError } = await supabase
            .from('status_logs')
            .insert({
                component_id: component.id,
                component_name: component.name,
                from_status: component.currentStatus,
                to_status: toStatus,             // also used to be hardcoded
                workstation_id: station.id,      // never written before — which is why every
                workstation_name: station.name,  // chatbot join on dis column came back empty
                updated_by: workerId,
                worker_name: workerName
            });

        // Deliberately not throwing here. The snapshot above already landed, so blowing
        // up now would send the worker back to rescan and we'd double-log the move.
        // Hand the warning upward instead and let the UI say something honest.
        //
        // TODO(tech-debt): these two writes should be one postgres function so they're
        // atomic. That's a migration, not a code change, so it's its own piece of work.
        if (logError) {
            console.error("Failed to write log:", logError);
        }

        return {
            newStatus: toStatus,
            logWarning: logError
                ? "Status saved, but the audit log entry failed. Please tell your manager."
                : undefined,
        };
    }
}
