# useResource
Using async resources without tears (and boilerplate)

## How to use
```tsx
interface User {
  id: string;
  name: string;
}

// Each function should return a promise that returns a `User` when resolves
const [state, actions] = useResource<User>({
  get: api.user.get,
  list: api.user.list,
  create: api.user.create,
  update: api.user.update,
  remove: api.user.remove,
});
```

## Types
```ts
type AsyncAction = 'get' | 'list' | 'update' | 'remove' | 'create';

interface Meta {
  meta: {
    action: null | AsyncAction;
    error: null | string;
  };
}

interface State<T> {
  resources: (T & Meta)[];
  selected: null | (T & Meta);
  action: null | string;
  error: null | string;
}

interface Methods<T> {
  get: (id: string, options?: any) => Promise<T>;
  list: (options?: any) => Promise<T[]>;
  update: (resource: Partial<T>, options?: any) => Promise<T>;
  remove: (id: string, options?: any) => Promise<string>;
  create: (resource: Partial<T>, options?: any) => Promise<T>;
  select: (id: string) => T;
}
```
