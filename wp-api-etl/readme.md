# Wordpress API Scripts and Utilities

This directory contains scripts and utilities for querying the Wordpress API. A global `.env` file can be placed in the root of this directory, or in a subdirectory corresponding to a specific query or task. See `./lib/config.js` for variables that can be set.

The `cli` directory is a command line interface for performing common tasks on the API, and can be used by running `node ./cli/ucdlib-wp.js`. 

For example, to find pages that contain gallery blocks you would run:
```bash
node cli/ucdlib-wp.js find post-by-element .wp-block-gallery
```

By default, all API calls are cached in `./lib/.http-cache` indefinitely. To clear the cache, just delete this directory.
