ARG WP_SRC_ROOT=/usr/src/wordpress
ARG THEME_ROOT="$WP_SRC_ROOT/wp-content/themes"
ARG PLUGIN_ROOT="$WP_SRC_ROOT/wp-content/plugins"
ARG WP_LOG_ROOT=/var/log/wordpress
ARG PLUGINS_BUCKET=wordpress-general/plugins
ARG NODE_VERSION=20
ARG PLUGIN_ACF="advanced-custom-fields-pro-6.2.2.zip"
ARG PLUGIN_BROKEN_LINK_CHECKER="broken-link-checker-2.2.3.zip"
ARG PLUGIN_DEFENDER="defender-pro-4.2.1.zip"
ARG PLUGIN_FORMINATOR="forminator-pro-1.27.zip"
ARG PLUGIN_HUMMINGBIRD="hummingbird-pro-3.6.zip"
ARG PLUGIN_LIGHTBOX="gallery-block-lightbox-1.13.zip"
ARG PLUGIN_REDIRECTION="redirection-5.3.10.zip"
ARG PLUGIN_SMTP_MAILER="smtp-mailer-1.1.9.zip"
ARG PLUGIN_SMUSH="smush-pro-3.15.zip"
ARG PLUGIN_USER_ROLE_EDITOR="user-role-editor-4.64.1.zip"
ARG PLUGIN_WPMUDEV_UPDATES="wpmu-dev-dashboard-4.11.22.zip"

# Download third-party plugins from cloud bucket
# note, they still have to be activated
FROM google/cloud-sdk:alpine as gcloud
RUN mkdir -p /cache
WORKDIR /cache
ARG GOOGLE_KEY_FILE_CONTENT
ARG PLUGINS_BUCKET
ARG PLUGIN_ACF
ARG PLUGIN_FORMINATOR
ARG PLUGIN_HUMMINGBIRD
ARG PLUGIN_REDIRECTION
ARG PLUGIN_SMTP_MAILER
ARG PLUGIN_SMUSH
ARG PLUGIN_USER_ROLE_EDITOR
ARG PLUGIN_WPMUDEV_UPDATES
ARG PLUGIN_BROKEN_LINK_CHECKER
ARG PLUGIN_DEFENDER
ARG PLUGIN_LIGHTBOX

RUN echo $GOOGLE_KEY_FILE_CONTENT | gcloud auth activate-service-account --key-file=-
RUN gsutil cp gs://${PLUGINS_BUCKET}/advanced-custom-fields-pro/${PLUGIN_ACF} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/redirection/${PLUGIN_REDIRECTION} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/wpmudev-updates/${PLUGIN_WPMUDEV_UPDATES} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/forminator-pro/${PLUGIN_FORMINATOR} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/user-role-editor/${PLUGIN_USER_ROLE_EDITOR} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/smtp-mailer/${PLUGIN_SMTP_MAILER} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/broken-link-checker/${PLUGIN_BROKEN_LINK_CHECKER} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/smush-pro/${PLUGIN_SMUSH} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/hummingbird-pro/${PLUGIN_HUMMINGBIRD} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/gallery-block-lightbox/${PLUGIN_LIGHTBOX} . \
&& gsutil cp gs://${PLUGINS_BUCKET}/defender-pro/${PLUGIN_DEFENDER} .

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
COPY ucdlib-wp-plugins/ucdlib-assets/views views
COPY ucdlib-wp-plugins/ucdlib-assets/includes includes
COPY ucdlib-wp-plugins/ucdlib-assets/ucdlib-assets.php ucdlib-assets.php
COPY ucdlib-wp-plugins/ucdlib-assets/src/editor/ucdlib-editor.js src/editor/ucdlib-editor.js
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
COPY ucdlib-wp-plugins/ucdlib-directory/acf-json acf-json
COPY ucdlib-wp-plugins/ucdlib-directory/includes includes
COPY ucdlib-wp-plugins/ucdlib-directory/views views
COPY ucdlib-wp-plugins/ucdlib-directory/ucdlib-directory.php ucdlib-directory.php
COPY ucdlib-wp-plugins/ucdlib-directory/src/editor/index.js src/editor/index.js
COPY ucdlib-wp-plugins/ucdlib-directory/src/editor/lib src/editor/lib
COPY ucdlib-wp-plugins/ucdlib-directory/src/public/src src/public/src
COPY ucdlib-wp-plugins/ucdlib-directory/src/public/index.js src/public/index.js

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
COPY ucdlib-wp-plugins/ucdlib-special/src/public/src src/public/src
COPY ucdlib-wp-plugins/ucdlib-special/src/editor/index.js src/editor/index.js
COPY ucdlib-wp-plugins/ucdlib-special/src/editor/lib src/editor/lib


FROM wordpress:6.3.2 as wordpress

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
ARG PLUGIN_HUMMINGBIRD
ARG PLUGIN_REDIRECTION
ARG PLUGIN_SMTP_MAILER
ARG PLUGIN_SMUSH
ARG PLUGIN_USER_ROLE_EDITOR
ARG PLUGIN_WPMUDEV_UPDATES
ARG PLUGIN_BROKEN_LINK_CHECKER
ARG PLUGIN_DEFENDER
ARG PLUGIN_LIGHTBOX

# Install Composer Package Manager (for Timber, Twig, and CAS)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# node setup
RUN apt-get update \
&& apt-get install -y ca-certificates curl gnupg \
&& mkdir -p /etc/apt/keyrings \
&& curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
&& echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

# apt packages
RUN apt-get update && apt-get install -y nodejs unzip git vim

WORKDIR $WP_SRC_ROOT

# Apache config
RUN a2enmod headers && a2enmod status && a2enmod access_compat
COPY .htaccess .htaccess
COPY monitoring/status.conf /etc/apache2/conf-available/status.conf
COPY monitoring/ports.conf /etc/apache2/ports.conf
RUN cd /etc/apache2/conf-enabled && ln -s ../conf-available/status.conf

# WP config
COPY wp-config-docker.php wp-config-docker.php

# directories needed by hummingbird cache plugin
RUN mkdir wp-content/wphb-cache; \
    mkdir wp-content/wphb-logs; \
	chown www-data wp-content/wphb-logs; \
	chgrp www-data wp-content/wphb-logs; \
	chown www-data wp-content/wphb-cache; \
	chgrp www-data wp-content/wphb-cache

# Switch apache to use wp src
RUN set -eux; \
	find /etc/apache2 -name '*.conf' -type f -exec sed -ri -e "s!/var/www/html!$PWD!g" -e "s!Directory /var/www/!Directory $PWD!g" '{}' +; \
	cp -s wp-config-docker.php wp-config.php

# WP CLI for downloading third-party plugins, among other things
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
&& chmod +x wp-cli.phar \
&& mv wp-cli.phar /usr/local/bin/wp

# drop OOTB themes and plugins
RUN cd $THEME_ROOT && rm -rf */ \
&& cd $PLUGIN_ROOT && rm -rf */ && rm -f hello.php

# Install composer dependencies for theme and plugins
ENV COMPOSER_ALLOW_SUPERUSER=1;
COPY composer.json .
RUN composer install

# place and unzip third-party plugins
WORKDIR $PLUGIN_ROOT
COPY --from=gcloud /cache/${PLUGIN_ACF} .
COPY --from=gcloud /cache/${PLUGIN_REDIRECTION} .
COPY --from=gcloud /cache/${PLUGIN_WPMUDEV_UPDATES} .
COPY --from=gcloud /cache/${PLUGIN_FORMINATOR} .
COPY --from=gcloud /cache/${PLUGIN_HUMMINGBIRD} .
COPY --from=gcloud /cache/${PLUGIN_USER_ROLE_EDITOR} .
COPY --from=gcloud /cache/${PLUGIN_SMTP_MAILER} .
COPY --from=gcloud /cache/${PLUGIN_SMUSH} .
COPY --from=gcloud /cache/${PLUGIN_BROKEN_LINK_CHECKER} .
COPY --from=gcloud /cache/${PLUGIN_DEFENDER} .
COPY --from=gcloud /cache/${PLUGIN_LIGHTBOX} .
RUN unzip ${PLUGIN_ACF} && rm ${PLUGIN_ACF} \
&& unzip ${PLUGIN_REDIRECTION} && rm ${PLUGIN_REDIRECTION} \
&& unzip ${PLUGIN_WPMUDEV_UPDATES} && rm ${PLUGIN_WPMUDEV_UPDATES} \
&& unzip ${PLUGIN_FORMINATOR} && rm ${PLUGIN_FORMINATOR} \
&& unzip ${PLUGIN_HUMMINGBIRD} && rm ${PLUGIN_HUMMINGBIRD} \
&& unzip ${PLUGIN_USER_ROLE_EDITOR} && rm ${PLUGIN_USER_ROLE_EDITOR} \
&& unzip ${PLUGIN_SMTP_MAILER} && rm ${PLUGIN_SMTP_MAILER} \
&& unzip ${PLUGIN_SMUSH} && rm ${PLUGIN_SMUSH} \
&& unzip ${PLUGIN_BROKEN_LINK_CHECKER} && rm ${PLUGIN_BROKEN_LINK_CHECKER} \
&& unzip ${PLUGIN_DEFENDER} && rm ${PLUGIN_DEFENDER} \
&& unzip ${PLUGIN_LIGHTBOX} && rm ${PLUGIN_LIGHTBOX}

# our forms rt extension
RUN git clone https://github.com/UCDavisLibrary/forminator-addon-rt.git \
&& cd forminator-addon-rt \
&& git checkout v1.1.1

# copy our theme
COPY --from=ucdlib-theme-wp /plugin/ucdlib-theme-wp $THEME_ROOT/ucdlib-theme-wp
RUN cd $THEME_ROOT/ucdlib-theme-wp/src/editor && npm link \
&& cd $THEME_ROOT/ucdlib-theme-wp/src/public && npm link

# copy our plugins
COPY --from=ucdlib-locations /plugin/ucdlib-locations ucdlib-locations
COPY --from=ucdlib-migration /plugin/ucdlib-migration ucdlib-migration
COPY --from=ucdlib-directory /plugin/ucdlib-directory ucdlib-directory
COPY --from=ucdlib-special /plugin/ucdlib-special ucdlib-special
COPY --from=ucdlib-search /plugin/ucdlib-search ucdlib-search
COPY --from=ucdlib-assets /plugin/ucdlib-assets ucdlib-assets
COPY ucdlib-wp-plugins/ucd-cas ucd-cas

# link theme private package
RUN cd $PLUGIN_ROOT/ucdlib-locations/src/editor && npm link @ucd-lib/brand-theme-editor \
&& cd $PLUGIN_ROOT/ucdlib-migration/src/editor && npm link @ucd-lib/brand-theme-editor \
&& cd $PLUGIN_ROOT/ucdlib-directory/src/editor && npm link @ucd-lib/brand-theme-editor \
&& cd $PLUGIN_ROOT/ucdlib-assets/src/editor && npm link @ucd-lib/brand-theme-editor \
&& cd $PLUGIN_ROOT/ucdlib-assets/src/public && npm link @ucd-lib/brand-theme \
&& cd $PLUGIN_ROOT/ucdlib-special/src/editor && npm link @ucd-lib/brand-theme-editor

# build site static assets
WORKDIR "$PLUGIN_ROOT/ucdlib-assets/src"
RUN cd public && npm run dist && cd ../editor && npm run dist

# clean up, because this stupid image copies everything we leave around
# however, it does make image smaller
RUN rm -rf $THEME_ROOT/ucdlib-theme-wp/src/public/node_modules \
&& rm -rf $THEME_ROOT/ucdlib-theme-wp/src/editor/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-assets/src/public/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-assets/src/editor/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-directory/src/editor/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-directory/src/public/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-locations/src/public/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-locations/src/editor/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-migration/src/editor/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-search/src/public/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-special/src/public/node_modules \
&& rm -rf $PLUGIN_ROOT/ucdlib-special/src/editor/node_modules

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

# start apache
CMD ["apache2-foreground"]
