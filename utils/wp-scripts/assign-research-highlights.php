<?php

$dry_run = false; 
$inCLI = true;
$insert_after_block = 'ucdlib-directory/expertise-areas';
$block_name = 'ucdlib-directory/research-highlights';

$people = $GLOBALS['UCDLibPluginDirectory']->people;
$people->ensureBlockExists($block_name,$dry_run, $inCLI, $insert_after_block );


  