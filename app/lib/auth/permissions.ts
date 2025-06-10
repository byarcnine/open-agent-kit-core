const AVAILABLE_PERMISSIONS = {
  global: {
    super_admin: "global.super_admin",
    edit_users: "global.edit_global_users",
    see_users: "global.see_global_users",
    view_plugins: "global.view_plugins",
    edit_plugins: "global.edit_plugins",
    set_access_for_plugins_to_a_space:
      "global.set_access_for_plugins_to_a_space",
    set_access_for_plugins_to_an_agent_in_a_space:
      "global.set_access_for_plugins_to_an_agent_in_a_space",
    edit_spaces: "global.edit_spaces",
    delete_space_after_all_agents_deleted:
      "global.delete_space_after_all_agents_deleted",
    view_spaces: "global.view_spaces",
  },
  space: {
    edit_space: "space.edit_space",
    view_space_settings: "space.view_space_settings",
    edit_users: "space.edit_users",
    invite_users: "space.invite_users",
    delete_users: "space.delete_users",
    create_agent: "space.create_agent",
    view_agents: "space.view_agents",
  },
  agent: {
    edit_agent: "agent.edit_agent",
    view_agent_settings: "agent.view_agent_settings",
    chat: "agent.chat",
  },
};
