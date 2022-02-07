create table ucdlib_post_updates_log (
  id bigint primary key auto_increment,
  post_id bigint,
  post_modified datetime
);

create trigger ucdlib_wp_posts_insert_log_trigger after insert on wp_posts 
for each row
  begin
    insert into ucdlib_post_updates_log(post_id, post_modified) values (new.ID, new.post_modified);
  end;

create trigger ucdlib_wp_posts_update_log_trigger after update on wp_posts
  for each row
  begin
    insert into ucdlib_post_updates_log(post_id, post_modified) values (new.ID, new.post_modified);
  end;
