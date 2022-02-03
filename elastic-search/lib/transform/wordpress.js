import crypto from 'crypto';
import striptags from 'striptags';

function transformRecord(post) {
  let record = {
    id : post.ID,
    title : post.post_title,
    type : post.post_type,
    description : post.post_name,
    content : striptags(post.post_content).replace(/(\n+|\s+)/g, ' ').trim()
  };

  record.md5 = crypto.createHash('md5').update(JSON.stringify(record)).digest('hex')

  return record;
}

export default transformRecord;