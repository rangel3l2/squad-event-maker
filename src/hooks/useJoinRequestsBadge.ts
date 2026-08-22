import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Contador em tempo real de pedidos pendentes recebidos pelo capitão logado. */
export const useJoinRequestsBadge = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.email) {
      setCount(0);
      return;
    }
    const { count: total, error } = await supabase
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .ilike("captain_email", user.email)
      .eq("status", "pending");

    if (!error) setCount(total ?? 0);
  }, [user?.email]);

  useEffect(() => {
    void refresh();
    if (!user?.email) return;

    const channel = supabase
      .channel("join-requests-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "join_requests" },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, refresh]);

  return { count, refresh };
};
