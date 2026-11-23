const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

// Watch all workspace packages so Metro hot-reloads on any source change
// without requiring `expo start --clear` or a dev server restart.
config.watchFolders = [monorepoRoot];

// Resolve workspace packages from the monorepo node_modules first,
// then fall back to the app's own node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Workspace packages export raw TypeScript source with ESM-style `.js` relative
// imports (e.g. `./NotesFeedModal.js` -> `./NotesFeedModal.tsx`). Fall back to
// extensionless resolution so Metro's `sourceExts` resolves `.ts`/`.tsx` files.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  try {
    return resolve(context, moduleName, platform);
  } catch (err) {
    if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
      return resolve(context, moduleName.slice(0, -3), platform);
    }
    throw err;
  }
};

module.exports = config;
