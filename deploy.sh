#!/bin/bash

workspace=$(dirname "$0")
uuid=${1}
remote=${2}

if [[ -z "${uuid}" ]]; then
  echo "$0: missing argument: uuid"
  exit 1;
fi

if [[ -z "${remote}" ]]; then
  echo "$0: missing argument: remote"
  exit 1;
fi

set -ex

target="$(ssh ${remote} 'echo ${HOME}')/.local/share/gnome-shell/extensions/${uuid}"

ssh ${remote} "mkdir -p ${target}"

rsync -amvr --delete --include='*/' \
  --include='*.js' \
  --include='*.css' \
  --include='*.json' \
  --include='gschemas.compiled' \
  --exclude='*' ${workspace}/ ${remote}:${target}
