---
name: TaskFlow Neon-Precision
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c5c5d9'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8e8fa2'
  outline-variant: '#444656'
  surface-tint: '#bbc3ff'
  primary: '#bbc3ff'
  on-primary: '#001d93'
  primary-container: '#3d5afe'
  on-primary-container: '#f1f0ff'
  inverse-primary: '#2848ee'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#9a6100'
  on-tertiary-container: '#ffeedf'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bbc3ff'
  on-primary-fixed: '#000f5d'
  on-primary-fixed-variant: '#002ccd'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1280px
---

## Brand & Style

The design system is engineered to evoke a sense of "Cognitive Clarity"—a state where the user feels empowered by intelligence rather than overwhelmed by data. It targets high-performance professionals and teams who require a tool that feels like a sophisticated digital cockpit.

The visual style is **High-Tech Minimalism** blended with **Glassmorphism**. It prioritizes deep, immersive backgrounds to reduce eye strain during deep work, punctuated by vibrant, "glowing" interactive elements that signify AI activity and task priority. The aesthetic is sharp, precise, and premium, utilizing translucent layers and subtle gradients to create a sense of architectural depth in a digital space.

## Colors

The palette is anchored in a **Deep Navy and Charcoal** foundation to establish a premium, "pro-tool" atmosphere. 

- **Primary (Electric Blue):** Used for primary actions, active states, and AI-driven focus moments. It should appear as if it is emitting light against the dark background.
- **Secondary (Emerald):** Reserved exclusively for productivity metrics, completion states, and "health" indicators.
- **Tertiary (Amber):** Used sparingly for high-priority alerts, deadlines, and warnings.
- **Surface Palette:** Utilize varying shades of navy-charcoal (#1E293B, #334155) for container backgrounds to create visual hierarchy without relying on heavy borders.

## Typography

This design system utilizes **Inter** across all levels to maintain a systematic, utilitarian aesthetic that feels contemporary and highly legible. 

- **Headlines:** Use tighter letter spacing and heavier weights to create a strong visual anchor.
- **Data Display:** For task lists and productivity scores, ensure `body-md` and `label-md` are used consistently to maintain a clean, organized grid feel.
- **AI Insights:** Text generated or highlighted by AI features should utilize `body-lg` with a slightly increased line height to differentiate it from standard user-generated tasks.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content is contained within a 12-column grid on desktop (max-width 1280px) to ensure focus, while the inner elements utilize fluid percentages to adapt to panel-based navigation.

- **Grid:** Use 16px gutters to keep the UI feeling dense and information-rich, mimicking a technical dashboard.
- **Rhythm:** All margins and paddings must be multiples of 4px. Use 8px and 16px for internal component spacing, and 24px+ for section separation.
- **Responsive Behavior:** On mobile, the 12-column grid collapses to a single column with 16px side margins. Sidebars transition into bottom sheets or full-screen overlays to preserve the "glass" aesthetic.

## Elevation & Depth

Depth in this design system is achieved through **Backdrop Blurs (Glassmorphism)** and **Inner Glows** rather than traditional heavy drop shadows.

- **Base Layer:** The deepest navy-charcoal color.
- **Surface Layer:** Semi-transparent (60-80% opacity) with a `20px` to `40px` backdrop blur. This layer should have a subtle 1px border (White at 10% opacity) to define its edges.
- **Active Overlay:** For modals or floating menus, use a higher transparency and a subtle primary-colored "outer glow" (shadow with 0px offset, high blur, and low-opacity primary color) to simulate a light-emitting screen.
- **Z-Index Strategy:** Use depth to indicate temporal importance—upcoming tasks sit on higher "glass" planes than completed ones.

## Shapes

The shape language is **Rounded**, balancing the technical precision of the dark theme with an approachable, modern feel.

- **Buttons & Inputs:** Use `0.5rem` (rounded) for standard elements.
- **Cards & Sections:** Use `1rem` (rounded-lg) for main content containers to create a softer, more premium "app-like" feel.
- **Status Pills:** Use `3rem` (rounded-xl) or full pill shapes for tags and status indicators to differentiate them from interactive buttons.

## Components

- **Buttons:** Primary buttons use a linear gradient (Primary Blue to a slightly lighter tint) with white text. Secondary buttons are "ghost" style with the glassmorphism border and blur effect.
- **Cards:** All cards feature the glassmorphism effect. For "Smart/AI" cards, add a very subtle animated mesh gradient (5% opacity) in the background to indicate active processing.
- **Input Fields:** Darker than the surface background with a 1px border that glows (Primary Blue) upon focus. Labels should be small, uppercase, and high-contrast.
- **Chips/Tags:** Used for task categories. Use low-saturation background tints of the primary/secondary colors with high-saturation text.
- **Productivity Score:** A circular or radial progress component using the Emerald secondary color, featuring a subtle "outer glow" to emphasize progress.
- **Iconography:** Use "Linear" or "Duotone" icons with consistent 2px stroke weights. Icons should be monochromatic (White or light grey) unless they are indicating a specific state (Alert/Success).