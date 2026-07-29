import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_my_team",
  title: "Update my team",
  description:
    "Update the name, description or colors of a team. Only allowed for teams the signed-in user is permitted to edit.",
  inputSchema: {
    team_id: z.string().describe("Id of the team to update."),
    name: z.string().optional().describe("New team name."),
    description: z.string().optional().describe("New team description."),
    primary_color: z.string().optional().describe("New primary color, e.g. #ff0000."),
    secondary_color: z.string().optional().describe("New secondary color, e.g. #0000ff."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ team_id, name, description, primary_color, secondary_color }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (primary_color !== undefined) updates.primary_color = primary_color;
    if (secondary_color !== undefined) updates.secondary_color = secondary_color;

    if (Object.keys(updates).length === 0) {
      return { content: [{ type: "text", text: "No fields to update." }], isError: true };
    }

    const { data, error } = await supabaseForUser(ctx)
      .from("teams")
      .update(updates)
      .eq("id", team_id)
      .select()
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "Team not updated — it does not exist or you do not have permission." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { team: data },
    };
  },
});
