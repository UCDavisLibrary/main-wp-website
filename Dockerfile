FROM wordpress:5.8

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

# drop OOTB themes and plugins
WORKDIR "/usr/src/wordpress"
RUN cd wp-content/themes && rm -rf */
RUN cd wp-content/plugins && rm -rf */
RUN cd wp-content/plugins && rm -f hello.php

# Install composer dependencies for theme and plugins
COPY composer.json .
RUN composer install

WORKDIR "/var/www/html/wp-content/themes"

# COPY composer and npm depends and install
ENV COMPOSER_ALLOW_SUPERUSER=1;
RUN mkdir ucdlib-theme-wp
WORKDIR "/var/www/html/wp-content/themes/ucdlib-theme-wp"

RUN mkdir -p src/public
COPY ucdlib-theme-wp/src/public/package.json src/public/package.json
COPY ucdlib-theme-wp/src/public/package-lock.json src/public/package-lock.json
RUN cd src/public && npm install && ls -al node_modules || true && pwd

RUN mkdir -p src/editor
# COPY ucdlib-theme-wp/src/editor/package.json src/editor/package.json
# COPY ucdlib-theme-wp/src/editor/package-lock.json src/editor/package-lock.json
# RUN cd src/editor && npm install

# copy public js code
RUN cd src/public && ls -al
COPY ucdlib-theme-wp/src/public/scss src/public/scss
RUN cd src/public && ls -al
COPY ucdlib-theme-wp/src/public/index.js src/public/index.js
RUN cd src/public && ls -al 
COPY ucdlib-theme-wp/src/public/webpack-dist.config.js src/public/webpack-dist.config.js
RUN cd src/public && ls -al

# copy editor js code
# COPY ucdlib-theme-wp/src/editor/block-components src/editor/block-components
# COPY ucdlib-theme-wp/src/editor/blocks src/editor/blocks
# COPY ucdlib-theme-wp/src/editor/core-block-mods src/editor/core-block-mods
# COPY ucdlib-theme-wp/src/editor/formats src/editor/formats
# COPY ucdlib-theme-wp/src/editor/plugins src/editor/plugins
# COPY ucdlib-theme-wp/src/editor/utils src/editor/utils
# COPY ucdlib-theme-wp/src/editor/exclude.js src/editor/exclude.js      
# COPY ucdlib-theme-wp/src/editor/index.js src/editor/index.js

# bundle js code
WORKDIR "/var/www/html/wp-content/themes/ucdlib-theme-wp/src/public"
RUN more package.json
RUN ls -al
RUN ls -al node_modules || true
RUN ls -al node_modules/.bin || true
RUN which npm || true
RUN npm run webpack-info || true
RUN npm run dist
# RUN cd src/editor && more package.json && npm run dist

# Copy rest of our theme
COPY ucdlib-theme-wp/assets assets
COPY ucdlib-theme-wp/theme theme
COPY ucdlib-theme-wp/views views

# copy other files
# COPY wp-config.php .

# copy our custom plugins
WORKDIR "/var/www/html/wp-content/plugins"
COPY ucdlib-wp-plugins/ucd-cas ucd-cas

# override docker entry point
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

# WHY???
CMD ["apache2-foreground"] 

# Back to site root so wordpress can do the rest of its thing
WORKDIR "/var/www/html"