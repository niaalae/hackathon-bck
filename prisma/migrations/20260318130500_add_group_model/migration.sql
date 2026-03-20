CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "budget_min" DECIMAL(12,2) NOT NULL,
    "budget_max" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "groups_date_window_check" CHECK ("end_date" > "start_date"),
    CONSTRAINT "groups_budget_range_check" CHECK ("budget_max" >= "budget_min")
);

CREATE INDEX "groups_city_id_idx" ON "groups"("city_id");
CREATE INDEX "groups_start_date_idx" ON "groups"("start_date");
CREATE INDEX "groups_end_date_idx" ON "groups"("end_date");

ALTER TABLE "groups" ADD CONSTRAINT "groups_city_id_fkey"
  FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
