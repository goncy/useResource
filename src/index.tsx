import * as React from 'react';

// Output
interface State<T> {
  list: (T & Meta)[];
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

interface Options {
  identifier: string;
}

// Methods options
interface ListOptions {
  merge?: boolean;
}

// Actions
type AsyncAction = 'get' | 'list' | 'update' | 'remove' | 'create';

interface ActionError {
  identifier: string;
  message: string;
}

type Action<T = any> =
  | { type: 'RESET'; }
  | { type: 'GET_RESOURCE_STARTED'; payload: string }
  | { type: 'GET_RESOURCE_RESOLVED'; payload: T }
  | { type: 'GET_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'LIST_RESOURCE_STARTED' }
  | { type: 'LIST_RESOURCE_RESOLVED'; payload: T[]; meta: ListOptions }
  | { type: 'LIST_RESOURCE_REJECTED'; payload: string }
  | { type: 'UPDATE_RESOURCE_STARTED'; payload: string }
  | { type: 'UPDATE_RESOURCE_RESOLVED'; payload: T }
  | { type: 'UPDATE_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'CREATE_RESOURCE_STARTED' }
  | { type: 'CREATE_RESOURCE_RESOLVED'; payload: T }
  | { type: 'CREATE_RESOURCE_REJECTED'; payload: string }
  | { type: 'REMOVE_RESOURCE_STARTED'; payload: string }
  | { type: 'REMOVE_RESOURCE_RESOLVED'; payload: string }
  | { type: 'REMOVE_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'SELECT_RESOURCE'; payload: string };

// Helpers
type Dictionary<T> = Record<string, T>;

interface ResourceManager {
  list: Dictionary<any & Meta>;
  action: null | AsyncAction;
  error: null | string;
  selected: null | string;
}

interface Meta {
  meta: {
    action: null | AsyncAction;
    error: null | string;
  };
}

const EMPTY_RESOURCE_MANAGER = {
  list: {},
  action: null,
  error: null,
  selected: null,
};

const DEFAULT_OPTIONS = {
  identifier: 'id'
}

function resourceManagerReducer(
  state: ResourceManager = EMPTY_RESOURCE_MANAGER,
  action: Action,
  options: Options = DEFAULT_OPTIONS
): ResourceManager {
  switch (action.type) {
    // STARTED
    case 'GET_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'get',
        list: {
          ...state.list,
          [action.payload]: {
            ...state.list[action.payload],
            [options.identifier]: action.payload,
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
        list: {
          ...state.list,
          [action.payload]: {
            ...state.list[action.payload],
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
        list: {
          ...state.list,
          [action.payload]: {
            ...state.list[action.payload],
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
        error: null,
        action: null,
        list: {
          ...state.list,
          [action.payload[options.identifier]]: {
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
        list: action.payload.reduce(
          (acc: Dictionary<any>, resource: any) =>
            acc[resource[options.identifier]]
              ? acc
              : {
                  ...acc,
                  [resource[options.identifier]]: {
                    ...resource,
                    meta: {
                      action: null,
                      error: null,
                    },
                  },
                },
          action.meta.merge ? state.list : {}
        ),
      };
    }

    case 'REMOVE_RESOURCE_RESOLVED': {
      const {
        [action.payload]: removedResource,
        ...remainingResources
      } = state.list;

      return {
        ...state,
        selected: state.selected === action.payload ? null : state.selected,
        error: null,
        action: null,
        list: remainingResources,
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
        list: {
          ...state.list,
          [action.payload.identifier]: {
            ...state.list[action.payload.identifier],
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

    // RESET
    case 'RESET': {
      return EMPTY_RESOURCE_MANAGER;
    }

    // DEFAULT
    default:
      return state;
  }
}

export default function useResource<T = any>(options?: Options): [State<T>, Methods<T>] {
  const reducer = React.useCallback(
    (state: ResourceManager, action: Action): ResourceManager =>
    resourceManagerReducer(state, action, options),
    [options]
  );

  const [state, dispatch] = React.useReducer(reducer, EMPTY_RESOURCE_MANAGER);

  const handleGet = React.useCallback((identifier: string, promise: Promise<T>): Promise<T> => {
    dispatch({ type: 'GET_RESOURCE_STARTED', payload: identifier });

    return promise
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
          payload: { identifier, message: error.message },
        });

        throw error.message;
      });
  }, [dispatch])

  const handleList = React.useCallback((promise: Promise<T[]>, options: ListOptions = {}): Promise<T[]> => {
    dispatch({ type: 'LIST_RESOURCE_STARTED' });

    return promise
      .then((list: T[]): T[] => {
        dispatch({
          type: 'LIST_RESOURCE_RESOLVED',
          payload: list,
          meta: options
        });

        return list;
      })
      .catch((error: Error) => {
        dispatch({
          type: 'LIST_RESOURCE_REJECTED',
          payload: error.message,
        });

        throw error.message;
      });
  }, [dispatch])

  const handleUpdate = React.useCallback((identifier: string, promise: Promise<T>): Promise<T> => {
    dispatch({ type: 'UPDATE_RESOURCE_STARTED', payload: identifier });

    return promise
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
          payload: { identifier, message: error.message },
        });

        throw error.message;
      });
  }, [dispatch])

  const handleCreate = React.useCallback((promise: Promise<T>): Promise<T> => {
    dispatch({ type: 'CREATE_RESOURCE_STARTED' });

    return promise
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
  }, [dispatch])

  const handleRemove = React.useCallback((identifier: string, promise: Promise<T | string | void>): Promise<string> => {
    dispatch({ type: 'REMOVE_RESOURCE_STARTED', payload: identifier });

    return promise
      .then((): string => {
        dispatch({
          type: 'REMOVE_RESOURCE_RESOLVED',
          payload: identifier,
        });

        return identifier;
      })
      .catch((error: Error) => {
        dispatch({
          type: 'REMOVE_RESOURCE_REJECTED',
          payload: { identifier, message: error.message },
        });

        throw error.message;
      });
  }, [dispatch])

  const handleSelect = React.useCallback((identifier: string) => {
    dispatch({ type: 'SELECT_RESOURCE', payload: identifier });
  }, [dispatch])

  const handleReset = React.useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch])

  const manager = React.useMemo(() => ({
    list: Object.values(state.list),
    selected: state.selected ? state.list[state.selected] : null,
    action: state.action,
    error: state.error,
  }), [state.list, state.selected, state.action, state.error])

  const actions = React.useMemo(() => ({
    get: handleGet,
    list: handleList,
    reset: handleReset,
    update: handleUpdate,
    remove: handleRemove,
    create: handleCreate,
    select: handleSelect,
  }), [handleGet, handleList, handleReset, handleUpdate, handleRemove, handleCreate, handleSelect])

  return [
    manager,
    actions
  ];
}
