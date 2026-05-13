# Code Map

Use this map to avoid opening the whole repo.

## Frontend

```text
apps/web/src/main.tsx
```

React bootstrap only.

```text
apps/web/src/App.tsx
```

App state, view routing, loading functions, selected item, auth modal, offer sheet, filter/search state.

```text
apps/web/src/lib/api.ts
```

API base normalization, asset URL helper, typed `api<T>()` helper.

```text
apps/web/src/lib/types.ts
```

Shared frontend types.

```text
apps/web/src/lib/format.ts
```

Display helpers such as profile level, condition percent, merge items.

```text
apps/web/src/lib/constants.ts
```

Categories, deal labels, default filters.

## Screens

```text
apps/web/src/screens/AiFeed.tsx
```

Feed/home marketplace recommendations.

```text
apps/web/src/screens/ShopPage.tsx
```

Shop grid, search/filter results.

```text
apps/web/src/screens/Detail.tsx
```

Product detail, owner/non-owner actions.

```text
apps/web/src/screens/AddProduct.tsx
```

Add/edit product form, wanted tags, image uploads.

```text
apps/web/src/screens/InboxPage.tsx
```

Offers, notifications, offer status, shipment controls.

```text
apps/web/src/screens/Profile.tsx
apps/web/src/screens/ProfileShop.tsx
```

My profile and public/user shop profile.

## Sheets

```text
apps/web/src/sheets/OfferSheet.tsx
```

Xwap offer submit flow.

```text
apps/web/src/sheets/FilterSheet.tsx
```

Filter drawer/sheet.

```text
apps/web/src/sheets/AuthModal.tsx
```

Login/register modal.

```text
apps/web/src/sheets/SearchSheet.tsx
```

Search products/profiles.

## Backend

```text
apps/api/src/server.ts
```

Express routes.

```text
apps/api/src/db.ts
```

Schema, migrations, seed data.

```text
apps/api/src/session-store.ts
```

Database-backed session store.

```text
apps/api/tests/api.test.ts
```

API tests.
