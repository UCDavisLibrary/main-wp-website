<?php

// this script makes sure all collections have an assigned az term

// make sure all letters have a term
$slug = 'collection-az';
$letters = str_split('abcdefghijklmnopqrstuvwxyz');
$letters[] = 'numeric';
$currentTerms = get_terms([
  'taxonomy' => $slug,
  'hide_empty' => false,
  'fields' => 'slugs'
]);
$ct = 0;
foreach ($letters as $letter) {
  if ( !in_array($letter, $currentTerms) ){
    wp_insert_term($letter, $slug);
    $ct += 1;
  }
}
if ( $ct ) {
  echo "\n $ct terms added.";
}

// check for collections without an az term
$posts = new WP_Query([
  'post_type' => 'collection',
  'posts_per_page' => -1,
  'tax_query' => [
    [
        'taxonomy' => $slug,
        'operator' => 'NOT EXISTS',
    ],
  ],
]);
echo "\n $posts->found_posts collections are missing an az term";

// assign term if found posts
if ( $posts->found_posts ) {
  echo "\n assigning terms...";
  foreach ($posts->posts as $post) {
    $letter = get_first_letter( $post->post_title );
    if ( $letter ) {
      wp_set_post_terms( $post->ID, $letter, $slug );
    }
  }
  echo "\nDone!";
}

echo "\n";

function get_first_letter($title){
	$letters = str_split(strtolower($title));
	foreach ($letters as $letter) {
		if ( is_numeric( $letter ) ){
			return "numeric";
		}
		if ( ctype_alpha($letter) ) {
			return $letter;
		}
	}
}