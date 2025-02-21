rm -rf public/extensions

mkdir public/extensions

mkdir public/extensions/base
cp -r ../base/extension/src public/extensions/base/src
cp -r ../base/extension/dist public/extensions/base/dist
cp ../base/extension/package.json public/extensions/base

mkdir public/extensions/lsp
cp -r ../lsp/extension/src public/extensions/lsp/src
cp -r ../lsp/extension/dist public/extensions/lsp/dist
cp ../lsp/extension/package.json public/extensions/lsp

mkdir public/extensions/filesystem
cp -r ../filesystem/extension/src public/extensions/filesystem/src
cp -r ../filesystem/extension/dist public/extensions/filesystem/dist
cp ../filesystem/extension/package.json public/extensions/filesystem

mkdir public/extensions/compilation
cp -r ../compilation/extension/src public/extensions/compilation/src
cp -r ../compilation/extension/dist public/extensions/compilation/dist
cp ../compilation/extension/package.json public/extensions/compilation

mkdir public/extensions/debugging
cp -r ../debugging/extension/src public/extensions/debugging/src
cp -r ../debugging/extension/dist public/extensions/debugging/dist
cp ../debugging/extension/package.json public/extensions/debugging

mkdir public/extensions/testing
cp -r ../testing/extension/src public/extensions/testing/src
cp -r ../testing/extension/dist public/extensions/testing/dist
cp ../testing/extension/package.json public/extensions/testing

mkdir public/extensions/collaboration
cp -r ../collaboration/extension/src public/extensions/collaboration/src
cp -r ../collaboration/extension/dist public/extensions/collaboration/dist
cp ../collaboration/extension/package.json public/extensions/collaboration