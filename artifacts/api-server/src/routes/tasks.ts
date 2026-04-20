import { Router } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody, ListTasksQueryParams, GetTaskParams, UpdateTaskParams, DeleteTaskParams } from "@workspace/api-zod";

const router = Router();

router.get("/tasks/stats/summary", async (req, res) => {
  const all = await db.select().from(tasksTable);
  const total = all.length;
  const completed = all.filter((t) => t.completed).length;
  const pending = total - completed;
  const highPriority = all.filter((t) => t.priority === "high" && !t.completed).length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  res.json({ total, completed, pending, highPriority, completionRate });
});

router.get("/tasks", async (req, res) => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status } = parsed.data;

  let tasks;
  if (status === "completed") {
    tasks = await db.select().from(tasksTable).where(eq(tasksTable.completed, true)).orderBy(desc(tasksTable.createdAt));
  } else if (status === "pending") {
    tasks = await db.select().from(tasksTable).where(eq(tasksTable.completed, false)).orderBy(desc(tasksTable.createdAt));
  } else {
    tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
  }

  const serialized = tasks.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  res.json(serialized);
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
    })
    .returning();

  res.status(201).json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

router.get("/tasks/:id", async (req, res) => {
  const parsed = GetTaskParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, parsed.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

router.patch("/tasks/:id", async (req, res) => {
  const paramsParsed = UpdateTaskParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const bodyParsed = UpdateTaskBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const updates: Partial<typeof tasksTable.$inferInsert> = {};
  const body = bodyParsed.data;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description ?? null;
  if (body.completed !== undefined) updates.completed = body.completed;
  if (body.priority !== undefined) updates.priority = body.priority;
  updates.updatedAt = new Date();

  const [task] = await db
    .update(tasksTable)
    .set(updates)
    .where(eq(tasksTable.id, paramsParsed.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

router.delete("/tasks/:id", async (req, res) => {
  const parsed = DeleteTaskParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const result = await db.delete(tasksTable).where(eq(tasksTable.id, parsed.data.id)).returning();
  if (!result.length) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.status(204).send();
});

export default router;
