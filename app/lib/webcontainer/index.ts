import { WebContainer } from '@webcontainer/api';
import { WORK_DIR, WORK_DIR_NAME } from '~/utils/constants';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({ workdirName: WORK_DIR_NAME });
      })
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        // Create initial project structure with sample files
        try {
          // Create src directory
          await webcontainer.fs.mkdir(`${WORK_DIR}/src`, { recursive: true });

          // Create a main JavaScript file
          await webcontainer.fs.writeFile(
            `${WORK_DIR}/src/index.js`,
            `// Welcome to Bolt.echo!\n\n// This is a starter file. You can edit it or create new files.\n\nconsole.log('Hello, world!');\n\n// Try modifying this file to see your changes in the editor\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('Developer'));\n`
          );

          // Create a simple HTML file
          await webcontainer.fs.writeFile(
            `${WORK_DIR}/index.html`,
            `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Bolt.echo Project</title>\n</head>\n<body>\n  <h1>Welcome to Bolt.echo!</h1>\n  <p>Edit this file in the editor.</p>\n  <script src="./src/index.js"></script>\n</body>\n</html>\n`
          );

          // Create a package.json file for the project
          await webcontainer.fs.writeFile(
            `${WORK_DIR}/package.json`,
            JSON.stringify({
              name: "bolt-project",
              version: "1.0.0",
              description: "A project created in Bolt.echo",
              main: "src/index.js",
              scripts: {
                start: "node src/index.js"
              }
            }, null, 2)
          );

          console.log('Initial files created in WebContainer');
        } catch (error) {
          console.error('Failed to create initial files:', error);
        }

        return webcontainer;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
