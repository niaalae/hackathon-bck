-- Add columns to trips table
ALTER TABLE "trips" ADD COLUMN "description" TEXT;
ALTER TABLE "trips" ADD COLUMN "city_id" TEXT;
ALTER TABLE "trips" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "trips" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add index for city_id
CREATE INDEX "trips_city_id_idx" ON "trips"("city_id");

-- Add foreign key constraint for city_id
ALTER TABLE "trips" ADD CONSTRAINT "trips_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL;
