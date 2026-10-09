import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const quota = sqliteTable('quota', {
  key: text('key').primaryKey(),
  minute: integer('minute').notNull(),
  day: integer('day').notNull(),
  minuteRequests: integer('minute_requests').notNull(),
  dayRequests: integer('day_requests').notNull(),
  dayQuestions: integer('day_questions').notNull(),
});
