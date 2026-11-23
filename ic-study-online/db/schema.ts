import { sqliteTable,text,integer,index } from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('users',{
 id:text('id').primaryKey(),username:text('username').notNull().unique(),displayName:text('display_name').notNull(),role:text('role').notNull().default('user'),passwordHash:text('password_hash').notNull(),disabled:integer('disabled').notNull().default(0),createdAt:integer('created_at').notNull(),lastLogin:integer('last_login'),passwordChanged:integer('password_changed')
});
export const sessions=sqliteTable('auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),expires:integer('expires').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('auth_sessions_user').on(t.userId)]);
export const progress=sqliteTable('progress',{
 userId:text('user_id').primaryKey().references(()=>users.id),state:text('state').notNull(),revision:integer('revision').notNull().default(1),updatedAt:integer('updated_at').notNull()
});
export const limits=sqliteTable('auth_limits',{
 key:text('key').primaryKey(),attempts:integer('attempts').notNull(),startedAt:integer('started_at').notNull()
});
export const audit=sqliteTable('audit',{
 id:text('id').primaryKey(),actorId:text('actor_id').notNull(),action:text('action').notNull(),targetId:text('target_id'),at:integer('at').notNull()
});
