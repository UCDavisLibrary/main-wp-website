# Main Wordpress Website Docker Config

This repo contains the Dockerfiles and custom utilities for running the
main UC Davis Library website.

Most src code will be found in either the [theme](https://github.com/UCDavisLibrary/ucdlib-theme-wp) or [plugins](https://github.com/UCDavisLibrary/ucdlib-wp-plugins).

## Basic Maintenance

Basic maintenance will need to be performed every few months to ensure that all dependencies stay up-to-date and patched.

### Timber
Timber is a framework that organizes Wordpress into a more object-oriented approach, and enables the use of the twig templating language.
To update, find most [recent release](https://github.com/timber/timber/releases), and update `composer.json` file.

### Worpdress Core, Apache, PHP
Apache, PHP, and Wordpress versions are all controlled by the [official WP docker image](https://hub.docker.com/_/wordpress). Generally, not specifying the Apache/PHP version is fine, e.g. `wordpress:6.7.1`.

In `devops/Dockerfile`, update the Wordpress stage of the build: `FROM wordpress:6.7.1 AS wordpress`

### Third-party Plugins
All third-party plugins are stored in Google Cloud Storage in the [wordpress-general bucket](https://console.cloud.google.com/storage/browser/wordpress-general;tab=objects?project=digital-ucdavis-edu&prefix=&forceOnObjectsSortingFiltering=false) in the digital-ucdavis-edu project.

You will need to go through each item in the table below, and:
1. Check if there has been an update
2. Download the new version
3. Rename the file if necessary
4. Upload to corresponding directory in bucket
5. Update `devops/Dockerfile` with new version number

| Plugin | Download Website |
| ------ | -------- |
| ACF Pro | https://www.advancedcustomfields.com/my-account/view-licenses/ |
| Broken Link Checker | https://wordpress.org/plugins/broken-link-checker/ |
| Defender Pro | https://wpmudev.com/project/wp-defender/ |
| Forminator Pro | https://wpmudev.com/project/forminator-pro/ |
| Hummingbird Pro | https://wpmudev.com/project/wp-hummingbird/ |
| Gallery Block Lightbox | https://wordpress.org/plugins/gallery-block-lightbox/ |
| Redirection | https://wordpress.org/plugins/redirection/ |
| SMTP Mailer | https://wordpress.org/plugins/smtp-mailer/ |
| Smush Pro | https://wpmudev.com/project/wp-smush-pro/ |
| User Role Editor | https://wordpress.org/plugins/user-role-editor/ |
| WPMU DEV Dashboard | https://wpmudev.com/project/wpmu-dev-dashboard/ |

The login credentials for wpmudev can be found in [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager/secret/wpmudev-account/versions?project=digital-ucdavis-edu).

After downloading, you will have to rebuild your local images to see the updates.

## Deployment
See the
[main-wp-website-deployment](https://github.com/UCDavisLibrary/main-wp-website-deployment)
repository.
