import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client.js'

export function useTaskReminders(taskId) {
  return useQuery({
    queryKey: ['reminders', 'task', taskId],
    queryFn: () => api.listReminders(taskId),
    enabled: Boolean(taskId),
  })
}

export function useDueReminders() {
  return useQuery({
    queryKey: ['reminders', 'due'],
    queryFn: api.dueReminders,
    refetchInterval: 30000,
  })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  })
}

export function useDismissReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.dismissReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  })
}
