<?php

// some collection alma ids got imported in scientific notation, and shouldn't be

$metaSlug = 'almaRecordId';
$postSlug = 'collection';

$posts = new WP_Query([
  'post_type' => $postSlug,
  'posts_per_page' => -1,
  'meta_key' => $metaSlug,
  'meta_value' => 'E+',
  'meta_compare' => 'LIKE'
  ]);
  echo "\n$posts->found_posts collections have an incorrect alma id.";

  if ( $posts->found_posts ) {
    echo "\nupdating...";
    foreach ($posts->posts as $post) {
      $almaId = get_post_meta($post->ID, $metaSlug, true);
      $almaId = strval( intval($almaId) );
      update_post_meta($post->ID, $metaSlug, $almaId);
    }
    echo "\nDone!";
  } else {
    echo "\nTaking no action.";
  }
  echo "\n";