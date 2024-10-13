rm -rf public/extensions

mkdir public/extensions

mkdir public/extensions/base
cp -r ../base/extension/dist public/extensions/base/dist
cp ../base/extension/package.json public/extensions/base

mkdir public/extensions/filesystem
cp -r ../filesystem/extension/src public/extensions/filesystem/src
cp -r ../filesystem/extension/dist public/extensions/filesystem/dist
cp ../filesystem/extension/package.json public/extensions/filesystem

mkdir public/extensions/compilation
cp -r ../compilation/extension/dist public/extensions/compilation/dist
cp ../compilation/extension/package.json public/extensions/compilation

mkdir public/extensions/debugging
cp -r ../debugging/extension/dist public/extensions/debugging/dist
cp ../debugging/extension/package.json public/extensions/debugging