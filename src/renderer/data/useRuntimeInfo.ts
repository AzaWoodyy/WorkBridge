import { useQuery } from '@tanstack/react-query'
export function useRuntimeInfo() {
  return useQuery({
    queryKey: ['runtime-info'],
    queryFn: () => window.workbridge.getRuntimeInfo(),
    staleTime: Infinity
  })
}
