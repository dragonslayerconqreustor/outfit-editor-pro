import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { season, occasion, stylePreference, userId } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Fetch user's gallery images
    const { data: images, error: fetchError } = await supabaseClient
      .from('user_images')
      .select('original_url, edited_url, tags, description')
      .eq('user_id', userId)
      .limit(20);

    if (fetchError) {
      console.error('Error fetching user images:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch your gallery' }),
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

    const imageContext = images?.map((img, idx) => {
      const tags = img.tags?.join(', ') || 'no tags';
      const desc = img.description || 'no description';
      return `Image ${idx + 1}: Tags: ${tags}, Description: ${desc}`;
    }).join('\n') || 'No images in gallery';

    const prompt = `You are a professional fashion stylist AI. Analyze the user's wardrobe and provide personalized outfit recommendations.

USER'S WARDROBE:
${imageContext}

PREFERENCES:
- Season: ${season || 'any'}
- Occasion: ${occasion || 'casual'}
- Style: ${stylePreference || 'versatile'}

Generate 5 complete outfit recommendations. For EACH outfit provide:
1. A catchy outfit name
2. Which pieces to combine (reference the image numbers)
3. Why this outfit works for the season/occasion
4. Styling tips (accessories, shoes, etc.)
5. Color coordination advice

Format your response as a JSON array with this structure:
[
  {
    "name": "Outfit name",
    "pieces": ["Image 1", "Image 3"],
    "description": "Why this works",
    "tips": "Styling suggestions",
    "colors": "Color advice"
  }
]

Be specific, creative, and practical. Only suggest combinations that make sense.`;

    console.log('Calling AI for outfit suggestions...');
    
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
            content: prompt
          }
        ]
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
    console.log('AI suggestions received');

    let suggestions = data.choices?.[0]?.message?.content;

    if (!suggestions) {
      console.error('No suggestions in response');
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions. Please try again.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to extract JSON from the response
    try {
      // Remove markdown code blocks if present
      suggestions = suggestions.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedSuggestions = JSON.parse(suggestions);
      
      return new Response(
        JSON.stringify({ suggestions: parsedSuggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse suggestions as JSON:', parseError);
      // Return as plain text if JSON parsing fails
      return new Response(
        JSON.stringify({ suggestions: [{ name: 'AI Suggestions', description: suggestions, tips: '', colors: '', pieces: [] }] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in outfit-suggestions function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate suggestions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
