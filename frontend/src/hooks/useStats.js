import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client.js'

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: api.statsSummary })
}
