import { format } from "date-fns";
import { Link } from "wouter";
import { Check, Clock, AlertCircle } from "lucide-react";
import { Task, TaskPriority } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onToggle: (id: number, completed: boolean) => void;
  isToggling?: boolean;
}

export function TaskCard({ task, onToggle, isToggling }: TaskCardProps) {
  const isCompleted = task.completed;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl border border-card-border p-4 shadow-sm transition-all duration-300",
        "hover:shadow-md hover:border-primary/20",
        isCompleted && "opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
        isToggling && "pointer-events-none animate-pulse"
      )}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggle(task.id, !isCompleted)}
          className={cn(
            "mt-1 shrink-0 w-6 h-6 rounded border flex items-center justify-center transition-all duration-300",
            isCompleted
              ? "bg-primary border-primary text-primary-foreground scale-100"
              : "bg-background border-muted-foreground/30 text-transparent hover:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none scale-95"
          )}
          title={isCompleted ? "Mark as pending" : "Mark as completed"}
        >
          <Check className={cn("w-4 h-4 transition-transform duration-300", isCompleted ? "scale-100" : "scale-0")} strokeWidth={3} />
        </button>

        <div className="flex-1 min-w-0">
          <Link
            href={`/tasks/${task.id}`}
            className="block group-hover:text-primary transition-colors focus:outline-none focus:underline"
          >
            <h3
              className={cn(
                "text-base font-medium leading-tight mb-1 transition-all duration-300",
                isCompleted ? "line-through text-muted-foreground" : "text-card-foreground"
              )}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {task.description}
              </p>
            )}
          </Link>

          <div className="flex items-center gap-3 mt-3">
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border",
                task.priority === "high" && "bg-destructive/10 text-destructive border-destructive/20",
                task.priority === "medium" && "bg-primary/10 text-primary border-primary/20",
                task.priority === "low" && "bg-secondary/10 text-secondary border-secondary/20"
              )}
            >
              <AlertCircle className="w-3 h-3" />
              <span className="uppercase">{task.priority}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(task.updatedAt), "MMM d")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
