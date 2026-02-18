import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    if (!N8N_WEBHOOK_URL) {
      throw new Error("N8N_WEBHOOK_URL is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's tenant
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: "User does not belong to a tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { post_id } = await req.json();

    if (!post_id) {
      return new Response(
        JSON.stringify({ error: "post_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch post with client info
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*, clients(name)")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify post belongs to user's tenant
    if (post.tenant_id !== profile.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch media
    const { data: mediaItems } = await supabase
      .from("post_images")
      .select("*")
      .eq("post_id", post_id)
      .order("display_order");

    // Generate signed URLs for media
    const media = [];
    if (mediaItems && mediaItems.length > 0) {
      for (const item of mediaItems) {
        // Extract storage path
        let path = item.image_url;
        const match = path.match(/\/storage\/v1\/object\/(?:public|sign)\/post-images\/(.+)/);
        if (match) path = match[1];
        if (path.startsWith("http")) {
          const parts = path.split("/post-images/");
          if (parts.length > 1) path = parts[1].split("?")[0];
        }

        const { data: signedData } = await supabase.storage
          .from("post-images")
          .createSignedUrl(path, 3600);

        media.push({
          url: signedData?.signedUrl || item.image_url,
          media_type: item.media_type,
          file_name: path.split("/").pop() || "file",
        });
      }
    }

    // Build payload for n8n
    const payload = {
      post_id: post.id,
      group_id: post.group_id,
      client_id: post.client_id,
      client_name: (post as any).clients?.name || "",
      scheduled_at: post.scheduled_at,
      caption: post.caption,
      title: post.title,
      status: post.status,
      channel: post.channel,
      tenant_id: post.tenant_id,
      media,
    };

    // Send to n8n webhook
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n webhook error:", n8nResponse.status, errorText);
      throw new Error(`n8n webhook error: ${n8nResponse.status}`);
    }

    const n8nRaw = await n8nResponse.json();
    const data = Array.isArray(n8nRaw) ? n8nRaw[0] : n8nRaw;

    // Map free-text project_type to enum value
    const PROJECT_TYPE_MAP: Record<string, string> = {
      "eta": "eta",
      "ete": "ete",
      "osmose": "osmose_reversa",
      "ultrafiltra": "ultrafiltracao",
      "fisico": "fisico_quimico",
      "mbr": "mbr",
    };

    function mapProjectType(value: string | undefined): string | null {
      if (!value) return null;
      const lower = value.toLowerCase();
      for (const [keyword, enumVal] of Object.entries(PROJECT_TYPE_MAP)) {
        if (lower.includes(keyword)) return enumVal;
      }
      return null;
    }

    // Update post with returned fields (only update fields that are present)
    const updateFields: Record<string, unknown> = {};
    if (data.article_title !== undefined) updateFields.article_title = data.article_title;
    if (data.seo_keyword !== undefined) updateFields.seo_keyword = data.seo_keyword;
    if (data.article_content !== undefined) updateFields.article_content = data.article_content;

    const mappedType = mapProjectType(data.project_type);
    if (mappedType) updateFields.project_type = mappedType;

    // Sempre definir status como ai_generated apos geracao bem-sucedida
    updateFields.status = 'ai_generated';

    if (Object.keys(updateFields).length > 0) {
      const { error: updateError } = await supabase
        .from("posts")
        .update(updateFields)
        .eq("id", post_id);

      if (updateError) {
        console.error("Error updating post:", updateError);
        throw new Error("Failed to update post with n8n response");
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated_fields: Object.keys(updateFields) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in wordpress-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
