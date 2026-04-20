import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useCreateTask, getListTasksQueryKey, getGetTasksSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(["low", "medium", "high"]),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function TaskFormPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTasksSummaryQueryKey() });
        toast({
          title: "Task created",
          description: "Your task has been added to the notebook.",
        });
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to create task. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    createTask.mutate({ data });
  };

  return (
    <Layout showBack title="New Task">
      <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-serif text-base">What needs to be done?</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Renew car registration" 
                      className="text-lg h-12 bg-background border-input focus-visible:ring-primary font-sans" 
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
                      placeholder="Add any extra context or links here..." 
                      className="resize-none h-32 bg-background border-input focus-visible:ring-primary font-sans"
                      {...field} 
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
                      className="flex flex-col sm:flex-row gap-3"
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

            <div className="pt-4 flex items-center justify-end gap-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setLocation("/")}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending} className="font-medium px-8">
                {createTask.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Task
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
