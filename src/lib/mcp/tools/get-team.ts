import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_team",
  title: "Get team details",
  description: "Get a single team with its members.",
  inputSchema: {
    team_id: z.string().describe("Id of the team to fetch."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ team_id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: team, error } = await supabase
      .from("teams")
      .select("id, name, description, event_id, logo_url, primary_color, secondary_color, captain_id, intro_video_url, created_at")
      .eq("id", team_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!team) return { content: [{ type: "text", text: "Team not found or not visible to you." }], isError: true };

    const { data: members, error: membersError } = await supabase
      .from("team_members")
      .select("id, user_id, classroom, classroom_group, joined_at")
      .eq("team_id", team_id);
    if (membersError) {
      return { content: [{ type: "text", text: membersError.message }], isError: true };
    }

    const result = { team, members: members ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
