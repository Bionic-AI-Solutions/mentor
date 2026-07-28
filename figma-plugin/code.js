// Baisoln Figma Gateway — companion plugin main thread.
// Receives {id, command, params} from ui.html, executes Figma Plugin API,
// posts back {id, result} or {id, error}.

figma.showUI(__html__, { width: 300, height: 260 });

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function nodeSummary(n) {
  const s = { id: n.id, name: n.name, type: n.type };
  if ("x" in n) { s.x = n.x; s.y = n.y; }
  if ("width" in n) { s.width = n.width; s.height = n.height; }
  return s;
}

async function getNode(id) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) throw new Error("node not found: " + id);
  return n;
}

async function appendTo(node, parentId) {
  const parent = parentId ? await getNode(parentId) : figma.currentPage;
  parent.appendChild(node);
}

const handlers = {
  async get_document_info() {
    return {
      file_name: figma.root.name,
      current_page: { id: figma.currentPage.id, name: figma.currentPage.name },
      pages: figma.root.children.map((p) => ({ id: p.id, name: p.name })),
    };
  },

  async get_selection() {
    return { selection: figma.currentPage.selection.map(nodeSummary) };
  },

  async create_frame(p) {
    const f = figma.createFrame();
    f.name = p.name || "Frame";
    f.x = p.x || 0; f.y = p.y || 0;
    f.resize(p.width || 100, p.height || 100);
    await appendTo(f, p.parent_id);
    return nodeSummary(f);
  },

  async create_text(p) {
    const family = p.font_family || "Inter";
    const style = p.font_style || "Regular";
    await figma.loadFontAsync({ family, style });
    const t = figma.createText();
    t.fontName = { family, style };
    t.characters = p.text || "";
    t.fontSize = p.font_size || 14;
    t.name = p.name || (p.text || "Text").substring(0, 30);
    t.x = p.x || 0; t.y = p.y || 0;
    await appendTo(t, p.parent_id);
    return nodeSummary(t);
  },

  async create_rectangle(p) {
    const r = figma.createRectangle();
    r.name = p.name || "Rectangle";
    r.x = p.x || 0; r.y = p.y || 0;
    r.resize(p.width || 100, p.height || 100);
    await appendTo(r, p.parent_id);
    return nodeSummary(r);
  },

  async create_component_instance(p) {
    const comp = await figma.importComponentByKeyAsync(p.component_key);
    const inst = comp.createInstance();
    inst.x = p.x || 0; inst.y = p.y || 0;
    await appendTo(inst, p.parent_id);
    return nodeSummary(inst);
  },

  async set_fill(p) {
    const n = await getNode(p.node_id);
    n.fills = [{ type: "SOLID", color: hexToRgb(p.color),
                 opacity: p.opacity == null ? 1 : p.opacity }];
    return nodeSummary(n);
  },

  async set_stroke(p) {
    const n = await getNode(p.node_id);
    n.strokes = [{ type: "SOLID", color: hexToRgb(p.color) }];
    if ("strokeWeight" in n) n.strokeWeight = p.weight || 1;
    return nodeSummary(n);
  },

  async set_corner_radius(p) {
    const n = await getNode(p.node_id);
    n.cornerRadius = p.radius;
    return nodeSummary(n);
  },

  async set_text_content(p) {
    const n = await getNode(p.node_id);
    if (n.type !== "TEXT") throw new Error("not a TEXT node: " + p.node_id);
    await figma.loadFontAsync(n.fontName);
    n.characters = p.text;
    return nodeSummary(n);
  },

  async set_auto_layout(p) {
    const n = await getNode(p.node_id);
    n.layoutMode = p.mode || "VERTICAL";
    if (p.mode !== "NONE") {
      n.itemSpacing = p.spacing || 0;
      n.paddingLeft = n.paddingRight = n.paddingTop = n.paddingBottom = p.padding || 0;
    }
    return nodeSummary(n);
  },

  async move_node(p) {
    const n = await getNode(p.node_id);
    n.x = p.x; n.y = p.y;
    return nodeSummary(n);
  },

  async resize_node(p) {
    const n = await getNode(p.node_id);
    n.resize(p.width, p.height);
    return nodeSummary(n);
  },

  async clone_node(p) {
    const n = await getNode(p.node_id);
    const c = n.clone();
    if (p.x != null) c.x = p.x;
    if (p.y != null) c.y = p.y;
    n.parent.appendChild(c);
    return nodeSummary(c);
  },

  async delete_node(p) {
    const n = await getNode(p.node_id);
    n.remove();
    return { deleted: p.node_id };
  },

  async set_parent(p) {
    const n = await getNode(p.node_id);
    const parent = await getNode(p.parent_id);
    parent.appendChild(n);
    return nodeSummary(n);
  },
};

figma.ui.onmessage = async (m) => {
  if (m.type === "save-settings") {
    await figma.clientStorage.setAsync("gateway-settings", m.settings);
    return;
  }
  if (m.type === "load-settings") {
    const settings = await figma.clientStorage.getAsync("gateway-settings");
    figma.ui.postMessage({ type: "settings", settings: settings || null });
    return;
  }
  if (m.type === "command") {
    const { id, command, params } = m.msg;
    let payload;
    try {
      const handler = handlers[command];
      if (!handler) throw new Error("unknown command: " + command);
      payload = { id, result: await handler(params || {}) };
    } catch (e) {
      payload = { id, error: String(e && e.message ? e.message : e) };
    }
    figma.ui.postMessage({ type: "result", payload });
  }
};
