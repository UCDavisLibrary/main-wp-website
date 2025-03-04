ARG WP_SRC_ROOT=/usr/src/wordpress
ARG THEME_ROOT="$WP_SRC_ROOT/wp-content/themes"
ARG PLUGIN_ROOT="$WP_SRC_ROOT/wp-content/plugins"
ARG WP_LOG_ROOT=/var/log/wordpress
ARG PLUGINS_BUCKET=wordpress-general/plugins
ARG NODE_VERSION=20
ARG PLUGIN_ACF="advanced-custom-fields-pro-6.3.11.zip"
ARG PLUGIN_BROKEN_LINK_CHECKER="broken-link-checker-2.4.2.zip"
ARG PLUGIN_DEFENDER="defender-pro-4.11.zip"
ARG PLUGIN_FORMINATOR="forminator-pro-1.37.1.zip"
ARG PLUGIN_HUMMINGBIRD="hummingbird-pro-3.9.4.zip"
ARG PLUGIN_LIGHTBOX="gallery-block-lightbox-1.15.zip"
ARG PLUGIN_REDIRECTION="redirection-5.5.1.zip"
ARG PLUGIN_SMTP_MAILER="smtp-mailer-1.11.17.zip"
ARG PLUGIN_SMUSH="smush-pro-3.16.9.zip"
ARG PLUGIN_USER_ROLE_EDITOR="user-role-editor-4.64.2.zip"
ARG PLUGIN_WPMUDEV_UPDATES="wpmu-dev-dashboard-4.11.28.zip"
ARG UCDLIB_THEME_WP_NODE_IMAGE
ARG UCDLIB_WP_PLUGINS_NODE_IMAGE

# Download third-party plugins from cloud bucket
# note, they still have to be activated
FROM google/cloud-sdk:alpine AS gcloud
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

RUN --mount=type=secret,id=google_key gcloud auth activate-service-account --key-file=/run/secrets/google_key
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


FROM ${UCDLIB_THEME_WP_NODE_IMAGE} AS ucdlib-theme-wp
FROM ${UCDLIB_WP_PLUGINS_NODE_IMAGE} AS ucdlib-wp-plugins
FROM wordpress:6.7.1 AS wordpress

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
RUN git -c advice.detachedHead=false \
	clone https://github.com/UCDavisLibrary/forminator-addon-rt.git \
	--branch v2.0.0 --single-branch --depth 1

# copy our theme
COPY --from=ucdlib-theme-wp /plugin/ucdlib-theme-wp $THEME_ROOT/ucdlib-theme-wp
RUN cd $THEME_ROOT/ucdlib-theme-wp/src/editor && npm link \
&& cd $THEME_ROOT/ucdlib-theme-wp/src/public && npm link

# copy our plugins
COPY --from=ucdlib-wp-plugins /plugin/ucdlib-locations ucdlib-locations
COPY --from=ucdlib-wp-plugins /plugin/ucdlib-migration ucdlib-migration
COPY --from=ucdlib-wp-plugins /plugin/ucdlib-directory ucdlib-directory
COPY --from=ucdlib-wp-plugins /plugin/ucdlib-special ucdlib-special
COPY --from=ucdlib-wp-plugins /plugin/ucdlib-search ucdlib-search
COPY --from=ucdlib-wp-plugins /plugin/ucdlib-assets ucdlib-assets
COPY --from=ucdlib-wp-plugins /plugin/ucd-cas ucd-cas

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

# Back to site root so wordpress can do the rest of its thing
WORKDIR $WP_SRC_ROOT

# override docker entry point
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

RUN mkdir /cork-build-info
COPY --from=ucdlib-wp-plugins /cork-build-info/ucdlib-wp-plugins.json /cork-build-info/ucdlib-wp-plugins.json
COPY --from=ucdlib-theme-wp /cork-build-info/ucdlib-theme-wp.json /cork-build-info/ucdlib-theme-wp.json

# start apache
CMD ["apache2-foreground"]
