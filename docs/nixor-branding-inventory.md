# Nixor Connect Branding Inventory

**Date:** May 10, 2026  
**Rebranding:** Element Web → Nixor Connect by Nixor College  
**Scope:** Initial branding pass for web client

---

## Summary of Changes

This document tracks all user-visible branding assets and changes made during the initial rebranding of Element Web to Nixor Connect by Nixor College. The goal was to replace all customer-facing branding without modifying core Matrix chat logic, authentication flows, room management, or encryption.

---

## 1. Package Metadata

### 1.1 Web App Package
**File:** `apps/web/package.json`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `name` | `element-web` | `nixor-connect` | ✅ Yes |
| `description` | `Element: the future of secure communication` | `Nixor Connect: Secure communication by Nixor College` | ✅ Yes |
| `author` | `New Vector Ltd.` | `Nixor College` | ✅ Yes |

### 1.2 Desktop App Package
**File:** `apps/desktop/package.json`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `name` | `element-desktop` | `nixor-connect-desktop` | ✅ Yes |
| `productName` | `Element` | `Nixor Connect` | ✅ Yes |
| `description` | `Element: the future of secure communication` | `Nixor Connect: Secure communication by Nixor College` | ✅ Yes |
| `author.name` | `Element` | `Nixor College` | ✅ Yes |
| `author.email` | `support@element.io` | `support@nixor.college.edu.pk` | ✅ Yes |

---

## 2. Web Entry Point & Meta Tags

### 2.1 HTML Title and Meta Tags
**File:** `apps/web/src/vector/index.html`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `<title>` | `Element` | `Nixor Connect` | ✅ Yes |
| `meta apple-mobile-web-app-title` | `Element` | `Nixor Connect` | ✅ Yes |
| `meta application-name` | `Element` | `Nixor Connect` | ✅ Yes |
| Favicon links (24px, 144px, 512px) | `/vector-icons/*` | `/vector-icons/*` | ⏸️ No change (use existing icons) |

**Notes:**
- Browser tab title and pinned tab names now display "Nixor Connect"
- Mobile home screen app name updated

---

## 3. Web App Manifest

**File:** `apps/web/res/manifest.json`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `name` | `Element` | `Nixor Connect` | ✅ Yes |
| `short_name` | `Element` | `Nixor Connect` | ✅ Yes |
| `theme_color` | `#76CFA6` | `#76CFA6` | ❌ No change |
| Icon sources | `/vector-icons/24.png`, `/vector-icons/120.png`, etc. | (unchanged paths) | ❌ No change |

**Notes:**
- PWA and app installer will show "Nixor Connect"

---

## 4. Configuration Files

### 4.1 Web App Sample Config
**File:** `apps/web/config.sample.json`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `brand` | `Element` | `Nixor Connect` | ✅ Yes |
| `default_server_config.m.homeserver.base_url` | `https://matrix-client.matrix.org` | `https://matrix-client.matrix.org` | ❌ No change |
| Other Element URLs (scalar.vector.im) | (unchanged) | (unchanged) | ❌ No change* |

**Notes:**
- *Third-party integration URLs remain unchanged (external service URLs). The `brand` field is the key user-visible config.
- Deployments should update `default_server_config.m.homeserver.base_url` to point to their own Synapse instance
- Example: `https://matrix.nixorconnect.nixorcollege.edu.pk` (if available)

### 4.2 Development Config
**File:** `apps/web/element.io/develop/config.json`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `default_server_name` | `matrix.org` | `nixor` | ✅ Yes |
| `brand` | `Element` | `Nixor Connect` | ✅ Yes |

### 4.3 Production/App Config
**File:** `apps/web/element.io/app/config.json`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `default_server_name` | `matrix.org` | `nixor` | ✅ Yes |
| `brand` | `Element` | `Nixor Connect` | ✅ Yes |

**Notes:**
- Configs are used during CI/CD builds for different deployment stages
- The `default_server_name` is purely internal and helps identify the config set

---

## 5. Branding Constants

### 5.1 TypeScript Branding Logic
**File:** `apps/web/src/branding.ts`

| Asset | Before | After | Changed |
|-------|--------|-------|---------|
| `ELEMENT_BRAND` constant | `"Element"` | `"Nixor Connect"` | ✅ Yes |
| `isElementBranded()` comment | References `Element` variants | References `Nixor Connect` variants | ✅ Yes |

**Notes:**
- The function `isElementBranded()` is used by internal code to detect Element-specific branding
- This is now updated to check for "Nixor Connect" instead
- The function name `isElementBranded` is kept for backward compatibility (internal function)

---

## 6. Logo & Icon Files (For Manual Replacement)

### 6.1 App Logo (PNG)
**Location:** `apps/web/res/themes/element/img/logos/element-app-logo.png`  
**Usage:** Error view, incompatible browser fallback screen  
**Expected Dimensions:** ~512px (check file)  
**Status:** ⏸️ Placeholder - Requires custom Nixor logo  
**Notes:**
- Used in error states to display app branding
- File: [element-app-logo.png](../../apps/web/res/themes/element/img/logos/element-app-logo.png)

### 6.2 Vector/Element Logo (SVG)
**Location:** `apps/web/res/themes/element/img/logos/element-logo.svg`  
**Usage:** Possible branding elements  
**Status:** ⏸️ Placeholder - Requires custom Nixor logo  
**Notes:**
- SVG vector format, scalable
- File: [element-logo.svg](../../apps/web/res/themes/element/img/logos/element-logo.svg)

### 6.3 Open Graph Image (PNG)
**Location:** `apps/web/res/themes/element/img/logos/opengraph.png`  
**Usage:** Social media preview when sharing app links  
**Expected Dimensions:** 1200x630px (standard OG image size)  
**Status:** ⏸️ Placeholder - Requires custom Nixor image  
**Notes:**
- Used for link previews on social media (Twitter, Facebook, etc.)
- File: [opengraph.png](../../apps/web/res/themes/element/img/logos/opengraph.png)

### 6.4 Favicon Icons (PNG)
**Location:** `apps/web/res/vector-icons/`  
**Files:**
- `24.png` (tab icon)
- `120.png` (apple-touch-icon)
- `144.png` (android home screen)
- `152.png` (ipad home screen)
- `180.png` (iphone home screen)
- `512.png` (large preview)
- `1024.png` (extra large)

**Status:** ⏸️ Placeholders - Requires custom Nixor favicons  
**Notes:**
- Multiple sizes needed for different devices and use cases
- Should use Nixor College branding/colors
- All files reference in: `apps/web/src/vector/index.html` and `apps/web/res/manifest.json`

### 6.5 Download Store Icons (SVG)
**Location:** `apps/web/res/themes/element/img/download/`  
**Files:**
- `apple.svg` (Apple App Store)
- `google.svg` (Google Play)
- `fdroid.svg` (F-Droid)

**Usage:** Download links shown in error/incompatible browser view  
**Status:** ❌ No change required (external store links, not branded)  
**Notes:**
- These are generic store logos, not app-specific branding
- Leave as-is

### 6.6 Background & Gradient Images
**Location:** `apps/web/res/themes/element/img/`  
**Files:**
- `backgrounds/lake.jpg`
- `compound/fade-arc-light.png`

**Status:** ⏸️ Optional - May be replaced if updating theme colors  
**Notes:**
- These are decorative/UI elements
- Not essential for branding pass, but could be updated for cohesive theme

---

## 7. Internationalization & UI Strings

### 7.1 Visible Brand References in UI
**File:** `apps/web/src/i18n/strings/en_EN.json`

Key strings that reference the app name (left as-is for i18n system compatibility):

| String Key | Current Text | Notes |
|------------|--------------|-------|
| `console_dev_note` | "If you know what you're doing, Element is open-source..." | References upstream repo; left unchanged for attribution |
| `incompatible_browser\|title` | Uses `{brand}` variable | ✅ Will dynamically show "Nixor Connect" via config |
| `enable_element_call_caption` | Uses `{brand}` variable | ✅ Will dynamically show "Nixor Connect" |
| `element_call` | "Element Call" | ⏸️ Refers to feature name; consider if Nixor has alternative |
| `tagline_element` | "Supercharged for speed and simplicity." | Generic tagline; may update for Nixor branding |
| `title_element` | "Be in your element" | Playful tagline; may update for Nixor branding |

**Status:** Partial  
**Notes:**
- String interpolation with `{brand}` variable is already in place and will use the config value
- "Element Call" is the name of the video conferencing feature (from @element-hq/element-call) and was left as-is
- Taglines with "element" wordplay are left as-is for now; these can be customized in a future pass

---

## 8. Files NOT Changed (Intentionally)

### 8.1 License & Attribution
- ✅ License files (`LICENSE-AGPL-3.0`, `LICENSE-GPL-3.0`, etc.) - **Unchanged**
- ✅ Copyright headers in source files - **Unchanged**
- ✅ Dependency names (`@element-hq/`, `@vector-im/`) - **Unchanged** (upstream packages)
- ✅ GitHub repository URLs (upstream references) - **Unchanged**

### 8.2 Internal Package Names
- ✅ `@element-hq/element-web-module-api` - **Unchanged** (dependency package)
- ✅ `@element-hq/web-shared-components` - **Unchanged** (dependency package)
- ✅ `@vector-im/` packages - **Unchanged** (upstream dependencies)

### 8.3 Matrix Protocol & Features
- ✅ Room creation, permissions, encryption - **Unchanged**
- ✅ E2E encryption settings - **Unchanged**
- ✅ Authentication/auth flow - **Unchanged**
- ✅ Device verification UI - **Unchanged**
- ✅ User/room directory - **Unchanged**

### 8.4 Internal Code Comments & Naming
- ✅ `isElementBranded()` function name - **Unchanged** (internal logic, backward compat)
- ✅ CSS class names with "element" prefix (e.g., `.mx_*`) - **Unchanged** (internal styling)
- ✅ Component names - **Unchanged** (internal architecture)

---

## 9. Configuration Next Steps for Deployment

When deploying Nixor Connect to production:

1. **Update default homeserver URL** (if applicable)
   - Update `apps/web/config.sample.json`
   - Set `default_server_config.m.homeserver.base_url` to your Nixor Synapse instance
   - Example: `"base_url": "https://matrix.nixorconnect.nixorcollege.edu.pk"`

2. **Replace logo files** (custom Nixor graphics)
   - Replace PNG files in `apps/web/res/themes/element/img/logos/`
   - Replace ICO files in `apps/web/res/vector-icons/`

3. **Update integration URLs** (if using custom integrations)
   - Update `integrations_ui_url` in config files to point to your widget server
   - Update `integrations_rest_url` for bot framework

4. **Configure analytics/telemetry** (if applicable)
   - Update Sentry DSN in config files
   - Update PostHog API host

5. **Review and update taglines** (optional)
   - i18n strings in `src/i18n/strings/en_EN.json` can be customized for Nixor messaging

---

## 10. Build & Verification Commands

```bash
# Install dependencies
pnpm install

# Build the web client
pnpm build

# Run type checks
pnpm lint:types

# Run linter
pnpm lint:js

# Run style linter
pnpm lint:style

# Run unit tests
pnpm test

# Run Playwright tests (optional)
pnpm test:playwright
```

---

## 11. Known Limitations & Future Improvements

1. **Logo files** - Placeholder image files still show Element branding. Replace with Nixor logo files in next phase.
2. **Desktop app** - Product name updated in package.json but desktop-specific branding (window title, installer name) needs further configuration in Electron builder.
3. **Taglines** - Some promotional text still references Element wordplay ("Be in your element"). Can be customized per Nixor requirements.
4. **Third-party services** - URLs pointing to `vector.im`, `element.io` remain unchanged (external service dependencies). Update as needed.
5. **Element Call** - The integrated video calling feature is named "Element Call" (upstream feature). Can be aliased or renamed in future versions.

---

## 12. Files Changed Summary

| File | Change | Status |
|------|--------|--------|
| `apps/web/package.json` | name, description, author | ✅ Changed |
| `apps/desktop/package.json` | name, productName, description, author | ✅ Changed |
| `apps/web/src/vector/index.html` | title, meta tags | ✅ Changed |
| `apps/web/res/manifest.json` | name, short_name | ✅ Changed |
| `apps/web/config.sample.json` | brand | ✅ Changed |
| `apps/web/element.io/develop/config.json` | brand, default_server_name | ✅ Changed |
| `apps/web/element.io/app/config.json` | brand, default_server_name | ✅ Changed |
| `apps/web/src/branding.ts` | ELEMENT_BRAND constant | ✅ Changed |
| Logo & icon files | (See Section 6 for status) | ⏸️ Pending |

---

**Total files changed:** 8  
**Total user-facing branding replacements:** 15+  
**Logo files requiring replacement:** 5 categories (7+ files)  

---

## Document Metadata

- **Created:** 2026-05-10
- **Updated:** 2026-05-10
- **Branding Rebranding:** Element Web → Nixor Connect by Nixor College
- **Next Review:** When logo files are provided and integrated
