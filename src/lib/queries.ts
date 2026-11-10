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

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("ابتدا وارد شوید");
  return data.user.id;
}
