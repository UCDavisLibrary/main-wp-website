#! /bin/bash

mkdir -p $WP_SRC_ROOT/wp-content/uploads
chown -R www-data:www-data $WP_SRC_ROOT/wp-content/uploads

mkdir -p $WP_LOG_ROOT
chown -R www-data:www-data $WP_LOG_ROOT

exec /usr/local/bin/docker-entrypoint.sh "$@"