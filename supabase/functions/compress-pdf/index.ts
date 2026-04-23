import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("compress-pdf: missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user belongs to a tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: "User does not belong to a tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { file_path } = await req.json();

    if (!file_path || typeof file_path !== "string") {
      return new Response(
        JSON.stringify({ error: "file_path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure user can only compress files in their tenant folder
    if (!file_path.startsWith(profile.tenant_id + "/")) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("post-images")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("compress-pdf: download failed", downloadError);
      return new Response(
        JSON.stringify({ error: "An error occurred" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const originalSize = fileData.size;
    const arrayBuffer = await fileData.arrayBuffer();

    // Load and re-save with pdf-lib (removes orphaned objects, optimizes structure)
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Remove metadata to reduce size
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("");
    pdfDoc.setCreator("");

    const compressedBytes = await pdfDoc.save();
    const compressedSize = compressedBytes.length;

    // Only replace if compressed version is smaller
    if (compressedSize < originalSize) {
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .update(file_path, compressedBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("compress-pdf: upload failed", uploadError);
        return new Response(
          JSON.stringify({ error: "An error occurred" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Compressed ${file_path}: ${originalSize} -> ${compressedSize} (${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`);
    } else {
      console.log(`Skipped ${file_path}: compressed size (${compressedSize}) >= original (${originalSize})`);
    }

    return new Response(
      JSON.stringify({
        original_size: originalSize,
        compressed_size: compressedSize,
        saved: Math.max(0, originalSize - compressedSize),
        skipped: compressedSize >= originalSize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error compressing PDF:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
