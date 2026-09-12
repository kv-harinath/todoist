import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client.js'

export function useFilters() {
  return useQuery({ queryKey: ['filters'], queryFn: api.listFilters })
}

export function useCreateFilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createFilter,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filters'] }),
  })
}

export function useUpdateFilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateFilter(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filters'] }),
  })
}

export function useDeleteFilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteFilter,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filters'] }),
  })
}
