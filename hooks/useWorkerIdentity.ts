import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useWorkerIdentity() {
    const [workerName, setWorkerName] = useState<string>("Loading...");
    const [workerId, setWorkerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchWorkerIdentity = async () => {
            const { data: authData } = await supabase.auth.getUser();

            if (authData.user) {
                setWorkerId(authData.user.id)

                const { data: profile } = await supabase
                .from('user_profiles')
                .select('user_name')
                .eq('id', authData.user.id)
                .single();

                setWorkerName(profile?.user_name || "Unknown Worker");
            } else {
                setWorkerName("Unknown Worker");
            }
        };

        fetchWorkerIdentity();
    }, []);

    return { workerName, workerId };
}