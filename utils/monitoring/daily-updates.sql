select 
  count(*) as update_count,
  max(revision.post_modified) as last_updated,
  posts.post_name as post_name,
  posts.post_type as type,
  posts.ID as post_id,
  ruser.user_email as updated_by,
  puser.user_email as created_by
from 
   wp_posts revision
left join wp_posts posts on revision.post_parent = posts.ID
left join wp_users ruser on ruser.ID = revision.post_author
left join wp_users puser on puser.ID = posts.post_author
WHERE
   revision.post_modified > date_sub(now(), INTERVAL ? DAY) and 
   revision.post_type = 'revision' and
   posts.post_status = 'publish'
group by
   posts.post_name, posts.post_type, posts.Id, ruser.user_email, puser.user_email; 
