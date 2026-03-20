import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch all data for the store
  const [
    { data: profile },
    { data: deductionsRow },
    { data: fixedExpenses },
    { data: savingsTarget },
    { data: envelopes },
    { data: transactions },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("monthly_deductions")
      .select("*")
      .eq("profile_id", user.id)
      .single(),
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at"),
    supabase
      .from("savings_target")
      .select("*")
      .eq("profile_id", user.id)
      .single(),
    supabase
      .from("envelopes")
      .select("*")
      .eq("profile_id", user.id)
      .order("sort_order"),
    supabase
      .from("transactions")
      .select("*")
      .eq("profile_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("transaction_time", { ascending: false })
      .limit(100),
  ]);

  if (!profile?.onboarding_complete) redirect("/onboarding/income");

  // Map envelope IDs for transaction display
  const envelopeMap = new Map(
    (envelopes || []).map((e) => [e.id, { name: e.name, icon: e.icon }])
  );

  const initialData = {
    profile: {
      id: profile.id,
      name: profile.name,
      grossIncome: profile.gross_income,
      epfRate: profile.epf_rate,
      maritalStatus: profile.marital_status || "single",
      numChildren: profile.num_children || 0,
      onboardingComplete: profile.onboarding_complete,
    },
    fixedExpenses: (fixedExpenses || []).map((e) => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      icon: e.icon,
    })),
    savingsTarget: savingsTarget
      ? {
          id: savingsTarget.id,
          mode: savingsTarget.mode as "percentage" | "amount",
          value: savingsTarget.value,
          computedAmount: savingsTarget.computed_amount,
        }
      : null,
    envelopes: (envelopes || []).map((e) => ({
      id: e.id,
      name: e.name,
      icon: e.icon,
      monthlyBudget: e.monthly_budget,
      percentage: e.percentage,
      sortOrder: e.sort_order,
      color: e.color,
    })),
    transactions: (transactions || []).map((t) => ({
      id: t.id,
      envelopeId: t.envelope_id,
      envelopeName: envelopeMap.get(t.envelope_id)?.name || "Unknown",
      envelopeIcon: envelopeMap.get(t.envelope_id)?.icon || "utensils",
      amount: t.amount,
      description: t.description,
      transactionDate: t.transaction_date,
      transactionTime: t.transaction_time,
    })),
  };

  return <HomeClient initialData={initialData} />;
}
