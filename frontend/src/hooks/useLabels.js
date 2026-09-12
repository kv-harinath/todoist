import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client.js'

export function useLabels() {
  return useQuery({ queryKey: ['labels'], queryFn: api.listLabels })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createLabel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels'] }),
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateLabel(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels'] }),
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
