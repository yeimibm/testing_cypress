CREATE TABLE `order_items` (
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`order_id`, `product_id`),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "items_quantity_check" CHECK(typeof("order_items"."quantity") = 'integer' AND "order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "items_price_check" CHECK(typeof("order_items"."unit_price_minor") = 'integer' AND "order_items"."unit_price_minor" BETWEEN 1 AND 1000000000)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`total_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "orders_total_check" CHECK(typeof("orders"."total_minor") = 'integer' AND "orders"."total_minor" BETWEEN 1 AND 4950000000000),
	CONSTRAINT "orders_currency_check" CHECK("orders"."currency" = 'GTQ')
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price_minor` integer NOT NULL,
	`available` integer NOT NULL,
	CONSTRAINT "products_name_check" CHECK(length(trim("products"."name")) BETWEEN 1 AND 100),
	CONSTRAINT "products_price_check" CHECK(typeof("products"."price_minor") = 'integer' AND "products"."price_minor" BETWEEN 1 AND 1000000000),
	CONSTRAINT "products_available_check" CHECK("products"."available" IN (0, 1))
);
