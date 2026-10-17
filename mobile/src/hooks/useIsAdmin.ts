import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useIsAdmin() {
  const { user } = useAuth();
  const [checked, setChecked] = useState<{ id: string; admin: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    const id = user.id;
    let cancelled = false;
    (async () => {
      await supabase.rpc('claim_founder_admin');
      const { data } = await supabase.rpc('has_role', { _user_id: id, _role: 'admin' });
      if (!cancelled) setChecked({ id, admin: !!data });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return !!user && checked?.id === user.id && checked.admin;
}
