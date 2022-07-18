#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"/..

cd $ROOT_DIR/ucdlib-theme-wp/src/editor && npm install
cd $ROOT_DIR/ucdlib-theme-wp/src/public && npm install

cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-assets/src/editor && npm install
cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-assets/src/public && npm install

cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-assets/src/editor && npm install
cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-assets/src/public && npm install

cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-directory/src/editor && npm install

cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-locations/src/editor && npm install
cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-locations/src/public && npm install

cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-migration/src/editor && npm install

cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-search/src/public && npm install

cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-special/src/editor && npm install
cd $ROOT_DIR/ucdlib-wp-plugins/ucdlib-special/src/public && npm install