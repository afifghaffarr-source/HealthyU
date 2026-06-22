/**
 * Sprint W3: AI Warung Mode — Component Tests
 *
 * Tests for ComboDetectionChip and PostScanAdjuster components.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ComboDetectionChip } from "../ComboDetectionChip";
import { PostScanAdjuster } from "../PostScanAdjuster";

describe("ComboDetectionChip", () => {
  it("renders combo name and calories", () => {
    const onDismiss = vi.fn();
    render(
      <ComboDetectionChip comboName="Paket Warteg" totalCalories={545} onDismiss={onDismiss} />,
    );

    expect(screen.getByText(/Paket Warteg detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Total ~545 kkal/i)).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", () => {
    const onDismiss = vi.fn();
    render(
      <ComboDetectionChip comboName="Paket Warteg" totalCalories={545} onDismiss={onDismiss} />,
    );

    const dismissBtn = screen.getByRole("button", { name: /dismiss combo/i });
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("PostScanAdjuster", () => {
  const mockItems = [
    {
      name: "Nasi Putih",
      est_calories: 150,
      est_portion_g: 100,
      category: "nasi",
    },
    {
      name: "Ayam Goreng",
      est_calories: 250,
      est_portion_g: 80,
      category: "lauk",
      verified_nutrition: {
        calories: 250,
        protein_g: 20,
        carbs_g: 5,
        fat_g: 15,
        fiber_g: 0,
        serving_size: 80,
        serving_unit: "g",
        portion_label: "1 potong",
      },
    },
  ];

  it("renders all food items", () => {
    const onSave = vi.fn();
    const onRescan = vi.fn();
    render(<PostScanAdjuster items={mockItems} onSave={onSave} onRescan={onRescan} />);

    expect(screen.getByText("Nasi Putih")).toBeInTheDocument();
    expect(screen.getByText("Ayam Goreng")).toBeInTheDocument();
  });

  it("calculates initial total calories correctly", () => {
    const onSave = vi.fn();
    const onRescan = vi.fn();
    render(<PostScanAdjuster items={mockItems} onSave={onSave} onRescan={onRescan} />);

    // Total should be in the "Total Estimasi" section
    expect(screen.getByText("Total Estimasi")).toBeInTheDocument();
    const totalCaloriesElements = screen.getAllByText("400 kkal");
    expect(totalCaloriesElements.length).toBeGreaterThan(0); // At least one should exist
  });

  it("recalculates calories when portion slider changed", () => {
    const onSave = vi.fn();
    const onRescan = vi.fn();
    render(<PostScanAdjuster items={mockItems} onSave={onSave} onRescan={onRescan} />);

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "200" } }); // double nasi portion

    // Initial: 150 + 250 = 400 kkal
    // After doubling nasi: 300 + 250 = 550 kkal
    const totalCaloriesElements = screen.getAllByText("550 kkal");
    expect(totalCaloriesElements.length).toBeGreaterThan(0);
  });

  it("calls onSave with adjusted items when save button clicked", () => {
    const onSave = vi.fn();
    const onRescan = vi.fn();
    render(<PostScanAdjuster items={mockItems} onSave={onSave} onRescan={onRescan} />);

    const saveBtn = screen.getByRole("button", { name: /simpan ke log/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Nasi Putih",
          adjusted_portion_g: 100,
          adjusted_calories: 150,
        }),
        expect.objectContaining({
          name: "Ayam Goreng",
          adjusted_portion_g: 80,
          adjusted_calories: 250,
        }),
      ]),
    );
  });

  it("calls onRescan when rescan button clicked", () => {
    const onSave = vi.fn();
    const onRescan = vi.fn();
    render(<PostScanAdjuster items={mockItems} onSave={onSave} onRescan={onRescan} />);

    const rescanBtn = screen.getByRole("button", { name: /scan ulang/i });
    fireEvent.click(rescanBtn);

    expect(onRescan).toHaveBeenCalledTimes(1);
  });

  it("shows TKPI badge for verified items", () => {
    const itemsWithSource = [
      {
        ...mockItems[1],
        source: "TKPI",
        canonical_name: "Ayam Goreng",
      },
    ];

    const onSave = vi.fn();
    const onRescan = vi.fn();
    render(<PostScanAdjuster items={itemsWithSource} onSave={onSave} onRescan={onRescan} />);

    expect(screen.getByText("TKPI")).toBeInTheDocument();
  });

  it("shows portion label suggestion for verified items", () => {
    const onSave = vi.fn();
    const onRescan = vi.fn();
    render(<PostScanAdjuster items={mockItems} onSave={onSave} onRescan={onRescan} />);

    const portionLabels = screen.getAllByText(/Saran: 1 potong/i);
    expect(portionLabels.length).toBeGreaterThan(0);
  });
});
