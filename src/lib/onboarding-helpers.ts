import { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES, CATEGORY_ICONS } from "@/lib/constants/categories";

export async function finishOnboarding(supabase: SupabaseClient, userId: string) {
  // Get current profile state
  const { data: profile } = await supabase
    .from("profiles")
    .select("gross_income, onboarding_complete")
    .eq("id", userId)
    .single();

  if (profile?.onboarding_complete) return;

  // If no envelopes exist yet, create defaults with even split
  const { data: existingEnvelopes } = await supabase
    .from("envelopes")
    .select("id")
    .eq("profile_id", userId)
    .limit(1);

  if (!existingEnvelopes || existingEnvelopes.length === 0) {
    const pctEach = Math.floor(100 / DEFAULT_CATEGORIES.length);
    await supabase.from("envelopes").insert(
      DEFAULT_CATEGORIES.map((c, i) => ({
        profile_id: userId,
        name: c.name,
        icon: c.icon,
        percentage: i === 0 ? pctEach + (100 - pctEach * DEFAULT_CATEGORIES.length) : pctEach,
        monthly_budget: 0,
        sort_order: i,
      }))
    );
  }

  // Create budget period for current month if none exists
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endDate.getDate();

  const { data: existingPeriod } = await supabase
    .from("budget_periods")
    .select("id")
    .eq("profile_id", userId)
    .gte("start_date", startDate.toISOString().split("T")[0])
    .limit(1);

  if (!existingPeriod || existingPeriod.length === 0) {
    await supabase.from("budget_periods").insert({
      profile_id: userId,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      total_variable_budget: 0,
      days_in_period: daysInMonth,
    });
  }

  // Mark onboarding complete
  await supabase
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", userId);
}
