import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptRequest {
  token: string;
  password: string;
  fullName: string;
}

interface InvitationData {
  invitation_id: string;
  tenant_id: string;
  email: string;
  role: string;
  venue_name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { token, password, fullName }: AcceptRequest = await req.json();

    if (!token || !password || !fullName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the provided token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Validate invitation
    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .rpc("validate_invitation_token", { p_token_hash: tokenHash })
      .maybeSingle();

    if (inviteError || !inviteData) {
      console.error("Invalid invitation:", inviteError);
      return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invitation = inviteData as InvitationData;
    const { invitation_id, tenant_id, email: invitedEmail, role: invitedRole, venue_name } = invitation;

    // Check if user already exists with this email
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email?.toLowerCase() === invitedEmail.toLowerCase());

    if (userExists) {
      // User exists - just add them to this tenant
      // Check if they already have a role in this tenant
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userExists.id)
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (existingRole) {
        return new Response(JSON.stringify({ error: "You already have access to this venue" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add role for existing user
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userExists.id,
        role: "staff",
        tenant_id: tenant_id,
        tenant_role: invitedRole,
      });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        return new Response(JSON.stringify({ error: "Failed to assign role" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile with venue_id if not set
      await supabaseAdmin
        .from("profiles")
        .update({ venue_id: tenant_id })
        .eq("user_id", userExists.id)
        .is("venue_id", null);

      // Mark invitation as accepted
      await supabaseAdmin.rpc("accept_invitation", { p_invitation_id: invitation_id });

      // Audit log
      await supabaseAdmin.from("admin_audit_logs").insert({
        actor_user_id: userExists.id,
        action: "invitation_accepted",
        tenant_id: tenant_id,
        metadata: { email: invitedEmail, role: invitedRole, existing_user: true },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "You have been added to " + venue_name,
          existingUser: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create new user - include is_staff_creation flag to prevent venue auto-creation
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName,
        is_staff_creation: true,
        tenant_id: tenant_id,
      },
    });

    if (createError || !newUser?.user) {
      console.error("User creation error:", createError);
      return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile (the trigger won't run for admin-created users in some cases)
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      user_id: newUser.user.id,
      email: invitedEmail,
      display_name: fullName,
      venue_id: tenant_id,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "staff",
      tenant_id: tenant_id,
      tenant_role: invitedRole,
    });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      // Clean up user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: "Failed to assign role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark invitation as accepted
    await supabaseAdmin.rpc("accept_invitation", { p_invitation_id: invitation_id });

    // Audit log
    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_user_id: newUser.user.id,
      action: "invitation_accepted",
      tenant_id: tenant_id,
      metadata: { email: invitedEmail, role: invitedRole, new_user: true },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully. You can now log in.",
        existingUser: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in accept-invitation:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
