import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SuggestionRequest {
  partnerTagId?: string;
  partnerId?: string;
  productCategoryId?: string;
  productId?: string;
}

interface AnalyticalAccount {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface AutoAnalyticalModel {
  id: string;
  name: string;
  partner_tag_id: string | null;
  partner_id: string | null;
  product_category_id: string | null;
  product_id: string | null;
  analytical_account_id: string;
  priority: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partnerTagId, partnerId, productCategoryId, productId } = await req.json() as SuggestionRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all active analytical accounts
    const { data: analyticalAccounts, error: accountsError } = await supabase
      .from("analytical_accounts")
      .select("id, name, code, description")
      .eq("is_archived", false);

    if (accountsError) {
      console.error("Error fetching analytical accounts:", accountsError);
      throw new Error("Failed to fetch analytical accounts");
    }

    // Fetch existing auto analytical models for pattern analysis
    const { data: models, error: modelsError } = await supabase
      .from("auto_analytical_models")
      .select("id, name, partner_tag_id, partner_id, product_category_id, product_id, analytical_account_id, priority")
      .eq("is_archived", false);

    if (modelsError) {
      console.error("Error fetching models:", modelsError);
      throw new Error("Failed to fetch auto analytical models");
    }

    // Fetch related entity names for context
    let partnerTagName: string | null = null;
    let partnerName: string | null = null;
    let productCategoryName: string | null = null;
    let productName: string | null = null;

    // Fetch context data in parallel
    if (partnerTagId) {
      const { data } = await supabase.from("tags").select("name").eq("id", partnerTagId).single();
      partnerTagName = data?.name || null;
    }

    if (partnerId) {
      const { data } = await supabase.from("contacts").select("name").eq("id", partnerId).single();
      partnerName = data?.name || null;
    }

    if (productCategoryId) {
      const { data } = await supabase.from("product_categories").select("name").eq("id", productCategoryId).single();
      productCategoryName = data?.name || null;
    }

    if (productId) {
      const { data } = await supabase.from("products").select("name, category_id").eq("id", productId).single();
      productName = data?.name || null;
      if (!productCategoryId && data?.category_id) {
        const { data: catData } = await supabase.from("product_categories").select("name").eq("id", data.category_id).single();
        productCategoryName = catData?.name || null;
      }
    }

    // Build context for AI
    const inputContext = {
      partnerTag: partnerTagName,
      partner: partnerName,
      productCategory: productCategoryName,
      product: productName,
    };

    const filledFields = Object.entries(inputContext)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => `${key}: "${value}"`);

    if (filledFields.length === 0) {
      return new Response(JSON.stringify({
        suggestion: null,
        confidence: "none",
        reason: "No input fields provided. Please fill at least one field.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analyze existing models for patterns
    const modelPatterns = models?.map((m: AutoAnalyticalModel) => {
      const account = analyticalAccounts?.find((a: AnalyticalAccount) => a.id === m.analytical_account_id);
      return {
        modelName: m.name,
        analyticalAccount: account?.name || "Unknown",
        analyticalCode: account?.code || "N/A",
        hasPartnerTag: !!m.partner_tag_id,
        hasPartner: !!m.partner_id,
        hasProductCategory: !!m.product_category_id,
        hasProduct: !!m.product_id,
        specificity: m.priority,
      };
    }) || [];

    const accountsList = analyticalAccounts?.map((a: AnalyticalAccount) => 
      `- ${a.code}: ${a.name}${a.description ? ` (${a.description})` : ""}`
    ).join("\n") || "No accounts available";

    const systemPrompt = `You are an ERP analytical account recommendation engine for BudgetWise ERP.

Your task is to:
1. Suggest the BEST analytical account for a transaction based on the provided context
2. Generate a clear, meaningful MODEL NAME that describes the rule

AVAILABLE ANALYTICAL ACCOUNTS:
${accountsList}

EXISTING AUTO ANALYTICAL MODELS (for pattern reference):
${modelPatterns.length > 0 ? JSON.stringify(modelPatterns, null, 2) : "No existing models"}

ANALYTICAL ACCOUNT SELECTION CRITERIA (in order of priority):
1. Exact pattern match with existing models
2. Similar patterns in existing models
3. Semantic relevance of account name/description to the context
4. Most generic appropriate account as fallback

MODEL NAME GENERATION RULES:
- Name must be human-readable and meaningful
- Name must reflect WHY the analytics are applied
- Combine context elements logically (e.g., "VIP Customer - Wooden Furniture")
- Maximum 50 characters
- No generic names like "Auto Rule 1" or "Model 123"
- Use format: "[Context Element] - [Purpose/Category]"

CONFIDENCE LEVELS:
- "high": Exact or near-exact match with existing patterns, or very clear semantic match
- "medium": Partial pattern match or reasonable semantic inference
- "low": Weak match or fallback suggestion

You MUST respond with a valid JSON object using the generate_analytical_model function.`;

    const userPrompt = `Generate the best analytical account AND model name for a rule with:
${filledFields.join("\n")}

Analyze the context and return your recommendation.`;

    // Call Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_analytical_model",
              description: "Return the suggested analytical account and auto-generated model name",
              parameters: {
                type: "object",
                properties: {
                  modelName: {
                    type: "string",
                    description: "A clear, meaningful model name (max 50 chars) that describes the rule purpose",
                  },
                  analyticalAccountId: {
                    type: "string",
                    description: "The UUID of the recommended analytical account",
                  },
                  analyticalAccountName: {
                    type: "string",
                    description: "The name of the recommended analytical account",
                  },
                  analyticalAccountCode: {
                    type: "string",
                    description: "The code of the recommended analytical account",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence level of the suggestion",
                  },
                  reason: {
                    type: "string",
                    description: "Human-readable explanation for the suggestion (max 100 words)",
                  },
                  matchedPatterns: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of patterns or factors that influenced the suggestion",
                  },
                },
                required: ["modelName", "analyticalAccountId", "analyticalAccountName", "analyticalAccountCode", "confidence", "reason", "matchedPatterns"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_analytical_model" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          suggestion: null,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add funds to continue.",
          suggestion: null,
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    
    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_analytical_model") {
      throw new Error("Invalid AI response format");
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    // Validate that the suggested account exists
    const validAccount = analyticalAccounts?.find(
      (a: AnalyticalAccount) => a.id === suggestion.analyticalAccountId
    );

    if (!validAccount) {
      // Fallback: find best match by name
      const fallbackAccount = analyticalAccounts?.find(
        (a: AnalyticalAccount) => 
          a.name.toLowerCase().includes(suggestion.analyticalAccountName?.toLowerCase() || "") ||
          a.code === suggestion.analyticalAccountCode
      ) || analyticalAccounts?.[0];

      if (fallbackAccount) {
        suggestion.analyticalAccountId = fallbackAccount.id;
        suggestion.analyticalAccountName = fallbackAccount.name;
        suggestion.analyticalAccountCode = fallbackAccount.code;
        suggestion.confidence = "low";
        suggestion.reason = `Fallback suggestion: ${fallbackAccount.name}. Original suggestion not found in available accounts.`;
      }
    }

    // Ensure model name is not too long
    if (suggestion.modelName && suggestion.modelName.length > 50) {
      suggestion.modelName = suggestion.modelName.substring(0, 47) + "...";
    }

    console.log("[AI Analytical Suggestion] Result:", {
      input: inputContext,
      modelName: suggestion.modelName,
      suggestion: suggestion.analyticalAccountName,
      confidence: suggestion.confidence,
    });

    return new Response(JSON.stringify({
      suggestion: {
        modelName: suggestion.modelName,
        analyticalAccountId: suggestion.analyticalAccountId,
        analyticalAccountName: suggestion.analyticalAccountName,
        analyticalAccountCode: suggestion.analyticalAccountCode,
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        matchedPatterns: suggestion.matchedPatterns,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Analytical Suggestion error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      suggestion: null,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
