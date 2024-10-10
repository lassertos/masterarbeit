async function build() {
  const esbuild = require("esbuild");
  const resolve = await import("esbuild-plugin-resolve");

  esbuild.build({
    entryPoints: ["./src/index.mts"],
    bundle: true,
    outfile: "./dist/bundle.js",
    plugins: [
      resolve.default({
        events: require.resolve("events/"),
      }),
    ],
  });
}

build();
