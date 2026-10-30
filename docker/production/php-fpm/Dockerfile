# Versão mínima do PHP com correção dos CVE-2026-109618/109619.
# Não voltar para tag flutuante sem garantir >= 8.4.27.
ARG PHP_VERSION=8.4.27

# Stage 1: Build frontend assets
FROM node:24-alpine AS frontend-builder

WORKDIR /var/www

# Accept build arguments for environment variables
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ARG VITE_REVERB_SCHEME

# Set environment variables for the build process
ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY
ENV VITE_REVERB_HOST=$VITE_REVERB_HOST
ENV VITE_REVERB_PORT=$VITE_REVERB_PORT
ENV VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

# Copy only necessary files for npm install to leverage Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the frontend-related source code
COPY vite.config.ts .
COPY tsconfig.json .
COPY tailwind.config.js .
COPY eslint.config.js .
COPY resources/ ./resources

# Build the frontend assets
RUN npm run build

# Stage 2: Build environment and Composer dependencies
FROM php:${PHP_VERSION}-fpm AS builder

# Install system dependencies and PHP extensions required for Laravel + MySQL/PostgreSQL support
# Some dependencies are required for PHP extensions only in the build stage
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set the working directory inside the container
WORKDIR /var/www

# Copy composer.json and composer.lock first to leverage Docker layer caching
COPY composer.json composer.lock ./

# Install Composer and dependencies
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist --no-scripts

# Copy the rest of the application code
COPY . /var/www

# Generate autoloader and run scripts now that application code is present
RUN composer dump-autoload --optimize


# Stage 3: Production environment
FROM php:${PHP_VERSION}-fpm AS production

# Install only runtime libraries needed in production
# libfcgi-bin and procps are required for the php-fpm-healthcheck script
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libicu-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libwebp-dev \
    libfcgi-bin \
    procps \
    && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Download and install php-fpm health check script
RUN curl -o /usr/local/bin/php-fpm-healthcheck \
    https://raw.githubusercontent.com/renatomefi/php-fpm-healthcheck/master/php-fpm-healthcheck \
    && chmod +x /usr/local/bin/php-fpm-healthcheck

# Copy the initialization script
COPY ./docker/production/php-fpm/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy the initial storage structure
COPY ./storage /var/www/storage-init

# Copy PHP extensions and libraries from the builder stage
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/
COPY --from=builder /usr/local/bin/docker-php-ext-* /usr/local/bin/

COPY ./docker/production/php-fpm/conf.d/zz-security.ini /usr/local/etc/php/conf.d/zz-security.ini

# Use the recommended production PHP configuration
# -----------------------------------------------------------
# PHP provides development and production configurations.
# Here, we replace the default php.ini with the production
# version to apply settings optimized for performance and
# security in a live environment.
# -----------------------------------------------------------
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Copy the application code and dependencies from the build stage
COPY --from=builder /var/www /var/www

# Copy compiled frontend assets (manifest.json, etc.)
COPY --from=frontend-builder /var/www/public/build /var/www/public/build

# Set working directory
WORKDIR /var/www

# Copy the initial storage structure to the correct location
RUN php artisan storage:link

# Ensure correct permissions
RUN chown -R www-data:www-data /var/www

# Switch to the non-privileged user to run the application
USER www-data

# Change the default command to run the entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Expose port 9000 and start php-fpm server
EXPOSE 9000
CMD ["php-fpm"]

