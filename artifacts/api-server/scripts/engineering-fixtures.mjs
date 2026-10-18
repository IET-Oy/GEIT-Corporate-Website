// Explicit synthetic inputs for automated checks, never presented as customer results.
export function engineeringCases() {
  const sourceNotes = "Synthetic engineering fixture; not measured customer or provider data.";
  return {
    "energy-consulting": {
      model: "consulting", sourceNotes, energyUnit: "MWh", baselineEnergy: 100, proposedEnergy: 80,
      tariffPerKwh: 0.2, capex: 10000, annualOpexDelta: 500, discountRatePercent: 0, years: 5,
    },
    "energy-auditing": {
      model: "auditing", sourceNotes, tariffPerKwh: 0.2, discountRatePercent: 0, years: 5, facilityBaselineKwh: 25000,
      measures: [{ name: "Lighting replacement", quantity: 100, powerUnit: "W", baselinePower: 100, proposedPower: 50, hoursPerYear: 2000, capex: 5000, annualOpexDelta: 200 }],
    },
    "renewable-energy": {
      model: "solar", sourceNotes, irradiationUnit: "kWh/m2/month", capacityKwp: 10, performanceRatio: 0.8,
      coincidenceFactor: 0.75, importRatePerKwh: 0.2, exportRatePerKwh: 0.05,
      capex: 10000, annualOpex: 100, discountRatePercent: 0, years: 10,
      months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, irradiationKwhM2: 100, demandKwh: 1000 })),
    },
    "battery-flexibility": {
      model: "battery", sourceNotes, energyUnit: "kWh", powerUnit: "kW", capacityKwh: 10,
      minSocPercent: 0, maxSocPercent: 100, initialSocPercent: 50, maxChargeKw: 5, maxDischargeKw: 5,
      chargeEfficiency: 1, dischargeEfficiency: 1, dispatchMode: "self_consumption", gridTargetKw: null,
      intervals: [[0, 10], [8, 0], [4, 0]].map(([loadKwh, solarKwh], hour) => ({
        start: new Date(Date.UTC(2026, 0, 1, hour)).toISOString(),
        end: new Date(Date.UTC(2026, 0, 1, hour + 1)).toISOString(),
        loadKwh, solarKwh, importRatePerKwh: 0.2, exportRatePerKwh: 0.05,
      })),
    },
  };
}
