import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Loader2, Trash2, Calendar, Check, AlertCircle } from "lucide-react";
import { 
  useGetTask, 
  useUpdateTask, 
  useDeleteTask,
  getGetTaskQueryKey,
  getListTasksQueryKey,
  getGetTasksSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function TaskDetailPage() {
  const { id } = useParams();
  const taskId = id ? parseInt(id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = useRef(false);

  const { data: task, isLoading, isError } = useGetTask(taskId, {
    query: {
      enabled: !!taskId,
      queryKey: getGetTaskQueryKey(taskId)
    }
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  useEffect(() => {
    if (task && !isEditing.current) {
      form.reset({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
      });
    }
  }, [task, form]);

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetTaskQueryKey(taskId), data);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTasksSummaryQueryKey() });
        toast({ title: "Task saved" });
        isEditing.current = false;
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update task.",
          variant: "destructive",
        });
      }
    }
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTasksSummaryQueryKey() });
        toast({ title: "Task deleted" });
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete task.",
          variant: "destructive",
        });
      }
    }
  });

  const toggleStatus = useUpdateTask({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetTaskQueryKey(taskId), data);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTasksSummaryQueryKey() });
        if (data.completed) {
          toast({ title: "Task completed!", description: "Great job." });
        }
      }
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    isEditing.current = true;
    updateTask.mutate({ 
      id: taskId, 
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
      } 
    });
  };

  const handleToggle = () => {
    if (task) {
      toggleStatus.mutate({ id: taskId, data: { completed: !task.completed } });
    }
  };

  if (isError) {
    return (
      <Layout showBack>
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-serif font-bold mb-2">Task not found</h2>
          <p className="text-muted-foreground mb-6">The task you're looking for doesn't exist or was deleted.</p>
          <Button onClick={() => setLocation("/")}>Go to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      showBack 
      title={isLoading ? "Loading..." : "Edit Task"}
      actions={
        task && (
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task from your notebook.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteTask.mutate({ id: taskId })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteTask.isPending}
                  >
                    {deleteTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              variant={task.completed ? "outline" : "default"} 
              className={cn("gap-2", task.completed && "border-primary text-primary")}
              onClick={handleToggle}
              disabled={toggleStatus.isPending}
            >
              {toggleStatus.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : task.completed ? (
                <><Check className="w-4 h-4" /> Completed</>
              ) : (
                <><Check className="w-4 h-4" /> Mark Complete</>
              )}
            </Button>
          </div>
        )
      }
    >
      <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm max-w-2xl">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {task && (
                <div className="flex items-center gap-4 pb-4 border-b border-border text-sm text-muted-foreground font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created {format(new Date(task.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="uppercase">Priority: {task.priority}</span>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-serif text-base">What needs to be done?</FormLabel>
                    <FormControl>
                      <Input 
                        className={cn(
                          "text-lg h-12 bg-background border-input focus-visible:ring-primary font-sans",
                          task?.completed && "line-through opacity-70"
                        )}
                        disabled={task?.completed}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-serif text-base">Notes & Details <span className="text-muted-foreground text-sm font-sans font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        className={cn(
                          "resize-none h-32 bg-background border-input focus-visible:ring-primary font-sans",
                          task?.completed && "opacity-70"
                        )}
                        disabled={task?.completed}
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-serif text-base">Priority Level</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={task?.completed}
                        className={cn(
                          "flex flex-col sm:flex-row gap-3",
                          task?.completed && "opacity-70 pointer-events-none"
                        )}
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0 bg-background border border-input p-3 rounded-lg flex-1 hover:border-primary/50 transition-colors cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:bg-secondary/5">
                          <FormControl>
                            <RadioGroupItem value="low" className="text-secondary border-secondary" />
                          </FormControl>
                          <FormLabel className="font-medium font-sans cursor-pointer w-full">Low</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 bg-background border border-input p-3 rounded-lg flex-1 hover:border-primary/50 transition-colors cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                          <FormControl>
                            <RadioGroupItem value="medium" className="text-primary border-primary" />
                          </FormControl>
                          <FormLabel className="font-medium font-sans cursor-pointer w-full">Medium</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 bg-background border border-input p-3 rounded-lg flex-1 hover:border-primary/50 transition-colors cursor-pointer [&:has([data-state=checked])]:border-destructive [&:has([data-state=checked])]:bg-destructive/5">
                          <FormControl>
                            <RadioGroupItem value="high" className="text-destructive border-destructive" />
                          </FormControl>
                          <FormLabel className="font-medium font-sans cursor-pointer w-full">High</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!task?.completed && (
                <div className="pt-4 flex items-center justify-end gap-3 border-t">
                  <Button 
                    type="submit" 
                    disabled={updateTask.isPending || (!form.formState.isDirty)} 
                    className="font-medium px-8"
                  >
                    {updateTask.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        )}
      </div>
    </Layout>
  );
}
