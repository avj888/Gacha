import { useSyncExternalStore } from 'react';

export type RouteName = 'home' | 'gates' | 'battle' | 'summon' | 'roster' | 'hunter' | 'team' | 'quests' | 'settings';
export interface Route {
  name: RouteName;
  param?: string;
}

const NAMES: RouteName[] = ['home', 'gates', 'battle', 'summon', 'roster', 'hunter', 'team', 'quests', 'settings'];

export function parseHash(hash: string): Route {
  const [name, param] = hash.replace(/^#\/?/, '').split('/');
  if (NAMES.includes(name as RouteName)) return { name: name as RouteName, param: param ? decodeURIComponent(param) : undefined };
  return { name: 'home' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseHash(hash);
}

export function navigate(name: RouteName, param?: string, replace = false) {
  const h = `#/${name}${param ? '/' + encodeURIComponent(param) : ''}`;
  if (replace) window.location.replace(h);
  else window.location.hash = h;
}

export const back = () => (window.history.length > 1 ? window.history.back() : navigate('home'));
