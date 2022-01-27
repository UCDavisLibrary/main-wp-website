FROM wordpress:5.8

ENV SRC_ROOT=/usr/src/wordpress
ENV THEME_ROOT="$SRC_ROOT/wp-content/themes"
ENV PLUGIN_ROOT="$SRC_ROOT/wp-content/plugins"

# Install Composer Package Manager (for Timber, Twig, and CAS)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install node
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

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

# COPY npm depends and install
WORKDIR $THEME_ROOT
RUN mkdir ucdlib-theme-wp
COPY ucdlib-theme-wp/assets ucdlib-theme-wp/assets

RUN mkdir -p ucdlib-theme-wp/src/public
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/public"
COPY ucdlib-theme-wp/src/public/package.json package.json
COPY ucdlib-theme-wp/src/public/package-lock.json package-lock.json
RUN npm install

WORKDIR $THEME_ROOT
RUN mkdir -p ucdlib-theme-wp/src/editor
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/editor"
COPY ucdlib-theme-wp/src/editor/package.json package.json
COPY ucdlib-theme-wp/src/editor/package-lock.json package-lock.json
RUN npm install

WORKDIR $THEME_ROOT
RUN mkdir -p ucdlib-theme-wp/src/shared
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/shared"
COPY ucdlib-theme-wp/src/shared/package.json package.json
COPY ucdlib-theme-wp/src/shared/package-lock.json package-lock.json
RUN npm install

# copy shared js code
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/shared"
COPY ucdlib-theme-wp/src/shared/iconsets iconsets

# copy public js code and build dist
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/public"
COPY ucdlib-theme-wp/src/public/scss scss
COPY ucdlib-theme-wp/src/public/index.js index.js
COPY ucdlib-theme-wp/src/public/webpack-dist.config.js webpack-dist.config.js
RUN npm run dist

# copy editor js code and build dist
WORKDIR "$THEME_ROOT/ucdlib-theme-wp/src/editor"
COPY ucdlib-theme-wp/src/editor/block-components block-components
COPY ucdlib-theme-wp/src/editor/blocks blocks
COPY ucdlib-theme-wp/src/editor/core-block-mods core-block-mods
COPY ucdlib-theme-wp/src/editor/formats formats
COPY ucdlib-theme-wp/src/editor/plugins plugins
COPY ucdlib-theme-wp/src/editor/utils utils
COPY ucdlib-theme-wp/src/editor/exclude.js exclude.js      
COPY ucdlib-theme-wp/src/editor/index.js index.js
RUN npm run dist

# Copy rest of our theme
WORKDIR "$THEME_ROOT/ucdlib-theme-wp"
COPY ucdlib-theme-wp/theme theme
COPY ucdlib-theme-wp/views views

# copy other files
# COPY wp-config.php .

# copy our custom plugins
WORKDIR $PLUGIN_ROOT
COPY ucdlib-wp-plugins/ucd-cas ucd-cas
COPY ucdlib-wp-plugins/ucdlib-locations ucdlib-locations
RUN cd ucdlib-locations && npm install
RUN cd ucdlib-locations && npm run dist

# Download third-party plugins
# note, they still have to be activated
# advanced custom fields (acf)
RUN apt-get install -y unzip
ARG WP_ACF_KEY
ENV WP_ACF_KEY ${WP_ACF_KEY}
ENV ACF_BASE_URL="https://connect.advancedcustomfields.com/v2/plugins/download"
ENV ACF_VERSION="5.11.4"
ENV ACF_FULL_URL="$ACF_BASE_URL/?p=pro&k=$WP_ACF_KEY&t=$ACF_VERSION"
RUN curl "$ACF_FULL_URL" -o advanced-custom-fields-pro.zip
RUN unzip advanced-custom-fields-pro.zip
RUN rm advanced-custom-fields-pro.zip

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