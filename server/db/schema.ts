import {
    pgTable, pgEnum, uuid, text, boolean, integer, timestamp, geometry, index,
  } from "drizzle-orm/pg-core";
  
  export const bidetType = pgEnum("bidet_type", ["electronic_seat", "hand_sprayer", "both"]);
  export const accessType = pgEnum("access_type", ["public", "customers_only", "paid"]);
  export const toiletStatus = pgEnum("toilet_status", ["pending", "active", "hidden"]);
  
  export const toilets = pgTable(
    "toilets",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
      address: text("address"),
      buildingName: text("building_name"),
      floor: text("floor"),
      access: accessType("access").notNull().default("public"),
      openingHours: text("opening_hours"),
      is24h: boolean("is_24h").notNull().default(false),
      bidetType: bidetType("bidet_type").notNull(),
      wheelchair: boolean("wheelchair").notNull().default(false),
      status: toiletStatus("status").notNull().default("pending"),
      confirmCount: integer("confirm_count").notNull().default(0),
      lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
      createdBy: uuid("created_by"), // nanti diisi setelah ada login
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index("toilets_location_gist").using("gist", t.location)],
  );
  
  export type Toilet = typeof toilets.$inferSelect;
  export type NewToilet = typeof toilets.$inferInsert;