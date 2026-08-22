import { supabase } from "@/integrations/supabase/client";

export type JoinRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface JoinRequest {
  id: string;
  team_id: number;
  team_name: string;
  event_code: number;
  requester_user_id: string;
  requester_api_id: number | null;
  requester_name: string;
  requester_email: string;
  requester_avatar: string | null;
  captain_api_id: number | null;
  captain_email: string;
  message: string;
  status: JoinRequestStatus;
  response_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovoPedido {
  team_id: number;
  team_name: string;
  event_code: number;
  requester_api_id?: number | null;
  requester_name: string;
  requester_email: string;
  requester_avatar?: string | null;
  captain_api_id?: number | null;
  captain_email: string;
  message: string;
}

export const criarPedidoEntrada = async (pedido: NovoPedido): Promise<JoinRequest> => {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Você precisa estar logado");

  const { data, error } = await supabase
    .from("join_requests")
    .insert({
      ...pedido,
      requester_user_id: uid,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Você já tem um pedido pendente para este time.");
    }
    throw new Error(error.message);
  }
  return data as JoinRequest;
};

/** Pedidos feitos pelo usuário logado (opcionalmente de um time). */
export const listarMeusPedidos = async (teamId?: number): Promise<JoinRequest[]> => {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  let query = supabase
    .from("join_requests")
    .select("*")
    .eq("requester_user_id", uid)
    .order("created_at", { ascending: false });

  if (teamId != null) query = query.eq("team_id", teamId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as JoinRequest[];
};

/** Pedidos recebidos pelo capitão logado. */
export const listarPedidosRecebidos = async (
  teamId?: number,
  status: JoinRequestStatus | "all" = "pending"
): Promise<JoinRequest[]> => {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) return [];

  let query = supabase
    .from("join_requests")
    .select("*")
    .ilike("captain_email", email)
    .order("created_at", { ascending: false });

  if (teamId != null) query = query.eq("team_id", teamId);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as JoinRequest[];
};

export const responderPedido = async (
  id: string,
  status: Extract<JoinRequestStatus, "accepted" | "rejected">,
  resposta?: string
): Promise<void> => {
  const { error } = await supabase
    .from("join_requests")
    .update({ status, response_message: resposta ?? null })
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export const cancelarPedido = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("join_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw new Error(error.message);
};
