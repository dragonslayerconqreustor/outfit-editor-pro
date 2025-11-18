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
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Editing clothing with prompt:', prompt);
    console.log('Image data length:', image?.length || 0);

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
      console.log('Safe prompt:', safePrompt);
    }

    const instruction = `Edit the provided image by changing only the clothing to: ${safePrompt}.

Strict requirements:
- Preserve the person's exact identity (face, skin tone, hair), pose, body shape, and proportions
- Preserve the background, objects, composition, camera angle, and lighting
- Do not alter face, hair, skin, tattoos, accessories, hands, or environment
- No nudity or sexually explicit content; use opaque fabrics and appropriate coverage
- Photorealistic result consistent with the original image`; 

    console.log('Sending request to AI gateway...');
    console.log('Model: google/gemini-2.5-flash-image-preview');

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

    console.log('AI gateway response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error response:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('AI Image Edit Response:', JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    const message = choice?.message;
    const finishReason = choice?.finish_reason;
    const nativeFinishReason = choice?.native_finish_reason;

    // Handle content filter / prohibited content cases explicitly
    if (finishReason === 'content_filter' || nativeFinishReason === 'PROHIBITED_CONTENT') {
      console.log('Content filter triggered');
      return new Response(
        JSON.stringify({
          error: 'The AI safety filters blocked this request. Please use a more neutral clothing description (e.g., "black floral dress" or "blue denim jacket").',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refusal handling (other safety / policy refusals)
    const refusal = message?.refusal ||
      (typeof message?.content === 'string' && /cannot\s+fulfill|refus/i.test(message.content));
    if (refusal) {
      console.log('AI refused the request:', refusal);
      return new Response(
        JSON.stringify({
          error: 'The AI declined this request. Try a different clothing description.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      throw new Error('No edited image returned from AI. The AI may have encountered an issue processing this image.');
    }

    console.log('Successfully edited clothing');
    console.log('Edited image data length:', editedImageUrl.length);

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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
