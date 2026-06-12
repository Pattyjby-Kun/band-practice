"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertMemberProfile(
  supabase: SupabaseClient,
  params: { displayName: string; instrument: string }
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated");

  const { data: existing, error: existingError } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("members")
      .update({
        display_name: params.displayName,
        instrument: params.instrument,
      })
      .eq("user_id", user.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("members").insert({
    user_id: user.id,
    display_name: params.displayName,
    instrument: params.instrument,
  });

  if (error) throw error;
}
