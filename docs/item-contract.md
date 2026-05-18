# QXwap Item Contract

QXwap keeps the database schema normalized for storage and migrations, then maps API responses into a nested `Item` contract.

## Database Shape

The `items` table still stores core scalar columns:

- `owner_id`
- `title`
- `description`
- `category`
- `condition`
- `deal_type`
- `price_cash`
- `price_credit`
- `open_to_offers`
- `wanted_text`
- `wanted_tags`
- `location_label`
- `latitude`
- `longitude`
- `request_count`
- `view_count`

Images remain in `item_images`.

## API/Web Item Shape

The backend maps rows through `rowItem()` in `apps/api/src/server.ts`.

```ts
type Item = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  is_featured: boolean;
  is_fast_responder: boolean;
  owner: {
    id: string;
    name: string;
    avatar_url: string;
    rating: number;
    account_level?: number;
  };
  media: {
    images: string[];
  };
  deal: {
    type: "swap" | "sell" | "buy" | "both";
    price_cash: number;
    price_credit: number;
    open_to_offers: boolean;
  };
  wanted: {
    text: string;
    tags: string[];
  };
  location: {
    label: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  stats: {
    requests: number;
    views: number;
  };
  viewer: {
    is_owner: boolean;
    is_bookmarked: boolean;
  };
};
```

Mutation requests still accept the flat DB-aligned payload for compatibility:

- `deal_type`
- `price_cash`
- `price_credit`
- `open_to_offers`
- `wanted_text`
- `wanted_tags`
- `location_label`
- `images`

