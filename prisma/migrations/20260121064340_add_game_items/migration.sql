-- CreateTable
CREATE TABLE "public"."game_items" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "effect" VARCHAR(50) NOT NULL,
    "image_path" VARCHAR(255),

    CONSTRAINT "game_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_game_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "game_item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_game_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_game_items_user_id_game_item_id_key" ON "public"."user_game_items"("user_id", "game_item_id");

-- AddForeignKey
ALTER TABLE "public"."user_game_items" ADD CONSTRAINT "user_game_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_game_items" ADD CONSTRAINT "user_game_items_game_item_id_fkey" FOREIGN KEY ("game_item_id") REFERENCES "public"."game_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
