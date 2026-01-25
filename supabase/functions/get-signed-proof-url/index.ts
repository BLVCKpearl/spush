import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Parse request body
    const { filePath, orderId } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "filePath is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check authorization header
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      // If authenticated, verify user is admin/staff
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        // Not authenticated as staff - check if they own this proof
        // For guests viewing their own uploaded proof, we need to verify ownership
        if (orderId) {
          // Check if this file belongs to a payment claim for this order
          const { data: claim } = await supabaseAdmin
            .from("payment_claims")
            .select("id, proof_url")
            .eq("order_id", orderId)
            .single();
          
          if (claim && claim.proof_url && claim.proof_url.includes(filePath)) {
            // Generate signed URL for the guest's own proof
            const { data, error } = await supabaseAdmin.storage
              .from("payment-proofs")
              .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (error) {
              throw error;
            }

            return new Response(
              JSON.stringify({ signedUrl: data.signedUrl }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if user is admin or staff
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdminOrStaff = roles?.some(
        (r) => r.role === "admin" || r.role === "staff"
      );

      if (!isAdminOrStaff) {
        return new Response(
          JSON.stringify({ error: "Forbidden - requires admin or staff role" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else if (orderId) {
      // No auth header but orderId provided - guest viewing their own proof
      const { data: claim } = await supabaseAdmin
        .from("payment_claims")
        .select("id, proof_url")
        .eq("order_id", orderId)
        .single();
      
      if (!claim || !claim.proof_url || !claim.proof_url.includes(filePath)) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate signed URL
    const { data, error } = await supabaseAdmin.storage
      .from("payment-proofs")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating signed URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
