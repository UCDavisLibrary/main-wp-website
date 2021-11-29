FROM wordpress:5.8

ENV SRC_ROOT=/usr/src/wordpress
ENV THEME_ROOT="$SRC_ROOT/wp-content/themes"
ENV PLUGIN_ROOT="$SRC_ROOT/wp-content/plugins"

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

# drop OOTB themes and plugins
WORKDIR $SRC_ROOT
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

# Back to site root so wordpress can do the rest of its thing
WORKDIR "/var/www/html"

# override docker entry point
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

# WHY???
CMD ["apache2-foreground"] 