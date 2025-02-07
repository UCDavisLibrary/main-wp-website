#! /bin/bash

# start the monitoring agent
if [[ $ENABLE_GC_APACHE_MONITORING == 'true' ]]; then
  node /util-cmds/daily-updates.js & 
  node /util-cmds/apache.js 
fi

echo "Exiting ENABLE_GC_APACHE_MONITORING not set to true"