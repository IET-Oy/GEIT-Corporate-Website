// Regenerate approved artwork without the old baked-in letterbox backgrounds.
// Run from anywhere with ImageMagick's convert installed; originals stay intact.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const uploads = path.resolve(project, '../../attached_assets');
const groups = [
  ['services', '768x480', [
    ['energy-management', 'Energy_Management_1792516332992.jpg'],
    ['energy-consulting', 'Energy_Consulting_1792516332991.jpg'],
    ['energy-project-development', 'Energy_Project_Development_1792516332992.jpg'],
    ['energy-market-research', 'Energy_Market_Research_1792516332992.jpg'],
    ['energy-technology-solutions', 'Energy_Technology_Solutions_1792516332993.jpg'],
    ['renewable-energy-advisory', 'Renewable_Energy_Advisory_1792516332994.webp'],
    ['energy-efficiency-auditing', 'Energy_Efficiency_&_Energy_Auditing_1792516332991.png'],
    ['battery-energy-storage-flexibility', 'Battery_Energy_Storage_&_Energy_Flexibility_Consulting_1792516332991.avif'],
    ['ev-charging-infrastructure', 'EV_Charging_Infrastructure_Advisory_1792516332994.jpg'],
    ['ai-energy-analytics-digital-solutions', 'AI-Powered_Energy_Analytics_&_Digital_Energy_Solutions_1792516332990.png'],
    ['carbon-footprint-services', 'Carbon_Footprint_Services_1792516332991.jfif'],
  ]],
  ['industries', '768x403', [
    ['commercial-buildings', 'COMMERCIAL_BUILDINGS_&_REAL_ESTATE_1792516883200.jpg'],
    ['industrial-manufacturing', 'INDUSTRIAL_&_MANUFACTURING_FACILITIES_1792516883201.avif'],
    ['renewable-developers-investors', 'RENEWABLE_ENERGY_DEVELOPERS_&_INVESTORS_1792516883201.jpg'],
    ['solar-battery-storage', 'SOLAR_PV_&_BATTERY_ENERGY_STORAGE_1792516883202.webp'],
    ['transport-ev-charging', 'TRANSPORT,_FLEETS_&_EV_CHARGING_1792516883202.webp'],
    ['financial-investors', 'FINANCIAL_INSTITUTIONS_&_INFRASTRUCTURE_INVESTORS_1792516883200.webp'],
    ['public-development', 'PUBLIC_INSTITUTIONS_&_DEVELOPMENT_ORGANISATIONS_1792516883201.webp'],
    ['agriculture-water-food', 'AGRICULTURE,_WATER_&_FOOD_SYSTEMS_1792516883200.jpg'],
  ]],
];
for (const [group, size, assets] of groups) {
  for (const [slug, original] of assets) {
    const result = spawnSync('convert', [
      path.join(uploads, original), '-auto-orient', '-resize', `${size}^`,
      '-gravity', 'center', '-extent', size, '-strip', '-quality', '80',
      path.join(project, 'public/images', group, `${slug}.webp`),
    ], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Cannot convert ${original}: ${result.stderr || result.error}`);
    console.log(`${group}/${slug}.webp`);
  }
}
