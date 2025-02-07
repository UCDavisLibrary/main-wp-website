<?php

// assign 'manuscript' if collection collectionType isnt set
$metaSlug = 'collectionType';
$postSlug = 'collection';

$posts = new WP_Query([
  'post_type' => $postSlug,
  'posts_per_page' => -1,
  'meta_key' => $metaSlug,
  'meta_compare' => 'NOT EXISTS'
  ]);
  echo "\n$posts->found_posts collections do not have a collection type.";

  if ( $posts->found_posts ) {
    echo "\nupdating...";
    foreach ($posts->posts as $post) {
      update_post_meta($post->ID, $metaSlug, 'manuscript');
    }
    echo "\nDone!";
  } else {
    echo "\nTaking no action.";
  }
  echo "\n";