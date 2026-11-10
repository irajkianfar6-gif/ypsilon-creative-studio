import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Plant = Tables<"plants">;
export type Bill = Tables<"bills">;
export type Rate = Tables<"rate_table">;
export type Settlement = Tables<"settlements">;
export type Profile = Tables<"profiles">;

export const plantQuery = queryOptions({
  queryKey: ["plant"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const billQuery = queryOptions({
  queryKey: ["bill"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const ratesQuery = queryOptions({
  queryKey: ["rates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("rate_table")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

export const settlementsQuery = queryOptions({
  queryKey: ["settlements"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("settlements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.user.id)
      .maybeSingle();
    if (error) throw error;
    return { profile: data, email: u.user.email ?? "" };
  },
});

export type Notice = Tables<"notifications">;
export type Ticket = Tables<"tickets">;
export type TicketMessage = Tables<"ticket_messages">;
export type Consent = Tables<"consents">;
export type WorkOrder = Tables<"work_orders">;

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
});

export const ticketsQuery = queryOptions({
  queryKey: ["tickets"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tickets").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const ticketQuery = (id: string) =>
  queryOptions({
    queryKey: ["tickets", id],
    queryFn: async () => {
      const [t, m] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", id).maybeSingle(),
        supabase.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at"),
      ]);
      if (t.error) throw t.error;
      if (m.error) throw m.error;
      return { ticket: t.data, messages: m.data };
    },
  });

export const consentsQuery = queryOptions({
  queryKey: ["consents"],
  queryFn: async () => {
    const { data, error } = await supabase.from("consents").select("*");
    if (error) throw error;
    return data;
  },
});

export const workOrdersQuery = queryOptions({
  queryKey: ["work_orders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("work_orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export function persianDate(iso: string, style: "medium" | "short" = "medium") {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: style }).format(new Date(iso));
}

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("ابتدا وارد شوید");
  return data.user.id;
}
