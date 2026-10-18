// Synthetic test inputs only. No official factors or customer measurements.
export function factorFixtures() {
  return [
    { code: "TEST_DIESEL", name: "Synthetic diesel factor", value: 2.68, activityUnit: "L", scope: "scope1", category: "stationary_combustion", scope2Method: null },
    { code: "TEST_GRID", name: "Synthetic grid factor", value: 0.4, activityUnit: "kWh", scope: "scope2", category: "purchased_electricity", scope2Method: "location_based" },
    { code: "TEST_TRAVEL", name: "Synthetic travel factor", value: 0.1, activityUnit: "passenger_km", scope: "scope3", category: "business_travel", scope2Method: null },
  ].map((f) => ({ ...f, emissionUnit: "kgCO2e", geography: "GLOBAL", validFrom: "2026-01-01", validUntil: "2027-01-01",
    source: "Synthetic automated-test reference, not an official emissions dataset.", sourceUrl: "https://example.invalid/synthetic-factor", gwpBasis: "Synthetic test GWP100 basis" }));
}
export function carbonFixture(ids) {
  return { model: "carbon", sourceNotes: "Synthetic activity data for automated verification; not customer data.", boundary: "Synthetic test facility, explicitly entered activities only.",
    periodStart: "2026-01-01", periodEnd: "2027-01-01", scope2Method: "location_based",
    activities: [
      { name: "Synthetic diesel", factorId: ids[0], quantity: 100, unit: "L", geography: "GLOBAL", scope: "scope1", category: "stationary_combustion" },
      { name: "Synthetic electricity", factorId: ids[1], quantity: 1, unit: "MWh", geography: "GLOBAL", scope: "scope2", category: "purchased_electricity" },
      { name: "Synthetic business travel", factorId: ids[2], quantity: 500, unit: "passenger_km", geography: "GLOBAL", scope: "scope3", category: "business_travel" },
    ], reductions: [{ activityIndex: 1, label: "Synthetic demand reduction", reductionPercent: 25 }],
  };
}
export function historicalFixtures(hours = 840) {
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: hours }, (_, index) => {
    const daytime = index % 24 >= 8 && index % 24 < 18;
    return { start: new Date(start + index * 3600000).toISOString(), end: new Date(start + (index + 1) * 3600000).toISOString(),
      load: daytime ? 4 : 2, solar: daytime ? 5 : 0 };
  });
}
export function twinFixture(loadId, solarId, hours = 840) {
  const data = historicalFixtures(hours);
  return { model: "twin", sourceNotes: "Synthetic imported hourly series for automated workflow verification, not measured customer data.",
    buildingMeterId: loadId, solarMeterId: solarId, start: data[0].start, end: data.at(-1).end, loadBasis: "gross_building_load",
    forecastHorizonHours: 24, anomalyThreshold: 3,
    battery: solarId ? { capacityKwh: 10, minSocPercent: 10, maxSocPercent: 90, initialSocPercent: 50,
      maxChargeKw: 3, maxDischargeKw: 3, chargeEfficiency: 0.95, dischargeEfficiency: 0.95, dispatchMode: "self_consumption", gridTargetKw: null } : null };
}
