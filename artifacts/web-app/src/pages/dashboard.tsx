import { useState } from "react";
import { Link } from "wouter";
import { Plus, LayoutGrid, CheckCircle2, CircleDashed, AlertTriangle, Layers } from "lucide-react";
import { 
  useListTasks, 
  useGetTasksSummary, 
  useUpdateTask,
  getListTasksQueryKey,
  getGetTasksSummaryQueryKey,
  ListTasksStatus 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListTasksStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: summary, isLoading: isLoadingSummary } = useGetTasksSummary();
  const { data: tasks, isLoading: isLoadingTasks } = useListTasks({ status: statusFilter !== "all" ? statusFilter : undefined });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTasksSummaryQueryKey() });
      }
    }
  });

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } });
  };

  const filteredTasks = tasks?.filter(t => priorityFilter === "all" || t.priority === priorityFilter);

  return (
    <Layout
      actions={
        <Button asChild className="gap-2">
          <Link href="/tasks/new">
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {isLoadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-card border border-card-border" />
          ))
        ) : summary ? (
          <>
            <StatCard label="Total Tasks" value={summary.total} icon={<LayoutGrid className="w-4 h-4" />} />
            <StatCard label="Completed" value={summary.completed} icon={<CheckCircle2 className="w-4 h-4 text-primary" />} />
            <StatCard label="Pending" value={summary.pending} icon={<CircleDashed className="w-4 h-4 text-muted-foreground" />} />
            <StatCard label="High Priority" value={summary.highPriority} icon={<AlertTriangle className="w-4 h-4 text-destructive" />} />
          </>
        ) : null}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ListTasksStatus)}>
          <TabsList className="grid w-full grid-cols-3 h-10 w-[300px]">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Done</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">Priority:</span>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoadingTasks ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-card" />
          ))
        ) : filteredTasks && filteredTasks.length > 0 ? (
          <div className="grid gap-3">
            {filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onToggle={handleToggleTask}
                isToggling={updateTask.isPending && updateTask.variables?.id === task.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 border border-dashed rounded-xl bg-muted/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-serif font-bold text-foreground mb-1">No tasks found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {statusFilter === 'completed' 
                ? "You haven't completed any tasks yet."
                : "Your notebook is empty. Create a task to get started."}
            </p>
            <Button asChild variant="outline">
              <Link href="/tasks/new">Create your first task</Link>
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-card p-5 rounded-xl border border-card-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-serif font-bold text-card-foreground">
        {value}
      </div>
    </div>
  );
}
