import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useWorkerIdentity() {
    const [workerName, setWorkerName] = useState<string>("Loading...");
    const [workerId, setWorkerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchWorkerIdentity = async () => {
            const { data: authData, error: authError } = await supabase.auth.getUser();

            if (authError) {
                console.error("Auth Error:", authError.message);
                setWorkerName("Unknown Worker");
                return;
            }

            if (authData?.user) {
                setWorkerId(authData.user.id)

                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('user_name')
                    .eq('id', authData.user.id)
                    .single();

                if (profileError) {
                    console.error("Profile Fetch Error:", profileError.message); //debugging cause broken for some reason
                }

                setWorkerName(profile?.user_name || "Unknown Worker");
            } else {
                setWorkerName("Unknown Worker");
            }
        };

        fetchWorkerIdentity();
    }, []);

    return { workerName, workerId };
}