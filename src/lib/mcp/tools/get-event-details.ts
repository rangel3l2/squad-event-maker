import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_event_details",
  title: "Get event details",
  description: "Get an event with its rules and prizes.",
  inputSchema: {
    event_id: z.string().describe("Id of the event to fetch."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: event, error } = await supabase
      .from("events")
      .select("id, name, description, edition, event_date, is_active, logo_url, copa_year")
      .eq("id", event_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!event) return { content: [{ type: "text", text: "Event not found or not visible to you." }], isError: true };

    const [{ data: rules }, { data: prizes }] = await Promise.all([
      supabase.from("event_rules").select("*").eq("event_id", event_id),
      supabase.from("event_prizes").select("*").eq("event_id", event_id),
    ]);

    const result = { event, rules: rules ?? [], prizes: prizes ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
