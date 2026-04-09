---
title: No Direct Supabase Calls in Components
impact: HIGH
impactDescription: 관심사 분리, 테스트 용이성, 에러 처리 일관성
tags: [supabase, architecture, data]
---

컴포넌트에서 직접 Supabase를 호출하지 않습니다. hooks를 사용하세요.

## Incorrect

```tsx
// ❌ 컴포넌트에서 직접 Supabase 호출
import { supabase } from '@/env/supabase.client';

function ElementsList() {
  const [elements, setElements] = useState([]);

  useEffect(() => {
    const fetchElements = async () => {
      const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('project_id', projectId);

      if (error) console.error(error);
      else setElements(data);
    };

    fetchElements();
  }, [projectId]);

  const updateElement = async (id, props) => {
    await supabase
      .from('elements')
      .update(props)
      .eq('id', id);
  };

  return <div>{/* render */}</div>;
}
```

## Correct

```tsx
// ✅ hooks 사용
import { useElements, useUpdateElement } from '@/hooks/useElements';

function ElementsList() {
  const { data: elements, isLoading, error } = useElements(projectId);
  const updateElement = useUpdateElement();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {elements.map(el => (
        <Element
          key={el.id}
          element={el}
          onUpdate={(props) => updateElement.mutate({ id: el.id, props })}
        />
      ))}
    </div>
  );
}

// hooks/useElements.ts
export function useElements(projectId: string) {
  return useQuery({
    queryKey: ['elements', projectId],
    queryFn: () => elementsService.getByProject(projectId)
  });
}

export function useUpdateElement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: elementsService.update,
    onSuccess: () => queryClient.invalidateQueries(['elements'])
  });
}
```
