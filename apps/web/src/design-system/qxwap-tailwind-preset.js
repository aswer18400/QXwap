const qxwapTailwindPreset = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        qx: {
          brand: "var(--qx-color-brand)",
          "brand-hover": "var(--qx-color-brand-hover)",
          accent: "var(--qx-color-brand-accent)",
          page: "var(--qx-color-page)",
          surface: "var(--qx-color-surface)",
          "surface-subtle": "var(--qx-color-surface-subtle)",
          border: "var(--qx-color-border)",
          text: {
            primary: "var(--qx-color-text-primary)",
            secondary: "var(--qx-color-text-secondary)",
            inverse: "var(--qx-color-text-inverse)"
          },
          success: "var(--qx-color-success)",
          danger: "var(--qx-color-danger)",
          warning: "var(--qx-color-warning)"
        }
      },
      fontFamily: {
        sans: "var(--qx-font-sans)"
      },
      fontSize: {
        "qx-caption": ["var(--qx-type-caption-size)", "var(--qx-type-caption-line)"],
        "qx-label": ["var(--qx-type-label-size)", "var(--qx-type-label-line)"],
        "qx-body": ["var(--qx-type-body-size)", "var(--qx-type-body-line)"],
        "qx-heading-2": ["var(--qx-type-heading-2-size)", "var(--qx-type-heading-2-line)"],
        "qx-heading-1": ["var(--qx-type-heading-1-size)", "var(--qx-type-heading-1-line)"]
      },
      borderRadius: {
        "qx-xs": "var(--qx-radius-xs)",
        "qx-sm": "var(--qx-radius-sm)",
        "qx-md": "var(--qx-radius-md)",
        "qx-lg": "var(--qx-radius-lg)",
        "qx-xl": "var(--qx-radius-xl)",
        "qx-pill": "var(--qx-radius-pill)"
      },
      boxShadow: {
        "qx-sm": "var(--qx-shadow-sm)",
        "qx-md": "var(--qx-shadow-md)",
        "qx-lg": "var(--qx-shadow-lg)",
        "qx-primary": "var(--qx-shadow-primary)",
        "qx-focus": "var(--qx-focus-ring)"
      },
      spacing: {
        "qx-page": "var(--qx-layout-page-padding)",
        "qx-nav": "var(--qx-nav-height)",
        "qx-touch": "var(--qx-touch-target-min)"
      },
      maxWidth: {
        "qx-mobile": "var(--qx-layout-mobile-width)"
      },
      transitionTimingFunction: {
        "qx-standard": "var(--qx-ease-standard)"
      },
      transitionDuration: {
        "qx-fast": "var(--qx-motion-fast)",
        "qx-base": "var(--qx-motion-base)",
        "qx-slow": "var(--qx-motion-slow)"
      }
    }
  }
};

export default qxwapTailwindPreset;
