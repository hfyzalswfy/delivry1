import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, corsHeaders } from "@supabase/server";

const EXPO_API_URL = "https://exp.host/--/api/v2/push/send";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { profile_id, title, body, data } = await req.json();

      if (!profile_id || !title || !body) {
        return new Response(
          JSON.stringify({ error: "profile_id, title, and body are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const supabase = ctx.supabaseAdmin;

      await supabase.from("notifications").insert({
        profile_id,
        notification_type: "order_update",
        title,
        body,
        data: data ?? null,
      });

      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("profile_id", profile_id)
        .eq("is_active", true);

      if (tokens && tokens.length > 0) {
        const messages = tokens.map((t) => ({
          to: t.token,
          sound: "default",
          title,
          body,
          data: data ?? {},
        }));

        const response = await fetch(EXPO_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(messages),
        });

        const result = await response.json();
        return new Response(JSON.stringify({ success: true, expo_response: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, push_sent: false, reason: "no_tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
};
