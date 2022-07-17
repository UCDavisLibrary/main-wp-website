ARG WP_SRC_ROOT=/usr/src/wordpress
ARG THEME_ROOT="$WP_SRC_ROOT/wp-content/themes"
ARG PLUGIN_ROOT="$WP_SRC_ROOT/wp-content/plugins"
ARG WP_LOG_ROOT=/var/log/wordpress
ARG BUCKET_NAME=website-v3-content
ARG NODE_VERSION=16
ARG PLUGIN_ACF="advanced-custom-fields-pro-5.12.2.zip"
ARG PLUGIN_FORMINATOR="forminator-pro-1.16.2.zip"
ARG PLUGIN_REDIRECTION="redirection-5.2.3.zip"
ARG PLUGIN_SMTP_MAILER="smtp-mailer-1.1.4.zip"
ARG PLUGIN_USER_ROLE_EDITOR="user-role-editor.4.62.zip"
ARG PLUGIN_WPMUDEV_UPDATES="wpmudev-updates-4.11.12.zip"

# Download third-party plugins from cloud bucket
# note, they still have to be activated
FROM google/cloud-sdk:alpine as gcloud
RUN mkdir -p /cache
WORKDIR /cache
ARG GOOGLE_KEY_FILE_CONTENT
ARG BUCKET_NAME
ARG PLUGIN_ACF
ARG PLUGIN_FORMINATOR
ARG PLUGIN_REDIRECTION
ARG PLUGIN_SMTP_MAILER
ARG PLUGIN_USER_ROLE_EDITOR
ARG PLUGIN_WPMUDEV_UPDATES

RUN echo $GOOGLE_KEY_FILE_CONTENT | gcloud auth activate-service-account --key-file=-
RUN gsutil cp gs://${BUCKET_NAME}/plugins/advanced-custom-fields-pro/${PLUGIN_ACF} .
RUN gsutil cp gs://${BUCKET_NAME}/plugins/redirection/${PLUGIN_REDIRECTION} .
RUN gsutil cp gs://${BUCKET_NAME}/plugins/wpmudev-updates/${PLUGIN_WPMUDEV_UPDATES} .
RUN gsutil cp gs://${BUCKET_NAME}/plugins/forminator-pro/${PLUGIN_FORMINATOR} .
RUN gsutil cp gs://${BUCKET_NAME}/plugins/user-role-editor/${PLUGIN_USER_ROLE_EDITOR} .
RUN gsutil cp gs://${BUCKET_NAME}/plugins/smtp-mailer/${PLUGIN_SMTP_MAILER} .

FROM node:${NODE_VERSION} as ucdlib-theme-wp

RUN mkdir -p /plugin/ucdlib-theme-wp/src/public
WORKDIR /plugin/ucdlib-theme-wp/src/public
COPY ucdlib-theme-wp/src/public/package.json package.json
RUN npm install --only=prod

RUN mkdir -p /plugin/ucdlib-theme-wp/src/editor
WORKDIR /plugin/ucdlib-theme-wp/src/editor
COPY ucdlib-theme-wp/src/editor/package.json package.json
RUN npm install --only=prod

WORKDIR /plugin/ucdlib-theme-wp
COPY ucdlib-theme-wp/theme theme
COPY ucdlib-theme-wp/views views
COPY ucdlib-theme-wp/assets assets
COPY ucdlib-theme-wp/src/editor/index.js src/editor/index.js
COPY ucdlib-theme-wp/src/editor/lib src/editor/lib
COPY ucdlib-theme-wp/src/public/index.js src/public/index.js
COPY ucdlib-theme-wp/src/public/scss src/public/scss
COPY ucdlib-theme-wp/src/public/lib src/public/lib
COPY ucdlib-theme-wp/src/public/elements src/public/elements
COPY ucdlib-theme-wp/src/public/page-scripts src/public/page-scripts

FROM node:${NODE_VERSION} as ucdlib-assets

RUN mkdir -p /plugin/ucdlib-assets/src/public
WORKDIR /plugin/ucdlib-assets/src/public
COPY ucdlib-wp-plugins/ucdlib-assets/src/public/package.json package.json
RUN npm install

RUN mkdir -p /plugin/ucdlib-assets/src/editor
WORKDIR /plugin/ucdlib-assets/src/editor
COPY ucdlib-wp-plugins/ucdlib-assets/src/editor/package.json package.json
RUN npm install

WORKDIR /plugin/ucdlib-assets
COPY ucdlib-wp-plugins/ucdlib-assets/assets assets
COPY ucdlib-wp-plugins/ucdlib-assets/includes includes
COPY ucdlib-wp-plugins/ucdlib-assets/ucdlib-assets.php ucdlib-assets.php
COPY ucdlib-wp-plugins/ucdlib-assets/src/editor/ucdlib-editor.js src/editor/ucdlib-editor.js
#COPY ucdlib-wp-plugins/ucdlib-assets/src/editor/lib src/editor/lib
COPY ucdlib-wp-plugins/ucdlib-assets/src/public/index.js src/public/index.js
COPY ucdlib-wp-plugins/ucdlib-assets/src/public/lib src/public/lib

FROM node:${NODE_VERSION} as ucdlib-locations

RUN mkdir -p /plugin/ucdlib-locations/src/public
WORKDIR /plugin/ucdlib-locations/src/public
COPY ucdlib-wp-plugins/ucdlib-locations/src/public/package.json package.json
RUN npm install --only=prod

RUN mkdir -p /plugin/ucdlib-locations/src/editor
WORKDIR /plugin/ucdlib-locations/src/editor
COPY ucdlib-wp-plugins/ucdlib-locations/src/editor/package.json package.json
RUN npm install --only=prod

WORKDIR /plugin/ucdlib-locations
COPY ucdlib-wp-plugins/ucdlib-locations/acf-json acf-json
COPY ucdlib-wp-plugins/ucdlib-locations/includes includes
COPY ucdlib-wp-plugins/ucdlib-locations/views views
COPY ucdlib-wp-plugins/ucdlib-locations/ucdlib-locations.php ucdlib-locations.php
COPY ucdlib-wp-plugins/ucdlib-locations/src/public/index.js src/public/index.js
COPY ucdlib-wp-plugins/ucdlib-locations/src/public/lib src/public/lib
COPY ucdlib-wp-plugins/ucdlib-locations/src/editor/index.js src/editor/index.js
COPY ucdlib-wp-plugins/ucdlib-locations/src/editor/lib src/editor/lib

FROM node:${NODE_VERSION} as ucdlib-migration

RUN mkdir -p /plugin/ucdlib-migration/src/editor
WORKDIR /plugin/ucdlib-migration/src/editor
COPY ucdlib-wp-plugins/ucdlib-migration/src/editor/package.json package.json
RUN npm install --only=prod

WORKDIR /plugin/ucdlib-migration
COPY ucdlib-wp-plugins/ucdlib-migration/includes includes
COPY ucdlib-wp-plugins/ucdlib-migration/views views
COPY ucdlib-wp-plugins/ucdlib-migration/ucdlib-migration.php ucdlib-migration.php
COPY ucdlib-wp-plugins/ucdlib-migration/src/editor/index.js src/editor/index.js
COPY ucdlib-wp-plugins/ucdlib-migration/src/editor/lib src/editor/lib

FROM node:${NODE_VERSION} as ucdlib-directory

RUN mkdir -p /plugin/ucdlib-directory/src/editor
WORKDIR /plugin/ucdlib-directory/src/editor
COPY ucdlib-wp-plugins/ucdlib-directory/src/editor/package.json package.json
RUN npm install --only=prod

RUN mkdir -p /plugin/ucdlib-directory/src/public
WORKDIR /plugin/ucdlib-directory/src/public
COPY ucdlib-wp-plugins/ucdlib-directory/src/public/package.json package.json
RUN npm install --only=prod

WORKDIR /plugin/ucdlib-directory
COPY ucdlib-wp-plugins/ucdlib-directory/includes includes
COPY ucdlib-wp-plugins/ucdlib-directory/views views
COPY ucdlib-wp-plugins/ucdlib-directory/ucdlib-directory.php ucdlib-directory.php
COPY ucdlib-wp-plugins/ucdlib-directory/src/editor/index.js src/editor/index.js
COPY ucdlib-wp-plugins/ucdlib-directory/src/editor/lib src/editor/lib
COPY ucdlib-wp-plugins/ucdlib-directory/src/public/lib src/public/src

FROM node:${NODE_VERSION} as ucdlib-search
RUN mkdir -p /plugin/ucdlib-search/src/public
WORKDIR /plugin/ucdlib-search/src/public
COPY ucdlib-wp-plugins/ucdlib-search/src/public/package.json package.json
RUN npm install --only=prod

WORKDIR /plugin/ucdlib-search
#COPY ucdlib-wp-plugins/ucdlib-search/acf-json acf-json
COPY ucdlib-wp-plugins/ucdlib-search/assets assets
COPY ucdlib-wp-plugins/ucdlib-search/includes includes
COPY ucdlib-wp-plugins/ucdlib-search/src/public/index.js src/public/index.js
COPY ucdlib-wp-plugins/ucdlib-search/src/public/lib src/public/lib
COPY ucdlib-wp-plugins/ucdlib-search/views views
COPY ucdlib-wp-plugins/ucdlib-search/ucdlib-search.php ucdlib-search.php

FROM node:${NODE_VERSION} as ucdlib-special

RUN mkdir -p /plugin/ucdlib-special/src/public
WORKDIR /plugin/ucdlib-special/src/public
COPY ucdlib-wp-plugins/ucdlib-special/src/public/package.json package.json
RUN npm install --only=prod

RUN mkdir -p /plugin/ucdlib-special/src/editor
WORKDIR /plugin/ucdlib-special/src/editor
COPY ucdlib-wp-plugins/ucdlib-special/src/editor/package.json package.json
RUN npm install --only=prod

WORKDIR /plugin/ucdlib-special
COPY ucdlib-wp-plugins/ucdlib-special/acf-json acf-json
COPY ucdlib-wp-plugins/ucdlib-special/includes includes
COPY ucdlib-wp-plugins/ucdlib-special/views views
COPY ucdlib-wp-plugins/ucdlib-special/ucdlib-special.php ucdlib-special.php
COPY ucdlib-wp-plugins/ucdlib-special/src/public/index.js src/public/index.js
COPY ucdlib-wp-plugins/ucdlib-special/src/public/lib src/public/lib
COPY ucdlib-wp-plugins/ucdlib-special/src/editor/index.js src/editor/index.js
COPY ucdlib-wp-plugins/ucdlib-special/src/editor/lib src/editor/lib


FROM wordpress:5.9.0

ARG WP_SRC_ROOT
ENV WP_SRC_ROOT=${WP_SRC_ROOT}
ARG WP_LOG_ROOT
ENV WP_LOG_ROOT=${WP_LOG_ROOT}
ARG THEME_ROOT
ENV THEME_ROOT=${THEME_ROOT}
ARG PLUGIN_ROOT
ENV PLUGIN_ROOT=${PLUGIN_ROOT}
ARG NODE_VERSION
ARG PLUGIN_ACF
ARG PLUGIN_FORMINATOR
ARG PLUGIN_REDIRECTION
ARG PLUGIN_SMTP_MAILER
ARG PLUGIN_USER_ROLE_EDITOR
ARG PLUGIN_WPMUDEV_UPDATES

# Install Composer Package Manager (for Timber, Twig, and CAS)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install node & other apt dependencies
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
RUN apt-get update && apt-get install -y nodejs unzip

WORKDIR $WP_SRC_ROOT

# Apache config
RUN a2enmod headers
COPY .htaccess .htaccess

# WP config
COPY wp-config-docker.php wp-config-docker.php

# Switch apache to use wp src
RUN set -eux; \
	find /etc/apache2 -name '*.conf' -type f -exec sed -ri -e "s!/var/www/html!$PWD!g" -e "s!Directory /var/www/!Directory $PWD!g" '{}' +; \
	cp -s wp-config-docker.php wp-config.php

# WP CLI for downloading third-party plugins, among other things
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
RUN chmod +x wp-cli.phar
RUN mv wp-cli.phar /usr/local/bin/wp

# drop OOTB themes and plugins
RUN cd wp-content/themes && rm -rf */
RUN cd wp-content/plugins && rm -rf */
RUN cd wp-content/plugins && rm -f hello.php

# Install composer dependencies for theme and plugins
ENV COMPOSER_ALLOW_SUPERUSER=1;
COPY composer.json .
RUN composer install

# place third-party plugins
WORKDIR $PLUGIN_ROOT
COPY --from=gcloud /cache/${PLUGIN_ACF} .
RUN unzip ${PLUGIN_ACF}
RUN rm ${PLUGIN_ACF}

COPY --from=gcloud /cache/${PLUGIN_REDIRECTION} .
RUN unzip ${PLUGIN_REDIRECTION}
RUN rm ${PLUGIN_REDIRECTION}

COPY --from=gcloud /cache/${PLUGIN_WPMUDEV_UPDATES} .
RUN unzip ${PLUGIN_WPMUDEV_UPDATES}
RUN rm ${PLUGIN_WPMUDEV_UPDATES}

COPY --from=gcloud /cache/${PLUGIN_FORMINATOR} .
RUN unzip ${PLUGIN_FORMINATOR}
RUN rm ${PLUGIN_FORMINATOR}

COPY --from=gcloud /cache/${PLUGIN_USER_ROLE_EDITOR} .
RUN unzip ${PLUGIN_USER_ROLE_EDITOR}
RUN rm ${PLUGIN_USER_ROLE_EDITOR}

COPY --from=gcloud /cache/${PLUGIN_SMTP_MAILER} .
RUN unzip ${PLUGIN_SMTP_MAILER}
RUN rm ${PLUGIN_SMTP_MAILER}

# copy our theme
COPY --from=ucdlib-theme-wp /plugin/ucdlib-theme-wp $THEME_ROOT/ucdlib-theme-wp
RUN cd $THEME_ROOT/ucdlib-theme-wp/src/editor && npm link
RUN cd $THEME_ROOT/ucdlib-theme-wp/src/public && npm link

# copy our plugins
COPY --from=ucdlib-locations /plugin/ucdlib-locations ucdlib-locations
RUN cd ucdlib-locations/src/editor && npm link @ucd-lib/brand-theme-editor
COPY --from=ucdlib-migration /plugin/ucdlib-migration ucdlib-migration
RUN cd ucdlib-migration/src/editor && npm link @ucd-lib/brand-theme-editor
COPY --from=ucdlib-directory /plugin/ucdlib-directory ucdlib-directory
RUN cd ucdlib-directory/src/editor && npm link @ucd-lib/brand-theme-editor
COPY --from=ucdlib-special /plugin/ucdlib-special ucdlib-special
RUN cd ucdlib-special/src/editor && npm link @ucd-lib/brand-theme-editor
COPY --from=ucdlib-search /plugin/ucdlib-search ucdlib-search
COPY --from=ucdlib-assets /plugin/ucdlib-assets ucdlib-assets
RUN cd ucdlib-assets/src/editor && npm link @ucd-lib/brand-theme-editor
RUN cd ucdlib-assets/src/public && npm link @ucd-lib/brand-theme

COPY ucdlib-wp-plugins/ucd-cas ucd-cas

# build site static assets
WORKDIR "$PLUGIN_ROOT/ucdlib-assets/src"
RUN cd public && npm run dist
RUN cd editor && npm run dist

# clean up, because this stupid image copies everything we leave around
# however, it does make image smaller
RUN rm -rf $THEME_ROOT/ucdlib-theme-wp/src/public/node_modules
RUN rm -rf $THEME_ROOT/ucdlib-theme-wp/src/editor/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-assets/src/public/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-assets/src/editor/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-directory/src/editor/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-locations/src/public/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-locations/src/editor/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-migration/src/editor/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-search/src/public/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-special/src/public/node_modules
RUN rm -rf $PLUGIN_ROOT/ucdlib-special/src/editor/node_modules

# set build tags
ARG WEBSITE_TAG
ENV WEBSITE_TAG ${WEBSITE_TAG}
ARG APP_VERSION
ENV APP_VERSION ${APP_VERSION}
ARG BUILD_NUM
ENV BUILD_NUM ${BUILD_NUM}
ARG BUILD_TIME
ENV BUILD_TIME ${BUILD_TIME}

# Back to site root so wordpress can do the rest of its thing
WORKDIR $WP_SRC_ROOT

# override docker entry point
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

# WHY???
CMD ["apache2-foreground"]
