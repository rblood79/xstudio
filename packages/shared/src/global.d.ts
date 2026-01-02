/**
 * Global type declarations for packages/shared
 */

// CSS module declarations
declare module '*.css' {
  const content: string;
  export default content;
}

// Node.js environment types
declare const process: {
  env: {
    NODE_ENV: string;
    [key: string]: string | undefined;
  };
};
