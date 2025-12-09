<?php
if ( defined('WP_CLI') && WP_CLI ) {
  $inCLI = true;
} else {
  $inCLI = false;
}

$dry_run = false; 

if ( $inCLI && isset( $GLOBALS['argv'] ) ) {
  foreach ( $GLOBALS['argv'] as $arg ) {
    if ( $arg === 'dry-run' || $arg === 'dry_run' ) {
      $dry_run = true;
      break;
    } 
  }
}


$people = $GLOBALS['UCDLibPluginDirectory']->people;
$people->ensureResearchHighlightBlockExists($dry_run, $inCLI );


  