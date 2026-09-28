FROM php:8.4-fpm

RUN apt-get update && apt-get install -y --no-install-recommends \
    iputils-ping \
    curl \
    unzip \
    libpq-dev \
    libonig-dev \
    libssl-dev \
    libxml2-dev \
    libcurl4-openssl-dev \
    libicu-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libwebp-dev \
    libfcgi-bin \
    procps \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
    gd \
    pdo_mysql \
    pdo_pgsql \
    pgsql \
    opcache \
    intl \
    zip \
    bcmath \
    soap \
    && pecl install redis \
    && docker-php-ext-install pcntl \
    && docker-php-ext-enable redis pcntl \
    && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Use ARG to define environment variables passed from the Docker build command or Docker Compose.
ARG XDEBUG_ENABLED=true
ARG XDEBUG_MODE=develop,debug
ARG XDEBUG_HOST=host.docker.internal
ARG XDEBUG_IDE_KEY=DOCKER
ARG XDEBUG_LOG=/dev/stdout
ARG XDEBUG_LOG_LEVEL=0

# Configure Xdebug if enabled
RUN if [ "${XDEBUG_ENABLED}" = "true" ]; then \
    pecl install xdebug && \
    docker-php-ext-enable xdebug && \
    echo "xdebug.mode=${XDEBUG_MODE}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.idekey=${XDEBUG_IDE_KEY}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.log=${XDEBUG_LOG}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.log_level=${XDEBUG_LOG_LEVEL}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.client_host=${XDEBUG_HOST}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini ; \
    echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini ; \
    fi

# Install only runtime libraries needed 
# libfcgi-bin and procps are required for the php-fpm-healthcheck script
# Download and install php-fpm health check script
RUN curl -o /usr/local/bin/php-fpm-healthcheck \
    https://raw.githubusercontent.com/renatomefi/php-fpm-healthcheck/master/php-fpm-healthcheck \
    && chmod +x /usr/local/bin/php-fpm-healthcheck

# Copy the entrypoint script
COPY ./docker/development/php-fpm/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh


# Add ARGs for syncing permissions
ARG UID=1000
ARG GID=1000

# Create a new user with the specified UID and GID, reusing an existing group if GID exists
RUN if getent group ${GID}; then \
    group_name=$(getent group ${GID} | cut -d: -f1); \
    useradd -m -u ${UID} -g ${GID} -s /bin/bash www; \
    else \
    groupadd -g ${GID} www && \
    useradd -m -u ${UID} -g www -s /bin/bash www; \
    group_name=www; \
    fi

# Dynamically update php-fpm to use the new user and group
RUN sed -i "s/user = www-data/user = www/g" /usr/local/etc/php-fpm.d/www.conf && \
    sed -i "s/group = www-data/group = $group_name/g" /usr/local/etc/php-fpm.d/www.conf

# Keep environment variables (e.g. XDEBUG_MODE from docker-compose `environment:`) reaching the
# FPM workers. Without this, php-fpm's implicit default (clear_env=yes) strips them, and Xdebug
# silently falls back to whatever mode was baked into the ini at image build time.
RUN sed -i "s/;clear_env = no/clear_env = no/" /usr/local/etc/php-fpm.d/www.conf

# The stock pool ships tuned for a resource-constrained server (max_children=5), which starves
# local dev: any page firing more than 5 concurrent requests (e.g. several XHRs + broadcast auth
# + polling) queues the rest behind it, and the browser's own per-host connection limit then backs
# up too — a reservation POST was observed queued 1.6min client-side waiting for a free connection.
# Dev containers here run unconstrained (no CPU/memory limit), so raise the pool accordingly.
RUN sed -i "s/^pm.max_children = 5/pm.max_children = 20/" /usr/local/etc/php-fpm.d/www.conf && \
    sed -i "s/^pm.start_servers = 2/pm.start_servers = 4/" /usr/local/etc/php-fpm.d/www.conf && \
    sed -i "s/^pm.min_spare_servers = 1/pm.min_spare_servers = 2/" /usr/local/etc/php-fpm.d/www.conf && \
    sed -i "s/^pm.max_spare_servers = 3/pm.max_spare_servers = 8/" /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www

# Change the default command to run the entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Expose port 9000 and start php-fpm server
EXPOSE 9000

CMD ["php-fpm"]