-- AlterTable: Add columns and rename price to basePrice
ALTER TABLE "bookings" RENAME COLUMN "price" TO "base_price";

-- Add new columns to bookings
ALTER TABLE "bookings" ADD COLUMN "item_name" TEXT NOT NULL DEFAULT 'Untitled Booking';
ALTER TABLE "bookings" ADD COLUMN "commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 0.10;
ALTER TABLE "bookings" ADD COLUMN "commission_value" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bookings" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make tripId nullable (currently required, need to drop constraint first)
ALTER TABLE "bookings" ALTER COLUMN "trip_id" DROP NOT NULL;
