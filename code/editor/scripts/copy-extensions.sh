rm -rf public/extensions

mkdir public/extensions

mkdir public/extensions/base
cp -r ../base/extension/dist public/extensions/base/dist
cp ../base/extension/package.json public/extensions/base

mkdir public/extensions/compilation
cp -r ../compilation/extension/dist public/extensions/compilation/dist
cp ../compilation/extension/package.json public/extensions/compilation