import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
}

export interface UserRole {
  role: 'admin' | 'student';
}

export const checkUserRole = async (userId: string): Promise<'admin' | 'student'> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error || !data || data.length === 0) return 'student';
  
  // Prioriza admin se o usuário tiver múltiplos roles
  const hasAdmin = data.some(item => item.role === 'admin');
  return hasAdmin ? 'admin' : 'student';
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
};
