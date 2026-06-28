import { supabase } from '@/lib/supabase';

export const scannerService = {

    // 1. Parse "Smart" workstation qr code
    parseWorkstationQR(rawText: string) {
        const parts = rawText.split(':');

        //safety check
        if (parts.length < 3) {
            throw new Error("Invalid Station QR: Missing essential parts.");
        }

        return {
            name: parts[1],
            id: parts[2]
        };
    },

    // 2. Lookup "Dumb" component qr code
    async verifyComponent(uuid:string) {
        const { data, error } = await supabase
            .from('components')
            .select('*')
            .eq('id', uuid);

        if (error || !data || data.length === 0) {
            throw new Error("Invalid QR: Component does not exist in system");
        }

        return {
            name: data[0].name || "Unknown Component",
            currentStatus: data[0].current_status || "pending"
        };
    },

    // 3. The Double-tap database update
    async processPairing(
        componentId: string, 
        componentName: string,
        workstationId: string, 
        workstationName: string, 
        workerName: string,
        workerId: string,
        fromStatus: string,
        toStatus: string    
    ) {
        // Action 1: Update Component snapshot
        const { error: componentError } = await supabase   
            .from('components')
            .update({
                current_status: 'in_progress',
                current_workstation_id: workstationId,
                current_workstation_name: workstationName,
                last_updated_by: workerName,
                updated_at: new Date().toISOString()
            })
            .eq('id', componentId);

        if (componentError) {
            throw new Error("Component Update Error: " + componentError.message);
        }

        //Action 2: Write to audit trail (status_logs)
        const { error: logError } = await supabase
            .from('status_logs')
            .insert({
                component_id: componentId,
                component_name: componentName,
                from_status: fromStatus,
                to_status: 'in_progress',
                workstation_name: workstationName,
                updated_by: workerId,
                worker_name: workerName
            });

        if(logError) {
            console.error("Failed to write log:", logError);
        }
    
        return true;
    }
}