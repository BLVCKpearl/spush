import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  action: "create";
  email: string;
  fullName: string;
  role: "admin" | "staff";
  password?: string;
}

interface UpdateUserRequest {
  action: "update";
  userId: string;
  fullName?: string;
  role?: "admin" | "staff";
  isActive?: boolean;
}

interface ResetPasswordRequest {
  action: "reset_password";
  userId: string;
}

interface DeactivateUserRequest {
  action: "deactivate";
  userId: string;
}

interface SetPasswordRequest {
  action: "set_password";
  userId: string;
  password: string;
}

type UserManagementRequest =
  | CreateUserRequest
  | UpdateUserRequest
  | ResetPasswordRequest
  | DeactivateUserRequest
  | SetPasswordRequest;

// Generate a secure random password
function generateSecurePassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    
    // Use getClaims for proper JWT validation with signing-keys
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const actorUserId = claimsData.claims.sub as string;
    const actorUser = { id: actorUserId };

    // Check if actor is admin
    const { data: actorRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", actorUser.id);

    const isAdmin = actorRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: UserManagementRequest = await req.json();

    // Helper to log audit action
    async function logAudit(
      action: string,
      targetUserId: string | null,
      metadata: Record<string, unknown> = {}
    ) {
      await supabaseAdmin.from("admin_audit_logs").insert({
        actor_user_id: actorUserId,
        action,
        target_user_id: targetUserId,
        metadata,
      });
    }

    // Handle different actions
    switch (body.action) {
      case "create": {
        const { email, fullName, role, password: customPassword } = body;

        // Validate input
        if (!email || !fullName || !role) {
          return new Response(
            JSON.stringify({ error: "Email, full name, and role are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!["admin", "staff"].includes(role)) {
          return new Response(
            JSON.stringify({ error: "Invalid role" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if email already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const emailExists = existingUsers?.users.some(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (emailExists) {
          return new Response(
            JSON.stringify({ error: "A user with this email already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Use custom password or generate one
        const userPassword = customPassword && customPassword.length >= 6 
          ? customPassword 
          : generateSecurePassword();

        // Create user in auth.users
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: userPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (createError || !newUser.user) {
          console.error("Error creating user:", createError);
          return new Response(
            JSON.stringify({ error: createError?.message || "Failed to create user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // The profile is created by the trigger on auth.users insert
        // We need to wait briefly and retry to ensure it exists before updating
        let profileUpdated = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("user_id", newUser.user.id)
            .maybeSingle();
          
          if (profile) {
            await supabaseAdmin
              .from("profiles")
              .update({ display_name: fullName, must_change_password: true })
              .eq("user_id", newUser.user.id);
            profileUpdated = true;
            break;
          }
          // Wait 100ms before retry
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        
        if (!profileUpdated) {
          console.error("Profile not created by trigger after 5 attempts");
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: newUser.user.id,
          role,
        });

        if (roleError) {
          console.error("Error assigning role:", roleError);
          // Clean up: delete the created user
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          return new Response(
            JSON.stringify({ error: "Failed to assign role" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log audit
        await logAudit("user_created", newUser.user.id, { email, role });

        return new Response(
          JSON.stringify({
            success: true,
            userId: newUser.user.id,
            password: userPassword,
            message: "User created successfully. Share the password securely.",
          }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        const { userId, fullName, role, isActive } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current user state
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (!targetProfile) {
          return new Response(
            JSON.stringify({ error: "User not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check last-admin protection
        if (isActive === false || role === "staff") {
          const { data: targetRoles } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          const isTargetAdmin = targetRoles?.some((r) => r.role === "admin");

          if (isTargetAdmin) {
            const { data: adminCount } = await supabaseAdmin.rpc("count_active_admins");

            if (adminCount <= 1) {
              return new Response(
                JSON.stringify({
                  error: "Cannot deactivate or demote the last active admin",
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }

        // Update profile
        const updateData: Record<string, unknown> = {};
        if (fullName !== undefined) updateData.display_name = fullName;
        if (isActive !== undefined) updateData.is_active = isActive;

        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("user_id", userId);
        }

        // Update user metadata if name changed
        if (fullName !== undefined) {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { full_name: fullName },
          });
        }

        // Update role if provided
        if (role !== undefined) {
          // Remove existing roles
          await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

          // Add new role
          await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
        }

        // Log audit
        await logAudit("user_updated", userId, { changes: { fullName, role, isActive } });

        return new Response(
          JSON.stringify({ success: true, message: "User updated successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { userId } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check rate limit
        const { data: allowed } = await supabaseAdmin.rpc("check_password_reset_rate_limit", {
          p_target_user_id: userId,
        });

        if (!allowed) {
          return new Response(
            JSON.stringify({ error: "Too many password reset attempts. Try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate new password
        const newPassword = generateSecurePassword();

        // Update user password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });

        if (updateError) {
          console.error("Error resetting password:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to reset password" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Record rate limit
        await supabaseAdmin.rpc("record_password_reset_attempt", {
          p_target_user_id: userId,
        });

        // Set must_change_password flag
        await supabaseAdmin
          .from("profiles")
          .update({ must_change_password: true })
          .eq("user_id", userId);

        // Log audit
        await logAudit("password_reset", userId, {});

        return new Response(
          JSON.stringify({
            success: true,
            temporaryPassword: newPassword,
            message: "Password reset successfully. Share the new password securely.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "deactivate": {
        const { userId } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check last-admin protection
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        const isTargetAdmin = targetRoles?.some((r) => r.role === "admin");

        if (isTargetAdmin) {
          const { data: adminCount } = await supabaseAdmin.rpc("count_active_admins");

          if (adminCount <= 1) {
            return new Response(
              JSON.stringify({ error: "Cannot deactivate the last active admin" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Deactivate user
        await supabaseAdmin
          .from("profiles")
          .update({ is_active: false })
          .eq("user_id", userId);

        // Log audit
        await logAudit("user_deactivated", userId, {});

        return new Response(
          JSON.stringify({ success: true, message: "User deactivated successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set_password": {
        const { userId, password } = body as SetPasswordRequest;

        if (!userId || !password) {
          return new Response(
            JSON.stringify({ error: "User ID and password are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: "Password must be at least 6 characters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update user password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
        });

        if (updateError) {
          console.error("Error setting password:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to set password" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Set must_change_password flag
        await supabaseAdmin
          .from("profiles")
          .update({ must_change_password: true })
          .eq("user_id", userId);

        // Log audit
        await logAudit("password_modified", userId, {});

        return new Response(
          JSON.stringify({
            success: true,
            message: "Password updated successfully.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in manage-users:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
