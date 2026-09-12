import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client.js'

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: api.listProjects })
}

export function useProject(id) {
  return useQuery({ queryKey: ['projects', id], queryFn: () => api.getProject(id), enabled: Boolean(id) })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
