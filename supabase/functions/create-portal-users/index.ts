import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch all customers from contacts table
    const { data: customers, error: fetchError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email')
      .not('email', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch customers: ${fetchError.message}`);
    }

    const results = [];

    for (const customer of customers || []) {
      if (!customer.email) continue;

      // Generate password from name (first name + @123)
      const firstName = customer.name.split(' ')[0];
      const password = `${firstName}@123`;

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === customer.email);

      if (existingUser) {
        // Link existing user to contact if not already linked
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('portal_contact_id')
          .eq('id', existingUser.id)
          .single();

        if (!profile?.portal_contact_id) {
          await supabaseAdmin
            .from('profiles')
            .update({ portal_contact_id: customer.id })
            .eq('id', existingUser.id);
        }

        results.push({ 
          email: customer.email, 
          status: "already exists", 
          password: password,
          name: customer.name 
        });
        continue;
      }

      // Create user with admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customer.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: customer.name,
          role: 'portal',
        },
      });

      if (authError) {
        results.push({ email: customer.email, status: "error", error: authError.message });
        continue;
      }

      // Create profile linked to contact
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: customer.email,
          name: customer.name,
          role: 'portal',
          portal_contact_id: customer.id
        });

      if (profileError) {
        console.error(`Profile error for ${customer.email}:`, profileError);
      }

      // Add to user_roles table
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'portal'
        });

      results.push({ 
        email: customer.email, 
        password: password,
        name: customer.name,
        status: "created", 
        id: authData.user?.id 
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
