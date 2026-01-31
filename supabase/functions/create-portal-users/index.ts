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

    // Check if specific demo user is being requested
    const body = await req.json().catch(() => ({}));
    const createDemoUser = body.createDemoUser || false;

    const results = [];

    // Create demo portal user if requested
    if (createDemoUser) {
      const demoEmail = "portal@shivfurniture.com";
      const demoPassword = "Portal@123";
      const demoName = "Portal Demo User";

      // Check if demo user exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingDemoUser = existingUsers?.users?.find(u => u.email === demoEmail);

      if (existingDemoUser) {
        results.push({
          email: demoEmail,
          status: "already exists",
          password: demoPassword,
          name: demoName
        });
      } else {
        // Find a customer contact to link (Sharma Residence)
        const { data: customerContact } = await supabaseAdmin
          .from('contacts')
          .select('id, name')
          .eq('name', 'Sharma Residence')
          .maybeSingle();

        // Create the demo user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: demoEmail,
          password: demoPassword,
          email_confirm: true,
          user_metadata: {
            name: demoName,
            role: 'portal',
          },
        });

        if (authError) {
          results.push({ email: demoEmail, status: "error", error: authError.message });
        } else {
          // Create profile linked to customer
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: demoEmail,
              name: demoName,
              role: 'portal',
              portal_contact_id: customerContact?.id || null
            });

          if (profileError) {
            console.error(`Profile error for ${demoEmail}:`, profileError);
          }

          // Add to user_roles table
          await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: 'portal'
            });

          results.push({
            email: demoEmail,
            password: demoPassword,
            name: demoName,
            status: "created",
            linkedContact: customerContact?.name || 'None',
            id: authData.user?.id
          });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch all customers from contacts table
    const { data: customers, error: fetchError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email')
      .not('email', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch customers: ${fetchError.message}`);
    }

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
