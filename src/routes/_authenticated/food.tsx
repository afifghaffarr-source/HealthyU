import { createFileRoute } from "@tanstack/react-router";
import { FoodPage } from "@/features/food/routes/FoodPage";

export const Route = createFileRoute("/_authenticated/food")({
  component: FoodPage,
});
