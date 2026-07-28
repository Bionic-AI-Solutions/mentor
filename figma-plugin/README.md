# Baisoln Figma Gateway — companion plugin

Executes design-write commands from the multi-tenant Figma MCP gateway
inside your Figma client. One plugin session = one tenant channel.

## Install (unpublished, v1)
1. Figma desktop → menu → Plugins → Development → **Import plugin from manifest…**
2. Select `manifest.json` in this directory.

## Connect
1. Ask the gateway admin to run `fg_register_tenant` for you; save the
   returned `channel_key`.
2. Run the plugin (Plugins → Development → Baisoln Figma Gateway).
3. Enter tenant ID + channel key → Connect. Status shows
   "Connected as <tenant>".
4. Keep the plugin panel open while agents make design edits.

Writes fail with `plugin_not_connected` when this panel is closed.
