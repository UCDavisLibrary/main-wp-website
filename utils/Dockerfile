ARG BASE_IMAGE
FROM ${BASE_IMAGE}

ARG NODE_VERSION=20

RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl cron procps

# Update Key
RUN curl -O https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    && apt-key add apt-key.gpg

# Prep work for gsutils
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

#RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
#RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Monitoring
# RUN curl -sSO https://dl.google.com/cloudagents/add-monitoring-agent-repo.sh; \
#   bash add-monitoring-agent-repo.sh --also-install
RUN curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh; \
    bash add-google-cloud-ops-agent-repo.sh --also-install

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
