import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Editing clothing with prompt:', prompt);

    // Detect and sanitize unsafe terms
    const unsafeTerms = /\b(sex(y|iest)?|see[-\s]?through|transparent|sheer|lingerie|nude|naked|explicit|revealing|provocative)\b/gi;
    const foundTerms = String(prompt || '').match(unsafeTerms) || [];
    
    // Remove unsafe terms and clean up the prompt
    let safePrompt = String(prompt || '')
      .replace(unsafeTerms, '')
      .replace(/\s+/g, ' ')  // Remove extra spaces
      .trim();
    
    // Add safety suffix
    safePrompt = safePrompt + ' (appropriate, opaque fabric with full coverage, no nudity or explicit content)';
    
    // Track if sanitization occurred
    const wasSanitized = foundTerms.length > 0;
    if (wasSanitized) {
      console.log('Prompt sanitized. Removed terms:', foundTerms.join(', '));
    }

    const instruction = `Edit the provided image by changing only the clothing to: ${safePrompt}.

Strict requirements:
- Preserve the person's exact identity (face, skin tone, hair), pose, body shape, and proportions
- Preserve the background, objects, composition, camera angle, and lighting
- Do not alter face, hair, skin, tattoos, accessories, hands, or environment
- No nudity or sexually explicit content; use opaque fabrics and appropriate coverage
- Photorealistic result consistent with the original image`; 

    // True image-to-image editing: pass the original image with the instruction
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: instruction },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error (image-edit):', response.status, errorText);
      throw new Error('Failed to edit image');
    }

    const data = await response.json();
    console.log('AI Image Edit Response:', JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    const message = choice?.message;

    // Handle content filter / prohibited content cases explicitly
    const finishReason = choice?.finish_reason;
    const nativeFinishReason = choice?.native_finish_reason;

    if (finishReason === 'content_filter' || nativeFinishReason === 'PROHIBITED_CONTENT') {
      return new Response(
        JSON.stringify({
          error:
            'The requested edit was blocked by the AI safety filters. Try a more neutral, non-sexual clothing description (e.g., "black floral bikini" or "casual denim jacket").',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refusal handling (other safety / policy refusals)
    const refusal = message?.refusal ||
      (typeof message?.content === 'string' && /cannot\s+fulfill|refus/i.test(message.content));
    if (refusal) {
      return new Response(
        JSON.stringify({
          error:
            'The requested edit was refused by the AI due to content safety. Try a safer description (e.g., "tiger-print swimsuit" or "casual denim jacket").',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt multiple extraction strategies
    let editedImageUrl: string | undefined = message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl && Array.isArray(message?.images) && typeof message.images[0] === 'string') {
      editedImageUrl = message.images[0] as string;
    }

    if (!editedImageUrl && typeof message?.content === 'string') {
      const match = message.content.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/);
      if (match) editedImageUrl = match[0];
    }

    if (!editedImageUrl) {
      console.error('Full response structure (no image found):', JSON.stringify(data, null, 2));
      throw new Error('No edited image returned from AI. Check logs for response structure.');
    }

    console.log('Successfully edited clothing');

    return new Response(
      JSON.stringify({ 
        editedImage: editedImageUrl,
        sanitized: wasSanitized,
        removedTerms: wasSanitized ? foundTerms : undefined,
        cleanedPrompt: wasSanitized ? safePrompt : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in edit-clothing function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
