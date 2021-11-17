FROM wordpress

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR "/var/www/html/wp-content/themes/demo-theme"
RUN composer install
RUN cd /src && npm install

WORKDIR "/var/www/html"
# REMOVE THERE CRAP
RUN cd wp-content/wp-themes && rm -rf *

# INSTALL OUR CRAP
COPY wp-config.php .
COPY ucdlib-theme-wp wp-content/wp-themes/ucdlib-theme-wp

# COPY ucdlib-wp-plugins/foo wp-content/plugins/foo