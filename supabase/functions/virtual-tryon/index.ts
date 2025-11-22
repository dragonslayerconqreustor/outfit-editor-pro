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
    const { clothingImage, bodyType, pose } = await req.json();
    
    if (!clothingImage) {
      return new Response(
        JSON.stringify({ error: 'Clothing image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bodyTypeDescriptions = {
      athletic: 'athletic, fit body with toned muscles',
      slim: 'slim, lean body type',
      average: 'average, medium body build',
      plus: 'plus-size, curvy body type',
      petite: 'petite, small frame body type'
    };

    const poseDescriptions = {
      standing: 'standing straight, front view, neutral pose',
      casual: 'casual relaxed pose, slightly turned',
      fashion: 'fashion model pose, confident stance',
      sitting: 'sitting casually',
      walking: 'walking pose, mid-stride'
    };

    const bodyDesc = bodyTypeDescriptions[bodyType as keyof typeof bodyTypeDescriptions] || bodyTypeDescriptions.average;
    const poseDesc = poseDescriptions[pose as keyof typeof poseDescriptions] || poseDescriptions.standing;

    const instruction = `You are a virtual try-on AI. Place this clothing item on a ${bodyDesc} person in a ${poseDesc} pose.

CRITICAL REQUIREMENTS:
1. Create a realistic mannequin or model with the specified body type
2. Place the clothing item naturally on the body, respecting fabric physics and fit
3. Maintain realistic proportions and shadows
4. Ensure the clothing looks like it's actually being worn
5. Professional fashion photography style
6. Clean, well-lit background

Generate a photorealistic image showing how this clothing would look when worn.`;

    console.log('Calling AI gateway for virtual try-on...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: instruction
              },
              {
                type: 'image_url',
                image_url: {
                  url: clothingImage
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits depleted. Please add credits to continue.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('AI gateway response received');

    const tryonImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!tryonImage) {
      console.error('No try-on image in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Failed to generate try-on image. Please try again.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ tryonImage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in virtual-tryon function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Virtual try-on failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
