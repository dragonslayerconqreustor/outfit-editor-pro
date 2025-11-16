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
                text: `You are an expert at image editing. Based on the provided image and the following instruction, generate a detailed description of what the edited image should look like, keeping everything the same except the clothing.

Instruction: Change the clothing to: ${prompt}

Provide a detailed prompt that can be used to generate a new image with the changed clothing, maintaining all other aspects like the person's appearance, pose, background, lighting, and composition.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ]
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
      console.error('AI gateway error (analysis):', response.status, errorText);
      throw new Error('Failed to analyze image for editing');
    }

    const analysisData = await response.json();
    const editPrompt = analysisData.choices?.[0]?.message?.content || '';
    console.log('Generated edit prompt:', editPrompt);

    // Now generate the new image using the edit prompt
    const imageGenResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: editPrompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!imageGenResponse.ok) {
      if (imageGenResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (imageGenResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await imageGenResponse.text();
      console.error('AI gateway error (generation):', imageGenResponse.status, errorText);
      throw new Error('Failed to generate edited clothing image');
    }

    const data = await imageGenResponse.json();
    console.log('AI Image Generation Response:', JSON.stringify(data, null, 2));
    
    // Check multiple possible response formats
    let editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Alternative format: images might be directly in the message
    if (!editedImageUrl && data.choices?.[0]?.message?.images?.[0]) {
      editedImageUrl = data.choices[0].message.images[0];
    }
    
    // Another alternative: content might contain the image
    if (!editedImageUrl && data.choices?.[0]?.message?.content) {
      console.log('Message content:', data.choices[0].message.content);
    }

    if (!editedImageUrl) {
      console.error('Full response structure:', JSON.stringify(data, null, 2));
      throw new Error('No edited image returned from AI. Check logs for response structure.');
    }

    console.log('Successfully edited clothing');

    return new Response(
      JSON.stringify({ editedImage: editedImageUrl }),
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
