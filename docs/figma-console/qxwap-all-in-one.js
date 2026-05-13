// QXwap All-in-One Figma Console Script
// Paste ONCE into: Figma > Plugins > Development > Open Console > Enter
// Runs: Variables, Styles, Components, Screens, Prototype.
// Wait for final [QXwap] ALL DONE before closing.
// ─────────────────────────────────────────────────────────────────────

(async function qxwapAllInOne() {
  function log(step, msg) {
    console.log('[QXwap Step ' + step + '] ' + msg);
  }

  // ============================================================
  // Step 0 — Variables
  // ============================================================
  log('0', 'Starting: Step 0 — Variables');
  var result0 = await (async function() {
    const createdVariableIds = [];
      const updatedVariableIds = [];
      const warnings = [];
    
      function hexToColor(hex) {
        const clean = String(hex).replace("#", "");
        const n = parseInt(clean, 16);
        return {
          r: ((n >> 16) & 255) / 255,
          g: ((n >> 8) & 255) / 255,
          b: (n & 255) / 255,
          a: 1
        };
      }
    
      function px(value) {
        if (typeof value === "number") return value;
        const match = String(value).match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : 0;
      }
    
      const colorTokens = {
        "primitive/color/blue/50": "#eef6ff",
        "primitive/color/blue/100": "#dbeafe",
        "primitive/color/blue/200": "#b9ddff",
        "primitive/color/blue/300": "#8ac8ff",
        "primitive/color/blue/400": "#53a7ff",
        "primitive/color/blue/500": "#176bff",
        "primitive/color/blue/600": "#0d55db",
        "primitive/color/blue/700": "#1247ad",
        "primitive/color/purple/300": "#c4b5fd",
        "primitive/color/purple/500": "#6d5dfc",
        "primitive/color/gray/0": "#ffffff",
        "primitive/color/gray/50": "#fbfcff",
        "primitive/color/gray/100": "#f3f6ff",
        "primitive/color/gray/200": "#e8ebf3",
        "primitive/color/gray/600": "#68748a",
        "primitive/color/gray/800": "#252b3a",
        "primitive/color/gray/900": "#101322",
        "primitive/color/gray/950": "#070b18",
        "primitive/color/green/500": "#17a765",
        "primitive/color/red/500": "#ef4444",
        "primitive/color/amber/500": "#f59e0b",
        "semantic/light/brand": "#176bff",
        "semantic/light/brandHover": "#0d55db",
        "semantic/light/brandAccent": "#6d5dfc",
        "semantic/light/page": "#fbfcff",
        "semantic/light/surface": "#ffffff",
        "semantic/light/surfaceSubtle": "#f3f6ff",
        "semantic/light/border": "#e8ebf3",
        "semantic/light/textPrimary": "#101322",
        "semantic/light/textSecondary": "#68748a",
        "semantic/light/textInverse": "#ffffff",
        "semantic/light/success": "#17a765",
        "semantic/light/danger": "#ef4444",
        "semantic/light/warning": "#f59e0b",
        "semantic/light/focus": "#176bff",
        "component/button/bg": "#176bff",
        "component/button/bgHover": "#0d55db",
        "component/button/fg": "#ffffff",
        "component/card/bg": "#ffffff",
        "component/card/border": "#e8ebf3",
        "component/nav/bg": "#ffffff",
        "component/nav/active": "#6d5dfc",
        "component/sheet/scrim": "#101322"
      };
    
      const floatTokens = {
        "primitive/space/0": 0,
        "primitive/space/1": 4,
        "primitive/space/2": 8,
        "primitive/space/3": 12,
        "primitive/space/4": 16,
        "primitive/space/5": 20,
        "primitive/space/6": 24,
        "primitive/space/8": 32,
        "primitive/space/10": 40,
        "primitive/radius/xs": 8,
        "primitive/radius/sm": 12,
        "primitive/radius/md": 16,
        "primitive/radius/lg": 22,
        "primitive/radius/xl": 28,
        "primitive/radius/pill": 999,
        "component/button/height": 48,
        "component/button/heightCompact": 44,
        "component/button/paddingX": 16,
        "component/button/radius": 16,
        "component/card/radius": 22,
        "component/card/padding": 16,
        "component/nav/height": 76,
        "component/nav/itemMinHeight": 56,
        "component/sheet/radius": 28,
        "component/layout/mobileWidth": 520,
        "component/layout/pagePadding": 14,
        "component/layout/sectionGap": 16,
        "motion/fast": 140,
        "motion/base": 220,
        "motion/slow": 320
      };
    
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      let collection = collections.find((c) => c.name === "QXwap Tokens");
      if (!collection) collection = figma.variables.createVariableCollection("QXwap Tokens");
    
      const modeId = collection.modes[0].modeId;
      try {
        collection.renameMode(modeId, "Light");
      } catch {}
    
      const existing = await figma.variables.getLocalVariablesAsync();
      function findExisting(name, type) {
        return existing.find((v) => v.name === name && v.resolvedType === type) || null;
      }
    
      function upsert(name, type, value) {
        let variable = findExisting(name, type);
        const created = !variable;
        if (!variable) variable = figma.variables.createVariable(name, collection, type);
        variable.setValueForMode(modeId, value);
        try {
          variable.setVariableCodeSyntax("WEB", `var(--qx-${name.replaceAll("/", "-")})`);
        } catch {}
        if (created) createdVariableIds.push(variable.id);
        else updatedVariableIds.push(variable.id);
        return variable;
      }
    
      for (const [name, value] of Object.entries(colorTokens)) {
        upsert(name, "COLOR", hexToColor(value));
      }
    
      for (const [name, value] of Object.entries(floatTokens)) {
        upsert(name, "FLOAT", px(value));
      }
    
      return {
        collectionId: collection.id,
        collectionName: collection.name,
        createdVariableIds,
        updatedVariableIds,
        colorCount: Object.keys(colorTokens).length,
        floatCount: Object.keys(floatTokens).length,
        warnings,
        note: "Created/updated QXwap Figma Variables for colors, spacing, radius, sizing, and motion. Run components after this so fills/strokes can bind."
      };
  })();
  log('0', 'Done - ' + (result0 && result0.note ? result0.note : 'ok'));

  // ============================================================
  // Step 1 — Text + Effect Styles
  // ============================================================
  log('1', 'Starting: Step 1 — Text + Effect Styles');
  var result1 = await (async function() {
    const createdStyleIds = [];
    const updatedStyleIds = [];
    
    const desiredTextStyles = [
      {
        name: "QXwap/Text/Display Brand",
        description: "QXwap logo and major brand lockups",
        size: 26,
        weight: "Black",
        lineHeightPercent: 105
      },
      {
        name: "QXwap/Text/Heading Screen",
        description: "Primary mobile screen title",
        size: 24,
        weight: "Black",
        lineHeightPercent: 110
      },
      {
        name: "QXwap/Text/Title Card",
        description: "Product card title and important item labels",
        size: 17,
        weight: "Black",
        lineHeightPercent: 120
      },
      {
        name: "QXwap/Text/Body Default",
        description: "Default body copy and normal content",
        size: 14,
        weight: "Regular",
        lineHeightPercent: 145
      },
      {
        name: "QXwap/Text/Label Strong",
        description: "Buttons, chips, tabs, and strong labels",
        size: 13,
        weight: "Bold",
        lineHeightPercent: 110
      },
      {
        name: "QXwap/Text/Caption Meta",
        description: "Metadata, helper copy, owner/location labels",
        size: 12,
        weight: "Medium",
        lineHeightPercent: 130
      }
    ];
    
    const desiredEffectStyles = [
      {
        name: "QXwap/Shadow/Soft",
        description: "Subtle list/surface lift",
        effects: [{ y: 8, radius: 22, color: [16, 24, 40], alpha: 0.06 }]
      },
      {
        name: "QXwap/Shadow/Card",
        description: "Product card and feed card",
        effects: [{ y: 14, radius: 32, color: [35, 50, 90], alpha: 0.09 }]
      },
      {
        name: "QXwap/Shadow/Raised",
        description: "Elevated card or modal panel",
        effects: [{ y: 18, radius: 42, color: [32, 45, 85], alpha: 0.16 }]
      },
      {
        name: "QXwap/Shadow/Primary",
        description: "Primary and Xwap CTA",
        effects: [{ y: 12, radius: 28, color: [23, 107, 255], alpha: 0.28 }]
      },
      {
        name: "QXwap/Shadow/Sheet",
        description: "Bottom sheet elevation",
        effects: [{ y: -18, radius: 46, color: [16, 24, 40], alpha: 0.18 }]
      },
      {
        name: "QXwap/Shadow/Nav",
        description: "Sticky bottom navigation",
        effects: [{ y: -10, radius: 28, color: [16, 24, 40], alpha: 0.10 }]
      }
    ];
    
    async function pickFont(weight) {
      const preferred = [
        { family: "Inter", style: weight },
        { family: "Inter", style: weight === "Black" ? "Bold" : weight },
        { family: "Inter", style: "Regular" }
      ];
      for (const fontName of preferred) {
        try {
          await figma.loadFontAsync(fontName);
          return fontName;
        } catch {}
      }
      const fonts = await figma.listAvailableFontsAsync();
      const inter = fonts.find((f) => f.fontName.family === "Inter")?.fontName;
      const fallback = inter || fonts[0].fontName;
      await figma.loadFontAsync(fallback);
      return fallback;
    }
    
    function rgbaEffect(input) {
      const [r, g, b] = input.color;
      return {
        type: "DROP_SHADOW",
        color: { r: r / 255, g: g / 255, b: b / 255, a: input.alpha },
        offset: { x: 0, y: input.y },
        radius: input.radius,
        spread: 0,
        visible: true,
        blendMode: "NORMAL"
      };
    }
    
    async function upsertTextStyle(spec, existingStyles) {
      let style = existingStyles.find((s) => s.name === spec.name);
      const created = !style;
      if (!style) style = figma.createTextStyle();
    
      const fontName = await pickFont(spec.weight);
      style.name = spec.name;
      style.description = spec.description;
      style.fontName = fontName;
      style.fontSize = spec.size;
      style.lineHeight = { unit: "PERCENT", value: spec.lineHeightPercent };
      style.letterSpacing = { unit: "PERCENT", value: 0 };
    
      if (created) createdStyleIds.push(style.id);
      else updatedStyleIds.push(style.id);
      return style.id;
    }
    
    async function upsertEffectStyle(spec, existingStyles) {
      let style = existingStyles.find((s) => s.name === spec.name);
      const created = !style;
      if (!style) style = figma.createEffectStyle();
    
      style.name = spec.name;
      style.description = spec.description;
      style.effects = spec.effects.map(rgbaEffect);
    
      if (created) createdStyleIds.push(style.id);
      else updatedStyleIds.push(style.id);
      return style.id;
    }
    
    const existingTextStyles = await figma.getLocalTextStylesAsync();
    const existingEffectStyles = await figma.getLocalEffectStylesAsync();
    
    const textStyleIds = [];
    for (const spec of desiredTextStyles) {
      textStyleIds.push(await upsertTextStyle(spec, existingTextStyles));
    }
    
    const effectStyleIds = [];
    for (const spec of desiredEffectStyles) {
      effectStyleIds.push(await upsertEffectStyle(spec, existingEffectStyles));
    }
    
    return {
      createdStyleIds,
      updatedStyleIds,
      textStyleIds,
      effectStyleIds,
      textStyleCount: textStyleIds.length,
      effectStyleCount: effectStyleIds.length,
      textStyleNames: desiredTextStyles.map((s) => s.name),
      effectStyleNames: desiredEffectStyles.map((s) => s.name),
      note: "Created/updated QXwap Figma Text Styles and Effect Styles from design tokens."
    };
  })();
  log('1', 'Done - ' + (result1 && result1.note ? result1.note : 'ok'));

  // ============================================================
  // Step 2 — Real Components + Variants
  // ============================================================
  log('2', 'Starting: Step 2 — Real Components + Variants');
  var result2 = await (async function() {
    const createdNodeIds = [];
    const mutatedNodeIds = [];
    const createdSetIds = [];
    
    const FONT = { family: "Inter", style: "Regular" };
    const FONT_BOLD = { family: "Inter", style: "Bold" };
    
    try {
      await figma.loadFontAsync(FONT);
      await figma.loadFontAsync(FONT_BOLD);
    } catch {
      const fonts = await figma.listAvailableFontsAsync();
      const interRegular = fonts.find((f) => f.fontName.family === "Inter")?.fontName;
      const fallback = interRegular || fonts[0].fontName;
      FONT.family = fallback.family;
      FONT.style = fallback.style;
      FONT_BOLD.family = fallback.family;
      FONT_BOLD.style = fallback.style;
      await figma.loadFontAsync(FONT);
      await figma.loadFontAsync(FONT_BOLD);
    }
    
    function rgb(hex) {
      const clean = hex.replace("#", "");
      const n = parseInt(clean, 16);
      return {
        r: ((n >> 16) & 255) / 255,
        g: ((n >> 8) & 255) / 255,
        b: (n & 255) / 255
      };
    }
    
    const C = {
      brand: rgb("#176bff"),
      brand2: rgb("#53a7ff"),
      brandSoft: rgb("#eaf3ff"),
      accent: rgb("#6d5dfc"),
      page: rgb("#fbfcff"),
      surface: rgb("#ffffff"),
      surfaceSubtle: rgb("#f3f6ff"),
      border: rgb("#e8ebf3"),
      text: rgb("#101322"),
      muted: rgb("#68748a"),
      danger: rgb("#ef4444"),
      dangerSoft: rgb("#fff1f2"),
      success: rgb("#17a765"),
      successSoft: rgb("#ecfdf5"),
      warning: rgb("#f59e0b"),
      transparent: { r: 1, g: 1, b: 1 }
    };
    
    const tokenNames = {
      brand: ["semantic/light/brand", "semantic.light.brand", "brand.primary", "primitive/color/blue/500", "primitive.color.blue.500"],
      brandHover: ["semantic/light/brandHover", "semantic.light.brandHover", "primitive/color/blue/600", "primitive.color.blue.600"],
      brandSoft: ["primitive/color/blue/50", "primitive.color.blue.50", "brand.soft"],
      accent: ["semantic/light/brandAccent", "semantic.light.brandAccent", "primitive/color/purple/500", "primitive.color.purple.500"],
      surface: ["semantic/light/surface", "semantic.light.surface", "surface.card", "primitive/color/gray/0", "primitive.color.gray.0"],
      surfaceSubtle: ["semantic/light/surfaceSubtle", "semantic.light.surfaceSubtle", "primitive/color/gray/100", "primitive.color.gray.100"],
      page: ["semantic/light/page", "semantic.light.page", "surface.page", "primitive/color/gray/50", "primitive.color.gray.50"],
      border: ["semantic/light/border", "semantic.light.border", "primitive/color/gray/200", "primitive.color.gray.200"],
      text: ["semantic/light/textPrimary", "semantic.light.textPrimary", "text.primary", "primitive/color/gray/900", "primitive.color.gray.900"],
      muted: ["semantic/light/textSecondary", "semantic.light.textSecondary", "text.secondary", "primitive/color/gray/600", "primitive.color.gray.600"],
      inverse: ["semantic/light/textInverse", "semantic.light.textInverse", "primitive/color/gray/0", "primitive.color.gray.0"],
      danger: ["semantic/light/danger", "semantic.light.danger", "status.error", "primitive/color/red/500", "primitive.color.red.500"],
      success: ["semantic/light/success", "semantic.light.success", "status.success", "primitive/color/green/500", "primitive.color.green.500"],
      warning: ["semantic/light/warning", "semantic.light.warning", "status.warning", "primitive/color/amber/500", "primitive.color.amber.500"]
    };
    
    const floatTokenNames = {
      space1: ["primitive/space/1", "primitive.space.1"],
      space2: ["primitive/space/2", "primitive.space.2"],
      space3: ["primitive/space/3", "primitive.space.3"],
      space4: ["primitive/space/4", "primitive.space.4"],
      buttonHeight: ["component/button/height", "component.button.height"],
      buttonPaddingX: ["component/button/paddingX", "component.button.paddingX"],
      buttonRadius: ["component/button/radius", "component.button.radius"],
      cardRadius: ["component/card/radius", "component.card.radius"],
      cardPadding: ["component/card/padding", "component.card.padding"],
      navHeight: ["component/nav/height", "component.nav.height"],
      navItemMinHeight: ["component/nav/itemMinHeight", "component.nav.itemMinHeight"],
      sheetRadius: ["component/sheet/radius", "component.sheet.radius"],
      pagePadding: ["component/layout/pagePadding", "component.layout.pagePadding"],
      radiusMd: ["primitive/radius/md", "primitive.radius.md"],
      radiusLg: ["primitive/radius/lg", "primitive.radius.lg"],
      radiusXl: ["primitive/radius/xl", "primitive.radius.xl"],
      radiusPill: ["primitive/radius/pill", "primitive.radius.pill"]
    };
    
    const localVars = await figma.variables.getLocalVariablesAsync();
    function normalizeName(name) {
      return String(name).replace(/[._]/g, "/").replace(/^QXwap\//, "").toLowerCase();
    }
    function findVariable(candidates) {
      const wanted = candidates.map(normalizeName);
      return localVars.find((v) => wanted.includes(normalizeName(v.name))) || null;
    }
    const vars = {};
    for (const [key, names] of Object.entries(tokenNames)) vars[key] = findVariable(names);
    const floatVars = {};
    for (const [key, names] of Object.entries(floatTokenNames)) floatVars[key] = findVariable(names);
    
    function paint(color, tokenKey) {
      const base = { type: "SOLID", color };
      const variable = vars[tokenKey];
      if (!variable) return [base];
      try {
        return [figma.variables.setBoundVariableForPaint(base, "color", variable)];
      } catch {
        return [base];
      }
    }
    function fill(node, color, tokenKey) {
      node.fills = paint(color, tokenKey);
    }
    function stroke(node, color, tokenKey) {
      node.strokes = paint(color, tokenKey);
    }
    function bindFloat(node, prop, tokenKey) {
      const variable = floatVars[tokenKey];
      if (!variable || typeof node.setBoundVariable !== "function") return;
      try {
        node.setBoundVariable(prop, variable);
      } catch {}
    }
    function bindRadius(node, tokenKey) {
      bindFloat(node, "topLeftRadius", tokenKey);
      bindFloat(node, "topRightRadius", tokenKey);
      bindFloat(node, "bottomLeftRadius", tokenKey);
      bindFloat(node, "bottomRightRadius", tokenKey);
    }
    
    function shadow(y = 14, radius = 32, alpha = 0.09, color = [35, 50, 90]) {
      const [r, g, b] = color;
      return [{
        type: "DROP_SHADOW",
        color: { r: r / 255, g: g / 255, b: b / 255, a: alpha },
        offset: { x: 0, y },
        radius,
        spread: 0,
        visible: true,
        blendMode: "NORMAL"
      }];
    }
    
    function text(label, size = 14, bold = false, color = C.text, tokenKey = "text") {
      const t = figma.createText();
      t.characters = label;
      t.fontName = bold ? FONT_BOLD : FONT;
      t.fontSize = size;
      t.lineHeight = { unit: "PERCENT", value: 120 };
      fill(t, color, tokenKey);
      return t;
    }
    
    function setupAuto(node, direction = "HORIZONTAL", gap = 8, pad = 0, gapToken = null, padToken = null) {
      node.layoutMode = direction;
      node.itemSpacing = gap;
      node.paddingTop = pad;
      node.paddingRight = pad;
      node.paddingBottom = pad;
      node.paddingLeft = pad;
      node.primaryAxisSizingMode = "AUTO";
      node.counterAxisSizingMode = "AUTO";
      node.counterAxisAlignItems = "CENTER";
      if (gapToken) bindFloat(node, "itemSpacing", gapToken);
      if (padToken) {
        bindFloat(node, "paddingTop", padToken);
        bindFloat(node, "paddingRight", padToken);
        bindFloat(node, "paddingBottom", padToken);
        bindFloat(node, "paddingLeft", padToken);
      }
    }
    
    function component(name, width, height, build, widthToken = null, heightToken = null) {
      const c = figma.createComponent();
      c.name = name;
      c.resize(width, height);
      if (widthToken) bindFloat(c, "width", widthToken);
      if (heightToken) bindFloat(c, "height", heightToken);
      fill(c, C.surface, "surface");
      stroke(c, C.border, "border");
      c.strokeWeight = 1;
      c.cornerRadius = 20;
      bindRadius(c, "radiusLg");
      build(c);
      createdNodeIds.push(c.id);
      return c;
    }
    
    function rect(name, w, h, radius, color, tokenKey, radiusToken = null) {
      const r = figma.createRectangle();
      r.name = name;
      r.resize(w, h);
      r.cornerRadius = radius;
      if (radiusToken) bindRadius(r, radiusToken);
      fill(r, color, tokenKey);
      return r;
    }
    
    function iconDot(name = "Icon", color = C.text, tokenKey = "text") {
      const f = figma.createFrame();
      f.name = name;
      f.resize(24, 24);
      f.fills = [];
      const a = figma.createEllipse();
      a.resize(18, 18);
      a.x = 3;
      a.y = 3;
      a.fills = [];
      stroke(a, color, tokenKey);
      a.strokeWeight = 2.25;
      f.appendChild(a);
      return f;
    }
    
    function statusChip(label, bg, fg, bgToken, fgToken) {
      const f = figma.createFrame();
      f.name = `Chip / ${label}`;
      setupAuto(f, "HORIZONTAL", 6, 10, null, "space2");
      f.cornerRadius = 999;
      bindRadius(f, "radiusPill");
      fill(f, bg, bgToken);
      const t = text(label, 12, true, fg, fgToken);
      f.appendChild(t);
      return f;
    }
    
    function makeVariantSet(page, setName, comps, x, y) {
      comps.forEach((c, i) => {
        c.x = x + (i % 4) * (c.width + 24);
        c.y = y + Math.floor(i / 4) * (c.height + 28);
        page.appendChild(c);
      });
      const set = figma.combineAsVariants(comps, page);
      set.name = setName;
      set.x = x;
      set.y = y;
      createdSetIds.push(set.id);
      return set;
    }
    
    function variantName(props) {
      return Object.entries(props).map(([k, v]) => `${k}=${v}`).join(", ");
    }
    
    function makeButton(type, state) {
      return component(variantName({ Type: type, State: state }), 176, 48, (c) => {
        setupAuto(c, "HORIZONTAL", 8, 16, "space2", "buttonPaddingX");
        c.cornerRadius = 16;
        bindRadius(c, "buttonRadius");
        c.effects = type === "Primary" || type === "Xwap" ? shadow(12, 28, 0.28, [23, 107, 255]) : [];
        if (type === "Primary" || type === "Xwap") fill(c, C.brand, "brand");
        if (type === "Secondary") fill(c, C.surface, "surface");
        if (type === "Danger") fill(c, C.dangerSoft, null);
        stroke(c, type === "Danger" ? C.danger : type === "Secondary" ? C.border : C.brand, type === "Danger" ? "danger" : type === "Secondary" ? "border" : "brand");
        if (state === "pressed") c.y += 1;
        if (state === "disabled") c.opacity = 0.48;
        const labelColor = type === "Secondary" ? C.text : type === "Danger" ? C.danger : C.surface;
        const token = type === "Secondary" ? "text" : type === "Danger" ? "danger" : "inverse";
        if (state === "loading") c.appendChild(iconDot("Spinner", labelColor, token));
        c.appendChild(text(state === "loading" ? "กำลังโหลด" : type, 14, true, labelColor, token));
      }, null, "buttonHeight");
    }
    
    function makeProductCard(layout, state) {
      const isFeed = layout === "Feed";
      return component(variantName({ Layout: layout, State: state }), isFeed ? 390 : 184, isFeed ? 420 : 292, (c) => {
        setupAuto(c, "VERTICAL", 12, 14, "space3", "cardPadding");
        c.cornerRadius = isFeed ? 28 : 22;
        bindRadius(c, isFeed ? "radiusXl" : "cardRadius");
        c.effects = shadow(isFeed ? 18 : 14, isFeed ? 42 : 32, 0.11);
        if (state === "loading") c.opacity = 0.56;
        const imageRow = figma.createFrame();
        imageRow.name = "Images";
        setupAuto(imageRow, "HORIZONTAL", 10, 0, "space2", null);
        imageRow.fills = [];
        imageRow.appendChild(rect("Product image", isFeed ? 174 : 156, isFeed ? 184 : 156, 18, C.brandSoft, "brandSoft", "radiusMd"));
        if (isFeed) imageRow.appendChild(rect("Wanted preview", 174, 184, 18, C.surfaceSubtle, "surfaceSubtle", "radiusMd"));
        c.appendChild(imageRow);
        const titleRow = figma.createFrame();
        titleRow.name = "Title row";
        setupAuto(titleRow, "HORIZONTAL", 8, 0, "space2", null);
        titleRow.fills = [];
        titleRow.appendChild(text("หนังสือ Design Systems", isFeed ? 17 : 14, true, C.text, "text"));
        titleRow.appendChild(statusChip(state === "owner" ? "Owner" : "เปิดรับ Xwap", C.brandSoft, C.brand, "brandSoft", "brand"));
        c.appendChild(titleRow);
        c.appendChild(text("@มะลิ Swap Studio · Bangkok", 12, false, C.muted, "muted"));
        const tags = figma.createFrame();
        tags.name = "Tags";
        setupAuto(tags, "HORIZONTAL", 6, 0, null, null);
        tags.fills = [];
        tags.appendChild(statusChip("#หนังสือ", C.surfaceSubtle, C.muted, "surfaceSubtle", "muted"));
        tags.appendChild(statusChip("#เครดิต", C.surfaceSubtle, C.muted, "surfaceSubtle", "muted"));
        c.appendChild(tags);
        const actions = figma.createFrame();
        actions.name = "Actions";
        setupAuto(actions, "HORIZONTAL", 8, 0, "space2", null);
        actions.fills = [];
        actions.appendChild(statusChip(state === "saved" ? "Saved" : "Save", state === "saved" ? C.brandSoft : C.surfaceSubtle, state === "saved" ? C.brand : C.muted, state === "saved" ? "brandSoft" : "surfaceSubtle", state === "saved" ? "brand" : "muted"));
        actions.appendChild(statusChip("Xwap", C.brand, C.surface, "brand", "inverse"));
        c.appendChild(actions);
      });
    }
    
    function makeBottomNav(tab, state) {
      return component(variantName({ Tab: tab, State: state }), 76, 64, (c) => {
        setupAuto(c, "VERTICAL", 4, 8, "space1", "space2");
        c.cornerRadius = 18;
        bindRadius(c, "radiusMd");
        c.effects = [];
        fill(c, state === "active" ? C.brandSoft : C.surface, state === "active" ? "brandSoft" : "surface");
        stroke(c, state === "active" ? C.brandSoft : C.border, state === "active" ? "brandSoft" : "border");
        c.appendChild(iconDot("Icon", state === "active" ? C.brand : C.muted, state === "active" ? "brand" : "muted"));
        const label = text(tab, 10, true, state === "active" ? C.brand : C.muted, state === "active" ? "brand" : "muted");
        c.appendChild(label);
        if (state === "badge") {
          const b = rect("Badge", 16, 16, 999, C.danger, "danger");
          b.x = 48;
          b.y = 4;
          c.appendChild(b);
        }
      });
    }
    
    function makeInput(kind, state) {
      return component(variantName({ Type: kind, State: state }), 280, 64, (c) => {
        setupAuto(c, "HORIZONTAL", 10, 14, "space2", "pagePadding");
        c.cornerRadius = 16;
        bindRadius(c, "buttonRadius");
        c.effects = [];
        fill(c, state === "disabled" ? C.surfaceSubtle : C.surface, state === "disabled" ? "surfaceSubtle" : "surface");
        stroke(c, state === "focus" ? C.brand : state === "error" ? C.danger : C.border, state === "focus" ? "brand" : state === "error" ? "danger" : "border");
        if (kind === "search") c.appendChild(iconDot("Search icon", C.muted, "muted"));
        c.appendChild(text(kind === "password" ? "••••••••" : kind === "search" ? "ค้นหา" : "ข้อความ", 14, false, state === "disabled" ? C.muted : C.text, state === "disabled" ? "muted" : "text"));
        if (state === "disabled") c.opacity = 0.55;
      });
    }
    
    function makeSheet(type, state) {
      return component(variantName({ Type: type, State: state }), 390, 360, (c) => {
        setupAuto(c, "VERTICAL", 14, 18, "space3", "space4");
        c.cornerRadius = 30;
        bindRadius(c, "sheetRadius");
        c.effects = shadow(-18, 46, 0.18, [16, 24, 40]);
        if (state === "loading") c.opacity = 0.7;
        c.appendChild(rect("Handle", 48, 5, 999, rgb("#cbd5e1"), null, "radiusPill"));
        c.appendChild(text(`${type} Sheet`, 20, true, C.text, "text"));
        c.appendChild(rect("Field / row", 350, 46, 16, C.surfaceSubtle, "surfaceSubtle", "radiusMd"));
        c.appendChild(rect("Content area", 350, 92, 18, state === "error" ? C.dangerSoft : state === "success" ? C.successSoft : C.surfaceSubtle, state === "success" ? null : "surfaceSubtle", "radiusMd"));
        c.appendChild(statusChip(state === "success" ? "สำเร็จ" : state === "error" ? "เกิดข้อผิดพลาด" : state === "loading" ? "กำลังโหลด" : "ยืนยัน", state === "error" ? C.danger : C.brand, C.surface, state === "error" ? "danger" : "brand", "inverse"));
      });
    }
    
    function makeChip(type) {
      return component(variantName({ Type: type }), 140, 38, (c) => {
        setupAuto(c, "HORIZONTAL", 6, 12, null, "space3");
        c.cornerRadius = 999;
        bindRadius(c, "radiusPill");
        if (type === "selected") fill(c, C.brandSoft, "brandSoft");
        else if (type === "level") fill(c, C.successSoft, null);
        else fill(c, C.surfaceSubtle, "surfaceSubtle");
        stroke(c, type === "selected" ? C.brand : C.border, type === "selected" ? "brand" : "border");
        c.appendChild(text(type === "level" ? "Level 2" : type === "selected" ? "Selected" : "Default", 12, true, type === "selected" ? C.brand : type === "level" ? C.success : C.muted, type === "selected" ? "brand" : type === "level" ? "success" : "muted"));
      });
    }
    
    function makeIcon(name) {
      return component(`Name=${name}`, 56, 56, (c) => {
        setupAuto(c, "VERTICAL", 0, 16, null, "space4");
        c.cornerRadius = 16;
        bindRadius(c, "radiusMd");
        c.effects = [];
        c.appendChild(iconDot(`Icon / ${name}`, C.text, "text"));
      });
    }
    
    let page = figma.root.children.find((p) => p.name === "02 Components - Real Variants");
    if (!page) {
      page = figma.createPage();
      page.name = "02 Components - Real Variants";
    }
    await figma.setCurrentPageAsync(page);
    page.children.forEach((n) => n.remove());
    
    const title = figma.createFrame();
    title.name = "QXwap Component Library - Real Variants";
    setupAuto(title, "VERTICAL", 10, 40);
    title.x = 80;
    title.y = 80;
    fill(title, C.page, "page");
    page.appendChild(title);
    createdNodeIds.push(title.id);
    title.appendChild(text("QXwap Component Library - Real Variants", 32, true, C.text, "text"));
    title.appendChild(text("Generated by docs/figma-mcp-real-components-script.js. Components use Auto Layout and bind variables when matching Figma Variables exist.", 14, false, C.muted, "muted"));
    
    let y = 240;
    function addSet(setName, comps) {
      const heading = text(setName, 24, true, C.text, "text");
      heading.x = 80;
      heading.y = y;
      page.appendChild(heading);
      createdNodeIds.push(heading.id);
      y += 50;
      const set = makeVariantSet(page, setName, comps, 80, y);
      y += set.height + 90;
      return set;
    }
    
    addSet("QXwap/Button", ["Primary", "Xwap", "Secondary", "Danger"].flatMap((type) => ["default", "pressed", "disabled", "loading"].map((state) => makeButton(type, state))));
    addSet("QXwap/Product Card", ["Feed", "Shop"].flatMap((layout) => ["default", "saved", "owner", "loading"].map((state) => makeProductCard(layout, state))));
    addSet("QXwap/Bottom Nav Item", ["Feed", "Shop", "Add", "Inbox", "Profile"].flatMap((tab) => ["default", "active", "badge"].map((state) => makeBottomNav(tab, state))));
    addSet("QXwap/Input", ["text", "search", "password"].flatMap((type) => ["default", "focus", "error", "disabled"].map((state) => makeInput(type, state))));
    addSet("QXwap/Sheet", ["Offer", "Filter", "Auth", "Search"].flatMap((type) => ["open", "loading", "error", "success"].map((state) => makeSheet(type, state))));
    addSet("QXwap/Chip", ["default", "selected", "level"].map(makeChip));
    addSet("QXwap/Icon", ["Search","Filter","Bell","Home","Shop","Add","Inbox","Profile","Back","Close","More","Xwap","Offer","Swap","Buy","Sell","Both","Wanted","Package","Save","Saved","Share","View","Image","Camera","Wallet","Credit","CreditReward","Cash","Deposit","Transaction","User","Avatar","Follow","Following","Level","Registered","Restricted","Verified","FastResponder","Featured","Settings","Edit","Delete","Chat","Send","Comment","Notification","Unread","Shipment","Proof","Pickup","Delivery","Location","Nearby","Distance","Success","Error","Warning","Info","Loading","Empty","Lock","Unlock","Calendar","Sort","Category","Condition","Price","Tag","List","Grid","External"].map(makeIcon));
    
    figma.viewport.scrollAndZoomIntoView(page.children);
    
    return {
      createdNodeIds,
      mutatedNodeIds,
      createdSetIds,
      componentSetCount: createdSetIds.length,
      variableBindingAvailable: Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, Boolean(v)])),
      floatVariableBindingAvailable: Object.fromEntries(Object.entries(floatVars).map(([k, v]) => [k, Boolean(v)])),
      pageName: page.name,
      note: "Created P0/P1/P2 QXwap real components with variants, Auto Layout, color variable binding, and key spacing/radius/height variable binding."
    };
  })();
  log('2', 'Done - ' + (result2 && result2.note ? result2.note : 'ok'));

  // ============================================================
  // Step 3 — Screens from Components
  // ============================================================
  log('3', 'Starting: Step 3 — Screens from Components');
  var result3 = await (async function() {
    const createdNodeIds = [];
    const mutatedNodeIds = [];
    const archivedNodeIds = [];
    const warnings = [];
    
    const FONT = { family: "Inter", style: "Regular" };
    const FONT_BOLD = { family: "Inter", style: "Bold" };
    
    try {
      await figma.loadFontAsync(FONT);
      await figma.loadFontAsync(FONT_BOLD);
    } catch {
      const fonts = await figma.listAvailableFontsAsync();
      const fallback = fonts.find((f) => f.fontName.family === "Inter")?.fontName || fonts[0].fontName;
      FONT.family = fallback.family;
      FONT.style = fallback.style;
      FONT_BOLD.family = fallback.family;
      FONT_BOLD.style = fallback.style;
      await figma.loadFontAsync(FONT);
      await figma.loadFontAsync(FONT_BOLD);
    }
    
    function rgb(hex) {
      const clean = hex.replace("#", "");
      const n = parseInt(clean, 16);
      return {
        r: ((n >> 16) & 255) / 255,
        g: ((n >> 8) & 255) / 255,
        b: (n & 255) / 255
      };
    }
    
    const C = {
      brand: rgb("#176bff"),
      brandSoft: rgb("#eaf3ff"),
      page: rgb("#fbfcff"),
      surface: rgb("#ffffff"),
      surfaceSubtle: rgb("#f3f6ff"),
      border: rgb("#e8ebf3"),
      text: rgb("#101322"),
      muted: rgb("#68748a"),
      danger: rgb("#ef4444"),
      successSoft: rgb("#ecfdf5")
    };
    
    function paint(color) {
      return [{ type: "SOLID", color }];
    }
    
    function shadow(y = 14, radius = 32, alpha = 0.09, color = [35, 50, 90]) {
      const [r, g, b] = color;
      return [{
        type: "DROP_SHADOW",
        color: { r: r / 255, g: g / 255, b: b / 255, a: alpha },
        offset: { x: 0, y },
        radius,
        spread: 0,
        visible: true,
        blendMode: "NORMAL"
      }];
    }
    
    function setupAuto(node, direction = "VERTICAL", gap = 12, pad = 0) {
      node.layoutMode = direction;
      node.itemSpacing = gap;
      node.paddingTop = pad;
      node.paddingRight = pad;
      node.paddingBottom = pad;
      node.paddingLeft = pad;
      node.primaryAxisSizingMode = "AUTO";
      node.counterAxisSizingMode = "AUTO";
      node.counterAxisAlignItems = direction === "VERTICAL" ? "MIN" : "CENTER";
    }
    
    function text(label, size = 14, bold = false, color = C.text) {
      const t = figma.createText();
      t.characters = label;
      t.fontName = bold ? FONT_BOLD : FONT;
      t.fontSize = size;
      t.lineHeight = { unit: "PERCENT", value: 125 };
      t.fills = paint(color);
      return t;
    }
    
    function rect(name, w, h, radius, color) {
      const r = figma.createRectangle();
      r.name = name;
      r.resize(w, h);
      r.cornerRadius = radius;
      r.fills = paint(color);
      r.strokes = paint(C.border);
      r.strokeWeight = 1;
      return r;
    }
    
    async function allComponents() {
      const found = [];
      for (const page of figma.root.children) {
        await figma.setCurrentPageAsync(page);
        found.push(...page.findAll((node) => node.type === "COMPONENT"));
      }
      return found;
    }
    
    const components = await allComponents();
    
    function componentByVariant(setName, props) {
      const expected = Object.entries(props).map(([k, v]) => `${k}=${v}`).join(", ");
      const match = components.find((c) => {
        const parentName = c.parent?.name || "";
        return parentName === setName && c.name === expected;
      });
      if (!match) {
        warnings.push(`Missing component: ${setName} / ${expected}`);
        return null;
      }
      return match.createInstance();
    }
    
    function fallbackCard(label, w = 360, h = 80) {
      const f = figma.createFrame();
      f.name = `Fallback / ${label}`;
      f.resize(w, h);
      setupAuto(f, "VERTICAL", 8, 14);
      f.cornerRadius = 18;
      f.fills = paint(C.surface);
      f.strokes = paint(C.border);
      f.strokeWeight = 1;
      f.appendChild(text(label, 14, true));
      f.appendChild(text("Missing component instance fallback", 11, false, C.muted));
      return f;
    }
    
    function inst(setName, props, fallbackLabel, w = 180, h = 48) {
      const node = componentByVariant(setName, props);
      if (node) return node;
      return fallbackCard(fallbackLabel || `${setName}`, w, h);
    }
    
    function makePhone(screenName) {
      const phone = figma.createFrame();
      phone.name = `Screen / ${screenName}`;
      phone.resize(390, 844);
      setupAuto(phone, "VERTICAL", 14, 18);
      phone.counterAxisAlignItems = "CENTER";
      phone.fills = paint(C.page);
      phone.cornerRadius = 32;
      phone.strokes = paint(C.border);
      phone.strokeWeight = 1;
      phone.effects = shadow(18, 42, 0.12);
      createdNodeIds.push(phone.id);
      return phone;
    }
    
    function topbar(title = "QXwap", showSearch = true) {
      const bar = figma.createFrame();
      bar.name = "Topbar";
      bar.resize(354, 56);
      setupAuto(bar, "HORIZONTAL", 10, 0);
      bar.fills = [];
      const brand = text(title, 24, true, C.text);
      bar.appendChild(brand);
      if (showSearch) {
        const search = inst("QXwap/Icon", { Name: "Search" }, "Icon/Search", 48, 48);
        bar.appendChild(search);
        const notification = inst("QXwap/Icon", { Name: "Notification" }, "Icon/Notification", 48, 48);
        bar.appendChild(notification);
      }
      return bar;
    }
    
    function nav(activeTab = "Feed", badgeTab = "") {
      const frame = figma.createFrame();
      frame.name = "Bottom Nav";
      frame.resize(354, 76);
      setupAuto(frame, "HORIZONTAL", 0, 8);
      frame.counterAxisAlignItems = "CENTER";
      frame.fills = paint(C.surface);
      frame.strokes = paint(C.border);
      frame.strokeWeight = 1;
      frame.cornerRadius = 28;
      frame.effects = shadow(-10, 28, 0.10, [16, 24, 40]);
      for (const tab of ["Feed", "Shop", "Add", "Inbox", "Profile"]) {
        const state = tab === activeTab ? "active" : tab === badgeTab ? "badge" : "default";
        const item = inst("QXwap/Bottom Nav Item", { Tab: tab, State: state }, `Nav ${tab}`, 76, 64);
        frame.appendChild(item);
      }
      return frame;
    }
    
    function spacer(h = 1) {
      const s = figma.createFrame();
      s.name = "Spacer";
      s.resize(354, h);
      s.fills = [];
      return s;
    }
    
    function sectionTitle(label) {
      const t = text(label, 18, true, C.text);
      t.name = `Section / ${label}`;
      return t;
    }
    
    function addBottom(phone, activeTab, badgeTab = "") {
      phone.appendChild(spacer(1));
      phone.appendChild(nav(activeTab, badgeTab));
    }
    
    function buildFeed() {
      const p = makePhone("Feed");
      p.appendChild(topbar("QXwap"));
      p.appendChild(sectionTitle("AI Feed"));
      p.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Following chip", 140, 38));
      p.appendChild(inst("QXwap/Product Card", { Layout: "Feed", State: "default" }, "Feed card", 390, 420));
      p.appendChild(inst("QXwap/Product Card", { Layout: "Feed", State: "saved" }, "Feed saved card", 390, 420));
      addBottom(p, "Feed", "Inbox");
      return p;
    }
    
    function buildShop() {
      const p = makePhone("Shop");
      p.appendChild(topbar("Shop"));
      p.appendChild(inst("QXwap/Input", { Type: "search", State: "default" }, "Search input", 280, 64));
      const filters = figma.createFrame();
      filters.name = "Filter chips";
      setupAuto(filters, "HORIZONTAL", 8, 0);
      filters.fills = [];
      filters.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Selected chip", 140, 38));
      filters.appendChild(inst("QXwap/Chip", { Type: "default" }, "Default chip", 140, 38));
      p.appendChild(filters);
      const grid = figma.createFrame();
      grid.name = "Shop grid";
      setupAuto(grid, "HORIZONTAL", 12, 0);
      grid.fills = [];
      grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "default" }, "Shop card", 184, 292));
      grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "saved" }, "Shop saved card", 184, 292));
      p.appendChild(grid);
      addBottom(p, "Shop");
      return p;
    }
    
    function buildDetail() {
      const p = makePhone("Detail");
      p.appendChild(topbar("Detail", false));
      p.appendChild(rect("Product hero image", 354, 300, 28, C.brandSoft));
      p.appendChild(fallbackCard("หนังสือ Design Systems · เปิดรับ Xwap", 354, 96));
      p.appendChild(inst("QXwap/Button", { Type: "Xwap", State: "default" }, "Xwap button", 176, 48));
      addBottom(p, "Shop");
      return p;
    }
    
    function buildProfile() {
      const p = makePhone("Profile");
      p.appendChild(topbar("Profile", false));
      p.appendChild(fallbackCard("Profile header · QServeep User", 354, 120));
      const tabs = figma.createFrame();
      tabs.name = "Profile tabs";
      setupAuto(tabs, "HORIZONTAL", 8, 0);
      tabs.fills = [];
      tabs.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Listings", 140, 38));
      tabs.appendChild(inst("QXwap/Chip", { Type: "default" }, "Saved", 140, 38));
      p.appendChild(tabs);
      const grid = figma.createFrame();
      grid.name = "Profile product grid";
      setupAuto(grid, "HORIZONTAL", 12, 0);
      grid.fills = [];
      grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "owner" }, "Owner card", 184, 292));
      grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "default" }, "Shop card", 184, 292));
      p.appendChild(grid);
      addBottom(p, "Profile");
      return p;
    }
    
    function buildAdd() {
      const p = makePhone("Add Product");
      p.appendChild(topbar("Add", false));
      p.appendChild(sectionTitle("เลือกประเภทดีล"));
      const chips = figma.createFrame();
      chips.name = "Deal type chips";
      setupAuto(chips, "HORIZONTAL", 8, 0);
      chips.fills = [];
      chips.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Swap", 140, 38));
      chips.appendChild(inst("QXwap/Chip", { Type: "default" }, "Sell", 140, 38));
      p.appendChild(chips);
      p.appendChild(inst("QXwap/Input", { Type: "text", State: "default" }, "Title input", 280, 64));
      p.appendChild(rect("Upload image area", 354, 170, 24, C.surfaceSubtle));
      p.appendChild(inst("QXwap/Button", { Type: "Primary", State: "default" }, "Publish", 176, 48));
      addBottom(p, "Add");
      return p;
    }
    
    function buildOffer() {
      const p = makePhone("Offer Sheet");
      p.appendChild(topbar("Offer", false));
      p.appendChild(inst("QXwap/Sheet", { Type: "Offer", State: "open" }, "Offer sheet", 390, 360));
      p.appendChild(inst("QXwap/Sheet", { Type: "Offer", State: "success" }, "Offer success", 390, 360));
      addBottom(p, "Inbox");
      return p;
    }
    
    function buildInbox() {
      const p = makePhone("Inbox");
      p.appendChild(topbar("Inbox", false));
      const tabs = figma.createFrame();
      tabs.name = "Inbox tabs";
      setupAuto(tabs, "HORIZONTAL", 8, 0);
      tabs.fills = [];
      tabs.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Xwap", 140, 38));
      tabs.appendChild(inst("QXwap/Chip", { Type: "default" }, "Notifications", 140, 38));
      p.appendChild(tabs);
      p.appendChild(fallbackCard("Offer card · สินค้า 2 ชิ้น + 120 บาท", 354, 110));
      p.appendChild(fallbackCard("Notification card · มีคนบันทึกสินค้า", 354, 96));
      addBottom(p, "Inbox", "Inbox");
      return p;
    }
    
    function buildWalletShipment() {
      const p = makePhone("Wallet / Shipment");
      p.appendChild(topbar("Wallet", false));
      const wallet = figma.createFrame();
      wallet.name = "Wallet card";
      wallet.resize(354, 160);
      setupAuto(wallet, "VERTICAL", 10, 20);
      wallet.cornerRadius = 28;
      wallet.fills = paint(C.brand);
      wallet.effects = shadow(18, 36, 0.24, [47, 123, 255]);
      wallet.appendChild(text("QXwap Credit", 14, true, C.surface));
      wallet.appendChild(text("1,240", 34, true, C.surface));
      wallet.appendChild(text("แค่เริ่มสะสมเครดิต", 13, false, C.surface));
      p.appendChild(wallet);
      p.appendChild(fallbackCard("Shipment status · รอเข้ารับสินค้า", 354, 120));
      addBottom(p, "Profile");
      return p;
    }
    
    // Archive raw HTML captures by moving non-essential pages to Archive.
    // This is conservative: it never archives component/script pages or the new screen page.
    let archive = figma.root.children.find((p) => p.name === "99 Archive - HTML Captures");
    if (!archive) {
      archive = figma.createPage();
      archive.name = "99 Archive - HTML Captures";
    }
    
    const protectedPageNames = new Set([
      "02 Components - Real Variants",
      "02 Components - MCP Generated",
      "04 Screens - Component Instances",
      "99 Archive - HTML Captures"
    ]);
    
    for (const page of [...figma.root.children]) {
      if (protectedPageNames.has(page.name)) continue;
      const shouldArchive =
        /capture|final package|addendum|mobile strip|token|handoff|prototype|html/i.test(page.name) ||
        page.children.some((n) => /html|capture|figma final package|addendum/i.test(n.name));
      if (!shouldArchive) continue;
      await figma.setCurrentPageAsync(page);
      for (const node of [...page.children]) {
        node.name = `Archived / ${page.name} / ${node.name}`;
        archive.appendChild(node);
        archivedNodeIds.push(node.id);
      }
    }
    
    let screensPage = figma.root.children.find((p) => p.name === "04 Screens - Component Instances");
    if (!screensPage) {
      screensPage = figma.createPage();
      screensPage.name = "04 Screens - Component Instances";
    }
    await figma.setCurrentPageAsync(screensPage);
    screensPage.children.forEach((n) => n.remove());
    
    const screens = [
      buildFeed(),
      buildShop(),
      buildDetail(),
      buildProfile(),
      buildAdd(),
      buildOffer(),
      buildInbox(),
      buildWalletShipment()
    ];
    
    screens.forEach((screen, index) => {
      screen.x = 80 + (index % 4) * 430;
      screen.y = 120 + Math.floor(index / 4) * 920;
      screensPage.appendChild(screen);
    });
    
    const label = text("QXwap 8 Screens - Built from Real Components", 32, true, C.text);
    label.x = 80;
    label.y = 48;
    screensPage.appendChild(label);
    createdNodeIds.push(label.id);
    
    figma.viewport.scrollAndZoomIntoView(screens);
    
    return {
      createdNodeIds,
      mutatedNodeIds,
      archivedNodeIds,
      screenCount: screens.length,
      pageName: screensPage.name,
      archivePageName: archive.name,
      warnings,
      note: "Rebuilt 8 QXwap screens from real component instances with Auto Layout. Check warnings for missing component variants/fallbacks."
    };
  })();
  log('3', 'Done - ' + (result3 && result3.note ? result3.note : 'ok'));

  // ============================================================
  // Step 4 — Prototype Wiring
  // ============================================================
  log('4', 'Starting: Step 4 — Prototype Wiring');
  var result4 = await (async function() {
    const createdNodeIds = [];
    const mutatedNodeIds = [];
    const warnings = [];
    
    const FONT = { family: "Inter", style: "Regular" };
    const FONT_BOLD = { family: "Inter", style: "Bold" };
    
    try {
      await figma.loadFontAsync(FONT);
      await figma.loadFontAsync(FONT_BOLD);
    } catch {
      const fonts = await figma.listAvailableFontsAsync();
      const fallback = fonts.find((f) => f.fontName.family === "Inter")?.fontName || fonts[0].fontName;
      FONT.family = fallback.family;
      FONT.style = fallback.style;
      FONT_BOLD.family = fallback.family;
      FONT_BOLD.style = fallback.style;
      await figma.loadFontAsync(FONT);
      await figma.loadFontAsync(FONT_BOLD);
    }
    
    function rgb(hex) {
      const clean = hex.replace("#", "");
      const n = parseInt(clean, 16);
      return {
        r: ((n >> 16) & 255) / 255,
        g: ((n >> 8) & 255) / 255,
        b: (n & 255) / 255
      };
    }
    
    const C = {
      brand: rgb("#176bff"),
      brandSoft: rgb("#eaf3ff"),
      surface: rgb("#ffffff"),
      page: rgb("#fbfcff"),
      text: rgb("#101322"),
      muted: rgb("#68748a"),
      border: rgb("#e8ebf3"),
      danger: rgb("#ef4444"),
      dangerSoft: rgb("#fff1f2"),
      success: rgb("#17a765"),
      successSoft: rgb("#ecfdf5"),
      scrim: { r: 15 / 255, g: 18 / 255, b: 34 / 255 }
    };
    
    function paint(color, alpha = 1) {
      return [{ type: "SOLID", color, opacity: alpha }];
    }
    
    function setupAuto(node, direction = "VERTICAL", gap = 12, pad = 0) {
      node.layoutMode = direction;
      node.itemSpacing = gap;
      node.paddingTop = pad;
      node.paddingRight = pad;
      node.paddingBottom = pad;
      node.paddingLeft = pad;
      node.primaryAxisSizingMode = "AUTO";
      node.counterAxisSizingMode = "AUTO";
      node.counterAxisAlignItems = direction === "VERTICAL" ? "MIN" : "CENTER";
    }
    
    function text(label, size = 14, bold = false, color = C.text) {
      const t = figma.createText();
      t.characters = label;
      t.fontName = bold ? FONT_BOLD : FONT;
      t.fontSize = size;
      t.lineHeight = { unit: "PERCENT", value: 125 };
      t.fills = paint(color);
      return t;
    }
    
    function button(label, type = "primary") {
      const b = figma.createFrame();
      b.name = `Prototype Button / ${label}`;
      setupAuto(b, "HORIZONTAL", 8, 16);
      b.cornerRadius = 999;
      b.fills = paint(type === "danger" ? C.danger : type === "ghost" ? C.brandSoft : C.brand);
      b.strokes = paint(type === "ghost" ? C.brand : type === "danger" ? C.danger : C.brand);
      b.strokeWeight = 1;
      b.appendChild(text(label, 14, true, type === "ghost" ? C.brand : C.surface));
      return b;
    }
    
    function card(label, body = "") {
      const f = figma.createFrame();
      f.name = `Prototype Card / ${label}`;
      f.resize(354, 110);
      setupAuto(f, "VERTICAL", 8, 16);
      f.cornerRadius = 22;
      f.fills = paint(C.surface);
      f.strokes = paint(C.border);
      f.strokeWeight = 1;
      f.appendChild(text(label, 18, true, C.text));
      if (body) f.appendChild(text(body, 13, false, C.muted));
      return f;
    }
    
    function hotspot(name, x, y, w, h) {
      const hNode = figma.createFrame();
      hNode.name = `Prototype Hotspot / ${name}`;
      hNode.resize(w, h);
      hNode.x = x;
      hNode.y = y;
      hNode.fills = paint(C.brand, 0.001);
      hNode.strokes = [];
      createdNodeIds.push(hNode.id);
      return hNode;
    }
    
    async function clearPrototypeHelpers(page) {
      for (const node of [...page.children]) {
        if (
          node.name.startsWith("Prototype /") ||
          node.name.startsWith("Flow Label /") ||
          node.name.startsWith("Prototype Hotspot /")
        ) {
          node.remove();
        }
      }
      for (const node of page.findAll((n) => "reactions" in n)) {
        try {
          await node.setReactionsAsync([]);
          mutatedNodeIds.push(node.id);
        } catch {}
      }
    }
    
    function screen(page, name) {
      const exact = page.children.find((n) => n.name === `Screen / ${name}`);
      if (exact) return exact;
      const fuzzy = page.children.find((n) => n.name.toLowerCase().includes(name.toLowerCase()));
      if (!fuzzy) warnings.push(`Missing screen: ${name}`);
      return fuzzy || null;
    }
    
    function transition() {
      return { type: "SMART_ANIMATE", easing: { type: "EASE_OUT" }, duration: 0.22 };
    }
    
    async function setNavigate(source, destination) {
      if (!source || !destination) return;
      await source.setReactionsAsync([{
        trigger: { type: "ON_CLICK" },
        actions: [{
          type: "NODE",
          destinationId: destination.id,
          navigation: "NAVIGATE",
          transition: transition(),
          resetScrollPosition: true
        }]
      }]);
      mutatedNodeIds.push(source.id);
    }
    
    async function setOverlay(source, destination) {
      if (!source || !destination) return;
      await source.setReactionsAsync([{
        trigger: { type: "ON_CLICK" },
        actions: [{
          type: "NODE",
          destinationId: destination.id,
          navigation: "OVERLAY",
          transition: {
            type: "MOVE_IN",
            direction: "BOTTOM",
            matchLayers: false,
            duration: 0.22,
            easing: { type: "EASE_OUT" }
          },
          resetScrollPosition: false,
          overlayRelativePosition: { x: 0, y: 0 }
        }]
      }]);
      mutatedNodeIds.push(source.id);
    }
    
    function label(page, label, x, y) {
      const l = figma.createFrame();
      l.name = `Flow Label / ${label}`;
      setupAuto(l, "VERTICAL", 4, 10);
      l.x = x;
      l.y = y;
      l.cornerRadius = 16;
      l.fills = paint(C.brandSoft);
      l.strokes = paint(C.brand);
      l.strokeWeight = 1;
      l.appendChild(text(label, 12, true, C.brand));
      page.appendChild(l);
      createdNodeIds.push(l.id);
      return l;
    }
    
    function modal(name, title, body, tone = "default") {
      const m = figma.createFrame();
      m.name = `Prototype / ${name}`;
      m.resize(390, 844);
      m.fills = paint(C.scrim, 0.44);
      m.clipsContent = false;
      const sheet = figma.createFrame();
      sheet.name = "Modal Sheet";
      sheet.resize(354, 300);
      sheet.x = 18;
      sheet.y = 496;
      setupAuto(sheet, "VERTICAL", 14, 20);
      sheet.cornerRadius = 28;
      sheet.fills = paint(C.surface);
      sheet.strokes = paint(C.border);
      sheet.strokeWeight = 1;
      sheet.effects = [{
        type: "DROP_SHADOW",
        color: { r: 16 / 255, g: 24 / 255, b: 40 / 255, a: 0.18 },
        offset: { x: 0, y: -18 },
        radius: 46,
        spread: 0,
        visible: true,
        blendMode: "NORMAL"
      }];
      sheet.appendChild(text(title, 22, true, tone === "danger" ? C.danger : C.text));
      sheet.appendChild(text(body, 14, false, C.muted));
      m.appendChild(sheet);
      createdNodeIds.push(m.id, sheet.id);
      return { frame: m, sheet };
    }
    
    const page = figma.root.children.find((p) => p.name === "04 Screens - Component Instances");
    if (!page) {
      throw new Error("Missing page '04 Screens - Component Instances'. Run Step 4 first.");
    }
    await figma.setCurrentPageAsync(page);
    await clearPrototypeHelpers(page);
    
    const feed = screen(page, "Feed");
    const shop = screen(page, "Shop");
    const detail = screen(page, "Detail");
    const profile = screen(page, "Profile");
    const addProduct = screen(page, "Add Product");
    const offer = screen(page, "Offer Sheet");
    const inbox = screen(page, "Inbox");
    const shipment = screen(page, "Wallet / Shipment");
    
    if (feed) {
      warnings.push("Figma Plugin API exposes prototypeStartNode as readonly in this runtime; start node may need to be set manually to Screen / Feed after wiring.");
    }
    
    // Create modal/flow helper frames near existing screens.
    const loginModal = modal("Guest Login Modal", "เข้าสู่ระบบเพื่อใช้งานคิวสวิฟต์", "เข้าสู่ระบบแล้วระบบจะพากลับไปทำ Xwap ต่อทันที");
    loginModal.frame.x = (feed?.x || 80) + 40;
    loginModal.frame.y = (feed?.y || 120) + 40;
    page.appendChild(loginModal.frame);
    const loginButton = button("เข้าสู่ระบบ", "primary");
    loginModal.sheet.appendChild(loginButton);
    
    const restrictedModal = modal("Restricted User Modal", "บัญชีนี้ถูกจำกัดสิทธิ์", "บัญชีนี้ดูสินค้าได้ แต่ไม่สามารถส่ง Xwap ได้");
    restrictedModal.frame.x = (detail?.x || 80) + 40;
    restrictedModal.frame.y = (detail?.y || 120) + 40;
    page.appendChild(restrictedModal.frame);
    restrictedModal.sheet.appendChild(button("รับทราบ", "danger"));
    
    const searchFilterOverlay = modal("Search Filter Overlay", "ค้นหาและตัวกรอง", "ค้นหาสินค้าหรือเลือกตัวกรอง แล้วไปยังหน้ารายละเอียดสินค้า");
    searchFilterOverlay.frame.x = (shop?.x || 80) + 40;
    searchFilterOverlay.frame.y = (shop?.y || 120) + 40;
    page.appendChild(searchFilterOverlay.frame);
    const applyFilter = button("ใช้ตัวกรอง", "primary");
    searchFilterOverlay.sheet.appendChild(applyFilter);
    
    const addReview = figma.createFrame();
    addReview.name = "Prototype / Add Product Review";
    addReview.resize(390, 844);
    setupAuto(addReview, "VERTICAL", 16, 18);
    addReview.fills = paint(C.page);
    addReview.cornerRadius = 32;
    addReview.x = (addProduct?.x || 80) + 430;
    addReview.y = addProduct?.y || 120;
    addReview.appendChild(text("ตรวจสอบก่อนเผยแพร่", 24, true, C.text));
    addReview.appendChild(card("รูปสินค้า + รายละเอียด", "Title, category, condition, price, wanted tags"));
    const publish = button("เผยแพร่สินค้า", "primary");
    addReview.appendChild(publish);
    page.appendChild(addReview);
    createdNodeIds.push(addReview.id);
    
    const addSuccess = figma.createFrame();
    addSuccess.name = "Prototype / Add Product Success";
    addSuccess.resize(390, 844);
    setupAuto(addSuccess, "VERTICAL", 16, 18);
    addSuccess.fills = paint(C.page);
    addSuccess.cornerRadius = 32;
    addSuccess.x = addReview.x + 430;
    addSuccess.y = addReview.y;
    addSuccess.appendChild(text("เผยแพร่สำเร็จ", 24, true, C.text));
    addSuccess.appendChild(card("สินค้าใหม่พร้อมแสดง", "กลับไปดูใน Feed / Shop / Profile"));
    const goFeed = button("กลับไป Feed", "primary");
    addSuccess.appendChild(goFeed);
    page.appendChild(addSuccess);
    createdNodeIds.push(addSuccess.id);
    
    const acceptModal = modal("Accept Offer Modal", "รับข้อเสนอ Xwap", "ยืนยันรับข้อเสนอ แล้วไปจัดการนัดรับ/ขนส่ง");
    acceptModal.frame.x = (inbox?.x || 80) + 40;
    acceptModal.frame.y = (inbox?.y || 120) + 40;
    page.appendChild(acceptModal.frame);
    const acceptButton = button("ยืนยันรับข้อเสนอ", "primary");
    acceptModal.sheet.appendChild(acceptButton);
    
    // Hotspots on screens.
    if (feed && detail) {
      const openDetail = hotspot("Feed card to Detail", 18, 150, 354, 430);
      feed.appendChild(openDetail);
      await setNavigate(openDetail, detail);
      label(page, "Flow 2: Feed -> Detail", feed.x, feed.y - 38);
    }
    
    if (feed && loginModal.frame) {
      const guestXwap = hotspot("Guest Xwap requires login", 60, 590, 270, 70);
      feed.appendChild(guestXwap);
      await setOverlay(guestXwap, loginModal.frame);
      label(page, "Flow 1: Guest -> Login -> Xwap", feed.x + 160, feed.y - 38);
    }
    await setNavigate(loginButton, offer);
    
    if (detail && offer) {
      const detailXwap = hotspot("Detail Xwap to Offer", 90, 610, 210, 68);
      detail.appendChild(detailXwap);
      await setNavigate(detailXwap, offer);
      label(page, "Flow 2: Detail -> Offer Sheet", detail.x, detail.y - 38);
    }
    
    if (detail && restrictedModal.frame) {
      const restricted = hotspot("Restricted Xwap modal", 22, 700, 120, 54);
      detail.appendChild(restricted);
      await setOverlay(restricted, restrictedModal.frame);
      label(page, "Flow 6: Restricted modal", detail.x + 170, detail.y - 38);
    }
    
    if (shop && searchFilterOverlay.frame) {
      const shopSearch = hotspot("Shop Search Filter", 18, 72, 354, 150);
      shop.appendChild(shopSearch);
      await setOverlay(shopSearch, searchFilterOverlay.frame);
      label(page, "Flow 3: Shop -> Search/Filter -> Detail", shop.x, shop.y - 38);
    }
    await setNavigate(applyFilter, detail);
    
    if (addProduct) {
      const addNext = hotspot("Add Product Continue", 76, 650, 240, 70);
      addProduct.appendChild(addNext);
      await setNavigate(addNext, addReview);
      label(page, "Flow 4: Add Product", addProduct.x, addProduct.y - 38);
    }
    await setNavigate(publish, addSuccess);
    await setNavigate(goFeed, feed);
    
    if (inbox && acceptModal.frame) {
      const inboxAccept = hotspot("Inbox Accept Offer", 18, 180, 354, 150);
      inbox.appendChild(inboxAccept);
      await setOverlay(inboxAccept, acceptModal.frame);
      label(page, "Flow 5: Inbox -> Accept -> Shipment", inbox.x, inbox.y - 38);
    }
    await setNavigate(acceptButton, shipment);
    
    // Add flow index panel.
    const index = figma.createFrame();
    index.name = "Prototype / Flow Index";
    index.resize(500, 360);
    setupAuto(index, "VERTICAL", 12, 20);
    index.x = 80;
    index.y = 1980;
    index.cornerRadius = 24;
    index.fills = paint(C.surface);
    index.strokes = paint(C.border);
    index.strokeWeight = 1;
    index.appendChild(text("Prototype Wiring Index", 24, true, C.text));
    [
      "1. Guest -> Login -> Xwap",
      "2. Feed -> Detail -> Offer Sheet",
      "3. Shop -> Search/Filter -> Detail",
      "4. Add Product flow",
      "5. Inbox -> Accept -> Shipment",
      "6. Restricted modal flow"
    ].forEach((line) => index.appendChild(text(line, 14, false, C.muted)));
    page.appendChild(index);
    createdNodeIds.push(index.id);
    
    figma.viewport.scrollAndZoomIntoView([feed, shop, detail, addProduct, inbox].filter(Boolean));
    
    return {
      createdNodeIds,
      mutatedNodeIds,
      warnings,
      startNodeId: feed?.id || null,
      flowCount: 6,
      pageName: page.name,
      note: "Wired 6 QXwap prototype flows using hotspots, overlays, and navigation links."
    };
  })();
  log('4', 'Done - ' + (result4 && result4.note ? result4.note : 'ok'));

  return {
    summary: 'QXwap complete — Variables, Styles, Components, Screens, Prototype all wired.',
    variables: result0,
    styles: result1,
    components: result2,
    screens: result3,
    prototype: result4
  };
})()
.then(function(r) { console.log('[QXwap] ALL DONE', r.summary); console.log(JSON.stringify(r, null, 2)); })
.catch(function(err) { console.error('[QXwap] FAILED', err); });
