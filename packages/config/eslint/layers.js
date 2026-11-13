import boundaries from 'eslint-plugin-boundaries';

const WIRING = ['module', 'entry'];

export default [
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true }, node: true },
      'boundaries/flag-as-external': { outsideRootPath: true },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/modules/*/domain', capture: ['module'] },
        { type: 'application', pattern: 'src/modules/*/application', capture: ['module'] },
        { type: 'infrastructure', pattern: 'src/modules/*/infrastructure', capture: ['module'] },
        { type: 'presentation', pattern: 'src/modules/*/presentation', capture: ['module'] },
      ],
      'boundaries/files': [
        { category: 'entry', pattern: 'src/modules/*/presentation/*.command.ts' },
        { category: 'module', pattern: 'src/**/*.module.ts' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: {
                to: {
                  element: { types: { anyOf: ['application', 'infrastructure', 'presentation'] } },
                },
              },
              message: 'domain/ only imports domain/ (imports point inward)',
            },
            {
              from: { element: { type: 'domain' } },
              disallow: { to: { file: { categories: { anyOf: WIRING } } } },
              message: 'domain/ only imports domain/ (imports point inward)',
            },
            {
              from: { element: { type: 'domain' } },
              disallow: { to: { module: { origin: 'external', source: '!@transcendence/core' } } },
              message: 'domain/ only imports @transcendence/core and the Node standard library',
            },
            {
              from: { element: { type: 'application' } },
              disallow: {
                to: { element: { types: { anyOf: ['infrastructure', 'presentation'] } } },
              },
              message: 'application/ only imports domain/ and application/ (imports point inward)',
            },
            {
              from: { element: { type: 'application' } },
              disallow: { to: { file: { categories: { anyOf: WIRING } } } },
              message: 'application/ only imports domain/ and application/ (imports point inward)',
            },
            {
              from: { element: { type: 'application' } },
              disallow: { to: { module: { source: ['@nestjs/**', '@transcendence/database'] } } },
              message: 'application/ stays free of Nest and Prisma; wire it in the module file',
            },
            {
              from: { element: { type: 'infrastructure' } },
              disallow: { to: { element: { type: 'presentation' } } },
              message: 'infrastructure/ does not import presentation/',
            },
            {
              from: { element: { type: 'infrastructure' } },
              disallow: { to: { file: { categories: { anyOf: WIRING } } } },
              message: 'infrastructure/ does not import module wiring',
            },
            {
              from: { element: { type: 'presentation' } },
              disallow: { to: { element: { type: 'infrastructure' } } },
              message:
                'presentation/ talks to application/; only entry points and module files wire infrastructure',
            },
            {
              from: { file: { categories: 'entry' } },
              allow: { to: { element: { type: 'infrastructure' } } },
            },
          ],
        },
      ],
    },
  },
];
