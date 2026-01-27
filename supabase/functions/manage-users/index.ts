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
  tenantId?: string; // Optional - will be overridden by actor's tenant for tenant admins
}

interface UpdateUserRequest {
  action: "update";
  userId: string;
  fullName?: string;
  role?: "admin" | "staff";
  tenantRole?: "tenant_admin" | "staff";
  isActive?: boolean;
  tenantId?: string;
}

interface ResetPasswordRequest {
  action: "reset_password";
  userId: string;
  tenantId?: string;
}

interface DeactivateUserRequest {
  action: "deactivate";
  userId: string;
  tenantId?: string;
}

interface DeleteUserRequest {
  action: "delete";
  userId: string;
  tenantId?: string;
}

interface ArchiveUserRequest {
  action: "archive";
  userId: string;
  tenantId?: string;
}

interface SetPasswordRequest {
  action: "set_password";
  userId: string;
  password: string;
}

interface ServiceRolePasswordRequest {
  action: "service_set_password";
  userId: string;
  password: string;
}

interface BootstrapSuperAdminRequest {
  action: "bootstrap_super_admin";
  email: string;
  password: string;
  fullName: string;
}

type UserManagementRequest =
  | CreateUserRequest
  | UpdateUserRequest
  | ResetPasswordRequest
  | DeactivateUserRequest
  | SetPasswordRequest
  | ServiceRolePasswordRequest
  | DeleteUserRequest
  | ArchiveUserRequest
  | BootstrapSuperAdminRequest;

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: UserManagementRequest = await req.json();

    // Bootstrap super admin - only works when NO super admins exist
    if (body.action === "bootstrap_super_admin") {
      const { email, password, fullName } = body as BootstrapSuperAdminRequest;

      if (!email || !password || !fullName) {
        return new Response(
          JSON.stringify({ error: "Email, password, and fullName are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if any super admins already exist
      const { count: superAdminCount } = await supabaseAdmin
        .from("super_admins")
        .select("*", { count: "exact", head: true });

      if ((superAdminCount || 0) > 0) {
        return new Response(
          JSON.stringify({ error: "Bootstrap not allowed - super admin(s) already exist" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete all existing auth users first (cleanup)
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      for (const user of existingUsers?.users || []) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }

      // Create the super admin user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError || !newUser.user) {
        console.error("Error creating super admin:", createError);
        return new Response(
          JSON.stringify({ error: createError?.message || "Failed to create super admin" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create profile manually (trigger won't work with service role)
      await supabaseAdmin.from("profiles").insert({
        user_id: newUser.user.id,
        email,
        display_name: fullName,
        is_active: true,
        onboarding_completed: true,
      });

      // Add to super_admins table
      await supabaseAdmin.from("super_admins").insert({
        user_id: newUser.user.id,
        email,
        display_name: fullName,
      });

      return new Response(
        JSON.stringify({
          success: true,
          userId: newUser.user.id,
          message: "Super admin created successfully",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role password update - bypasses user auth (for system use only)
    if (body.action === "service_set_password") {
      const { userId, password } = body as ServiceRolePasswordRequest;

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

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Check if actor is super admin
    const { data: superAdminCheck } = await supabaseAdmin
      .from("super_admins")
      .select("id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    
    const isSuperAdmin = !!superAdminCheck;

    // Check actor's tenant roles
    const { data: actorRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, tenant_role, tenant_id")
      .eq("user_id", actorUserId);

    const isAdmin = actorRoles?.some((r) => r.role === "admin");
    const isTenantAdmin = actorRoles?.some((r) => r.tenant_role === "tenant_admin");
    
    // Get actor's tenant ID (for tenant admins)
    const actorTenantId = actorRoles?.find((r) => r.tenant_id)?.tenant_id;
    
    if (!isSuperAdmin && !isAdmin && !isTenantAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine effective tenant ID for the operation
    // For super admins, use the provided tenantId (impersonation)
    // For tenant admins, always use their own tenant (server-side enforcement)
    function getEffectiveTenantId(requestedTenantId?: string): string | null {
      if (isSuperAdmin) {
        return requestedTenantId || null;
      }
      // Tenant admins MUST use their own tenant - ignore client-provided tenantId
      return actorTenantId || null;
    }

    // Helper to check if actor can manage target user
    async function canManageUser(targetUserId: string): Promise<{ allowed: boolean; error?: string }> {
      // Super admins can manage anyone
      if (isSuperAdmin) return { allowed: true };
      
      // Get target user's tenant
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("venue_id")
        .eq("user_id", targetUserId)
        .single();
      
      if (!targetProfile) {
        return { allowed: false, error: "User not found" };
      }
      
      // Tenant admins can only manage users in their tenant
      if (targetProfile.venue_id !== actorTenantId) {
        return { allowed: false, error: "Cannot manage users outside your tenant" };
      }
      
      return { allowed: true };
    }

    // Helper to log audit action with tenant context
    async function logAudit(
      action: string,
      targetUserId: string | null,
      tenantId: string | null,
      metadata: Record<string, unknown> = {}
    ) {
      await supabaseAdmin.from("admin_audit_logs").insert({
        actor_user_id: actorUserId,
        action,
        target_user_id: targetUserId,
        tenant_id: tenantId,
        metadata: {
          ...metadata,
          is_super_admin: isSuperAdmin,
          is_impersonation: isSuperAdmin && !!tenantId,
        },
      });
    }

    // Handle different actions
    switch (body.action) {
      case "create": {
        const { email, fullName, role, password: customPassword, tenantId: requestedTenantId } = body;
        const effectiveTenantId = getEffectiveTenantId(requestedTenantId);

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

        // Tenant admins MUST have a tenant context
        if (!isSuperAdmin && !effectiveTenantId) {
          return new Response(
            JSON.stringify({ error: "Tenant context required" }),
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

        // Create profile with venue_id (tenant_id)
        const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
          user_id: newUser.user.id,
          email,
          display_name: fullName,
          venue_id: effectiveTenantId,
          is_active: true,
        }, { onConflict: 'user_id' });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }

        // Map role to tenant_role
        const tenantRole = role === "admin" ? "tenant_admin" : "staff";

        // Assign role with tenant context - use upsert to handle duplicates
        const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
          user_id: newUser.user.id,
          role,
          tenant_id: effectiveTenantId,
          tenant_role: tenantRole,
        }, { 
          onConflict: 'user_id,role',
          ignoreDuplicates: false 
        });

        if (roleError) {
          console.error("Error assigning role:", roleError);
          // Clean up: delete the created user
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          return new Response(
            JSON.stringify({ error: "Failed to assign role: " + roleError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log audit with tenant context
        await logAudit("user_created", newUser.user.id, effectiveTenantId, { 
          email, 
          role,
          tenant_role: tenantRole,
        });

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
        const { userId, fullName, role, tenantRole, isActive, tenantId: requestedTenantId } = body;
        const effectiveTenantId = getEffectiveTenantId(requestedTenantId);

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if actor can manage this user
        const canManage = await canManageUser(userId);
        if (!canManage.allowed) {
          return new Response(
            JSON.stringify({ error: canManage.error }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

        const userTenantId = targetProfile.venue_id || effectiveTenantId;

        // Check last-tenant-admin protection
        const newTenantRole = tenantRole || (role === "admin" ? "tenant_admin" : role === "staff" ? "staff" : undefined);
        
        if (isActive === false || newTenantRole === "staff") {
          // Get current user's role
          const { data: targetRoles } = await supabaseAdmin
            .from("user_roles")
            .select("tenant_role, tenant_id")
            .eq("user_id", userId)
            .eq("tenant_id", userTenantId)
            .maybeSingle();

          const isCurrentlyTenantAdmin = targetRoles?.tenant_role === "tenant_admin";

          if (isCurrentlyTenantAdmin && userTenantId) {
            // Check how many active tenant admins exist for this tenant
            const { data: adminCount } = await supabaseAdmin.rpc("count_active_tenant_admins", {
              _tenant_id: userTenantId,
            });

            if (adminCount <= 1) {
              return new Response(
                JSON.stringify({
                  error: "Cannot deactivate or demote the last active tenant admin",
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
        if (role !== undefined || tenantRole !== undefined) {
          const finalRole = role || "staff";
          const finalTenantRole = tenantRole || (role === "admin" ? "tenant_admin" : "staff");
          
          // Update existing role for this tenant
          const { data: existingRole } = await supabaseAdmin
            .from("user_roles")
            .select("id")
            .eq("user_id", userId)
            .eq("tenant_id", userTenantId)
            .maybeSingle();

          if (existingRole) {
            await supabaseAdmin
              .from("user_roles")
              .update({ role: finalRole, tenant_role: finalTenantRole })
              .eq("id", existingRole.id);
          } else {
            await supabaseAdmin.from("user_roles").insert({
              user_id: userId,
              role: finalRole,
              tenant_id: userTenantId,
              tenant_role: finalTenantRole,
            });
          }
        }

        // Log audit with tenant context
        await logAudit("user_updated", userId, userTenantId, { 
          changes: { fullName, role, tenantRole, isActive } 
        });

        return new Response(
          JSON.stringify({ success: true, message: "User updated successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { userId, tenantId: requestedTenantId } = body;
        const effectiveTenantId = getEffectiveTenantId(requestedTenantId);

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if actor can manage this user
        const canManage = await canManageUser(userId);
        if (!canManage.allowed) {
          return new Response(
            JSON.stringify({ error: canManage.error }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

        // Generate a temporary password for the user to login with
        const tempPassword = generateSecurePassword();

        // Update user password to the temporary one
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: tempPassword,
        });

        if (updateError) {
          console.error("Error resetting password:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to reset password" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Set must_change_password flag so user is forced to change on next login
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ must_change_password: true })
          .eq("user_id", userId);

        if (profileError) {
          console.error("Error setting must_change_password:", profileError);
        }

        // Record rate limit
        await supabaseAdmin.rpc("record_password_reset_attempt", {
          p_target_user_id: userId,
        });

        // Log audit with tenant context
        await logAudit("password_reset", userId, effectiveTenantId, { forced_change: true });

        return new Response(
          JSON.stringify({
            success: true,
            temporaryPassword: tempPassword,
            message: "Password reset successfully. User must change password on next login.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "deactivate": {
        const { userId, tenantId: requestedTenantId } = body;
        const effectiveTenantId = getEffectiveTenantId(requestedTenantId);

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if actor can manage this user
        const canManage = await canManageUser(userId);
        if (!canManage.allowed) {
          return new Response(
            JSON.stringify({ error: canManage.error }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user's tenant for last-admin check
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("venue_id")
          .eq("user_id", userId)
          .single();

        const userTenantId = targetProfile?.venue_id || effectiveTenantId;

        // Check last-tenant-admin protection
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("tenant_role")
          .eq("user_id", userId)
          .eq("tenant_id", userTenantId)
          .maybeSingle();

        if (targetRoles?.tenant_role === "tenant_admin" && userTenantId) {
          const { data: adminCount } = await supabaseAdmin.rpc("count_active_tenant_admins", {
            _tenant_id: userTenantId,
          });

          if (adminCount <= 1) {
            return new Response(
              JSON.stringify({ error: "Cannot deactivate the last active tenant admin" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Deactivate user
        await supabaseAdmin
          .from("profiles")
          .update({ is_active: false })
          .eq("user_id", userId);

        // Log audit with tenant context
        await logAudit("user_deactivated", userId, userTenantId, {});

        return new Response(
          JSON.stringify({ success: true, message: "User deactivated successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "archive": {
        const { userId, tenantId: requestedTenantId } = body;
        const effectiveTenantId = getEffectiveTenantId(requestedTenantId);

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Prevent self-archive
        if (userId === actorUserId) {
          return new Response(
            JSON.stringify({ error: "Cannot archive your own account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if actor can manage this user
        const canManage = await canManageUser(userId);
        if (!canManage.allowed) {
          return new Response(
            JSON.stringify({ error: canManage.error }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user's tenant for last-admin check
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("venue_id")
          .eq("user_id", userId)
          .single();

        const userTenantId = targetProfile?.venue_id || effectiveTenantId;

        // Check last-tenant-admin protection
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("tenant_role")
          .eq("user_id", userId)
          .eq("tenant_id", userTenantId)
          .maybeSingle();

        if (targetRoles?.tenant_role === "tenant_admin" && userTenantId) {
          const { data: adminCount } = await supabaseAdmin.rpc("count_active_tenant_admins", {
            _tenant_id: userTenantId,
          });

          if (adminCount <= 1) {
            return new Response(
              JSON.stringify({ error: "Cannot archive the last active tenant admin" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Archive user (soft delete)
        await supabaseAdmin
          .from("profiles")
          .update({ 
            is_active: false, 
            is_archived: true,
            archived_at: new Date().toISOString(),
            archived_by: actorUserId,
          })
          .eq("user_id", userId);

        // Log audit with tenant context
        await logAudit("user_archived", userId, userTenantId, {});

        return new Response(
          JSON.stringify({ success: true, message: "User archived successfully" }),
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

        // Check if actor can manage this user
        const canManage = await canManageUser(userId);
        if (!canManage.allowed) {
          return new Response(
            JSON.stringify({ error: canManage.error }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user's tenant for audit
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("venue_id")
          .eq("user_id", userId)
          .single();

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

        // Log audit with tenant context
        await logAudit("password_modified", userId, targetProfile?.venue_id || null, {});

        return new Response(
          JSON.stringify({
            success: true,
            message: "Password updated successfully.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { userId, tenantId: requestedTenantId } = body as DeleteUserRequest;
        const effectiveTenantId = getEffectiveTenantId(requestedTenantId);

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Prevent self-deletion
        if (userId === actorUserId) {
          return new Response(
            JSON.stringify({ error: "Cannot delete your own account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if actor can manage this user
        const canManage = await canManageUser(userId);
        if (!canManage.allowed) {
          return new Response(
            JSON.stringify({ error: canManage.error }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if target user exists
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("user_id, email, display_name, venue_id")
          .eq("user_id", userId)
          .single();

        if (!targetProfile) {
          return new Response(
            JSON.stringify({ error: "User not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const userTenantId = targetProfile.venue_id || effectiveTenantId;

        // Check last-tenant-admin protection
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("tenant_role")
          .eq("user_id", userId)
          .eq("tenant_id", userTenantId)
          .maybeSingle();

        if (targetRoles?.tenant_role === "tenant_admin" && userTenantId) {
          const { data: adminCount } = await supabaseAdmin.rpc("count_active_tenant_admins", {
            _tenant_id: userTenantId,
          });

          if (adminCount <= 1) {
            return new Response(
              JSON.stringify({ error: "Cannot delete the last remaining tenant admin" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Store email snapshot for audit before deletion
        const emailSnapshot = targetProfile.email;
        const displayNameSnapshot = targetProfile.display_name;

        // Delete user role first (FK constraint)
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

        // Delete profile (FK constraint)
        await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

        // Delete auth user (this also invalidates all sessions)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error("Error deleting auth user:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to delete user from auth system" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log audit with tenant context
        await logAudit("USER_DELETED", userId, userTenantId, { 
          email_snapshot: emailSnapshot,
          display_name_snapshot: displayNameSnapshot,
          was_tenant_admin: targetRoles?.tenant_role === "tenant_admin",
        });

        return new Response(
          JSON.stringify({ success: true, message: "User permanently deleted" }),
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
