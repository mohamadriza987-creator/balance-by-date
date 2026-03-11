import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find expired messages
    const now = new Date().toISOString();
    const { data: expiredMessages, error: fetchError } = await supabase
      .from("family_messages")
      .select("id, media_url, message_type")
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let deletedCount = 0;
    let mediaDeleted = 0;

    if (expiredMessages && expiredMessages.length > 0) {
      // Delete associated media files from storage
      for (const msg of expiredMessages) {
        if (msg.media_url && (msg.message_type === "voice" || msg.message_type === "photo")) {
          try {
            // Extract path from URL
            const url = new URL(msg.media_url);
            const pathMatch = url.pathname.match(/\/object\/public\/family-media\/(.+)/);
            if (pathMatch) {
              await supabase.storage.from("family-media").remove([pathMatch[1]]);
              mediaDeleted++;
            }
          } catch (e) {
            console.error("Media delete error:", e);
          }
        }
      }

      // Delete expired messages from DB
      const ids = expiredMessages.map((m) => m.id);
      const { error: deleteError } = await supabase
        .from("family_messages")
        .delete()
        .in("id", ids);

      if (deleteError) {
        console.error("Delete error:", deleteError);
      } else {
        deletedCount = ids.length;
      }
    }

    return new Response(
      JSON.stringify({ deleted: deletedCount, mediaDeleted, timestamp: now }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
