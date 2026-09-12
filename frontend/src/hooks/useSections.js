import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client.js'

export function useSections(projectId) {
  return useQuery({
    queryKey: ['sections', projectId],
    queryFn: () => api.listSections(projectId),
    enabled: Boolean(projectId),
  })
}

export function useCreateSection(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.createSection(projectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections', projectId] }),
  })
}

export function useUpdateSection(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateSection(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections', projectId] }),
  })
}

export function useDeleteSection(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
