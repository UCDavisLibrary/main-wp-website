<?php

if ( defined('WP_CLI') && WP_CLI ) {
  $inCLI = true;
} else {
  $inCLI = false;
}

$blockName = $args[0] ?? null;

if (empty($blockName)) {
    if($inCLI) echo "Usage: wp eval-file - <block-name>\nError: No block name was found. Assigning default 'ucdlib-directory/research-highlight'\n";
    $blockName = 'ucdlib-directory/research-highlights';  
}

if($inCLI) echo "\n Locking Block: {$blockName}\n";

function search_block( array $blocks, string $blockName) {
  $updated = false;

  foreach ( $blocks as $i => $block) {
    if (!is_array($block) ) continue; // Skip blocks that are not arrays

    if(($block['blockName'] ?? null) === $blockName) {
        $block['attrs'] = $block['attrs'] ?? [];

        if (!is_array($block['attrs'])) {
            $block['attrs'] = []; // Ensure attrs is an array
        }

        if (isset($block['attrs']['lock'])) {
            // If lock attribute already exists, skip to next block
            $blocks[$i] = $block;
            if($inCLI) echo "Block {$blockName} already locked. Skipping.\n";
            continue;
        }
        
        $block['attrs']['lock'] = [
            'move'   => true, // Prevents moving the block
            'remove' => true  // Prevents deleting the block
        ];
        $blocks[$i] = $block;
        $updated = true;

        continue; // Skip further processing for this block if found match
    } // End of blockName check

    // if the block has innerBlocks and target block name, search them recursively for the target block
    if( !empty($block['innerBlocks']) && is_array($block['innerBlocks'] )) {
      [$innerBlocks, $innerUpdated] = search_block(
        $block['innerBlocks'], 
        $blockName
      ); // Recursive call to search inner blocks

      $block['innerBlocks'] = $innerBlocks; // Update innerBlocks after recursion
      $blocks[$i] = $block; // Update the block in the original array
      $updated = $updated || $innerUpdated; // Update the updated flag if inner blocks were updated

    }

  }

  return [$blocks, $updated];

}


$postSlug = 'person';

$q = new WP_Query([
  'post_type' => $postSlug,
  'post_status'    => 'publish',
  'posts_per_page' => -1,
  'fields'         => 'ids',
  'no_found_rows'  => true,
  ]);
    
if($inCLI) echo "\n Found {$q->post_count} posts.";

if($inCLI) echo "\n Processing {$q->post_count} valid posts.";

if ($q->post_count === 0) {
  if($inCLI) echo "\n No valid posts found. Nothing to do.\n";
  
  return;
}

if($inCLI) echo "\nUpdating to Lock Block...";

foreach ($q->posts as $post_id) {
  $post = get_post($post_id);

  if ( !$post ) continue;

  if($inCLI) echo "\nProcessing Post Title {$post->post_title}...\n";

  $blocks = parse_blocks( $post->post_content );
  $updated = false;


  [$blocks, $updated] =  search_block($blocks, $blockName);
  

  if ( ! $updated ) {
    if($inCLI) echo "Post ID {$post_id}: No changes made.\n";
    continue;
  }

  $updated_content = serialize_blocks( $blocks );

  if($inCLI) echo "Post ID {$post_id}: Content updated";
      
  wp_update_post([
    'ID' => $post_id,
    'post_content' => $updated_content,
  ]);
  
  if($inCLI) echo " - Post updated successfully.\n";}

if($inCLI) echo "\nDone!\n";
