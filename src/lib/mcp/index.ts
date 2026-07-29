import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEventsTool from "./tools/list-events";
import getEventDetailsTool from "./tools/get-event-details";
import listTeamsTool from "./tools/list-teams";
import getTeamTool from "./tools/get-team";
import listMyTeamsTool from "./tools/list-my-teams";
import updateMyTeamTool from "./tools/update-my-team";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "squad-event-maker",
  title: "squad-event-maker",
  version: "0.1.0",
  instructions:
    "Tools for squad-event-maker, an app for organizing team-based events (championships). Use list_events and get_event_details to explore events, list_teams/get_team to inspect teams, list_my_teams for the signed-in user's teams, and update_my_team to edit a team the user captains.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listEventsTool,
    getEventDetailsTool,
    listTeamsTool,
    getTeamTool,
    listMyTeamsTool,
    updateMyTeamTool,
  ],
});
