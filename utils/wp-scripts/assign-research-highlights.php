<?php

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


  // convert various truthy values to boolean true
  function rh_bool($val){
    return ($val === true || $val === 1 || $val === '1' || $val === 'true' || $val === 'on');
  }

  if ( ! function_exists('wp_update_post') ) {
    echo "\nERROR: Must run within WordPress (use wp eval-file).";
    echo "\nExample: wp --path=/path/to/wp eval-file /abs/path/assign-research-highlights.php\n";
    exit(1);
  }

  // build minimal block structure
  function rh_build_block($block_name, $attrs = []) {
    $attrs_json = wp_json_encode((object)$attrs);
    $block_comment = '<!-- wp:' . $block_name . ' ' . $attrs_json . ' /-->';

    return [
      'blockName'   => $block_name,
      'attrs'       => $attrs,
      'innerBlocks' => [],
      'innerHTML'   => $block_comment,
      'innerContent'=> [ $block_comment ],
    ];
  }

  // return index of block in array, or -1 if not found
  function rh_find_block_index(array $blocks, $block_name){
    foreach ($blocks as $i => $blk) {
      if (!empty($blk['blockName']) && $blk['blockName'] === $block_name) return $i;
    }
    return -1;
  }

  // Helper function to extract attributes from post meta
  function rh_attr_from_meta($post_id, $meta_map){
    $attrs = [];

    // expertId (string) stored in attribute
    if (!empty($meta_map['expertId'])) {
      $eid = get_post_meta($post_id, $meta_map['expertId'], true);
      if (is_string($eid) && $eid !== '') $attrs['expertId'] = $eid;
    }

    // hideResearchHighlights stored in meta (boolean)
    if (!empty($meta_map['hideResearchHighlights'])) {
      $hide = get_post_meta($post_id, $meta_map['hideResearchHighlights'], true);
      $attrs['hideResearchHighlights'] = rh_bool($hide);
    }

    // allow filtering of default attributes
    $attrs = apply_filters('ucdlib_directory_research_highlights_default_attrs', $attrs, $post_id);

    return $attrs;
  }


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

  $added = 0; $skipped = 0; $errors = 0;

  if($q->have_posts()) {
      echo "\n Scanning for missing '{$block_name}' blocks...";
      $target = $insert_after_block ? "after '{$insert_after_block}'" : $insert_position;
      echo " Insertion preference: {$target}\n";
      echo " Scanning for missing '{$block_name}' blocks...\n";


      foreach($q->posts as $post_id){
        $title = get_the_title($post_id);
          // load post
          $post = get_post($post_id);
          if(!$post){
              echo "\n  ERROR: could not load post ID {$post_id}.";
              $errors++;
              continue;
          }

          // parse blocks
          $blocks = parse_blocks( $post->post_content );
          if (!is_array($blocks)) $blocks = [];
        

          // check if research highlights block exists
          $idx = rh_find_block_index($blocks, $block_name);
          if ( $idx >= 0 ) {
              // block exists
              echo "\n Block already exists for post ID {$post_id} titled '{$title}'";
              $skipped++;
              continue;
          }

          // build attributes from post meta
          $attrs = rh_attr_from_meta($post_id, $meta_map);

          // find insert position
          $new_block = rh_build_block( $block_name, $attrs );

          $inserted = false;
          // insert after specified block
          if ( !empty($insert_after_block) ) {
              // try to insert after specified block
              foreach($blocks as $i => $blk) {
                  // look for insert after block
                  if ( !empty($blk['blockName']) && $blk['blockName'] === $insert_after_block ) {
                      array_splice( $blocks, $i + 1, 0, [ $new_block ] ); // insert after
                      $inserted = true; // mark as inserted
                      break;
                  }
              }
          }
          // Fallback: insert at beginning or end
          if (!$inserted) {
              if ($insert_position === 'beginning') {
                  array_unshift($blocks, $new_block);
              } else {
                  $blocks[] = $new_block;
              }
          }

          if($dry_run){
              echo "\n DRY RUN: would insert block into post ID {$post_id} titled '{$title}'.";
              continue;
          }

          $new_content = serialize_blocks($blocks); // serialize back to content
          
          $res = wp_update_post([
              'ID'           => $post_id,
              'post_content' => $new_content
          ], true); // true = return WP_Error on failure

          if (is_wp_error($res)) {// error
              $errors++;
              echo " ERROR updating #{$post_id}: " . $res->get_error_message() . "\n";
          } else { // success
              echo " Added block to post ID {$post_id} titled '{$title}'.\n";
              $added++;
          } // end is_wp_error

      } // end foreach posts
  } // end if have posts

  echo " Done.\n";
  echo " Added:   {$added}\n";
  echo " Skipped: {$skipped}\n";
  echo " Errors:  {$errors}\n";

