select
  count(*) as update_count,
  post.post_modified as last_updated,
  post.post_name as post_name,
  post.post_type as type,
  post.ID as post_id,
  ruser.user_email as updated_by,
  puser.user_email as created_by
from
   wp_posts post
left join wp_posts revision on revision.post_parent = post.ID
left join wp_users ruser on ruser.ID = revision.post_author
left join wp_users puser on puser.ID = post.post_author
WHERE
   post.post_status = 'publish' and
   post.post_parent='' and
   post.post_modified > date_sub(now(), INTERVAL ? DAY)
group by
   post.post_name, post.post_type, post.ID, ruser.user_email, puser.user_email
order by post_name,updated_by
