CREATE TABLE IF NOT EXISTS "game_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"opening_name" varchar(100),
	"total_captures" integer DEFAULT 0 NOT NULL,
	"checks" integer DEFAULT 0 NOT NULL,
	"average_move_time" integer DEFAULT 0 NOT NULL,
	"material_advantage" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"white_player_id" integer,
	"black_player_id" integer,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"result" varchar(10),
	"total_moves" integer DEFAULT 0 NOT NULL,
	"is_ai_game" boolean DEFAULT false NOT NULL,
	"ai_difficulty" varchar(10),
	"final_fen" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"player_id" integer,
	"move_number" integer NOT NULL,
	"move" varchar(10) NOT NULL,
	"time_spent" integer NOT NULL,
	"fen" text NOT NULL,
	"is_check" boolean DEFAULT false NOT NULL,
	"is_capture" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"total_games" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"average_move_time" integer DEFAULT 0 NOT NULL,
	"preferred_openings" json DEFAULT '[]'::json,
	CONSTRAINT "players_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_stats" ADD CONSTRAINT "game_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_white_player_id_players_id_fk" FOREIGN KEY ("white_player_id") REFERENCES "players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_black_player_id_players_id_fk" FOREIGN KEY ("black_player_id") REFERENCES "players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moves" ADD CONSTRAINT "moves_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
