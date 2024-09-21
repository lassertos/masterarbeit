directory=$(dirname "$(realpath $0)")
devcontainer build --workspace-folder $directory --image-name masterarbeit-devcontainer
mkdir -p $directory/dist
docker save masterarbeit-devcontainer:latest | gzip > $directory/dist/masterarbeit-devcontainer.tar.gz