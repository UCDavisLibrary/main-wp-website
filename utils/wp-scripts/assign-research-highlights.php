<?php

// Define WordPress paths for container environment
if (!defined('ABSPATH')) {
    define('ABSPATH', '/usr/src/wordpress/');
}
if (!defined('WP_CONTENT_DIR')) {
    define('WP_CONTENT_DIR', ABSPATH . 'wp-content');
}
if (!defined('WP_PLUGIN_DIR')) {
    define('WP_PLUGIN_DIR', WP_CONTENT_DIR . '/plugins');
}

// Bootstrap WordPress
require_once(ABSPATH . 'wp-load.php');

  // this script assigns research highlights block to each person post
  $post_type = apply_filters('ucdlib_directory_people_post_type', 'person');
  $block_name = apply_filters('ucdlib_directory_research_highlights_block_name', 'ucdlib-directory/research-highlights');
  $insert_position = apply_filters('ucdlib_directory_research_highlights_insert_position', 'end'); // 'beginning' or 'end'
  $insert_after_block = apply_filters('ucdlib_directory_research_highlights_insert_after', 'ucdlib-directory/expertise-areas');

  echo "\n== Assign Research Highlights Block to {$post_type} Posts ==";
  echo "\n Block Name: {$block_name}";
  echo "\n Insert Position: {$insert_position}";
  if (!empty($insert_after_block)) {
    echo "\n Insert After Block: {$insert_after_block}";
  }

  $meta_map = apply_filters('ucdlib_directory_research_highlights_meta_map', [
    'expertId'              => '', 
    'hideResearchHighlights'=> 'hide_research_highlights'
  ]);

  $limit   = 0;   
  $dry_run = false; // set to true to not actually update posts


  if ( ! function_exists('wp_update_post') ) {
    echo "\nERROR: Must run within WordPress (use wp eval-file).";
    echo "\nExample: wp --path=/path/to/wp eval-file /abs/path/assign-research-highlights.php\n";
    exit(1);
  }

  // Get UCDLibPluginDirectoryPeople instance
  require_once( get_template_directory() . '/includes/classes/block-renderer.php' );
  require_once( WP_PLUGIN_DIR . '/ucdlib-directory/includes/main.php' );
  $directory_plugin = new UCDLibPluginDirectory();
  $people = $directory_plugin->people;


  // // ---------------------- MAIN ----------------------
  echo "\n== Directory People: Ensure Research Highlights block ==";


  // get people post type from config
  if (empty($post_type)) {
    echo "\n ERROR: people post type slug is empty.\n";
    exit(1);
  }

  // query all person posts
  $q = new WP_Query([
    'post_type'      => $post_type,
    'post_status'    => 'any',
    'posts_per_page' => -1,
    'fields'         => 'ids',
    'no_found_rows'  => true,
  ]);

  echo "\n Found {$q->post_count} {$post_type} posts.";

// Filter out any invalid/empty IDs so we only process real posts
$valid_ids = array_filter($q->posts, function($id) {
    // remove empty/zero values and ensure the post exists
    return !empty($id) && get_post_status($id);
});

// Normalize indices and update the WP_Query object so downstream code sees only valid posts
$q->posts = array_values($valid_ids);
$q->post_count = count($q->posts);

echo "\n Processing {$q->post_count} valid {$post_type} posts.";

if ($q->post_count === 0) {
    echo "\n No valid posts found. Nothing to do.\n";
    exit(0);
}

// Use the run_add_block method from UCDLibPluginDirectoryPeople
$people->run_add_block($q, $block_name, $insert_position, $insert_after_block, $meta_map);
  