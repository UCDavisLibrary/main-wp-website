#! /bin/bash

mkdir -p /var/www/html/wp-content/uploads
chown -R www-data:www-data /var/www/html/wp-content/uploads

exec /usr/local/bin/docker-entrypoint.sh "$@"