import { getDb } from "../api/queries/connection";
import { categories, users, profiles, items, wallets } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  const db = await getDb();

  // Seed categories
  const existingCats = await db.select().from(categories);
  if (!existingCats.length) {
    await db.insert(categories).values([
      { id: crypto.randomUUID(), name: "Electronics", slug: "electronics", icon: "laptop" },
      { id: crypto.randomUUID(), name: "Fashion", slug: "fashion", icon: "shirt" },
      { id: crypto.randomUUID(), name: "Home", slug: "home", icon: "home" },
      { id: crypto.randomUUID(), name: "Sports", slug: "sports", icon: "dumbbell" },
      { id: crypto.randomUUID(), name: "Vehicles", slug: "vehicles", icon: "car" },
      { id: crypto.randomUUID(), name: "Collectibles", slug: "collectibles", icon: "gem" },
      { id: crypto.randomUUID(), name: "Books", slug: "books", icon: "book" },
      { id: crypto.randomUUID(), name: "Beauty", slug: "beauty", icon: "sparkles" },
      { id: crypto.randomUUID(), name: "Toys", slug: "toys", icon: "gamepad-2" },
      { id: crypto.randomUUID(), name: "Other", slug: "other", icon: "package" },
    ]);
    console.log("Categories seeded");
  }

  // Seed demo user if not exists
  const bcrypt = await import("bcryptjs");
  const demoEmail = "demo@qxwap.com";
  const existingUser = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
  let demoUserId: string;
  if (!existingUser.length) {
    demoUserId = crypto.randomUUID();
    await db.insert(users).values({
      id: demoUserId,
      email: demoEmail,
      passwordHash: await bcrypt.hash("demo1234", 10),
    });
    await db.insert(profiles).values({
      id: demoUserId,
      displayName: "Demo User",
      username: "demouser",
      city: "Bangkok",
      bio: "สวัสดี! ฉันชอบแลกเปลี่ยนสินค้า",
    });
    await db.insert(wallets).values({ userId: demoUserId, creditBalance: 1000 });
    console.log("Demo user seeded");
  } else {
    demoUserId = existingUser[0].id;
  }

  // Seed items
  const existingItems = await db.select().from(items);
  if (!existingItems.length) {
    const itemData = [
      {
        title: "iPhone 14 Pro",
        description: "สภาพดี ใช้งานน้อย พร้อมกล่อง",
        category: "Electronics",
        condition: "Like new",
        dealType: "swap",
        priceCash: 0,
        priceCredit: 0,
        openToOffers: true,
        wantedTags: ["MacBook", "iPad", "กล้อง"],
        wantedText: "อยากได้ MacBook Air หรือ iPad Pro",
        locationLabel: "กรุงเทพฯ",
      },
      {
        title: "จักรยานเสือหมอบ",
        description: "อะลูมิเนียม น้ำหนักเบา สภาพใหม่",
        category: "Sports",
        condition: "New",
        dealType: "both",
        priceCash: 15000,
        priceCredit: 0,
        openToOffers: false,
        wantedTags: ["จักรยานไฟฟ้า"],
        wantedText: "รับเงินสดหรือแลกจักรยานไฟฟ้า",
        locationLabel: "เชียงใหม่",
      },
      {
        title: "หนังสือนิยายไทย",
        description: "รวม 5 เล่ม สภาพดี",
        category: "Books",
        condition: "Good",
        dealType: "sell",
        priceCash: 200,
        priceCredit: 0,
        openToOffers: false,
        wantedTags: [],
        wantedText: "",
        locationLabel: "กรุงเทพฯ",
      },
      {
        title: "เสื้อยืดแบรนด์เนม",
        description: "ซื้อจากต่างประเทศ ไซซ์ M",
        category: "Fashion",
        condition: "New",
        dealType: "swap",
        priceCash: 0,
        priceCredit: 0,
        openToOffers: true,
        wantedTags: ["รองเท้า", "กระเป๋า"],
        wantedText: "แลกกับรองเท้าหรือกระเป๋าแบรนด์เนม",
        locationLabel: "นนทบุรี",
      },
      {
        title: "กล้องฟิล์มเก่า",
        description: "ทำงานปกติ มีเลนส์ครบ",
        category: "Electronics",
        condition: "Used",
        dealType: "sell",
        priceCash: 3500,
        priceCredit: 0,
        openToOffers: true,
        wantedTags: ["เลนส์กล้อง"],
        wantedText: "เปิดรับข้อเสนอ",
        locationLabel: "ขอนแก่น",
      },
    ];

    for (const d of itemData) {
      const itemId = crypto.randomUUID();
      await db.insert(items).values({
        id: itemId,
        ownerId: demoUserId,
        title: d.title,
        description: d.description,
        category: d.category,
        condition: d.condition,
        dealType: d.dealType,
        priceCash: d.priceCash,
        priceCredit: d.priceCredit,
        openToOffers: d.openToOffers,
        wantedTags: d.wantedTags,
        wantedText: d.wantedText,
        locationLabel: d.locationLabel,
        status: "active",
      });
    }
    console.log("Items seeded");
  }

  console.log("Seed complete");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
