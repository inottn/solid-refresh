import type { JSX, Accessor } from 'solid-js';
import { createMemo, untrack, $DEVCOMP } from 'solid-js';

export interface BaseComponent<P> {
  (props: P): JSX.Element;
}

function setComponentProperty<P>(component: BaseComponent<P>, key: string, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(component, key);
  if (descriptor) {
    Object.defineProperty(component, key, {
      ...descriptor,
      value
    });
  } else {
    Object.defineProperty(component, key, {
      value,
      writable: false,
      enumerable: false,
      configurable: true
    });
  }
}

export default function createProxy<C extends BaseComponent<P>, P>(
  source: Accessor<C>,
  name: string,
  location?: string
): (props: P) => JSX.Element {
  const refreshName = `[solid-refresh]${name}`;
  function HMRComp(props: P): JSX.Element {
    const s = source();
    if (!s || $DEVCOMP in s) {
      return createMemo(
        () => {
          const c = source();
          if (c) {
            return untrack(() => c(props));
          }
          return undefined;
        },
        {
          name: refreshName
        }
      ) as unknown as JSX.Element;
    }
    // no $DEVCOMP means it did not go through devComponent so source() is a regular function, not a component
    return s(props);
  }

  setComponentProperty(HMRComp, 'name', refreshName);
  if (location) {
    setComponentProperty(HMRComp, 'location', location);
  }

  return new Proxy(HMRComp, {
    get(_, property) {
      if (property === 'location' || property === 'name') {
        return (HMRComp as any)[property];
      }
      return source()[property as keyof C];
    },
    set(_, property, value) {
      source()[property as keyof C] = value;
      return true;
    }
  });
}
