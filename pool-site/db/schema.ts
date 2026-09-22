import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const poolWeeks=sqliteTable('pool_weeks',{number:integer('number').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0),updatedBy:text('updated_by')});
export const members=sqliteTable('members',{player:text('player').primaryKey(),email:text('email').notNull().unique(),userId:text('user_id')});
