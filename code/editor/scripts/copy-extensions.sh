rm -rf public/extensions
mkdir public/extensions

mkdir public/extensions/compilation
cp -r ../compilation/extension/dist public/extensions/compilation/dist
cp ../compilation/extension/package.json public/extensions/compilation