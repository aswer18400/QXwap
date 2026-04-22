import { Router } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateTaskBody,
  UpdateTaskBody,
  ListTasksQueryParams,
  GetTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { sendError, sendValidationError } from "../lib/http";

const router = Router();

function serializeTask(task: typeof tasksTable.$inferSelect) {
  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

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
    sendValidationError(res, "Invalid task query", parsed.error);
    return;
  }

  const { status } = parsed.data;

  let tasks: typeof tasksTable.$inferSelect[];
  if (status === "completed") {
    tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.completed, true))
      .orderBy(desc(tasksTable.createdAt));
  } else if (status === "pending") {
    tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.completed, false))
      .orderBy(desc(tasksTable.createdAt));
  } else {
    tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
  }

  res.json(tasks.map(serializeTask));
  return;
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "Invalid task body", parsed.error);
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

  res.status(201).json(serializeTask(task));
  return;
});

router.get("/tasks/:id", async (req, res) => {
  const parsed = GetTaskParams.safeParse(req.params);
  if (!parsed.success) {
    sendValidationError(res, "Invalid task id", parsed.error);
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, parsed.data.id));
  if (!task) {
    sendError(res, 404, "not_found", "Task not found");
    return;
  }

  res.json(serializeTask(task));
  return;
});

router.patch("/tasks/:id", async (req, res) => {
  const paramsParsed = UpdateTaskParams.safeParse(req.params);
  if (!paramsParsed.success) {
    sendValidationError(res, "Invalid task id", paramsParsed.error);
    return;
  }

  const bodyParsed = UpdateTaskBody.safeParse(req.body);
  if (!bodyParsed.success) {
    sendValidationError(res, "Invalid task body", bodyParsed.error);
    return;
  }

  const updates: Partial<typeof tasksTable.$inferInsert> = {};
  const body = bodyParsed.data;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description ?? null;
  if (body.completed !== undefined) updates.completed = body.completed;
  if (body.priority !== undefined) updates.priority = body.priority;

  if (Object.keys(updates).length === 0) {
    sendError(
      res,
      400,
      "bad_request",
      "Task update requires at least one mutable field",
    );
    return;
  }

  updates.updatedAt = new Date();

  const [task] = await db
    .update(tasksTable)
    .set(updates)
    .where(eq(tasksTable.id, paramsParsed.data.id))
    .returning();

  if (!task) {
    sendError(res, 404, "not_found", "Task not found");
    return;
  }

  res.json(serializeTask(task));
  return;
});

router.delete("/tasks/:id", async (req, res) => {
  const parsed = DeleteTaskParams.safeParse(req.params);
  if (!parsed.success) {
    sendValidationError(res, "Invalid task id", parsed.error);
    return;
  }

  const result = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, parsed.data.id))
    .returning();
  if (!result.length) {
    sendError(res, 404, "not_found", "Task not found");
    return;
  }

  res.status(204).send();
  return;
});

export default router;
