import { createFileRoute } from "@tanstack/react-router";
import { FoodsPage } from "@/features/food/routes/FoodsPage";

export const Route = createFileRoute("/_authenticated/foods")({
  component: FoodsPage,
});
