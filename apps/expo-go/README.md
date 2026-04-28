# QXwap Expo Go Preview

This folder is a lightweight Expo Go wrapper for testing the deployed QXwap web app on a real iOS or Android device.

It does not replace the main web app. It opens the deployed QXwap URL inside a React Native WebView so mobile behavior can be checked quickly in Expo Go.

## Run on Expo Go

```bash
cd apps/expo-go
npm install
npm run check
npm start
```

Then open the project from Expo Go.

## What to test on device

- Existing product images show in Feed, Shop, and detail.
- Creating a product with images works.
- Login shows products without browser refresh.
- Posting a product refreshes automatically.
- Non-owner does not see Edit/Delete.
- Owner still sees Edit/Delete for own items.
- Feed and Shop cards open detail.
- An account with no products can make a message, cash, or credit offer.
- Add Product deal type cards work.
- Optional price and open-to-all-offers works.
- Wanted tags show and clicking a tag searches or filters.
- Search and filter work together in Shop and Feed.

## Change target URL

The default URL is in app.json under expo.extra.defaultWebUrl.

You can also type another HTTPS URL into the input field inside the Expo Go app.

## Notes

- Use a deployed HTTPS URL for the best Expo Go result.
- If testing a local backend, the phone must be able to reach that backend from the same network.
- Cookies are enabled in the WebView so auth/session behavior can be tested.
