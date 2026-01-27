import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: "tenant_admin" | "staff";
  tenantId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Service client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, role, tenantId }: InviteRequest = await req.json();

    if (!email || !role || !tenantId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is tenant admin for this tenant
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("tenant_role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .single();

    const { data: isSuperAdmin } = await supabaseAdmin
      .from("super_admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!isSuperAdmin && (!callerRole || callerRole.tenant_role !== "tenant_admin")) {
      return new Response(JSON.stringify({ error: "Only tenant admins can invite staff" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists in this tenant
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", email.toLowerCase())
      .eq("venue_id", tenantId)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "User already exists in this tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from("staff_invitations")
      .select("id, expires_at")
      .eq("email", email.toLowerCase())
      .eq("tenant_id", tenantId)
      .is("accepted_at", null)
      .maybeSingle();

    // Generate token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const inviteToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    
    // Hash the token for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(inviteToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (existingInvite) {
      // Update existing invitation with new token
      const { error: updateError } = await supabaseAdmin
        .from("staff_invitations")
        .update({
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          invited_by: userId,
          role: role,
        })
        .eq("id", existingInvite.id);

      if (updateError) {
        console.error("Update invitation error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update invitation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Create new invitation
      const { error: insertError } = await supabaseAdmin
        .from("staff_invitations")
        .insert({
          tenant_id: tenantId,
          email: email.toLowerCase(),
          role: role,
          token_hash: tokenHash,
          invited_by: userId,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Insert invitation error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get venue name for the invitation link
    const { data: venue } = await supabaseAdmin
      .from("venues")
      .select("name")
      .eq("id", tenantId)
      .single();

    // Generate invitation URL
    const origin = req.headers.get("origin") || "https://spush.lovable.app";
    const inviteUrl = `${origin}/admin/accept-invite?token=${inviteToken}`;

    // Log the invitation (for now, since we may not have email configured)
    console.log(`Staff invitation created for ${email} to join ${venue?.name || "venue"}`);
    console.log(`Invitation URL: ${inviteUrl}`);

    // Audit log
    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_user_id: userId,
      action: "staff_invited",
      tenant_id: tenantId,
      metadata: { email, role, expires_at: expiresAt.toISOString() },
    });

    return new Response(
      JSON.stringify({
        success: true,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
        message: `Invitation created for ${email}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-staff-invitation:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
