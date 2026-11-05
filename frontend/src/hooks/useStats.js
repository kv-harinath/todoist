import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client.js'

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: api.statsSummary })
}

export function useUpdateGoals() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.updateGoals,
    onSuccess: (summary) => queryClient.setQueryData(['stats'], summary),
  })
}
