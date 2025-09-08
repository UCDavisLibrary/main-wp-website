ARG BASE_IMAGE
FROM ${BASE_IMAGE}

ARG NODE_VERSION=20

RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl cron procps

# Prep work for gsutil
RUN mkdir -p /usr/share/keyrings \
    && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
       | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg

RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
    > /etc/apt/sources.list.d/google-cloud-sdk.list

# Install gcloud/gsutils
RUN apt-get update && apt-get install -y mariadb-client \
  wait-for-it google-cloud-cli

RUN mkdir /util-cmds
WORKDIR /util-cmds

COPY package.json .
COPY package-lock.json .
RUN npm install --production

COPY init.sh init.sh
COPY backup.sh backup.sh
COPY tail.sh tail.sh

# COPY ./monitoring/apache.conf /etc/stackdriver/collectd.d/apache.conf
# COPY ./monitoring/config.yaml /etc/google-cloud-ops-agent/config.yaml
# COPY ./monitoring/monitor.sh monitor.sh
# RUN echo "GOOGLE_APPLICATION_CREDENTIALS=/etc/service-account.json" >> /etc/default/stackdriver-agent
# RUN echo "GOOGLE_APPLICATION_CREDENTIALS=/etc/service-account.json" >> /etc/default/google-cloud-ops-agent
COPY ./monitoring/apache.js apache.js
COPY ./monitoring/daily-updates.js daily-updates.js
COPY ./monitoring/daily-updates.sql daily-updates.sql
COPY ./monitoring/libcal.js libcal.js
COPY ./monitoring/monitor.sh monitor.sh

COPY backup-cron /etc/cron.d/backup
COPY backup_entrypoint.sh backup_entrypoint.sh
RUN chmod 0644 /etc/cron.d/backup

COPY wp-scripts wp-scripts

WORKDIR $WP_SRC_ROOT

ENTRYPOINT [ "sh", "-c" ]
#ENTRYPOINT [ "bash", "-c" ]
CMD ["echo 'Use command arg to specify a script to run.'"]
