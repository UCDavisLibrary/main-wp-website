<?php
// updates host links in wp_meta and select options in wp_options
// Since serialized arrays can be stored in these values,
// a simple SQL REPLACE call is not sufficient
if ( $args && count($args) ) {
  if ( count($args) >= 2 ){
    $from = $args[0];
    $to = $args[1];
    updateHostLinks($from, $to);
  }
}
function updateHostLinks($from, $to){
  echo "\n Searching for '$from' links, and replacing with '$to'";
  $fromAsJson = str_replace('/', '\/', $from);
  $toAsJson = str_replace('/', '\/', $to);

  // check known serialized arrays in the wp_options table
  $arrayOptions = ['widget_block'];
  foreach ($arrayOptions as $optionKey) {
    $optionValue = get_option($optionKey);
    if ( !$optionValue ) continue;
    $optionValue = json_encode($optionValue);
    $hasHost = strpos($optionValue, $fromAsJson);
    if ($hasHost !== false) {
      echo "\n Found in '$optionKey' option. Replacing...";
      $optionValue = str_replace($fromAsJson, $toAsJson, $optionValue);
      $optionValue = json_decode($optionValue, true);
      update_option($optionKey, $optionValue);
    }
  }

  // check and update post_meta table
  echo "\n Searching post_meta table...";
  global $wpdb;
  $query = "SELECT post_id, meta_key FROM $wpdb->postmeta where meta_value LIKE '%$from%';";
  $results = $wpdb->get_results( $query );
  $c = count($results);
  if ( $c ){
    echo "\n Found $c instances. Replacing...";
    foreach ($results as $meta) {
      $value = get_post_meta($meta->post_id, $meta->meta_key, true);
      $value = json_encode($value);
      $value = str_replace($fromAsJson, $toAsJson, $value);
      $value = json_decode($value, true);
      update_post_meta($meta->post_id, $meta->meta_key, $value);
    }
  }

  echo "\n";
}
