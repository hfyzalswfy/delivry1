# FullDelivery — Design Foundation

> **Permanent visual reference for all modules**  
> Source: Driver Home + Driver Order Tracking screens  
> Approved: 2026-07-12  

---

## 1. Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#121212` | Screen background |
| `surface` | `#1A1A1A` | Header, tab bar |
| `card` | `#1E1E1E` | Card background |
| `white` | `#FFFFFF` | Primary text |
| `nearWhite` | `#F3F4F6` | Secondary values |
| `gray` | `#9CA3AF` | Secondary text |
| `dim` | `#6B6B6B` | Tertiary/dim text |
| `label` | `#6B7280` | Labels, placeholders |
| `green` | `#22C55E` | Primary accent, active |
| `greenDark` | `#064E3B` | Button bg, call bg |
| `greenLight` | `#4ADE80` | Button text, completed |
| `red` | `#EF4444` | Danger, notification badge |
| `redDark` | `#7F1D1D` | Cancelled badge, drop pin |
| `border` | `#2A2A2A` | Card borders, dividers |
| `divider` | `#2A2A2A` | Divider lines |
| `disabledBg` | `#2A2A2A` | Disabled button bg |
| `disabledText` | `#6B7280` | Disabled button text |
| `pendingDot` | `#3A3A3A` | Timeline pending dot |
| `tabBg` | `#0D0D0D` | Tab bar background |
| `tabBorder` | `#2A2A2A` | Tab bar top border |

### 1.1 Status Badge Colors

| Status | Background | Text |
|--------|-----------|------|
| `pending` | `#1E3A5F` | `#60A5FA` |
| `driver_accepted` / `published` | `#064E3B` | `#4ADE80` |
| `driver_arrived_store` | `#713F12` | `#FBBF24` |
| `picked_up` | `#1E3A5F` | `#60A5FA` |
| `on_the_way` | `#064E3B` | `#4ADE80` |
| `driver_arrived_destination` | `#713F12` | `#FBBF24` |
| `delivered` | `#065F46` | `#6EE7B7` |
| `cancelled` | `#7F1D1D` | `#FCA5A5` |

---

## 2. Typography

**Font:** System default (no custom fonts)  
**Letter-spacing:** `0.5` on uppercase labels (PICKUP, DROP-OFF, etc.)

| Size | Weight | Usage |
|------|--------|-------|
| `48` | `700` | Wallet balance |
| `24` | `700` | Greeting, hero titles |
| `22` | `700` | Stat values |
| `18` | `700` | Section titles, order numbers |
| `16` | `700` | Card titles, prices, buttons, customer names |
| `15` | `700` / `600` | Order IDs, location titles |
| `14` | `500` / `600` | Labels, body, addresses |
| `13` | `500` / `600` | Route text, meta, action buttons |
| `12` | `700` / `600` | Badge text, rewards, meta |
| `11` | `600` | Location labels (caps), tab badge |
| `10` | `700` | Notification badge |
| `9` | `500` | Timeline step labels |

---

## 3. Spacing

| Token | px | Usage |
|-------|----|-------|
| `xs` | `4` | Tiny gaps, badge padding |
| `sm` | `8` | Small gaps, margins |
| `md` | `12` | Gaps between elements, card margins |
| `lg` | `16` | Card padding, page padding, button padding |
| `xl` | `20` | Section padding, button vertical |
| `xxl` | `24` | Bottom padding, spacers |
| `xxxl` | `32` | Large spacing |

---

## 4. Border Radius

| Token | px | Usage |
|-------|----|-------|
| `sm` | `6` | Badges, checkboxes |
| `md` | `10` | Filter chips, inputs, proof buttons, radio |
| `lg` | `12` | Cards, primary buttons |
| `xl` | `16` | Home screen cards, stats, sections |
| `full` | `9999` | Pills (filter chips = 20px practical) |

---

## 5. Elevation / Shadow

Screens use `borderWidth: 1` with `borderColor: #2A2A2A` for card separation.  
No box-shadow or elevation is used — flat design.

---

## 6. Card Styles

```
{
  backgroundColor: '#1E1E1E',
  borderRadius: 12 (or 16 for Home sections),
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#2A2A2A',
}
```

**Card Title:** `color: #FFFFFF, fontSize: 16, fontWeight: '700', marginBottom: 14-16`  
**Row:** `flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10-12`  
**Divider inside card:** `height: 1, backgroundColor: '#2A2A2A', marginVertical: 10-12`

---

## 7. Button Styles

### Primary Button
```
{
  backgroundColor: '#064E3B',
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center',
}
```
Text: `color: '#4ADE80', fontSize: 16, fontWeight: '700'`

### Secondary / Cancel Button
```
{
  backgroundColor: '#2A2A2A',
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center',
}
```
Text: `color: '#6B7280', fontSize: 16, fontWeight: '600'`

### Ghost / Text Cancel
```
{
  paddingVertical: 14,
  alignItems: 'center',
}
```
Text: `color: '#6B7280', fontSize: 15-16, fontWeight: '600'`

### Disabled Button
Same as primary but `backgroundColor: '#2A2A2A'`, text: `color: '#6B7280'`

### Small Action Buttons (Home screen)
- View/Accept: `borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16-20, fontSize: 13`
- Details: `backgroundColor: '#2A2A2A'`
- Accept: `backgroundColor: '#22C55E'`

---

## 8. Input Styles

### Text Input
```
{
  backgroundColor: '#2A2A2A',
  borderRadius: 10,
  padding: 14,
  color: '#F3F4F6',
  fontSize: 14,
  borderWidth: 1,
  borderColor: '#2A2A2A',
}
```

### OTP Input
```
{
  backgroundColor: '#121212',
  borderRadius: 10,
  padding: 14,
  fontSize: 24,
  color: '#FFFFFF',
  textAlign: 'center',
  letterSpacing: 8,
  fontWeight: '700',
  borderWidth: 1,
  borderColor: '#2A2A2A',
}
```

### Multiline / Notes Input
Same as text input with `minHeight: 80-100`

---

## 9. Status Badge Styles

```
{
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 6,
}
```
Text: `fontSize: 12, fontWeight: '700'`
Colors per status: see section 1.1

---

## 10. Icon Sizing

| Size | Usage |
|------|-------|
| `10` | Small pin emoji inside drop pin |
| `12` | Map pin icon |
| `14` | Small inline icons |
| `16` | Tab bar icons (fontSize: 20 actual) |
| `18` | Section icons |
| `20` | Emoji icons, pins |
| `22` | Call button icon |
| `24` | Large icons, bell |
| `28` | Stat emojis |

---

## 11. Navigation / Header Style

### Tab Bar
```
{
  backgroundColor: '#0D0D0D',
  borderTopColor: '#2A2A2A',
  borderTopWidth: 1,
  height: 60,
  paddingBottom: 8,
  paddingTop: 6,
}
```
Active tint: `#22C55E` | Inactive tint: `#9CA3AF`  
Label: `fontSize: 11, fontWeight: '500'`

### Stack Header
```
{
  headerStyle: { backgroundColor: '#1A1A1A' },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '600' },
  headerShadowVisible: false,
}
```

---

## 12. Design Rules

1. **Background**: Always `#121212` for main screens, `#0D0D0D` for tab bar
2. **Cards**: Always `#1E1E1E` with `#2A2A2A` border, 12px radius
3. **Primary action**: Always `#064E3B` bg with `#4ADE80` text, 12px radius
4. **Secondary action**: Always `#2A2A2A` bg with `#6B7280` text
5. **Primary text**: Always `#FFFFFF`, bold (700) for emphasis
6. **Secondary text**: Always `#9CA3AF` or `#6B7280`
7. **Badges**: Always 6px radius, 10px horizontal padding, 4px vertical
8. **Dividers**: Always 1px `#2A2A2A` height
9. **SafeAreaView**: Always wrap operational screens with `flex: 1, backgroundColor: '#121212'`
10. **Do NOT use** the old light theme (`#F8FAFC`, `#FFFFFF` bg, `#2563EB` primary) for any new screens
