import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AbsenceNotificationRequest {
  childName: string;
  parentPhone: string;
  date: string;
}

// Input validation regex patterns
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client for role verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Invalid token or user not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check role - only admin and servant can send WhatsApp messages
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || !['admin', 'servant'].includes(roleData.role)) {
      console.error('User lacks required role:', user.id, roleData?.role);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin or Servant role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authorized:', user.id, roleData.role);

    // Parse and validate input
    const body: AbsenceNotificationRequest = await req.json();
    const { childName, parentPhone, date } = body;

    // Validate childName
    if (!childName || typeof childName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: childName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedName = childName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: childName must be between 2 and 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate parentPhone
    if (!parentPhone || typeof parentPhone !== 'string' || !PHONE_REGEX.test(parentPhone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: parentPhone must be a valid international phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date
    if (!date || typeof date !== 'string' || !DATE_REGEX.test(date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: date must be in format DD/MM/YYYY' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Input validated successfully:', { childName: trimmedName, parentPhone, date });

    // Format phone number for WhatsApp (must include country code)
    const formattedPhone = parentPhone.startsWith("+") ? parentPhone : `+${parentPhone}`;
    
    const message = `مرحباً، نود إعلامكم بأن ${trimmedName} لم يحضر/تحضر في ${date}. نرجو توضيح السبب إذا أمكن. شكراً لكم.`;

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("From", `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
    formData.append("To", `whatsapp:${formattedPhone}`);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error("Twilio error:", errorText);
      throw new Error(`Failed to send WhatsApp message: ${errorText}`);
    }

    const twilioData = await twilioResponse.json();
    console.log("WhatsApp message sent successfully:", twilioData.sid);

    return new Response(
      JSON.stringify({ success: true, messageId: twilioData.sid }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp-absence function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
