# DATA MODEL PLAN

Date: 2026-05-30  
Scope: Planning only. No database or API changes in this round.

## Goal

Design a data model that supports:

- item listings
- wanted listings
- follow and save
- swap proposals
- deal lifecycle
- chat
- earned credit
- redeeming system items

while keeping:

- mock data in seed only
- business truth in backend
- frontend free from hardcoded marketplace content

## Core Model Direction

QXwap should stop treating “wanted” as only a text field attached to an item listing.

Target model:

- `have listings` and `wanted listings` are both first-class records
- swap proposals can reference one or more have listings against:
  - another have listing
  - or a wanted listing

## Main Entities

### 1. users

Purpose:

- authentication identity

Current source:

- `users` table already exists

Keep:

- `id`
- `email`
- `created_at`

## 2. profiles

Purpose:

- public identity and trust-facing data

Keep / expand:

- `id`
- `display_name`
- `username`
- `city`
- `bio`
- `avatar_url`
- `rating`
- `response_time_minutes`
- `is_featured`
- `is_fast_responder`
- `account_level`
- `latitude`
- `longitude`

Planned additions:

- `trust_score`
- `completed_swap_count`
- `cancelled_swap_count`
- `dispute_count`
- `last_active_at`

## 3. listings

Target replacement for today’s item-first model.

Purpose:

- one unified table for user-created marketplace entries

Proposed fields:

- `id`
- `owner_id`
- `listing_kind` = `have | want | reward`
- `status` = `draft | active | paused | matched | completed | archived`
- `title`
- `description`
- `category`
- `condition`
- `price_cash`
- `price_cash_unknown`
- `price_credit`
- `open_to_offers`
- `location_label`
- `latitude`
- `longitude`
- `maps_url`
- `created_at`
- `updated_at`

Why:

- supports normal item posts
- supports wanted posts
- supports system reward items with `listing_kind = reward`

## 4. listing_media

Purpose:

- separate listing images from listing row

Fields:

- `id`
- `listing_id`
- `sort_order`
- `media_url`
- `media_kind`

## 5. listing_tags

Purpose:

- standardize discovery and matching

Fields:

- `id`
- `listing_id`
- `tag`
- `tag_kind` = `have | want | search | system`

## 6. follows

Purpose:

- user-to-user following

Current table already exists and should remain

Keep:

- `follower_id`
- `following_id`
- `created_at`

## 7. bookmarks

Purpose:

- saved items/listings

Current table already exists and should remain, but move to listing-centric language over time

Target:

- `user_id`
- `listing_id`
- `created_at`

## 8. swap_offers

Purpose:

- initial proposal layer

Proposed fields:

- `id`
- `from_user_id`
- `to_user_id`
- `target_listing_id`
- `status` = `pending | accepted_by_receiver | accepted | rejected | cancelled | expired | completed`
- `message`
- `cash_amount`
- `credit_amount`
- `instant_swap`
- `rejection_reason`
- `expires_at`
- `created_at`
- `updated_at`

Planned change:

- add `expired`
- rename `confirmed` in business model to `completed` or map it clearly to completed deal state

## 9. swap_offer_listings

Purpose:

- link many offered listings to one swap offer

Fields:

- `offer_id`
- `listing_id`

Why:

- supports bundle offers cleanly

## 10. deals

Purpose:

- accepted swap that is now in execution

Fields:

- `id`
- `offer_id`
- `buyer_id`
- `seller_id`
- `stage`
- `logistics`
- `created_at`
- `updated_at`

Recommended stages:

- `accepted`
- `scheduled`
- `handoff_started`
- `handoff_completed`
- `completed`
- `returned`
- `disputed`
- `cancelled`

## 11. shipments

Purpose:

- physical handoff / delivery tracking

Keep and normalize:

- `id`
- `offer_id`
- `status`
- `current_step`
- `tracking_number`
- `pickup_photo_url`
- `dropoff_photo_url`
- `created_at`
- `updated_at`

Recommended normalized steps:

- `scheduled`
- `picked_up`
- `in_transit`
- `delivered`
- `confirmed`

## 12. conversations

Purpose:

- deal-context messaging

Keep:

- `id`
- `offer_id`
- `created_at`

## 13. messages

Purpose:

- chat records

Keep:

- `id`
- `conversation_id`
- `sender_id`
- `text`
- `created_at`

Recommended additions:

- `message_kind`
- `attachment_url`
- `read_at`

## 14. wallets

Purpose:

- credit balance

Keep:

- `user_id`
- `credit_balance`

## 15. wallet_transactions

Purpose:

- earned/spent credit ledger

Fields:

- `id`
- `user_id`
- `amount`
- `type`
- `description`
- `source_kind` = `swap_completion | bonus | admin_adjustment | reward_redemption`
- `source_id`
- `created_at`

## 16. reward_catalog

New planned entity.

Purpose:

- system-owned items redeemable by credit

Fields:

- `id`
- `title`
- `description`
- `category`
- `credit_cost`
- `stock_status`
- `media_cover_url`
- `is_active`

## 17. reward_redemptions

New planned entity.

Purpose:

- track spending credits on system reward items

Fields:

- `id`
- `user_id`
- `reward_id`
- `credit_cost`
- `status`
- `created_at`

## 18. notifications

Purpose:

- user alerts

Keep:

- `id`
- `user_id`
- `title`
- `body`
- `read_at`
- `data`
- `created_at`

Recommended `data` contract:

- stable typed payload for
  - offer id
  - deal id
  - conversation id
  - listing id
  - reward redemption id

## What Will Be Refactored

- current item-first structure into listing-first structure
- current wanted text/tags from ad hoc metadata into proper wanted listing model
- current credit-as-local-demo logic into ledger-backed business flow
- current offer status set to include expiry and clearer completion semantics

## What Will Be Removed

Planning only:

- frontend responsibility for business mock ranking/trust values
- reliance on ad hoc wanted-text-only matching as the main desired-item model

## What Will Be Combined

- user item posts and wanted posts under one `listings` concept
- reward/system items under the same listing-family concept, but with `listing_kind = reward`

## Mock Data That Must Live In Seed Only

Move business demo content ownership to seed only:

- mock user blueprints
- mock product templates
- mock locations
- demo banners/campaigns
- demo wallet balances
- seeded follows
- demo reward catalog
- demo wanted listings

Frontend must not carry:

- hardcoded demo user copy
- hardcoded demo recommendation reasons
- hardcoded product trust stories
- business example images that masquerade as real marketplace data

## Seed Strategy

### Seed layers

1. `base seed`
   - minimal categories, conditions, system config
2. `demo seed`
   - optional local marketplace dataset
3. `test seed`
   - isolated fixtures for automated tests

### Rule

- app boot must not assume demo seed for correctness
- demo seed should be enabled intentionally per environment

## Service Contracts This Model Enables

- `feedService.listHomeFeed()`
- `feedService.listFollowingFeed()`
- `listingService.listHaveListings()`
- `wantedService.listWantedListings()`
- `listingService.getListingDetail()`
- `socialService.followUser()`
- `socialService.saveListing()`
- `dealService.createSwapOffer()`
- `dealService.acceptSwapOffer()`
- `dealService.rejectSwapOffer()`
- `dealService.completeSwap()`
- `walletService.getWallet()`
- `walletService.getTransactions()`
- `rewardService.listRedeemableItems()`
- `rewardService.redeemReward()`

## Risks

- migration from `items` to `listings` can ripple through almost every screen
- bundle offers rely on current `offered_items` shape and must keep compatibility during transition
- reward items can contaminate normal feed if `listing_kind` is not filtered carefully
- credit spending must never be represented as a pure frontend action

## Recommended Implementation Order

1. introduce listing-first backend contract without breaking existing `items` response shape
2. add wanted listing support as first-class backend data
3. normalize offer/deal status model
4. add wallet transaction source types
5. add reward catalog and redemption model
6. remove frontend dependency on business mock content
