# mentor

## Figma gateway plugin

[`figma-plugin/`](figma-plugin/) holds the **Baisoln Figma Gateway** companion
plugin — the piece that lets an agent make design edits in *your* Figma file.
Reads (inspecting files, components, styles, comments) work without it; writes
fail with `plugin_not_connected` unless the plugin panel is open.

### 1. Get the files

```bash
git clone https://github.com/Bionic-AI-Solutions/mentor.git ~/mentor
```

Keep the clone where it is — Figma reloads the plugin from that path every run.

### 2. Import into Figma

Figma **desktop app** (the browser version cannot import development plugins)
→ Plugins → Development → **Import plugin from manifest…** → select:

```
macOS/Linux : ~/mentor/figma-plugin/manifest.json
Windows     : %USERPROFILE%\mentor\figma-plugin\manifest.json
```

### 3. Connect

Plugins → Development → **Baisoln Figma Gateway**, then:

| Field           | Value                                    |
|-----------------|------------------------------------------|
| Gateway WS URL  | `wss://mcp.baisoln.com/figma/ws` (default — don't edit) |
| Tenant ID       | your tenant id, lowercase                |
| Channel key     | ask the gateway admin — sent to you separately |

Click **Connect**; the status line should read `Connected as <tenant>` in green.
Leave the panel open while an agent is working.

Status line meanings:

| Text                     | Meaning                                                  |
|--------------------------|----------------------------------------------------------|
| `Connected as <tenant>`  | Working                                                   |
| `Disconnected (4401)`    | Wrong tenant id or channel key                            |
| `Disconnected (4000)`    | Same tenant connected elsewhere — last connection wins    |
| `Connection error` / `(1006)` | Network blocked before the handshake (proxy/VPN), or the WS URL was edited |

Never commit your channel key. It is entered in the panel at runtime and stored
only in Figma's local plugin storage.

### 4. MCP endpoint

The agent side connects to the gateway over MCP:

```bash
claude mcp add --transport http figma \
  https://mcp.baisoln.com/figma/mcp --header "X-API-Key: <key>"
```

The API key is issued separately. Every tool call takes your `tenant_id` first.

---

Upstream source of truth: `Bionic-AI-Solutions/multitenant-mcp-servers`,
branch `feature/figma-gateway`, at `src/mcp_servers/figma/plugin/`.
This directory is a copy for distribution — fixes belong upstream first.
