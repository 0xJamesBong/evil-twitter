# Evil Twitter Styling System

This document describes the styling architecture for the Evil Twitter Expo app.

## Philosophy

**Single source of truth, primitive-first approach.**

- All styling goes through design tokens (colors, spacing, typography)
- Use primitive components (`AppText`, `AppCard`, etc.) instead of raw RN components
- No hardcoded hex colors or magic numbers
- Centralized responsive behavior

## Design Tokens

All design tokens are defined in `theme/index.ts`:

- **Colors**: `colors.bg`, `colors.textPrimary`, `colors.accent`, etc.
- **Spacing**: `spacing.xs`, `spacing.sm`, `spacing.md`, etc.
- **Border Radius**: `radii.sm`, `radii.md`, `radii.pill`, etc.
- **Typography**: `typography.h1`, `typography.body`, `typography.caption`, etc.
- **Breakpoints**: `breakpoints.sm`, `breakpoints.md`, `breakpoints.lg`, etc.

### Usage

```tsx
import { colors, spacing, radii } from "@/theme";

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    padding: spacing.lg,
    borderRadius: radii.md,
  },
});
```

## Primitive Components

### AppScreen

Base screen wrapper with safe area handling.

```tsx
import { AppScreen } from "@/components/ui";

<AppScreen padding>
  <AppText>Content</AppText>
</AppScreen>;
```

### AppText

Text component with typography variants and semantic colors.

```tsx
import { AppText } from '@/components/ui';

<AppText variant="h1">Heading</AppText>
<AppText variant="body" color="secondary">Body text</AppText>
<AppText variant="caption" color="tertiary">Caption</AppText>
```

**Variants**: `h1`, `h2`, `h3`, `h4`, `body`, `bodyLarge`, `bodyBold`, `caption`, `captionBold`, `small`, `smallBold`

**Colors**: `primary`, `secondary`, `tertiary`, `accent`, `danger`, `success`, `inverse`

### AppCard

Elevated content container.

```tsx
import { AppCard } from "@/components/ui";

<AppCard padding elevated>
  <AppText>Card content</AppText>
</AppCard>;
```

### AppButton

Button with variants and sizes.

```tsx
import { AppButton } from "@/components/ui";

<AppButton variant="primary" size="md" onPress={handlePress}>
  Click me
</AppButton>;
```

**Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`

**Sizes**: `sm`, `md`, `lg`

### Row & Column

Flexbox layout helpers.

```tsx
import { Row, Column } from '@/components/ui';

<Row gap="md" align="center" justify="space-between">
  <AppText>Left</AppText>
  <AppText>Right</AppText>
</Row>

<Column gap="lg" align="stretch">
  <AppText>Item 1</AppText>
  <AppText>Item 2</AppText>
</Column>
```

## Responsive Design

Use the `useBreakpoint` hook for responsive behavior:

```tsx
import { useBreakpoint, useBreakpointAtLeast } from "@/hooks/useBreakpoint";

function MyComponent() {
  const breakpoint = useBreakpoint();
  const isDesktop = useBreakpointAtLeast("lg");

  if (isDesktop) {
    return <DesktopLayout />;
  }
  return <MobileLayout />;
}
```

**Breakpoints**:

- `sm`: < 640px (mobile)
- `md`: 640px - 767px (tablet)
- `lg`: 768px - 1023px (tablet landscape)
- `xl`: 1024px - 1199px (desktop)
- `2xl`: >= 1200px (large desktop)

## React Native Paper Strategy

**Current Status**: Paper is used selectively in specific screens (shop, exchange, profile).

**Decision**: **Quarantine approach** - Paper is kept for existing screens but not expanded to new components.

- Existing Paper screens: `shop.tsx`, `exchange.tsx`, `Profile.tsx`
- New components: Use primitives (`AppText`, `AppCard`, etc.)
- Long-term: Consider migrating Paper screens to primitives if needed

## Rules & Guidelines

### ✅ DO

- Use design tokens from `theme/index.ts`
- Use primitive components (`AppText`, `AppCard`, etc.)
- Use `useBreakpoint` for responsive behavior
- Keep styles co-located with components using `StyleSheet.create()`
- Use semantic color names (`colors.textPrimary`, not `colors.bg`)

### ❌ DON'T

- Hardcode hex colors (`#000`, `#1DA1F2`)
- Use magic numbers for spacing (`padding: 13`)
- Mix Paper and primitives in the same component
- Create one-off styled components without using primitives
- Use inline styles for complex styling (use `StyleSheet.create()`)

## Migration Guide

### Before

```tsx
<View style={{ backgroundColor: "#000", padding: 20 }}>
  <Text style={{ color: "#fff", fontSize: 16 }}>Hello</Text>
</View>
```

### After

```tsx
import { AppCard, AppText } from "@/components/ui";

<AppCard padding>
  <AppText variant="body">Hello</AppText>
</AppCard>;
```

## File Structure

```
theme/
  index.ts              # Design tokens (colors, spacing, typography, etc.)

components/ui/
  AppScreen.tsx         # Base screen wrapper
  AppText.tsx           # Text with typography variants
  AppCard.tsx           # Card container
  AppButton.tsx         # Button component
  Row.tsx               # Horizontal flex container
  Column.tsx            # Vertical flex container
  index.ts              # Centralized exports

hooks/
  useBreakpoint.ts      # Responsive breakpoint hook
```

## Examples

See these files for examples of the new styling system:

- `components/ReplyModal.tsx` (updated to use primitives)
- `app/modal.tsx` (updated to use primitives)
