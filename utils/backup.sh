#! /bin/bash

source /etc/profile

# TODO: move to .env ?
GOOGLE_CLOUD_BUCKET=website-v3-content
GOOGLE_CLOUD_PROJECT=digital-ucdavis-edu
GOOGLE_APPLICATION_CREDENTIALS=/etc/service-account.json
SNAPSHOTS_DIR=/snapshots
UPLOAD_DIR=/uploads
WPHB_OPTIONS_FILE=/wphb-cache/wphb-cache.php

if [[ -z $BACKUP_ENV ]]; then
  echo "BACKUP_ENV variable is required."
  exit 1
fi

if [[ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
  echo "Google cloud credential key file doesn't exist"
  exit 1
fi

if [[ ! -d "$SNAPSHOTS_DIR" ]]; then
  echo "SNAPSHOTS_DIR: $SNAPSHOTS_DIR directory doesn't exist"
  exit 1
fi

# connect to wp db
if [[ $WORDPRESS_DB_HOST =~ ":" ]]; then
  WORDPRESS_DB_JUST_HOST=$(echo $WORDPRESS_DB_HOST | cut -d ":" -f1)
  WORDPRESS_DB_JUST_PORT=$(echo $WORDPRESS_DB_HOST | cut -d ":" -f2)
else
  WORDPRESS_DB_JUST_HOST=$WORDPRESS_DB_HOST
  WORDPRESS_DB_JUST_PORT=3306
fi
alias mysql="mysql --user=$WORDPRESS_DB_USER --host=$WORDPRESS_DB_JUST_HOST --port=$WORDPRESS_DB_JUST_PORT --password=$WORDPRESS_DB_PASSWORD $WORDPRESS_DB_DATABASE"

echo "Generating sqldump file"
mysqldump --password="$MYSQL_ROOT_PASSWORD" --host=$WORDPRESS_DB_JUST_HOST --port=$WORDPRESS_DB_JUST_PORT "$WORDPRESS_DB_DATABASE" | gzip > $SNAPSHOT_DIR/main-wp-website.sql.gz

echo "Compressing wp media uploads directory"
tar -czvf $SNAPSHOT_DIR/uploads.tar.gz $UPLOAD_DIR

echo "uploading files to cloud bucket ${BACKUP_ENV}"
gcloud auth login --quiet --cred-file=${GOOGLE_APPLICATION_CREDENTIALS}
gcloud config set project $GOOGLE_CLOUD_PROJECT
gsutil cp $SNAPSHOT_DIR/main-wp-website.sql.gz "gs://${GOOGLE_CLOUD_BUCKET}/${BACKUP_ENV}/main-wp-website.sql.gz"
gsutil cp $SNAPSHOT_DIR/uploads.tar.gz "gs://${GOOGLE_CLOUD_BUCKET}/${BACKUP_ENV}/uploads.tar.gz" 
if [ -f "$WPHB_OPTIONS_FILE" ]; then
    gsutil cp $WPHB_OPTIONS_FILE "gs://${GOOGLE_CLOUD_BUCKET}/${BACKUP_ENV}/wphb-cache.php"
fi

echo "backup complete"
