<?php
if ( defined('WP_CLI') && WP_CLI ) {
  $inCLI = true;
}
$dry_run = false; 

$people = $GLOBALS['UCDLibPluginDirectory']->people;
$people->ensureBlockExists($dry_run, $inCLI );


  