# useResource
Using async resources without tears (and boilerplate)

## Demo
[Codesandbox](https://codesandbox.io/s/useresource-hook-demo-y9sw9)

## Installation
```bash
yarn add use-resource-hook
```

## How to use
```tsx
interface User {
  id: string;
  name: string;
}

// Each function should return a promise that returns a `User` when resolves
const [state, actions] = useResource<User>(); // `Options` can be passed

actions.list(api.users.list());

/*
When the promise is called
state => {
  error: null,
  action: 'list',
  resources: [],
  selected: null
}

Once is resolved
state.resources => [{id: "1", name: "Gonzalo", meta: {error: null, action: null}}]

On Error
state => {
  error: 'Error returned by the server',
  action: null,
  resources: [],
  selected: null
}
*/

// Also you can use its promise
actions.list(api.users.list()).then((users: User[]) => actions.select(users[0].id));

/*
state.selected => {id: "1", name: "Gonzalo", meta: {error: null, action: null}}
*/
```

## Types
```ts
type AsyncAction = 'get' | 'list' | 'update' | 'remove' | 'create';

interface Options {
  identifier: string // Property used to identify each resource, default: 'id'
}

interface ListOptions {
  reset?: boolean;
}

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
  get: (identifier: string, promise: Promise<T>) => Promise<T>;
  list: (promise: Promise<T[]>, options?: ListOptions) => Promise<T[]>;
  update: (identifier: string, promise: Promise<T>) => Promise<T>;
  remove: (identifier: string, promise: Promise<T | string | void>) => Promise<string>;
  create: (promise: Promise<T>) => Promise<T>;
  select: (identifier: string) => void;
  reset: () => void;
}
```
