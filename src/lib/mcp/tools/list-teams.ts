import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_teams",
  title: "List teams",
  description: "List teams, optionally filtered by event id.",
  inputSchema: {
    event_id: z.string().optional().describe("Event id to filter teams by."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("teams")
      .select("id, name, description, event_id, logo_url, primary_color, secondary_color, captain_id, created_at")
      .order("created_at", { ascending: false });
    if (event_id) query = query.eq("event_id", event_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { teams: data ?? [] },
    };
  },
});
