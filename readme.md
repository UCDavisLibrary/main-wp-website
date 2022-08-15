# Main Wordpress Website Docker Config

This repo contains the Dockerfile and code (as git submodules) for running the
main UC Davis Library website.

## PHP Composer Dependencies
Both theme and plugin php dependencies should go in the `composer.json`, which
will be installed in `/var/www/html/vendor` in the container.

## Deployment
See the
[main-wp-website-deployment](https://github.com/UCDavisLibrary/main-wp-website-deployment)
repository.
