ARG SRC_ROOT=/usr/src/wordpress
ARG THEME_ROOT="$SRC_ROOT/wp-content/themes"
ARG PLUGIN_ROOT="$SRC_ROOT/wp-content/plugins"
ARG BUCKET_NAME=website-v3-content

# Download third-party plugins from cloud bucket
# note, they still have to be activated
# advanced custom fields (acf)
FROM google/cloud-sdk:alpine as gcloud
WORKDIR /
ARG GOOGLE_KEY_FILE_CONTENT
ARG BUCKET_NAME

RUN echo $GOOGLE_KEY_FILE_CONTENT | gcloud auth activate-service-account --key-file=- \
  && gsutil cp gs://${BUCKET_NAME}/plugins/advanced-custom-fields-pro.zip . \
  && gsutil cp gs://${BUCKET_NAME}/plugins/redirection.zip .

FROM wordpress:5.9.0

ARG SRC_ROOT
ENV SRC_ROOT=${SRC_ROOT}
ARG THEME_ROOT
ENV THEME_ROOT=${THEME_ROOT}
ARG PLUGIN_ROOT
ENV PLUGIN_ROOT=${PLUGIN_ROOT}

# Install Composer Package Manager (for Timber, Twig, and CAS)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install node & other apt dependencies
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get update && apt-get install -y nodejs unzip

WORKDIR $SRC_ROOT

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

# COPY and install npm dependencies for theme and our plugins
WORKDIR $THEME_ROOT
RUN mkdir -p ucdlib-theme-wp/src/public
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/public"
COPY ucdlib-theme-wp/src/public/package.json package.json
RUN npm install --only=prod

WORKDIR $THEME_ROOT
RUN mkdir -p ucdlib-theme-wp/src/editor
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/editor"
COPY ucdlib-theme-wp/src/editor/package.json package.json
RUN npm install --only=prod

WORKDIR $PLUGIN_ROOT
RUN mkdir -p ucdlib-assets/src/public
WORKDIR "$PLUGIN_ROOT/ucdlib-assets/src/public"
COPY ucdlib-wp-plugins/ucdlib-assets/src/public/package-docker.json package.json
RUN npm install

WORKDIR $PLUGIN_ROOT
RUN mkdir -p ucdlib-assets/src/editor
WORKDIR "$PLUGIN_ROOT/ucdlib-assets/src/editor"
COPY ucdlib-wp-plugins/ucdlib-assets/src/editor/package-docker.json package.json
RUN npm install

WORKDIR $PLUGIN_ROOT
RUN mkdir -p ucdlib-locations/src/public
WORKDIR "$PLUGIN_ROOT/ucdlib-locations/src/public"
COPY ucdlib-wp-plugins/ucdlib-locations/src/public/package.json package.json
RUN npm install --only=prod

WORKDIR $PLUGIN_ROOT
RUN mkdir -p ucdlib-migration/src/editor
WORKDIR "$PLUGIN_ROOT/ucdlib-migration/src/editor"
COPY ucdlib-wp-plugins/ucdlib-migration/src/editor/package-docker.json package.json
RUN npm install --only=prod


# copy rest of theme
WORKDIR "$THEME_ROOT/ucdlib-theme-wp"
COPY ucdlib-theme-wp/theme theme
COPY ucdlib-theme-wp/views views
COPY ucdlib-theme-wp/assets assets
COPY ucdlib-theme-wp/src/editor/index.js src/editor/index.js
COPY ucdlib-theme-wp/src/editor/lib src/editor/lib
COPY ucdlib-theme-wp/src/public/index.js src/public/index.js
COPY ucdlib-theme-wp/src/public/scss src/public/scss
COPY ucdlib-theme-wp/src/public/lib src/public/lib

# copy rest of our custom plugins
WORKDIR $PLUGIN_ROOT
COPY ucdlib-wp-plugins/ucd-cas ucd-cas
COPY ucdlib-wp-plugins/ucdlib-search ucdlib-search
COPY ucdlib-wp-plugins/ucdlib-directory ucdlib-directory

COPY ucdlib-wp-plugins/ucdlib-locations/acf-json ucdlib-locations/acf-json
#cCOPY ucdlib-wp-plugins/ucdlib-locations/assets ucdlib-locations/assets
COPY ucdlib-wp-plugins/ucdlib-locations/includes ucdlib-locations/includes
COPY ucdlib-wp-plugins/ucdlib-locations/views ucdlib-locations/views
COPY ucdlib-wp-plugins/ucdlib-locations/ucdlib-locations.php ucdlib-locations/ucdlib-locations.php
COPY ucdlib-wp-plugins/ucdlib-locations/src/public/index.js ucdlib-locations/src/public/index.js
COPY ucdlib-wp-plugins/ucdlib-locations/src/public/lib ucdlib-locations/src/public/lib

COPY ucdlib-wp-plugins/ucdlib-assets/assets ucdlib-assets/assets
COPY ucdlib-wp-plugins/ucdlib-assets/includes ucdlib-assets/includes
COPY ucdlib-wp-plugins/ucdlib-assets/ucdlib-assets.php ucdlib-assets/ucdlib-assets.php
COPY ucdlib-wp-plugins/ucdlib-assets/src/editor/ucdlib-editor.js ucdlib-assets/src/editor/ucdlib-editor.js
COPY ucdlib-wp-plugins/ucdlib-assets/src/editor/lib ucdlib-assets/src/editor/lib
COPY ucdlib-wp-plugins/ucdlib-assets/src/public/index.js ucdlib-assets/src/public/index.js
COPY ucdlib-wp-plugins/ucdlib-assets/src/public/lib ucdlib-assets/src/public/lib

COPY ucdlib-wp-plugins/ucdlib-migration/includes ucdlib-migration/includes
COPY ucdlib-wp-plugins/ucdlib-migration/views ucdlib-migration/views
COPY ucdlib-wp-plugins/ucdlib-migration/ucdlib-migration.php ucdlib-migration/ucdlib-migration.php
COPY ucdlib-wp-plugins/ucdlib-migration/src/editor/index.js ucdlib-migration/src/editor/index.js
COPY ucdlib-wp-plugins/ucdlib-migration/src/editor/lib ucdlib-migration/src/editor/lib

# place third-party plugins
WORKDIR $PLUGIN_ROOT
COPY --from=gcloud /advanced-custom-fields-pro.zip .
RUN unzip advanced-custom-fields-pro.zip
RUN rm advanced-custom-fields-pro.zip

COPY --from=gcloud /redirection.zip .
RUN unzip redirection.zip
RUN rm redirection.zip

# build site static assets
WORKDIR "$PLUGIN_ROOT/ucdlib-assets/src"
RUN cd public && npm run dist
RUN cd editor && npm run dist

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
WORKDIR "/var/www/html"

# override docker entry point
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

# WHY???
CMD ["apache2-foreground"] 