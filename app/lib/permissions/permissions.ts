export const AVAILABLE_PERMISSIONS = {
  global: {
    "global.super_admin": {
      name: "Super Admin",
      description: "Can do anything",
      grants: ["global.*", "space.*", "agent.*"],
    },
    "global.edit_global_users": {
      name: "Edit Global Users",
      description: "Can edit user roles and permissions globally",
      grants: [
        "space.edit_users",
        "space.invite_users",
        "space.delete_users",
        "global.see_global_users",
      ],
    },
    "global.see_global_users": {
      name: "See Global Users",
      description: "Can view all users in the system",
      grants: ["space.edit_users"],
    },
    "global.edit_plugins": {
      name: "Edit Plugins",
      description: "Can install, configure, and manage plugins",
      grants: [
        "global.view_plugins",
        "space.edit_plugins",
        "space.view_plugins",
        "global.set_access_for_plugins_to_a_space",
        "global.set_access_for_plugins_to_an_agent_in_a_space",
      ],
    },
    "global.view_plugins": {
      name: "View Plugins",
      description: "Can view available plugins",
      grants: ["space.view_plugins"],
    },
    "global.set_access_for_plugins_to_a_space": {
      name: "Set Plugin Access to Spaces",
      description: "Can grant plugin access to spaces",
      grants: ["space.set_access_for_plugins_to_a_space"],
    },
    "global.set_access_for_plugins_to_an_agent_in_a_space": {
      name: "Set Plugin Access to Agents",
      description: "Can grant plugin access to specific agents",
      grants: ["space.set_access_for_plugins_to_an_agent_in_a_space"],
    },
    "global.edit_spaces": {
      name: "Edit Spaces",
      description: "Can create, edit, and delete spaces",
      grants: [
        "space.edit_space",
        "space.view_space_settings",
        "space.create_agent",
        "space.view_agents",
        "global.delete_space_after_all_agents_deleted",
        "global.view_spaces",
      ],
    },
    "global.view_spaces": {
      name: "View Spaces",
      description: "Can view all spaces in the system",
      grants: ["space.view_space_settings", "space.view_agents"],
    },
  },
  space: {
    "space.edit_space": {
      name: "Edit Space",
      description: "Can edit space settings and configuration",
      grants: ["space.*", "agent.*"],
    },
    "space.view_space_settings": {
      name: "View Space Settings",
      description: "Can view space configuration and settings",
      grants: ["agent.view_agent_settings"],
    },
    "space.edit_users": {
      name: "Edit Space Users",
      description: "Can manage users within this space",
      grants: ["space.invite_users", "space.delete_users"],
    },
    "space.invite_users": {
      name: "Invite Users",
      description: "Can invite new users to this space",
    },
    "space.create_agent": {
      name: "Create Agent",
      description: "Can create new agents in this space",
      grants: [
        "agent.edit_agent",
        "agent.view_agent_settings",
        "agent.chat",
        "space.view_agents",
      ],
    },
    "space.view_agents": {
      name: "View Agents",
      description: "Can view agents in this space",
      grants: ["agent.chat", "agent.view_agent_settings"],
    },
  },
  agent: {
    "agent.edit_agent": {
      name: "Edit Agent",
      description: "Can edit agent configuration and settings",
      grants: ["agent.view_agent_settings", "agent.chat"],
    },
    "agent.view_agent_settings": {
      name: "View Agent Settings",
      description: "Can view agent configuration",
      grants: ["agent.chat"],
    },
    "agent.chat": {
      name: "Chat",
      description: "Can interact with this agent",
    },
  },
};
