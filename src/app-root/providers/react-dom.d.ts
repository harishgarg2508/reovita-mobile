// react-dom is already installed for the web build, but its type package is not. Only the one function used by the theme
// transition is declared, so no new dependency is added.
declare module 'react-dom' {
  export function flushSync<R>(callback: () => R): R;
}
