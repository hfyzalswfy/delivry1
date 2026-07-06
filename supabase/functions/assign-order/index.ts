import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, corsHeaders } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { order_id } = await req.json();
      if (!order_id) {
        return new Response(JSON.stringify({ error: "order_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = ctx.supabaseAdmin;

      const { data: order, error: orderError } = await supabase
        .from("delivery_orders")
        .select("*, stores!inner(profile_id)")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status !== "draft") {
        return new Response(JSON.stringify({ error: "Order must be in draft status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("delivery_orders")
        .update({ status: "published" })
        .eq("id", order_id);

      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, profile_id")
        .eq("is_available", true)
        .eq("is_active", true)
        .eq("is_verified", true);

      if (drivers && drivers.length > 0) {
        const assignments = drivers.map((d) => ({
          order_id,
          driver_id: d.id,
          status: "pending",
        }));
        await supabase.from("order_assignments").insert(assignments);
      }

      return new Response(
        JSON.stringify({ success: true, order_id, drivers_notified: drivers?.length ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
};
