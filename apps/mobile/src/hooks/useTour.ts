import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEMO_TOUR_ID } from '../config';
import { getTour, optimizeTour, recalculateTour, reverseTour } from '../services/api';
import type { Tour } from '../types';

export function useTour(id = DEMO_TOUR_ID) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['tour', id],
    queryFn: () => getTour(id),
  });

  const write = (tour: Tour) => client.setQueryData(['tour', id], tour);

  const optimize = useMutation({ mutationFn: () => optimizeTour(id), onSuccess: write });
  const reverse = useMutation({ mutationFn: () => reverseTour(id), onSuccess: write });
  const recalculate = useMutation({ mutationFn: () => recalculateTour(id), onSuccess: write });

  return {
    tour: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    optimize: () => optimize.mutateAsync(),
    reverse: () => reverse.mutateAsync(),
    recalculate: () => recalculate.mutateAsync(),
    busy: optimize.isPending || reverse.isPending || recalculate.isPending,
  };
}
