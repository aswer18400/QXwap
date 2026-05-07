import { Hono, type Context } from "hono";
import { appRouter } from "../router";
import { getSession, parseCookies } from "../lib/session";

const rest = new Hono();

type Caller = ReturnType<typeof appRouter.createCaller>;

async function createCaller(c: Context): Promise<Caller> {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const sid = cookies["sid"] || "";
  const session = sid ? await getSession(sid) : null;
  return appRouter.createCaller({
    req: c.req.raw,
    resHeaders: new Headers(),
    userId: session?.userId || null,
    email: session?.email || null,
  });
}

async function readJson(c: Context) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function normalizeListQuery(c: Context) {
  const q = c.req.query();
  return {
    q: q.q,
    category: q.category,
    dealType: q.dealType,
    minPrice: q.minPrice,
    maxPrice: q.maxPrice,
    wantedTag: q.wantedTag,
    ownerId: q.ownerId,
    status: q.status,
    condition: q.condition,
    sort: q.sort,
    limit: q.limit,
    offset: q.offset,
    openToOffers: q.openToOffers === "true" ? true : undefined,
    following: q.following === "true" ? true : undefined,
    fastResponder: q.fastResponder === "true" ? true : undefined,
    featured: q.featured === "true" ? true : undefined,
  };
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const isUnauthorized = message.toLowerCase().includes("unauthorized") || message.includes("เข้าสู่ระบบ");
  return {
    body: { success: false, message, error: message },
    status: isUnauthorized ? 401 : 400,
  } as const;
}

rest.get("/items", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.item.list(normalizeListQuery(c)));
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.post("/items", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.item.create(await readJson(c)));
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.get("/items/:id", async (c) => {
  try {
    const caller = await createCaller(c);
    const item = await caller.item.byId({ id: c.req.param("id") });
    return item ? c.json(item) : c.json({ error: "Not found" }, 404);
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

async function updateItem(c: Context) {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.item.update({ id: c.req.param("id"), ...(await readJson(c)) }));
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
}

rest.put("/items/:id", updateItem);
rest.patch("/items/:id", updateItem);

rest.delete("/items/:id", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.item.delete({ id: c.req.param("id") }));
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.get("/offers", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.offer.list());
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.post("/offers", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.offer.create(await readJson(c)));
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.get("/offers/:id", async (c) => {
  try {
    const caller = await createCaller(c);
    const offer = await caller.offer.byId({ id: c.req.param("id") });
    return offer ? c.json(offer) : c.json({ error: "Not found" }, 404);
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

for (const action of ["accept", "reject", "cancel", "confirm"] as const) {
  rest.post(`/offers/:id/${action}`, async (c) => {
    try {
      const caller = await createCaller(c);
      return c.json(await caller.offer[action]({ id: c.req.param("id") }));
    } catch (error) {
      const err = routeError(error);
      return c.json(err.body, err.status);
    }
  });
}

rest.get("/wallet", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.wallet.get());
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.get("/transactions", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.wallet.transactions());
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.get("/notifications", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.notification.list());
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

rest.post("/notifications/read", async (c) => {
  try {
    const caller = await createCaller(c);
    return c.json(await caller.notification.read(await readJson(c)));
  } catch (error) {
    const err = routeError(error);
    return c.json(err.body, err.status);
  }
});

export default rest;
