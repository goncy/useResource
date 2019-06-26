import * as React from 'react';

// Input
interface Handlers<T> {
  get: (id: string, options?: any) => Promise<T>;
  list: (options?: any) => Promise<T[]>;
  update: (resource: Partial<T>, options?: any) => Promise<T>;
  remove: (id: string, options?: any) => Promise<void>;
  create: (resource: Partial<T>, options?: any) => Promise<T>;
}

// Output
interface State<T> {
  resources: (T & Meta)[];
  selected: null | (T & Meta);
  action: null | string;
  error: null | string;
}

interface Methods<T> {
  get: (id: string, options?: any) => Promise<T>;
  list: (options?: any) => Promise<T[]>;
  update: (resource: PartialResource<T>, options?: any) => Promise<T>;
  remove: (id: string, options?: any) => Promise<string>;
  create: (resource: Partial<T>, options?: any) => Promise<T>;
  select: (id: string) => T;
}

// Actions
type AsyncAction = 'get' | 'list' | 'update' | 'remove' | 'create';

interface ActionError {
  id: string;
  message: string;
}

type Action<T> =
  | { type: 'GET_RESOURCE_STARTED'; payload: string }
  | { type: 'GET_RESOURCE_RESOLVED'; payload: T }
  | { type: 'GET_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'LIST_RESOURCE_STARTED' }
  | { type: 'LIST_RESOURCE_RESOLVED'; payload: T[] }
  | { type: 'LIST_RESOURCE_REJECTED'; payload: string }
  | { type: 'UPDATE_RESOURCE_STARTED'; payload: PartialResource<T> }
  | { type: 'UPDATE_RESOURCE_RESOLVED'; payload: T }
  | { type: 'UPDATE_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'CREATE_RESOURCE_STARTED'; payload: Partial<T> }
  | { type: 'CREATE_RESOURCE_RESOLVED'; payload: T }
  | { type: 'CREATE_RESOURCE_REJECTED'; payload: string }
  | { type: 'REMOVE_RESOURCE_STARTED'; payload: string }
  | { type: 'REMOVE_RESOURCE_RESOLVED'; payload: string }
  | { type: 'REMOVE_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'SELECT_RESOURCE'; payload: string };

// Helpers
type Dictionary<T> = Record<string, T>;

interface ResourceManager<T> {
  resources: Dictionary<T & Meta>;
  action: null | AsyncAction;
  error: null | string;
  selected: null | string;
}

type PartialResource<T> = Partial<T> & Identified;

interface Meta {
  meta: {
    action: null | AsyncAction;
    error: null | string;
  };
}

interface Identified {
  id: string;
}

const EMPTY_RESOURCE_MANAGER = {
  resources: {},
  action: null,
  error: null,
  selected: null,
};

function resourceManagerReducer<T extends Identified>(
  state: ResourceManager<T> = EMPTY_RESOURCE_MANAGER,
  action: Action<T>
): ResourceManager<T> {
  switch (action.type) {
    // STARTED
    case 'GET_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'get',
        resources: {
          ...state.resources,
          [action.payload]: {
            ...state.resources[action.payload],
            id: action.payload,
            meta: {
              action: 'get',
              error: null,
            },
          },
        },
      };
    }

    case 'UPDATE_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'update',
        resources: {
          ...state.resources,
          [action.payload.id]: {
            ...state.resources[action.payload.id],
            meta: {
              action: 'update',
              error: null,
            },
          },
        },
      };
    }

    case 'REMOVE_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'remove',
        resources: {
          ...state.resources,
          [action.payload]: {
            ...state.resources[action.payload],
            meta: {
              action: 'remove',
              error: null,
            },
          },
        },
      };
    }

    case 'CREATE_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'create',
      };
    }

    case 'LIST_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'list',
      };
    }

    // RESOLVED
    case 'GET_RESOURCE_RESOLVED':
    case 'UPDATE_RESOURCE_RESOLVED':
    case 'CREATE_RESOURCE_RESOLVED': {
      return {
        ...state,
        selected: action.payload.id,
        error: null,
        action: null,
        resources: {
          ...state.resources,
          [action.payload.id]: {
            ...action.payload,
            meta: {
              action: null,
              error: null,
            },
          },
        },
      };
    }

    case 'LIST_RESOURCE_RESOLVED': {
      return {
        ...state,
        error: null,
        action: null,
        resources: action.payload.reduce(
          (acc: Dictionary<T>, resource: T) =>
            acc[resource.id]
              ? acc
              : {
                  ...acc,
                  [resource.id]: {
                    ...resource,
                    meta: {
                      action: null,
                      error: null,
                    },
                  },
                },
          {}
        ),
      };
    }

    case 'REMOVE_RESOURCE_RESOLVED': {
      const {
        [action.payload]: removedResource,
        ...remainingResources
      } = state.resources;

      return {
        ...state,
        selected: state.selected === action.payload ? null : state.selected,
        error: null,
        action: null,
        resources: remainingResources,
      };
    }

    // REJECTED
    case 'GET_RESOURCE_REJECTED':
    case 'UPDATE_RESOURCE_REJECTED':
    case 'REMOVE_RESOURCE_REJECTED': {
      return {
        ...state,
        error: action.payload.message,
        action: null,
        resources: {
          ...state.resources,
          [action.payload.id]: {
            ...state.resources[action.payload.id],
            meta: {
              action: null,
              error: action.payload.message,
            },
          },
        },
      };
    }

    case 'CREATE_RESOURCE_REJECTED': {
      return {
        ...state,
        error: action.payload,
        action: null,
      };
    }

    // SYNC
    case 'SELECT_RESOURCE': {
      return {
        ...state,
        selected: action.payload,
      };
    }

    default:
      return state;
  }
}

export default function useResource<T extends Identified>(
  handlers: Handlers<T>
): [State<T>, Methods<T>] {
  const reducer = React.useCallback(
    (state: ResourceManager<T>, action: Action<T>): ResourceManager<T> =>
    resourceManagerReducer<T>(state, action),
    []
  );

  const [state, dispatch] = React.useReducer(reducer, EMPTY_RESOURCE_MANAGER);

  const handleGet = React.useCallback((id: string, options?: any): Promise<T> => {
    dispatch({ type: 'GET_RESOURCE_STARTED', payload: id });

    return handlers
      .get(id, options)
      .then(
        (resource: T): T => {
          dispatch({
            type: 'GET_RESOURCE_RESOLVED',
            payload: resource,
          });

          return resource;
        }
      )
      .catch((error: Error) => {
        dispatch({
          type: 'GET_RESOURCE_REJECTED',
          payload: { id, message: error.message },
        });

        throw error.message;
      });
  }, [handlers, dispatch])

  const handleList = React.useCallback((options?: any): Promise<T[]> => {
    dispatch({ type: 'LIST_RESOURCE_STARTED' });

    return handlers
      .list(options)
      .then((resources: T[]): T[] => {
        dispatch({
          type: 'LIST_RESOURCE_RESOLVED',
          payload: resources,
        });

        return resources;
      })
      .catch((error: Error) => {
        dispatch({
          type: 'LIST_RESOURCE_REJECTED',
          payload: error.message,
        });

        throw error.message;
      });
  }, [handlers, dispatch])

  const handleUpdate = React.useCallback((resource: PartialResource<T>, options?: any): Promise<T> => {
    dispatch({ type: 'UPDATE_RESOURCE_STARTED', payload: resource });

    return handlers
      .update(resource, options)
      .then(
        (resource: T): T => {
          dispatch({
            type: 'UPDATE_RESOURCE_RESOLVED',
            payload: resource,
          });

          return resource;
        }
      )
      .catch((error: Error) => {
        dispatch({
          type: 'UPDATE_RESOURCE_REJECTED',
          payload: { id: resource.id, message: error.message },
        });

        throw error.message;
      });
  }, [handlers, dispatch])

  const handleCreate = React.useCallback((resource: Partial<T>, options?: any): Promise<T> => {
    dispatch({ type: 'CREATE_RESOURCE_STARTED', payload: resource });

    return handlers
      .create(resource, options)
      .then(
        (resource: T): T => {
          dispatch({
            type: 'CREATE_RESOURCE_RESOLVED',
            payload: resource,
          });

          return resource;
        }
      )
      .catch((error: Error) => {
        dispatch({
          type: 'CREATE_RESOURCE_REJECTED',
          payload: error.message,
        });

        throw error.message;
      });
  }, [handlers, dispatch])

  const handleRemove = React.useCallback((id: string, options?: any): Promise<string> => {
    dispatch({ type: 'REMOVE_RESOURCE_STARTED', payload: id });

    return handlers
      .remove(id, options)
      .then((): string => {
        dispatch({
          type: 'REMOVE_RESOURCE_RESOLVED',
          payload: id,
        });

        return id;
      })
      .catch((error: Error) => {
        dispatch({
          type: 'REMOVE_RESOURCE_REJECTED',
          payload: { id, message: error.message },
        });

        throw error.message;
      });
  }, [handlers, dispatch])

  const handleSelect = React.useCallback((id: string) => {
    dispatch({ type: 'SELECT_RESOURCE', payload: id });

    return state.resources[id];
  }, [dispatch, state.resources])

  const memoizedState = React.useMemo(() => ({
    resources: Object.values(state.resources),
    selected: state.selected ? state.resources[state.selected] : null,
    action: state.action,
    error: state.error,
  }), [state.resources, state.selected, state.action, state.error])

  const memoizedMethods = React.useMemo(() => ({
    get: handleGet,
    list: handleList,
    update: handleUpdate,
    remove: handleRemove,
    create: handleCreate,
    select: handleSelect,
  }), [handleGet, handleList, handleUpdate, handleRemove, handleCreate, handleSelect])

  return [
    memoizedState,
    memoizedMethods
  ];
}
