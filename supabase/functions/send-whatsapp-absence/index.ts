import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

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
// Strict phone validation:
// - International format: +{country code}{number} (e.g., +201234567890)
// - Egyptian mobile format: 01x followed by 8 digits (010, 011, 012, 015)
const PHONE_REGEX = /^(\+\d{1,3}\d{9,14}|0(10|11|12|15)\d{8})$/;
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

// In-memory rate limiting (free solution)
// Limits: 50 requests per user per hour
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  
  // Clean up old entries periodically (every 100 checks)
  if (rateLimitStore.size > 100) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, remaining: 0, resetIn };
  }
  
  entry.count++;
  const resetIn = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn };
}

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

    // Check rate limit BEFORE role check to prevent enumeration attacks
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded for user:', user.id);
      const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: `Too many requests. Please try again in ${resetMinutes} minutes.`,
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((Date.now() + rateLimit.resetIn) / 1000))
          } 
        }
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

    console.log('User authorized:', user.id, roleData.role, `(${rateLimit.remaining} requests remaining)`);

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
    // Handle Egyptian numbers that start with 0 (convert to +20)
    let formattedPhone: string;
    if (parentPhone.startsWith("+")) {
      formattedPhone = parentPhone;
    } else if (parentPhone.startsWith("0")) {
      // Egyptian number - replace leading 0 with +20
      formattedPhone = `+20${parentPhone.substring(1)}`;
    } else {
      formattedPhone = `+${parentPhone}`;
    }
    
    console.log('Phone number formatted:', { original: parentPhone, formatted: formattedPhone });
    
    const message = `مرحباً، نود إعلامكم بأن ${trimmedName} لم يحضر/تحضر في ${date}. نرجو توضيح السبب إذا أمكن. شكراً لكم.`;

    // Send WhatsApp message via Meta's Cloud API (FREE)
    const whatsappUrl = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const messagePayload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: {
        body: message
      }
    };

    console.log('Sending WhatsApp message to:', formattedPhone);

    const whatsappResponse = await fetch(whatsappUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error("WhatsApp Cloud API error:", errorText);
      throw new Error(`Failed to send WhatsApp message: ${errorText}`);
    }

    const whatsappData = await whatsappResponse.json();
    console.log("WhatsApp message sent successfully:", whatsappData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: whatsappData.messages[0].id,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetIn: Math.ceil(rateLimit.resetIn / 1000)
        }
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders,
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
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
