const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const ddl = `
DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('AVAILABLE', 'CLAIMED', 'EXPIRED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('SHOPKEEPER', 'CUSTOMER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('FRIEND_REQUEST', 'FRIEND_ACCEPT', 'SYSTEM', 'MESSAGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('TEXT', 'AUDIO', 'IMAGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text,
  quantity integer NOT NULL,
  unit text NOT NULL,
  expiry_date timestamp NOT NULL,
  status item_status NOT NULL DEFAULT 'AVAILABLE',
  image_url text,
  category text DEFAULT 'Other',
  original_price double precision,
  discounted_price double precision,
  price_currency text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id serial PRIMARY KEY,
  item_id integer NOT NULL REFERENCES items(id),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id serial PRIMARY KEY,
  item_id integer NOT NULL REFERENCES items(id),
  claimer_id text NOT NULL REFERENCES users(id),
  status claim_status NOT NULL DEFAULT 'PENDING',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id serial PRIMARY KEY,
  item_id integer REFERENCES items(id),
  participant1_id text NOT NULL REFERENCES users(id),
  participant2_id text NOT NULL REFERENCES users(id),
  status conversation_status NOT NULL DEFAULT 'PENDING',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES conversations(id),
  sender_id text NOT NULL REFERENCES users(id),
  content text,
  type message_type NOT NULL DEFAULT 'TEXT',
  media_url text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ratings (
  id serial PRIMARY KEY,
  rater_id text NOT NULL REFERENCES users(id),
  rated_user_id text NOT NULL REFERENCES users(id),
  rating integer NOT NULL,
  comment text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS friendships (
  id serial PRIMARY KEY,
  requester_id text NOT NULL REFERENCES users(id),
  addressee_id text NOT NULL REFERENCES users(id),
  status friendship_status NOT NULL DEFAULT 'PENDING',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  type notification_type NOT NULL,
  message text NOT NULL,
  related_id text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);
`;

(async () => {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(ddl);
    console.log('Database schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize DB schema:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
