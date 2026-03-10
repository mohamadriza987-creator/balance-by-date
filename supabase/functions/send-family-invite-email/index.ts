import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

Deno.serve(async (req) => {
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey = Deno.env.get('LOVABLE_API_KEY')!

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    ).auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, fromName, relationship } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if email user already exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers()
    const userExists = existingUser?.users?.some(u => u.email === email)

    const appUrl = 'https://balance-by-date.lovable.app'
    const senderName = fromName || 'Someone'
    const relationLabel = relationship || 'family member'

    let subject: string
    let html: string

    if (userExists) {
      // User exists - send notification to log in and check Family tab
      subject = `${senderName} wants to add you as ${relationLabel} on FinnyLand! 🏡`
      html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: #f8faf8; border-radius: 16px; padding: 32px; border: 1px solid #e0e8e0;">
            <h1 style="color: #1a3a2a; font-size: 22px; margin-bottom: 8px;">🏡 Family Invitation</h1>
            <p style="color: #4a5a4a; font-size: 15px; line-height: 1.6;">
              <strong>${senderName}</strong> has invited you to join their Family Land as their <strong>${relationLabel}</strong>.
            </p>
            <p style="color: #4a5a4a; font-size: 15px; line-height: 1.6;">
              Open FinnyLand and go to the <strong>Family</strong> tab to accept or decline this invitation.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${appUrl}" style="display: inline-block; background: #2d8a5e; color: #ffffff; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px;">
                Open FinnyLand
              </a>
            </div>
            <p style="color: #8a9a8a; font-size: 12px; text-align: center;">
              If you didn't expect this invitation, you can safely ignore it.
            </p>
          </div>
        </body>
        </html>
      `
    } else {
      // User doesn't exist - send sign-up invitation
      subject = `${senderName} invited you to FinnyLand! 🌟`
      html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: #f8faf8; border-radius: 16px; padding: 32px; border: 1px solid #e0e8e0;">
            <h1 style="color: #1a3a2a; font-size: 22px; margin-bottom: 8px;">🌟 You're Invited to FinnyLand!</h1>
            <p style="color: #4a5a4a; font-size: 15px; line-height: 1.6;">
              <strong>${senderName}</strong> wants to add you as their <strong>${relationLabel}</strong> on FinnyLand — a cozy family finance app where you can manage goals, requests, and savings together.
            </p>
            <p style="color: #4a5a4a; font-size: 15px; line-height: 1.6;">
              Sign up with this email address (<strong>${email}</strong>) and the invitation will be waiting for you in the Family tab!
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${appUrl}" style="display: inline-block; background: #2d8a5e; color: #ffffff; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px;">
                Join FinnyLand
              </a>
            </div>
            <p style="color: #8a9a8a; font-size: 12px; text-align: center;">
              If you didn't expect this invitation, you can safely ignore it.
            </p>
          </div>
        </body>
        </html>
      `
    }

    // Enqueue the email
    const messageId = crypto.randomUUID()
    const { error: enqueueError } = await supabaseClient.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: email,
        from: 'FinnyLand <noreply@notify.finnyland.com>',
        sender_domain: 'notify.finnyland.com',
        subject,
        html,
        purpose: 'transactional',
        label: 'family_invitation',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue email', enqueueError)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ success: true, userExists }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
