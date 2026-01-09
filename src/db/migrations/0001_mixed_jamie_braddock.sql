CREATE TABLE "Collab" (
	"userId" text NOT NULL,
	"streamId" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "Collab_userId_streamId_pk" PRIMARY KEY("userId","streamId")
);
--> statement-breakpoint
CREATE TABLE "OR" (
	"id" text PRIMARY KEY NOT NULL,
	"streamId" text NOT NULL,
	"opcode" integer NOT NULL,
	"delta" real,
	"payload" text NOT NULL,
	"scope" text NOT NULL,
	"status" text NOT NULL,
	"ts" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todos" ALTER COLUMN "completed" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ALTER COLUMN "updated_at" SET NOT NULL;