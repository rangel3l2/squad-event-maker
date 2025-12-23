import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!error && data && data.length > 0) {
          // Prioritize admin if user has multiple roles
          const hasAdmin = data.some(item => item.role === 'admin');
          setRole(hasAdmin ? 'admin' : data[0].role);
        } else {
          setRole('student');
        }
      } catch {
        setRole('student');
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  return { role, loading, isAdmin: role === 'admin' };
};
