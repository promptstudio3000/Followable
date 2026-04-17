CREATE TYPE visibility_type AS ENUM ('public', 'subscriber_only', 'special_hidden_place');
CREATE TYPE report_target_type AS ENUM ('post', 'user');
CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'resolved');
CREATE TYPE entitlement_type AS ENUM ('subscription', 'special_unlock');
CREATE TYPE entitlement_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE collection_visibility AS ENUM ('public');
CREATE TYPE reaction_type AS ENUM ('fire', 'insight', 'want', 'thanks');

CREATE TABLE users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio text NOT NULL,
  avatar_url text NOT NULL,
  home_region text,
  focus_topic_slugs text[] NOT NULL DEFAULT '{}',
  subscription_price_czk integer,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX users_home_region_idx ON users(home_region);

CREATE TABLE follows (
  id text PRIMARY KEY,
  follower_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL
);
CREATE INDEX follows_follower_idx ON follows(follower_id);
CREATE INDEX follows_followed_idx ON follows(followed_user_id);

CREATE TABLE profile_subscriptions (
  id text PRIMARY KEY,
  subscriber_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status entitlement_status NOT NULL,
  started_at timestamptz NOT NULL,
  expires_at timestamptz,
  payment_provider text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX profile_subscriptions_subscriber_idx ON profile_subscriptions(subscriber_id);
CREATE INDEX profile_subscriptions_creator_idx ON profile_subscriptions(creator_id);

CREATE TABLE topics (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE collections (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  cover_image_url text,
  topic_id text REFERENCES topics(id) ON DELETE SET NULL,
  visibility collection_visibility NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX collections_owner_idx ON collections(owner_id);
CREATE INDEX collections_topic_idx ON collections(topic_id);

CREATE TABLE locations (
  id text PRIMARY KEY,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  place_name text,
  city text,
  district text,
  region text,
  country text,
  geokey text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX locations_city_idx ON locations(city);
CREATE INDEX locations_region_idx ON locations(region);
CREATE INDEX locations_country_idx ON locations(country);
CREATE INDEX locations_geokey_idx ON locations(geokey);

CREATE TABLE posts (
  id text PRIMARY KEY,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  visibility_type visibility_type NOT NULL DEFAULT 'public',
  teaser text,
  topic_id text REFERENCES topics(id) ON DELETE SET NULL,
  visibility_start timestamptz,
  visibility_end timestamptz,
  special_price numeric(10,2),
  currency text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX posts_author_idx ON posts(author_id);
CREATE INDEX posts_location_idx ON posts(location_id);
CREATE INDEX posts_topic_idx ON posts(topic_id);
CREATE INDEX posts_visibility_idx ON posts(visibility_type);

CREATE TABLE collection_posts (
  id text PRIMARY KEY,
  collection_id text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  order_index integer NOT NULL
);
CREATE INDEX collection_posts_collection_idx ON collection_posts(collection_id);
CREATE INDEX collection_posts_post_idx ON collection_posts(post_id);

CREATE TABLE collection_users (
  id text PRIMARY KEY,
  collection_id text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_index integer NOT NULL
);
CREATE INDEX collection_users_collection_idx ON collection_users(collection_id);
CREATE INDEX collection_users_user_idx ON collection_users(user_id);

CREATE TABLE post_tags (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag text NOT NULL
);
CREATE INDEX post_tags_post_idx ON post_tags(post_id);
CREATE INDEX post_tags_tag_idx ON post_tags(tag);

CREATE TABLE post_media (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type media_type NOT NULL DEFAULT 'image',
  url text NOT NULL,
  alt text,
  blur_data_url text,
  order_index integer NOT NULL
);
CREATE INDEX post_media_post_idx ON post_media(post_id);

CREATE TABLE reactions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type reaction_type NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX reactions_user_idx ON reactions(user_id);
CREATE INDEX reactions_post_idx ON reactions(post_id);

CREATE TABLE comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id text,
  body text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX comments_post_idx ON comments(post_id);
CREATE INDEX comments_author_idx ON comments(author_id);

CREATE TABLE saved_posts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL
);
CREATE INDEX saved_posts_user_idx ON saved_posts(user_id);
CREATE INDEX saved_posts_post_idx ON saved_posts(post_id);

CREATE TABLE blocked_users (
  id text PRIMARY KEY,
  blocker_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL
);
CREATE INDEX blocked_users_blocker_idx ON blocked_users(blocker_id);
CREATE INDEX blocked_users_blocked_idx ON blocked_users(blocked_user_id);

CREATE TABLE reports (
  id text PRIMARY KEY,
  reporter_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type report_target_type NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  status report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX reports_reporter_idx ON reports(reporter_id);
CREATE INDEX reports_target_idx ON reports(target_type, target_id);

CREATE TABLE entitlements (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id text REFERENCES users(id) ON DELETE CASCADE,
  post_id text REFERENCES posts(id) ON DELETE CASCADE,
  type entitlement_type NOT NULL,
  status entitlement_status NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX entitlements_user_idx ON entitlements(user_id);
CREATE INDEX entitlements_creator_idx ON entitlements(creator_id);
CREATE INDEX entitlements_post_idx ON entitlements(post_id);
