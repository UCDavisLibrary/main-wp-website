# Image Correction for Lightbox Plugin.

The WP Gallery block has functionality that allows a user to bulk set the "link to" property on all image blocks. However, in some cases, [this does not work on our site](https://github.com/UCDavisLibrary/main-wp-website/issues/85#issuecomment-1535287882). The issue seems to be that when the gallery was originally imported, the images were uploaded, but the `data-id` attribute was not set. 
