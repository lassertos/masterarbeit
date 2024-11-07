# update the repository sources list
# and install dependencies
apt-get update \
&& apt-get install -y curl \
    texlive \
    texlive-lang-german \
    texlive-latex-extra \
    latexmk \
    texlive-science \
    git \
    nano \
    texlive-extra-utils \
    build-essential \
    g++ \
    libx11-dev \
    libxkbfile-dev \
    libsecret-1-dev \
    libkrb5-dev \
    python-is-python3 \
&& apt-get -y autoclean

# nvm environment variables
NVM_DIR=/usr/local/nvm
NODE_VERSION=20.17.0

# install nvm
# https://github.com/creationix/nvm#install-script
curl --silent -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash

# install node and npm
nvm install $NODE_VERSION 
nvm alias default $NODE_VERSION 
nvm use default

# add node and npm to path so the commands are available
NODE_PATH=$NVM_DIR/v$NODE_VERSION/lib/node_modules
PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# build and install buildsystem globally
npm ci --prefix /home/vscode/buildsystem && npm run build --prefix /home/vscode/buildsystem
cat > /usr/local/bin/buildsystem << EOL 
path=\$(pwd)
    while [[ "\$path" != "" && ! -e "\$path/.buildsystem.yml" ]]; do
        path=\${path%/*}
    done
path="\$path"

node /home/vscode/buildsystem/dist/index.mjs --path "\$path" --project "\$1" --job "\$2" --variant "\$3"
EOL

cat > /home/vscode/.bash_completion << EOL
_buildsystem(){
  path=\$(pwd)
  while [[ "\$path" != "" && ! -e "\$path/.buildsystem.yml" ]]; do
    path=\${path%/*}
  done
  path="\$path/.buildsystem.yml"
  projects=\$(yq -r 'keys | join(" ")' \$path)
  if [ \${#COMP_WORDS[@]} == 2 ]; then
    COMPREPLY=( \$(compgen -W "\$projects" -- "\$2") )
  elif [ \${#COMP_WORDS[@]} == 3 ]; then
    jobs=\$(yq -r '."'"\${COMP_WORDS[1]}"'".jobs | keys | join(" ")' \$path)
    COMPREPLY=( \$(compgen -W "\$jobs" -- "\$2") )
  elif [ \${#COMP_WORDS[@]} == 4 ]; then
    COMPREPLY=( \$(compgen -W "normal clean retry" -- "\$2") )
  fi
}

complete -F _buildsystem buildsystem
EOL

chmod +x /usr/local/bin/buildsystem
chown -R vscode:vscode /home/vscode

# update npmrc
echo "@crosslab-ide:registry=http://verdaccio:4873/" > /home/vscode/.npmrc
echo "@cross-lab-project:registry=http://verdaccio:4873/" >> /home/vscode/.npmrc
echo "//verdaccio:4873/:username=admin" >> /home/vscode/.npmrc
echo "//verdaccio:4873/:_password=admin" >> /home/vscode/.npmrc

# build and install simavr
apt update && apt install -y libelf-dev avr-libc freeglut3-dev gdb
cd /tmp
git clone https://github.com/buserror/simavr.git
cd simavr
make install
ldconfig
cd ~ && rm -rf /tmp/simavr

# build and install newest version of the avr-toolchain
apt update && apt -y install wget make mingw-w64 gcc g++ bzip2 xz-utils autoconf texinfo libgmp-dev libmpfr-dev
cd /tmp
git clone https://github.com/ZakKemble/avr-gcc-build.git
cd avr-gcc-build
FOR_WINX64=0 bash avr-gcc-build.sh
cp permissions.sh build/avr-gcc-14.1.0-x64-linux
cd build/avr-gcc-14.1.0-x64-linux
bash permissions.sh
cp -r avr /usr/local/lib
cp -r bin/* /usr/local/bin
cp -r include/* /usr/local/include
cp -r lib/* /usr/local/lib
cp -r libexec/* /usr/local/libexec
cp -r share/* /usr/local/share
ldconfig
cd ~ && rm -rf /tmp/avr-gcc-build

# install arduino-cli
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh
runuser -l vscode -c 'arduino-cli core install arduino:avr'