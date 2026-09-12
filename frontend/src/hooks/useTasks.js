import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client.js'

// All task "views" (inbox/today/upcoming/project/filter/label) share
// the 'tasksView' query key prefix so a single mutation can invalidate
// every visible task list at once, rather than tracking each view's
// exact key shape.

export function useInboxTasks() {
  return useQuery({ queryKey: ['tasksView', 'inbox'], queryFn: api.viewInbox })
}

export function useTodayTasks() {
  return useQuery({ queryKey: ['tasksView', 'today'], queryFn: api.viewToday })
}

export function useUpcomingTasks(days = 7) {
  return useQuery({ queryKey: ['tasksView', 'upcoming', days], queryFn: () => api.viewUpcoming(days) })
}

export function useProjectTasks(projectId) {
  return useQuery({
    queryKey: ['tasksView', 'project', projectId],
    queryFn: () => api.listTasks({ project_id: projectId }),
    enabled: Boolean(projectId),
  })
}

export function useFilterTasks(filterId) {
  return useQuery({
    queryKey: ['tasksView', 'filter', filterId],
    queryFn: () => api.listTasks({ filter_id: filterId }),
    enabled: Boolean(filterId),
  })
}

export function useLabelTasks(labelId) {
  return useQuery({
    queryKey: ['tasksView', 'label', labelId],
    queryFn: () => api.listTasks({ label_id: labelId }),
    enabled: Boolean(labelId),
  })
}

export function useSearchTasks(q) {
  return useQuery({
    queryKey: ['tasksView', 'search', q],
    queryFn: () => api.listTasks({ q }),
    enabled: Boolean(q && q.trim()),
  })
}

function useInvalidateTaskViews() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['tasksView'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }
}

export function useCreateTask() {
  const invalidate = useInvalidateTaskViews()
  return useMutation({ mutationFn: api.createTask, onSuccess: invalidate })
}

export function useUpdateTask() {
  const invalidate = useInvalidateTaskViews()
  return useMutation({ mutationFn: ({ id, data }) => api.updateTask(id, data), onSuccess: invalidate })
}

export function useDeleteTask() {
  const invalidate = useInvalidateTaskViews()
  return useMutation({ mutationFn: api.deleteTask, onSuccess: invalidate })
}

export function useCompleteTask() {
  const invalidate = useInvalidateTaskViews()
  return useMutation({ mutationFn: api.completeTask, onSuccess: invalidate })
}

export function useReopenTask() {
  const invalidate = useInvalidateTaskViews()
  return useMutation({ mutationFn: api.reopenTask, onSuccess: invalidate })
}

export function useReorderTask() {
  const invalidate = useInvalidateTaskViews()
  return useMutation({
    mutationFn: ({ id, sortOrder }) => api.reorderTask(id, sortOrder),
    onSuccess: invalidate,
  })
}
