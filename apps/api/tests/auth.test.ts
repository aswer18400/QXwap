import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server.js";

describe("QXwap auth flow", async () => {
  const app = await createApp();

  it("normalizes email, signs up, keeps session, signs out, and signs back in", async () => {
    const agent = request.agent(app);
    const unique = Date.now();
    const email = `auth-${unique}@qxwap.app`;

    const signup = await agent
      .post("/api/auth/signup")
      .send({ email: email.toUpperCase(), password: "password123" });

    expect(signup.status).toBe(201);
    expect(signup.body.user).toBeTruthy();
    expect(signup.body.user.email).toBe(email);

    const meAfterSignup = await agent.get("/api/auth/me");
    expect(meAfterSignup.status).toBe(200);
    expect(meAfterSignup.body.user.email).toBe(email);

    const signout = await agent.post("/api/auth/signout");
    expect(signout.status).toBe(200);

    const meAfterSignout = await agent.get("/api/auth/me");
    expect(meAfterSignout.status).toBe(200);
    expect(meAfterSignout.body.user).toBeNull();

    const signin = await agent
      .post("/api/auth/signin")
      .send({ email: email.toUpperCase(), password: "password123" });

    expect(signin.status).toBe(200);
    expect(signin.body.user.email).toBe(email);
  });

  it("returns 409 for duplicate signup instead of 500", async () => {
    const email = `duplicate-${Date.now()}@qxwap.app`;

    const first = await request(app)
      .post("/api/auth/signup")
      .send({ email, password: "password123" });

    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post("/api/auth/signup")
      .send({ email: email.toUpperCase(), password: "password123" });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("EMAIL_EXISTS");
  });

  it("returns 401 for wrong password", async () => {
    const email = `wrong-password-${Date.now()}@qxwap.app`;

    const signup = await request(app)
      .post("/api/auth/signup")
      .send({ email, password: "password123" });

    expect(signup.status).toBe(201);

    const wrong = await request(app)
      .post("/api/auth/signin")
      .send({ email, password: "wrong-password" });

    expect(wrong.status).toBe(401);
    expect(wrong.body.error).toBe("INVALID_LOGIN");
  });

  it("returns validation error for short password", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: `short-${Date.now()}@qxwap.app`, password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });
});
